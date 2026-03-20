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
    // Idée : Ajouter des types de projectile avec effets différents
    // Exemple : type électrique qui touche plusieurs ennemis comme l'électro-sorcier
    posX:number;
    posY:number;
    pseudo: string;
    health: number;
    killedEnnemies;
    invincibility:boolean;
    shootSpeed: number;
    projectileSize: number;
    projectileDamage:number;
    models:HTMLImageElement[] = [];

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
    moveSpeed:number;
    imageId: number;

    constructor(posX:number, posY:number, health:number, moveSpeed:number, imageId: number ) {
        this.health = health;
        this.moveSpeed = moveSpeed;
        this.posX = posX;
        this.posY = posY;
        this.imageId = imageId;
    }

    move() {
        this.posX -= this.moveSpeed * 3;
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
    posX:number;
    posY:number;
    type:string;

    constructor(posX:number, posY:number, type:string) {
        this.posX = posX;
        this.posY = posY;
        this.type = type;
    }
}

export interface SecondPlayerData {
    posX: number;
    posY: number;
    socketId: string;
}

export class SecondPlayer {
    posX: number;
    posY: number;
    socketId: string;
    model: HTMLImageElement | null = null;

    constructor(posX: number, posY: number, socketId: string) {
        this.posX = posX;
        this.posY = posY;
        this.socketId = socketId;
    }

    updatePosition(posX: number, posY: number) {
        this.posX = posX;
        this.posY = posY;
    }

    setModel(image: HTMLImageElement) {
        this.model = image;
    }
}