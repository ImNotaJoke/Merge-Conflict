export const canvas = document.querySelector<HTMLCanvasElement>('.game-canva')!,
	context = canvas.getContext('2d')!;


// Variables de déplacement
export let x: number = 0,
 vx: number = 0,
 y: number = 0,
 vy: number = 0;

let mouseTargetX: number | null = null,
 mouseTargetY: number | null = null;

const MAX_SPEED = 10;
const MAX_MOUSE_SPEED = 3;
const movingKeys = {
	"up": false,
	"down": false,
	"left": false,
	"right": false
}
const ACCELERATION = 0.5;
const FRICTION = 0.85;

import { getInputMode } from "../Parameter.ts";
import { PLAYER_RENDER_HEIGHT, PLAYER_RENDER_WIDTH} from "./gameRendering.ts";
import { socket } from "../socket.ts";
import { isCoopMode } from "../main.ts";

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

	const step = Math.min(MAX_MOUSE_SPEED, distance);
	x += (diffX / distance) * step;
	y += (diffY / distance) * step;
	clampPosition();
}

document.addEventListener('keydown', event => {
	if (getInputMode() !== "keyboard") {
		return;
	}

	switch (event.key) {
        case 'Z':
		case 'z' :
		case 'ArrowUp':
			movingKeys["up"] = true;
			break;
        case 'S':
		case 's':
		case 'ArrowDown':
			movingKeys["down"] = true;
			break;
        case 'Q':
		case 'q':
		case 'ArrowLeft':
			movingKeys["left"] = true;
			break;
        case 'D':
		case 'd':
		case 'ArrowRight':
			movingKeys["right"] = true;
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
			movingKeys["up"] = false;
			break;
        case 'S':
		case 's':
		case 'ArrowDown':
			movingKeys["down"] = false;
			break;
        case 'Q':
		case 'q':
		case 'ArrowLeft':
			movingKeys["left"] = false;
			break;
        case 'D':
		case 'd':
		case 'ArrowRight':
			movingKeys["right"] = false;
			break;
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

function move() {
	if (getInputMode() === "mouse") {
		vx = 0;
		vy = 0;
		moveWithMouse();
		emitPlayerPosition();
		return;
	}

    if (movingKeys.up)    vy -= ACCELERATION;
    if (movingKeys.down)  vy += ACCELERATION;
    if (movingKeys.left)  vx -= ACCELERATION;
    if (movingKeys.right) vx += ACCELERATION;

    vx *= FRICTION;
    vy *= FRICTION;

    if (Math.abs(vx) < 0.01) vx = 0;
    if (Math.abs(vy) < 0.01) vy = 0;

    vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, vx));
    vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, vy));

	x += vx;
	y += vy;

	if (x >= canvas.width - PLAYER_RENDER_WIDTH && vx > 0) x -= 2 * vx;
	else if (x <= 0 && vx < 0) x -= 2 * vx;

	if (y >= canvas.height - PLAYER_RENDER_HEIGHT && vy > 0) y -= 2 * vy;
	else if (y <= 0 && vy < 0) y -= 2 * vy;

	clampPosition();
	emitPlayerPosition();
}
setInterval(move, 1000 / 60);