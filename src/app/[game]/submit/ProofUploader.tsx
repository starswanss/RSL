"use client";

import { useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";

type UF = { key: string; url: string; name: string };

export function ProofUploader() {
  const [files, setFiles] = useState<UF[]>([]);
  const { startUpload, isUploading } = useUploadThing("proofUploader", {
    onClientUploadComplete: (res) => {
      setFiles((prev) => [
        ...prev,
        ...res.map((r) => ({ key: r.key, url: r.ufsUrl, name: r.name })),
      ]);
    },
    onUploadError: (e) => alert("อัปโหลดไม่สำเร็จ: " + e.message),
  });

  return (
    <div>
      <label className="block text-sm font-semibold mb-1">รูปหลักฐาน (อัปได้หลายไฟล์) *</label>
      <input
        type="file"
        multiple
        accept="image/*"
        disabled={isUploading}
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? []);
          if (fs.length) startUpload(fs);
          e.target.value = "";
        }}
        className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[color:var(--brand)] file:px-3 file:py-1.5 file:text-[#1a1400] file:font-semibold disabled:opacity-60"
      />
      {isUploading && (
        <p className="text-xs text-[color:var(--accent)] mt-1">⏳ กำลังอัปโหลด...</p>
      )}
      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <div key={f.key} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.url}
                alt={f.name}
                className="w-16 h-16 object-cover rounded-lg border border-[color:var(--border)]"
              />
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((x) => x.key !== f.key))}
                className="absolute -top-1.5 -right-1.5 bg-[color:var(--danger)] text-white rounded-full w-5 h-5 text-xs leading-none"
                title="ลบรูปนี้"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <input type="hidden" name="proofFiles" value={JSON.stringify(files)} />
      <p className="text-xs text-[color:var(--text-dim)] mt-1">
        อัปรูปสกอร์บอร์ด/ผลการแข่ง สูงสุด 5 รูป (รูปละไม่เกิน 4MB)
      </p>
    </div>
  );
}
