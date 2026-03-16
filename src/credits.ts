import type { Developer } from "../common/types";

const devList:Developer[] = [
    {forename:"Florian", lastname:"GAVOILLE", surname:"flopsi", group:"I", favGame:"Minecraft", grade:100},
    {forename:"Sulivan", lastname:"CERDAN", surname:"susu", group:"I", favGame:"Call of Duty Mode Zombies", grade:100},
    {forename:"Sebastian", lastname:"NOVAK", surname:"seb", group:"I", favGame:"Red Dead Redemption II", grade:100},
    {forename:"Thomas", lastname:"FRITSCH", surname:"Heisenberg", group:"Ens", favGame:"Mario Kart 8 Deluxe", grade:0},
    {forename:"Patricia", lastname:"EVERAERE", surname:"Hugo Destroyer", group:"Ens", favGame:"Merge Conflict", grade:0},
];

export function render() {
    let html:string = ``;
    devList.forEach(dev => {
        html += `<tr>
            <td>${dev.forename}</td>
            <td>${dev.lastname}</td>
            <td>${dev.surname}</td>
            <td>${dev.group}</td>
            <td>${dev.favGame}</td>
            <td>${dev.grade}</td>
        </tr>`
    });
    return html;
}

