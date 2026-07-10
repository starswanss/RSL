import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminGamePicker } from "@/components/AdminGamePicker";
import { deleteTeamAction, addPlayerAction, deletePlayerAction } from "../actions";
import { TeamCreateForm } from "./TeamCreateForm";
import { ImportTeamsForm } from "./ImportTeamsForm";
import { DeleteAllTeamsButton } from "./DeleteAllTeamsButton";
import { Pill } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "จัดการทีม" };

const input =
  "bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[color:var(--brand)]";

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; ok?: string; error?: string }>;
}) {
  if (!(await getSession())) redirect("/admin/login");
  const sp = await searchParams;

  const games = await prisma.game.findMany({ orderBy: { order: "asc" } });
  const currentId = sp.game || games[0]?.id;
  const game = games.find((g) => g.id === currentId);

  const teams = game
    ? await prisma.team.findMany({
        where: { gameId: game.id },
        orderBy: [{ groupName: "asc" }, { seed: "asc" }, { name: "asc" }],
        include: { players: { orderBy: { isCaptain: "desc" } } },
      })
    : [];

  const isBr = game?.format === "BATTLE_ROYALE";

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">จัดการทีม</h1>
      {sp.ok && <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[color:var(--success)]/15 text-[color:var(--success)]">{sp.ok}</div>}
      {sp.error && <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[color:var(--danger)]/15 text-[color:var(--danger)]">{sp.error}</div>}

      <AdminGamePicker games={games} current={currentId} basePath="/admin/teams" />

      {!game ? (
        <p className="text-[color:var(--text-dim)]">ยังไม่มีเกม</p>
      ) : (
        <>
          {/* นำเข้าจาก Excel */}
          <ImportTeamsForm gameId={game.id} />

          {/* เพิ่มทีม + ผู้เล่น */}
          <TeamCreateForm gameId={game.id} isBr={!!isBr} />

          {/* รายชื่อทีม */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm text-[color:var(--text-dim)]">{teams.length} ทีมในเกม {game.name}</p>
            <DeleteAllTeamsButton gameId={game.id} gameName={game.name} count={teams.length} />
          </div>
          <div className="space-y-4">
            {teams.map((t) => (
              <div key={t.id} className="rsl-card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{t.name}</span>
                    <Pill>{t.tag}</Pill>
                    {t.groupName && <Pill>กลุ่ม {t.groupName}</Pill>}
                    {t.seed != null && <Pill>Seed {t.seed}</Pill>}
                    {t.phone && (
                      <span className="text-xs text-[color:var(--text-dim)]">📞 {t.phone}</span>
                    )}
                    <span className="text-xs text-[color:var(--text-dim)]">{t.players.length} ผู้เล่น</span>
                  </div>
                  <form action={deleteTeamAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="gameId" value={game.id} />
                    <button className="text-xs text-[color:var(--danger)] hover:underline">ลบทีม</button>
                  </form>
                </div>

                {/* ผู้เล่น */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.players.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1 text-xs bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-full pl-3 pr-1 py-1">
                      {p.nickname}{p.isCaptain && " (C)"}{p.role ? ` · ${p.role}` : ""}
                      <form action={deletePlayerAction} className="inline">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="gameId" value={game.id} />
                        <button className="w-5 h-5 rounded-full hover:bg-[color:var(--danger)]/20 text-[color:var(--danger)]">×</button>
                      </form>
                    </span>
                  ))}
                </div>

                <form action={addPlayerAction} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="teamId" value={t.id} />
                  <input type="hidden" name="gameId" value={game.id} />
                  <input name="nickname" required placeholder="ชื่อผู้เล่น" className={input} />
                  <input name="role" placeholder="ตำแหน่ง" className={`${input} w-28`} />
                  <label className="flex items-center gap-1 text-xs text-[color:var(--text-dim)]">
                    <input type="checkbox" name="isCaptain" /> กัปตัน
                  </label>
                  <button className="rsl-btn rsl-btn-ghost text-sm">+ ผู้เล่น</button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
