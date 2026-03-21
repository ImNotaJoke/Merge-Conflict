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
import { menuSelection, isCoopMode, currentRoomId } from "../main.ts";

export const PLAYER_RENDER_WIDTH = 56;
export const PLAYER_RENDER_HEIGHT = 82;
const ENNEMI_RENDER_WIDTH = 64;
const ENNEMI_RENDER_HEIGHT = 64;
const SERVER_ARENA_WIDTH = 1980;
const SERVER_ARENA_HEIGHT = 720;
const BONUS_ITEM_RENDER_WIDTH = 32;
const BONUS_ITEM_RENDER_HEIGHT = 32;
const BONUS_ITEM_CHANCES = 0.15;


const hearts = document.querySelectorAll(".game-stat-heart:not(.ally-heart)");

const hitSound = new Audio('../../assets/sounds/bullet_hit.wav');
 
export const player: Player = new Player(0, 0);
export const image = new Image();
export const bonusImage = new Image();
const ennemiImages = [new Image(), new Image()];
let ennemies: Ennemi[] = [];
let activeBonuses: Bonus[] = [];
let lastEmittedHealth = 3;
const bonusTypes = ["attack", "speed", "invincibility"];

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
	drawHearts();
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


function drawBonuses() {
    for (let i = activeBonuses.length - 1; i >= 0; i--) {
        const bonus = activeBonuses[i];
        
        bonus.posY += 0.25; 

        context.drawImage(bonusImage, bonus.posX, bonus.posY, BONUS_ITEM_RENDER_WIDTH, BONUS_ITEM_RENDER_HEIGHT);

        if (bonus_is_colliding(bonus.posX, bonus.posY)) {
			switch (bonus.type) {
				case "attack":
					player.projectileDamage += 15;
            		console.log("Bonus ramassé ! Dégâts actuels :", player.projectileDamage);
					setTimeout(() => {
                	player.projectileDamage = 1;
            		}, 10000);
					break;
				case "speed":
					player.shootSpeed += 15;
            		console.log("Bonus ramassé ! Vitesse actuelle :", player.shootSpeed);
					setTimeout(() => {
                	player.shootSpeed = 10;
            		}, 10000);
					break;
				case "invincibility":
					player.invincibility = true;
					console.log("Bonus ramassé ! Invincibilité activée pendant 5 secondes: ", player.invincibility);
					setTimeout(() => {
                	player.invincibility = false;
            		}, 5000);
					break;	
			}
            activeBonuses.splice(i, 1);	
        } 
        else if (bonus.posY > canvas.height) {
            activeBonuses.splice(i, 1);
        }
    }
}


function drawHearts() {
	for (let i = 0; i < hearts.length; i++) {
		if (i < player.health) {
			hearts[i].setAttribute("src", "/assets/HeartIcon.png");
			hearts[i].setAttribute("alt", "coeur de vie plein");
		} else {
			hearts[i].setAttribute("src", "/assets/HeartIconEmpty.png");
			hearts[i].setAttribute("alt", "coeur de vie vide");
		}
	}
}

function drawEnnemies() {
	const maxRenderX = Math.max(canvas.width - ENNEMI_RENDER_WIDTH, 0);
	const maxRenderY = Math.max(canvas.height - ENNEMI_RENDER_HEIGHT, 0);

	for (let i = ennemies.length - 1; i >= 0; i--) {
		const ennemi = ennemies[i];
		const renderX = Math.min((ennemi.posX / SERVER_ARENA_WIDTH) * maxRenderX, maxRenderX);
		const renderY = Math.min((ennemi.posY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);

		if (bulletsAreColliding(renderX, renderY)) {
			socket.emit("enemyHurt", i, player.projectileDamage);
			ennemi.health -= player.projectileDamage;
			hitSound.currentTime = 0;
			hitSound.play();
			if (ennemi.health <= 0) {
				socket.emit("enemyKilled");
				if(Math.random() <= BONUS_ITEM_CHANCES) {
					console.log(`it worked !`);
					const randomBonusType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
					console.log(`Voici un bonus de type ${randomBonusType}`);
					activeBonuses.push(new Bonus(renderX, renderY, randomBonusType));
			}
			}
		}

		if (player.health > 0 && areColliding(renderX, renderY)) {
			player.takeHealth();
			emitHealthUpdate();
			if (!player.verifyHealth()) {
				if (isCoopMode && currentRoomId) {
					socket.emit("playerDied");
				}
				menuSelection("over");
				hitSound.pause();
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