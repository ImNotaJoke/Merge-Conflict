import { render } from "./credits";
import { initializeEventListeners } from "./Parameter";
import { loadLeaderboard, renderLeaderboard } from "./leaderboard";
import { player } from "./game/gameRendering";
import { socket } from "./socket";
import { startNewGame, resetCurrentGame, finalizeCurrentRun, stopGameTimer, startGameTimer } from "./game/runManagement";


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

