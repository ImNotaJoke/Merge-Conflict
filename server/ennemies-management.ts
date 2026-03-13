import { Ennemi } from "../common/types";
import { io } from "./index";


const rightWall:number = 1980;
const ennemies:Ennemi[] = [];
let playing:boolean = false;

function autoSpawn() {
    if(playing) {
        const newEnnemi = new Ennemi(rightWall, Math.random()*720);
        ennemies.push(newEnnemi);
        io.emit("ennemiEvent", ennemies);
        console.log(`Un ennemi est apparu en (${newEnnemi.posX}, ${newEnnemi.posY})`);
    }
}
setInterval(autoSpawn, 30000);

function autoMove() {
    if(playing) {
        ennemies.forEach((ennemi) => {
            if(ennemi.posX > rightWall/2) {
                ennemi.move();
                console.log("Ennemi bougé");
            }
        });
        io.emit("ennemiEvent", ennemies);
    }
}
setInterval(autoMove, 100);

export function startPlaying() {
    playing = true;
}
export function stopPlaying() {
    playing = false;
}