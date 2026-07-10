"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createTeamAction } from "../actions";

const input =
  "bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[color:var(--brand)]";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rsl-btn rsl-btn-primary text-sm disabled:opacity-60">
      {pending ? "กำลังบันทึก..." : "+ เพิ่มทีม"}
    </button>
  );
}

export function TeamCreateForm({
  gameId,
  isBr,
}: {
  gameId: string;
  isBr: boolean;
}) {
  const [rows, setRows] = useState<number[]>([0, 1, 2, 3, 4]);
  const [captain, setCaptain] = useState(0);
  const [nextId, setNextId] = useState(5);

  const addRow = () => {
    setRows((r) => [...r, nextId]);
    setNextId((n) => n + 1);
  };
  const removeRow = (id: number) =>
    setRows((r) => (r.length > 1 ? r.filter((x) => x !== id) : r));

  return (
    <form action={createTeamAction} className="rsl-card p-5 mb-6 space-y-4">
      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="captainIndex" value={captain} />

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-[color:var(--text-dim)] mb-1">ชื่อทีม *</label>
          <input name="name" required className={input} placeholder="ชื่อทีม" />
        </div>
        <div>
          <label className="block text-xs text-[color:var(--text-dim)] mb-1">ตัวย่อ *</label>
          <input name="tag" required maxLength={5} className={`${input} w-24`} placeholder="TAG" />
        </div>
        <div>
          <label className="block text-xs text-[color:var(--text-dim)] mb-1">เบอร์โทร</label>
          <input name="phone" type="tel" className={`${input} w-40`} placeholder="08x-xxx-xxxx" />
        </div>
        {isBr ? (
          <div>
            <label className="block text-xs text-[color:var(--text-dim)] mb-1">กลุ่ม</label>
            <input name="groupName" className={`${input} w-20`} placeholder="A" />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-[color:var(--text-dim)] mb-1">Seed (ลำดับสาย)</label>
            <input name="seed" type="number" min={1} className={`${input} w-28`} placeholder="1" />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold">รายชื่อผู้แข่ง (ผู้เล่น)</label>
          <span className="text-xs text-[color:var(--text-dim)]">เลือกวงกลมเพื่อกำหนดกัปตัน</span>
        </div>
        <div className="space-y-2">
          {rows.map((id, idx) => (
            <div key={id} className="flex items-center gap-2">
              <input
                type="radio"
                name="captainRadio"
                checked={captain === idx}
                onChange={() => setCaptain(idx)}
                title="ตั้งเป็นกัปตัน"
                className="accent-[color:var(--brand)]"
              />
              <input
                name="playerNickname"
                placeholder={`ชื่อผู้แข่งคนที่ ${idx + 1}`}
                className={`${input} flex-1`}
              />
              <input name="playerRole" placeholder="ตำแหน่ง (ไม่บังคับ)" className={`${input} w-40`} />
              <button
                type="button"
                onClick={() => removeRow(id)}
                className="w-8 h-8 rounded-lg text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10"
                title="ลบแถว"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 text-sm text-[color:var(--accent)] hover:underline"
        >
          + เพิ่มผู้แข่ง
        </button>
        <p className="text-xs text-[color:var(--text-dim)] mt-1">
          เว้นช่องว่างได้ ระบบจะบันทึกเฉพาะแถวที่กรอกชื่อ
        </p>
      </div>

      <Btn />
    </form>
  );
}
