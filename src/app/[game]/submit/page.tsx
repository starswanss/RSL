import { notFound } from "next/navigation";
import { getGameBySlug } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { BracketSubmitForm, type MatchOption } from "./BracketSubmitForm";
import { BrSubmitForm, type LobbyOption } from "./BrSubmitForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const g = await getGameBySlug(game);
  if (!g) notFound();

  const intro = (
    <>
      <h2 className="text-2xl font-extrabold mb-2">ส่งผลการแข่งขัน {g.name}</h2>
      <p className="text-[color:var(--text-dim)] mb-6 max-w-2xl">
        หลังจบการแข่งขัน กรอกผลที่นี่ ระบบจะส่งให้แอดมินตรวจสอบ เมื่อ
        <strong className="text-[color:var(--text)]">อนุมัติ</strong>แล้ว
        {g.format === "BRACKET"
          ? " สายการแข่งขันจะอัปเดตอัตโนมัติ"
          : " ตารางคะแนนจะอัปเดตอัตโนมัติ"}
      </p>
    </>
  );

  if (g.format === "BRACKET") {
    const matches = await prisma.match.findMany({
      where: {
        gameId: g.id,
        status: { in: ["SCHEDULED", "PENDING"] },
        homeTeamId: { not: null },
        awayTeamId: { not: null },
      },
      orderBy: [{ roundOrder: "asc" }, { bracketOrder: "asc" }],
      include: { homeTeam: true, awayTeam: true },
    });
    const options: MatchOption[] = matches.map((m) => ({
      id: m.id,
      bestOf: m.bestOf,
      homeName: m.homeTeam!.name,
      awayName: m.awayTeam!.name,
      label: `${m.round}: ${m.homeTeam!.name} vs ${m.awayTeam!.name} (BO${m.bestOf})`,
    }));
    return (
      <div className="max-w-2xl">
        {intro}
        {options.length === 0 ? (
          <div className="rsl-card p-6 text-[color:var(--text-dim)]">
            ยังไม่มีแมตช์ที่รอส่งผล
          </div>
        ) : (
          <BracketSubmitForm matches={options} />
        )}
      </div>
    );
  }

  // BATTLE ROYALE
  const lobbies = await prisma.brMatch.findMany({
    where: { gameId: g.id, status: { in: ["SCHEDULED", "PENDING"] } },
    orderBy: [{ groupName: "asc" }, { matchNo: "asc" }],
  });
  const teams = await prisma.team.findMany({ where: { gameId: g.id } });
  const options: LobbyOption[] = lobbies.map((l) => ({
    id: l.id,
    label: `${l.title || `เกมที่ ${l.matchNo}`} — สาย ${l.groupName}`,
    teams: teams
      .filter((t) => t.groupName === l.groupName)
      .map((t) => ({ id: t.id, name: t.name, tag: t.tag })),
  }));

  return (
    <div className="max-w-3xl">
      {intro}
      {options.length === 0 ? (
        <div className="rsl-card p-6 text-[color:var(--text-dim)]">
          ยังไม่มีล็อบบี้ที่รอส่งผล
        </div>
      ) : (
        <BrSubmitForm lobbies={options} />
      )}
    </div>
  );
}
