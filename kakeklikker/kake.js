const lyd = new Audio("lyd/munch.mp3"); // Oppretter en lydfil som vi kan spille av i spillet vårt

// const timeout = setTimeout(stopp, 5000); // 5000 betyr 5000 ms = 5 sekunder

// function stopp() {
//     // alert("STOPP!");
//     poengsum = 0;
//     document.getElementById("kake").removeEventListener("click", klikk);
// }

document.getElementById("infoskjerm").innerText = "Her teller vi ned fra 5 sekunder når du trykker på start!\nTrykk deretter så mange ganger du klarer på kaken.";

let tidIgjen = 5;

//let tidsTimer = setInterval(tidtaking, 1000);
    
function tidtaking() {
    if(tidIgjen <= 0) {
        clearInterval(tidsTimer);
        document.getElementById("infoskjerm").innerText = "Ferdig! Du fikk " + poengsum + " poenger.";
        document.getElementById("kake").removeEventListener("click", klikk);
    }
    else {
        document.getElementById("infoskjerm").innerText = tidIgjen + " sekunder igjen.";
    }

    tidIgjen = tidIgjen - 1;
}

// Henter ut kake-bildet og legger til en lyttefunksjon, som kjører "klikk" når du trykker på den 
// document.getElementById("kake").addEventListener("click", klikk);

// Lagrer en variabel som tar vare på poengsummen
let poengsum = 0;

// Lagrer en variabel som holder styr på om kakebildet er stort eller lite
let stor = true;

function klikk() {
    lyd.play();

    // Her endrer vi poengsummen og viser det oppdaterte tallet frem
    poengsum = poengsum + 1;
    document.getElementById("poeng").innerText = poengsum;

    // Om bildet er stort, så gjør vi det lite, om det er lite gjør vi det stort
    if (stor) {
        document.getElementById("kake").style.transform = "scale(0.8)";
        stor = false;
    }
    else {
        document.getElementById("kake").style.transform = "scale(1)";
        stor = true;
    }

    // Etter at jeg ar trykt på bildet 10 ganger, så skal det forsvinne en bit, etter 20 en ny, etter 30,...
    if (poengsum > 9) {
        document.getElementById("kake").src = "bileter/kake-2.png";
    }

    if (poengsum > 19) {
        document.getElementById("kake").src = "bileter/kake-3.png";
    }

    if (poengsum > 29) {
        document.getElementById("kake").src = "bileter/kake-4.png";
    }

    if (poengsum > 39) {
        document.getElementById("kake").src = "bileter/kake-5.png";
    }
}

document.getElementById("knapp").addEventListener("click",restart);

function restart() {
    poengsum = 0;
    document.getElementById("poeng").innerText = poengsum;
    document.getElementById("kake").addEventListener("click", klikk);
    document.getElementById("kake").src = "bileter/kake.png";
    document.getElementById("infoskjerm").innerText = "Tiden har begynt!";
    
    tidIgjen = 5;
    tidsTimer = setInterval(tidtaking, 1000);
    // const timeout = setTimeout(stopp, 5000);
}

// Kommentar i js