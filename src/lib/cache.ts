// แท็กสำหรับ cache ข้อมูลอ่านหน้าสาธารณะ (unstable_cache) + ล้าง cache ตอนแอดมินเขียน
// หลักการ: อ่านซ้ำกี่ครั้งก็เสิร์ฟจาก cache จน TTL หมด หรือแอดมินแก้ข้อมูล (revalidateTag)
export const TAGS = {
  games: "games", // ข้อมูลเกม + โลโก้เกม (Navbar/หน้าแรก/แบนเนอร์)
  site: "site", // ตั้งค่าเว็บ (โลโก้เว็บ)
  teams: "teams", // ทีม + ผู้เล่น (กระทบตารางทีม/คะแนน/สาย)
  news: "news", // ข่าว
  matches: "matches", // สายแพ้คัดออก (RoV/FC)
  lobbies: "lobbies", // ล็อบบี้ + ผล Battle Royale (Free Fire)
} as const;

// อายุ cache (วินาที) — ตั้งสั้น-ยาวตามความถี่ที่ข้อมูลเปลี่ยน
export const TTL = {
  games: 300,
  site: 300,
  teams: 60,
  news: 120,
  matches: 60,
  lobbies: 60,
} as const;
