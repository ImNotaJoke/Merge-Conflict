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
    //score: number;
    killedEnnemies: number;
    invincibility:boolean;
    shootSpeed: number;
    projectileSize: number;
    projectileDamage:number;
    models:HTMLImageElement[] = [];

    constructor(posX:number, posY:number) {
        this.posX = posX;
        this.posY = posY;
        this.health = 3;
        //this.score = 0;
        this.shootSpeed = 10;
        this.projectileSize = 5;
        this.projectileDamage = 1;
        this.pseudo = "Guest";
        this.invincibility = false;
        this.killedEnnemies = 0;
    }

    ennemyKilled() {
        this.killedEnnemies++;
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
    projsize:number;
    shootspeed: number;

    constructor(posX:number, posY:number, health?:number, projsize?:number, shootspeed?:number, ) {
        this.health = health || 1;
        this.projsize = projsize || 1;
        this.shootspeed = shootspeed || 1;
        this.posX = posX;
        this.posY = posY;
    }

    move() {
        this.posX -= 3;
    }

    shoot() {
        console.log("Un ennemi a tiré");
    }

    hurt() {
        this.health--;
    }

    kill() {
        this.health = 0;
    }
}