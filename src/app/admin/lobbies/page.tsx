import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminGamePicker } from "@/components/AdminGamePicker";
import { setGroupRoundsAction, deleteLobbyAction, recordBrResultAction } from "../actions";
import { FinalsForm } from "./FinalsForm";
import { StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
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
  const groupLobbies = lobbies.filter((l) => l.stage !== "FINAL");
  const finalLobbies = lobbies.filter((l) => l.stage === "FINAL");

  // ทีมที่ลงแข่งในล็อบบี้: รอบแบ่งสาย = ทีมในกลุ่ม, รอบชิง = ทีมที่ผ่านเข้าชิง
  const teamsFor = (l: (typeof lobbies)[number]) => {
    if (l.stage === "FINAL") {
      let ids: string[] = [];
      try {
        ids = JSON.parse(l.finalistIds || "[]");
      } catch {}
      return teams.filter((t) => ids.includes(t.id));
    }
    return teams.filter((t) => (t.groupName || "A") === l.groupName);
  };

  const roundsOf = (g: string) =>
    groupLobbies.filter((l) => l.groupName === g).length;

  const LobbyCard = ({ l }: { l: (typeof lobbies)[number] }) => {
    const lobbyTeams = teamsFor(l);
    const done = l.status === "COMPLETED";
    return (
      <div className="rsl-card p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {l.stage === "FINAL" ? "🏆 รอบชิง" : `สาย ${l.groupName}`} ·{" "}
              {l.title || `เกมที่ ${l.matchNo}`}
            </span>
            <StatusBadge status={l.status} />
            <span className="text-xs text-[color:var(--text-dim)]">{fmtDateTime(l.scheduledAt)}</span>
          </div>
          <form action={deleteLobbyAction}>
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="gameId" value={game!.id} />
            <SubmitButton className="text-xs text-[color:var(--danger)] hover:underline" pendingText="กำลังลบ...">ลบ</SubmitButton>
          </form>
        </div>

        <form action={recordBrResultAction}>
          <input type="hidden" name="gameId" value={game!.id} />
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
                {lobbyTeams.map((t) => {
                  const prev = l.results.find((r) => r.teamId === t.id);
                  return (
                    <tr key={t.id} className="border-b border-[color:var(--border)] last:border-0">
                      <td className="px-2 py-1.5">{t.name} <span className="text-xs text-[color:var(--text-dim)]">({t.tag})</span></td>
                      <td className="px-2 py-1">
                        <select name={`placement_${t.id}`} defaultValue={prev?.placement ?? ""} className="w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded px-2 py-1 text-center outline-none">
                          <option value="">-</option>
                          {Array.from({ length: lobbyTeams.length }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select name={`kills_${t.id}`} defaultValue={prev?.kills ?? 0} className="w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded px-2 py-1 text-center outline-none">
                          {Array.from({ length: 31 }, (_, i) => i).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {lobbyTeams.length >= 2 && (
            <SubmitButton className="rsl-btn rsl-btn-primary text-sm mt-3" pendingText="กำลังบันทึก...">
              {done ? "แก้ไข/บันทึกผลใหม่" : "บันทึกผล (อัปเดตคะแนน)"}
            </SubmitButton>
          )}
        </form>
      </div>
    );
  };

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
          {groups.length === 0 && (
            <p className="text-sm text-[color:var(--danger)] mb-4">ยังไม่มีทีม — เพิ่มทีมและจัดกลุ่มที่เมนู &quot;ทีม&quot; ก่อน</p>
          )}

          {/* ตั้งจำนวนเกมของสาย → สร้างล็อบบี้ให้ครบทีเดียว */}
          <div className="rsl-card p-4 mb-6">
            <h2 className="font-bold mb-1">ตั้งจำนวนเกมของสาย</h2>
            <p className="text-xs text-[color:var(--text-dim)] mb-3">
              เลือกสายแล้วระบุว่าแข่งกี่เกม ระบบจะสร้างล็อบบี้ให้ครบทีเดียว (เกมที่มีอยู่แล้วจะไม่ถูกสร้างซ้ำ)
            </p>
            <form action={setGroupRoundsAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="gameId" value={game.id} />
              <div>
                <label className="block text-xs text-[color:var(--text-dim)] mb-1">สาย</label>
                <select name="groupName" className={`${input} w-28`}>
                  {(groups.length ? groups : ["A"]).map((g) => (
                    <option key={g} value={g}>
                      {g} ({roundsOf(g)} เกม)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[color:var(--text-dim)] mb-1">แข่งกี่เกม</label>
                <input name="rounds" type="number" min={1} max={30} defaultValue={5} className={`${input} w-24`} />
              </div>
              <div>
                <label className="block text-xs text-[color:var(--text-dim)] mb-1">เวลาเริ่ม (เกมแรก)</label>
                <input name="startAt" type="datetime-local" className={input} />
              </div>
              <div>
                <label className="block text-xs text-[color:var(--text-dim)] mb-1">ห่างกัน (นาที)</label>
                <input name="gapMinutes" type="number" min={0} defaultValue={30} className={`${input} w-24`} />
              </div>
              <SubmitButton className="rsl-btn rsl-btn-primary text-sm" pendingText="กำลังสร้าง...">+ สร้างล็อบบี้ทั้งสาย</SubmitButton>
            </form>
          </div>

          {/* รอบชิงชนะเลิศ */}
          <div className="rsl-card p-4 mb-8">
            <h2 className="font-bold mb-1">🏆 รอบชิงชนะเลิศ</h2>
            <p className="text-xs text-[color:var(--text-dim)] mb-3">
              เอาทีมอันดับต้นของแต่ละสาย (ตามคะแนนรอบแบ่งสาย) มาจัดเป็นสายใหม่ · <strong>คะแนนรอบชิงเริ่มนับใหม่</strong> ไม่รวมคะแนนรอบแบ่งสาย
            </p>
            <FinalsForm gameId={game.id} hasFinals={finalLobbies.length > 0} />
            {finalLobbies.length > 0 && (
              <p className="text-xs text-[color:var(--success)] mt-3">
                มีรอบชิงแล้ว: {finalLobbies.length} เกม · {teamsFor(finalLobbies[0]).length} ทีม (
                {teamsFor(finalLobbies[0]).map((t) => t.tag).join(", ")})
              </p>
            )}
          </div>

          {/* ล็อบบี้รอบแบ่งสาย */}
          <h2 className="text-xl font-bold mb-3">รอบแบ่งสาย</h2>
          <div className="space-y-6 mb-10">
            {groupLobbies.map((l) => (
              <LobbyCard key={l.id} l={l} />
            ))}
            {groupLobbies.length === 0 && <p className="text-[color:var(--text-dim)]">ยังไม่มีล็อบบี้</p>}
          </div>

          {/* ล็อบบี้รอบชิง */}
          {finalLobbies.length > 0 && (
            <>
              <h2 className="text-xl font-bold mb-3">🏆 รอบชิงชนะเลิศ</h2>
              <div className="space-y-6">
                {finalLobbies.map((l) => (
                  <LobbyCard key={l.id} l={l} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
