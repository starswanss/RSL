import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "เข้าสู่ระบบแอดมิน" };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <span className="inline-grid place-items-center w-12 h-12 rounded-xl bg-[color:var(--brand)] text-[#1a1400] font-extrabold text-xl mx-auto">
          R
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">ระบบหลังบ้าน RSL</h1>
        <p className="text-sm text-[color:var(--text-dim)] mt-1">สำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>
      <LoginForm />
      <p className="mt-4 text-center text-xs text-[color:var(--text-dim)]">
        บัญชีเริ่มต้น (dev): admin / rsladmin123
      </p>
    </div>
  );
}
