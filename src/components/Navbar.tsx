import Link from "next/link";
import { getActiveGames } from "@/lib/games";
import { getSiteSettings } from "@/lib/settings";

export async function Navbar() {
  const [games, site] = await Promise.all([getActiveGames(), getSiteSettings()]);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[color:var(--bg)]/80 border-b border-[color:var(--border)]">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {site.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoUrl} alt="RSL" className="h-9 w-auto max-w-[160px] object-contain" />
          ) : (
            <span className="inline-grid place-items-center w-9 h-9 rounded-lg bg-[color:var(--brand)] text-[#1a1400] font-extrabold">
              R
            </span>
          )}
          <span className="font-extrabold text-lg tracking-tight">
            <span className="rsl-gradient-text">RSL</span>
            <span className="hidden sm:inline text-[color:var(--text-dim)] font-semibold text-sm ml-2">
              Rajsima League
            </span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 text-sm">
          {games.map((g) => (
            <Link
              key={g.id}
              href={`/${g.slug}`}
              className="px-3 py-2 rounded-lg text-[color:var(--text-dim)] hover:text-[color:var(--text)] hover:bg-[color:var(--card)] transition-colors font-semibold"
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                style={{ background: g.color }}
              />
              {g.name}
            </Link>
          ))}
        </div>

      </nav>

      {/* เมนูเกมมือถือ */}
      <div className="md:hidden border-t border-[color:var(--border)] overflow-x-auto">
        <div className="flex px-2 py-1 gap-1 text-sm whitespace-nowrap">
          {games.map((g) => (
            <Link
              key={g.id}
              href={`/${g.slug}`}
              className="px-3 py-2 rounded-lg text-[color:var(--text-dim)] hover:text-[color:var(--text)] font-semibold"
            >
              {g.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
