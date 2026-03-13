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
    health: number;
    score: number;
    models = [];

    constructor() {
        this.health = 3;
        this.score = 0;
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