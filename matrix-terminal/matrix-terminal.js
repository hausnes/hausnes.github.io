const output = document.querySelector("#tekstboks");

// Initialiser tekstfeltet med tilgjengelege kommandoar
output.value = `Available commands:\n- visit <url>\n- help\n- clear\n- exit\n\n`;

document.querySelector("#inputfelt").addEventListener("change", function(event) {
    const inputField = document.querySelector("#inputfelt");
    const command = inputField.value.trim();
    
    console.log("Du skreiv inn:", command); // For debugging

    if (command) {
        const response = processCommand(command);
        output.value += `${response}\n`; // Legg til textarea
        output.scrollTop = output.scrollHeight; // Autoscroll til botn, slik at textarea alltid viser siste kommando
        inputField.value = ""; // Tøm input-felt
    }
});

function processCommand(command) {
    // Sjekkar om kommandoen startar med "visit"
    if (command.toLowerCase().startsWith("visit")) {
        const url = command.substring(6).trim(); // Hentar ut URL-en etter ordet "visit"
        if (url) {
            const fullUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
            window.open(fullUrl, "_blank"); // Opne URL i ny fane (_blank)
            return `Opening ${fullUrl} in a new tab...`;
        } else {
            return "No URL provided. Usage: visit <url>";
        }
    }

    // Dersom bruken skriv "help", gi hjelp
    if (command.toLowerCase() === "help") {
        return `Available commands: visit <url>, help, clear, exit`;
    }
    
    // Dersom brukeren skriv "clear", tøm textarea
    if (command.toLowerCase() === "clear") {
        output.value = ""; // Tøm textarea
        return "Cleared the output.";
    }

    // Dersom brukaren skriv "exit", lukk vinduet
    // Merk: Dette vil ikkje alltid fungere i alle nettlesarar pga. sikkerheitsinnstillingar
    if (command.toLowerCase() === "exit") {
        window.close(); // Lukk vinduet
        return "Closing the window... \nNB: Fungerer ikkje alltid i nettlesarar pga. sikkerheit.";
    }

    // Default svar dersom kommandoen ikkje er gjenkjent
    return `Command not recognized: ${command}`;
}