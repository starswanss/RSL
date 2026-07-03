import Link from "next/link";
import { STATUS_LABEL, SUB_STATUS_LABEL } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SCHEDULED: "bg-[color:var(--brand-2)]/20 text-[color:var(--brand-2)]",
    PENDING: "bg-[color:var(--brand)]/20 text-[color:var(--brand)]",
    COMPLETED: "bg-[color:var(--success)]/20 text-[color:var(--success)]",
    APPROVED: "bg-[color:var(--success)]/20 text-[color:var(--success)]",
    REJECTED: "bg-[color:var(--danger)]/20 text-[color:var(--danger)]",
  };
  const label = STATUS_LABEL[status] || SUB_STATUS_LABEL[status] || status;
  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
        map[status] || "bg-[color:var(--card)] text-[color:var(--text-dim)]"
      }`}
    >
      {label}
    </span>
  );
}

export function TeamLogo({
  tag,
  size = 40,
}: {
  tag: string;
  logoUrl?: string | null;
  size?: number;
}) {
  return (
    <span
      className="inline-grid place-items-center rounded-lg font-extrabold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        background: "linear-gradient(135deg, var(--brand-2), var(--accent))",
        color: "#0b0f1a",
      }}
      title={tag}
    >
      {tag.slice(0, 3)}
    </span>
  );
}

export function SectionTitle({
  children,
  href,
  action,
}: {
  children: React.ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <h2 className="text-2xl font-extrabold tracking-tight">{children}</h2>
      {href && (
        <Link
          href={href}
          className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--brand)]"
        >
          {action || "ดูทั้งหมด"} →
        </Link>
      )}
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[color:var(--card)] border border-[color:var(--border)] text-[color:var(--text-dim)]">
      {children}
    </span>
  );
}
