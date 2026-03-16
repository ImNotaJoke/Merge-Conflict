import { Ennemi, Player, SecondPlayer, type SecondPlayerData } from "../../common/types.ts";
import { canvas, context, x, y } from "./playerMovement.ts";
import {
	activeBullets,
	BULLET_RENDER_HEIGHT,
	BULLET_RENDER_WIDTH,
	bullet,
	updateBullets,
} from "./playerShoot.ts";
import { socket } from "../socket";
import { menuSelection } from "../main.ts";

// Image du personnage principal
export const PLAYER_RENDER_WIDTH = 56;
export const PLAYER_RENDER_HEIGHT = 82;
const ENNEMI_RENDER_WIDTH = 64;
const ENNEMI_RENDER_HEIGHT = 64;
const SERVER_ARENA_WIDTH = 1980;
const SERVER_ARENA_HEIGHT = 720;

const hearts = document.querySelectorAll(".game-stat-heart");

export const player:Player = new Player(0, 0);
export const image = new Image();
const ennemiImage = new Image();
let ennemies: Ennemi[] = [];

// Second player management
export let secondPlayer: SecondPlayer | null = null;
const secondPlayerImage = new Image();
secondPlayerImage.src = '../../assets/character/isabelle/RIGHT/mtr1.png';

image.src = '../../assets/character/isabelle/RIGHT/mtr1.png';
ennemiImage.src = '../../assets/character/ennemi/mob1/mob1.png';
player.models.push(image);
player.models[0].addEventListener('load', () => {
	requestAnimationFrame(render);
}); 

socket.on("ennemiEvent", (updatedEnnemies: Ennemi[]) => {
	ennemies = updatedEnnemies;
});

// Receive second player position updates
socket.on("secondPlayerUpdate", (data: SecondPlayerData) => {
	if (data.socketId === socket.id) return; // Ignore our own position
	
	if (!secondPlayer) {
		secondPlayer = new SecondPlayer(data.posX, data.posY, data.socketId);
		secondPlayer.setModel(secondPlayerImage);
	} else {
		secondPlayer.updatePosition(data.posX, data.posY);
	}
});

// Handle second player disconnect
socket.on("secondPlayerDisconnect", (socketId: string) => {
	if (secondPlayer && secondPlayer.socketId === socketId) {
		secondPlayer = null;
	}
});

export function resetRenderedGameState() {
	ennemies = [];
	player.health = 3;
	player.killedEnnemies = 0;
	secondPlayer = null;
}

bullet.addEventListener('load', () => {
	requestAnimationFrame(render);
});

function areColliding(posX:number, posY:number) {
	const diffX = Math.abs(x - posX);
	const diffY = Math.abs(y - posY);
	return diffX < (PLAYER_RENDER_WIDTH / 2 + ENNEMI_RENDER_WIDTH / 2) && diffY < (PLAYER_RENDER_HEIGHT / 2 + ENNEMI_RENDER_HEIGHT / 2);
}

// Affichage de tous les éléments
function render() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	player.posX = x;
	player.posY = y;
	drawEnnemies();
	drawHearts();
	drawSecondPlayer();
	context.drawImage(player.models[0], player.posX, player.posY, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
	updateBullets();
	activeBullets.forEach(balle => {
		context.drawImage(bullet, balle.bx, balle.by, BULLET_RENDER_WIDTH, BULLET_RENDER_HEIGHT);
    });
	requestAnimationFrame(render);
}

// Draw second player (no collision with first player)
function drawSecondPlayer() {
	if (!secondPlayer || !secondPlayer.model) return;
	
	const maxRenderX = Math.max(canvas.width - PLAYER_RENDER_WIDTH, 0);
	const maxRenderY = Math.max(canvas.height - PLAYER_RENDER_HEIGHT, 0);
	
	const renderX = Math.min((secondPlayer.posX / SERVER_ARENA_WIDTH) * maxRenderX, maxRenderX);
	const renderY = Math.min((secondPlayer.posY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);
	
	context.globalAlpha = 0.8; // Slight transparency to distinguish from P1
	context.drawImage(secondPlayer.model, renderX, renderY, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
	context.globalAlpha = 1.0;
}

function bulletsAreColliding(posX:number, posY:number) {
	for (let i = activeBullets.length - 1; i >= 0; i--) {
        const balle = activeBullets[i];
        const bulletCenterX = balle.bx + BULLET_RENDER_WIDTH / 2;
        const bulletCenterY = balle.by + BULLET_RENDER_HEIGHT / 2;
        const ennemiCenterX = posX + ENNEMI_RENDER_WIDTH / 2;
        const ennemiCenterY = posY + ENNEMI_RENDER_HEIGHT / 2;
        const diffX = Math.abs(bulletCenterX - ennemiCenterX);
        const diffY = Math.abs(bulletCenterY - ennemiCenterY);
		if(
			diffX < (BULLET_RENDER_WIDTH + ENNEMI_RENDER_WIDTH) / 2
			&& diffY < (BULLET_RENDER_HEIGHT + ENNEMI_RENDER_HEIGHT) / 2
		) {
            activeBullets.splice(i, 1);
            return true;
        }
    }
    return false;
		
};


function drawHearts() {
	for(let i = 0; i < hearts.length; i++) {
		if(i < player.health) {
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
			socket.emit("enemyHurt", i);
			if(ennemi.health <= 0) {
				player.ennemyKilled();
			}
        }

		if(areColliding(renderX, renderY)) {
			player.takeHealth();
			if(!player.verifyHealth()) {
				menuSelection("over");
			}
		}

		if(renderY == 0) {
			ennemi.kill();
		}

		context.drawImage(
			ennemiImage,
			renderX,
			renderY,
			ENNEMI_RENDER_WIDTH,
			ENNEMI_RENDER_HEIGHT,
		);
	}
}

const canvasResizeObserver = new ResizeObserver(() => resampleCanvas());
canvasResizeObserver.observe(canvas);

function resampleCanvas() {
	if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;

	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
}