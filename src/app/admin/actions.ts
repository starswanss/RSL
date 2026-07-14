"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { TAGS } from "@/lib/cache";
import {
  createSession,
  destroySession,
  getSession,
  verifyCredentials,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveSubmission, rejectSubmission } from "@/lib/matches";
import {
  approveBrSubmission,
  rejectBrSubmission,
  computePoints,
  computeBrStandings,
  getLobbyTeams,
} from "@/lib/br";
import { generateBracket } from "@/lib/bracket";
import { parseTeamsWorkbook } from "@/lib/import";
import { parseDatetimeLocalTH } from "@/lib/format";
import { fileToDataUrl } from "@/lib/image";
import { setSiteLogo } from "@/lib/settings";
import { utapi } from "@/lib/uploadthing-server";

export type ActionState = { ok: boolean; message: string };

async function assertAdmin() {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  return s;
}

// ล้าง cache หน้าสาธารณะที่เกี่ยวข้อง (เรียกก่อน redirect/return เสมอ)
// updateTag = invalidate จากใน Server Action (Next 16, read-your-own-writes)
function bust(...tags: string[]) {
  for (const t of tags) updateTag(t);
}

function back(path: string, msg: string, isError = false) {
  const key = isError ? "error" : "ok";
  redirect(`${path}?${key}=${encodeURIComponent(msg)}`);
}

// ===================== AUTH =====================
export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  const user = await verifyCredentials(username, password);
  if (!user) return { ok: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  await createSession(user);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

// เปลี่ยนรหัสผ่านแอดมิน (ต้องยืนยันรหัสเดิมก่อน)
export async function changeAdminPasswordAction(formData: FormData) {
  const admin = await assertAdmin();
  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");

  if (next.length < 8)
    back("/admin/settings", "รหัสใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร", true);
  if (next !== confirm)
    back("/admin/settings", "รหัสใหม่กับช่องยืนยันไม่ตรงกัน", true);

  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!user) back("/admin/settings", "ไม่พบบัญชีผู้ใช้", true);
  const valid = await bcrypt.compare(current, user!.passwordHash);
  if (!valid) back("/admin/settings", "รหัสผ่านปัจจุบันไม่ถูกต้อง", true);
  if (current === next)
    back("/admin/settings", "รหัสใหม่ต้องไม่ซ้ำกับรหัสเดิม", true);

  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: admin.id }, data: { passwordHash } });
  back("/admin/settings", "เปลี่ยนรหัสผ่านเรียบร้อย");
}

// ===================== APPROVALS =====================
export async function approveBracketAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("submissionId") || "");
  try {
    await approveSubmission(id, admin.id);
  } catch (e) {
    back("/admin", (e as Error).message, true);
  }
  bust(TAGS.matches);
  back("/admin", "อนุมัติผลเรียบร้อย สายการแข่งขันอัปเดตแล้ว");
}

export async function rejectBracketAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("submissionId") || "");
  const note = String(formData.get("adminNote") || "");
  try {
    await rejectSubmission(id, admin.id, note);
    const sub = await prisma.resultSubmission.findUnique({ where: { id } });
    if (sub) {
      const remaining = await prisma.resultSubmission.count({
        where: { matchId: sub.matchId, status: "PENDING" },
      });
      if (remaining === 0)
        await prisma.match.update({
          where: { id: sub.matchId },
          data: { status: "SCHEDULED" },
        });
    }
  } catch (e) {
    back("/admin", (e as Error).message, true);
  }
  bust(TAGS.matches);
  back("/admin", "ปฏิเสธผลเรียบร้อย");
}

export async function approveBrAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("submissionId") || "");
  try {
    await approveBrSubmission(id, admin.id);
  } catch (e) {
    back("/admin", (e as Error).message, true);
  }
  bust(TAGS.lobbies);
  back("/admin", "อนุมัติผลล็อบบี้เรียบร้อย ตารางคะแนนอัปเดตแล้ว");
}

export async function rejectBrAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("submissionId") || "");
  const note = String(formData.get("adminNote") || "");
  try {
    await rejectBrSubmission(id, admin.id, note);
  } catch (e) {
    back("/admin", (e as Error).message, true);
  }
  bust(TAGS.lobbies);
  back("/admin", "ปฏิเสธผลล็อบบี้เรียบร้อย");
}

// ===================== GAMES =====================
const gameSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อเกม"),
  shortName: z.string().min(1, "กรุณากรอกตัวย่อ"),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug ใช้ได้เฉพาะ a-z, 0-9, -"),
  format: z.enum(["BRACKET", "BATTLE_ROYALE"]),
  groupSize: z.coerce.number().int().min(2).max(100).optional(),
  color: z.string().default("#f5c518"),
  tagline: z.string().optional(),
});

export async function createGameAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await assertAdmin();
  const parsed = gameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  const exists = await prisma.game.findUnique({ where: { slug: d.slug } });
  if (exists) return { ok: false, message: "slug นี้ถูกใช้แล้ว" };
  const count = await prisma.game.count();
  await prisma.game.create({
    data: {
      name: d.name,
      shortName: d.shortName,
      slug: d.slug,
      format: d.format,
      groupSize: d.format === "BATTLE_ROYALE" ? d.groupSize ?? 12 : null,
      color: d.color || "#f5c518",
      tagline: d.tagline || null,
      order: count + 1,
    },
  });
  bust(TAGS.games);
  return { ok: true, message: "เพิ่มเกมเรียบร้อย" };
}

// ล้างไฟล์หลักฐานทั้งหมดออกจาก UploadThing (กันพื้นที่เต็ม)
export async function clearAllProofFilesAction() {
  await assertAdmin();
  const [bracketSubs, brSubs] = await Promise.all([
    prisma.resultSubmission.findMany({
      where: { proofFiles: { not: null } },
      select: { proofFiles: true },
    }),
    prisma.brSubmission.findMany({
      where: { proofFiles: { not: null } },
      select: { proofFiles: true },
    }),
  ]);
  const keys: string[] = [];
  for (const s of [...bracketSubs, ...brSubs]) {
    try {
      const arr = JSON.parse(s.proofFiles!) as { key?: string }[];
      for (const f of arr) if (f.key) keys.push(f.key);
    } catch {}
  }
  try {
    if (keys.length) await utapi.deleteFiles(keys);
  } catch {
    back("/admin/settings", "ลบไฟล์จาก UploadThing ไม่สำเร็จ (ตรวจ UPLOADTHING_TOKEN)", true);
  }
  await Promise.all([
    prisma.resultSubmission.updateMany({
      where: { proofFiles: { not: null } },
      data: { proofFiles: null },
    }),
    prisma.brSubmission.updateMany({
      where: { proofFiles: { not: null } },
      data: { proofFiles: null },
    }),
  ]);
  back("/admin/settings", `ล้างไฟล์หลักฐานแล้ว (${keys.length} ไฟล์)`);
}

// ===================== LOGOS (เว็บ + เกม) =====================
// อัปเดตโลโก้เว็บ (อัปโหลดไฟล์ หรือกดลบ)
export async function updateSiteLogoAction(formData: FormData) {
  await assertAdmin();
  if (formData.get("remove") === "1") {
    await setSiteLogo(null);
    bust(TAGS.site);
    back("/admin/settings", "ลบโลโก้เว็บแล้ว");
  }
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0)
    back("/admin/settings", "กรุณาเลือกไฟล์รูป", true);
  const res = await fileToDataUrl(file as File);
  if (!res.ok) back("/admin/settings", res.message, true);
  await setSiteLogo((res as { dataUrl: string }).dataUrl);
  bust(TAGS.site);
  back("/admin/settings", "อัปเดตโลโก้เว็บแล้ว");
}

// อัปเดตโลโก้ของเกม (อัปโหลดไฟล์ หรือกดลบ)
export async function updateGameLogoAction(formData: FormData) {
  await assertAdmin();
  const gameId = String(formData.get("gameId") || "");
  if (!gameId) back("/admin/games", "ไม่พบเกม", true);
  if (formData.get("remove") === "1") {
    await prisma.game.update({ where: { id: gameId }, data: { logoUrl: null } });
    bust(TAGS.games);
    back("/admin/games", "ลบโลโก้เกมแล้ว");
  }
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0)
    back("/admin/games", "กรุณาเลือกไฟล์รูป", true);
  const res = await fileToDataUrl(file as File);
  if (!res.ok) back("/admin/games", res.message, true);
  await prisma.game.update({
    where: { id: gameId },
    data: { logoUrl: (res as { dataUrl: string }).dataUrl },
  });
  bust(TAGS.games);
  back("/admin/games", "อัปเดตโลโก้เกมแล้ว");
}

export async function toggleGameAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") || "");
  const g = await prisma.game.findUnique({ where: { id } });
  if (g)
    await prisma.game.update({ where: { id }, data: { active: !g.active } });
  bust(TAGS.games);
  back("/admin/games", "อัปเดตสถานะเกมแล้ว");
}

// ===================== TEAMS & PLAYERS =====================
export async function createTeamAction(formData: FormData) {
  await assertAdmin();
  const gameId = String(formData.get("gameId") || "");
  const name = String(formData.get("name") || "").trim();
  const tag = String(formData.get("tag") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const groupName = String(formData.get("groupName") || "").trim() || null;
  const seedRaw = String(formData.get("seed") || "").trim();
  const seed = seedRaw ? Number(seedRaw) : null;
  if (!gameId || name.length < 1 || tag.length < 1)
    back(`/admin/teams?game=${gameId}`, "กรุณากรอกชื่อทีมและตัวย่อ", true);

  // ผู้เล่นที่กรอกมาพร้อมกัน
  const nicknames = formData.getAll("playerNickname").map((v) => String(v).trim());
  const roles = formData.getAll("playerRole").map((v) => String(v).trim());
  const captainIndex = Number(formData.get("captainIndex") ?? -1);
  const players = nicknames
    .map((nick, i) => ({
      nickname: nick,
      role: roles[i] || null,
      isCaptain: i === captainIndex,
    }))
    .filter((p) => p.nickname.length > 0);

  try {
    await prisma.team.create({
      data: {
        gameId,
        name,
        tag,
        phone,
        groupName,
        seed: seed ?? undefined,
        players: players.length ? { create: players } : undefined,
      },
    });
  } catch {
    back(`/admin/teams?game=${gameId}`, "ชื่อทีมหรือตัวย่อซ้ำในเกมนี้", true);
  }
  bust(TAGS.teams);
  back(
    `/admin/teams?game=${gameId}`,
    `เพิ่มทีมเรียบร้อย${players.length ? ` (${players.length} ผู้เล่น)` : ""}`
  );
}

export async function updateTeamAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") || "");
  const gameId = String(formData.get("gameId") || "");
  const name = String(formData.get("name") || "").trim();
  const tag = String(formData.get("tag") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const groupName = String(formData.get("groupName") || "").trim() || null;
  const seedRaw = String(formData.get("seed") || "").trim();
  const seed = seedRaw ? Number(seedRaw) : null;
  if (!id || name.length < 1 || tag.length < 1)
    back(`/admin/teams?game=${gameId}`, "กรุณากรอกชื่อทีมและตัวย่อ", true);
  try {
    await prisma.team.update({
      where: { id },
      data: { name, tag, phone, groupName, seed },
    });
  } catch {
    back(`/admin/teams?game=${gameId}`, "ชื่อทีมหรือตัวย่อซ้ำในเกมนี้", true);
  }
  bust(TAGS.teams);
  back(`/admin/teams?game=${gameId}`, "บันทึกข้อมูลทีมแล้ว");
}

export async function deleteTeamAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") || "");
  const gameId = String(formData.get("gameId") || "");
  await prisma.team.delete({ where: { id } });
  bust(TAGS.teams);
  back(`/admin/teams?game=${gameId}`, "ลบทีมแล้ว");
}

// ลบทุกทีมของเกมนี้ (ผู้เล่น/ผลที่ผูกกับทีมจะถูกลบตาม cascade)
export async function deleteAllTeamsAction(formData: FormData) {
  await assertAdmin();
  const gameId = String(formData.get("gameId") || "");
  if (!gameId) back("/admin/teams", "ไม่พบเกม", true);
  // กันพลาด: ต้องพิมพ์ยืนยันให้ตรง
  const confirmText = String(formData.get("confirmText") || "").trim();
  if (confirmText !== "ลบทั้งหมด")
    back(`/admin/teams?game=${gameId}`, "ยกเลิก: ต้องพิมพ์ \"ลบทั้งหมด\" เพื่อยืนยัน", true);
  const { count } = await prisma.team.deleteMany({ where: { gameId } });
  bust(TAGS.teams);
  back(`/admin/teams?game=${gameId}`, `ลบทีมทั้งหมดแล้ว (${count} ทีม)`);
}

// นำเข้าทีม + ผู้เล่นจากไฟล์ Excel
export async function importTeamsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await assertAdmin();
  const gameId = String(formData.get("gameId") || "");
  const file = formData.get("file");
  if (!gameId) return { ok: false, message: "กรุณาเลือกเกม" };
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, message: "กรุณาเลือกไฟล์ Excel (.xlsx / .xls / .csv)" };

  let parsed;
  try {
    const buf = await file.arrayBuffer();
    parsed = parseTeamsWorkbook(buf);
  } catch {
    return { ok: false, message: "อ่านไฟล์ไม่สำเร็จ ตรวจสอบรูปแบบไฟล์" };
  }
  if (parsed.length === 0)
    return {
      ok: false,
      message: "ไม่พบข้อมูลทีม — ตรวจสอบว่ามีคอลัมน์ 'ทีม' และ 'ผู้เล่น'",
    };

  const existing = await prisma.team.findMany({
    where: { gameId },
    select: { name: true, tag: true },
  });
  const usedNames = new Set(existing.map((t) => t.name.toLowerCase()));
  const usedTags = new Set(existing.map((t) => t.tag.toLowerCase()));

  let createdTeams = 0;
  let createdPlayers = 0;
  const skipped: string[] = [];

  for (const t of parsed) {
    if (usedNames.has(t.name.toLowerCase())) {
      skipped.push(`${t.name} (ชื่อซ้ำ)`);
      continue;
    }
    let tag = t.tag;
    if (usedTags.has(tag.toLowerCase())) {
      // สร้าง tag ใหม่ให้ไม่ซ้ำ
      let n = 2;
      while (usedTags.has(`${tag}${n}`.toLowerCase())) n++;
      tag = `${tag}${n}`;
    }
    try {
      await prisma.team.create({
        data: {
          gameId,
          name: t.name,
          tag,
          phone: t.phone,
          groupName: t.groupName,
          seed: t.seed ?? undefined,
          players: t.players.length
            ? { create: t.players }
            : undefined,
        },
      });
      usedNames.add(t.name.toLowerCase());
      usedTags.add(tag.toLowerCase());
      createdTeams++;
      createdPlayers += t.players.length;
    } catch {
      skipped.push(`${t.name} (ผิดพลาด)`);
    }
  }

  const msg =
    `นำเข้าสำเร็จ ${createdTeams} ทีม, ${createdPlayers} ผู้เล่น` +
    (skipped.length ? ` · ข้าม ${skipped.length}: ${skipped.slice(0, 5).join(", ")}` : "");
  if (createdTeams > 0) bust(TAGS.teams);
  return { ok: createdTeams > 0, message: msg };
}

export async function addPlayerAction(formData: FormData) {
  await assertAdmin();
  const teamId = String(formData.get("teamId") || "");
  const gameId = String(formData.get("gameId") || "");
  const nickname = String(formData.get("nickname") || "").trim();
  const role = String(formData.get("role") || "").trim() || null;
  const isCaptain = formData.get("isCaptain") === "on";
  if (!teamId || nickname.length < 1)
    back(`/admin/teams?game=${gameId}`, "กรุณากรอกชื่อผู้เล่น", true);
  await prisma.player.create({
    data: { teamId, nickname, role, isCaptain },
  });
  bust(TAGS.teams);
  back(`/admin/teams?game=${gameId}`, "เพิ่มผู้เล่นแล้ว");
}

export async function deletePlayerAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") || "");
  const gameId = String(formData.get("gameId") || "");
  await prisma.player.delete({ where: { id } });
  bust(TAGS.teams);
  back(`/admin/teams?game=${gameId}`, "ลบผู้เล่นแล้ว");
}

// ===================== BRACKET =====================
export async function generateBracketAction(formData: FormData) {
  await assertAdmin();
  const gameId = String(formData.get("gameId") || "");
  const bestOf = Number(formData.get("bestOf") || 3);
  const teamIds = formData.getAll("teamIds").map(String).filter(Boolean);
  if (teamIds.length < 2)
    back(`/admin/bracket?game=${gameId}`, "เลือกอย่างน้อย 2 ทีม", true);
  try {
    await generateBracket(gameId, teamIds, bestOf);
  } catch (e) {
    back(`/admin/bracket?game=${gameId}`, (e as Error).message, true);
  }
  bust(TAGS.matches);
  back(`/admin/bracket?game=${gameId}`, "สร้างสายการแข่งขันเรียบร้อย");
}

// กำหนด/แก้ไขวัน–เวลาแข่งทั้งรอบ (ทุกคู่ในรอบเดียวกันได้เวลาเหมือนกัน)
export async function setRoundScheduleAction(formData: FormData) {
  await assertAdmin();
  const gameId = String(formData.get("gameId") || "");
  const roundOrder = Number(formData.get("roundOrder"));
  const raw = String(formData.get("scheduledAt") || "").trim();
  if (!gameId || !Number.isInteger(roundOrder))
    back(`/admin/bracket?game=${gameId}`, "ข้อมูลรอบไม่ถูกต้อง", true);
  let scheduledAt: Date | null = null;
  if (raw) {
    scheduledAt = parseDatetimeLocalTH(raw);
    if (!scheduledAt)
      back(`/admin/bracket?game=${gameId}`, "รูปแบบวันเวลาไม่ถูกต้อง", true);
  }
  const { count } = await prisma.match.updateMany({
    where: { gameId, roundOrder },
    data: { scheduledAt },
  });
  bust(TAGS.matches);
  back(
    `/admin/bracket?game=${gameId}`,
    raw ? `บันทึกวัน–เวลาทั้งรอบแล้ว (${count} คู่)` : `ล้างวัน–เวลาของรอบแล้ว (${count} คู่)`
  );
}

export async function recordBracketResultAction(formData: FormData) {
  const admin = await assertAdmin();
  const gameId = String(formData.get("gameId") || "");
  const matchId = String(formData.get("matchId") || "");
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !match.homeTeamId || !match.awayTeamId)
    back(`/admin/bracket?game=${gameId}`, "แมตช์ยังไม่มีทีมครบสองฝั่ง", true);
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore === awayScore)
    back(`/admin/bracket?game=${gameId}`, "สกอร์ไม่ถูกต้อง (ห้ามเสมอ)", true);
  const sub = await prisma.resultSubmission.create({
    data: {
      matchId,
      submitterName: admin.displayName,
      submitterTeam: "แอดมิน",
      homeScore,
      awayScore,
    },
  });
  try {
    await approveSubmission(sub.id, admin.id);
  } catch (e) {
    back(`/admin/bracket?game=${gameId}`, (e as Error).message, true);
  }
  bust(TAGS.matches);
  back(`/admin/bracket?game=${gameId}`, "บันทึกผลและอัปเดตสายแล้ว");
}

// ===================== LOBBIES (BR) =====================
// กำหนดว่า "สายนี้แข่งกี่เกม" แล้วสร้างล็อบบี้ให้ครบทีเดียว (ไม่ต้องสร้างทีละอัน)
export async function setGroupRoundsAction(formData: FormData) {
  await assertAdmin();
  const gameId = String(formData.get("gameId") || "");
  const groupName = String(formData.get("groupName") || "A").trim() || "A";
  const rounds = Number(formData.get("rounds") || 1);
  const startRaw = String(formData.get("startAt") || "").trim();
  const gap = Number(formData.get("gapMinutes") || 0);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 30)
    back(`/admin/lobbies?game=${gameId}`, "จำนวนเกมต้องอยู่ระหว่าง 1–30", true);

  const existing = await prisma.brMatch.findMany({
    where: { gameId, groupName, stage: "GROUP" },
    select: { matchNo: true },
  });
  const have = new Set(existing.map((e) => e.matchNo));
  const start = startRaw ? parseDatetimeLocalTH(startRaw) : null;
  const step = Number.isInteger(gap) && gap > 0 ? gap : 0;

  const toCreate = [];
  for (let n = 1; n <= rounds; n++) {
    if (have.has(n)) continue;
    toCreate.push({
      gameId,
      groupName,
      stage: "GROUP",
      matchNo: n,
      title: `เกมที่ ${n}`,
      scheduledAt: start ? new Date(start.getTime() + (n - 1) * step * 60000) : null,
    });
  }
  if (toCreate.length === 0)
    back(`/admin/lobbies?game=${gameId}`, `สาย ${groupName} มีครบ ${rounds} เกมอยู่แล้ว`);

  await prisma.brMatch.createMany({ data: toCreate });
  bust(TAGS.lobbies);
  back(
    `/admin/lobbies?game=${gameId}`,
    `สาย ${groupName}: สร้างเพิ่ม ${toCreate.length} เกม (รวมเป็น ${rounds} เกม)`
  );
}

// สร้างรอบชิงชนะเลิศ: เอา top N ของแต่ละสายมารวมเป็นสายใหม่ (คะแนนเริ่มนับใหม่)
export async function createFinalsAction(formData: FormData) {
  await assertAdmin();
  const gameId = String(formData.get("gameId") || "");
  const topN = Number(formData.get("topN") || 2);
  const rounds = Number(formData.get("rounds") || 1);
  const startRaw = String(formData.get("startAt") || "").trim();
  const gap = Number(formData.get("gapMinutes") || 0);
  if (!Number.isInteger(topN) || topN < 1 || topN > 8)
    back(`/admin/lobbies?game=${gameId}`, "ทีมที่เข้าชิงต่อสายต้องอยู่ระหว่าง 1–8", true);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 30)
    back(`/admin/lobbies?game=${gameId}`, "จำนวนเกมรอบชิงต้องอยู่ระหว่าง 1–30", true);

  // อันดับจากรอบแบ่งสาย (stage=GROUP เท่านั้น)
  const standings = await computeBrStandings(gameId);
  const groups = Object.keys(standings).sort();
  const finalistIds: string[] = [];
  for (const g of groups) {
    for (const row of standings[g].slice(0, topN)) finalistIds.push(row.teamId);
  }
  if (finalistIds.length < 2)
    back(`/admin/lobbies?game=${gameId}`, "ยังไม่มีทีม/ผลรอบแบ่งสายพอจะจัดรอบชิง", true);

  const start = startRaw ? parseDatetimeLocalTH(startRaw) : null;
  const step = Number.isInteger(gap) && gap > 0 ? gap : 0;

  await prisma.$transaction(async (tx) => {
    // ล้างรอบชิงเดิม (ถ้าเคยสร้าง) แล้วสร้างใหม่ทั้งหมด
    await tx.brMatch.deleteMany({ where: { gameId, stage: "FINAL" } });
    for (let n = 1; n <= rounds; n++) {
      await tx.brMatch.create({
        data: {
          gameId,
          groupName: "FINAL",
          stage: "FINAL",
          finalistIds: JSON.stringify(finalistIds),
          matchNo: n,
          title: `รอบชิงชนะเลิศ เกมที่ ${n}`,
          scheduledAt: start ? new Date(start.getTime() + (n - 1) * step * 60000) : null,
        },
      });
    }
  });

  bust(TAGS.lobbies);
  back(
    `/admin/lobbies?game=${gameId}`,
    `สร้างรอบชิงแล้ว: ${finalistIds.length} ทีม (${groups.length} สาย × top ${topN}) · ${rounds} เกม`
  );
}

export async function deleteLobbyAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") || "");
  const gameId = String(formData.get("gameId") || "");
  await prisma.brMatch.delete({ where: { id } });
  bust(TAGS.lobbies);
  back(`/admin/lobbies?game=${gameId}`, "ลบล็อบบี้แล้ว");
}

// แอดมินบันทึกผลล็อบบี้เอง (จากตารางอันดับ/คิลล์) แล้วอนุมัติทันที
export async function recordBrResultAction(formData: FormData) {
  const admin = await assertAdmin();
  const gameId = String(formData.get("gameId") || "");
  const brMatchId = String(formData.get("brMatchId") || "");
  const lobby = await prisma.brMatch.findUnique({ where: { id: brMatchId } });
  if (!lobby) back(`/admin/lobbies?game=${gameId}`, "ไม่พบล็อบบี้", true);

  // รอบแบ่งสาย = ทีมในกลุ่ม · รอบชิง = ทีมที่ผ่านเข้าชิง
  const teams = await getLobbyTeams(lobby!);
  const rows: { teamId: string; placement: number; kills: number; points: number }[] = [];
  for (const t of teams) {
    const placement = Number(formData.get(`placement_${t.id}`));
    const kills = Number(formData.get(`kills_${t.id}`));
    if (!placement) continue;
    rows.push({
      teamId: t.id,
      placement,
      kills: Number.isInteger(kills) && kills >= 0 ? kills : 0,
      points: computePoints(placement, Number.isInteger(kills) && kills >= 0 ? kills : 0),
    });
  }
  if (rows.length < 2)
    back(`/admin/lobbies?game=${gameId}`, "กรอกผลอย่างน้อย 2 ทีม", true);
  const places = rows.map((r) => r.placement);
  if (new Set(places).size !== places.length)
    back(`/admin/lobbies?game=${gameId}`, "มีอันดับซ้ำกัน", true);

  await prisma.$transaction(async (tx) => {
    await tx.brTeamResult.deleteMany({ where: { brMatchId } });
    for (const r of rows) {
      await tx.brTeamResult.create({ data: { brMatchId, ...r } });
    }
    await tx.brMatch.update({ where: { id: brMatchId }, data: { status: "COMPLETED" } });
  });
  bust(TAGS.lobbies);
  back(`/admin/lobbies?game=${gameId}`, "บันทึกผลและอัปเดตตารางคะแนนแล้ว");
}

// ===================== NEWS =====================
const newsSchema = z.object({
  gameId: z.string().min(1, "เลือกเกม"),
  title: z.string().min(3, "หัวข้อสั้นเกินไป"),
  excerpt: z.string().min(3, "กรุณากรอกคำโปรย"),
  content: z.string().min(3, "กรุณากรอกเนื้อหา"),
  category: z.string().default("ข่าวทั่วไป"),
});

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^\w฀-๿ก-๙ ]+/g, "")
      .trim()
      .replace(/\s+/g, "-") +
    "-" +
    Date.now().toString(36)
  );
}

export async function createNewsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await assertAdmin();
  const parsed = newsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  await prisma.news.create({
    data: {
      gameId: d.gameId,
      title: d.title,
      excerpt: d.excerpt,
      content: d.content,
      category: d.category,
      slug: slugify(d.title),
      authorId: admin.id,
    },
  });
  bust(TAGS.news);
  return { ok: true, message: "เผยแพร่ข่าวเรียบร้อย" };
}

export async function deleteNewsAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") || "");
  await prisma.news.delete({ where: { id } });
  bust(TAGS.news);
  back("/admin/news", "ลบข่าวแล้ว");
}
