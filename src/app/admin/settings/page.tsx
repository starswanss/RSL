import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { updateSiteLogoAction, changeAdminPasswordAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ClearProofFilesButton } from "./ClearProofFilesButton";
import { MAX_LOGO_BYTES } from "@/lib/image";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตั้งค่าเว็บ" };

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  if (!(await getSession())) redirect("/admin/login");
  const sp = await searchParams;
  const { logoUrl } = await getSiteSettings();

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">ตั้งค่าเว็บ</h1>
      {sp.ok && <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[color:var(--success)]/15 text-[color:var(--success)]">{sp.ok}</div>}
      {sp.error && <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[color:var(--danger)]/15 text-[color:var(--danger)]">{sp.error}</div>}

      <div className="rsl-card p-6 max-w-xl">
        <h2 className="font-bold mb-1">โลโก้เว็บ</h2>
        <p className="text-xs text-[color:var(--text-dim)] mb-4">
          แสดงที่มุมบนซ้ายของทุกหน้า · รองรับ PNG, JPG, WEBP, SVG, GIF (สูงสุด {Math.round(MAX_LOGO_BYTES / 1024)}KB)
        </p>

        <div className="flex items-center gap-4 mb-4">
          <span className="text-xs text-[color:var(--text-dim)] w-20">ปัจจุบัน:</span>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="โลโก้เว็บ" className="h-12 w-auto rounded-lg bg-[color:var(--bg-soft)] p-1 border border-[color:var(--border)]" />
          ) : (
            <span className="inline-grid place-items-center w-12 h-12 rounded-lg bg-[color:var(--brand)] text-[#1a1400] font-extrabold">
              R
            </span>
          )}
          {!logoUrl && <span className="text-xs text-[color:var(--text-dim)]">(ค่าเริ่มต้น: อักษร R)</span>}
        </div>

        <form action={updateSiteLogoAction} className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            required
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[color:var(--brand)] file:px-3 file:py-1.5 file:text-[#1a1400] file:font-semibold"
          />
          <SubmitButton className="rsl-btn rsl-btn-primary text-sm" pendingText="กำลังอัปโหลด...">อัปโหลด / เปลี่ยนโลโก้</SubmitButton>
        </form>

        {logoUrl && (
          <form action={updateSiteLogoAction} className="mt-3">
            <input type="hidden" name="remove" value="1" />
            <SubmitButton className="text-xs text-[color:var(--danger)] hover:underline" pendingText="กำลังลบ...">ลบโลโก้ (กลับไปใช้ค่าเริ่มต้น)</SubmitButton>
          </form>
        )}
      </div>

      {/* เปลี่ยนรหัสผ่านแอดมิน */}
      <div className="rsl-card p-6 max-w-xl mt-6">
        <h2 className="font-bold mb-1">เปลี่ยนรหัสผ่านแอดมิน</h2>
        <p className="text-xs text-[color:var(--text-dim)] mb-4">
          ต้องยืนยันรหัสปัจจุบันก่อน · รหัสใหม่อย่างน้อย 8 ตัวอักษร
        </p>
        <form action={changeAdminPasswordAction} className="space-y-3 max-w-sm">
          <div>
            <label className="block text-sm font-semibold mb-1">รหัสผ่านปัจจุบัน</label>
            <input
              type="password"
              name="currentPassword"
              required
              autoComplete="current-password"
              className="w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 outline-none focus:border-[color:var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">รหัสผ่านใหม่</label>
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 outline-none focus:border-[color:var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 outline-none focus:border-[color:var(--brand)]"
            />
          </div>
          <SubmitButton className="rsl-btn rsl-btn-primary text-sm" pendingText="กำลังเปลี่ยน...">เปลี่ยนรหัสผ่าน</SubmitButton>
        </form>
      </div>

      {/* จัดการพื้นที่เก็บไฟล์ (UploadThing) */}
      <div className="rsl-card p-6 max-w-xl mt-6">
        <h2 className="font-bold mb-1">พื้นที่เก็บรูปหลักฐาน</h2>
        <p className="text-xs text-[color:var(--text-dim)] mb-4">
          รูปที่ผู้ส่งผลแนบมาเก็บไว้ที่ UploadThing (ฟรี ~2GB) · กดล้างเป็นระยะเพื่อกันพื้นที่เต็ม
        </p>
        <ClearProofFilesButton />
      </div>
    </div>
  );
}
