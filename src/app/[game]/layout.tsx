import { notFound } from "next/navigation";
import { getGameBySlug, FORMAT_LABEL } from "@/lib/games";
import { GameNav, type NavItem } from "@/components/GameNav";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const g = await getGameBySlug(game);
  return { title: g ? g.name : "เกม" };
}

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const g = await getGameBySlug(game);
  if (!g) notFound();

  const base = `/${g.slug}`;
  const items: NavItem[] = [
    { href: base, label: "ภาพรวม" },
    { href: `${base}/news`, label: "ข่าวสาร" },
    { href: `${base}/teams`, label: "ทีม" },
  ];
  if (g.format === "BRACKET") {
    items.push({ href: `${base}/bracket`, label: "สายการแข่งขัน" });
  } else {
    items.push({ href: `${base}/matches`, label: "ตารางแข่ง" });
    items.push({ href: `${base}/standings`, label: "ตารางคะแนน" });
  }
  items.push({ href: `${base}/submit`, label: "ส่งผลแข่ง" });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* แบนเนอร์เกม */}
      <div
        className="rsl-card p-6 mb-6 flex items-center gap-4"
        style={{ borderLeft: `4px solid ${g.color}` }}
      >
        {g.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={g.logoUrl}
            alt={g.name}
            className="w-16 h-16 rounded-xl object-contain bg-[color:var(--bg-soft)] p-1 shrink-0"
          />
        ) : (
          <span
            className="inline-grid place-items-center w-16 h-16 rounded-xl font-extrabold text-2xl shrink-0"
            style={{ background: g.color, color: "#0b0f1a" }}
          >
            {g.shortName}
          </span>
        )}
        <div>
          <h1 className="text-3xl font-extrabold">{g.name}</h1>
          <p className="text-sm text-[color:var(--text-dim)]">
            {FORMAT_LABEL[g.format]}
            {g.format === "BATTLE_ROYALE" && g.groupSize
              ? ` · กลุ่มละ ${g.groupSize} ทีม`
              : ""}
          </p>
        </div>
      </div>

      <GameNav items={items} color={g.color} />
      {children}
    </div>
  );
}
