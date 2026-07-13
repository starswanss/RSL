"use client";

import { useFormStatus } from "react-dom";

function Spinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

// ปุ่ม submit ที่แสดงสถานะ "กำลังทำงาน" ทันทีที่กด (ใช้ useFormStatus)
// วางไว้ใน <form> ที่ใช้ server action — กันกดซ้ำ + ให้ผู้ใช้รู้ว่าระบบกำลังประมวลผล
export function SubmitButton({
  children,
  className = "",
  pendingText,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} inline-flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-wait`}
    >
      {pending && <Spinner />}
      <span>{pending ? pendingText ?? children : children}</span>
    </button>
  );
}
