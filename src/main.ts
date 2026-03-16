import { render } from "./credits";
import { renderLeaderboard } from "./leaderboard";
import "./Parameter";

const creditsform = document.querySelector(".credits-form");
const backBtn = document.querySelectorAll(".back-btn");

const mainMenuSection = document.querySelector("section.main-menu");
const creditsSection = document.querySelector(".credits-section")!;
const leaderBoardSection = document.querySelector('.leaderboard-section')!;
const overSection = document.querySelector(".rejouer-section")!;

const overButton = document.querySelector(".game-btn.solo");
const overBackButton = document.querySelector(".rejouer-back");
const video = document.querySelector('.back-video,source') as HTMLVideoElement | null;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement | null;
const leaderboardTable = document.querySelector('.leaderboard-section table tbody');
const leaderboardBtn = document.querySelector('.leaderboard.game-btn');

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

overButton?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("over");
    video?.setAttribute("src", "assets/DoomEnd.mp4");
});

overBackButton?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("main");
    video?.setAttribute("src", "assets/DoomguyIsabelle.mp4");
});

leaderboardBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("leaderboard");
    if(leaderboardTable) leaderboardTable.innerHTML = renderLeaderboard();
});

function menuSelection(menu:string) {
    switch(menu) {
        case "main":
            mainMenuSection?.classList.remove("hidden");
            overSection.classList.add("hidden");
            settingsBtn?.classList.remove("hidden");
            creditsSection.classList.add("hidden");
            leaderBoardSection.classList.add("hidden");
            break;
        case "credits":
            mainMenuSection?.classList.add("hidden");
            settingsBtn?.classList.add("hidden");
            creditsSection.classList.remove("hidden");
            break;
        case "over":
            mainMenuSection?.classList.add("hidden");
            overSection.classList.remove("hidden");
            settingsBtn?.classList.add("hidden");
            break;
        case "leaderboard":
            mainMenuSection?.classList.add("hidden");
            leaderBoardSection.classList.remove("hidden");
            settingsBtn?.classList.add("hidden");
            break;
        default:
            console.error("Mauvais appel de menuSelection");
            break;
    }
}