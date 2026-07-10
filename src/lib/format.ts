const TH_DATE = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

const TH_DATE_ONLY = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeZone: "Asia/Bangkok",
});

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "รอกำหนดการ";
  return TH_DATE.format(new Date(d)) + " น.";
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-";
  return TH_DATE_ONLY.format(new Date(d));
}

// แปลง Date -> ค่าเริ่มต้นของ <input type="datetime-local"> ในเขตเวลาไทย (YYYY-MM-DDTHH:mm)
export function toDatetimeLocalTH(d: Date | string | null | undefined): string {
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).formatToParts(new Date(d));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = g("hour") === "24" ? "00" : g("hour"); // กันบั๊กเที่ยงคืน
  return `${g("year")}-${g("month")}-${g("day")}T${hour}:${g("minute")}`;
}

// แปลงค่าจาก <input type="datetime-local"> (เวลาไทย) -> Date (UTC ที่ถูกต้อง)
export function parseDatetimeLocalTH(v: string): Date | null {
  const s = v.trim();
  if (!s) return null;
  const d = new Date(`${s}+07:00`);
  return isNaN(d.getTime()) ? null : d;
}

export const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "รอแข่ง",
  PENDING: "รอตรวจผล",
  COMPLETED: "จบแล้ว",
};

export const SUB_STATUS_LABEL: Record<string, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
};
