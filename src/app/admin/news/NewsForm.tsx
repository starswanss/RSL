"use client";

import { useActionState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { createNewsAction, type ActionState } from "../actions";

const initial: ActionState = { ok: false, message: "" };
const input =
  "w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 outline-none focus:border-[color:var(--brand)]";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rsl-btn rsl-btn-primary disabled:opacity-60">
      {pending ? "กำลังเผยแพร่..." : "เผยแพร่ข่าว"}
    </button>
  );
}

export function NewsForm({ games }: { games: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createNewsAction, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="rsl-card p-6 space-y-4">
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">เกม *</label>
          <select name="gameId" required className={input} defaultValue="">
            <option value="" disabled>— เลือกเกม —</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">หัวข้อ *</label>
          <input name="title" required className={input} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">หมวด</label>
          <select name="category" className={input} defaultValue="ข่าวทั่วไป">
            <option>ข่าวทั่วไป</option>
            <option>ประกาศ</option>
            <option>ผลการแข่งขัน</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">คำโปรย *</label>
        <input name="excerpt" required className={input} />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">เนื้อหา *</label>
        <textarea name="content" rows={6} required className={input} />
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
