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
