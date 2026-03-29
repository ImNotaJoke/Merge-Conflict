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

const skinSelect: HTMLSelectElement = document.querySelector('.skin-select')!;

export const PLAYER_RENDER_WIDTH = 56;
export const PLAYER_RENDER_HEIGHT = 82;
const ENNEMI_RENDER_WIDTH = 64;
const ENNEMI_RENDER_HEIGHT = 64;
const SERVER_ARENA_WIDTH = 1980;
const SERVER_ARENA_HEIGHT = 720;
const BONUS_ITEM_RENDER_WIDTH = 32;
const BONUS_ITEM_RENDER_HEIGHT = 32;

export const ennemy_hit_sound = new Audio('../../assets/sounds/bullet_hit.wav');
export const ennemy_death_sound = new Audio('../../assets/sounds/monster_death.wav');
export const player_hurt_sound = new Audio('../../assets/sounds/player_hurt.wav');
export const bullet_shot_sound = new Audio('../../assets/sounds/bullet_shot.wav');
export const bonus_pickup_sound = new Audio('../../assets/sounds/bonus_pickup.wav');
 
export const player: Player = new Player(0, 0);
const image = new Map<string, HTMLImageElement>();
export const bonusImage = new Image();
const ennemiImages = [new Image(), new Image(), new	Image()];
let ennemies: Ennemi[] = [];
let activeBonuses: Bonus[] = [];
let lastEmittedHealth = 3;

export let secondPlayer: SecondPlayer | null = null;
const secondPlayerImage = new Image();

const multiPlayerImages: HTMLImageElement[] = [];
const multiPlayerSkins = [
	'/assets/character/isabelle/RIGHT/mtr1.png',
	'/assets/character/doomGuy/DoomGuy.png',
	'/assets/character/isabelle/UP/mtt1.png',
	'/assets/character/doomGuy/DoomGuy.png',
];

for (let i = 0; i < multiPlayerSkins.length; i++) {
	const img = new Image();
	img.src = multiPlayerSkins[i];
	multiPlayerImages.push(img);
}

secondPlayerImage.src = '/assets/character/isabelle/UP/mtt1.png';
bonusImage.src = '../../assets/power_up.png';

image.set("isa-lega", new Image());
image.set("doomguy", new Image());
image.set("doomguy-purple", new Image());
image.set("doomguy-orange", new Image());
image.set("isa-red", new Image());
image.set("isa-blue", new Image());
image.set("isa-dark", new Image());

image.get("isa-lega")!.src = '/assets/character/isabelle/RIGHT/mtr1.png';
image.get("isa-red")!.src = '/assets/character/isabelle/rouge.png';
image.get("isa-blue")!.src = '/assets/character/isabelle/bleue.png';
image.get("isa-dark")!.src = '/assets/character/isabelle/dark.png';
image.get('doomguy')!.src = '/assets/character/doomGuy/DoomGuy.png';
image.get('doomguy-purple')!.src = '/assets/character/doomGuy/purple.png';
image.get('doomguy-orange')!.src = '/assets/character/doomGuy/orange.png';

ennemiImages[0].src = '../../assets/character/ennemi/mob1/mob1.png';
ennemiImages[1].src = '../../assets/character/ennemi/mob1/mob12.png';
ennemiImages[2].src = '../../assets/character/ennemi/mob1/mob_tir.png'
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
    activeBonuses.push(new Bonus(data.id, data.posX, data.posY, data.type));
});

socket.on("applyBonus", (data: {id: string, type: string}) => {
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
		by: renderY + (ENNEMI_RENDER_HEIGHT / 2) - (BULLET_RENDER_HEIGHT / 2)
	});
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
	checkEnemyBulletsCollision();
	requestAnimationFrame(render);
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

function bulletsAreColliding(posX: number, posY: number) {
	for (let i = activeBullets.length - 1; i >= 0; i--) {
		const balle = activeBullets[i];
		const bulletCenterX = balle.bx + BULLET_RENDER_WIDTH / 2;
		const bulletCenterY = balle.by + BULLET_RENDER_HEIGHT / 2;
		const ennemiCenterX = posX + ENNEMI_RENDER_WIDTH / 2;
		const ennemiCenterY = posY + ENNEMI_RENDER_HEIGHT / 2;
		const diffX = Math.abs(bulletCenterX - ennemiCenterX);
		const diffY = Math.abs(bulletCenterY - ennemiCenterY);

		if (diffX < (BULLET_RENDER_WIDTH + ENNEMI_RENDER_WIDTH) / 2 &&
			diffY < (BULLET_RENDER_HEIGHT + ENNEMI_RENDER_HEIGHT) / 2) {
			activeBullets.splice(i, 1);
			return true;
		}
	}

	for (let i = secondPlayerBullets.length - 1; i >= 0; i--) {
		const balle = secondPlayerBullets[i];
		const bulletCenterX = balle.bx + BULLET_RENDER_WIDTH / 2;
		const bulletCenterY = balle.by + BULLET_RENDER_HEIGHT / 2;
		const ennemiCenterX = posX + ENNEMI_RENDER_WIDTH / 2;
		const ennemiCenterY = posY + ENNEMI_RENDER_HEIGHT / 2;
		const diffX = Math.abs(bulletCenterX - ennemiCenterX);
		const diffY = Math.abs(bulletCenterY - ennemiCenterY);

		if (diffX < (BULLET_RENDER_WIDTH + ENNEMI_RENDER_WIDTH) / 2 &&
			diffY < (BULLET_RENDER_HEIGHT + ENNEMI_RENDER_HEIGHT) / 2) {
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
			socket.emit("collectBonus", { id: bonus.id, type: bonus.type });
            activeBonuses.splice(i, 1);	
        } 
        else if (bonus.posY > SERVER_ARENA_HEIGHT) {
            activeBonuses.splice(i, 1);
        }
    }
}

function drawEnnemies() {
	const maxRenderX = Math.max(canvas.width - ENNEMI_RENDER_WIDTH, 0);
	const maxRenderY = Math.max(canvas.height - ENNEMI_RENDER_HEIGHT, 0);

	if (isSpectatorMode) {
		for (let i = ennemies.length - 1; i >= 0; i--) {
			const ennemi = ennemies[i];
			if (!ennemi) continue;
			const renderX = Math.min((ennemi.posX / SERVER_ARENA_WIDTH) * maxRenderX, maxRenderX + ENNEMI_RENDER_WIDTH);
			const renderY = Math.min((ennemi.posY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);
			const ennemiImage = ennemiImages[ennemi.imageId] ?? ennemiImages[0];
			context.drawImage(ennemiImage, renderX, renderY, ENNEMI_RENDER_WIDTH, ENNEMI_RENDER_HEIGHT);
		}
		return;
	}

	for (let i = ennemies.length - 1; i >= 0; i--) {
		const ennemi = ennemies[i];
		if (!ennemi) continue;

		const renderX = Math.min((ennemi.posX / SERVER_ARENA_WIDTH) * maxRenderX, maxRenderX + ENNEMI_RENDER_WIDTH);
		const renderY = Math.min((ennemi.posY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);

		if (bulletsAreColliding(renderX, renderY)) {
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
			ennemies.splice(i, 1);

			if (isMultiplayerMode) {
				sendMultiEnemyKilled(i);
			} else {
				socket.emit("enemyKilled", i);
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
					resetRenderedGameState();
					return;
				} else {
					menuSelection("over");
					pauseAudio(ennemy_death_sound);
					pauseAudio(ennemy_hit_sound);
					pauseAudio(player_hurt_sound);
					pauseAudio(bullet_shot_sound);
					resetRenderedGameState();
					return;
				}
			}
		}

		if (renderY == 0) {
			ennemi.kill();
		}

		const ennemiImage = ennemiImages[ennemi.imageId] ?? ennemiImages[0];
		context.drawImage(ennemiImage, renderX, renderY, ENNEMI_RENDER_WIDTH, ENNEMI_RENDER_HEIGHT);
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