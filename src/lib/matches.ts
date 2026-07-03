import { prisma } from "./prisma";

/**
 * อนุมัติผลจาก submission หนึ่งรายการ:
 *  - บันทึกสกอร์และผู้ชนะลงในแมตช์ (status = COMPLETED)
 *  - ปฏิเสธ submission อื่น ๆ ของแมตช์เดียวกันที่ยัง PENDING
 *  - ถ้าเป็นสายน็อกเอาต์ ให้ผู้ชนะไปต่อยังแมตช์ถัดไปตาม nextSlot
 * ทำงานภายใน transaction เดียว
 */
export async function approveSubmission(submissionId: string, reviewerId: string) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.resultSubmission.findUnique({
      where: { id: submissionId },
      include: { match: true },
    });
    if (!sub) throw new Error("ไม่พบผลที่ส่งเข้ามา");
    if (sub.status !== "PENDING") throw new Error("ผลนี้ถูกตรวจไปแล้ว");

    const match = sub.match;
    if (!match.homeTeamId || !match.awayTeamId)
      throw new Error("แมตช์นี้ยังไม่มีทีมครบทั้งสองฝั่ง");
    if (sub.homeScore === sub.awayScore)
      throw new Error("ผลเสมอไม่ได้ในรูปแบบ Best-of-N");

    const winnerId =
      sub.homeScore > sub.awayScore ? match.homeTeamId : match.awayTeamId;

    // อัปเดตแมตช์
    await tx.match.update({
      where: { id: match.id },
      data: {
        homeScore: sub.homeScore,
        awayScore: sub.awayScore,
        winnerId,
        status: "COMPLETED",
      },
    });

    // อนุมัติ submission นี้ + ปฏิเสธที่เหลือ
    await tx.resultSubmission.update({
      where: { id: sub.id },
      data: {
        status: "APPROVED",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
    await tx.resultSubmission.updateMany({
      where: { matchId: match.id, status: "PENDING", id: { not: sub.id } },
      data: {
        status: "REJECTED",
        adminNote: "มีผลอื่นได้รับอนุมัติแล้ว",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    // ดันผู้ชนะเข้าสายถัดไป (knockout)
    if (match.nextMatchId && match.nextSlot) {
      const field = match.nextSlot === "HOME" ? "homeTeamId" : "awayTeamId";
      await tx.match.update({
        where: { id: match.nextMatchId },
        data: { [field]: winnerId },
      });
    }

    return { winnerId };
  });
}

export async function rejectSubmission(
  submissionId: string,
  reviewerId: string,
  adminNote?: string
) {
  const sub = await prisma.resultSubmission.findUnique({
    where: { id: submissionId },
  });
  if (!sub) throw new Error("ไม่พบผลที่ส่งเข้ามา");
  if (sub.status !== "PENDING") throw new Error("ผลนี้ถูกตรวจไปแล้ว");

  await prisma.resultSubmission.update({
    where: { id: submissionId },
    data: {
      status: "REJECTED",
      adminNote: adminNote || "ไม่ผ่านการตรวจสอบ",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });
}
