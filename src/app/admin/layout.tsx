import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/admin", label: "ตรวจผล" },
  { href: "/admin/games", label: "เกม" },
  { href: "/admin/teams", label: "ทีม" },
  { href: "/admin/bracket", label: "สาย (RoV/FC)" },
  { href: "/admin/lobbies", label: "ล็อบบี้ (FF)" },
  { href: "/admin/news", label: "ข่าว" },
  { href: "/admin/settings", label: "ตั้งค่า" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) return <>{children}</>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="rsl-card p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold rsl-gradient-text">แอดมิน RSL</span>
          <span className="text-xs text-[color:var(--text-dim)]">· {session.displayName}</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {navItems.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="px-3 py-1.5 rounded-lg text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)] hover:bg-[color:var(--card-hover)]"
            >
              {n.label}
            </Link>
          ))}
          <form action={logoutAction}>
            <button className="px-3 py-1.5 rounded-lg text-sm text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
