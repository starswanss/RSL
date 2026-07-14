"use client";

import { resetSiteAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const input =
  "bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[color:var(--danger)]";

export function ResetSiteForm({ year }: { year: number }) {
  return (
    <form
      action={resetSiteAction}
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        if (
          !window.confirm(
            "รีเซ็ตเว็บ?\n\nจะลบ: ทีม, ผู้เล่น, แมตช์, ล็อบบี้, ผลการแข่ง, ผลที่ส่งเข้ามา, ข่าว และไฟล์หลักฐาน\nเก็บไว้: เกม, บัญชีแอดมิน, โลโก้เว็บ, ข้อมูลสำรองทุกชุด\n\nระบบจะสำรองข้อมูลอัตโนมัติก่อนลบ"
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="year" value={year} />
      <div>
        <label className="block text-xs text-[color:var(--text-dim)] mb-1">
          พิมพ์ <strong className="text-[color:var(--danger)]">รีเซ็ต</strong> เพื่อยืนยัน
        </label>
        <input name="confirmText" required placeholder="รีเซ็ต" className={`${input} w-40`} />
      </div>
      <SubmitButton
        className="rsl-btn rsl-btn-ghost text-sm text-[color:var(--danger)]"
        pendingText="กำลังรีเซ็ต..."
      >
        ⚠️ รีเซ็ตเว็บ (เริ่มซีซั่นใหม่)
      </SubmitButton>
    </form>
  );
}
