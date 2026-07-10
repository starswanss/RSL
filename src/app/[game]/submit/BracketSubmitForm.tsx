"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitBracketResult, type SubmitState } from "./actions";
import { HoneypotFields } from "./HoneypotFields";

export type MatchOption = {
  id: string;
  label: string;
  bestOf: number;
  homeName: string;
  awayName: string;
};

const initial: SubmitState = { ok: false, message: "" };
const input =
  "w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 outline-none focus:border-[color:var(--brand)]";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rsl-btn rsl-btn-primary w-full justify-center disabled:opacity-60">
      {pending ? "กำลังส่ง..." : "ส่งผลการแข่งขัน"}
    </button>
  );
}

export function BracketSubmitForm({ matches }: { matches: MatchOption[] }) {
  const [state, action] = useActionState(submitBracketResult, initial);
  const [sel, setSel] = useState<MatchOption | null>(null);

  return (
    <form action={action} className="rsl-card p-6 space-y-4">
      <HoneypotFields />
      <div>
        <label className="block text-sm font-semibold mb-1">เลือกแมตช์ *</label>
        <select
          name="matchId"
          required
          defaultValue=""
          onChange={(e) => setSel(matches.find((m) => m.id === e.target.value) || null)}
          className={input}
        >
          <option value="" disabled>— เลือกแมตช์ที่แข่งจบแล้ว —</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">สกอร์ {sel?.homeName ?? "ทีมเหย้า"}</label>
          <input type="number" name="homeScore" min={0} max={9} required className={input} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">สกอร์ {sel?.awayName ?? "ทีมเยือน"}</label>
          <input type="number" name="awayScore" min={0} max={9} required className={input} />
        </div>
      </div>
      {sel && (
        <p className="text-xs text-[color:var(--text-dim)] -mt-2">
          BO{sel.bestOf} — ผู้ชนะต้องได้ {Math.ceil(sel.bestOf / 2)} เกม
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">ชื่อผู้ส่งผล *</label>
          <input name="submitterName" required className={input} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">ทีมของคุณ</label>
          <input name="submitterTeam" className={input} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">ลิงก์ภาพสกอร์บอร์ด (หลักฐาน) *</label>
        <input type="url" name="proofUrl" required placeholder="https://..." className={input} />
        <p className="text-xs text-[color:var(--text-dim)] mt-1">
          แนบลิงก์รูปสกอร์บอร์ด (เช่น Google Drive, imgur) เพื่อให้แอดมินตรวจสอบได้
        </p>
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
