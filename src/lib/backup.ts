import "server-only";
import { prisma } from "./prisma";

// snapshot ข้อมูลทั้งเว็บ (ยกเว้นตาราง Backup เอง เพื่อไม่ให้ซ้อนกันไปเรื่อย ๆ)
export async function exportAllData() {
  const [
    users,
    games,
    teams,
    players,
    matches,
    resultSubmissions,
    brMatches,
    brTeamResults,
    brSubmissions,
    brSubmissionRows,
    news,
    siteSetting,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.game.findMany(),
    prisma.team.findMany(),
    prisma.player.findMany(),
    prisma.match.findMany(),
    prisma.resultSubmission.findMany(),
    prisma.brMatch.findMany(),
    prisma.brTeamResult.findMany(),
    prisma.brSubmission.findMany(),
    prisma.brSubmissionRow.findMany(),
    prisma.news.findMany(),
    prisma.siteSetting.findMany(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    users,
    games,
    teams,
    players,
    matches,
    resultSubmissions,
    brMatches,
    brTeamResults,
    brSubmissions,
    brSubmissionRows,
    news,
    siteSetting,
  };
}

export type BackupSummary = {
  teams: number;
  players: number;
  matches: number;
  brMatches: number;
  news: number;
};

// สร้างข้อมูลสำรอง 1 ชุด แล้วเก็บลงตาราง Backup (ติดป้ายปี)
export async function createBackup(year: number, label: string) {
  const data = await exportAllData();
  const json = JSON.stringify(data);
  const summary: BackupSummary = {
    teams: data.teams.length,
    players: data.players.length,
    matches: data.matches.length,
    brMatches: data.brMatches.length,
    news: data.news.length,
  };
  const row = await prisma.backup.create({
    data: {
      year,
      label,
      data: json,
      sizeBytes: Buffer.byteLength(json, "utf8"),
    },
  });
  return { id: row.id, sizeBytes: row.sizeBytes, summary };
}
