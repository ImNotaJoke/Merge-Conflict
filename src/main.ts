import { render } from "./credits";
import { initializeEventListeners } from "./Parameter";
import { loadLeaderboard, renderLeaderboard } from "./leaderboard";
import type { GameRunStats, LeaderboardEntry } from "../common/types";
import { player, resetRenderedGameState } from "./game/gameRendering";
import { resetPlayerPosition } from "./game/playerMovement";
import { socket } from "./socket";

const creditsform = document.querySelector(".credits-form");
const backBtn = document.querySelectorAll(".back-btn");

const starterBtn = document.querySelector(".starter-btn");
const starterSection = document.querySelector(".starter");

const mainMenuSection = document.querySelector("section.main-menu");
const creditsSection = document.querySelector(".credits-section")!;
const leaderBoardSection = document.querySelector('.leaderboard-section')!;
const overSection = document.querySelector(".rejouer-section")!;
const gameSection = document.querySelector(".game-section")!;
const quitButton = document.querySelector(".game-leave-btn");

const soloButton = document.querySelector(".game-btn.solo");
const overBackButton = document.querySelector(".rejouer-back");
const video = document.querySelector('.back-video,source') as HTMLVideoElement | null;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement | null;
const leaderboardTable = document.querySelector('.leaderboard-section table tbody');
const leaderboardBtn = document.querySelector('.leaderboard.game-btn');

const pseudoInput = document.querySelector<HTMLInputElement>(".pseudo");
const pseudoDisplay = document.querySelector(".pseudo-displayer");
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

initializeEventListeners();
video?.pause();

creditsform?.addEventListener('submit', (event) => {
    event.preventDefault();
    menuSelection("credits");
    const content = creditsSection.querySelector(".credits-section table tbody");
    if(content) content.innerHTML = render();
});

backBtn.forEach((btn) => {
    btn.addEventListener('click', (event) => {
        event.preventDefault();
        menuSelection("main");
    });
});

soloButton?.addEventListener('click', (event) => {
    event.preventDefault();
    startNewGame();
    menuSelection("game");
    if(pseudoInput?.value && pseudoInput.value.length > 0) {
        player.setPseudo(pseudoInput?.value);
        
    }
    if(pseudoDisplay){
        const pseudo = player.pseudo;
        if(pseudo.length > 12) {
            pseudoDisplay.innerHTML = `Joueur : ${pseudo.substring(0, 12)}...`;
        } else {
            pseudoDisplay.innerHTML = `Joueur : ${pseudo}`;
        }
    }
});

overBackButton?.addEventListener('click', (event) => {
    event.preventDefault();
    resetCurrentGame();
    menuSelection("main");
    video?.setAttribute("src", "assets/DoomguyIsabelle.mp4");
});

quitButton?.addEventListener('click', (event) => {
    event.preventDefault();
    resetCurrentGame();
    menuSelection("main");
    video?.setAttribute("src", "assets/DoomguyIsabelle.mp4");
});

leaderboardBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("leaderboard");
    void loadLeaderboard().then(() => {
        if (leaderboardTable) leaderboardTable.innerHTML = renderLeaderboard();
    });
});

starterBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    settingsBtn?.classList.remove("hidden");
    menuSelection("main");
    video?.play();
});

function resetCurrentGame() {
    stopGameTimer();
    resetPlayerPosition();
    resetRenderedGameState();
    enemiesKilled = 0;
    updateInGameStats(0);
    socket.emit("stopPlaying");
}

function startNewGame() {
    stopGameTimer();
    resetPlayerPosition();
    resetRenderedGameState();
    enemiesKilled = 0;
    updateInGameStats(0);
    socket.emit("stopPlaying");
}

function startGameTimer() {
    stopGameTimer();
    gameStartTimeMs = Date.now();
    updateInGameStats(0);
    gameTimer = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - gameStartTimeMs) / 1000);
        updateInGameStats(elapsedSeconds);
    }, 1000);
}

function stopGameTimer() {
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

function finalizeCurrentRun(saveScore: boolean) {
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

export function menuSelection(menu:string) {
    starterSection?.classList.add("hidden");
    mainMenuSection?.classList.add("hidden");
    overSection.classList.add("hidden");
    settingsBtn?.classList.add("hidden");
    creditsSection.classList.add("hidden");
    leaderBoardSection.classList.add("hidden");
    gameSection.classList.add('hidden');
    switch(menu) {
        case "main":
            mainMenuSection?.classList.remove("hidden");
            settingsBtn?.classList.remove("hidden");
            break;
        case "credits":
            creditsSection.classList.remove("hidden");
            break;
        case "over":
            finalizeCurrentRun(true);
            stopGameTimer();
            socket.emit("stopPlaying");
            overSection.classList.remove('hidden');
            video?.setAttribute("src", "assets/DoomEnd.mp4");
            break;
        case "leaderboard":
            leaderBoardSection.classList.remove("hidden");
            break;
        case "game":
            gameSection.classList.remove("hidden");
            video?.setAttribute("src", "assets/DoomAmbience.mp4");
            startGameTimer();
            socket.emit("startPlaying");
            break;
        default:
            console.error("Mauvais appel de menuSelection");
            break;
    }
}

