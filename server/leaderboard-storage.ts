import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LeaderboardEntry } from "../common/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const soloLeaderboardPath = path.join(__dirname, "leaderboard-solo.json");
const coopLeaderboardPath = path.join(__dirname, "leaderboard-coop.json");

async function ensureLeaderboardFile(filePath: string): Promise<void> {
    try {
        await fs.access(filePath);
    } catch {
        await fs.writeFile(filePath, "[]", "utf-8");
    }
}

function safeParse(raw: string): LeaderboardEntry[] {
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export async function getSeparateLeaderboards(): Promise<{ solo: LeaderboardEntry[]; coop: LeaderboardEntry[] }> {
    await ensureLeaderboardFile(soloLeaderboardPath);
    await ensureLeaderboardFile(coopLeaderboardPath);

    const soloRaw = await fs.readFile(soloLeaderboardPath, "utf-8");
    const coopRaw = await fs.readFile(coopLeaderboardPath, "utf-8");

    const solo = safeParse(soloRaw).sort((l, r) => r.score - l.score).slice(0, 10);
    const coop = safeParse(coopRaw).sort((l, r) => r.score - l.score).slice(0, 10);

    return { solo, coop };
}

export async function saveScore(entry: LeaderboardEntry): Promise<LeaderboardEntry[]> {
    const filePath = entry.mode === 'coop' ? coopLeaderboardPath : soloLeaderboardPath;
    await ensureLeaderboardFile(filePath);

    const raw = await fs.readFile(filePath, "utf-8");
    const leaderboard = safeParse(raw);

    leaderboard.push(entry);
    leaderboard.sort((left, right) => right.score - left.score);

    const topTen = leaderboard.slice(0, 10);
    await fs.writeFile(filePath, JSON.stringify(topTen, null, 2), "utf-8");

    return topTen;
}
