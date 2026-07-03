import Link from "next/link";

type G = { id: string; name: string; color: string; format: string };

export function AdminGamePicker({
  games,
  current,
  basePath,
  filterFormat,
}: {
  games: G[];
  current?: string;
  basePath: string;
  filterFormat?: string;
}) {
  const list = filterFormat ? games.filter((g) => g.format === filterFormat) : games;
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {list.map((g) => {
        const active = g.id === current;
        return (
          <Link
            key={g.id}
            href={`${basePath}?game=${g.id}`}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              active
                ? "text-[#0b0f1a]"
                : "border-[color:var(--border)] text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
            }`}
            style={active ? { background: g.color, borderColor: g.color } : undefined}
          >
            {g.name}
          </Link>
        );
      })}
      {list.length === 0 && (
        <p className="text-sm text-[color:var(--text-dim)]">ไม่มีเกมที่ตรงเงื่อนไข</p>
      )}
    </div>
  );
}
