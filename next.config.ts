import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // เผื่อโลโก้ที่อัปโหลด (data URL) ที่มีขนาดใหญ่ขึ้นเมื่อเข้ารหัส base64
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
