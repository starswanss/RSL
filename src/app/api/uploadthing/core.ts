import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// ผู้ส่งผล (ไม่ล็อกอิน) อัปรูปหลักฐานได้สูงสุด 5 รูป รูปละ ≤ 4MB
export const ourFileRouter = {
  proofUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 5 } })
    .middleware(async () => ({}))
    .onUploadComplete(async () => {}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
