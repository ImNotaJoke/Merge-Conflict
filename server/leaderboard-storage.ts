import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LeaderboardEntry } from "../common/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const leaderboardPath = path.join(__dirname, "leaderboard.json");

async function ensureLeaderboardFile(): Promise<void> {
    try {
        await fs.access(leaderboardPath);
    } catch {
        await fs.writeFile(leaderboardPath, "[]", "utf-8");
    }
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    await ensureLeaderboardFile();
    const raw = await fs.readFile(leaderboardPath, "utf-8");
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return parsed.sort((left, right) => right.score - left.score).slice(0, 10);
}

export async function saveScore(entry: LeaderboardEntry): Promise<LeaderboardEntry[]> {
    const leaderboard = await getLeaderboard();
    leaderboard.push(entry);
    leaderboard.sort((left, right) => right.score - left.score);
    const topTen = leaderboard.slice(0, 10);
    await fs.writeFile(leaderboardPath, JSON.stringify(topTen, null, 2), "utf-8");
    return topTen;
}
