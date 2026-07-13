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

// ผลที่เป็นไปได้ของ BO n (ผู้ชนะต้องได้ ceil(n/2) เกม, ห้ามเสมอ)
function scorelines(bestOf: number) {
  const w = Math.ceil(bestOf / 2);
  const lines: { h: number; a: number }[] = [];
  for (let l = 0; l < w; l++) lines.push({ h: w, a: l }); // ทีมเหย้าชนะ
  for (let l = w - 1; l >= 0; l--) lines.push({ h: l, a: w }); // ทีมเยือนชนะ
  return lines;
}

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
  const [score, setScore] = useState<{ h: number; a: number } | null>(null);

  return (
    <form action={action} className="rsl-card p-6 space-y-4">
      <HoneypotFields />
      <div>
        <label className="block text-sm font-semibold mb-1">เลือกแมตช์ *</label>
        <select
          name="matchId"
          required
          defaultValue=""
          onChange={(e) => {
            setSel(matches.find((m) => m.id === e.target.value) || null);
            setScore(null);
          }}
          className={input}
        >
          <option value="" disabled>— เลือกแมตช์ที่แข่งจบแล้ว —</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">
          ผลการแข่งขัน {sel ? `(BO${sel.bestOf})` : ""} *
        </label>
        <select
          required
          disabled={!sel}
          value={score ? `${score.h}-${score.a}` : ""}
          onChange={(e) => {
            const [h, a] = e.target.value.split("-").map(Number);
            setScore({ h, a });
          }}
          className={`${input} disabled:opacity-50`}
        >
          <option value="" disabled>
            {sel ? "— เลือกผล (ทีมชนะ–แพ้) —" : "— เลือกแมตช์ก่อน —"}
          </option>
          {sel &&
            scorelines(sel.bestOf).map(({ h, a }) => (
              <option key={`${h}-${a}`} value={`${h}-${a}`}>
                {sel.homeName} {h} - {a} {sel.awayName}
              </option>
            ))}
        </select>
        <input type="hidden" name="homeScore" value={score?.h ?? ""} />
        <input type="hidden" name="awayScore" value={score?.a ?? ""} />
      </div>
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
