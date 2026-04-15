export interface Developer {
    forename:string;
    lastname:string;
    surname:string;
    group:string;
    favGame:string;
    grade:number;
}

export interface BestScore {
    pseudo:string;
    score:number;
    date:Date;
}

export type InputMode = "keyboard" | "mouse";

export interface GameSettings {
    volume: number;
    soundEffects: number;
    inputMode: InputMode;
}

export interface LeaderboardEntry {
    pseudo:string;
    score:number;
    date:string;
    mode: 'solo' | 'coop';
}

export interface GameRunStats {
    pseudo:string;
    survivalSeconds:number;
    enemiesKilled:number;
    score:number;
    date:string;
}

export class Player {
    posX:number;
    posY:number;
    pseudo: string;
    health: number;
    killedEnnemies: Map<number, number>;
    invincibility:boolean;
    shootSpeed: number;
    projectileSize: number;
    projectileDamage:number;
    models:HTMLImageElement[] = [];
    isHost: boolean = true;

    constructor(posX:number, posY:number) {
        this.posX = posX;
        this.posY = posY;
        this.health = 3;
        this.shootSpeed = 10;
        this.projectileSize = 5;
        this.projectileDamage = 1;
        this.pseudo = "Guest";
        this.invincibility = false;
        this.killedEnnemies = new Map();
    }

    ennemyKilled(id:number) {
        if(!this.killedEnnemies.has(id)) {
            this.killedEnnemies.set(id, 1);
        } else {
            this.killedEnnemies.set(id, this.killedEnnemies.get(id) + 1);
        }
    }

    takeHealth() {
        if(!this.invincibility) {
            this.health--;
            this.invincibility = true;
            setTimeout(() => {
                this.invincibility = false;
            }, 3000);
        }
    }

    verifyHealth() {
        return this.health > 0;
    }

    giveHealth(hp:number) {
        if(this.health < 3) {
            this.health += hp;
        }
    }

    giveShootSpeed(ssp:number) {
        this.shootSpeed += ssp;
    }
    
    giveBiggerProjectiles(pjSize:number) {
        this.projectileSize += pjSize;
    } 

    shoot() {
        console.log("Time to bleed !");
    }

    setPseudo(pseudo:string) {
        this.pseudo = pseudo;
    }
}

export class Ennemi {
    posX:number;
    posY:number;
    health:number;
    shootSpeed?: number;
    projectileSize?: number;
    projectileDamage?:number;
    moveSpeed:number;
    imageId: number;
    movementType: "horizontal" | "diagonal";
    verticalSpeed: number;

    constructor(
        posX:number,
        posY:number,
        health:number = 1,
        moveSpeed:number = 1,
        imageId: number, shootSpeed?:number, projectileSize?:number, projectileDamage?:number,
        movementType: "horizontal" | "diagonal" = "horizontal",
        verticalSpeed: number = 0,
    ) {
        this.health = health;
        this.moveSpeed = moveSpeed;
        this.posX = posX;
        this.posY = posY;
        this.imageId = imageId;
        this.shootSpeed = shootSpeed ?? 0;
        this.projectileSize = projectileSize ?? 0;
        this.projectileDamage = projectileDamage ?? 0;
        this.movementType = movementType ?? "horizontal";
        this.verticalSpeed = verticalSpeed ?? 0;
    }

    move(arenaMaxY: number = 720, ennemiHeight: number = 64) {
        this.posX -= this.moveSpeed * 3;

        if (this.movementType === "diagonal") {
            this.posY += this.verticalSpeed * 3 ;

            const maxY = Math.max(0, arenaMaxY - ennemiHeight);
            if (this.posY <= 0) {
                this.posY = 0;
                this.verticalSpeed = Math.abs(this.verticalSpeed);
            } else if (this.posY >= maxY) {
                this.posY = maxY;
                this.verticalSpeed = -Math.abs(this.verticalSpeed);
            }
        }
    }

    shoot() {
        console.log("Un ennemi a tiré");
    }

    hurt(damage: number) {
        this.health -= damage;
    }


    kill() {
        this.health = 0;
    }
}

export class Bonus {
    id: string;
    posX:number;
    posY:number;
    type:string;

    constructor(id: string,posX:number, posY:number, type:string) {
        this.id = id;
        this.posX = posX;
        this.posY = posY;
        this.type = type;
    }
}

export interface SecondPlayerData {
    posX: number;
    posY: number;
    socketId: string;
    modelId: string;
}

export type MultiplayerPlayerStatus = 'waiting' | 'playing' | 'spectator' | 'disconnected';

export interface MultiplayerPlayerData {
    socketId: string;
    pseudo: string;
    status: MultiplayerPlayerStatus;
    posX: number;
    posY: number;
    health: number;
    score: number;
    killedEnemies: Record<number, number>;
    survivalSeconds: number;
    isHost: boolean;
    skinIndex: string;
}

export interface MultiplayerRoomConfig {
    difficulty: number;
    maxPlayers: number;
}

export interface MultiplayerRoomData {
    id: string;
    hostId: string;
    config: MultiplayerRoomConfig;
    players: Map<string, MultiplayerPlayerData>;
    disconnectedPlayers: Map<string, MultiplayerPlayerData>;
    status: 'waiting' | 'playing' | 'ended';
    gameStartTime?: number;
}

export interface MultiplayerRoomInfo {
    id: string;
    hostPseudo: string;
    playerCount: number;
    maxPlayers: number;
    difficulty: number;
}

export interface MultiplayerEndGameStats {
    pseudo: string;
    score: number;
    killedEnemies: number;
    survivalSeconds: number;
    status: 'alive' | 'dead';
}

export class SecondPlayer {
    posX: number;
    posY: number;
    socketId: string;
    skinId: string;

    constructor(posX: number, posY: number, socketId: string, skinId:string) {
        this.posX = posX;
        this.posY = posY;
        this.socketId = socketId;
        this.skinId = skinId;
    }

    updatePosition(posX: number, posY: number) {
        this.posX = posX;
        this.posY = posY;
    }
}