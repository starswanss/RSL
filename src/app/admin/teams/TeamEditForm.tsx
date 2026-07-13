"use client";

import { useState } from "react";
import { updateTeamAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const input =
  "bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[color:var(--brand)]";

type Team = {
  id: string;
  name: string;
  tag: string;
  phone: string | null;
  groupName: string | null;
  seed: number | null;
};

export function TeamEditForm({
  team,
  gameId,
  isBr,
}: {
  team: Team;
  gameId: string;
  isBr: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[color:var(--accent)] hover:underline"
      >
        ✎ แก้ไขข้อมูลทีม
      </button>
    );
  }

  return (
    <form
      action={updateTeamAction}
      className="mt-1 flex flex-wrap items-end gap-2 border-t border-[color:var(--border)] pt-3"
    >
      <input type="hidden" name="id" value={team.id} />
      <input type="hidden" name="gameId" value={gameId} />
      <div>
        <label className="block text-[10px] text-[color:var(--text-dim)] mb-0.5">ชื่อทีม *</label>
        <input name="name" required defaultValue={team.name} className={input} />
      </div>
      <div>
        <label className="block text-[10px] text-[color:var(--text-dim)] mb-0.5">ตัวย่อ *</label>
        <input name="tag" required maxLength={5} defaultValue={team.tag} className={`${input} w-24`} />
      </div>
      <div>
        <label className="block text-[10px] text-[color:var(--text-dim)] mb-0.5">เบอร์โทร</label>
        <input
          name="phone"
          type="tel"
          defaultValue={team.phone ?? ""}
          placeholder="08x-xxx-xxxx"
          className={`${input} w-40`}
        />
      </div>
      {isBr ? (
        <div>
          <label className="block text-[10px] text-[color:var(--text-dim)] mb-0.5">กลุ่ม</label>
          <input name="groupName" defaultValue={team.groupName ?? ""} className={`${input} w-20`} />
        </div>
      ) : (
        <div>
          <label className="block text-[10px] text-[color:var(--text-dim)] mb-0.5">Seed</label>
          <input
            name="seed"
            type="number"
            min={1}
            defaultValue={team.seed ?? ""}
            className={`${input} w-24`}
          />
        </div>
      )}
      <SubmitButton className="rsl-btn rsl-btn-primary text-sm" pendingText="กำลังบันทึก...">บันทึก</SubmitButton>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-[color:var(--text-dim)] hover:underline px-2"
      >
        ยกเลิก
      </button>
    </form>
  );
}
