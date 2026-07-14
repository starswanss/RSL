"use client";

import { createFinalsAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const input =
  "bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[color:var(--brand)]";

export function FinalsForm({
  gameId,
  hasFinals,
}: {
  gameId: string;
  hasFinals: boolean;
}) {
  return (
    <form
      action={createFinalsAction}
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        if (
          hasFinals &&
          !window.confirm(
            "สร้างรอบชิงใหม่จะลบรอบชิงเดิมและผลของรอบชิงทั้งหมด (คะแนนรอบแบ่งสายไม่หาย) ยืนยันหรือไม่?"
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="gameId" value={gameId} />
      <div>
        <label className="block text-xs text-[color:var(--text-dim)] mb-1">เข้าชิงสายละ (ทีม)</label>
        <input name="topN" type="number" min={1} max={8} defaultValue={2} className={`${input} w-24`} />
      </div>
      <div>
        <label className="block text-xs text-[color:var(--text-dim)] mb-1">จำนวนเกมรอบชิง</label>
        <input name="rounds" type="number" min={1} max={30} defaultValue={3} className={`${input} w-24`} />
      </div>
      <div>
        <label className="block text-xs text-[color:var(--text-dim)] mb-1">เวลาเริ่ม (เกมแรก)</label>
        <input name="startAt" type="datetime-local" className={input} />
      </div>
      <div>
        <label className="block text-xs text-[color:var(--text-dim)] mb-1">ห่างกัน (นาที)</label>
        <input name="gapMinutes" type="number" min={0} defaultValue={30} className={`${input} w-24`} />
      </div>
      <SubmitButton className="rsl-btn rsl-btn-primary text-sm" pendingText="กำลังสร้าง...">
        🏆 {hasFinals ? "สร้างรอบชิงใหม่" : "สร้างรอบชิงชนะเลิศ"}
      </SubmitButton>
    </form>
  );
}
