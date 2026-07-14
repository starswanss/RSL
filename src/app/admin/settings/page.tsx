import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import {
  updateSiteLogoAction,
  changeAdminPasswordAction,
  createBackupAction,
  deleteBackupAction,
} from "../actions";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/SubmitButton";
import { ClearProofFilesButton } from "./ClearProofFilesButton";
import { ResetSiteForm } from "./ResetSiteForm";
import { MAX_LOGO_BYTES } from "@/lib/image";
import { fmtDateTime } from "@/lib/format";

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

  const thisYear = new Date().getFullYear();
  const backups = await prisma.backup.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: { id: true, year: true, label: true, sizeBytes: true, createdAt: true },
  });
  // จัดกลุ่มตามปี
  const byYear = backups.reduce<Record<number, typeof backups>>((acc, b) => {
    (acc[b.year] ??= []).push(b);
    return acc;
  }, {});
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

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

      {/* สำรองข้อมูล (แยกตามปี) */}
      <div className="rsl-card p-6 max-w-3xl mt-6">
        <h2 className="font-bold mb-1">💾 ข้อมูลสำรอง (แยกตามปี)</h2>
        <p className="text-xs text-[color:var(--text-dim)] mb-4">
          เก็บ snapshot ข้อมูลทั้งเว็บ (ทีม/ผู้เล่น/แมตช์/ล็อบบี้/ผล/ข่าว) ไว้ตามปี · ดาวน์โหลดเป็นไฟล์ JSON ได้
        </p>

        <form action={createBackupAction} className="flex flex-wrap items-end gap-3 mb-5">
          <div>
            <label className="block text-xs text-[color:var(--text-dim)] mb-1">ปี</label>
            <input
              name="year"
              type="number"
              min={2000}
              max={3000}
              defaultValue={thisYear}
              className="bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-sm w-24 outline-none focus:border-[color:var(--brand)]"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[color:var(--text-dim)] mb-1">ชื่อกำกับ (ไม่บังคับ)</label>
            <input
              name="label"
              placeholder={`สำรองข้อมูลปี ${thisYear}`}
              className="w-full bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[color:var(--brand)]"
            />
          </div>
          <SubmitButton className="rsl-btn rsl-btn-primary text-sm" pendingText="กำลังสำรอง...">
            + สำรองข้อมูลตอนนี้
          </SubmitButton>
        </form>

        {backups.length === 0 ? (
          <p className="text-sm text-[color:var(--text-dim)]">ยังไม่มีข้อมูลสำรอง</p>
        ) : (
          <div className="space-y-5">
            {years.map((y) => (
              <div key={y}>
                <h3 className="text-sm font-bold mb-2">
                  ปี <span className="rsl-gradient-text">{y}</span>
                  <span className="ml-2 text-xs font-normal text-[color:var(--text-dim)]">
                    ({byYear[y].length} ชุด)
                  </span>
                </h3>
                <div className="space-y-2">
                  {byYear[y].map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-3 bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-lg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{b.label}</p>
                        <p className="text-xs text-[color:var(--text-dim)]">
                          {fmtDateTime(b.createdAt)} · {(b.sizeBytes / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          href={`/admin/backups/${b.id}`}
                          className="text-xs text-[color:var(--accent)] hover:underline"
                        >
                          ⬇ ดาวน์โหลด
                        </a>
                        <form action={deleteBackupAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <SubmitButton
                            className="text-xs text-[color:var(--danger)] hover:underline"
                            pendingText="กำลังลบ..."
                          >
                            ลบ
                          </SubmitButton>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* โซนอันตราย — รีเซ็ตเว็บ */}
      <div className="rsl-card p-6 max-w-3xl mt-6 border border-[color:var(--danger)]/40">
        <h2 className="font-bold mb-1 text-[color:var(--danger)]">⚠️ โซนอันตราย — รีเซ็ตเว็บ</h2>
        <p className="text-xs text-[color:var(--text-dim)] mb-1">
          ใช้ตอนขึ้นซีซั่น/ปีใหม่ — <strong className="text-[color:var(--text)]">ระบบจะสำรองข้อมูลอัตโนมัติก่อนลบเสมอ</strong>
        </p>
        <ul className="text-xs text-[color:var(--text-dim)] mb-4 list-disc pl-5 space-y-0.5">
          <li>
            <span className="text-[color:var(--danger)]">ลบ:</span> ทีม, ผู้เล่น, แมตช์, ล็อบบี้, ผลการแข่ง, ผลที่ส่งเข้ามา, ข่าว, ไฟล์หลักฐาน
          </li>
          <li>
            <span className="text-[color:var(--success)]">เก็บไว้:</span> เกม, บัญชีแอดมิน, โลโก้เว็บ, ข้อมูลสำรองทุกชุด
          </li>
        </ul>
        <ResetSiteForm year={thisYear} />
      </div>
    </div>
  );
}
