import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminGamePicker } from "@/components/AdminGamePicker";
import {
  generateBracketAction,
  recordBracketResultAction,
  setRoundScheduleAction,
} from "../actions";
import { StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { fmtDateTime, toDatetimeLocalTH } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "จัดการสาย" };

export default async function AdminBracketPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; ok?: string; error?: string }>;
}) {
  if (!(await getSession())) redirect("/admin/login");
  const sp = await searchParams;

  const games = await prisma.game.findMany({
    where: { format: "BRACKET" },
    orderBy: { order: "asc" },
  });
  const currentId = sp.game || games[0]?.id;
  const game = games.find((g) => g.id === currentId);

  const teams = game
    ? await prisma.team.findMany({
        where: { gameId: game.id },
        orderBy: [{ seed: "asc" }, { name: "asc" }],
      })
    : [];
  const matches = game
    ? await prisma.match.findMany({
        where: { gameId: game.id },
        orderBy: [{ roundOrder: "asc" }, { bracketOrder: "asc" }],
        include: { homeTeam: true, awayTeam: true },
      })
    : [];

  // จัดกลุ่มแมตช์ตามรอบ (roundOrder) เพื่อกำหนดวัน–เวลาเป็นรอบ
  const rounds = matches.reduce<
    { roundOrder: number; round: string; scheduledAt: Date | null; matches: typeof matches }[]
  >((acc, m) => {
    let g = acc.find((x) => x.roundOrder === m.roundOrder);
    if (!g) {
      g = { roundOrder: m.roundOrder, round: m.round, scheduledAt: m.scheduledAt, matches: [] };
      acc.push(g);
    }
    g.matches.push(m);
    return acc;
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">จัดการสายแพ้คัดออก</h1>
      {sp.ok && <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[color:var(--success)]/15 text-[color:var(--success)]">{sp.ok}</div>}
      {sp.error && <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[color:var(--danger)]/15 text-[color:var(--danger)]">{sp.error}</div>}

      <AdminGamePicker games={games} current={currentId} basePath="/admin/bracket" />

      {!game ? (
        <p className="text-[color:var(--text-dim)]">ไม่มีเกมแบบ Bracket</p>
      ) : (
        <>
          {/* สร้างสาย */}
          <form action={generateBracketAction} className="rsl-card p-5 mb-8">
            <h2 className="font-bold mb-1">สร้าง/รีเซ็ตสายการแข่งขัน</h2>
            <p className="text-xs text-[color:var(--text-dim)] mb-3">
              เลือกทีม (เรียงตาม Seed) แล้วระบบจะสร้างสายให้อัตโนมัติ · การสร้างใหม่จะลบสายเดิม
            </p>
            <input type="hidden" name="gameId" value={game.id} />
            {teams.length < 2 ? (
              <p className="text-sm text-[color:var(--danger)]">ต้องมีอย่างน้อย 2 ทีม (เพิ่มที่เมนู &quot;ทีม&quot;)</p>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                  {teams.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2 cursor-pointer">
                      <input type="checkbox" name="teamIds" value={t.id} defaultChecked />
                      <span className="font-medium">{t.name}</span>
                      <span className="text-xs text-[color:var(--text-dim)] ml-auto">{t.seed != null ? `Seed ${t.seed}` : t.tag}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm">Best of
                    <select name="bestOf" defaultValue="3" className="ml-2 bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-2 py-1.5 text-sm">
                      <option value="1">1</option>
                      <option value="3">3</option>
                      <option value="5">5</option>
                      <option value="7">7</option>
                    </select>
                  </label>
                  <SubmitButton className="rsl-btn rsl-btn-primary text-sm" pendingText="กำลังสร้างสาย...">สร้างสาย</SubmitButton>
                </div>
              </>
            )}
          </form>

          {/* บันทึกผล + กำหนดวัน–เวลาเป็นรอบ */}
          <h2 className="text-xl font-bold mb-4">รอบการแข่งขัน</h2>
          {matches.length === 0 ? (
            <p className="text-[color:var(--text-dim)]">ยังไม่มีสาย</p>
          ) : (
            <div className="space-y-6">
              {rounds.map((rd) => (
                <div key={rd.roundOrder}>
                  {/* หัวรอบ + กำหนดวัน–เวลาทั้งรอบ */}
                  <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold">{rd.round}</h3>
                      <p className="text-xs text-[color:var(--text-dim)] mt-0.5">
                        🗓 {fmtDateTime(rd.scheduledAt)} · {rd.matches.length} คู่
                      </p>
                    </div>
                    <form action={setRoundScheduleAction} className="flex items-end gap-2">
                      <input type="hidden" name="gameId" value={game.id} />
                      <input type="hidden" name="roundOrder" value={rd.roundOrder} />
                      <div>
                        <label className="block text-[10px] text-[color:var(--text-dim)]">วัน–เวลาแข่งทั้งรอบ</label>
                        <input
                          type="datetime-local"
                          name="scheduledAt"
                          defaultValue={toDatetimeLocalTH(rd.scheduledAt)}
                          className="bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[color:var(--brand)]"
                        />
                      </div>
                      <SubmitButton className="rsl-btn rsl-btn-ghost text-sm" pendingText="กำลังบันทึก...">ตั้งเวลาทั้งรอบ</SubmitButton>
                    </form>
                  </div>

                  {/* คู่ในรอบนี้ */}
                  <div className="space-y-3">
                    {rd.matches.map((m) => {
                      const ready = m.homeTeamId && m.awayTeamId;
                      return (
                        <div key={m.id} className="rsl-card p-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-[color:var(--text-dim)]">
                              <span>BO{m.bestOf}</span>
                              <StatusBadge status={m.status} />
                            </div>
                            <p className="font-semibold mt-1">
                              {m.homeTeam?.name ?? "รอผู้ชนะ"} <span className="text-[color:var(--text-dim)]">vs</span> {m.awayTeam?.name ?? "รอผู้ชนะ"}
                              {m.status === "COMPLETED" && (
                                <span className="ml-2 text-[color:var(--brand)] font-extrabold">{m.homeScore} : {m.awayScore}</span>
                              )}
                            </p>
                          </div>
                          {ready && m.status !== "COMPLETED" && (
                            <form action={recordBracketResultAction} className="flex items-end gap-2">
                              <input type="hidden" name="gameId" value={game.id} />
                              <input type="hidden" name="matchId" value={m.id} />
                              <div className="text-center">
                                <label className="block text-[10px] text-[color:var(--text-dim)]">{m.homeTeam?.tag}</label>
                                <input name="homeScore" type="number" min={0} max={9} required className="w-14 bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-2 py-1.5 text-center outline-none" />
                              </div>
                              <span className="pb-1.5">:</span>
                              <div className="text-center">
                                <label className="block text-[10px] text-[color:var(--text-dim)]">{m.awayTeam?.tag}</label>
                                <input name="awayScore" type="number" min={0} max={9} required className="w-14 bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-2 py-1.5 text-center outline-none" />
                              </div>
                              <SubmitButton className="rsl-btn rsl-btn-primary text-sm" pendingText="กำลังบันทึก...">บันทึก</SubmitButton>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
