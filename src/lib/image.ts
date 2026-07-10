// แปลงไฟล์รูปที่อัปโหลด -> data URL (เก็บในฐานข้อมูล ไม่ต้องพึ่งโฮสต์รูปภายนอก)

export const MAX_LOGO_BYTES = 512 * 1024; // 512KB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];

export type ImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; message: string };

export async function fileToDataUrl(file: File): Promise<ImageResult> {
  if (!ALLOWED.includes(file.type))
    return { ok: false, message: "รองรับเฉพาะไฟล์รูป PNG, JPG, WEBP, SVG, GIF" };
  if (file.size > MAX_LOGO_BYTES)
    return {
      ok: false,
      message: `ไฟล์ใหญ่เกินไป (สูงสุด ${Math.round(MAX_LOGO_BYTES / 1024)}KB)`,
    };
  const buf = Buffer.from(await file.arrayBuffer());
  return { ok: true, dataUrl: `data:${file.type};base64,${buf.toString("base64")}` };
}
