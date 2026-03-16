export const canvas = document.querySelector<HTMLCanvasElement>('.game-canva')!,
	context = canvas.getContext('2d')!;

import { player, PLAYER_RENDER_HEIGHT, PLAYER_RENDER_WIDTH, secondPlayer } from "./gameRendering";
import { socket } from "../socket";
import { isCoopMode } from "../main";

export let bullet = new Image();
bullet.src = "../../assets/bullet.png";

export const BULLET_RENDER_WIDTH = 12;
export const BULLET_RENDER_HEIGHT = 12;
const BULLET_VERTICAL_OFFSET = 6;
const SERVER_ARENA_WIDTH = 1980;
const SERVER_ARENA_HEIGHT = 720;

export let xb: number = 0,
 yb: number = 0;

export const activeBullets: { bx: number, by: number }[] = [];
export const secondPlayerBullets: { bx: number, by: number }[] = [];

function bulletSpawn() {
    activeBullets.push({
        bx: player.posX + PLAYER_RENDER_WIDTH - BULLET_RENDER_WIDTH / 2,
        by: player.posY + PLAYER_RENDER_HEIGHT / 2 - BULLET_RENDER_HEIGHT / 2 + BULLET_VERTICAL_OFFSET,
    });
    // Emit bullet spawn to server for second player (only in coop mode)
    if (isCoopMode) {
        // Convert to server coordinates
        const maxLocalX = Math.max(canvas.width - PLAYER_RENDER_WIDTH, 1);
        const maxLocalY = Math.max(canvas.height - PLAYER_RENDER_HEIGHT, 1);
        socket.emit("playerShoot", { 
            posX: (player.posX / maxLocalX) * SERVER_ARENA_WIDTH, 
            posY: (player.posY / maxLocalY) * SERVER_ARENA_HEIGHT 
        });
    }
}

// Receive second player shoot events
socket.on("secondPlayerShoot", (data: { posX: number; posY: number; socketId: string }) => {
    if (!isCoopMode) return; // Ignore in solo mode
    if (data.socketId === socket.id) return;
    
    const maxRenderX = Math.max(canvas.width - PLAYER_RENDER_WIDTH, 0);
    const maxRenderY = Math.max(canvas.height - PLAYER_RENDER_HEIGHT, 0);
    
    const renderX = Math.min((data.posX / SERVER_ARENA_WIDTH) * maxRenderX, maxRenderX);
    const renderY = Math.min((data.posY / SERVER_ARENA_HEIGHT) * maxRenderY, maxRenderY);
    
    secondPlayerBullets.push({
        bx: renderX + PLAYER_RENDER_WIDTH - BULLET_RENDER_WIDTH / 2,
        by: renderY + PLAYER_RENDER_HEIGHT / 2 - BULLET_RENDER_HEIGHT / 2 + BULLET_VERTICAL_OFFSET,
    });
});

export function updateBullets() {
    for (let i = 0; i < activeBullets.length; i++) {
        activeBullets[i].bx += player.shootSpeed;
        
        // On supprime la balle si elle sort de l'écran
        if (activeBullets[i].bx > canvas.width + 100) {
            activeBullets.splice(i, 1);
            i--;
        }
    }
    // Update second player bullets
    for (let i = 0; i < secondPlayerBullets.length; i++) {
        secondPlayerBullets[i].bx += player.shootSpeed;
        
        if (secondPlayerBullets[i].bx > canvas.width + 100) {
            secondPlayerBullets.splice(i, 1);
            i--;
        }
    }
}

export function resetBullets() {
    activeBullets.length = 0;
    secondPlayerBullets.length = 0;
}

setTimeout(() => {
    setInterval(bulletSpawn, 1000 / player.shootSpeed);
}, 100);