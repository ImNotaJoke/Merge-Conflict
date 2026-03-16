import { Ennemi } from "../common/types.ts";
import { io } from "./index.ts";


const rightWall:number = 1980;
const arenaHeight:number = 720;
const leftCleanupLimit:number = -100;
const initialSpawnIntervalMs:number = 4000;
const minimumSpawnIntervalMs:number = 700;
const spawnAccelerationMs:number = 100;
const ennemies:Ennemi[] = [];
let playing:boolean = false;
let currentSpawnIntervalMs:number = initialSpawnIntervalMs;
let spawnTimeout: NodeJS.Timeout | undefined;

function spawnEnnemi() {
    const newEnnemi = new Ennemi(rightWall, Math.random() * arenaHeight,25);
    ennemies.push(newEnnemi);
    io.emit("ennemiEvent", ennemies);
    console.log(`Un ennemi est apparu en (${newEnnemi.posX}, ${newEnnemi.posY})`);
    console.log(`Nombre d'ennemis : ${ennemies.length}`);
}

export function removeEnnemi(index: number) {
    if (index >= 0 && index < ennemies.length) {
        ennemies.splice(index, 1); 
        io.emit("ennemiEvent", ennemies); 
    }
}

export function hurtEnnemi(index: number) {
    if (index >= 0 && index < ennemies.length) {
        if(ennemies[index].health <= 0) {
            removeEnnemi(index);
            return;
        }
        ennemies[index].hurt();
        return;
    }
}

function scheduleNextSpawn() {
    if (!playing) {
        return;
    }

    spawnTimeout = setTimeout(() => {
        if (!playing) {
            return;
        }

        spawnEnnemi();
        currentSpawnIntervalMs = Math.max(
            minimumSpawnIntervalMs,
            currentSpawnIntervalMs - spawnAccelerationMs,
        );
        scheduleNextSpawn();
    }, currentSpawnIntervalMs);
}

function resetSpawnTimer() {
    if (spawnTimeout) {
        clearTimeout(spawnTimeout);
        spawnTimeout = undefined;
    }
    currentSpawnIntervalMs = initialSpawnIntervalMs;
}

function autoMove() {
    if(playing) {
        ennemies.forEach((ennemi) => {
            if(ennemi.posX > leftCleanupLimit) {
                ennemi.move();
            }
        });
        for (let i = ennemies.length - 1; i >= 0; i--) {
            if (ennemies[i].posX <= leftCleanupLimit) {
                ennemies.splice(i, 1);
            }
        }
        io.emit("ennemiEvent", ennemies);
    }
}
setInterval(autoMove, 100);

export function startPlaying() {
    resetSpawnTimer();
    ennemies.length = 0;
    io.emit("ennemiEvent", ennemies);
    playing = true;
	spawnEnnemi();
	scheduleNextSpawn();
    console.log("Début du jeu");
}
export function stopPlaying() {
    resetSpawnTimer();
    playing = false;
    ennemies.length = 0;
    io.emit("ennemiEvent", ennemies);
    console.log("Fin du jeu");
}