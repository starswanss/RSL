import * as XLSX from "xlsx";

export type ImportedPlayer = {
  nickname: string;
  role: string | null;
  isCaptain: boolean;
};
export type ImportedTeam = {
  name: string;
  tag: string;
  phone: string | null;
  groupName: string | null;
  seed: number | null;
  players: ImportedPlayer[];
};

// หัวคอลัมน์ที่ยอมรับ (รองรับไทย/อังกฤษ)
const HEADERS = {
  team: ["team", "ทีม", "ชื่อทีม", "team name", "teamname", "ชื่อ ทีม"],
  tag: ["tag", "ตัวย่อ", "ชื่อย่อ", "อักษรย่อ", "แท็ก"],
  phone: ["phone", "เบอร์โทร", "เบอร์", "โทรศัพท์", "เบอร์ติดต่อ", "tel", "โทร"],
  group: ["group", "กลุ่ม", "สาย"],
  seed: ["seed", "ซีด", "ลำดับ", "ลำดับสาย"],
  player: [
    "player",
    "ผู้เล่น",
    "ชื่อผู้เล่น",
    "nickname",
    "ชื่อในเกม",
    "ign",
    "ผู้แข่ง",
    "ชื่อผู้แข่ง",
  ],
  role: ["role", "ตำแหน่ง", "หน้าที่", "โรล"],
  captain: ["captain", "กัปตัน", "หัวหน้าทีม", "c", "หัวหน้า"],
};

const CAPTAIN_TRUE = new Set([
  "1",
  "true",
  "yes",
  "y",
  "c",
  "✓",
  "captain",
  "กัปตัน",
  "ใช่",
  "x",
  "หัวหน้า",
]);

function norm(s: unknown): string {
  return String(s ?? "").trim();
}

function buildGetter(row: Record<string, unknown>) {
  // map: normalized header -> value
  const map = new Map<string, unknown>();
  for (const key of Object.keys(row)) {
    map.set(norm(key).toLowerCase(), row[key]);
  }
  return (candidates: string[]): string => {
    for (const c of candidates) {
      const v = map.get(c.toLowerCase());
      if (v !== undefined && norm(v) !== "") return norm(v);
    }
    return "";
  };
}

export function parseTeamsWorkbook(buf: ArrayBuffer): ImportedTeam[] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const teams = new Map<string, ImportedTeam>();

  for (const row of rows) {
    const get = buildGetter(row);
    const teamName = get(HEADERS.team);
    if (!teamName) continue;

    let team = teams.get(teamName);
    if (!team) {
      team = {
        name: teamName,
        tag: get(HEADERS.tag) || teamName.slice(0, 5).toUpperCase(),
        phone: get(HEADERS.phone) || null,
        groupName: get(HEADERS.group) || null,
        seed: null,
        players: [],
      };
      const seedRaw = get(HEADERS.seed);
      if (seedRaw && !isNaN(Number(seedRaw))) team.seed = Number(seedRaw);
      teams.set(teamName, team);
    } else {
      // เติมข้อมูลระดับทีมถ้าเดิมยังว่าง
      if (!team.phone) team.phone = get(HEADERS.phone) || null;
      if (!team.groupName) team.groupName = get(HEADERS.group) || null;
      if (team.seed === null) {
        const seedRaw = get(HEADERS.seed);
        if (seedRaw && !isNaN(Number(seedRaw))) team.seed = Number(seedRaw);
      }
    }

    const nickname = get(HEADERS.player);
    if (nickname) {
      const capRaw = get(HEADERS.captain).toLowerCase();
      team.players.push({
        nickname,
        role: get(HEADERS.role) || null,
        isCaptain: CAPTAIN_TRUE.has(capRaw),
      });
    }
  }

  return Array.from(teams.values());
}
