import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { TAGS, TTL } from "./cache";

// ตารางแต้มตามอันดับ (Free Fire มาตรฐาน 12 ทีม)
export const PLACEMENT_POINTS: Record<number, number> = {
  1: 12,
  2: 9,
  3: 8,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2,
  10: 1,
  11: 0,
  12: 0,
};

export function placementPoints(placement: number): number {
  return PLACEMENT_POINTS[placement] ?? 0;
}

export function computePoints(placement: number, kills: number): number {
  return placementPoints(placement) + kills;
}

export type BrStandingRow = {
  teamId: string;
  name: string;
  tag: string;
  logoUrl: string | null;
  matches: number;
  totalPoints: number;
  placePoints: number;
  kills: number;
  booyah: number; // จำนวนครั้งที่ได้อันดับ 1
  bestPlacement: number | null;
};

/**
 * ตารางคะแนน Battle Royale ต่อกลุ่ม — รวมแต้มจากทุกล็อบบี้ที่อนุมัติแล้ว
 */
export async function computeBrStandings(
  gameId: string
): Promise<Record<string, BrStandingRow[]>> {
  const teams = await prisma.team.findMany({
    where: { gameId },
    orderBy: [{ groupName: "asc" }, { name: "asc" }],
  });

  const results = await prisma.brTeamResult.findMany({
    where: { brMatch: { gameId } },
  });

  const rows: Record<string, BrStandingRow> = {};
  for (const t of teams) {
    rows[t.id] = {
      teamId: t.id,
      name: t.name,
      tag: t.tag,
      logoUrl: t.logoUrl,
      matches: 0,
      totalPoints: 0,
      placePoints: 0,
      kills: 0,
      booyah: 0,
      bestPlacement: null,
    };
  }

  for (const r of results) {
    const row = rows[r.teamId];
    if (!row) continue;
    row.matches++;
    row.totalPoints += r.points;
    row.placePoints += placementPoints(r.placement);
    row.kills += r.kills;
    if (r.placement === 1) row.booyah++;
    if (row.bestPlacement === null || r.placement < row.bestPlacement)
      row.bestPlacement = r.placement;
  }

  const byGroup: Record<string, BrStandingRow[]> = {};
  for (const t of teams) {
    const g = t.groupName || "A";
    (byGroup[g] ??= []).push(rows[t.id]);
  }
  for (const g of Object.keys(byGroup)) {
    byGroup[g].sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.booyah - a.booyah ||
        b.kills - a.kills ||
        a.name.localeCompare(b.name)
    );
  }
  return byGroup;
}

// เวอร์ชัน cache สำหรับหน้าสาธารณะ — ขึ้นกับทีม (roster/กลุ่ม) และผลล็อบบี้
export const getBrStandings = unstable_cache(
  (gameId: string) => computeBrStandings(gameId),
  ["br-standings"],
  { revalidate: TTL.lobbies, tags: [TAGS.teams, TAGS.lobbies] }
);

/**
 * อนุมัติผลทั้งล็อบบี้: คำนวณแต้ม บันทึกผลอย่างเป็นทางการ
 * ปฏิเสธผลอื่นที่ยังค้าง และตั้งสถานะล็อบบี้เป็น COMPLETED
 */
export async function approveBrSubmission(
  submissionId: string,
  reviewerId: string
) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.brSubmission.findUnique({
      where: { id: submissionId },
      include: { rows: true },
    });
    if (!sub) throw new Error("ไม่พบผลที่ส่งเข้ามา");
    if (sub.status !== "PENDING") throw new Error("ผลนี้ถูกตรวจไปแล้ว");
    if (sub.rows.length === 0) throw new Error("ไม่มีข้อมูลผลในล็อบบี้นี้");

    // ตรวจอันดับซ้ำ
    const placements = sub.rows.map((r) => r.placement);
    if (new Set(placements).size !== placements.length)
      throw new Error("มีอันดับซ้ำกันในล็อบบี้");

    // ล้างผลเดิม (กรณีอนุมัติซ้ำ) แล้วบันทึกใหม่
    await tx.brTeamResult.deleteMany({ where: { brMatchId: sub.brMatchId } });
    for (const r of sub.rows) {
      await tx.brTeamResult.create({
        data: {
          brMatchId: sub.brMatchId,
          teamId: r.teamId,
          placement: r.placement,
          kills: r.kills,
          points: computePoints(r.placement, r.kills),
        },
      });
    }

    await tx.brMatch.update({
      where: { id: sub.brMatchId },
      data: { status: "COMPLETED" },
    });

    await tx.brSubmission.update({
      where: { id: sub.id },
      data: {
        status: "APPROVED",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
    await tx.brSubmission.updateMany({
      where: { brMatchId: sub.brMatchId, status: "PENDING", id: { not: sub.id } },
      data: {
        status: "REJECTED",
        adminNote: "มีผลอื่นได้รับอนุมัติแล้ว",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  });
}

export async function rejectBrSubmission(
  submissionId: string,
  reviewerId: string,
  adminNote?: string
) {
  const sub = await prisma.brSubmission.findUnique({ where: { id: submissionId } });
  if (!sub) throw new Error("ไม่พบผลที่ส่งเข้ามา");
  if (sub.status !== "PENDING") throw new Error("ผลนี้ถูกตรวจไปแล้ว");
  await prisma.brSubmission.update({
    where: { id: submissionId },
    data: {
      status: "REJECTED",
      adminNote: adminNote || "ไม่ผ่านการตรวจสอบ",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });
  const remaining = await prisma.brSubmission.count({
    where: { brMatchId: sub.brMatchId, status: "PENDING" },
  });
  const hasResults = await prisma.brTeamResult.count({
    where: { brMatchId: sub.brMatchId },
  });
  if (remaining === 0 && hasResults === 0) {
    await prisma.brMatch.update({
      where: { id: sub.brMatchId },
      data: { status: "SCHEDULED" },
    });
  }
}
