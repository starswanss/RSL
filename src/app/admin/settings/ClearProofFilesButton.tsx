"use client";

import { clearAllProofFilesAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

export function ClearProofFilesButton() {
  return (
    <form
      action={clearAllProofFilesAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "ลบไฟล์รูปหลักฐานทั้งหมดออกจาก UploadThing?\n\nใช้เพื่อกันพื้นที่เต็ม — รูปที่ผู้ส่งแนบมาจะหายถาวร (ผลการแข่งที่อนุมัติแล้วไม่หาย)"
          )
        )
          e.preventDefault();
      }}
    >
      <SubmitButton
        className="rsl-btn rsl-btn-ghost text-sm text-[color:var(--danger)]"
        pendingText="กำลังล้าง..."
      >
        🧹 ล้างไฟล์หลักฐานทั้งหมด
      </SubmitButton>
    </form>
  );
}
