import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  approveBracketAction,
  rejectBracketAction,
  approveBrAction,
  rejectBrAction,
} from "./actions";
import { TeamLogo } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { fmtDateTime } from "@/lib/format";
import { computePoints } from "@/lib/br";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตรวจผลแข่ง" };

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  if (!(await getSession())) redirect("/admin/login");
  const sp = await searchParams;

  const [bracketSubs, brSubs, gameCount, teamCount, pendingCount] = await Promise.all([
    prisma.resultSubmission.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { match: { include: { homeTeam: true, awayTeam: true, game: true } } },
    }),
    prisma.brSubmission.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        brMatch: { include: { game: true } },
        rows: { include: { team: true }, orderBy: { placement: "asc" } },
      },
    }),
    prisma.game.count(),
    prisma.team.count(),
    prisma.resultSubmission.count({ where: { status: "PENDING" } }),
  ]);

  const totalPending = bracketSubs.length + brSubs.length;

  return (
    <div>
      {sp.ok && (
        <div className="mb-5 text-sm rounded-lg px-4 py-3 bg-[color:var(--success)]/15 text-[color:var(--success)]">{sp.ok}</div>
      )}
      {sp.error && (
        <div className="mb-5 text-sm rounded-lg px-4 py-3 bg-[color:var(--danger)]/15 text-[color:var(--danger)]">{sp.error}</div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "เกม", value: gameCount },
          { label: "ทีมรวม", value: teamCount },
          { label: "รออนุมัติ", value: totalPending },
        ].map((s) => (
          <div key={s.label} className="rsl-card p-4 text-center">
            <div className="text-3xl font-extrabold rsl-gradient-text">{s.value}</div>
            <div className="text-xs text-[color:var(--text-dim)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <h1 className="text-2xl font-extrabold mb-4">ผลที่รออนุมัติ</h1>
      {totalPending === 0 && (
        <div className="rsl-card p-6 text-[color:var(--text-dim)]">ไม่มีผลที่รอตรวจสอบ 🎉</div>
      )}

      {/* Bracket submissions */}
      {bracketSubs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-[color:var(--text-dim)] mb-3">สายแพ้คัดออก (RoV / FC)</h2>
          <div className="space-y-4">
            {bracketSubs.map((s) => {
              const m = s.match;
              const homeWin = s.homeScore > s.awayScore;
              return (
                <div key={s.id} className="rsl-card p-5">
                  <div className="flex items-center justify-between mb-3 text-xs text-[color:var(--text-dim)]">
                    <span className="font-semibold text-[color:var(--text)]">
                      [{m.game.name}] {m.round} · BO{m.bestOf}
                    </span>
                    <span>ส่งเมื่อ {fmtDateTime(s.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-center gap-4 py-2">
                    <div className={`flex items-center gap-2 ${homeWin ? "text-[color:var(--brand)] font-bold" : ""}`}>
                      <TeamLogo tag={m.homeTeam?.tag ?? "?"} size={30} />
                      <span>{m.homeTeam?.name}</span>
                    </div>
                    <div className="text-2xl font-extrabold tabular-nums px-3">{s.homeScore} : {s.awayScore}</div>
                    <div className={`flex items-center gap-2 ${!homeWin ? "text-[color:var(--brand)] font-bold" : ""}`}>
                      <span>{m.awayTeam?.name}</span>
                      <TeamLogo tag={m.awayTeam?.tag ?? "?"} size={30} />
                    </div>
                  </div>
                  <div className="text-xs text-[color:var(--text-dim)] mt-2">
                    ผู้ส่ง: {s.submitterName}{s.submitterTeam ? ` (${s.submitterTeam})` : ""}
                    {s.note ? ` · ${s.note}` : ""}
                    {s.proofUrl && (
                      <> · <a href={s.proofUrl} target="_blank" rel="noopener noreferrer" className="text-[color:var(--accent)] underline">หลักฐาน</a></>
                    )}
                  </div>
                  {(s.submitterIp || s.userAgent) && (
                    <div className="text-[10px] text-[color:var(--text-dim)] mt-1 opacity-70 truncate">
                      IP: {s.submitterIp || "-"}{s.userAgent ? ` · ${s.userAgent}` : ""}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 items-center">
                    <form action={approveBracketAction}>
                      <input type="hidden" name="submissionId" value={s.id} />
                      <SubmitButton className="rsl-btn rsl-btn-primary text-sm" pendingText="กำลังอนุมัติ...">✓ อนุมัติ</SubmitButton>
                    </form>
                    <form action={rejectBracketAction} className="flex items-center gap-2 flex-1 min-w-[220px]">
                      <input type="hidden" name="submissionId" value={s.id} />
                      <input name="adminNote" placeholder="เหตุผลที่ปฏิเสธ" className="flex-1 bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-sm outline-none" />
                      <SubmitButton className="rsl-btn rsl-btn-ghost text-sm text-[color:var(--danger)]" pendingText="กำลังปฏิเสธ...">✕ ปฏิเสธ</SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* BR submissions */}
      {brSubs.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-[color:var(--text-dim)] mb-3">Battle Royale (Free Fire)</h2>
          <div className="space-y-4">
            {brSubs.map((s) => (
              <div key={s.id} className="rsl-card p-5">
                <div className="flex items-center justify-between mb-3 text-xs text-[color:var(--text-dim)]">
                  <span className="font-semibold text-[color:var(--text)]">
                    [{s.brMatch.game.name}] สาย {s.brMatch.groupName} · {s.brMatch.title || `เกมที่ ${s.brMatch.matchNo}`}
                  </span>
                  <span>ส่งเมื่อ {fmtDateTime(s.createdAt)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[color:var(--text-dim)] text-xs border-b border-[color:var(--border)]">
                        <th className="text-left px-2 py-1">อันดับ</th>
                        <th className="text-left px-2 py-1">ทีม</th>
                        <th className="px-2 py-1">คิลล์</th>
                        <th className="px-2 py-1">แต้ม (คำนวณ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.rows.map((r) => (
                        <tr key={r.id} className="border-b border-[color:var(--border)] last:border-0">
                          <td className="px-2 py-1 font-bold">#{r.placement}</td>
                          <td className="px-2 py-1">{r.team.name}</td>
                          <td className="px-2 py-1 text-center">{r.kills}</td>
                          <td className="px-2 py-1 text-center font-bold text-[color:var(--brand)]">
                            {computePoints(r.placement, r.kills)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-[color:var(--text-dim)] mt-2">
                  ผู้ส่ง: {s.submitterName}
                  {s.proofUrl && (
                    <> · <a href={s.proofUrl} target="_blank" rel="noopener noreferrer" className="text-[color:var(--accent)] underline">หลักฐาน</a></>
                  )}
                </div>
                {(s.submitterIp || s.userAgent) && (
                  <div className="text-[10px] text-[color:var(--text-dim)] mt-1 opacity-70 truncate">
                    IP: {s.submitterIp || "-"}{s.userAgent ? ` · ${s.userAgent}` : ""}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <form action={approveBrAction}>
                    <input type="hidden" name="submissionId" value={s.id} />
                    <SubmitButton className="rsl-btn rsl-btn-primary text-sm" pendingText="กำลังอนุมัติ...">✓ อนุมัติ (อัปเดตคะแนน)</SubmitButton>
                  </form>
                  <form action={rejectBrAction} className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <input type="hidden" name="submissionId" value={s.id} />
                    <input name="adminNote" placeholder="เหตุผลที่ปฏิเสธ" className="flex-1 bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-sm outline-none" />
                    <SubmitButton className="rsl-btn rsl-btn-ghost text-sm text-[color:var(--danger)]" pendingText="กำลังปฏิเสธ...">✕ ปฏิเสธ</SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
