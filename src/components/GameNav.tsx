"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export function GameNav({ items, color }: { items: NavItem[]; color: string }) {
  const pathname = usePathname();
  return (
    <div className="border-b border-[color:var(--border)] mb-6 overflow-x-auto">
      <div className="flex gap-1 whitespace-nowrap">
        {items.map((it) => {
          const active =
            pathname === it.href ||
            (it.href !== items[0].href && pathname.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                active
                  ? "text-[color:var(--text)]"
                  : "border-transparent text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
              }`}
              style={active ? { borderColor: color } : undefined}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
