import Link from "next/link";
import { unstable_cache } from "next/cache";
import { getActiveGames } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { FORMAT_LABEL } from "@/lib/games";
import { getBrFinalStandings } from "@/lib/br";
import { TAGS, TTL } from "@/lib/cache";
import { Pill, TeamLogo } from "@/components/ui";

export const dynamic = "force-dynamic";

const getTeamCount = unstable_cache(
  (gameId: string) => prisma.team.count({ where: { gameId } }),
  ["home-team-count"],
  { revalidate: TTL.teams, tags: [TAGS.teams] }
);

export default async function HomePage() {
  const games = await getActiveGames();

  const counts = await Promise.all(
    games.map(async (g) => ({
      teams: await getTeamCount(g.id),
    }))
  );

  // ตารางคะแนนรอบชิงชนะเลิศ (เกม Battle Royale ที่จัดรอบชิงแล้ว)
  const finalsBoards = (
    await Promise.all(
      games
        .filter((g) => g.format === "BATTLE_ROYALE")
        .map(async (g) => ({ game: g, rows: await getBrFinalStandings(g.id) }))
    )
  ).filter((f) => f.rows.length > 0);

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

      {/* 🏆 ตารางคะแนนรอบชิงชนะเลิศ — โชว์เด่นบนหน้าแรก */}
      {finalsBoards.map(({ game, rows }) => {
        const played = rows.some((r) => r.matches > 0);
        const champ = played ? rows[0] : null;
        return (
          <section key={game.id} className="pb-14">
            <div
              className="rsl-card overflow-hidden"
              style={{ borderTop: `4px solid ${game.color}` }}
            >
              {/* หัวข้อ + แชมป์ */}
              <div className="p-6 sm:p-8 bg-gradient-to-br from-[color:var(--brand)]/10 to-transparent">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <Pill>รอบชิงชนะเลิศ</Pill>
                    <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
                      🏆 <span className="rsl-gradient-text">{game.name}</span>
                    </h2>
                    <p className="mt-1 text-sm text-[color:var(--text-dim)]">
                      {rows.length} ทีมที่ผ่านเข้าชิง · คะแนนเริ่มนับใหม่ ไม่รวมรอบแบ่งสาย
                    </p>
                  </div>

                  {champ ? (
                    <div className="flex items-center gap-3 rounded-xl bg-[color:var(--bg-soft)] border border-[color:var(--brand)]/40 px-5 py-3">
                      <span className="text-3xl">👑</span>
                      <div>
                        <p className="text-xs text-[color:var(--text-dim)]">ผู้นำอันดับ 1</p>
                        <p className="font-extrabold text-lg rsl-gradient-text">{champ.name}</p>
                        <p className="text-xs text-[color:var(--text-dim)]">
                          {champ.totalPoints} แต้ม · {champ.booyah} บูยาห์
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-[color:var(--text-dim)]">รอผลการแข่งขัน</span>
                  )}
                </div>
              </div>

              {/* ตารางคะแนน */}
              <div className="overflow-x-auto border-t border-[color:var(--border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[color:var(--text-dim)] text-xs border-b border-[color:var(--border)]">
                      <th className="text-left px-4 py-2.5 font-medium">#</th>
                      <th className="text-left px-3 py-2.5 font-medium">ทีม</th>
                      <th className="px-2 py-2.5 font-medium" title="จำนวนเกม">เกม</th>
                      <th className="px-2 py-2.5 font-medium" title="บูยาห์ (อันดับ 1)">🏆</th>
                      <th className="px-2 py-2.5 font-medium">คิลล์</th>
                      <th className="px-4 py-2.5 font-medium">แต้มรวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={r.teamId}
                        className={`border-b border-[color:var(--border)] last:border-0 ${
                          played && i === 0 ? "bg-[color:var(--brand)]/10" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-grid place-items-center w-7 h-7 rounded-full text-xs font-bold ${
                              played && i < 3
                                ? "bg-[color:var(--brand)]/20 text-[color:var(--brand)]"
                                : "text-[color:var(--text-dim)]"
                            }`}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/${game.slug}/teams/${r.teamId}`}
                            className="flex items-center gap-2 hover:text-[color:var(--brand)]"
                          >
                            <TeamLogo tag={r.tag} logoUrl={r.logoUrl} size={26} />
                            <span className="font-semibold">{r.name}</span>
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{r.matches}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{r.booyah}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{r.kills}</td>
                        <td className="px-4 py-2.5 text-center font-extrabold text-lg text-[color:var(--brand)] tabular-nums">
                          {r.totalPoints}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 border-t border-[color:var(--border)] text-right">
                <Link
                  href={`/${game.slug}/standings`}
                  className="text-sm font-semibold hover:underline"
                  style={{ color: game.color }}
                >
                  ดูตารางคะแนนทั้งหมด →
                </Link>
              </div>
            </div>
          </section>
        );
      })}

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
                {g.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.logoUrl} alt={g.name} className="w-14 h-14 rounded-xl object-contain bg-[color:var(--bg-soft)] p-1 shrink-0" />
                ) : (
                  <span
                    className="inline-grid place-items-center w-14 h-14 rounded-xl font-extrabold text-xl shrink-0"
                    style={{ background: g.color, color: "#0b0f1a" }}
                  >
                    {g.shortName}
                  </span>
                )}
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
