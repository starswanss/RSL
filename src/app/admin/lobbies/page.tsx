import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminGamePicker } from "@/components/AdminGamePicker";
import { createLobbyAction, deleteLobbyAction, recordBrResultAction } from "../actions";
import { StatusBadge } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "จัดการล็อบบี้" };

const input =
  "bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[color:var(--brand)]";

export default async function AdminLobbiesPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; ok?: string; error?: string }>;
}) {
  if (!(await getSession())) redirect("/admin/login");
  const sp = await searchParams;

  const games = await prisma.game.findMany({
    where: { format: "BATTLE_ROYALE" },
    orderBy: { order: "asc" },
  });
  const currentId = sp.game || games[0]?.id;
  const game = games.find((g) => g.id === currentId);

  const teams = game
    ? await prisma.team.findMany({ where: { gameId: game.id }, orderBy: { name: "asc" } })
    : [];
  const lobbies = game
    ? await prisma.brMatch.findMany({
        where: { gameId: game.id },
        orderBy: [{ groupName: "asc" }, { matchNo: "asc" }],
        include: { results: { include: { team: true }, orderBy: { placement: "asc" } } },
      })
    : [];

  const groups = Array.from(new Set(teams.map((t) => t.groupName || "A"))).sort();

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">จัดการล็อบบี้ (Battle Royale)</h1>
      {sp.ok && <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[color:var(--success)]/15 text-[color:var(--success)]">{sp.ok}</div>}
      {sp.error && <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[color:var(--danger)]/15 text-[color:var(--danger)]">{sp.error}</div>}

      <AdminGamePicker games={games} current={currentId} basePath="/admin/lobbies" />

      {!game ? (
        <p className="text-[color:var(--text-dim)]">ไม่มีเกมแบบ Battle Royale</p>
      ) : (
        <>
          {/* สร้างล็อบบี้ */}
          <form action={createLobbyAction} className="rsl-card p-4 mb-8 flex flex-wrap items-end gap-3">
            <input type="hidden" name="gameId" value={game.id} />
            <div>
              <label className="block text-xs text-[color:var(--text-dim)] mb-1">กลุ่ม</label>
              <select name="groupName" className={`${input} w-24`}>
                {(groups.length ? groups : ["A"]).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[color:var(--text-dim)] mb-1">เกมที่</label>
              <input name="matchNo" type="number" min={1} defaultValue={1} className={`${input} w-20`} />
            </div>
            <div>
              <label className="block text-xs text-[color:var(--text-dim)] mb-1">ชื่อ (ไม่บังคับ)</label>
              <input name="title" placeholder="Day 1 - Match 1" className={input} />
            </div>
            <div>
              <label className="block text-xs text-[color:var(--text-dim)] mb-1">เวลาแข่ง</label>
              <input name="scheduledAt" type="datetime-local" className={input} />
            </div>
            <button className="rsl-btn rsl-btn-primary text-sm">+ สร้างล็อบบี้</button>
          </form>

          {groups.length === 0 && (
            <p className="text-sm text-[color:var(--danger)] mb-4">ยังไม่มีทีม — เพิ่มทีมและจัดกลุ่มที่เมนู &quot;ทีม&quot; ก่อน</p>
          )}

          {/* ล็อบบี้ */}
          <div className="space-y-6">
            {lobbies.map((l) => {
              const groupTeams = teams.filter((t) => (t.groupName || "A") === l.groupName);
              const done = l.status === "COMPLETED";
              return (
                <div key={l.id} className="rsl-card p-4">
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">สาย {l.groupName} · {l.title || `เกมที่ ${l.matchNo}`}</span>
                      <StatusBadge status={l.status} />
                      <span className="text-xs text-[color:var(--text-dim)]">{fmtDateTime(l.scheduledAt)}</span>
                    </div>
                    <form action={deleteLobbyAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="gameId" value={game.id} />
                      <button className="text-xs text-[color:var(--danger)] hover:underline">ลบ</button>
                    </form>
                  </div>

                  <form action={recordBrResultAction}>
                    <input type="hidden" name="gameId" value={game.id} />
                    <input type="hidden" name="brMatchId" value={l.id} />
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[color:var(--text-dim)] text-xs border-b border-[color:var(--border)]">
                            <th className="text-left px-2 py-1">ทีม</th>
                            <th className="px-2 py-1 w-24">อันดับ</th>
                            <th className="px-2 py-1 w-24">คิลล์</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupTeams.map((t) => {
                            const prev = l.results.find((r) => r.teamId === t.id);
                            return (
                              <tr key={t.id} className="border-b border-[color:var(--border)] last:border-0">
                                <td className="px-2 py-1.5">{t.name} <span className="text-xs text-[color:var(--text-dim)]">({t.tag})</span></td>
                                <td className="px-2 py-1">
                                  <input name={`placement_${t.id}`} type="number" min={1} defaultValue={prev?.placement ?? ""} placeholder="-" className="w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded px-2 py-1 text-center outline-none" />
                                </td>
                                <td className="px-2 py-1">
                                  <input name={`kills_${t.id}`} type="number" min={0} defaultValue={prev?.kills ?? 0} className="w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded px-2 py-1 text-center outline-none" />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {groupTeams.length >= 2 && (
                      <button className="rsl-btn rsl-btn-primary text-sm mt-3">
                        {done ? "แก้ไข/บันทึกผลใหม่" : "บันทึกผล (อัปเดตคะแนน)"}
                      </button>
                    )}
                  </form>
                </div>
              );
            })}
            {lobbies.length === 0 && <p className="text-[color:var(--text-dim)]">ยังไม่มีล็อบบี้</p>}
          </div>
        </>
      )}
    </div>
  );
}
