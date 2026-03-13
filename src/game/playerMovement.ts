export const canvas = document.querySelector<HTMLCanvasElement>('.game-canva')!,
	context = canvas.getContext('2d')!;


// Variables de déplacement
export let x: number = 0,
 vx: number = 0,
 y: number = 0,
 vy: number = 0;

import { player } from "./gameRendering";
import { menuSelection } from "../main";

// Gestion du mouvement du personnage
function move() {
	if (player.posX >= canvas.width - player.models[0].width && vx > 0) player.posX -= 2 * vx;
	else if (player.posX <= 0 && vx < 0) player.posX -= 2 * vx;

	if (player.posY >= canvas.height - player.models[0].height && vy > 0) player.posY -= 2 * vy;
	else if (player.posY <= 0 && vy < 0) player.posY -= 2 * vy;
	player.posX += vx;
	player.posY += vy;
}
setInterval(move, 1000 / 60);

document.addEventListener('keydown', event => {
	switch (event.key) {
        case 'Z':
		case 'z' :
		case 'ArrowUp':
			vy = -3;
			break;
        case 'S':
		case 's':
		case 'ArrowDown':
			vy = 3;
			break;
        case 'Q':
		case 'q':
		case 'ArrowLeft':
			vx = -3;
			break;
        case 'D':
		case 'd':
		case 'ArrowRight':
			vx = 3;
			break;
		case 'L':
		case 'l':
			menuSelection('over');
			break;
	}
});

document.addEventListener('keyup', event => {
	switch (event.key) {
        case 'Z':
		case 'z' :
		case 'ArrowUp':
			vy = 0;
			break;
        case 'S':
		case 's':
		case 'ArrowDown':
			vy = 0;
			break;
        case 'Q':
		case 'q':
		case 'ArrowLeft':
			vx = 0;
			break;
        case 'D':
		case 'd':
		case 'ArrowRight':
			vx = 0;
	}
});

