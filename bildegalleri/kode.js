// Dette er et bildegalleri

// Tester først at vi får endret bildet fra JS
let bilde = document.getElementById("bilde");
//bilde.src = "bilder/1.jpg";

// Vi lagrer en array med alle bildene
let bildeListe = [
    "1.jpg",
    "2.jpg",
    "3.jpg",
    "4.jpg",
    "5.jpg",
    "6.jpg",
];

// Forsøker å hente et bilde fra listen
let aktivtBilde = 0;
bilde.src = "bilder/" + bildeListe[aktivtBilde];

let knappFrem = document.getElementById("knappFrem");
let knappTilbake = document.getElementById("knappTilbake");

knappFrem.addEventListener("click", frem);

function frem() {
    aktivtBilde = aktivtBilde + 1;

    if(aktivtBilde > 5) {
        aktivtBilde = 0;
    }

    bilde.src = "bilder/" + bildeListe[aktivtBilde];
}

knappTilbake.addEventListener("click", tilbake);

function tilbake() {
    aktivtBilde = aktivtBilde - 1;

    if (aktivtBilde <= 0) {
        aktivtBilde = 5;
    }

    bilde.src = "bilder/" + bildeListe[aktivtBilde];
}

document.addEventListener("keydown", tastatur);

function tastatur(evt) {
    console.log("Du trykte på: " +  evt.keyCode);
    if(evt.keyCode == 37) {
        console.log("Du trykte til venstre..");
        tilbake();
    }
    if(evt.keyCode == 39) {
        console.log("Du trykte til høyre..");
        frem();
    }
}