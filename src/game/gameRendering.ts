import { Player } from "../../common/types.ts";
import { canvas, context, x, y } from "./playerMovement.ts";

// Image du personnage principal
export const player:Player = new Player();
export const image = new Image();
image.src = '../../assets/IsabIcon.png';
player.models.push(image);
player.models[0].addEventListener('load', event => {
	requestAnimationFrame(render);
});

// Affichage de tous les éléments
function render() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.drawImage(image, x, y);
	requestAnimationFrame(render);
}

const canvasResizeObserver = new ResizeObserver(() => resampleCanvas());
canvasResizeObserver.observe(canvas);

function resampleCanvas() {
	if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;

	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
}