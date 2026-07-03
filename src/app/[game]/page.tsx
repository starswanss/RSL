import Link from "next/link";
import { notFound } from "next/navigation";
import { getGameBySlug } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { computeBrStandings } from "@/lib/br";
import { SectionTitle, Pill, TeamLogo } from "@/components/ui";
import { MatchCard } from "@/components/MatchCard";
import { fmtDate, fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GameHome({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const g = await getGameBySlug(game);
  if (!g) notFound();
  const base = `/${g.slug}`;

  const news = await prisma.news.findMany({
    where: { gameId: g.id, published: true },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return (
    <div className="space-y-10">
      {g.description && (
        <p className="text-[color:var(--text-dim)] -mt-2">{g.description}</p>
      )}

      {g.format === "BRACKET" ? (
        <BracketTeaser gameId={g.id} base={base} />
      ) : (
        <BrTeaser gameId={g.id} base={base} />
      )}

      <section>
        <SectionTitle href={`${base}/news`}>ข่าวสารล่าสุด</SectionTitle>
        {news.length === 0 ? (
          <p className="text-[color:var(--text-dim)]">ยังไม่มีข่าวสำหรับเกมนี้</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {news.map((n) => (
              <Link
                key={n.id}
                href={`${base}/news/${n.slug}`}
                className="rsl-card p-5 hover:bg-[color:var(--card-hover)] transition-colors flex flex-col"
              >
                <Pill>{n.category}</Pill>
                <h3 className="mt-3 font-bold text-lg leading-snug">{n.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--text-dim)] line-clamp-3 flex-1">
                  {n.excerpt}
                </p>
                <span className="mt-4 text-xs text-[color:var(--text-dim)]">
                  {fmtDate(n.publishedAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

async function BracketTeaser({ gameId, base }: { gameId: string; base: string }) {
  const upcoming = await prisma.match.findMany({
    where: { gameId, status: { in: ["SCHEDULED", "PENDING"] } },
    orderBy: [{ roundOrder: "asc" }, { bracketOrder: "asc" }],
    take: 4,
    include: { homeTeam: true, awayTeam: true },
  });
  if (upcoming.length === 0) {
    return (
      <div className="rsl-card p-6 text-[color:var(--text-dim)]">
        ยังไม่มีสายการแข่งขัน — แอดมินสามารถสร้างสายได้ที่หลังบ้าน
      </div>
    );
  }
  return (
    <section>
      <SectionTitle href={`${base}/bracket`} action="ดูสายทั้งหมด">
        แมตช์ที่กำลังจะมาถึง
      </SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        {upcoming.map((m) => (
          <MatchCard key={m.id} m={m} />
        ))}
      </div>
    </section>
  );
}

async function BrTeaser({ gameId, base }: { gameId: string; base: string }) {
  const [standings, upcoming] = await Promise.all([
    computeBrStandings(gameId),
    prisma.brMatch.findMany({
      where: { gameId, status: { in: ["SCHEDULED", "PENDING"] } },
      orderBy: [{ scheduledAt: "asc" }, { matchNo: "asc" }],
      take: 5,
    }),
  ]);
  const groups = Object.keys(standings).sort();

  return (
    <>
      {groups.length > 0 && (
        <section>
          <SectionTitle href={`${base}/standings`}>
            ตารางคะแนน (Top 5)
          </SectionTitle>
          <div className="grid md:grid-cols-2 gap-6">
            {groups.slice(0, 2).map((grp) => (
              <div key={grp} className="rsl-card p-4">
                <h3 className="font-bold mb-2">สาย {grp}</h3>
                <div className="space-y-1">
                  {standings[grp].slice(0, 5).map((r, i) => (
                    <div
                      key={r.teamId}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-5 text-[color:var(--text-dim)]">{i + 1}</span>
                        <TeamLogo tag={r.tag} logoUrl={r.logoUrl} size={22} />
                        {r.name}
                      </span>
                      <span className="font-bold text-[color:var(--brand)]">
                        {r.totalPoints}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle href={`${base}/matches`} action="ดูตารางทั้งหมด">
          ล็อบบี้ที่กำลังจะมาถึง
        </SectionTitle>
        {upcoming.length === 0 ? (
          <p className="text-[color:var(--text-dim)]">ยังไม่มีล็อบบี้ที่กำหนดไว้</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((m) => (
              <div key={m.id} className="rsl-card p-4">
                <div className="font-semibold">
                  {m.title || `กลุ่ม ${m.groupName} · เกมที่ ${m.matchNo}`}
                </div>
                <div className="text-xs text-[color:var(--text-dim)] mt-1">
                  {fmtDateTime(m.scheduledAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
