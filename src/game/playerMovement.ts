export const canvas = document.querySelector<HTMLCanvasElement>('.game-canva')!,
	context = canvas.getContext('2d')!;


// Variables de déplacement
export let x: number = 0,
 vx: number = 0,
 y: number = 0,
 vy: number = 0;

import { menuSelection } from "../main";
import { PLAYER_RENDER_HEIGHT, PLAYER_RENDER_WIDTH} from "./gameRendering";

export function resetPlayerPosition() {
	vx = 0;
	vy = 0;
	x = 0;
	y = 0;
}

// Gestion du mouvement du personnage
function move() {
	if (x >= canvas.width - PLAYER_RENDER_WIDTH && vx > 0) x -= 2 * vx;
	else if (x <= 0 && vx < 0) x -= 2 * vx;

	if (y >= canvas.height - PLAYER_RENDER_HEIGHT && vy > 0) y -= 2 * vy;
	else if (y <= 0 && vy < 0) y -= 2 * vy;
	x += vx;
	y += vy;
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

