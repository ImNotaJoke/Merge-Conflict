import type { GameRunStats, LeaderboardEntry } from "../../common/types";
import { resetRenderedGameState } from "./gameRendering";
import { resetPlayerPosition } from "./playerMovement";
import { socket } from "../socket";
import { player } from "./gameRendering";

const gameTimeLabel = document.querySelector(".game-time-label");
const gameKillsLabel = document.querySelector(".game-kills-label");
const gameScoreLabel = document.querySelector(".game-score-label");
const overSummaryTimeKills = document.querySelector(".over-summary-time-kills");
const overSummaryScore = document.querySelector(".over-summary-score");

let gameTimer: ReturnType<typeof setInterval> | undefined;
let gameStartTimeMs = 0;
let enemiesKilled = 0;
let lastRunStats: GameRunStats | undefined;

export function getLastRunStats() {
    return lastRunStats;
}

export function resetCurrentGame() {
    stopGameTimer();
    resetPlayerPosition();
    resetRenderedGameState();
    enemiesKilled = 0;
    updateInGameStats(0);
    socket.emit("stopPlaying");
}

export function startNewGame() {
    stopGameTimer();
    resetPlayerPosition();
    resetRenderedGameState();
    enemiesKilled = 0;
    updateInGameStats(0);
    socket.emit("stopPlaying");
}

export function startGameTimer() {
    stopGameTimer();
    gameStartTimeMs = Date.now();
    updateInGameStats(0);
    gameTimer = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - gameStartTimeMs) / 1000);
        updateInGameStats(elapsedSeconds);
    }, 1000);
}

export function stopGameTimer() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = undefined;
    }
}

function updateInGameStats(elapsedSeconds: number) {
    const score = computeScore(elapsedSeconds, enemiesKilled);
    if (gameTimeLabel) {
        gameTimeLabel.textContent = `Temps : ${formatDuration(elapsedSeconds)}`;
    }
    if (gameKillsLabel) {
        gameKillsLabel.textContent = `Ennemis tués : ${enemiesKilled}`;
    }
    if (gameScoreLabel) {
        gameScoreLabel.textContent = `Score : ${score}`;
    }
}

function formatDuration(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function computeScore(survivalSeconds: number, killedEnemies: number) {
    return survivalSeconds * 5 + killedEnemies * 100;
}

export function finalizeCurrentRun(saveScore: boolean) {
    const survivalSeconds = Math.max(0, Math.floor((Date.now() - gameStartTimeMs) / 1000));
    const score = computeScore(survivalSeconds, enemiesKilled);
    const pseudo = player.pseudo?.trim().length ? player.pseudo : "Guest";
    const date = new Date().toISOString();

    lastRunStats = {
        pseudo,
        survivalSeconds,
        enemiesKilled,
        score,
        date,
    };

    if (overSummaryTimeKills) {
        const enemyWord = enemiesKilled > 1 ? "ennemis" : "ennemi";
        overSummaryTimeKills.textContent = `Bien joue ! Vous avez joue pendant ${formatDuration(survivalSeconds)} et dans ce temps vous avez elimine ${enemiesKilled} ${enemyWord}.`;
    }
    if (overSummaryScore) {
        overSummaryScore.textContent = `Bravo a vous ! Votre score est de ${score} points d'apres nos calculs tres complexes!`;
    }

    if (saveScore && survivalSeconds > 0) {
        const payload: LeaderboardEntry = { pseudo, score, date };
        socket.emit("submitScore", payload);
    }
}
