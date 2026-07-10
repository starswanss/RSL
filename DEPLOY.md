# คู่มือ Deploy RSL (SQLite + Volume ถาวร)

เว็บนี้เป็น **read เยอะ / write น้อย** จึงเหมาะกับการรัน **instance เดียว + SQLite บน disk ถาวร**
มี cache layer ช่วยลดภาระ DB อยู่แล้ว จึงรับผู้ใช้พร้อมกันจำนวนมากได้โดยไม่ล้ม

> ⚠️ **กฎเหล็กของ SQLite:** ต้องรัน **เครื่องเดียวเท่านั้น** ห้าม scale เกิน 1 instance
> (หลายเครื่องจะเขียนไฟล์คนละก๊อป ข้อมูลเพี้ยน) — config ที่ให้มาตั้งไว้ให้แล้ว

ไฟล์ที่เตรียมให้แล้วในโปรเจกต์: `Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`, `fly.toml`

---

## 0) Environment Variables ที่ต้องตั้งบน host (ห้าม commit)

| ตัวแปร | ค่า | หมายเหตุ |
|---|---|---|
| `DATABASE_URL` | `file:/data/prod.db` | ไฟล์ DB อยู่บน volume ถาวร (ไม่ใช่ในโฟลเดอร์แอป) |
| `AUTH_SECRET` | สุ่มยาว ≥ 32 ตัว | **สุ่มใหม่** อย่าใช้ค่าเดิมของ dev |
| `ADMIN_USERNAME` | เช่น `admin` | บัญชีแอดมินตอน seed |
| `ADMIN_PASSWORD` | **รหัสใหม่ที่แข็งแรง** | ⚠️ ห้ามใช้ `rsladmin123` |

สุ่ม `AUTH_SECRET`:
```bash
openssl rand -hex 32
# หรือ: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ต้องตั้ง `ADMIN_PASSWORD` **ก่อน** สั่ง seed (seed สร้างแอดมินจากค่านี้)

---

## วิธี A — Fly.io (แนะนำ: ยกข้อมูลเดิมขึ้นได้ง่าย)

### 1. ติดตั้ง CLI + ล็อกอิน
```bash
# Windows (PowerShell): iwr https://fly.io/install.ps1 -useb | iex
# macOS/Linux:          curl -L https://fly.io/install.sh | sh
fly auth signup   # หรือ fly auth login
```

### 2. สร้างแอป (ยังไม่ deploy)
```bash
cd RSL
fly launch --no-deploy
```
- ถามชื่อ app → ตั้งชื่อไม่ซ้ำใคร แล้วแก้บรรทัด `app = "..."` ใน `fly.toml` ให้ตรง
- ถ้าถามว่าจะสร้าง Postgres/Redis ไหม → **ตอบ No** (เราใช้ SQLite)
- region → เลือก `sin` (สิงคโปร์)

### 3. สร้าง volume ถาวร (เก็บ SQLite)
```bash
fly volumes create rsl_data --region sin --size 1   # 1GB พอเหลือเฟือ
```

### 4. ตั้งความลับ (secrets)
```bash
fly secrets set \
  AUTH_SECRET="<ค่าที่สุ่มได้>" \
  ADMIN_USERNAME="admin" \
  ADMIN_PASSWORD="<รหัสใหม่ที่แข็งแรง>"
```
(`DATABASE_URL` และ `PORT` อยู่ใน `fly.toml` แล้ว ไม่ต้องตั้งซ้ำ)

### 5. Deploy
```bash
fly deploy
```
ตอน boot ระบบจะรัน `prisma db push` สร้างตารางบน volume ให้อัตโนมัติ

### 6. Seed ครั้งแรก (3 เกม + แอดมิน)
```bash
fly ssh console -C "npm run db:seed"
```

### 7. (ทางเลือก) ยกข้อมูลจากเครื่อง dev ขึ้นไปเลย
ข้อมูลปัจจุบัน (ทีม/ข่าว/โลโก้) อยู่ในไฟล์ `prisma/dev.db` เครื่องนี้ schema ตรงกับ prod อยู่แล้ว
อัปโหลดทับได้เลย (ข้ามขั้นที่ 6 ได้ถ้าทำอันนี้):
```bash
fly ssh sftp shell
# ในโหมด sftp พิมพ์:
put ./prisma/dev.db /data/prod.db
# แล้ว Ctrl+C ออก จากนั้น restart:
fly apps restart <ชื่อ-app>
```

เปิดเว็บ: `fly open`

---

## วิธี B — Railway (UI ง่าย ไม่ต้องใช้ CLI)

1. เข้า https://railway.app → **New Project → Deploy from GitHub repo** → เลือก `starswanss/RSL`
   (Railway จะเจอ `Dockerfile` แล้ว build ให้เอง)
2. เปิด service → แท็บ **Variables** → เพิ่ม:
   - `DATABASE_URL` = `file:/data/prod.db`
   - `AUTH_SECRET` = `<ค่าที่สุ่มได้>`
   - `ADMIN_USERNAME` = `admin`
   - `ADMIN_PASSWORD` = `<รหัสใหม่>`
   (Railway ตั้ง `PORT` ให้อัตโนมัติ)
3. แท็บ **Settings → Volumes** → **Add Volume** → mount path = `/data`
4. **Deploy** (Railway build จาก Dockerfile) — boot แล้วรัน `prisma db push` ให้เอง
5. Seed ครั้งแรก: ติดตั้ง Railway CLI แล้ว
   ```bash
   railway run npm run db:seed
   ```
   (หรือเพิ่ม `npm run db:seed` เป็น one-off command ในแดชบอร์ด)

> Railway ยกไฟล์ dev.db ขึ้น volume ตรง ๆ ได้ยากกว่า Fly — ถ้าอยากพกข้อมูลเดิมไปด้วย แนะนำใช้วิธี A

---

## หลัง deploy — ตรวจ 4 ข้อ

- [ ] เข้าเว็บหน้าแรกได้ (โหลดเกม/ทีมขึ้น)
- [ ] เข้า `/admin` ล็อกอินด้วย **รหัสใหม่** ได้ (ไม่ใช่ `rsladmin123`)
- [ ] เพิ่ม/แก้ข้อมูลในหลังบ้าน แล้วหน้าเว็บอัปเดต (cache invalidate ทำงาน)
- [ ] ลองปิด-เปิด deploy ใหม่ แล้วข้อมูล **ยังอยู่** (พิสูจน์ว่า volume ถาวร)

---

## สำรองข้อมูล (สำคัญ)

SQLite = ไฟล์เดียว สำรองง่ายมาก ทำสม่ำเสมอ:
```bash
# Fly:
fly ssh console -C "cat /data/prod.db" > backup-$(date +%F).db
```
เก็บไฟล์สำรองไว้ที่ปลอดภัย เผื่อ volume เสีย

---

## อัปเดตเว็บภายหลัง

แก้โค้ด → push ขึ้น GitHub → `fly deploy` (หรือ Railway auto-deploy จาก GitHub)
`prisma db push` ตอน boot จะ sync schema ใหม่ให้เอง โดยไม่ลบข้อมูล

---

## ข้อควรระวัง

- **ห้าม scale เกิน 1 machine** (SQLite) — `fly.toml` ล็อกไว้ที่ 1 แล้ว
- โลโก้เก็บเป็น data URL ใน DB — ถ้าอัปโหลดรูปใหญ่หลายอัน DB จะโต (จำกัดไว้ 512KB/รูปแล้ว)
- อยากได้ปุ่ม "เปลี่ยนรหัสแอดมิน" ในหน้าเว็บแทนการตั้งผ่าน env — บอกได้ เดี๋ยวทำให้
