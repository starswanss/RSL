import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TAGS, TTL } from "@/lib/cache";
import { Pill } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const getArticle = unstable_cache(
  (slug: string) =>
    prisma.news.findUnique({
      where: { slug },
      include: { author: true, game: true },
    }),
  ["public-news-detail"],
  { revalidate: TTL.news, tags: [TAGS.news] }
);

export default async function GameNewsDetail({
  params,
}: {
  params: Promise<{ game: string; slug: string }>;
}) {
  const { game, slug } = await params;
  const article = await getArticle(slug);
  if (!article || !article.published || article.game.slug !== game) notFound();

  return (
    <article className="max-w-3xl">
      <Link
        href={`/${game}/news`}
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--brand)]"
      >
        ← กลับหน้าข่าว
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <Pill>{article.category}</Pill>
        <span className="text-xs text-[color:var(--text-dim)]">
          {fmtDate(article.publishedAt)}
          {article.author && ` · โดย ${article.author.displayName}`}
        </span>
      </div>
      <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold leading-tight">
        {article.title}
      </h1>
      <p className="mt-4 text-lg text-[color:var(--text-dim)]">{article.excerpt}</p>
      <div className="mt-6 border-t border-[color:var(--border)] pt-6 leading-relaxed whitespace-pre-line">
        {article.content}
      </div>
    </article>
  );
}
