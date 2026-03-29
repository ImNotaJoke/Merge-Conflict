import type { GameRunStats, LeaderboardEntry } from "../../common/types";
import { resetRenderedGameState } from "./gameRendering.ts";
import { resetPlayerPosition } from "./playerMovement.ts";
import { socket } from "../socket.ts";
import { player } from "./gameRendering.ts";
import { difficulty } from "../main.ts";
import { isCoopMode } from "../gameState.ts";

const gameTimeLabel = document.querySelector(".game-time-label");
const gameKillsLabel = document.querySelector(".game-kills-label");
const gameScoreLabel = document.querySelector(".game-score-label");
const overSummaryTimeKills = document.querySelector(".over-summary-time-kills");
const overSummaryScore = document.querySelector(".over-summary-score");
const healthContainer = document.querySelector(".health-container")!;
const audio: HTMLAudioElement = document.querySelector('.game-background-music')!;

const scoreAtDeath = [100, 200, 300, 10000];
const DEFAULT_HEALTH = 3;

let gameTimer: ReturnType<typeof setInterval> | undefined;
let gameStartTimeMs = 0;
let audioPlaying: Promise<void> | undefined;
let lastRunStats: GameRunStats | undefined;
let isGameOver = false;
let finalScore = 0;
let finalSurvivalSeconds = 0;
export let maxHealth = 3;

function playAudioSafely(audioElement: HTMLAudioElement) {
    const playing = audioElement.play();
    if (playing !== undefined) {
        void playing.catch(() => undefined);
    }
    return playing;
}

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
    pauseAudio();
    socket.emit("stopPlaying");
}

export function startNewGame() {
    stopGameTimer();
    resetPlayerPosition();
    resetRenderedGameState();
    audioPlaying = playAudioSafely(audio);
    player.killedEnnemies = new Map();
    switch(difficulty) {
        case 0:
            player.health = 3 * DEFAULT_HEALTH;
            maxHealth = 3 * DEFAULT_HEALTH;
            player.projectileDamage = 3;
            break;
        case 1:
            player.health = 2 * DEFAULT_HEALTH;
            maxHealth = 2 * DEFAULT_HEALTH;
            player.projectileDamage = 2;
            break;
        default:
            player.health = DEFAULT_HEALTH;
            maxHealth = DEFAULT_HEALTH;
            player.projectileDamage = 1;
            break;
    }
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
    updateHealth();
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

function pauseAudio() {
    if (audioPlaying !== undefined) {
        void audioPlaying.finally(() => {
            audio.pause();
        });
        return;
    }
    audio.pause();
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

export function updateHealth() {
    healthContainer.innerHTML = `<img class="game-stat-heart" src="/assets/HeartIcon.png" alt="coeur de vie plein" height="50px">`.repeat(player.health) + `<img class="game-stat-heart" src="/assets/HeartIconEmpty.png" alt="coeur de vie vide" height="50px">`.repeat(maxHealth - player.health);
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

export function getSeconds(): number {
    if (isGameOver) return finalSurvivalSeconds;
    return Math.max(0, Math.floor((Date.now() - gameStartTimeMs) / 1000));
}

export function computeCurrentScore(): number {
    const seconds = getSeconds();
    return computeScore(seconds, player.killedEnnemies);
}

function getNbKilledEnnemies(killed: Map<number, number>):number {
    let nb = 0;
    killed.forEach((score) => {
        nb += score;
    });
    return nb;
}
