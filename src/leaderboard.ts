import type { LeaderboardEntry } from "../common/types";
import { socket } from "./socket";

let bestScores: LeaderboardEntry[] = [];

export async function loadLeaderboard() {
    bestScores = await new Promise<LeaderboardEntry[]>((resolve) => {
        socket.emit("getLeaderboard", (scores: LeaderboardEntry[] | undefined) => {
            resolve(scores ?? []);
        });
    });
}

export function renderLeaderboard() {
    let html = "";
    bestScores.forEach((val: LeaderboardEntry) => {
        const date = new Date(val.date);
        const displayDate = Number.isNaN(date.getTime())
            ? "Date invalide"
            : date.toLocaleDateString();
        html += `<tr><th>${val.pseudo}</th><td>${val.score}</td><td>${displayDate}</td></tr>`;
    });
    return html;
}