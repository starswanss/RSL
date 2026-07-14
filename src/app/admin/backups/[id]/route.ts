import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ดาวน์โหลดข้อมูลสำรองเป็นไฟล์ JSON (เฉพาะแอดมิน)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const b = await prisma.backup.findUnique({ where: { id } });
  if (!b) return new Response("Not found", { status: 404 });

  const date = b.createdAt.toISOString().slice(0, 10);
  return new Response(b.data, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsl-backup-${b.year}-${date}.json"`,
    },
  });
}
