"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { importTeamsAction, type ActionState } from "../actions";

const initial: ActionState = { ok: false, message: "" };

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rsl-btn rsl-btn-primary text-sm disabled:opacity-60">
      {pending ? "กำลังนำเข้า..." : "นำเข้าจาก Excel"}
    </button>
  );
}

export function ImportTeamsForm({ gameId }: { gameId: string }) {
  const [state, action] = useActionState(importTeamsAction, initial);
  return (
    <form action={action} className="rsl-card p-5 mb-6">
      <input type="hidden" name="gameId" value={gameId} />
      <h2 className="font-bold mb-1">นำเข้าทีมจากไฟล์ Excel</h2>
      <p className="text-xs text-[color:var(--text-dim)] mb-3">
        รองรับ .xlsx .xls .csv · คอลัมน์:{" "}
        <code className="text-[color:var(--text)]">ทีม, ตัวย่อ, กลุ่ม, seed, ผู้เล่น, ตำแหน่ง, กัปตัน</code>{" "}
        (หนึ่งแถวต่อผู้เล่นหนึ่งคน) ·{" "}
        <a href="/admin/teams/template" className="text-[color:var(--accent)] underline">
          ดาวน์โหลดเทมเพลต
        </a>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".xlsx,.xls,.csv"
          required
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[color:var(--card-hover)] file:px-3 file:py-2 file:text-[color:var(--text)] file:cursor-pointer"
        />
        <Btn />
      </div>
      {state.message && (
        <div className={`mt-3 text-sm rounded-lg px-4 py-3 ${state.ok ? "bg-[color:var(--success)]/15 text-[color:var(--success)]" : "bg-[color:var(--danger)]/15 text-[color:var(--danger)]"}`}>
          {state.message}
          {state.ok && " — รีเฟรชหน้าเพื่อดูรายชื่อทีมที่เพิ่ม"}
        </div>
      )}
    </form>
  );
}
