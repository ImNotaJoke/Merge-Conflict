import { Ennemi,Bonus, Player, SecondPlayer, type SecondPlayerData } from "../../common/types.ts";
import { canvas, context, x, y } from "./playerMovement.ts";
import {
	activeBullets,
	BULLET_RENDER_HEIGHT,
	BULLET_RENDER_WIDTH,
	bullet,
	updateBullets,
	secondPlayerBullets,
	resetBullets,
} from "./playerShoot.ts";
import { socket } from "../socket.ts";
import { menuSelection, isCoopMode, currentRoomId, bonusDisplayUpdate } from "../main.ts";
import { updateHealth } from "./runManagement.ts";

export const PLAYER_RENDER_WIDTH = 56;
export const PLAYER_RENDER_HEIGHT = 82;
const ENNEMI_RENDER_WIDTH = 64;
const ENNEMI_RENDER_HEIGHT = 64;
const SERVER_ARENA_WIDTH = 1980;
const SERVER_ARENA_HEIGHT = 720;
const BONUS_ITEM_RENDER_WIDTH = 32;
const BONUS_ITEM_RENDER_HEIGHT = 32;

const ennemy_hit_sound = new Audio('../../assets/sounds/bullet_hit.wav');
const ennemy_death_sound = new Audio('../../assets/sounds/monster_death.wav');
const player_hurt_sound = new Audio('../../assets/sounds/player_hurt.wav');
export const bullet_shot_sound = new Audio('../../assets/sounds/bullet_shot.wav');
const bonus_pickup_sound = new Audio('../../assets/sounds/bonus_pickup.wav');
 
export const player: Player = new Player(0, 0);
export const image = new Image();
export const bonusImage = new Image();
const ennemiImages = [new Image(), new Image()];
let ennemies: Ennemi[] = [];
let activeBonuses: Bonus[] = [];
let lastEmittedHealth = 3;
let attackTimeout: NodeJS.Timeout | null = null;
let speedTimeout: NodeJS.Timeout | null = null;
let invincibilityTimeout: NodeJS.Timeout | null = null;

export let secondPlayer: SecondPlayer | null = null;
const secondPlayerImage = new Image();
secondPlayerImage.src = '/assets/character/isabelle/UP/mtt1.png';
bonusImage.src = '../../assets/power_up.png';


image.src = '../../assets/character/isabelle/RIGHT/mtr1.png';
ennemiImages[0].src = '../../assets/character/ennemi/mob1/mob1.png';
ennemiImages[1].src = '../../assets/character/ennemi/mob1/mob12.png';
player.models.push(image);
player.models[0].addEventListener('load', () => {
	requestAnimationFrame(render);
});

socket.on("ennemiEvent", (updatedEnnemies: Ennemi[]) => {
	ennemies = updatedEnnemies;
});

socket.on("secondPlayerUpdate", (data: SecondPlayerData) => {
	if (!isCoopMode) return;
	if (data.socketId === socket.id) return;

	if (!secondPlayer) {
		secondPlayer = new SecondPlayer(data.posX, data.posY, data.socketId);
		secondPlayer.setModel(secondPlayerImage);
	} else {
		secondPlayer.updatePosition(data.posX, data.posY);
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
	if (isCoopMode && currentRoomId && player.health !== lastEmittedHealth) {
		lastEmittedHealth = player.health;
		socket.emit("healthUpdate", { health: player.health });
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
	context.clearRect(0, 0, canvas.width, canvas.height);
	player.posX = x;
	player.posY = y;
	drawEnnemies();
	drawBonuses();
	drawSecondPlayer();
	context.drawImage(player.models[0], player.posX, player.posY, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
	updateBullets();

	activeBullets.forEach(balle => {
		context.drawImage(bullet, balle.bx, balle.by, BULLET_RENDER_WIDTH, BULLET_RENDER_HEIGHT);
	});

	secondPlayerBullets.forEach(balle => {
		context.globalAlpha = 0.7;
		context.drawImage(bullet, balle.bx, balle.by, BULLET_RENDER_WIDTH, BULLET_RENDER_HEIGHT);
		context.globalAlpha = 1.0;
	});

	requestAnimationFrame(render);
}

function drawSecondPlayer() {
	if (!secondPlayer || !secondPlayer.model || !secondPlayer.model.complete) return;

	const maxRenderX = Math.max(canvas.width - PLAYER_RENDER_WIDTH, 0);
	const maxRenderY = Math.max(canvas.height - PLAYER_RENDER_HEIGHT, 0);
	const renderX = Math.min((secondPlayer.posX / SERVER_ARENA_WIDTH) * maxRenderX, maxRenderX);
	const renderY = Math.min((secondPlayer.posY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);

	context.globalAlpha = 0.8;
	context.drawImage(secondPlayer.model, renderX, renderY, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
	context.globalAlpha = 1.0;
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
					bonus_pickup_sound.play();
					player.projectileDamage = 15;
					if (attackTimeout) clearTimeout(attackTimeout);
            		console.log("Bonus ramassé ! Dégâts actuels :", player.projectileDamage);
					attackTimeout = setTimeout(() => { player.projectileDamage = 1; }, 10000);
					break;
				case "speed":
					bonusDisplayUpdate(type);
					bonus_pickup_sound.currentTime = 0;
					bonus_pickup_sound.play();
					player.shootSpeed = 25;
					if (speedTimeout) clearTimeout(speedTimeout);
            		console.log("Bonus ramassé ! Vitesse actuelle :", player.shootSpeed);
					speedTimeout = setTimeout(() => { player.shootSpeed = 10; }, 10000);
					break;
				case "invincibility":
					bonusDisplayUpdate(type);
					bonus_pickup_sound.currentTime = 0;
					bonus_pickup_sound.play();
					player.invincibility = true;
					if (invincibilityTimeout) clearTimeout(invincibilityTimeout);
					console.log("Bonus ramassé ! Invincibilité activée pendant 5 secondes: ", player.invincibility);
                	invincibilityTimeout = setTimeout(() => { player.invincibility = false; }, 5000);
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


	for (let i = ennemies.length - 1; i >= 0; i--) {
		const ennemi = ennemies[i];
		const renderX = Math.min((ennemi.posX / SERVER_ARENA_WIDTH) * maxRenderX, maxRenderX + ENNEMI_RENDER_WIDTH);
		const renderY = Math.min((ennemi.posY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);

		if (bulletsAreColliding(renderX, renderY)) {
			socket.emit("enemyHurt", i, player.projectileDamage);
			ennemi.health -= player.projectileDamage;
			ennemy_hit_sound.currentTime = 0;
			ennemy_hit_sound.play();
			if (ennemi.health <= 0) {
				socket.emit("enemyKilled");
				ennemy_death_sound.currentTime = 0;
				ennemy_death_sound.play();
			}
		}

		if (areColliding(renderX, renderY)) {
			player_hurt_sound.currentTime = 0;
			player_hurt_sound.play();
			player.takeHealth();
			updateHealth();
			emitHealthUpdate();
			ennemies.splice(i, 1);
			socket.emit("enemyKilled", i);
			if (!player.verifyHealth()) {
				if (isCoopMode && currentRoomId) {
					socket.emit("playerDied");
				}
				menuSelection("over");
				ennemy_hit_sound.pause();
				ennemy_death_sound.pause();
				player_hurt_sound.pause();
				bullet_shot_sound.pause();
				resetRenderedGameState();
			}
		}

		if (renderY == 0) {
			ennemi.kill();
		}

		context.drawImage(ennemiImages[ennemi.imageId], renderX, renderY, ENNEMI_RENDER_WIDTH, ENNEMI_RENDER_HEIGHT);
	}
}

const canvasResizeObserver = new ResizeObserver(() => resampleCanvas());
canvasResizeObserver.observe(canvas);

function resampleCanvas() {
	if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
}