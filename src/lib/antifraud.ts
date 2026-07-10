import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// ระบบส่งผลไม่มีล็อกอิน — ชั้นป้องกันพื้นฐานเพื่อกัน "ผลปลอม/สแปม/บอท"
// ก่อนถึงมือแอดมิน (แอดมินยังเป็นด่านอนุมัติสุดท้ายเสมอ)

const WINDOW_MS = 10 * 60 * 1000; // หน้าต่างเวลาสำหรับนับอัตราส่ง = 10 นาที
const MAX_PER_IP_WINDOW = 8; // จำนวนผลสูงสุดต่อ IP ใน 10 นาที (ทุกแมตช์รวมกัน)
const MAX_PER_TARGET_IP = 3; // จำนวนผลสูงสุดต่อ IP ต่อ 1 แมตช์/ล็อบบี้
const MIN_FILL_MS = 2500; // กรอกฟอร์มเร็วกว่านี้ = น่าจะเป็นบอท

// ดึง IP + User-Agent จาก header (ใช้เก็บหลักฐาน + จำกัดอัตราส่ง)
export async function getClientMeta(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip =
    xff?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "unknown";
  const userAgent = (h.get("user-agent") || "unknown").slice(0, 400);
  return { ip, userAgent };
}

// ตรวจจับบอทจาก honeypot (ช่องซ่อน) + เวลากรอกฟอร์ม
export function detectBot(formData: FormData): "honeypot" | "tooFast" | null {
  const honeypot = String(formData.get("website") || "").trim();
  if (honeypot) return "honeypot"; // มนุษย์มองไม่เห็นช่องนี้

  const ts = Number(formData.get("formTs"));
  if (Number.isFinite(ts) && ts > 0) {
    const elapsed = Date.now() - ts;
    // เร็วเกินไป = บอท (ฟอร์มค้างนานแล้วค่อยส่งถือว่าปกติ)
    if (elapsed >= 0 && elapsed < MIN_FILL_MS) return "tooFast";
  }
  return null;
}

// จำกัดอัตราส่งต่อ IP (ข้ามการเช็คถ้าไม่รู้ IP เช่น dev/localhost)
export async function enforceRateLimit(opts: {
  ip: string;
  kind: "bracket" | "br";
  targetId: string;
}): Promise<string | null> {
  const { ip, kind, targetId } = opts;
  if (ip === "unknown") return null;

  const since = new Date(Date.now() - WINDOW_MS);
  const [b, r] = await Promise.all([
    prisma.resultSubmission.count({
      where: { submitterIp: ip, createdAt: { gte: since } },
    }),
    prisma.brSubmission.count({
      where: { submitterIp: ip, createdAt: { gte: since } },
    }),
  ]);
  if (b + r >= MAX_PER_IP_WINDOW)
    return "ส่งผลถี่เกินไป กรุณารอสักครู่แล้วลองใหม่";

  const perTarget =
    kind === "bracket"
      ? await prisma.resultSubmission.count({
          where: { matchId: targetId, submitterIp: ip },
        })
      : await prisma.brSubmission.count({
          where: { brMatchId: targetId, submitterIp: ip },
        });
  if (perTarget >= MAX_PER_TARGET_IP)
    return "คุณส่งผลแมตช์นี้หลายครั้งแล้ว หากมีข้อผิดพลาดโปรดแจ้งแอดมินโดยตรง";

  return null;
}

// ข้อความหลอกบอท (ทำเหมือนส่งสำเร็จ เพื่อไม่ให้บอทรู้ว่าโดนบล็อก)
export const FAKE_OK = "ส่งผลเรียบร้อย! รอแอดมินอนุมัติ";
