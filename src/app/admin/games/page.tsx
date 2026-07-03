import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GameForm } from "./GameForm";
import { toggleGameAction } from "../actions";
import { Pill } from "@/components/ui";
import { FORMAT_LABEL } from "@/lib/games";

export const dynamic = "force-dynamic";
export const metadata = { title: "จัดการเกม" };

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  if (!(await getSession())) redirect("/admin/login");
  const sp = await searchParams;
  const games = await prisma.game.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { teams: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">เพิ่มเกมใหม่</h1>
      {sp.ok && <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[color:var(--success)]/15 text-[color:var(--success)]">{sp.ok}</div>}
      <GameForm />

      <h2 className="text-xl font-bold mt-10 mb-4">เกมทั้งหมด</h2>
      <div className="space-y-3">
        {games.map((g) => (
          <div key={g.id} className="rsl-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-grid place-items-center w-11 h-11 rounded-lg font-extrabold" style={{ background: g.color, color: "#0b0f1a" }}>
                {g.shortName}
              </span>
              <div>
                <p className="font-bold">{g.name} <span className="text-xs text-[color:var(--text-dim)]">/{g.slug}</span></p>
                <div className="flex gap-2 mt-1">
                  <Pill>{FORMAT_LABEL[g.format]}</Pill>
                  <Pill>{g._count.teams} ทีม</Pill>
                  {!g.active && <Pill>ปิดใช้งาน</Pill>}
                </div>
              </div>
            </div>
            <form action={toggleGameAction}>
              <input type="hidden" name="id" value={g.id} />
              <button className="rsl-btn rsl-btn-ghost text-sm">
                {g.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
