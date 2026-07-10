"use client";

import { useState } from "react";

// ช่องซ่อนสำหรับกันบอท: มนุษย์มองไม่เห็น (บอทมักกรอกทุกช่อง)
// + เก็บเวลาที่โหลดฟอร์มไว้ตรวจว่าไม่ได้กรอกเร็วผิดปกติ
export function HoneypotFields() {
  const [formTs] = useState(() => Date.now());
  return (
    <>
      <input type="hidden" name="formTs" value={formTs} readOnly />
      <div aria-hidden className="hidden" style={{ display: "none" }}>
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </label>
      </div>
    </>
  );
}
