import { notFound } from "next/navigation";
import Link from "next/link";
import { getGameBySlug } from "@/lib/games";
import { getBrStandings } from "@/lib/br";
import { TeamLogo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const g = await getGameBySlug(game);
  if (!g) notFound();
  if (g.format !== "BATTLE_ROYALE") notFound();

  const groups = await getBrStandings(g.id);
  const groupNames = Object.keys(groups).sort();

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-2">ตารางคะแนน {g.name}</h2>
      <p className="text-sm text-[color:var(--text-dim)] mb-6">
        รวมแต้มจากทุกล็อบบี้ที่แอดมินอนุมัติแล้ว · แต้ม = คะแนนอันดับ + จำนวนคิลล์
      </p>

      {groupNames.length === 0 ? (
        <div className="rsl-card p-6 text-[color:var(--text-dim)]">
          ยังไม่มีทีม/กลุ่ม — แอดมินเพิ่มทีมและจัดกลุ่มได้ที่หลังบ้าน
        </div>
      ) : (
        <div className="space-y-8">
          {groupNames.map((grp) => (
            <div key={grp}>
              <h3 className="text-lg font-bold mb-3">
                สาย <span className="rsl-gradient-text">{grp}</span>
              </h3>
              <div className="rsl-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[color:var(--text-dim)] text-xs border-b border-[color:var(--border)]">
                        <th className="text-left px-3 py-2 font-medium">#</th>
                        <th className="text-left px-3 py-2 font-medium">ทีม</th>
                        <th className="px-2 py-2 font-medium" title="จำนวนล็อบบี้">เกม</th>
                        <th className="px-2 py-2 font-medium" title="บูยาห์ (อันดับ 1)">🏆</th>
                        <th className="px-2 py-2 font-medium" title="แต้มอันดับ">อันดับ</th>
                        <th className="px-2 py-2 font-medium" title="คิลล์">คิลล์</th>
                        <th className="px-2 py-2 font-medium" title="แต้มรวม">รวม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups[grp].map((row, i) => (
                        <tr
                          key={row.teamId}
                          className="border-b border-[color:var(--border)] last:border-0"
                        >
                          <td className="px-3 py-2">
                            <span
                              className={`inline-grid place-items-center w-6 h-6 rounded-full text-xs font-bold ${
                                i < 2
                                  ? "bg-[color:var(--success)]/20 text-[color:var(--success)]"
                                  : "text-[color:var(--text-dim)]"
                              }`}
                            >
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/${g.slug}/teams/${row.teamId}`}
                              className="flex items-center gap-2 hover:text-[color:var(--brand)]"
                            >
                              <TeamLogo tag={row.tag} logoUrl={row.logoUrl} size={26} />
                              <span className="font-semibold">{row.name}</span>
                            </Link>
                          </td>
                          <td className="px-2 py-2 text-center tabular-nums">{row.matches}</td>
                          <td className="px-2 py-2 text-center tabular-nums">{row.booyah}</td>
                          <td className="px-2 py-2 text-center tabular-nums">{row.placePoints}</td>
                          <td className="px-2 py-2 text-center tabular-nums">{row.kills}</td>
                          <td className="px-2 py-2 text-center font-extrabold text-[color:var(--brand)] tabular-nums">
                            {row.totalPoints}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-[color:var(--text-dim)]">
            <span className="inline-block w-3 h-3 rounded-full bg-[color:var(--success)]/40 align-middle mr-1" />
            โซนผ่านเข้ารอบ (2 อันดับแรก)
          </p>
        </div>
      )}
    </div>
  );
}
