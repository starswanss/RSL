"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type ActionState } from "../actions";

const initial: ActionState = { ok: false, message: "" };
const input =
  "w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 outline-none focus:border-[color:var(--brand)]";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rsl-btn rsl-btn-primary w-full justify-center disabled:opacity-60">
      {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="rsl-card p-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">ชื่อผู้ใช้</label>
        <input name="username" required autoComplete="username" className={input} />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">รหัสผ่าน</label>
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </div>
      {state.message && (
        <div className="text-sm rounded-lg px-4 py-3 bg-[color:var(--danger)]/15 text-[color:var(--danger)]">
          {state.message}
        </div>
      )}
      <Btn />
    </form>
  );
}
