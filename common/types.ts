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