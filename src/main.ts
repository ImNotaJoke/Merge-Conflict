import { render } from "./credits.ts";
import { initializeEventListeners } from "./Parameter.ts";
import { loadLeaderboard, renderLeaderboard } from "./leaderboard.ts";
import { player } from "./game/gameRendering.ts";
import { socket } from "./socket.ts";
import { startNewGame, resetCurrentGame, finalizeCurrentRun, stopGameTimer, startGameTimer } from "./game/runManagement.ts";

export let isCoopMode = false;
export let currentRoomId: string | null = null;

export function setCoopMode(value: boolean) {
    isCoopMode = value;
}

export function setCurrentRoomId(roomId: string | null) {
    currentRoomId = roomId;
}

const creditsform = document.querySelector(".credits-form");
const backBtn = document.querySelectorAll(".back-btn:not(.coop-back-btn):not(.cancel-room-btn):not(.rooms-back-btn)");
const starterBtn = document.querySelector(".starter-btn");
const starterSection = document.querySelector(".starter");
const mainMenuSection = document.querySelector("section.main-menu");
const creditsSection = document.querySelector(".credits-section")!;
const leaderBoardSection = document.querySelector('.leaderboard-section')!;
const overSection = document.querySelector(".rejouer-section")!;
const gameSection = document.querySelector(".game-section")!;
const quitButton = document.querySelector(".game-leave-btn");
const coopMenuSection = document.querySelector(".coop-menu-section")!;
const waitingRoomSection = document.querySelector(".waiting-room-section")!;
const roomListSection = document.querySelector(".room-list-section")!;
const coopHostBtn = document.querySelector(".coop-host-btn");
const coopJoinBtn = document.querySelector(".coop-join-btn");
const coopBackBtn = document.querySelector(".coop-back-btn");
const cancelRoomBtn = document.querySelector(".cancel-room-btn");
const roomsBackBtn = document.querySelector(".rooms-back-btn");
const refreshRoomsBtn = document.querySelector(".refresh-rooms-btn");
const roomIdDisplay = document.querySelector(".room-id-display");
const roomsList = document.querySelector(".rooms-list");
const noRoomsMsg = document.querySelector(".no-rooms-msg");
const allyHealthContainer = document.querySelector(".ally-health-container");
const allyHearts = document.querySelectorAll(".ally-heart");
const soloButton = document.querySelector(".game-btn.solo");
const coopButton = document.querySelector(".game-btn.coop");
const overBackButton = document.querySelector(".rejouer-back");
const video = document.querySelector('.back-video,source') as HTMLVideoElement | null;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement | null;
const leaderboardTable = document.querySelector('.leaderboard-section table tbody');
const leaderboardBtn = document.querySelector('.leaderboard.game-btn');
const pseudoInput = document.querySelector<HTMLInputElement>(".pseudo");
const pseudoDisplay = document.querySelector(".pseudo-displayer");
const bonusDisplay = document.querySelector(".game-stat-bonus");
const attackBonusDisplay = document.querySelector(".attack_bonus");
const speedBonusDisplay = document.querySelector(".speed_bonus");
const invincibilityBonusDisplay = document.querySelector(".invincibility_bonus");
//let currentBonusTimeout: NodeJS.Timeout | null = null;
let currentAttackTimeout: NodeJS.Timeout | null = null;
let currentSpeedTimeout: NodeJS.Timeout | null = null;
let currentInvincibilityTimeout: NodeJS.Timeout | null = null;

initializeEventListeners();

video?.pause();

creditsform?.addEventListener('submit', (event) => {
    event.preventDefault();
    menuSelection("credits");
    const content = creditsSection.querySelector(".credits-section table tbody");
    if (content) content.innerHTML = render();
});

backBtn.forEach((btn) => {
    btn.addEventListener('click', (event) => {
        event.preventDefault();
        menuSelection("main");
    });
});

soloButton?.addEventListener('click', (event) => {
    event.preventDefault();
    setCoopMode(false);
    setCurrentRoomId(null);
    startNewGame();
    menuSelection("game");
    if (pseudoInput?.value && pseudoInput.value.length > 0) {
        player.setPseudo(pseudoInput?.value);
    }
    updatePseudoDisplay();
});

coopButton?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("coop-menu");
});

coopHostBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    const pseudo = pseudoInput?.value || "Guest";
    socket.emit("createRoom", { pseudo }, (result: { success: boolean; roomId?: string }) => {
        if (result.success && result.roomId) {
            setCurrentRoomId(result.roomId);
            if (roomIdDisplay) roomIdDisplay.textContent = result.roomId;
            menuSelection("waiting-room");
        }
    });
});

coopJoinBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    refreshRoomsList();
    menuSelection("room-list");
});

coopBackBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("main");
});

cancelRoomBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    socket.emit("leaveRoom");
    setCurrentRoomId(null);
    menuSelection("coop-menu");
});

roomsBackBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("coop-menu");
});

refreshRoomsBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    refreshRoomsList();
});

function refreshRoomsList() {
    socket.emit("getRooms", (roomList: Array<{ id: string; hostPseudo: string }>) => {
        if (!roomsList) return;

        const existingRooms = roomsList.querySelectorAll(".room-item");
        existingRooms.forEach(el => el.remove());

        if (roomList.length === 0) {
            noRoomsMsg?.classList.remove("hidden");
        } else {
            noRoomsMsg?.classList.add("hidden");
            roomList.forEach(room => {
                const roomEl = document.createElement("div");
                roomEl.className = "room-item";
                roomEl.innerHTML = `
                    <span class="room-host-name">${escapeHtml(room.hostPseudo)}</span>
                    <button class="join-room-btn" data-room-id="${room.id}">Rejoindre</button>
                `;
                roomsList.appendChild(roomEl);

                const joinBtn = roomEl.querySelector(".join-room-btn");
                joinBtn?.addEventListener('click', () => joinRoom(room.id));
            });
        }
    });
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function joinRoom(roomId: string) {
    const pseudo = pseudoInput?.value || "Invité";
    socket.emit("joinRoom", { roomId, pseudo }, (result: { success: boolean; error?: string }) => {
        if (!result.success) {
            alert(result.error || "Impossible de rejoindre la room");
            refreshRoomsList();
        }
    });
}

function updatePseudoDisplay() {
    if (pseudoDisplay) {
        const pseudo = player.pseudo;
        pseudoDisplay.innerHTML = pseudo.length > 12
            ? `Joueur : ${pseudo.substring(0, 12)}...`
            : `Joueur : ${pseudo}`;
    }
}

socket.on("roomReady", (data: { roomId: string }) => {
    setCoopMode(true);
    setCurrentRoomId(data.roomId);

    if (pseudoInput?.value && pseudoInput.value.length > 0) {
        player.setPseudo(pseudoInput?.value);
    }
    updatePseudoDisplay();

    allyHearts.forEach((heart) => {
        heart.setAttribute("src", "/assets/HeartIcon.png");
        heart.setAttribute("alt", "coeur allié plein");
    });
    allyHealthContainer?.classList.remove("hidden");
    startNewGame();
    menuSelection("game");
});

socket.on("gameOverRoom", (data: { reason: string }) => {
    console.log("Game over for room:", data.reason);
    setCurrentRoomId(null);
    allyHealthContainer?.classList.add("hidden");
    menuSelection("over");
});

socket.on("allyHealthUpdate", (data: { health: number }) => {
    updateAllyHealth(data.health);
});

socket.on("newEnnemyKilled", (id:number) => {
    player.ennemyKilled(id);
})

function updateAllyHealth(health: number) {
    allyHearts.forEach((heart, i) => {
        if (i < health) {
            heart.setAttribute("src", "/assets/HeartIcon.png");
            heart.setAttribute("alt", "coeur allié plein");
        } else {
            heart.setAttribute("src", "/assets/HeartIconEmpty.png");
            heart.setAttribute("alt", "coeur allié vide");
        }
    });
}

overBackButton?.addEventListener('click', (event) => {
    event.preventDefault();
    resetCurrentGame();
    allyHealthContainer?.classList.add("hidden");
    menuSelection("main");
    video?.setAttribute("src", "assets/DoomguyIsabelle.mp4");
});

quitButton?.addEventListener('click', (event) => {
    event.preventDefault();
    if (currentRoomId) {
        socket.emit("leaveRoom");
        setCurrentRoomId(null);
    }
    resetCurrentGame();
    allyHealthContainer?.classList.add("hidden");
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

export function menuSelection(menu: string) {
    starterSection?.classList.add("hidden");
    mainMenuSection?.classList.add("hidden");
    overSection.classList.add("hidden");
    settingsBtn?.classList.add("hidden");
    creditsSection.classList.add("hidden");
    leaderBoardSection.classList.add("hidden");
    gameSection.classList.add('hidden');
    coopMenuSection.classList.add("hidden");
    waitingRoomSection.classList.add("hidden");
    roomListSection.classList.add("hidden");

    switch (menu) {
        case "main":
            mainMenuSection?.classList.remove("hidden");
            settingsBtn?.classList.remove("hidden");
            break;
        case "credits":
            creditsSection.classList.remove("hidden");
            settingsBtn?.classList.remove("hidden");
            break;
        case "over":
            finalizeCurrentRun(true);
            stopGameTimer();
            socket.emit("stopPlaying");
            overSection.classList.remove('hidden');
            settingsBtn?.classList.remove("hidden");
            video?.setAttribute("src", "assets/DoomEnd.mp4");
            break;
        case "leaderboard":
            leaderBoardSection.classList.remove("hidden");
            settingsBtn?.classList.remove("hidden");
            break;
        case "game":
            gameSection.classList.remove("hidden");
            settingsBtn?.classList.remove("hidden");
            video?.setAttribute("src", "assets/DoomAmbience.mp4");
            startGameTimer();
            socket.emit("startPlaying", { isCoop: isCoopMode, roomId: currentRoomId });
            break;
        case "coop-menu":
            coopMenuSection.classList.remove("hidden");
            settingsBtn?.classList.remove("hidden");
            break;
        case "waiting-room":
            waitingRoomSection.classList.remove("hidden");
            settingsBtn?.classList.remove("hidden");
            break;
        case "room-list":
            roomListSection.classList.remove("hidden");
            settingsBtn?.classList.remove("hidden");
            break;
        default:
            console.error("Mauvais appel de menuSelection");
            break;
    }
}

export function bonusDisplayUpdate(bonusType: string) {

    bonusDisplay?.classList.remove("hidden");
    
    switch (bonusType) {
        case "attack": 
            attackDisplayUpdate(); 
            break;
        case "speed": 
            speedDisplayUpdate();
            break;
        case "invincibility": 
            invincibilityDisplayUpdate();
            break;
    }
}

function attackDisplayUpdate() {
    if (currentAttackTimeout) {
        clearTimeout(currentAttackTimeout);
    }
    attackBonusDisplay?.classList.remove("hidden");
    let duration = 10000;

    currentAttackTimeout = setTimeout(() => {
        attackBonusDisplay?.classList.add("hidden");
    }, duration);
}

function speedDisplayUpdate() {
    if (currentSpeedTimeout) {
        clearTimeout(currentSpeedTimeout);
    }
    speedBonusDisplay?.classList.remove("hidden");
    let duration = 10000;

    currentSpeedTimeout = setTimeout(() => {
        speedBonusDisplay?.classList.add("hidden");
    }, duration);
}

function invincibilityDisplayUpdate() {
    if (currentInvincibilityTimeout) {
        clearTimeout(currentInvincibilityTimeout);
    }
    invincibilityBonusDisplay?.classList.remove("hidden");
    let duration = 5000;

    currentInvincibilityTimeout = setTimeout(() => {
        invincibilityBonusDisplay?.classList.add("hidden");
    }, duration);
}