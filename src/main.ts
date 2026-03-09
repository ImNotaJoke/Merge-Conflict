import { render } from "./credits";
import "./Parameter";

const creditsform = document.querySelector(".credits-form");
const creditBackButton = document.querySelector(".credit-back");

const mainMenuSection = document.querySelector("section.main-menu");
const creditsSection = document.querySelector(".credits-section")!;

const overButton = document.querySelector(".game-btn.solo");
const overSection = document.querySelector(".rejouer-section")!;
const overBackButton = document.querySelector(".rejouer-back");
const video = document.querySelector('.back-video,source') as HTMLVideoElement | null;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement | null;





creditsform?.addEventListener('submit', (event) => {
    event.preventDefault();
    mainMenuSection?.classList.add("hidden");
    creditsSection.classList.remove("hidden");
    const content = creditsSection.querySelector("table tbody");
    if(content) content.innerHTML = render();
});

creditBackButton?.addEventListener('click', (event) => {
    event.preventDefault();
    mainMenuSection?.classList.remove("hidden");
    creditsSection.classList.add("hidden");
});

overButton?.addEventListener('click', (event) => {
    event.preventDefault();
    mainMenuSection?.classList.add("hidden");
    settingsBtn?.classList.add("hidden");
    overSection.classList.remove("hidden");
    video?.setAttribute("src", "assets/DoomEnd.mp4");
});

overBackButton?.addEventListener('click', (event) => {
    event.preventDefault();
    mainMenuSection?.classList.remove("hidden");
    overSection.classList.add("hidden");
    settingsBtn?.classList.remove("hidden");
    video?.setAttribute("src", "assets/DoomguyIsabelle.mp4");
})


