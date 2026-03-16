export const canvas = document.querySelector<HTMLCanvasElement>('.game-canva')!,
	context = canvas.getContext('2d')!;


// Variables de déplacement
export let x: number = 0,
 vx: number = 0,
 y: number = 0,
 vy: number = 0;

let mouseTargetX: number | null = null,
 mouseTargetY: number | null = null;

const KEYBOARD_MOVE_SPEED = 3;

import { getInputMode } from "../Parameter";
import { PLAYER_RENDER_HEIGHT, PLAYER_RENDER_WIDTH} from "./gameRendering";
import { socket } from "../socket";
import { isCoopMode } from "../main";

// Server arena dimensions for coordinate conversion
const SERVER_ARENA_WIDTH = 1980;
const SERVER_ARENA_HEIGHT = 720;

// Convert local canvas position to server coordinates
function toServerCoords(localX: number, localY: number) {
	const maxLocalX = Math.max(canvas.width - PLAYER_RENDER_WIDTH, 1);
	const maxLocalY = Math.max(canvas.height - PLAYER_RENDER_HEIGHT, 1);
	return {
		posX: (localX / maxLocalX) * SERVER_ARENA_WIDTH,
		posY: (localY / maxLocalY) * SERVER_ARENA_HEIGHT
	};
}

// Emit player position for coop mode
function emitPlayerPosition() {
	if (isCoopMode) {
		const serverCoords = toServerCoords(x, y);
		socket.emit("playerMove", serverCoords);
	}
}

// Listen for position update requests (when a new player joins coop)
socket.on("requestPositionUpdate", () => {
	if (isCoopMode) {
		const serverCoords = toServerCoords(x, y);
		socket.emit("playerMove", serverCoords);
	}
});

export function resetPlayerPosition() {
	vx = 0;
	vy = 0;
	x = 0;
	y = 0;
	mouseTargetX = null;
	mouseTargetY = null;
}

function clampPosition() {
	x = Math.max(0, Math.min(x, canvas.width - PLAYER_RENDER_WIDTH));
	y = Math.max(0, Math.min(y, canvas.height - PLAYER_RENDER_HEIGHT));
}

function moveWithMouse() {
	if (mouseTargetX === null || mouseTargetY === null) {
		return;
	}

	const diffX = mouseTargetX - x;
	const diffY = mouseTargetY - y;
	const distance = Math.hypot(diffX, diffY);

	if (distance < 0.1) {
		return;
	}

	const step = Math.min(KEYBOARD_MOVE_SPEED, distance);
	x += (diffX / distance) * step;
	y += (diffY / distance) * step;
	clampPosition();
}

// Gestion du mouvement du personnage
function move() {
	if (getInputMode() === "mouse") {
		vx = 0;
		vy = 0;
		moveWithMouse();
		emitPlayerPosition();
		return;
	}

	if (x >= canvas.width - PLAYER_RENDER_WIDTH && vx > 0) x -= 2 * vx;
	else if (x <= 0 && vx < 0) x -= 2 * vx;

	if (y >= canvas.height - PLAYER_RENDER_HEIGHT && vy > 0) y -= 2 * vy;
	else if (y <= 0 && vy < 0) y -= 2 * vy;
	x += vx;
	y += vy;
	clampPosition();
	emitPlayerPosition();
}
setInterval(move, 1000 / 60);

document.addEventListener('keydown', event => {
	if (getInputMode() !== "keyboard") {
		return;
	}

	switch (event.key) {
        case 'Z':
		case 'z' :
		case 'ArrowUp':
			vy = -KEYBOARD_MOVE_SPEED;
			break;
        case 'S':
		case 's':
		case 'ArrowDown':
			vy = KEYBOARD_MOVE_SPEED;
			break;
        case 'Q':
		case 'q':
		case 'ArrowLeft':
			vx = -KEYBOARD_MOVE_SPEED;
			break;
        case 'D':
		case 'd':
		case 'ArrowRight':
			vx = KEYBOARD_MOVE_SPEED;
			break;
	}
});

document.addEventListener('keyup', event => {
	if (getInputMode() !== "keyboard") {
		return;
	}

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

canvas.addEventListener("mousemove", (event) => {
	if (getInputMode() !== "mouse") {
		return;
	}

	const rect = canvas.getBoundingClientRect();
	mouseTargetX = event.clientX - rect.left - PLAYER_RENDER_WIDTH / 2;
	mouseTargetY = event.clientY - rect.top - PLAYER_RENDER_HEIGHT / 2;
	clampPosition();
});

window.addEventListener("gameSettingsApplied", () => {
	vx = 0;
	vy = 0;
});

