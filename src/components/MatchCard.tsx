import { TeamLogo, StatusBadge } from "./ui";
import { fmtDateTime } from "@/lib/format";

type Team = { name: string; tag: string; logoUrl: string | null } | null;

export type MatchCardData = {
  id: string;
  round: string;
  bestOf: number;
  scheduledAt: Date | string | null;
  status: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
};

function Side({
  team,
  score,
  isWinner,
  align,
}: {
  team: Team;
  score: number | null;
  isWinner: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-3 flex-1 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <TeamLogo tag={team?.tag ?? "TBD"} logoUrl={team?.logoUrl} size={38} />
      <div className={`min-w-0 ${align === "right" ? "items-end" : ""} flex flex-col`}>
        <span
          className={`font-semibold truncate ${
            isWinner ? "text-[color:var(--brand)]" : ""
          }`}
        >
          {team?.name ?? "รอผู้ชนะ"}
        </span>
        <span className="text-xs text-[color:var(--text-dim)]">
          {team?.tag ?? "TBD"}
        </span>
      </div>
    </div>
  );
}

export function MatchCard({ m }: { m: MatchCardData }) {
  const done = m.status === "COMPLETED";
  return (
    <div className="rsl-card p-4">
      <div className="flex items-center justify-between mb-3 text-xs text-[color:var(--text-dim)]">
        <span className="font-semibold text-[color:var(--text)]">{m.round}</span>
        <div className="flex items-center gap-2">
          <span>BO{m.bestOf}</span>
          <StatusBadge status={m.status} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Side
          team={m.homeTeam}
          score={m.homeScore}
          isWinner={done && m.homeScore != null && m.awayScore != null && m.homeScore > m.awayScore}
          align="left"
        />
        <div className="shrink-0 text-center px-2">
          {done ? (
            <div className="text-2xl font-extrabold tabular-nums">
              {m.homeScore} <span className="text-[color:var(--text-dim)]">:</span> {m.awayScore}
            </div>
          ) : (
            <div className="text-lg font-bold text-[color:var(--text-dim)]">VS</div>
          )}
        </div>
        <Side
          team={m.awayTeam}
          score={m.awayScore}
          isWinner={done && m.homeScore != null && m.awayScore != null && m.awayScore > m.homeScore}
          align="right"
        />
      </div>
      <div className="mt-3 pt-3 border-t border-[color:var(--border)] text-xs text-[color:var(--text-dim)] text-center">
        {fmtDateTime(m.scheduledAt)}
      </div>
    </div>
  );
}
