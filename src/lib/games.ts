import { prisma } from "./prisma";

export type GameFormat = "BRACKET" | "BATTLE_ROYALE";

export async function getActiveGames() {
  return prisma.game.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
}

export async function getAllGames() {
  return prisma.game.findMany({ orderBy: { order: "asc" } });
}

export async function getGameBySlug(slug: string) {
  return prisma.game.findUnique({ where: { slug } });
}

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
