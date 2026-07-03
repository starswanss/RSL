"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type SubmitState = { ok: boolean; message: string };

// ---------- BRACKET (RoV / FC) ----------
const bracketSchema = z.object({
  matchId: z.string().min(1),
  submitterName: z.string().min(2, "กรุณากรอกชื่อผู้ส่ง"),
  submitterTeam: z.string().optional(),
  homeScore: z.coerce.number().int().min(0).max(9),
  awayScore: z.coerce.number().int().min(0).max(9),
  proofUrl: z.string().url("ลิงก์ไม่ถูกต้อง").optional().or(z.literal("")),
  note: z.string().optional(),
});

export async function submitBracketResult(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const parsed = bracketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.homeScore === d.awayScore)
    return { ok: false, message: "สกอร์เสมอไม่ได้ (Best-of-N)" };

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

  await prisma.$transaction([
    prisma.resultSubmission.create({
      data: {
        matchId: d.matchId,
        submitterName: d.submitterName,
        submitterTeam: d.submitterTeam || null,
        homeScore: d.homeScore,
        awayScore: d.awayScore,
        proofUrl: d.proofUrl || null,
        note: d.note || null,
      },
    }),
    prisma.match.update({ where: { id: d.matchId }, data: { status: "PENDING" } }),
  ]);

  revalidatePath("/admin");
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
  const brMatchId = String(formData.get("brMatchId") || "");
  const submitterName = String(formData.get("submitterName") || "");
  const note = String(formData.get("note") || "");
  const proofUrl = String(formData.get("proofUrl") || "");
  if (submitterName.trim().length < 2)
    return { ok: false, message: "กรุณากรอกชื่อผู้ส่ง" };

  const lobby = await prisma.brMatch.findUnique({ where: { id: brMatchId } });
  if (!lobby) return { ok: false, message: "ไม่พบล็อบบี้" };
  if (lobby.status === "COMPLETED")
    return { ok: false, message: "ล็อบบี้นี้มีผลอนุมัติแล้ว" };

  const teams = await prisma.team.findMany({
    where: { gameId: lobby.gameId, groupName: lobby.groupName },
  });

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

  await prisma.$transaction([
    prisma.brSubmission.create({
      data: {
        brMatchId,
        submitterName,
        note: note || null,
        proofUrl: proofUrl || null,
        rows: { create: rows },
      },
    }),
    prisma.brMatch.update({ where: { id: brMatchId }, data: { status: "PENDING" } }),
  ]);

  revalidatePath("/admin");
  return {
    ok: true,
    message: "ส่งผลล็อบบี้เรียบร้อย! รอแอดมินอนุมัติ ตารางคะแนนจะอัปเดตเมื่ออนุมัติ",
  };
}
