import Link from "next/link";
import { getActiveGames } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { FORMAT_LABEL } from "@/lib/games";
import { Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const games = await getActiveGames();

  const counts = await Promise.all(
    games.map(async (g) => ({
      teams: await prisma.team.count({ where: { gameId: g.id } }),
    }))
  );

  return (
    <div className="max-w-6xl mx-auto px-4">
      <section className="py-14 sm:py-20 text-center">
        <Pill>Rajsima League · แพลตฟอร์มอีสปอร์ตหลายเกม</Pill>
        <h1 className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          <span className="rsl-gradient-text">Rajsima League</span>
          <br />
          เลือกเกมที่คุณติดตาม
        </h1>
        <p className="mt-5 text-[color:var(--text-dim)] max-w-2xl mx-auto">
          แต่ละเกมมีระบบการแข่งขัน ทีม ตาราง และข่าวสารแยกกัน
          เลือกเกมด้านล่างเพื่อเข้าสู่หน้าเฉพาะของเกมนั้น
        </p>
      </section>

      <section className="pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((g, i) => (
            <Link
              key={g.id}
              href={`/${g.slug}`}
              className="rsl-card p-6 hover:bg-[color:var(--card-hover)] transition-all hover:-translate-y-0.5 flex flex-col group"
              style={{ borderTop: `3px solid ${g.color}` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-grid place-items-center w-14 h-14 rounded-xl font-extrabold text-xl shrink-0"
                  style={{ background: g.color, color: "#0b0f1a" }}
                >
                  {g.shortName}
                </span>
                <div>
                  <h2 className="text-2xl font-extrabold">{g.name}</h2>
                  <span className="text-xs text-[color:var(--text-dim)]">
                    {FORMAT_LABEL[g.format]}
                  </span>
                </div>
              </div>
              {g.tagline && (
                <p className="mt-4 text-sm text-[color:var(--text-dim)] flex-1">
                  {g.tagline}
                </p>
              )}
              <div className="mt-5 flex items-center justify-between">
                <Pill>{counts[i].teams} ทีม</Pill>
                <span className="text-sm font-semibold" style={{ color: g.color }}>
                  เข้าสู่เกม →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {games.length === 0 && (
          <p className="text-center text-[color:var(--text-dim)]">
            ยังไม่มีเกม — เพิ่มได้ที่ระบบหลังบ้าน
          </p>
        )}
      </section>
    </div>
  );
}
