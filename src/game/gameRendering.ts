import { Ennemi, Player } from "../../common/types.ts";
import { canvas, context, x, y } from "./playerMovement.ts";
import { bullet, activeBullets, updateBullets } from "./playerShoot.ts";
import { socket } from "../socket";

// Image du personnage principal
export const PLAYER_RENDER_WIDTH = 56;
export const PLAYER_RENDER_HEIGHT = 82;
const ENNEMI_RENDER_WIDTH = 64;
const ENNEMI_RENDER_HEIGHT = 64;
const SERVER_ARENA_WIDTH = 1980;
const SERVER_ARENA_HEIGHT = 720;

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


// Affichage de tous les éléments
function render() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	player.posX = x;
	player.posY = y;
	drawEnnemies();
	context.drawImage(player.models[0], player.posX, player.posY, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
	updateBullets();
	activeBullets.forEach(balle => {
        context.drawImage(bullet, balle.bx, balle.by, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
    });
	requestAnimationFrame(render);
}

function bulletsAreColliding(posX:number, posY:number) {
	for (let i = activeBullets.length - 1; i >= 0; i--) {
        const balle = activeBullets[i];
        const diffX = Math.abs(balle.bx - posX);
        const diffY = Math.abs(balle.by - posY);
		if(diffX < ENNEMI_RENDER_WIDTH && diffY < ENNEMI_RENDER_HEIGHT) {
            activeBullets.splice(i, 1);
            return true;
        }
    }
    return false;
		
    };


function drawEnnemies() {
	const maxRenderX = Math.max(canvas.width - ENNEMI_RENDER_WIDTH, 0);
	const maxRenderY = Math.max(canvas.height - ENNEMI_RENDER_HEIGHT, 0);

	for (let i = ennemies.length - 1; i >= 0; i--) {
        const ennemi = ennemies[i];
        const renderX = Math.min((ennemi.posX / SERVER_ARENA_WIDTH) * maxRenderX, maxRenderX);
        const renderY = Math.min((ennemi.posY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);

        if (bulletsAreColliding(renderX, renderY)) {
			socket.emit("enemyHurt", i);
            player.score+=100;
            console.log("Un ennemi a été touché ! Score :", player.score);
            continue; 
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