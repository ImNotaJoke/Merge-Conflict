import { Ennemi, Player } from "../../common/types.ts";
import { canvas, context, x, y } from "./playerMovement.ts";
import { bullet, activeBullets, updateBullets } from "./playerShoot.ts";
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
let ennemies: Pick<Ennemi, "posX" | "posY">[] = [];

image.src = '../../assets/character/isabelle/RIGHT/mtr1.png';
ennemiImage.src = '../../assets/character/ennemi/mob1/mob1.png';
player.models.push(image);
player.models[0].addEventListener('load', () => {
	requestAnimationFrame(render);
}); 

socket.on("ennemiEvent", (updatedEnnemies: Pick<Ennemi, "posX" | "posY">[]) => {
	ennemies = updatedEnnemies;
});

export function resetRenderedGameState() {
	ennemies = [];
	player.health = 3;
	player.score = 0;
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
	context.drawImage(player.models[0], player.posX, player.posY, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
	updateBullets();
	activeBullets.forEach(balle => {
        context.drawImage(bullet, balle.bx, balle.by, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
    });
	requestAnimationFrame(render);
}

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

	for (const ennemi of ennemies) {
		const renderX = Math.min(
			(ennemi.posX / SERVER_ARENA_WIDTH) * maxRenderX,
			maxRenderX,
		);
		const renderY = Math.min(
			(ennemi.posY / SERVER_ARENA_HEIGHT) * maxRenderY,
			maxRenderY,
		);

		if(areColliding(renderX, renderY)) {
			player.takeHealth();
			if(!player.verifyHealth()) {
				menuSelection("over");
			}
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