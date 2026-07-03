import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TeamLogo, Pill } from "@/components/ui";
import { MatchCard } from "@/components/MatchCard";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TeamDetail({
  params,
}: {
  params: Promise<{ game: string; id: string }>;
}) {
  const { game, id } = await params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      game: true,
      players: { orderBy: [{ isCaptain: "desc" }, { nickname: "asc" }] },
    },
  });
  if (!team || team.game.slug !== game) notFound();

  const isBr = team.game.format === "BATTLE_ROYALE";

  const matches = isBr
    ? []
    : await prisma.match.findMany({
        where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
        orderBy: { roundOrder: "asc" },
        include: { homeTeam: true, awayTeam: true },
      });

  const brResults = isBr
    ? await prisma.brTeamResult.findMany({
        where: { teamId: id },
        include: { brMatch: true },
        orderBy: { brMatch: { matchNo: "asc" } },
      })
    : [];

  return (
    <div>
      <Link
        href={`/${game}/teams`}
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--brand)]"
      >
        ← กลับหน้าทีม
      </Link>

      <div className="mt-4 flex items-center gap-5 rsl-card p-6">
        <TeamLogo tag={team.tag} logoUrl={team.logoUrl} size={80} />
        <div>
          <h1 className="text-3xl font-extrabold">{team.name}</h1>
          <div className="mt-2 flex gap-2">
            <Pill>{team.tag}</Pill>
            {team.groupName && <Pill>สาย {team.groupName}</Pill>}
            {team.seed != null && <Pill>Seed {team.seed}</Pill>}
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold mb-4">รายชื่อผู้เล่น</h2>
        {team.players.length === 0 ? (
          <p className="text-[color:var(--text-dim)]">ยังไม่มีผู้เล่น</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {team.players.map((p) => (
              <div key={p.id} className="rsl-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {p.nickname}
                    {p.isCaptain && (
                      <span className="ml-2 text-xs text-[color:var(--brand)]">(กัปตัน)</span>
                    )}
                  </p>
                  {p.realName && (
                    <p className="text-xs text-[color:var(--text-dim)]">{p.realName}</p>
                  )}
                </div>
                {p.role && <Pill>{p.role}</Pill>}
              </div>
            ))}
          </div>
        )}
      </section>

      {!isBr && (
        <section className="mt-10">
          <h2 className="text-xl font-bold mb-4">โปรแกรมและผลการแข่งขัน</h2>
          {matches.length === 0 ? (
            <p className="text-[color:var(--text-dim)]">ยังไม่มีแมตช์</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {matches.map((m) => (
                <MatchCard key={m.id} m={m} />
              ))}
            </div>
          )}
        </section>
      )}

      {isBr && (
        <section className="mt-10">
          <h2 className="text-xl font-bold mb-4">ผลแต่ละล็อบบี้</h2>
          {brResults.length === 0 ? (
            <p className="text-[color:var(--text-dim)]">ยังไม่มีผล</p>
          ) : (
            <div className="rsl-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[color:var(--text-dim)] text-xs border-b border-[color:var(--border)]">
                    <th className="text-left px-3 py-2">ล็อบบี้</th>
                    <th className="px-2 py-2">อันดับ</th>
                    <th className="px-2 py-2">คิลล์</th>
                    <th className="px-2 py-2">แต้ม</th>
                  </tr>
                </thead>
                <tbody>
                  {brResults.map((r) => (
                    <tr key={r.id} className="border-b border-[color:var(--border)] last:border-0">
                      <td className="px-3 py-2">
                        {r.brMatch.title ||
                          `กลุ่ม ${r.brMatch.groupName} เกม ${r.brMatch.matchNo}`}
                        <div className="text-xs text-[color:var(--text-dim)]">
                          {fmtDateTime(r.brMatch.scheduledAt)}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">#{r.placement}</td>
                      <td className="px-2 py-2 text-center">{r.kills}</td>
                      <td className="px-2 py-2 text-center font-bold text-[color:var(--brand)]">
                        {r.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
