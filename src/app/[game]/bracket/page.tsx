import { notFound } from "next/navigation";
import { getGameBySlug } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { TeamLogo } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type BMatch = {
  id: string;
  round: string;
  roundOrder: number;
  bestOf: number;
  status: string;
  scheduledAt: Date | null;
  homeTeam: { name: string; tag: string; logoUrl: string | null } | null;
  awayTeam: { name: string; tag: string; logoUrl: string | null } | null;
  homeScore: number | null;
  awayScore: number | null;
};

function BracketMatch({ m }: { m: BMatch }) {
  const done = m.status === "COMPLETED";
  const homeWin = done && m.homeScore != null && m.awayScore != null && m.homeScore > m.awayScore;
  const awayWin = done && m.homeScore != null && m.awayScore != null && m.awayScore > m.homeScore;

  const Row = ({
    team,
    score,
    win,
  }: {
    team: BMatch["homeTeam"];
    score: number | null;
    win: boolean;
  }) => (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 ${
        win ? "bg-[color:var(--brand)]/10" : ""
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <TeamLogo tag={team?.tag ?? "TBD"} logoUrl={team?.logoUrl} size={22} />
        <span className={`truncate text-sm ${win ? "font-bold text-[color:var(--brand)]" : ""}`}>
          {team?.name ?? "รอผู้ชนะ"}
        </span>
      </div>
      <span className="tabular-nums font-bold text-sm">{done ? score : "-"}</span>
    </div>
  );

  return (
    <div className="rsl-card overflow-hidden w-60">
      <div className="px-3 py-1 text-[11px] text-[color:var(--text-dim)] border-b border-[color:var(--border)] flex justify-between">
        <span>BO{m.bestOf}</span>
        <span>{fmtDateTime(m.scheduledAt)}</span>
      </div>
      <Row team={m.homeTeam} score={m.homeScore} win={homeWin} />
      <div className="border-t border-[color:var(--border)]" />
      <Row team={m.awayTeam} score={m.awayScore} win={awayWin} />
    </div>
  );
}

export default async function BracketPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const g = await getGameBySlug(game);
  if (!g) notFound();
  if (g.format !== "BRACKET") notFound();

  const matches = (await prisma.match.findMany({
    where: { gameId: g.id },
    orderBy: [{ roundOrder: "asc" }, { bracketOrder: "asc" }],
    include: { homeTeam: true, awayTeam: true },
  })) as unknown as BMatch[];

  if (matches.length === 0) {
    return (
      <div className="rsl-card p-8 text-center text-[color:var(--text-dim)]">
        ยังไม่มีสายการแข่งขัน — แอดมินสร้างสายได้ที่หลังบ้าน
      </div>
    );
  }

  const rounds: { order: number; label: string; items: BMatch[] }[] = [];
  for (const m of matches) {
    let r = rounds.find((x) => x.order === m.roundOrder);
    if (!r) {
      r = { order: m.roundOrder, label: m.round, items: [] };
      rounds.push(r);
    }
    r.items.push(m);
  }
  rounds.sort((a, b) => a.order - b.order);

  // หาแชมป์ (ผู้ชนะรอบสุดท้าย)
  const finalMatch = rounds[rounds.length - 1]?.items[0];
  const champion =
    finalMatch?.status === "COMPLETED"
      ? finalMatch.homeScore != null &&
        finalMatch.awayScore != null &&
        finalMatch.homeScore > finalMatch.awayScore
        ? finalMatch.homeTeam
        : finalMatch.awayTeam
      : null;

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-2">สายการแข่งขัน {g.name}</h2>
      <p className="text-sm text-[color:var(--text-dim)] mb-6">
        ผู้ชนะแต่ละแมตช์จะถูกเลื่อนเข้าสายถัดไปอัตโนมัติเมื่อแอดมินอนุมัติผล
      </p>

      {champion && (
        <div className="rsl-card p-4 mb-6 inline-flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-xs text-[color:var(--text-dim)]">แชมป์</p>
            <p className="font-extrabold rsl-gradient-text text-lg">{champion.name}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {rounds.map((r) => (
            <div key={r.order} className="flex flex-col gap-4 justify-around">
              <h3 className="text-sm font-bold text-[color:var(--text-dim)]">
                {r.label}
              </h3>
              {r.items.map((m) => (
                <BracketMatch key={m.id} m={m} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
