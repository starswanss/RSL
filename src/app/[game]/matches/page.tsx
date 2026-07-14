import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { getGameBySlug } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { TAGS, TTL } from "@/lib/cache";
import { StatusBadge, TeamLogo } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const UNGROUPED = "ยังไม่จัดสาย";

const getLobbies = unstable_cache(
  (gameId: string) =>
    prisma.brMatch.findMany({
      where: { gameId },
      orderBy: [{ groupName: "asc" }, { matchNo: "asc" }],
      include: {
        results: { orderBy: { placement: "asc" }, include: { team: true } },
      },
    }),
  ["public-lobbies"],
  { revalidate: TTL.lobbies, tags: [TAGS.lobbies, TAGS.teams] }
);

const getGameTeams = unstable_cache(
  (gameId: string) =>
    prisma.team.findMany({ where: { gameId }, orderBy: [{ name: "asc" }] }),
  ["public-game-teams"],
  { revalidate: TTL.teams, tags: [TAGS.teams] }
);

type Lobby = Awaited<ReturnType<typeof getLobbies>>[number];

function LobbyCard({ l }: { l: Lobby }) {
  return (
    <div className="rsl-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{l.title || `เกมที่ ${l.matchNo}`}</span>
        <div className="flex items-center gap-2 text-xs text-[color:var(--text-dim)]">
          <span>{fmtDateTime(l.scheduledAt)}</span>
          <StatusBadge status={l.status} />
        </div>
      </div>
      {l.results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[color:var(--text-dim)] text-xs border-b border-[color:var(--border)]">
                <th className="text-left px-2 py-1">อันดับ</th>
                <th className="text-left px-2 py-1">ทีม</th>
                <th className="px-2 py-1">คิลล์</th>
                <th className="px-2 py-1">แต้ม</th>
              </tr>
            </thead>
            <tbody>
              {l.results.map((r) => (
                <tr key={r.id} className="border-b border-[color:var(--border)] last:border-0">
                  <td className="px-2 py-1.5 font-bold">#{r.placement}</td>
                  <td className="px-2 py-1.5">
                    <span className="flex items-center gap-2">
                      <TeamLogo tag={r.team.tag} logoUrl={r.team.logoUrl} size={22} />
                      {r.team.name}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">{r.kills}</td>
                  <td className="px-2 py-1.5 text-center font-bold text-[color:var(--brand)]">
                    {r.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function BrMatchesPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const g = await getGameBySlug(game);
  if (!g) notFound();
  if (g.format !== "BATTLE_ROYALE") notFound();

  const [lobbies, teams] = await Promise.all([
    getLobbies(g.id),
    getGameTeams(g.id),
  ]);

  if (lobbies.length === 0 && teams.length === 0) {
    return (
      <div className="rsl-card p-8 text-center text-[color:var(--text-dim)]">
        ยังไม่มีทีมหรือล็อบบี้ — แอดมินเพิ่มได้ที่หลังบ้าน
      </div>
    );
  }

  const groupStage = lobbies.filter((l) => l.stage !== "FINAL");
  const finalLobbies = lobbies.filter((l) => l.stage === "FINAL");

  // ทีมที่ผ่านเข้ารอบชิง (เก็บไว้ที่ล็อบบี้รอบชิง)
  let finalistIds: string[] = [];
  if (finalLobbies.length) {
    try {
      finalistIds = JSON.parse(finalLobbies[0].finalistIds || "[]");
    } catch {}
  }
  const finalists = teams.filter((t) => finalistIds.includes(t.id));

  const byGroup = groupStage.reduce<Record<string, typeof lobbies>>((acc, l) => {
    (acc[l.groupName] ??= []).push(l);
    return acc;
  }, {});
  const teamsByGroup = teams.reduce<Record<string, typeof teams>>((acc, t) => {
    (acc[t.groupName || UNGROUPED] ??= []).push(t);
    return acc;
  }, {});

  // รวมสายจากทั้งทีมและล็อบบี้ แล้วเรียง (สายที่ยังไม่จัดไว้ท้ายสุด)
  const groups = Array.from(
    new Set([...Object.keys(teamsByGroup), ...Object.keys(byGroup)])
  ).sort((a, b) =>
    a === UNGROUPED ? 1 : b === UNGROUPED ? -1 : a.localeCompare(b)
  );

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-6">ตารางแข่ง (ล็อบบี้) {g.name}</h2>
      {groups.map((grp) => {
        const ls = byGroup[grp] ?? [];
        const grpTeams = teamsByGroup[grp] ?? [];
        return (
        <section key={grp} className="mb-8">
          <h3 className="text-lg font-bold mb-3">
            {grp === UNGROUPED ? grp : `สาย ${grp}`}
            <span className="ml-2 text-sm font-normal text-[color:var(--text-dim)]">
              ({grpTeams.length} ทีม)
            </span>
          </h3>

          {/* ทีมในสายนี้ */}
          {grpTeams.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {grpTeams.map((t) => (
                <Link
                  key={t.id}
                  href={`/${g.slug}/teams/${t.id}`}
                  className="inline-flex items-center gap-2 bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-full pl-1.5 pr-3 py-1 text-sm hover:border-[color:var(--brand)] transition-colors"
                >
                  <TeamLogo tag={t.tag} logoUrl={t.logoUrl} size={22} />
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-[color:var(--text-dim)]">{t.tag}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {ls.map((l) => (
              <LobbyCard key={l.id} l={l} />
            ))}
            {ls.length === 0 && (
              <p className="text-sm text-[color:var(--text-dim)]">ยังไม่มีล็อบบี้ในสายนี้</p>
            )}
          </div>
        </section>
        );
      })}

      {/* รอบชิงชนะเลิศ */}
      {finalLobbies.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-3">
            🏆 <span className="rsl-gradient-text">รอบชิงชนะเลิศ</span>
            <span className="ml-2 text-sm font-normal text-[color:var(--text-dim)]">
              ({finalists.length} ทีม)
            </span>
          </h3>

          {finalists.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {finalists.map((t) => (
                <Link
                  key={t.id}
                  href={`/${g.slug}/teams/${t.id}`}
                  className="inline-flex items-center gap-2 bg-[color:var(--bg-soft)] border border-[color:var(--brand)]/40 rounded-full pl-1.5 pr-3 py-1 text-sm hover:border-[color:var(--brand)] transition-colors"
                >
                  <TeamLogo tag={t.tag} logoUrl={t.logoUrl} size={22} />
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-[color:var(--text-dim)]">{t.tag}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {finalLobbies.map((l) => (
              <LobbyCard key={l.id} l={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
