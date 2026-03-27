import { render } from "./credits.ts";
import { initializeEventListeners } from "./Parameter.ts";
import { loadLeaderboard, renderLeaderboard } from "./leaderboard.ts";
import { player } from "./game/gameRendering.ts";
import { socket } from "./socket.ts";
import { startNewGame, resetCurrentGame, finalizeCurrentRun, stopGameTimer, startGameTimer, maxHealth, getSeconds, computeCurrentScore } from "./game/runManagement.ts";
import type { MultiplayerPlayerData, MultiplayerRoomConfig, MultiplayerRoomInfo, MultiplayerEndGameStats } from "../common/types.ts";

export let isCoopMode = false;
export let isMultiplayerMode = false;
export let isSpectatorMode = false;
export let currentRoomId: string | null = null;
export let multiplayerPlayers: Map<string, MultiplayerPlayerData> = new Map();
export let multiplayerConfig: MultiplayerRoomConfig | null = null;

export function setCoopMode(value: boolean) {
    isCoopMode = value;
}

export function setMultiplayerMode(value: boolean) {
    isMultiplayerMode = value;
}

export function setSpectatorMode(value: boolean) {
    isSpectatorMode = value;
    const spectatorOverlay = document.querySelector(".spectator-overlay");
    if (value) {
        spectatorOverlay?.classList.remove("hidden");
    } else {
        spectatorOverlay?.classList.add("hidden");
    }
}

export function setCurrentRoomId(roomId: string | null) {
    currentRoomId = roomId;
}


// Récupération des éléments de la page web
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
const allyHearts = document.querySelector(".ally-hearts")!;
const soloButton = document.querySelector(".game-btn.solo");
const coopButton = document.querySelector(".game-btn.coop");
const overBackButton = document.querySelector(".rejouer-back");
const video = document.querySelector('.back-video,source') as HTMLVideoElement;
const settingsBtn = document.querySelectorAll('.settingsBtn');
const leaderboardTable = document.querySelector('.leaderboard-section table tbody');
const leaderboardBtn = document.querySelector('.leaderboard.game-btn');
const pseudoInput = document.querySelector<HTMLInputElement>(".pseudo");
const pseudoDisplay = document.querySelector(".pseudo-displayer");
const bonusDisplay = document.querySelector(".game-stat-bonus");
const attackBonusDisplay = document.querySelector(".attack_bonus");
const speedBonusDisplay = document.querySelector(".speed_bonus");
const invincibilityBonusDisplay = document.querySelector(".invincibility_bonus");
const difficultySelect = document.querySelector(".difficulty-select") as HTMLSelectElement;
const multiButton = document.querySelector(".game-btn.multi");
const multiMenuSection = document.querySelector(".multi-menu-section")!;
const multiConfigSection = document.querySelector(".multi-config-section")!;
const multiLobbySection = document.querySelector(".multi-lobby-section")!;
const multiRoomListSection = document.querySelector(".multi-room-list-section")!;
const multiEndSection = document.querySelector(".multi-end-section")!;
const multiHostBtn = document.querySelector(".multi-host-btn");
const multiJoinBtn = document.querySelector(".multi-join-btn");
const multiBackBtn = document.querySelector(".multi-back-btn");
const multiConfigBackBtn = document.querySelector(".multi-config-back-btn");
const multiCreateBtn = document.querySelector(".multi-create-btn");
const multiDifficultySelect = document.querySelector(".multi-difficulty-select") as HTMLSelectElement;
const multiMaxPlayersSelect = document.querySelector(".multi-max-players-select") as HTMLSelectElement;
const multiRoomIdDisplay = document.querySelector(".multi-room-id-display");
const multiDifficultyDisplay = document.querySelector(".multi-difficulty-display");
const multiMaxDisplay = document.querySelector(".multi-max-display");
const multiPlayersUl = document.querySelector(".multi-players-ul");
const multiWaitingStatus = document.querySelector(".multi-waiting-status");
const multiStartBtn = document.querySelector(".multi-start-btn");
const multiLeaveBtn = document.querySelector(".multi-leave-btn");
const multiRoomsList = document.querySelector(".multi-rooms-list");
const multiNoRoomsMsg = document.querySelector(".multi-no-rooms-msg");
const multiRefreshBtn = document.querySelector(".multi-refresh-rooms-btn");
const multiRoomsBackBtn = document.querySelector(".multi-rooms-back-btn");
const multiBackLobbyBtn = document.querySelector(".multi-back-lobby-btn");
const multiBackMenuBtn = document.querySelector(".multi-back-menu-btn");
const multiLeaderboardBody = document.querySelector(".multi-leaderboard-body");
const multiAlliesContainer = document.querySelector(".multi-allies-container");
const multiAlliesList = document.querySelector(".multi-allies-list");
const skinSelect: HTMLSelectElement = document.querySelector('.skin-select')!;

let currentAttackTimeout: NodeJS.Timeout | null = null;
let currentSpeedTimeout: NodeJS.Timeout | null = null;
let currentInvincibilityTimeout: NodeJS.Timeout | null = null;

export let difficulty: number = 0;
let videoPlaying = video.play();

initializeEventListeners();

export function pauseVideo() {
    if(videoPlaying !== undefined) {
        videoPlaying.then(_ => {
            video.pause();
        })
    }
}

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
    player.isHost = true;
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

multiButton?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("multi-menu");
});

multiHostBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("multi-config");
});

multiJoinBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    refreshMultiRoomsList();
    menuSelection("multi-room-list");
});

multiBackBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("main");
});

multiConfigBackBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("multi-menu");
});

multiCreateBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    const pseudo = pseudoInput?.value || "Host";
    const config: MultiplayerRoomConfig = {
        difficulty: parseInt(multiDifficultySelect.value),
        maxPlayers: parseInt(multiMaxPlayersSelect.value),
    };
    const skinIndex = skinSelect.value;
    socket.emit("createMultiRoom", { pseudo, config, skinIndex }, (result: { success: boolean; roomId?: string }) => {
        if (result.success && result.roomId) {
            setCurrentRoomId(result.roomId);
            multiplayerConfig = config;
            player.isHost = true;
            if (multiRoomIdDisplay) multiRoomIdDisplay.textContent = result.roomId;
            if (multiDifficultyDisplay) multiDifficultyDisplay.textContent = ["EASY", "MEDIUM", "HARD"][config.difficulty];
            if (multiMaxDisplay) multiMaxDisplay.textContent = config.maxPlayers.toString();
            updateMultiPlayersList();
            menuSelection("multi-lobby");
        }
    });
});

multiStartBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    socket.emit("startMultiGame");
});

multiLeaveBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    socket.emit("leaveMultiRoom");
    setCurrentRoomId(null);
    multiplayerPlayers.clear();
    menuSelection("multi-menu");
});

multiRefreshBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    refreshMultiRoomsList();
});

multiRoomsBackBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("multi-menu");
});

multiBackLobbyBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    menuSelection("main");
});

multiBackMenuBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    socket.emit("leaveMultiRoom");
    setCurrentRoomId(null);
    setMultiplayerMode(false);
    setSpectatorMode(false);
    multiplayerPlayers.clear();
    menuSelection("main");
    video?.setAttribute("src", "assets/DoomguyIsabelle.mp4");
});

function refreshMultiRoomsList() {
    socket.emit("getMultiRooms", (roomList: MultiplayerRoomInfo[]) => {
        if (!multiRoomsList) return;

        const existingRooms = multiRoomsList.querySelectorAll(".multi-room-item");
        existingRooms.forEach(el => el.remove());

        if (roomList.length === 0) {
            multiNoRoomsMsg?.classList.remove("hidden");
        } else {
            multiNoRoomsMsg?.classList.add("hidden");
            roomList.forEach(room => {
                const diffNames = ["EASY", "MEDIUM", "HARD"];
                const roomEl = document.createElement("div");
                roomEl.className = "multi-room-item room-item";
                roomEl.innerHTML = `
                    <span class="room-host-name">${escapeHtml(room.hostPseudo)}</span>
                    <span class="room-info">${room.playerCount}/${room.maxPlayers} - ${diffNames[room.difficulty]}</span>
                    <button class="join-multi-room-btn" data-room-id="${room.id}">Rejoindre</button>
                `;
                multiRoomsList.appendChild(roomEl);

                const joinBtn = roomEl.querySelector(".join-multi-room-btn");
                joinBtn?.addEventListener('click', () => joinMultiRoom(room.id));
            });
        }
    });
}

function joinMultiRoom(roomId: string) {
    const pseudo = pseudoInput?.value || "Player";
    const skinIndex = skinSelect.value;
    socket.emit("joinMultiRoom", { roomId, pseudo, skinIndex }, (result: { success: boolean; error?: string; players?: MultiplayerPlayerData[]; config?: MultiplayerRoomConfig }) => {
        if (!result.success) {
            alert(result.error || "Impossible de rejoindre");
            refreshMultiRoomsList();
            return;
        }

        player.isHost = false;
        setCurrentRoomId(roomId);
        multiplayerConfig = result.config || null;

        multiplayerPlayers.clear();
        result.players?.forEach(p => multiplayerPlayers.set(p.socketId, p));

        if (multiRoomIdDisplay) multiRoomIdDisplay.textContent = roomId;
        if (result.config) {
            if (multiDifficultyDisplay) multiDifficultyDisplay.textContent = ["EASY", "MEDIUM", "HARD"][result.config.difficulty];
            if (multiMaxDisplay) multiMaxDisplay.textContent = result.config.maxPlayers.toString();
        }
        menuSelection("multi-lobby");
    });
}

socket.on('multiPlayerDisconnected', updateMultiPlayersList);

function updateMultiPlayersList() {
    if (!multiPlayersUl) return;
    multiPlayersUl.innerHTML = "";

    socket.emit("getMultiRoomPlayers", (players: MultiplayerPlayerData[]) => {
        multiplayerPlayers.clear();
        players.forEach(p => multiplayerPlayers.set(p.socketId, p));

        players.forEach(p => {
            const li = document.createElement("li");
            li.className = "multi-player-item";
            li.innerHTML = `
                <span class="player-name">${escapeHtml(p.pseudo)}</span>
                ${p.isHost ? '<span class="host-badge">HOST</span>' : ''}
            `;
            multiPlayersUl.appendChild(li);
        });

        if (player.isHost && players.length >= 2) {
            multiStartBtn?.classList.remove("hidden");
        } else {
            multiStartBtn?.classList.add("hidden");
        }

        if (multiWaitingStatus) {
            multiWaitingStatus.textContent = players.length >= 2
                ? "Prêt à lancer !"
                : "En attente de joueurs...";
        }
    });
}

difficultySelect.addEventListener('change', (event) => {
    event.preventDefault();
    difficulty = parseInt(difficultySelect.value);
    const options = difficultySelect.querySelectorAll("option");
    options[difficulty].setAttribute("selected", "");
    for(let i = 0; i < options.length; i++) {
        if(i != difficulty) {
            options[i].removeAttribute("selected");
        }
    }
});

coopHostBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    player.isHost = true;
    const pseudo = pseudoInput?.value || "Guest";
    console.log("Client Host: Emitting createRoom event.");
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
            return;
        }

        player.isHost = false;
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
    console.log("Client: Received roomReady event. Room ID:", data.roomId);
    setCoopMode(true);
    setCurrentRoomId(data.roomId);

    if (pseudoInput?.value && pseudoInput.value.length > 0) {
        player.setPseudo(pseudoInput?.value);
    }
    updatePseudoDisplay();
    startNewGame();
    updateAllyHealth(maxHealth);
    console.log("Client: Transitioning to game menu.");
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

socket.on("multiPlayerJoined", (data: { player: MultiplayerPlayerData }) => {
    multiplayerPlayers.set(data.player.socketId, data.player);
    updateMultiPlayersList();
});

socket.on("multiPlayerLeft", (data: { socketId: string }) => {
    multiplayerPlayers.delete(data.socketId);
    updateMultiPlayersList();
});

socket.on("multiHostMigrated", (data: { newHostId: string; newHostPseudo: string }) => {
    if (socket.id === data.newHostId) {
        player.isHost = true;
    }
    updateMultiPlayersList();
});

socket.on("multiGameStarted", (data: { players: MultiplayerPlayerData[]; config: MultiplayerRoomConfig }) => {
    setMultiplayerMode(true);
    setSpectatorMode(false);
    multiplayerConfig = data.config;
    difficulty = data.config.difficulty;

    multiplayerPlayers.clear();
    data.players.forEach(p => multiplayerPlayers.set(p.socketId, p));

    if (pseudoInput?.value && pseudoInput.value.length > 0) {
        player.setPseudo(pseudoInput?.value);
    }
    updatePseudoDisplay();

    multiAlliesContainer?.classList.remove("hidden");
    updateMultiAlliesDisplay();

    startNewGame();
    menuSelection("multi-game");
});

socket.on("multiPlayerMoved", (data: { socketId: string; posX: number; posY: number }) => {
    const p = multiplayerPlayers.get(data.socketId);
    if (p) {
        p.posX = data.posX;
        p.posY = data.posY;
    }
});

socket.on("multiPlayerShot", (data: { socketId: string; posX: number; posY: number }) => {
    const event = new CustomEvent("multiPlayerShot", { detail: data });
    window.dispatchEvent(event);
});

socket.on("multiPlayerHealthUpdate", (data: { socketId: string; health: number }) => {
    const p = multiplayerPlayers.get(data.socketId);
    if (p) {
        p.health = data.health;
        updateMultiAlliesDisplay();
    }
});

socket.on("multiPlayerBecameSpectator", (data: { socketId: string; pseudo: string }) => {
    const p = multiplayerPlayers.get(data.socketId);
    if (p) {
        p.status = 'spectator';
        updateMultiAlliesDisplay();
    }
});

socket.on("multiPlayerDisconnected", (data: { socketId: string; pseudo: string }) => {
    multiplayerPlayers.delete(data.socketId);
    updateMultiAlliesDisplay();
});

socket.on("multiPlayerReconnected", (data: { player: MultiplayerPlayerData }) => {
    multiplayerPlayers.set(data.player.socketId, data.player);
    updateMultiAlliesDisplay();
});

socket.on("multiReconnected", (data: { player: MultiplayerPlayerData; config: MultiplayerRoomConfig; players: MultiplayerPlayerData[] }) => {
    setMultiplayerMode(true);
    multiplayerConfig = data.config;
    difficulty = data.config.difficulty;

    player.health = data.player.health;
    player.posX = data.player.posX;
    player.posY = data.player.posY;

    if (data.player.status === 'spectator') {
        setSpectatorMode(true);
    }

    multiplayerPlayers.clear();
    data.players.forEach(p => multiplayerPlayers.set(p.socketId, p));

    multiAlliesContainer?.classList.remove("hidden");
    updateMultiAlliesDisplay();

    startNewGame();
    menuSelection("multi-game");
});

socket.on("multiGameEnded", (data: { stats: MultiplayerEndGameStats[]; reason: string }) => {
    stopGameTimer();
    setSpectatorMode(false);
    displayMultiEndStats(data.stats);
    menuSelection("multi-end");
});

socket.on("multiApplyBonus", (data: { id: string; type: string }) => {
    bonusDisplayUpdate(data.type);
});

function updateMultiAlliesDisplay() {
    if (!multiAlliesList) return;
    multiAlliesList.innerHTML = "";

    multiplayerPlayers.forEach((p, socketId) => {
        if (socketId === socket.id) return;

        const allyDiv = document.createElement("div");
        allyDiv.className = `multi-ally-item ${p.status === 'spectator' ? 'spectator' : ''}`;

        let heartsHtml = "";
        for (let i = 0; i < p.health; i++) {
            heartsHtml += `<img class="ally-heart-mini" src="/assets/HeartIcon.png" alt="coeur" height="20px">`;
        }

        allyDiv.innerHTML = `
            <span class="ally-pseudo">${escapeHtml(p.pseudo.substring(0, 8))}</span>
            <div class="ally-hearts-mini">${heartsHtml}</div>
            ${p.status === 'spectator' ? '<span class="spectator-badge">MORT</span>' : ''}
        `;
        multiAlliesList.appendChild(allyDiv);
    });
}

function displayMultiEndStats(stats: MultiplayerEndGameStats[]) {
    if (!multiLeaderboardBody) return;
    multiLeaderboardBody.innerHTML = "";

    stats.forEach((stat, index) => {
        const tr = document.createElement("tr");
        tr.className = stat.status === 'dead' ? 'dead-player' : 'alive-player';

        const minutes = Math.floor(stat.survivalSeconds / 60);
        const seconds = stat.survivalSeconds % 60;
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(stat.pseudo)}</td>
            <td>${stat.score}</td>
            <td>${stat.killedEnemies}</td>
            <td>${timeStr}</td>
            <td>${stat.status === 'dead' ? 'Mort' : 'Vivant'}</td>
        `;
        multiLeaderboardBody.appendChild(tr);
    });
}

export function sendMultiPlayerMove(posX: number, posY: number) {
    if (isMultiplayerMode && !isSpectatorMode) {
        socket.emit("multiPlayerMove", { posX, posY });
    }
}

export function sendMultiPlayerShoot(posX: number, posY: number) {
    if (isMultiplayerMode && !isSpectatorMode) {
        socket.emit("multiPlayerShoot", { posX, posY });
    }
}

export function sendMultiHealthUpdate(health: number) {
    if (isMultiplayerMode) {
        socket.emit("multiHealthUpdate", { health });
    }
}

export function sendMultiPlayerDied() {
    if (isMultiplayerMode) {
        const score = computeCurrentScore();
        const killedEnemies: Record<number, number> = {};
        player.killedEnnemies.forEach((count, id) => {
            killedEnemies[id] = count;
        });
        socket.emit("multiPlayerDied", {
            score,
            killedEnemies,
            survivalSeconds: getSeconds(),
        });
        setSpectatorMode(true);
    }
}

export function sendMultiEnemyKilled(index: number) {
    if (isMultiplayerMode) {
        socket.emit("multiEnemyKilled", index);
    }
}

export function sendMultiEnemyHurt(index: number, damage: number) {
    if (isMultiplayerMode) {
        socket.emit("multiEnemyHurt", index, damage);
    }
}

function updateAllyHealth(health: number) {
    let html = "";
    for(let i = 0; i < health; i++) {
        html += `<img class="game-stat-heart ally-heart" src="/assets/HeartIcon.png" alt="coeur allié" height="50px">`;
    }
    for(let i = 0; i < maxHealth - health; i++) {
        html += `<img class="game-stat-heart ally-heart" src="/assets/HeartIconEmpty.png" alt="coeur allié vide" height="50px">`;
    }
    allyHearts.innerHTML = html;
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
    if (isMultiplayerMode) {
        socket.emit("leaveMultiRoom");
        setMultiplayerMode(false);
        setSpectatorMode(false);
        multiplayerPlayers.clear();
        multiAlliesContainer?.classList.add("hidden");
    } else if (currentRoomId) {
        socket.emit("leaveRoom");
    }
    setCurrentRoomId(null);
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
    menuSelection("main");
    video?.play().catch(() => {});
});

export function menuSelection(menu: string) {
    starterSection?.classList.add("hidden");
    mainMenuSection?.classList.add("hidden");
    overSection.classList.add("hidden");
    settingsBtn[0]?.classList.add("hidden");
    creditsSection.classList.add("hidden");
    leaderBoardSection.classList.add("hidden");
    gameSection.classList.add('hidden');
    coopMenuSection.classList.add("hidden");
    waitingRoomSection.classList.add("hidden");
    roomListSection.classList.add("hidden");
    multiMenuSection.classList.add("hidden");
    multiConfigSection.classList.add("hidden");
    multiLobbySection.classList.add("hidden");
    multiRoomListSection.classList.add("hidden");
    multiEndSection.classList.add("hidden");

    switch (menu) {
        case "main":
            mainMenuSection?.classList.remove("hidden");
            settingsBtn[0]?.classList.remove("hidden");
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
            settingsBtn[1]?.classList.remove("hidden");
            video?.setAttribute("src", "assets/DoomAmbience.mp4");
            startGameTimer();
            socket.emit("startPlaying", {
                isCoop: isCoopMode,
                roomId: currentRoomId,
                difficulty,
            });
            break;
        case "coop-menu":
            coopMenuSection.classList.remove("hidden");
            settingsBtn[0]?.classList.remove("hidden");
            break;
        case "waiting-room":
            waitingRoomSection.classList.remove("hidden");
            settingsBtn[0]?.classList.remove("hidden");
            break;
        case "room-list":
            roomListSection.classList.remove("hidden");
            settingsBtn[0]?.classList.remove("hidden");
            break;
        case "multi-menu":
            multiMenuSection.classList.remove("hidden");
            settingsBtn[0]?.classList.remove("hidden");
            break;
        case "multi-config":
            multiConfigSection.classList.remove("hidden");
            settingsBtn[0]?.classList.remove("hidden");
            break;
        case "multi-lobby":
            multiLobbySection.classList.remove("hidden");
            settingsBtn[0]?.classList.remove("hidden");
            break;
        case "multi-room-list":
            multiRoomListSection.classList.remove("hidden");
            settingsBtn[0]?.classList.remove("hidden");
            break;
        case "multi-game":
            gameSection.classList.remove("hidden");
            settingsBtn[1]?.classList.remove("hidden");
            video?.setAttribute("src", "assets/DoomAmbience.mp4");
            startGameTimer();
            break;
        case "multi-end":
            multiEndSection.classList.remove("hidden");
            video?.setAttribute("src", "assets/DoomEnd.mp4");
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