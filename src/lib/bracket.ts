import { prisma } from "./prisma";

// ลำดับวางสายมาตรฐาน (seed 1 เจอ seed ต่ำสุด ฯลฯ)
function seedOrder(size: number): number[] {
  let rounds = Math.log2(size);
  let pls = [1, 2];
  for (let r = 1; r < rounds; r++) {
    const sum = pls.length * 2 + 1;
    const out: number[] = [];
    for (const p of pls) {
      out.push(p);
      out.push(sum - p);
    }
    pls = out;
  }
  return pls;
}

export function roundLabel(teamsEntering: number): string {
  const map: Record<number, string> = {
    2: "รอบชิงชนะเลิศ",
    4: "รอบรองชนะเลิศ",
    8: "รอบ 8 ทีม",
    16: "รอบ 16 ทีม",
    32: "รอบ 32 ทีม",
    64: "รอบ 64 ทีม",
  };
  return map[teamsEntering] || `รอบ ${teamsEntering} ทีม`;
}

/**
 * สร้างสายแพ้คัดออกจากรายชื่อทีม (เรียงตาม seed)
 * ล้างสายเดิมของเกมนี้ก่อน แล้วสร้างใหม่พร้อมเชื่อม nextMatch
 * ทีมที่ได้บาย (bye) จะถูกเลื่อนเข้ารอบถัดไปอัตโนมัติ
 */
export async function generateBracket(
  gameId: string,
  teamIds: string[],
  bestOf = 3
) {
  const n = teamIds.length;
  if (n < 2) throw new Error("ต้องมีอย่างน้อย 2 ทีม");

  let size = 1;
  while (size < n) size *= 2;
  const totalRounds = Math.log2(size);
  const order = seedOrder(size);
  const slots = order.map((seed) => teamIds[seed - 1] ?? null);

  await prisma.$transaction(
    async (tx) => {
      // ล้างสายเดิม
      await tx.resultSubmission.deleteMany({ where: { match: { gameId } } });
      await tx.match.deleteMany({ where: { gameId } });

      // โครงแต่ละรอบ (rounds[0] = รอบแรก)
      const rounds: { home: string | null; away: string | null }[][] = [];
      const r1: { home: string | null; away: string | null }[] = [];
      for (let i = 0; i < size; i += 2)
        r1.push({ home: slots[i], away: slots[i + 1] });
      rounds.push(r1);
      for (let r = 1; r < totalRounds; r++) {
        const cur: { home: string | null; away: string | null }[] = [];
        for (let i = 0; i < rounds[r - 1].length; i += 2)
          cur.push({ home: null, away: null });
        rounds.push(cur);
      }

      // สร้างจากรอบสุดท้ายย้อนขึ้นมา เพื่อให้ nextMatchId มีอยู่แล้ว
      const createdIds: string[][] = new Array(totalRounds);
      for (let r = totalRounds - 1; r >= 0; r--) {
        const teamsEntering = rounds[r].length * 2;
        createdIds[r] = [];
        for (let i = 0; i < rounds[r].length; i++) {
          const nextRoundIdx = r + 1;
          const nextMatchId =
            nextRoundIdx < totalRounds
              ? createdIds[nextRoundIdx][Math.floor(i / 2)]
              : null;
          const nextSlot =
            nextRoundIdx < totalRounds ? (i % 2 === 0 ? "HOME" : "AWAY") : null;

          const m = await tx.match.create({
            data: {
              gameId,
              round: roundLabel(teamsEntering),
              roundOrder: r + 1,
              bestOf,
              status: "SCHEDULED",
              homeTeamId: rounds[r][i].home,
              awayTeamId: rounds[r][i].away,
              bracketOrder: i + 1,
              nextMatchId,
              nextSlot,
            },
          });
          createdIds[r][i] = m.id;
        }
      }

      // จัดการบาย (bye) ในรอบแรก: ทีมเดียว => เลื่อนขึ้นอัตโนมัติ
      for (let i = 0; i < rounds[0].length; i++) {
        const { home, away } = rounds[0][i];
        const hasOne = (home && !away) || (!home && away);
        if (!hasOne) continue;
        const winnerId = (home || away) as string;
        const matchId = createdIds[0][i];
        const nextMatchId =
          totalRounds > 1 ? createdIds[1][Math.floor(i / 2)] : null;
        const nextSlot = i % 2 === 0 ? "HOME" : "AWAY";
        await tx.match.update({
          where: { id: matchId },
          data: {
            status: "COMPLETED",
            homeScore: home ? Math.ceil(bestOf / 2) : 0,
            awayScore: away ? Math.ceil(bestOf / 2) : 0,
            winnerId,
          },
        });
        if (nextMatchId) {
          await tx.match.update({
            where: { id: nextMatchId },
            data: { [nextSlot === "HOME" ? "homeTeamId" : "awayTeamId"]: winnerId },
          });
        }
      }
    },
    { timeout: 20000 }
  );

  return { size, rounds: totalRounds };
}
