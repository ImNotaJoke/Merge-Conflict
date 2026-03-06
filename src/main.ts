import { render } from "./credits";

const creditsform = document.querySelector(".credits-form");

const mainMenuSection = document.querySelector("section.main-menu");
const creditsSection = document.querySelector(".credits-section")!;

creditsform?.addEventListener('submit', (event) => {
    event.preventDefault();
    console.log("oui");
    mainMenuSection?.classList.add("hidden");
    creditsSection.classList.remove("hidden");
    const content = creditsSection.querySelector("table tbody");
    if(content) content.innerHTML = render();
});

console.log("oui");