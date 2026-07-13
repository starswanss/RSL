# คู่มือ Deploy RSL แบบฟรี (Vercel + Neon Postgres)

**ฟรีจริง ไม่ต้องใช้บัตรเครดิต** ทั้ง Vercel และ Neon
เว็บรันบน Vercel (auto-scale + CDN) · ฐานข้อมูล Postgres ฟรีบน Neon · มี cache layer ช่วยลด DB read อยู่แล้ว → รับนักเรียนพร้อมกันเยอะได้โดยไม่ล้ม

> โปรเจกต์นี้ย้ายจาก SQLite มาเป็น **PostgreSQL** แล้ว (deploy ฟรีบน serverless ได้)

---

## ขั้นที่ 1 — สร้างฐานข้อมูล Neon (ฟรี ไม่ใช้บัตร)

1. ไป https://neon.tech → **Sign up** (ล็อกอินด้วย GitHub ได้)
2. **Create project** → ตั้งชื่อ เช่น `rsl` → region เลือก **Singapore (ap-southeast-1)** (ใกล้ไทย)
3. หน้า **Connect** → คัดลอก **Connection string** แบบ **Pooled connection** (สำคัญ: ต้องมีคำว่า `-pooler` ในโฮสต์)
   - หน้าตาประมาณ: `postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/rsl?sslmode=require`

---

## ขั้นที่ 2 — สร้างตาราง + ใส่ข้อมูลลง Neon

ทำในเครื่องครั้งเดียว (โฟลเดอร์ RSL):

```bash
# 1) ใส่ connection string ของ Neon ลงไฟล์ .env
#    DATABASE_URL="postgresql://...-pooler...neon.tech/rsl?sslmode=require"

# 2) สร้างตารางทั้งหมดบน Neon
npx prisma db push

# 3a) ย้ายข้อมูลเดิม (3 เกม, ทีม/ผู้เล่นทั้งหมด) ขึ้น Neon
npx tsx scripts/import-data.mts prisma/backup-data.json
#     — หรือถ้าอยากเริ่มใหม่สะอาด ๆ ใช้ 3b แทน —
# 3b) npm run db:seed   # ใส่แค่ 3 เกม + แอดมิน (ยังไม่มีทีม)
```

> `prisma/backup-data.json` คือข้อมูลที่ export ไว้ก่อนย้าย DB (มีอยู่แล้วในเครื่อง)

---

## ขั้นที่ 3 — Deploy บน Vercel (ฟรี ไม่ใช้บัตร)

1. ไป https://vercel.com → **Sign up** ด้วย GitHub
2. **Add New → Project** → เลือก repo **`starswanss/RSL`** → **Import**
3. ก่อนกด Deploy เปิด **Environment Variables** ใส่ 4 ตัว:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | connection string **pooled** ของ Neon (อันเดียวกับขั้นที่ 2) |
   | `AUTH_SECRET` | `c7135094a259e93488e5b5e88c2a9dd9399084207ff94e7d6d70650fb061744d` (สุ่มให้แล้ว) |
   | `ADMIN_USERNAME` | `admin` |
   | `ADMIN_PASSWORD` | **รหัสใหม่ที่แข็งแรง** (อย่าใช้ rsladmin123) |
   | `UPLOADTHING_TOKEN` | token จาก uploadthing.com (สำหรับอัปรูปหลักฐาน) |

   > **UploadThing** (ที่เก็บรูปหลักฐานที่ผู้ส่งผลอัปโหลด): สมัครฟรีที่ https://uploadthing.com → Create app → **API Keys** → คัดลอก token มาใส่ทั้งใน `.env` เครื่อง และ env ของ Vercel · ฟรี ~2GB · ล้างไฟล์ได้ที่ `/admin/settings` เพื่อกันพื้นที่เต็ม

4. กด **Deploy** — Vercel จะ `prisma generate && next build` ให้อัตโนมัติ
5. เสร็จแล้วกดเปิดลิงก์เว็บที่ Vercel ให้มา

> เปลี่ยนโค้ดแล้ว push ขึ้น GitHub → Vercel auto-deploy ให้เองทุกครั้ง

---

## หลัง deploy — ตรวจ 3 ข้อ

- [ ] เปิดหน้าแรกได้ เห็นเกม/ทีมครบ
- [ ] เข้า `/admin` ล็อกอินด้วย **รหัสใหม่** ได้
- [ ] แก้ข้อมูลหลังบ้าน → หน้าเว็บอัปเดต (cache invalidate ทำงาน)

---

## สำหรับรันในเครื่อง (dev) ต่อไป

ตอนนี้ใช้ Postgres แล้ว จึงต้องมี `DATABASE_URL` ของ Postgres ใน `.env`
ง่ายสุด: ใช้ Neon URL อันเดียวกับ prod ได้เลย (หรือสร้าง Neon อีกโปรเจกต์แยกไว้ทดสอบ) แล้ว `npm run dev` ตามปกติ

---

## ข้อควรรู้

- **ต้องใช้ connection string แบบ pooled** (มี `-pooler`) — serverless เปิด connection เยอะ ถ้าใช้แบบ direct จะเต็มแล้วล้ม
- Neon ฟรีจะ "หลับ" เมื่อไม่มีคนใช้ แล้วตื่นเองตอนมีคนเข้า (ช้าครั้งแรกเสี้ยววินาที) — cache ที่ทำไว้ช่วยให้ส่วนใหญ่ไม่ต้องปลุก DB
- โลโก้เก็บเป็น data URL ใน DB (จำกัด 512KB/รูป) — Postgres รองรับสบาย
- อยากได้ปุ่ม "เปลี่ยนรหัสแอดมิน" ในหน้าเว็บแทน env — บอกได้ เดี๋ยวทำให้
