import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { TAGS, TTL } from "./cache";

const SITE_ID = "site";

// อ่านค่าตั้งค่าเว็บ (แถวเดียว) — โดน Navbar อ่านทุกหน้า จึง cache + ล้างด้วย tag "site"
export const getSiteSettings = unstable_cache(
  async () => {
    const s = await prisma.siteSetting.findUnique({ where: { id: SITE_ID } });
    return { logoUrl: s?.logoUrl ?? null };
  },
  ["site-settings"],
  { revalidate: TTL.site, tags: [TAGS.site] }
);

export async function setSiteLogo(logoUrl: string | null) {
  return prisma.siteSetting.upsert({
    where: { id: SITE_ID },
    create: { id: SITE_ID, logoUrl },
    update: { logoUrl },
  });
}
