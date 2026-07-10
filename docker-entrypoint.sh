#!/bin/sh
set -e

# sync schema เข้ากับฐานข้อมูลบน volume (ปลอดภัย เรียกซ้ำได้ ไม่ลบข้อมูล)
echo "→ prisma db push..."
npx prisma db push --skip-generate

# เริ่มเซิร์ฟเวอร์ (ใช้ PORT ที่ host กำหนด ไม่งั้น 3000)
echo "→ starting Next.js on port ${PORT:-3000}..."
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
