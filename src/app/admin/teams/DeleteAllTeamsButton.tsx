"use client";

import { deleteAllTeamsAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

export function DeleteAllTeamsButton({
  gameId,
  gameName,
  count,
}: {
  gameId: string;
  gameName: string;
  count: number;
}) {
  if (count === 0) return null;
  return (
    <form
      action={deleteAllTeamsAction}
      onSubmit={(e) => {
        const ok = window.confirm(
          `ลบทีมทั้งหมด ${count} ทีมของ "${gameName}"?\n\n` +
            `ผู้เล่นและผลการแข่งที่ผูกกับทีมจะถูกลบไปด้วย — การกระทำนี้ย้อนกลับไม่ได้`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="confirmText" value="ลบทั้งหมด" />
      <SubmitButton className="rsl-btn rsl-btn-ghost text-sm text-[color:var(--danger)]" pendingText="กำลังลบ...">
        🗑 ลบทีมทั้งหมด ({count})
      </SubmitButton>
    </form>
  );
}
