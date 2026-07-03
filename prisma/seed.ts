import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 กำลัง seed ข้อมูล RSL (multi-game)...");

  await prisma.brSubmissionRow.deleteMany();
  await prisma.brSubmission.deleteMany();
  await prisma.brTeamResult.deleteMany();
  await prisma.brMatch.deleteMany();
  await prisma.resultSubmission.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.news.deleteMany();
  await prisma.team.deleteMany();
  await prisma.game.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "rsladmin123",
    10
  );
  await prisma.user.create({
    data: {
      username: process.env.ADMIN_USERNAME || "admin",
      passwordHash,
      displayName: "ผู้ดูแลระบบ RSL",
      role: "ADMIN",
    },
  });

  await prisma.game.createMany({
    data: [
      {
        slug: "rov",
        name: "RoV",
        shortName: "RoV",
        format: "BRACKET",
        color: "#e94560",
        tagline: "Arena of Valor — สายแพ้คัดออก",
        description:
          "การแข่งขัน RoV รูปแบบทัวร์นาเมนต์สายแพ้คัดออก (Single Elimination)",
        order: 1,
        active: true,
      },
      {
        slug: "freefire",
        name: "Free Fire",
        shortName: "FF",
        format: "BATTLE_ROYALE",
        groupSize: 12,
        color: "#f5a623",
        tagline: "Battle Royale — แบ่งกลุ่มละ 12 ทีม",
        description:
          "การแข่งขัน Free Fire แบบ Battle Royale แบ่งกลุ่มละ 12 ทีม คิดคะแนนจากอันดับ + จำนวนคิลล์",
        order: 2,
        active: true,
      },
      {
        slug: "fconline",
        name: "FC Online",
        shortName: "FC",
        format: "BRACKET",
        color: "#2d9cdb",
        tagline: "FC Online — สายแพ้คัดออก",
        description:
          "การแข่งขัน FC Online รูปแบบทัวร์นาเมนต์สายแพ้คัดออก (Single Elimination)",
        order: 3,
        active: true,
      },
    ],
  });

  console.log("✅ seed เสร็จ: 3 เกม (RoV, Free Fire, FC Online) + แอดมิน 1 บัญชี");
  console.log(
    `   แอดมิน: ${process.env.ADMIN_USERNAME || "admin"} / ${
      process.env.ADMIN_PASSWORD || "rsladmin123"
    }`
  );
  console.log("   ➜ เพิ่มทีม/สร้างสาย/สร้างล็อบบี้/ข่าว ได้ที่ระบบหลังบ้าน /admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
