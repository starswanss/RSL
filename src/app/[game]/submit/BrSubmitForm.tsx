"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitBrResult, type SubmitState } from "./actions";

export type LobbyTeam = { id: string; name: string; tag: string };
export type LobbyOption = {
  id: string;
  label: string;
  teams: LobbyTeam[];
};

const initial: SubmitState = { ok: false, message: "" };
const input =
  "w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 outline-none focus:border-[color:var(--brand)]";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rsl-btn rsl-btn-primary w-full justify-center disabled:opacity-60">
      {pending ? "กำลังส่ง..." : "ส่งผลล็อบบี้"}
    </button>
  );
}

export function BrSubmitForm({ lobbies }: { lobbies: LobbyOption[] }) {
  const [state, action] = useActionState(submitBrResult, initial);
  const [sel, setSel] = useState<LobbyOption | null>(null);

  return (
    <form action={action} className="rsl-card p-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">เลือกล็อบบี้ *</label>
        <select
          name="brMatchId"
          required
          defaultValue=""
          onChange={(e) => setSel(lobbies.find((l) => l.id === e.target.value) || null)}
          className={input}
        >
          <option value="" disabled>— เลือกล็อบบี้ที่แข่งจบแล้ว —</option>
          {lobbies.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
      </div>

      {sel && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold">ผลแต่ละทีม (อันดับ + คิลล์)</label>
            <span className="text-xs text-[color:var(--text-dim)]">แต้ม = อันดับ + คิลล์</span>
          </div>
          <div className="rsl-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[color:var(--text-dim)] text-xs border-b border-[color:var(--border)]">
                  <th className="text-left px-3 py-2">ทีม</th>
                  <th className="px-2 py-2 w-24">อันดับ</th>
                  <th className="px-2 py-2 w-24">คิลล์</th>
                </tr>
              </thead>
              <tbody>
                {sel.teams.map((t) => (
                  <tr key={t.id} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-3 py-2 font-medium">{t.name} <span className="text-xs text-[color:var(--text-dim)]">({t.tag})</span></td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        name={`placement_${t.id}`}
                        min={1}
                        max={sel.teams.length}
                        placeholder="-"
                        className="w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded px-2 py-1.5 text-center outline-none focus:border-[color:var(--brand)]"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        name={`kills_${t.id}`}
                        min={0}
                        defaultValue={0}
                        className="w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded px-2 py-1.5 text-center outline-none focus:border-[color:var(--brand)]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[color:var(--text-dim)] mt-2">
            กรอกอันดับ 1 ถึง {sel.teams.length} ห้ามซ้ำ (เว้นว่างได้ถ้าทีมไม่ได้ลงเกมนั้น)
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">ชื่อผู้ส่งผล *</label>
          <input name="submitterName" required className={input} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">ลิงก์ภาพสกอร์บอร์ด</label>
          <input type="url" name="proofUrl" placeholder="https://..." className={input} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">หมายเหตุ</label>
        <textarea name="note" rows={2} className={input} />
      </div>

      {state.message && (
        <div className={`text-sm rounded-lg px-4 py-3 ${state.ok ? "bg-[color:var(--success)]/15 text-[color:var(--success)]" : "bg-[color:var(--danger)]/15 text-[color:var(--danger)]"}`}>
          {state.message}
        </div>
      )}
      <Btn />
    </form>
  );
}
