import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { getGameBySlug } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { TAGS, TTL } from "@/lib/cache";
import { TeamLogo, Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

const getTeamsWithPlayers = unstable_cache(
  (gameId: string) =>
    prisma.team.findMany({
      where: { gameId },
      orderBy: [{ groupName: "asc" }, { seed: "asc" }, { name: "asc" }],
      include: {
        players: { orderBy: [{ isCaptain: "desc" }, { nickname: "asc" }] },
      },
    }),
  ["public-teams-with-players"],
  { revalidate: TTL.teams, tags: [TAGS.teams] }
);

export default async function GameTeams({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const g = await getGameBySlug(game);
  if (!g) notFound();

  const teams = await getTeamsWithPlayers(g.id);

  const isBr = g.format === "BATTLE_ROYALE";

  // สำหรับ BR จัดกลุ่ม, สำหรับ bracket แสดงรวม
  const groups = teams.reduce<Record<string, typeof teams>>((acc, t) => {
    const key = isBr ? t.groupName || "ยังไม่จัดกลุ่ม" : "__all";
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-6">ทีมผู้เข้าแข่งขัน {g.name}</h2>
      {teams.length === 0 ? (
        <div className="rsl-card p-6 text-[color:var(--text-dim)]">
          ยังไม่มีทีม — แอดมินเพิ่มทีมได้ที่หลังบ้าน
        </div>
      ) : (
        Object.entries(groups).map(([key, ts]) => (
          <section key={key} className="mb-8">
            {isBr && (
              <h3 className="text-lg font-bold mb-3">
                สาย <span className="rsl-gradient-text">{key}</span>{" "}
                <span className="text-sm text-[color:var(--text-dim)] font-normal">
                  ({ts.length}/{g.groupSize} ทีม)
                </span>
              </h3>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ts.map((t) => (
                <Link
                  key={t.id}
                  href={`/${g.slug}/teams/${t.id}`}
                  className="rsl-card p-5 hover:bg-[color:var(--card-hover)] transition-colors flex flex-col"
                >
                  <div className="flex items-center gap-3">
                    <TeamLogo tag={t.tag} logoUrl={t.logoUrl} size={56} />
                    <div className="min-w-0">
                      <h4 className="font-bold truncate">{t.name}</h4>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Pill>{t.tag}</Pill>
                        {t.seed != null && <Pill>Seed {t.seed}</Pill>}
                      </div>
                    </div>
                  </div>

                  {t.phone && (
                    <p className="mt-3 text-sm text-[color:var(--text-dim)]">
                      📞 {t.phone}
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-[color:var(--border)]">
                    <p className="text-xs text-[color:var(--text-dim)] mb-2">
                      สมาชิก ({t.players.length})
                    </p>
                    {t.players.length === 0 ? (
                      <p className="text-xs text-[color:var(--text-dim)]">ยังไม่มีผู้เล่น</p>
                    ) : (
                      <ul className="space-y-1">
                        {t.players.map((p) => (
                          <li key={p.id} className="text-sm flex items-center gap-1">
                            <span className="truncate">{p.nickname}</span>
                            {p.isCaptain && (
                              <span className="text-xs text-[color:var(--brand)]">(กัปตัน)</span>
                            )}
                            {p.role && (
                              <span className="text-xs text-[color:var(--text-dim)]">· {p.role}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
