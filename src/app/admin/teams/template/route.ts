import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const rows = [
    { ทีม: "ทีมตัวอย่าง A", ตัวย่อ: "TMA", กลุ่ม: "A", seed: 1, ผู้เล่น: "PlayerOne", ตำแหน่ง: "IGL", กัปตัน: "yes" },
    { ทีม: "ทีมตัวอย่าง A", ตัวย่อ: "TMA", กลุ่ม: "A", seed: 1, ผู้เล่น: "PlayerTwo", ตำแหน่ง: "Fragger", กัปตัน: "" },
    { ทีม: "ทีมตัวอย่าง A", ตัวย่อ: "TMA", กลุ่ม: "A", seed: 1, ผู้เล่น: "PlayerThree", ตำแหน่ง: "Support", กัปตัน: "" },
    { ทีม: "ทีมตัวอย่าง B", ตัวย่อ: "TMB", กลุ่ม: "A", seed: 2, ผู้เล่น: "PlayerAlpha", ตำแหน่ง: "IGL", กัปตัน: "yes" },
    { ทีม: "ทีมตัวอย่าง B", ตัวย่อ: "TMB", กลุ่ม: "A", seed: 2, ผู้เล่น: "PlayerBeta", ตำแหน่ง: "Sniper", กัปตัน: "" },
  ];

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["ทีม", "ตัวย่อ", "กลุ่ม", "seed", "ผู้เล่น", "ตำแหน่ง", "กัปตัน"],
  });
  ws["!cols"] = [
    { wch: 18 },
    { wch: 8 },
    { wch: 8 },
    { wch: 6 },
    { wch: 16 },
    { wch: 12 },
    { wch: 8 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Teams");
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="rsl-teams-template.xlsx"',
    },
  });
}
