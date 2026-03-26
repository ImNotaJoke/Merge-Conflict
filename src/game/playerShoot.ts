export const canvas = document.querySelector<HTMLCanvasElement>('.game-canva')!,
	context = canvas.getContext('2d')!;

import { player, PLAYER_RENDER_HEIGHT, PLAYER_RENDER_WIDTH } from "./gameRendering.ts";
import { socket } from "../socket.ts";
import { isCoopMode } from "../gameState.ts";

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
export const enemyBullets: { bx: number, by: number }[] = [];

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

function updateBulletArray(bulletsArray: { bx: number, by: number }[], speed: number, direction: 1 | -1) {
    for (let i = 0; i < bulletsArray.length; i++) {
        bulletsArray[i].bx += speed * direction;
        
        // On supprime la balle si elle sort de l'écran pour les players ( à droite ) et pour les ennemis ( à gauche )
        if (bulletsArray[i].bx > canvas.width + 100 || bulletsArray[i].bx < -100) {
            bulletsArray.splice(i, 1);
            i--;
        }
    }
}

export function updateBullets() {
    updateBulletArray(activeBullets, player.shootSpeed, 1);
    updateBulletArray(secondPlayerBullets, player.shootSpeed, 1);
    updateBulletArray(enemyBullets, 7, -1); 
}
export function resetBullets() {
    activeBullets.length = 0;
    secondPlayerBullets.length = 0;
    enemyBullets.length = 0;
}

setTimeout(() => {
    setInterval(bulletSpawn, 1000 / player.shootSpeed);
}, 100);