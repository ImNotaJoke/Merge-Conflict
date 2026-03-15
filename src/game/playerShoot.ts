export const canvas = document.querySelector<HTMLCanvasElement>('.game-canva')!,
	context = canvas.getContext('2d')!;

import { player, PLAYER_RENDER_HEIGHT, PLAYER_RENDER_WIDTH } from "./gameRendering";

export let bullet = new Image();
bullet.src = "../../assets/bullet.png";

export let xb: number = 0,
 yb: number = 0;

export const activeBullets: { bx: number, by: number }[] = [];

function bulletSpawn() {
    activeBullets.push({ bx: player.posX + (PLAYER_RENDER_WIDTH / 2), by: player.posY + (PLAYER_RENDER_HEIGHT / 2) });
}

export function updateBullets() {
    for (let i = 0; i < activeBullets.length; i++) {
        activeBullets[i].bx += player.shootSpeed;
        
        // On supprime la balle si elle sort de l'écran
        if (activeBullets[i].bx > canvas.width + 100) {
            activeBullets.splice(i, 1);
            i--;
        }
    }
}

setTimeout(() => {
    setInterval(bulletSpawn, 1000 / player.shootSpeed);
}, 100);