import type { LeaderboardEntry } from "../common/types";
import { socket } from "./socket.ts";

let soloScores: LeaderboardEntry[] = [];
let coopScores: LeaderboardEntry[] = [];

export async function loadLeaderboard() {
    const result = await new Promise<{ solo: LeaderboardEntry[]; coop: LeaderboardEntry[] }>((resolve) => {
        socket.emit("getLeaderboard", (scores: { solo: LeaderboardEntry[]; coop: LeaderboardEntry[] } | undefined) => {
            resolve(scores ?? { solo: [], coop: [] });
        });
    });
    soloScores = result.solo;
    coopScores = result.coop;
}

export function renderLeaderboard() {
    let html = "";
    
    // Solo section
    html += `<tr><th colspan="3" style="background: rgba(52, 152, 219, 0.3); font-size: 1.2em;">🎮 Solo</th></tr>`;
    if (soloScores.length === 0) {
        html += `<tr><td colspan="3" style="opacity: 0.6;">Aucun score solo</td></tr>`;
    } else {
        soloScores.forEach((val: LeaderboardEntry) => {
            const date = new Date(val.date);
            const displayDate = Number.isNaN(date.getTime())
                ? "Date invalide"
                : date.toLocaleDateString();
            html += `<tr><th>${val.pseudo}</th><td>${val.score}</td><td>${displayDate}</td></tr>`;
        });
    }
    
    // Spacer
    html += `<tr><td colspan="3" style="height: 20px;"></td></tr>`;
    
    // Coop section
    html += `<tr><th colspan="3" style="background: rgba(46, 204, 113, 0.3); font-size: 1.2em;">👥 Coop</th></tr>`;
    if (coopScores.length === 0) {
        html += `<tr><td colspan="3" style="opacity: 0.6;">Aucun score coop</td></tr>`;
    } else {
        coopScores.forEach((val: LeaderboardEntry) => {
            const date = new Date(val.date);
            const displayDate = Number.isNaN(date.getTime())
                ? "Date invalide"
                : date.toLocaleDateString();
            html += `<tr><th>${val.pseudo}</th><td>${val.score}</td><td>${displayDate}</td></tr>`;
        });
    }
    
    return html;
}