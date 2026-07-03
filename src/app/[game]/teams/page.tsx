import Link from "next/link";
import { notFound } from "next/navigation";
import { getGameBySlug } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { TeamLogo, Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function GameTeams({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const g = await getGameBySlug(game);
  if (!g) notFound();

  const teams = await prisma.team.findMany({
    where: { gameId: g.id },
    orderBy: [{ groupName: "asc" }, { seed: "asc" }, { name: "asc" }],
    include: { _count: { select: { players: true } } },
  });

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
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ts.map((t) => (
                <Link
                  key={t.id}
                  href={`/${g.slug}/teams/${t.id}`}
                  className="rsl-card p-5 hover:bg-[color:var(--card-hover)] transition-colors flex flex-col items-center text-center"
                >
                  <TeamLogo tag={t.tag} logoUrl={t.logoUrl} size={64} />
                  <h4 className="mt-3 font-bold">{t.name}</h4>
                  <p className="text-xs text-[color:var(--text-dim)] mt-1">{t.tag}</p>
                  <div className="mt-3 flex gap-1">
                    <Pill>{t._count.players} ผู้เล่น</Pill>
                    {t.seed != null && <Pill>Seed {t.seed}</Pill>}
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
