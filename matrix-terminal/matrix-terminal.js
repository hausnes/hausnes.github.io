const output = document.querySelector("#tekstboks");

// Initialiser tekstfeltet med tilgjengelege kommandoar
output.value = `Available commands:\n- visit <url>\n- help\n- clear\n- exit\n- info\n\n`;

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

    // Dersom brukaren skriv "info", vis detaljert nettlesar-/skjerm-/systeminformasjon
    if (command.toLowerCase() === "info") {
        try {
            const ua = navigator.userAgent || 'N/A';
            const platform = navigator.platform || 'N/A'; // platform er "deprecated"
            const vendor = navigator.vendor || 'N/A'; // vendor er "deprecated"
            const language = navigator.language || 'N/A';
            const languages = navigator.languages ? navigator.languages.join(', ') : 'N/A';
            const cookies = navigator.cookieEnabled ? 'Yes' : 'No';
            const online = navigator.onLine ? 'Online' : 'Offline';
            const screenRes = `${screen.width}x${screen.height}`;
            const availRes = `${screen.availWidth}x${screen.availHeight}`;
            const colorDepth = screen.colorDepth;
            const pixelDepth = screen.pixelDepth;
            const dpr = window.devicePixelRatio || 1;
            const timezone = (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'N/A';

            const info = [];
            info.push('--- Browser & System info ---');
            info.push(`User agent: ${ua}`);
            info.push(`Platform: ${platform}`);
            info.push(`Vendor: ${vendor}`);
            info.push(`Language: ${language}`);
            info.push(`Languages: ${languages}`);
            info.push(`Cookies enabled: ${cookies}`);
            info.push(`Online: ${online}`);
            info.push(`Screen resolution: ${screenRes}`);
            info.push(`Available screen: ${availRes}`);
            info.push(`Color depth: ${colorDepth}`);
            info.push(`Pixel depth: ${pixelDepth}`);
            info.push(`Device Pixel Ratio: ${dpr}`);
            info.push(`Timezone: ${timezone}`);

            // Append synchronous info immediately
            output.value += info.join('\n') + '\n';

            // Forsøker å få geolokasjon asynkront (kan be om tillatelse)
            if ('geolocation' in navigator) {
                output.value += 'Forsøker å få tilnærmet posisjon (du kan bli bedt om tillatelse)...\n';
                // Be om posisjon, men blokkér ikkje; legg til resultatet når det er tilgjengelig
                navigator.geolocation.getCurrentPosition(function (pos) {
                    const { latitude, longitude, accuracy } = pos.coords;
                    output.value += `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (accuracy ±${accuracy} m)\n`;
                    output.scrollTop = output.scrollHeight;
                }, function (err) {
                    output.value += `Location: unavailable: ${err.message}\n`;
                    output.scrollTop = output.scrollHeight;
                }, { timeout: 5000 });
            } else {
                output.value += 'Geolocation: not supported by this browser.\n';
            }

            output.scrollTop = output.scrollHeight;
            // Me skreiv allereie den detaljerte informasjonen ovanfor, returner en tom streng slik at kalleren berre legg til eit enkelt linjeskift.
            return '';
        } catch (e) {
            return `Error collecting info: ${e.message}`;
        }
    }

    // Default svar dersom kommandoen ikkje er gjenkjent
    return `Command not recognized: ${command}`;
}