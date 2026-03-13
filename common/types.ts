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
}