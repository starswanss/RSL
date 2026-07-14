"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath, updateTag } from "next/cache";
import { TAGS } from "@/lib/cache";
import { getLobbyTeams } from "@/lib/br";
import {
  getClientMeta,
  detectBot,
  enforceRateLimit,
  FAKE_OK,
} from "@/lib/antifraud";

export type SubmitState = { ok: boolean; message: string };

// อ่าน+ตรวจไฟล์หลักฐานที่อัปผ่าน UploadThing (ฝั่ง client ส่งมาเป็น JSON)
function readProofFiles(
  formData: FormData
): { key: string; url: string; name: string }[] | null {
  let arr: unknown;
  try {
    arr = JSON.parse(String(formData.get("proofFiles") || "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(arr) || arr.length === 0 || arr.length > 5) return null;
  const files = arr.map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return {
      key: String(o.key || ""),
      url: String(o.url || ""),
      name: String(o.name || ""),
    };
  });
  if (files.some((f) => !f.key || !/^https?:\/\//.test(f.url))) return null;
  return files;
}

// ---------- BRACKET (RoV / FC) ----------
const bracketSchema = z.object({
  matchId: z.string().min(1),
  submitterName: z.string().min(2, "กรุณากรอกชื่อผู้ส่ง"),
  submitterTeam: z.string().optional(),
  homeScore: z.coerce.number().int().min(0).max(9),
  awayScore: z.coerce.number().int().min(0).max(9),
  note: z.string().optional(),
});

export async function submitBracketResult(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  // ชั้นกันบอท (honeypot + เวลากรอกฟอร์ม)
  const bot = detectBot(formData);
  if (bot === "honeypot") return { ok: true, message: FAKE_OK };
  if (bot === "tooFast")
    return { ok: false, message: "ส่งเร็วเกินไป กรุณาตรวจสอบผลแล้วส่งอีกครั้ง" };

  const parsed = bracketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.homeScore === d.awayScore)
    return { ok: false, message: "สกอร์เสมอไม่ได้ (Best-of-N)" };

  const proofFiles = readProofFiles(formData);
  if (!proofFiles)
    return { ok: false, message: "กรุณาแนบรูปหลักฐานอย่างน้อย 1 รูป (สูงสุด 5 รูป)" };

  const match = await prisma.match.findUnique({
    where: { id: d.matchId },
    include: { game: true },
  });
  if (!match) return { ok: false, message: "ไม่พบแมตช์" };
  if (match.status === "COMPLETED") return { ok: false, message: "แมตช์นี้มีผลอนุมัติแล้ว" };
  if (!match.homeTeamId || !match.awayTeamId)
    return { ok: false, message: "แมตช์นี้ยังไม่มีทีมครบสองฝั่ง" };

  const maxScore = Math.ceil(match.bestOf / 2);
  if (Math.max(d.homeScore, d.awayScore) !== maxScore)
    return { ok: false, message: `BO${match.bestOf} ผู้ชนะต้องได้ ${maxScore} เกม` };

  // ชั้นจำกัดอัตราส่งต่อ IP
  const { ip, userAgent } = await getClientMeta();
  const limited = await enforceRateLimit({ ip, kind: "bracket", targetId: d.matchId });
  if (limited) return { ok: false, message: limited };

  // กันสแปมผลซ้ำ (สกอร์เดิมของแมตช์เดิมที่ยังรออนุมัติอยู่)
  const dup = await prisma.resultSubmission.findFirst({
    where: {
      matchId: d.matchId,
      status: "PENDING",
      homeScore: d.homeScore,
      awayScore: d.awayScore,
    },
  });
  if (dup)
    return { ok: false, message: "ผลสกอร์นี้ถูกส่งเข้ามาแล้วและกำลังรอแอดมินตรวจสอบ" };

  await prisma.$transaction([
    prisma.resultSubmission.create({
      data: {
        matchId: d.matchId,
        submitterName: d.submitterName,
        submitterTeam: d.submitterTeam || null,
        homeScore: d.homeScore,
        awayScore: d.awayScore,
        proofFiles: JSON.stringify(proofFiles),
        note: d.note || null,
        submitterIp: ip,
        userAgent,
      },
    }),
    prisma.match.update({ where: { id: d.matchId }, data: { status: "PENDING" } }),
  ]);

  revalidatePath("/admin");
  updateTag(TAGS.matches);
  return {
    ok: true,
    message: "ส่งผลเรียบร้อย! รอแอดมินอนุมัติ ตารางจะอัปเดตทันทีเมื่ออนุมัติ",
  };
}

// ---------- BATTLE ROYALE (Free Fire) ----------
export async function submitBrResult(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  // ชั้นกันบอท (honeypot + เวลากรอกฟอร์ม)
  const bot = detectBot(formData);
  if (bot === "honeypot") return { ok: true, message: FAKE_OK };
  if (bot === "tooFast")
    return { ok: false, message: "ส่งเร็วเกินไป กรุณาตรวจสอบผลแล้วส่งอีกครั้ง" };

  const brMatchId = String(formData.get("brMatchId") || "");
  const submitterName = String(formData.get("submitterName") || "");
  const note = String(formData.get("note") || "");
  if (submitterName.trim().length < 2)
    return { ok: false, message: "กรุณากรอกชื่อผู้ส่ง" };
  const proofFiles = readProofFiles(formData);
  if (!proofFiles)
    return { ok: false, message: "กรุณาแนบรูปหลักฐานอย่างน้อย 1 รูป (สูงสุด 5 รูป)" };

  const lobby = await prisma.brMatch.findUnique({ where: { id: brMatchId } });
  if (!lobby) return { ok: false, message: "ไม่พบล็อบบี้" };
  if (lobby.status === "COMPLETED")
    return { ok: false, message: "ล็อบบี้นี้มีผลอนุมัติแล้ว" };

  // รอบแบ่งสาย = ทีมในกลุ่ม · รอบชิง = ทีมที่ผ่านเข้าชิง
  const teams = await getLobbyTeams(lobby);

  const rows: { teamId: string; placement: number; kills: number }[] = [];
  for (const t of teams) {
    const placement = Number(formData.get(`placement_${t.id}`));
    const kills = Number(formData.get(`kills_${t.id}`));
    if (!placement) continue; // ข้ามทีมที่ไม่ได้กรอกอันดับ
    if (!Number.isInteger(placement) || placement < 1)
      return { ok: false, message: `อันดับของ ${t.name} ไม่ถูกต้อง` };
    rows.push({
      teamId: t.id,
      placement,
      kills: Number.isInteger(kills) && kills >= 0 ? kills : 0,
    });
  }

  if (rows.length < 2)
    return { ok: false, message: "กรุณากรอกผลอย่างน้อย 2 ทีม" };
  const places = rows.map((r) => r.placement);
  if (new Set(places).size !== places.length)
    return { ok: false, message: "มีอันดับซ้ำกัน" };

  // ชั้นจำกัดอัตราส่งต่อ IP
  const { ip, userAgent } = await getClientMeta();
  const limited = await enforceRateLimit({ ip, kind: "br", targetId: brMatchId });
  if (limited) return { ok: false, message: limited };

  // กันกดส่งซ้ำ (ชื่อเดิม + ล็อบบี้เดิม ภายใน 2 นาที)
  const recent = await prisma.brSubmission.findFirst({
    where: {
      brMatchId,
      submitterName,
      status: "PENDING",
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
  });
  if (recent)
    return { ok: false, message: "เพิ่งส่งผลล็อบบี้นี้ไปแล้ว กรุณารอแอดมินตรวจสอบ" };

  await prisma.$transaction([
    prisma.brSubmission.create({
      data: {
        brMatchId,
        submitterName,
        note: note || null,
        proofFiles: JSON.stringify(proofFiles),
        submitterIp: ip,
        userAgent,
        rows: { create: rows },
      },
    }),
    prisma.brMatch.update({ where: { id: brMatchId }, data: { status: "PENDING" } }),
  ]);

  revalidatePath("/admin");
  updateTag(TAGS.lobbies);
  return {
    ok: true,
    message: "ส่งผลล็อบบี้เรียบร้อย! รอแอดมินอนุมัติ ตารางคะแนนจะอัปเดตเมื่ออนุมัติ",
  };
}
