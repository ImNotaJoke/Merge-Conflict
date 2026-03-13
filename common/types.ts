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

export class Player {
    // Idée : Ajouter des types de projectile avec effets différents
    // Exemple : type électrique qui touche plusieurs ennemis comme l'électro-sorcier
    pseudo: string;
    health: number;
    score: number;
    shootSpeed: number;
    projectileSize: number;
    projectileDamage:number;
    models:HTMLImageElement[] = [];

    constructor() {
        this.health = 3;
        this.score = 0;
        this.shootSpeed = 10;
        this.projectileSize = 5;
        this.projectileDamage = 1;
        this.pseudo = "Guest";
    }

    takeHealth() {
        this.health--;
    }

    verifyHealth() {
        if(this.health == 0) {
            return false;
        }
        return true;
    }

    giveHealth(hp:number) {
        this.health += hp;
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

    constructor(posX:number, posY:number, health?:number, projsize?:number, shootspeed?:number) {
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
        if(this.health === 0) {
            this.kill();
        }
        console.log("Un ennemi a été touché");
    }

    kill() {
        console.log("Un ennemi est mort");
    }
}