import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewsForm } from "./NewsForm";
import { deleteNewsAction } from "../actions";
import { Pill } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "จัดการข่าว" };

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  if (!(await getSession())) redirect("/admin/login");
  const sp = await searchParams;

  const [games, news] = await Promise.all([
    prisma.game.findMany({ orderBy: { order: "asc" } }),
    prisma.news.findMany({ orderBy: { publishedAt: "desc" }, include: { game: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">เพิ่มข่าวใหม่</h1>
      {sp.ok && <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[color:var(--success)]/15 text-[color:var(--success)]">{sp.ok}</div>}
      <NewsForm games={games} />

      <h2 className="text-xl font-bold mt-10 mb-4">ข่าวทั้งหมด ({news.length})</h2>
      <div className="rsl-card divide-y divide-[color:var(--border)]">
        {news.map((n) => (
          <div key={n.id} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Pill>{n.game.name}</Pill>
                <Pill>{n.category}</Pill>
                <span className="text-xs text-[color:var(--text-dim)]">{fmtDate(n.publishedAt)}</span>
              </div>
              <p className="font-semibold mt-1 truncate">{n.title}</p>
            </div>
            <form action={deleteNewsAction}>
              <input type="hidden" name="id" value={n.id} />
              <button className="rsl-btn rsl-btn-ghost text-sm text-[color:var(--danger)]">ลบ</button>
            </form>
          </div>
        ))}
        {news.length === 0 && <div className="p-4 text-[color:var(--text-dim)]">ยังไม่มีข่าว</div>}
      </div>
    </div>
  );
}
