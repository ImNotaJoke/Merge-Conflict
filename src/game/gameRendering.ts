import { Ennemi,Bonus, Player, SecondPlayer, type SecondPlayerData } from "../../common/types.ts";
import { canvas, context, x, y } from "./playerMovement.ts";
import {
	activeBullets,
	BULLET_RENDER_HEIGHT,
	BULLET_RENDER_WIDTH,
	bullet,
	updateBullets,
	secondPlayerBullets,
	enemyBullets,
	resetBullets,
} from "./playerShoot.ts";
import { socket } from "../socket.ts";
import { menuSelection, bonusDisplayUpdate, isMultiplayerMode, isSpectatorMode, multiplayerPlayers, sendMultiPlayerDied, sendMultiEnemyKilled, sendMultiEnemyHurt, sendMultiHealthUpdate } from "../main.ts";
import { isCoopMode, currentRoomId } from "../gameState.ts";
import { updateHealth } from "./runManagement.ts";
import { audio } from "../Parameter.ts";
import bulletHitSoundUrl from '../../assets/sounds/bullet_hit.wav';
import monsterDeathSoundUrl from '../../assets/sounds/monster_death.wav';
import playerHurtSoundUrl from '../../assets/sounds/player_hurt.wav';
import bulletShotSoundUrl from '../../assets/sounds/bullet_shot.wav';
import bonusPickupSoundUrl from '../../assets/sounds/bonus_pickup.wav';
import powerUpImageUrl from '../../assets/power_up.png';
import isaLegaImageUrl from '../../assets/character/isabelle/RIGHT/mtr1.png';
import doomGuyImageUrl from '../../assets/character/doomGuy/DoomGuy.png';
import isaUpImageUrl from '../../assets/character/isabelle/UP/mtt1.png';
import isaRedImageUrl from '../../assets/character/isabelle/rouge.png';
import isaBlueImageUrl from '../../assets/character/isabelle/bleue.png';
import isaDarkImageUrl from '../../assets/character/isabelle/dark.png';
import mob1ImageUrl from '../../assets/character/ennemi/mob1/mob1.png';
import mob12ImageUrl from '../../assets/character/ennemi/mob1/mob12.png';
import mobTirImageUrl from '../../assets/character/ennemi/mob1/mob_tir.png';
import bossImageUrl from '../../assets/character/ennemi/boss/Boss.png';

const skinSelect: HTMLSelectElement = document.querySelector('.skin-select')!;

// Assurez-vous que ces imports sont bien des chemins relatifs depuis ce fichier
// Si votre structure de dossier est `src/game/gameRendering.ts` et `assets/`,
// alors le chemin est `../../assets/...`


export const PLAYER_RENDER_WIDTH = 56;
export const PLAYER_RENDER_HEIGHT = 82;
const ENNEMI_RENDER_WIDTH = 64;
const ENNEMI_RENDER_HEIGHT = 64;
const BOSS_IMAGE_ID = 3;
const BOSS_RENDER_WIDTH = 250;
const SERVER_ARENA_WIDTH = 1980;
const SERVER_ARENA_HEIGHT = 720;
const BONUS_ITEM_RENDER_WIDTH = 32;
const BONUS_ITEM_RENDER_HEIGHT = 32;

export const ennemy_hit_sound = new Audio(bulletHitSoundUrl);
export const ennemy_death_sound = new Audio(monsterDeathSoundUrl);
export const player_hurt_sound = new Audio(playerHurtSoundUrl);
export const bullet_shot_sound = new Audio(bulletShotSoundUrl);
export const bonus_pickup_sound = new Audio(bonusPickupSoundUrl);
 
export const player: Player = new Player(0, 0);
const image = new Map<string, HTMLImageElement>();
export const bonusImage = new Image();
const ennemiImages = [new Image(), new Image(), new	Image(), new Image()];
let ennemies: Ennemi[] = [];
let activeBonuses: Bonus[] = []; // Correction: Initialisation de activeBonuses
let lastEmittedHealth = 3;
const pendingBossShots: ReturnType<typeof setTimeout>[] = [];
let bossIncomingWarningUntilMs = 0;

export let secondPlayer: SecondPlayer | null = null;
const secondPlayerImage = new Image();
const multiPlayerImages: HTMLImageElement[] = [];
const multiPlayerSkins = [
	isaLegaImageUrl,
	doomGuyImageUrl,
	isaUpImageUrl,
	doomGuyImageUrl,
];

for (let i = 0; i < multiPlayerSkins.length; i++) {
	const img = new Image();
	img.src = multiPlayerSkins[i];
	multiPlayerImages.push(img);
}

secondPlayerImage.src = isaUpImageUrl;
bonusImage.src = powerUpImageUrl;

image.set("isa-lega", new Image());
image.set("doomguy", new Image());
image.set("doomguy-purple", new Image());
image.set("doomguy-orange", new Image());
image.set("isa-red", new Image());
image.set("isa-blue", new Image());
image.set("isa-dark", new Image());

image.get("isa-lega")!.src = isaLegaImageUrl;
image.get("isa-red")!.src = isaRedImageUrl;
image.get("isa-blue")!.src = isaBlueImageUrl;
image.get("isa-dark")!.src = isaDarkImageUrl;
image.get('doomguy')!.src = doomGuyImageUrl;
image.get('doomguy-purple')!.src = doomGuyImageUrl; // Assuming purple and orange are variants of the main DoomGuy image for now, or need separate imports if distinct files.
image.get('doomguy-orange')!.src = doomGuyImageUrl; // Same as above.

// Correction: Les images de DoomGuy purple et orange n'ont pas été importées spécifiquement.
// Si elles sont des fichiers distincts, vous devrez ajouter des imports pour elles aussi.
// Par exemple:
// import doomGuyPurpleImageUrl from '../../assets/character/doomGuy/purple.png';
// import doomGuyOrangeImageUrl from '../../assets/character/doomGuy/orange.png';
// image.get('doomguy-purple')!.src = doomGuyPurpleImageUrl;
// image.get('doomguy-orange')!.src = doomGuyOrangeImageUrl;

ennemiImages[0].src = mob1ImageUrl;
ennemiImages[1].src = mob12ImageUrl;
ennemiImages[2].src = mobTirImageUrl;
ennemiImages[3].src = bossImageUrl;
player.models.push(image.get(skinSelect.value)!);
player.models[0].addEventListener('load', () => {
	requestAnimationFrame(render);
});

skinSelect.addEventListener('change', (event) => {
	event.preventDefault();
	player.models[0] = image.get(skinSelect.value)!;
});

socket.on("ennemiEvent", (updatedEnnemies: Ennemi[]) => {
	console.log("Client: Received ennemiEvent. Updated enemies count:", updatedEnnemies.length);
	// Socket payloads are plain objects; rebuild class instances to keep Ennemi methods available.
	ennemies = updatedEnnemies.map((ennemi) =>
		new Ennemi(
			ennemi.posX,
			ennemi.posY,
			ennemi.health,
			ennemi.moveSpeed,
			ennemi.imageId,
			1, 1, 1,
			ennemi.movementType,
			ennemi.verticalSpeed,
		),
	);
});

socket.on("secondPlayerUpdate", (data: SecondPlayerData) => {
	if (!isCoopMode) return;
	if (data.socketId === socket.id) return;
	const skinId = data.modelId || 'isa-lega';

	if (!secondPlayer) {
		secondPlayer = new SecondPlayer(data.posX, data.posY, data.socketId, skinId);
	} else {
		secondPlayer.updatePosition(data.posX, data.posY);
		secondPlayer.skinId = skinId;
	}
});

socket.on("secondPlayerDisconnect", (socketId: string) => {
	if (secondPlayer && secondPlayer.socketId === socketId) {
		secondPlayer = null;
	}
});

socket.on("spawnBonus", (data: {id: string, posX: number, posY: number, type: string}) => {
	console.log(`Client: spawnBonus received id=${data.id}, type=${data.type}, x=${Math.round(data.posX)}, y=${Math.round(data.posY)}`);
    activeBonuses.push(new Bonus(data.id, data.posX, data.posY, data.type));
});

socket.on("applyBonus", (data: {id: string, type: string}) => {
	console.log(`Client: applyBonus received id=${data.id}, type=${data.type}`);
    activeBonuses = activeBonuses.filter(b => b.id !== data.id);
	bonus_type_effect_determination(data.type);
});

socket.on("enemyShoot", (data: { posX: number, posY: number }) => {
	const maxRenderX = Math.max(canvas.width - ENNEMI_RENDER_WIDTH, 0);
	const maxRenderY = Math.max(canvas.height - ENNEMI_RENDER_HEIGHT, 0);
	
	const renderX = Math.min((data.posX / SERVER_ARENA_WIDTH) * maxRenderX, maxRenderX + ENNEMI_RENDER_WIDTH);
	const renderY = Math.min((data.posY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);

	enemyBullets.push({
		bx: renderX, 
		by: renderY + (ENNEMI_RENDER_HEIGHT / 2) - (BULLET_RENDER_HEIGHT / 2),
		speed: 5.7,
	});
});

socket.on("bossShootPattern", (data: { posX: number, yPositions: number[], shotDelays?: number[] }) => {
	console.log(`Client: bossShootPattern received lanes=${data.yPositions.length}, delayed=${Boolean(data.shotDelays?.length)}`);
	const maxRenderX = Math.max(canvas.width - BOSS_RENDER_WIDTH, 0);
	const bossServerRangeX = Math.max(SERVER_ARENA_WIDTH - BOSS_RENDER_WIDTH, 1);
	const renderX = Math.min((data.posX / bossServerRangeX) * maxRenderX, maxRenderX);
	const maxRenderY = Math.max(canvas.height - BULLET_RENDER_HEIGHT, 0);

	for (let i = 0; i < data.yPositions.length; i++) {
		const shotY = data.yPositions[i];
		const renderY = Math.min((shotY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);
		const delay = data.shotDelays?.[i] ?? 0;
		const timeout = setTimeout(() => {
			enemyBullets.push({
				bx: renderX,
				by: renderY,
				speed: 3.2,
			});
		}, delay);
		pendingBossShots.push(timeout);
	}
});

socket.on("bossIncomingWarning", (data: { remainingMs?: number }) => {
	const duration = Math.max(0, data.remainingMs ?? 5000);
	bossIncomingWarningUntilMs = Date.now() + duration;
	console.log(`Client: bossIncomingWarning received, duration=${duration}ms`);
});

export function resetRenderedGameState() {
	ennemies = [];
	player.health = 3;
	player.killedEnnemies = new Map();
	secondPlayer = null;
	lastEmittedHealth = 3;
	player.projectileDamage = 1;
	player.shootSpeed = 10;
	player.projectileSize = 5;
	player.invincibility = false;
	activeBonuses = [];
	for (let i = 0; i < pendingBossShots.length; i++) {
		clearTimeout(pendingBossShots[i]);
	}
	pendingBossShots.length = 0;
	bossIncomingWarningUntilMs = 0;
	resetBullets();
}

function emitHealthUpdate() {
	if (player.health !== lastEmittedHealth) {
		lastEmittedHealth = player.health;
		if (isMultiplayerMode) {
			sendMultiHealthUpdate(player.health);
		} else if (isCoopMode && currentRoomId) {
			socket.emit("healthUpdate", { health: player.health });
		}
	}
}

bullet.addEventListener('load', () => {
	requestAnimationFrame(render);
});

function areColliding(posX: number, posY: number) {
	const diffX = Math.abs(x - posX);
	const diffY = Math.abs(y - posY);
	return diffX < (PLAYER_RENDER_WIDTH / 2 + ENNEMI_RENDER_WIDTH / 2) &&
		diffY < (PLAYER_RENDER_HEIGHT / 2 + ENNEMI_RENDER_HEIGHT / 2);
}

function render() {
	// console.log("Client: render loop. Ennemies count:", ennemies.length, "isSpectatorMode:", isSpectatorMode); // Uncomment for very verbose logging
	context.clearRect(0, 0, canvas.width, canvas.height);
	player.posX = x;
	player.posY = y;
	drawEnnemies();
	drawBonuses();

	if (isSpectatorMode) {
		context.globalAlpha = 0.3;
		context.filter = 'grayscale(100%)';
	}
	context.drawImage(player.models[0], player.posX, player.posY, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
	context.filter = 'none';
	context.globalAlpha = 1.0;
	drawPlayerLabel(player.posX, player.posY, "VOUS");

	drawSecondPlayer();

	if (isMultiplayerMode) {
		drawMultiplayerPlayers();
	}

	updateBullets();

	activeBullets.forEach(balle => {
		context.drawImage(bullet, balle.bx, balle.by, BULLET_RENDER_WIDTH, BULLET_RENDER_HEIGHT);
	});

	secondPlayerBullets.forEach(balle => {
		context.globalAlpha = 0.7;
		context.drawImage(bullet, balle.bx, balle.by, BULLET_RENDER_WIDTH, BULLET_RENDER_HEIGHT);
		context.globalAlpha = 1.0;
	});

	enemyBullets.forEach(balle => {
		context.drawImage(bullet, balle.bx, balle.by, BULLET_RENDER_WIDTH, BULLET_RENDER_HEIGHT)
	});
	drawBossIncomingWarning();
	checkEnemyBulletsCollision();
	requestAnimationFrame(render);
}

function drawBossIncomingWarning() {
	if (Date.now() > bossIncomingWarningUntilMs) return;
	if (Math.floor(Date.now() / 250) % 2 === 0) return;

	context.save();
	context.font = "bold 44px Arial";
	context.textAlign = "right";
	context.textBaseline = "middle";
	context.strokeStyle = "#120000";
	context.fillStyle = "#ff3b3b";
	context.lineWidth = 5;
	const textX = canvas.width - 20;
	const textY = canvas.height * 0.5;
	context.strokeText("BOSS IMMINENT !", textX, textY);
	context.fillText("BOSS IMMINENT !", textX, textY);
	context.restore();
}

function drawPlayerLabel(renderX: number, renderY: number, label: string) {
	context.save();
	context.font = "bold 14px Arial";
	context.textAlign = "center";
	context.textBaseline = "bottom";
	context.fillStyle = "#f6f6f6";
	context.strokeStyle = "#111111";
	context.lineWidth = 3;

	const labelX = renderX + PLAYER_RENDER_WIDTH / 2;
	const labelY = renderY - 8;
	context.strokeText(label, labelX, labelY);
	context.fillText(label, labelX, labelY);
	context.restore();
}

function drawDeadOverlay(renderX: number, renderY: number) {
	context.save();
	context.fillStyle = 'rgba(0, 0, 0, 0.55)';
	context.fillRect(renderX, renderY, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);

	context.font = "bold 16px Arial";
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.strokeStyle = "#000000";
	context.fillStyle = "#f0f0f0";
	context.lineWidth = 3;

	const centerX = renderX + PLAYER_RENDER_WIDTH / 2;
	const centerY = renderY + PLAYER_RENDER_HEIGHT / 2;
	context.strokeText("MORT", centerX, centerY);
	context.fillText("MORT", centerX, centerY);
	context.restore();
}

function drawSecondPlayer() {
	if (!secondPlayer) return;

	const maxRenderX = Math.max(canvas.width - PLAYER_RENDER_WIDTH, 0);
	const maxRenderY = Math.max(canvas.height - PLAYER_RENDER_HEIGHT, 0);
	const renderX = Math.min((secondPlayer.posX / SERVER_ARENA_WIDTH) * maxRenderX, maxRenderX);
	const renderY = Math.min((secondPlayer.posY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);
	const secondPlayerSkin = image.get(secondPlayer.skinId) ?? image.get('isa-lega');
	if (!secondPlayerSkin) return;

	context.globalAlpha = 0.8;
	context.drawImage(secondPlayerSkin, renderX, renderY, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
	context.globalAlpha = 1.0;
	drawPlayerLabel(renderX, renderY, "J2");
}

function drawMultiplayerPlayers() {
	const maxRenderX = Math.max(canvas.width - PLAYER_RENDER_WIDTH, 0);
	const maxRenderY = Math.max(canvas.height - PLAYER_RENDER_HEIGHT, 0);

	multiplayerPlayers.forEach((p, socketId) => {
		if (socketId === socket.id) return;

		const renderX = Math.min((p.posX / SERVER_ARENA_WIDTH) * maxRenderX, maxRenderX);
		const renderY = Math.min((p.posY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);

		const skinImg = image.get(p.skinIndex)!;
		if (p.status === 'spectator') {
			context.globalAlpha = 0.2;
			context.filter = 'grayscale(100%) contrast(60%) brightness(70%)';
		} else {
			context.globalAlpha = 0.85;
		}

		if (skinImg && skinImg.complete) {
			context.drawImage(skinImg, renderX, renderY, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
		}

		context.filter = 'none';
		context.globalAlpha = 1.0;

		if (p.status === 'spectator') {
			drawDeadOverlay(renderX, renderY);
		}

		const label = p.pseudo.substring(0, 6);
		drawPlayerLabel(renderX, renderY, label);
	});
}

function bulletsAreColliding(posX: number, posY: number, isBossTarget: boolean, ennemiWidth: number, ennemiHeight: number) {
	for (let i = activeBullets.length - 1; i >= 0; i--) {
		const balle = activeBullets[i];
		const bulletCenterX = balle.bx + BULLET_RENDER_WIDTH / 2;
		const bulletCenterY = balle.by + BULLET_RENDER_HEIGHT / 2;
		const ennemiCenterX = posX + ennemiWidth / 2;
		const ennemiCenterY = posY + ennemiHeight / 2;
		const diffX = Math.abs(bulletCenterX - ennemiCenterX);
		const diffY = Math.abs(bulletCenterY - ennemiCenterY);

		if (isBossTarget
			? diffX < (BULLET_RENDER_WIDTH + ennemiWidth) / 2
			: diffX < (BULLET_RENDER_WIDTH + ennemiWidth) / 2 && diffY < (BULLET_RENDER_HEIGHT + ennemiHeight) / 2) {
			activeBullets.splice(i, 1);
			return true;
		}
	}

	for (let i = secondPlayerBullets.length - 1; i >= 0; i--) {
		const balle = secondPlayerBullets[i];
		const bulletCenterX = balle.bx + BULLET_RENDER_WIDTH / 2;
		const bulletCenterY = balle.by + BULLET_RENDER_HEIGHT / 2;
		const ennemiCenterX = posX + ennemiWidth / 2;
		const ennemiCenterY = posY + ennemiHeight / 2;
		const diffX = Math.abs(bulletCenterX - ennemiCenterX);
		const diffY = Math.abs(bulletCenterY - ennemiCenterY);

		if (isBossTarget
			? diffX < (BULLET_RENDER_WIDTH + ennemiWidth) / 2
			: diffX < (BULLET_RENDER_WIDTH + ennemiWidth) / 2 && diffY < (BULLET_RENDER_HEIGHT + ennemiHeight) / 2) {
			secondPlayerBullets.splice(i, 1);
			return true;
		}
	}

	return false;
}

function checkEnemyBulletsCollision() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const balle = enemyBullets[i];
		if(balle) {
			
			const bulletCenterX = balle.bx + BULLET_RENDER_WIDTH / 2;
			const bulletCenterY = balle.by + BULLET_RENDER_HEIGHT / 2;
			const playerCenterX = player.posX + PLAYER_RENDER_WIDTH / 2;
			const playerCenterY = player.posY + PLAYER_RENDER_HEIGHT / 2;
			
			const diffX = Math.abs(bulletCenterX - playerCenterX);
			const diffY = Math.abs(bulletCenterY - playerCenterY);
			
			
			if (diffX < (BULLET_RENDER_WIDTH + PLAYER_RENDER_WIDTH) / 2 &&
				diffY < (BULLET_RENDER_HEIGHT + PLAYER_RENDER_HEIGHT) / 2) {
				
				enemyBullets.splice(i, 1); 
				
				if (player.health > 0) {
					player_hurt_sound.currentTime = 0;
					playAudioSafely(player_hurt_sound);
					player.takeHealth();
					updateHealth();
					emitHealthUpdate();
					
					if (!player.verifyHealth()) {
						if (isCoopMode && currentRoomId) socket.emit("playerDied");
						menuSelection("over");
						pauseAudio(ennemy_death_sound);
						pauseAudio(ennemy_hit_sound);
						pauseAudio(player_hurt_sound);
						pauseAudio(bullet_shot_sound);
						pauseAudio(audio);
						resetRenderedGameState();
					}
				}
			}
		}
    }
}

function bonus_is_colliding(posX:number, posY:number) {
	const diffX = Math.abs(x - posX);
	const diffY = Math.abs(y - posY);
	return diffX < (PLAYER_RENDER_WIDTH / 2 + BONUS_ITEM_RENDER_WIDTH / 2) && diffY < (PLAYER_RENDER_HEIGHT / 2 + BONUS_ITEM_RENDER_HEIGHT / 2);
}

function bonus_type_effect_determination(type: string) {
	switch (type) {
		case "attack":
			bonusDisplayUpdate(type);
			bonus_pickup_sound.currentTime = 0;
			playAudioSafely(bonus_pickup_sound);
			player.projectileDamage *= 2;
			setTimeout(() => { player.projectileDamage = player.projectileDamage / 2; }, 10000);
			break;
		case "speed":
			bonusDisplayUpdate(type);
			bonus_pickup_sound.currentTime = 0;
			playAudioSafely(bonus_pickup_sound);
			player.shootSpeed = 25;
			setTimeout(() => { player.shootSpeed = 10; }, 10000);
			break;
		case "invincibility":
			bonusDisplayUpdate(type);
			bonus_pickup_sound.currentTime = 0;
			playAudioSafely(bonus_pickup_sound);
			player.invincibility = true;
			setTimeout(() => { player.invincibility = false; }, 5000);
			break;	
	}
}




function drawBonuses() {
	const maxBonusRenderX = Math.max(canvas.width - BONUS_ITEM_RENDER_WIDTH, 0);
    const maxBonusRenderY = Math.max(canvas.height - BONUS_ITEM_RENDER_HEIGHT, 0);
	

    for (let i = activeBonuses.length - 1; i >= 0; i--) {
        const bonus = activeBonuses[i];
        
        bonus.posY += 0.25; 

		const renderX = Math.min((bonus.posX / SERVER_ARENA_WIDTH) * maxBonusRenderX, maxBonusRenderX);
        const renderY = Math.min((bonus.posY / SERVER_ARENA_HEIGHT) * maxBonusRenderY, maxBonusRenderY);

        context.drawImage(bonusImage, renderX, renderY, BONUS_ITEM_RENDER_WIDTH, BONUS_ITEM_RENDER_HEIGHT);

        if (bonus_is_colliding(renderX, renderY)) {
			console.log(`Client: collectBonus emit id=${bonus.id}, type=${bonus.type}`);
			socket.emit("collectBonus", { id: bonus.id, type: bonus.type });
            activeBonuses.splice(i, 1);	
        } 
        else if (bonus.posY > SERVER_ARENA_HEIGHT) {
            activeBonuses.splice(i, 1);
        }
    }  
}

function drawEnnemies() {
	if (isSpectatorMode) {
		for (let i = ennemies.length - 1; i >= 0; i--) {
			const ennemi = ennemies[i];
			if (!ennemi) continue;
			const isBossTarget = ennemi.imageId === BOSS_IMAGE_ID;
			const ennemiWidth = isBossTarget ? BOSS_RENDER_WIDTH : ENNEMI_RENDER_WIDTH;
			const ennemiHeight = isBossTarget ? canvas.height : ENNEMI_RENDER_HEIGHT;
			const ennemiMaxRenderX = Math.max(canvas.width - ennemiWidth, 0);
			const ennemiMaxRenderY = Math.max(canvas.height - ennemiHeight, 0);
			const bossServerRangeX = Math.max(SERVER_ARENA_WIDTH - BOSS_RENDER_WIDTH, 1);
			const renderX = isBossTarget
				? Math.min((ennemi.posX / bossServerRangeX) * ennemiMaxRenderX, ennemiMaxRenderX)
				: Math.min((ennemi.posX / SERVER_ARENA_WIDTH) * ennemiMaxRenderX, ennemiMaxRenderX + ennemiWidth);
			const renderY = isBossTarget ? 0 : Math.min((ennemi.posY / SERVER_ARENA_HEIGHT) * ennemiMaxRenderY, ennemiMaxRenderY);
			const ennemiImage = ennemiImages[ennemi.imageId] ?? ennemiImages[0];
			context.drawImage(ennemiImage, renderX, renderY, ennemiWidth, ennemiHeight);
		}
		return;
	}

	for (let i = ennemies.length - 1; i >= 0; i--) {
		const ennemi = ennemies[i];
		if (!ennemi) continue;

		const isBossTarget = ennemi.imageId === BOSS_IMAGE_ID;
		const ennemiWidth = isBossTarget ? BOSS_RENDER_WIDTH : ENNEMI_RENDER_WIDTH;
		const ennemiHeight = isBossTarget ? canvas.height : ENNEMI_RENDER_HEIGHT;
		const ennemiMaxRenderX = Math.max(canvas.width - ennemiWidth, 0);
		const ennemiMaxRenderY = Math.max(canvas.height - ennemiHeight, 0);
		const bossServerRangeX = Math.max(SERVER_ARENA_WIDTH - BOSS_RENDER_WIDTH, 1);
		const renderX = isBossTarget
			? Math.min((ennemi.posX / bossServerRangeX) * ennemiMaxRenderX, ennemiMaxRenderX)
			: Math.min((ennemi.posX / SERVER_ARENA_WIDTH) * ennemiMaxRenderX, ennemiMaxRenderX + ennemiWidth);
		const renderY = isBossTarget ? 0 : Math.min((ennemi.posY / SERVER_ARENA_HEIGHT) * ennemiMaxRenderY, ennemiMaxRenderY);

		if (bulletsAreColliding(renderX, renderY, isBossTarget, ennemiWidth, ennemiHeight)) {
			if (isMultiplayerMode) {
				sendMultiEnemyHurt(i, player.projectileDamage);
			} else {
				socket.emit("enemyHurt", i, player.projectileDamage);
			}
			ennemi.health -= player.projectileDamage;
			ennemy_hit_sound.currentTime = 0;
			playAudioSafely(ennemy_hit_sound);
			if (ennemi.health <= 0) {
				if (isMultiplayerMode) {
					sendMultiEnemyKilled(i);
				} else {
					socket.emit("enemyKilled");
				}
				ennemy_death_sound.currentTime = 0;
				playAudioSafely(ennemy_death_sound);
			}
		}

		if (areColliding(renderX, renderY)) {
			player_hurt_sound.currentTime = 0;
			playAudioSafely(player_hurt_sound);
			player.takeHealth();
			updateHealth();
			emitHealthUpdate();

			if (!isBossTarget) {
				ennemies.splice(i, 1);

				if (isMultiplayerMode) {
					sendMultiEnemyKilled(i);
				} else {
					socket.emit("enemyKilled", i);
				}
			}

			if (!player.verifyHealth()) {
				if (isMultiplayerMode) {
					sendMultiPlayerDied();
				} else if (isCoopMode && currentRoomId) {
					socket.emit("playerDied");
					menuSelection("over");
					pauseAudio(ennemy_death_sound);
					pauseAudio(ennemy_hit_sound);
					pauseAudio(player_hurt_sound);
					pauseAudio(bullet_shot_sound);
					pauseAudio(audio);
					resetRenderedGameState();
					return;
				} else {
					menuSelection("over");
					pauseAudio(ennemy_death_sound);
					pauseAudio(ennemy_hit_sound);
					pauseAudio(player_hurt_sound);
					pauseAudio(bullet_shot_sound);
					pauseAudio(audio);
					resetRenderedGameState();
					return;
				}
			}
		}

		if (renderY == 0) {
			ennemi.kill();
		}

		const ennemiImage = ennemiImages[ennemi.imageId] ?? ennemiImages[0];
		context.drawImage(ennemiImage, renderX, renderY, ennemiWidth, ennemiHeight);
	}
}

const canvasResizeObserver = new ResizeObserver(() => resampleCanvas());
canvasResizeObserver.observe(canvas);

function resampleCanvas() {
	if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
}

function pauseAudio(audio: HTMLAudioElement) {
	audio.pause();
}

function playAudioSafely(audio: HTMLAudioElement) {
	const audioPlaying = audio.play();
	if (audioPlaying !== undefined) {
		void audioPlaying.catch(() => undefined);
	}
}