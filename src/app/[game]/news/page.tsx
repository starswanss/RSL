import Link from "next/link";
import { notFound } from "next/navigation";
import { getGameBySlug } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { Pill } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GameNewsList({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const g = await getGameBySlug(game);
  if (!g) notFound();

  const news = await prisma.news.findMany({
    where: { gameId: g.id, published: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-6">ข่าวสาร {g.name}</h2>
      {news.length === 0 ? (
        <p className="text-[color:var(--text-dim)]">ยังไม่มีข่าว</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {news.map((n) => (
            <Link
              key={n.id}
              href={`/${g.slug}/news/${n.slug}`}
              className="rsl-card p-6 hover:bg-[color:var(--card-hover)] transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between">
                <Pill>{n.category}</Pill>
                <span className="text-xs text-[color:var(--text-dim)]">
                  {fmtDate(n.publishedAt)}
                </span>
              </div>
              <h3 className="mt-3 font-bold text-xl leading-snug">{n.title}</h3>
              <p className="mt-2 text-sm text-[color:var(--text-dim)] flex-1">
                {n.excerpt}
              </p>
              <span className="mt-4 text-sm text-[color:var(--brand)] font-semibold">
                อ่านต่อ →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
