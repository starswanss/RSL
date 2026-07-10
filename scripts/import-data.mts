// นำเข้าข้อมูลจากไฟล์ JSON (ที่ export จาก SQLite) เข้าสู่ Postgres
// ใช้: npx tsx scripts/import-data.mts <path-to-json>
// เรียกซ้ำได้ (skipDuplicates) — ต้องรัน `prisma db push` สร้างตารางก่อน
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const path = process.argv[2];
if (!path) {
  console.error("usage: tsx scripts/import-data.mts <path-to-json>");
  process.exit(1);
}
const d = JSON.parse(readFileSync(path, "utf8"));

async function main() {
  await prisma.user.createMany({ data: d.users, skipDuplicates: true });
  await prisma.game.createMany({ data: d.games, skipDuplicates: true });
  await prisma.team.createMany({ data: d.teams, skipDuplicates: true });
  await prisma.player.createMany({ data: d.players, skipDuplicates: true });

  // แมตช์อ้างถึงกันเอง (nextMatchId) → ใส่แบบ null ก่อน แล้วค่อยอัปเดต
  await prisma.match.createMany({
    data: d.matches.map((m: Record<string, unknown>) => ({ ...m, nextMatchId: null })),
    skipDuplicates: true,
  });
  for (const m of d.matches) {
    if (m.nextMatchId)
      await prisma.match.update({
        where: { id: m.id },
        data: { nextMatchId: m.nextMatchId, nextSlot: m.nextSlot },
      });
  }

  await prisma.resultSubmission.createMany({ data: d.resultSubmissions, skipDuplicates: true });
  await prisma.brMatch.createMany({ data: d.brMatches, skipDuplicates: true });
  await prisma.brTeamResult.createMany({ data: d.brTeamResults, skipDuplicates: true });
  await prisma.brSubmission.createMany({ data: d.brSubmissions, skipDuplicates: true });
  await prisma.brSubmissionRow.createMany({ data: d.brSubmissionRows, skipDuplicates: true });
  await prisma.news.createMany({ data: d.news, skipDuplicates: true });
  await prisma.siteSetting.createMany({ data: d.siteSetting, skipDuplicates: true });

  const counts = {
    games: await prisma.game.count(),
    teams: await prisma.team.count(),
    players: await prisma.player.count(),
    matches: await prisma.match.count(),
    brMatches: await prisma.brMatch.count(),
  };
  console.log("import done:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
