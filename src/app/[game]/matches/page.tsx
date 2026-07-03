import { notFound } from "next/navigation";
import { getGameBySlug } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { StatusBadge, TeamLogo } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BrMatchesPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const g = await getGameBySlug(game);
  if (!g) notFound();
  if (g.format !== "BATTLE_ROYALE") notFound();

  const lobbies = await prisma.brMatch.findMany({
    where: { gameId: g.id },
    orderBy: [{ groupName: "asc" }, { matchNo: "asc" }],
    include: {
      results: {
        orderBy: { placement: "asc" },
        include: { team: true },
      },
    },
  });

  if (lobbies.length === 0) {
    return (
      <div className="rsl-card p-8 text-center text-[color:var(--text-dim)]">
        ยังไม่มีล็อบบี้ — แอดมินสร้างล็อบบี้ได้ที่หลังบ้าน
      </div>
    );
  }

  const byGroup = lobbies.reduce<Record<string, typeof lobbies>>((acc, l) => {
    (acc[l.groupName] ??= []).push(l);
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-6">ตารางแข่ง (ล็อบบี้) {g.name}</h2>
      {Object.entries(byGroup).map(([grp, ls]) => (
        <section key={grp} className="mb-8">
          <h3 className="text-lg font-bold mb-3">สาย {grp}</h3>
          <div className="space-y-4">
            {ls.map((l) => (
              <div key={l.id} className="rsl-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">
                    {l.title || `เกมที่ ${l.matchNo}`}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[color:var(--text-dim)]">
                    <span>{fmtDateTime(l.scheduledAt)}</span>
                    <StatusBadge status={l.status} />
                  </div>
                </div>
                {l.results.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[color:var(--text-dim)] text-xs border-b border-[color:var(--border)]">
                          <th className="text-left px-2 py-1">อันดับ</th>
                          <th className="text-left px-2 py-1">ทีม</th>
                          <th className="px-2 py-1">คิลล์</th>
                          <th className="px-2 py-1">แต้ม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {l.results.map((r) => (
                          <tr key={r.id} className="border-b border-[color:var(--border)] last:border-0">
                            <td className="px-2 py-1.5 font-bold">#{r.placement}</td>
                            <td className="px-2 py-1.5">
                              <span className="flex items-center gap-2">
                                <TeamLogo tag={r.team.tag} logoUrl={r.team.logoUrl} size={22} />
                                {r.team.name}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-center">{r.kills}</td>
                            <td className="px-2 py-1.5 text-center font-bold text-[color:var(--brand)]">
                              {r.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
