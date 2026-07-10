import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { TAGS, TTL } from "./cache";

export type GameFormat = "BRACKET" | "BATTLE_ROYALE";

// เกมเปลี่ยนน้อยมาก แต่ถูกอ่านทุกหน้า (Navbar/layout) — cache ยาว + ล้างด้วย tag "games"
export const getActiveGames = unstable_cache(
  () =>
    prisma.game.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    }),
  ["active-games"],
  { revalidate: TTL.games, tags: [TAGS.games] }
);

export const getAllGames = unstable_cache(
  () => prisma.game.findMany({ orderBy: { order: "asc" } }),
  ["all-games"],
  { revalidate: TTL.games, tags: [TAGS.games] }
);

export const getGameBySlug = unstable_cache(
  (slug: string) => prisma.game.findUnique({ where: { slug } }),
  ["game-by-slug"],
  { revalidate: TTL.games, tags: [TAGS.games] }
);

export function isBracket(format: string) {
  return format === "BRACKET";
}
export function isBattleRoyale(format: string) {
  return format === "BATTLE_ROYALE";
}

export const FORMAT_LABEL: Record<string, string> = {
  BRACKET: "สายแพ้คัดออก",
  BATTLE_ROYALE: "Battle Royale (แบ่งกลุ่ม)",
};
