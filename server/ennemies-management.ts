import { Ennemi } from "../common/types.ts";
import { io } from "./index.ts";


const rightWall:number = 1980;
const ennemies:Ennemi[] = [];
let playing:boolean = false;

function autoSpawn() {
    if(playing) {
        const newEnnemi = new Ennemi(rightWall, Math.random()*720);
        ennemies.push(newEnnemi);
        io.emit("ennemiEvent", ennemies);
        console.log(`Un ennemi est apparu en (${newEnnemi.posX}, ${newEnnemi.posY})`);
        console.log(`ennemies : ${ennemies}`);
    }
}
setInterval(autoSpawn, 30000);

function autoMove() {
    if(playing) {
        ennemies.forEach((ennemi) => {
            if(ennemi.posX > rightWall/2) {
                ennemi.move();
            }
        });
        io.emit("ennemiEvent", ennemies);
    }
}
setInterval(autoMove, 100);

export function startPlaying() {
    playing = true;
    console.log("Début du jeu");
}
export function stopPlaying() {
    playing = false;
    ennemies.length = 0;
    console.log("Fin du jeu");
}