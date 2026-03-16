import { Player } from "../../common/types.ts";
import { canvas, context, x, y } from "./playerMovement.ts";
import { bullet, activeBullets, updateBullets } from "./playerShoot.ts";

// Image du personnage principal
export const player:Player = new Player(0, 0);
export const image = new Image();
image.src = '../../assets/character/isabelle/RIGHT/mtr1.png';
player.models.push(image);
player.models[0].addEventListener('load', () => {
	requestAnimationFrame(render);
});

bullet.addEventListener('load', () => {
	requestAnimationFrame(render);
});


// Affichage de tous les éléments
function render() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.drawImage(player.models[0], player.posX, player.posY);
	updateBullets();
	activeBullets.forEach(balle => {
        context.drawImage(bullet, balle.bx, balle.by);
    });
	requestAnimationFrame(render);
}

const canvasResizeObserver = new ResizeObserver(() => resampleCanvas());
canvasResizeObserver.observe(canvas);

function resampleCanvas() {
	if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;

	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
}