"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { createGameAction, type ActionState } from "../actions";

const initial: ActionState = { ok: false, message: "" };
const input =
  "w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 outline-none focus:border-[color:var(--brand)]";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rsl-btn rsl-btn-primary disabled:opacity-60">
      {pending ? "กำลังบันทึก..." : "เพิ่มเกม"}
    </button>
  );
}

export function GameForm() {
  const [state, action] = useActionState(createGameAction, initial);
  const [format, setFormat] = useState("BRACKET");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="rsl-card p-6 space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">ชื่อเกม *</label>
          <input name="name" required className={input} placeholder="เช่น PUBG Mobile" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">ตัวย่อ *</label>
          <input name="shortName" required maxLength={4} className={input} placeholder="PUBG" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">slug (URL) *</label>
          <input name="slug" required className={input} placeholder="pubg" />
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">รูปแบบ *</label>
          <select name="format" value={format} onChange={(e) => setFormat(e.target.value)} className={input}>
            <option value="BRACKET">สายแพ้คัดออก (Bracket)</option>
            <option value="BATTLE_ROYALE">Battle Royale (แบ่งกลุ่ม)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">
            ทีมต่อกลุ่ม {format !== "BATTLE_ROYALE" && "(เฉพาะ BR)"}
          </label>
          <input name="groupSize" type="number" min={2} defaultValue={12} disabled={format !== "BATTLE_ROYALE"} className={`${input} disabled:opacity-50`} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">สีประจำเกม</label>
          <input name="color" type="color" defaultValue="#f5c518" className="w-full h-11 bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-1" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">คำโปรย</label>
        <input name="tagline" className={input} placeholder="คำอธิบายสั้น ๆ ของเกม" />
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
