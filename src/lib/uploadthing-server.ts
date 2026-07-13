import "server-only";
import { UTApi } from "uploadthing/server";

// ใช้ลบไฟล์ออกจาก UploadThing (ปุ่มล้างข้อมูลกันพื้นที่เต็ม) — ต้องมี UPLOADTHING_TOKEN
export const utapi = new UTApi();
