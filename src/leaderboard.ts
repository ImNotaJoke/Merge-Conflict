import type { BestScore } from "../common/types";

const bestScores:BestScore[] = [];

export function renderLeaderboard() {
    let html = "";
    bestScores.forEach((val:BestScore) => {
        html += `<tr><th>${val.pseudo}</th><td>${val.score}</td><td>${val.date.toLocaleDateString()}</td></tr>`
    });
    return html;
}

export function addScore(pseudo:string, score:number, date:Date) {
    if(bestScores.length === 10) {
        bestScores[9] = score > bestScores[9].score ? {pseudo, score, date} : bestScores[9];
    } else {
        bestScores.push({pseudo, score, date});
    }
    bestScores.sort((s1, s2) => (s1.score < s2.score ? 1 : -1));
}