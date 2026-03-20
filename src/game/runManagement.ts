import type { GameRunStats, LeaderboardEntry } from "../../common/types";
import { resetRenderedGameState } from "./gameRendering.ts";
import { resetPlayerPosition } from "./playerMovement.ts";
import { socket } from "../socket.ts";
import { player } from "./gameRendering.ts";
import { isCoopMode } from "../main.ts";

const gameTimeLabel = document.querySelector(".game-time-label");
const gameKillsLabel = document.querySelector(".game-kills-label");
const gameScoreLabel = document.querySelector(".game-score-label");
const overSummaryTimeKills = document.querySelector(".over-summary-time-kills");
const overSummaryScore = document.querySelector(".over-summary-score");
const scoreAtDeath = [100, 200];

let gameTimer: ReturnType<typeof setInterval> | undefined;
let gameStartTimeMs = 0;
let lastRunStats: GameRunStats | undefined;
let isGameOver = false;
let finalScore = 0;
let finalSurvivalSeconds = 0;

export function getLastRunStats() {
    return lastRunStats;
}

export function resetCurrentGame() {
    stopGameTimer();
    resetPlayerPosition();
    resetRenderedGameState();
    player.killedEnnemies = new Map();
    isGameOver = false;
    finalScore = 0;
    finalSurvivalSeconds = 0;
    updateInGameStats(0);
    socket.emit("stopPlaying");
}

export function startNewGame() {
    stopGameTimer();
    resetPlayerPosition();
    resetRenderedGameState();
    player.killedEnnemies = new Map();
    isGameOver = false;
    finalScore = 0;
    finalSurvivalSeconds = 0;
    updateInGameStats(0);
}

export function startGameTimer() {
    stopGameTimer();
    isGameOver = false;
    gameStartTimeMs = Date.now();
    updateInGameStats(0);
    gameTimer = setInterval(() => {
        if (!isGameOver) {
            const elapsedSeconds = Math.floor((Date.now() - gameStartTimeMs) / 1000);
            updateInGameStats(elapsedSeconds);
        }
    }, 1000);
}

export function stopGameTimer() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = undefined;
    }
}

function updateInGameStats(elapsedSeconds: number) {
    const displaySeconds = isGameOver ? finalSurvivalSeconds : elapsedSeconds;
    const displayScore = isGameOver ? finalScore : computeScore(elapsedSeconds, player.killedEnnemies);
    const displayKills = isGameOver ? (lastRunStats?.enemiesKilled ?? getNbKilledEnnemies(player.killedEnnemies)) : getNbKilledEnnemies(player.killedEnnemies);

    if (gameTimeLabel) {
        gameTimeLabel.textContent = `Temps : ${formatDuration(displaySeconds)}`;
    }
    if (gameKillsLabel) {
        gameKillsLabel.textContent = `Ennemis tués : ${displayKills}`;
    }
    if (gameScoreLabel) {
        gameScoreLabel.textContent = `Score : ${displayScore}`;
    }
}

function formatDuration(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function computeScore(survivalSeconds: number, killedEnemies: Map<number, number>) {
    let scoreEnnemies = 0;
    for(let i = 0; i < scoreAtDeath.length; i++) {
        if(killedEnemies.has(i)) {
            scoreEnnemies += scoreAtDeath[i] * killedEnemies.get(i)!;
        }
    }
    return survivalSeconds * 5 + scoreEnnemies;
}

export function finalizeCurrentRun(saveScore: boolean) {
    if (isGameOver) return;
    isGameOver = true;
    finalSurvivalSeconds = Math.max(0, Math.floor((Date.now() - gameStartTimeMs) / 1000));
    finalScore = computeScore(finalSurvivalSeconds, player.killedEnnemies);

    const pseudo = player.pseudo?.trim().length ? player.pseudo : "Guest";
    const date = new Date().toISOString();
    const enemiesKilled = getNbKilledEnnemies(player.killedEnnemies);
    const mode = isCoopMode ? 'coop' : 'solo';

    lastRunStats = {
        pseudo,
        survivalSeconds: finalSurvivalSeconds,
        enemiesKilled,
        score: finalScore,
        date,
    };

    if (overSummaryTimeKills) {
        const enemyWord = enemiesKilled > 1 ? "ennemis" : "ennemi";
        overSummaryTimeKills.textContent = `Bien joue ! Vous avez joue pendant ${formatDuration(finalSurvivalSeconds)} et dans ce temps vous avez elimine ${enemiesKilled} ${enemyWord}.`;
    }
    if (overSummaryScore) {
        overSummaryScore.textContent = `Bravo a vous ! Votre score est de ${finalScore} points d'apres nos calculs tres complexes!`;
    }

    if (saveScore && finalSurvivalSeconds > 0) {
        const payload: LeaderboardEntry = { pseudo, score: finalScore, date, mode };
        socket.emit("submitScore", payload);
    }
}

function getNbKilledEnnemies(killed: Map<number, number>):number {
    let nb = 0;
    killed.forEach((score) => {
        nb += score;
    });
    return nb;
}
