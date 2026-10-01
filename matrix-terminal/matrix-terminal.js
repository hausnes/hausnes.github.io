const output = document.querySelector("#tekstboks");

// Liste over alle kommandoar. Brukast både i velkomstteksten og av "help", slik at dei alltid er like.
const commands = ["visit <url>", "speak <text>", "matrix", "time", "uptime", "help", "clear", "exit", "info"];
const commandList = commands.map(c => `- ${c}`).join("\n");

// Initialiser tekstfeltet med tilgjengelege kommandoar
output.value = `Available commands:\n${commandList}\n\n`;

const inputField = document.querySelector("#inputfelt");

// Køyr kommandoen når brukaren trykkjer Enter
// ("change" vart òg utløyst når feltet mista fokus, t.d. ved klikk utanfor)
inputField.addEventListener("keydown", function(event) {
    if (event.key !== "Enter") return;
    const command = inputField.value.trim();
    
    console.log("Du skreiv inn:", command); // For debugging

    if (command) {
        output.value += `> ${command}\n`; // Vis kommandoen som vart køyrt, slik som i ein ekte terminal
        const response = processCommand(command);
        output.value += `${response}\n`; // Legg til textarea
        output.scrollTop = output.scrollHeight; // Autoscroll til botn, slik at textarea alltid viser siste kommando
        inputField.value = ""; // Tøm input-felt
    }
});

function processCommand(command) {
    // Del opp i kommandonamn og resten (argument), t.d. "visit vg.no" -> "visit" og "vg.no"
    const [name, ...args] = command.split(/\s+/);
    const cmd = name.toLowerCase();

    // Sjekkar om kommandoen er "visit"
    if (cmd === "visit") {
        const url = args.join(" "); // Hentar ut URL-en etter ordet "visit"
        if (url) {
            const fullUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
            window.open(fullUrl, "_blank", "noopener"); // Opne URL i ny fane (_blank)
            return `Opening ${fullUrl} in a new tab...`;
        } else {
            return "No URL provided. Usage: visit <url>";
        }
    }

    // Dersom brukaren skriv "speak", les opp teksten med talesyntese
    if (cmd === "speak") {
        const text = args.join(" ");
        if (!text) {
            return "No text provided. Usage: speak <text>";
        }
        if (!("speechSynthesis" in window)) {
            return "Speech synthesis is not supported in this browser.";
        }
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.cancel(); // Stopp eventuell tale som allereie er i gang
        speechSynthesis.speak(utterance);
        return `Speaking: "${text}"`;
    }

    // Dersom brukaren skriv "matrix", slå "digitalt regn" i bakgrunnen av eller på
    if (cmd === "matrix") {
        return toggleMatrix();
    }

    // Dersom brukaren skriv "time", vis dato og klokkeslett
    if (cmd === "time") {
        const now = new Date();
        return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    }

    // Dersom brukaren skriv "uptime", vis kor lenge sida har vore open
    if (cmd === "uptime") {
        // performance.now() gir millisekund sidan sida vart lasta
        const totalSeconds = Math.floor(performance.now() / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `Uptime: ${hours}h ${minutes}m ${seconds}s`;
    }

    // Dersom brukaren skriv "help", gi hjelp
    if (cmd === "help") {
        return `Available commands:\n${commandList}`;
    }
    
    // Dersom brukeren skriv "clear", tøm textarea
    if (cmd === "clear") {
        output.value = ""; // Tøm textarea
        return "Cleared the output.";
    }

    // Dersom brukaren skriv "exit", lukk vinduet
    // Merk: Dette vil ikkje alltid fungere i alle nettlesarar pga. sikkerheitsinnstillingar
    if (cmd === "exit") {
        window.close(); // Lukk vinduet
        return "Closing the window... \nNB: Fungerer ikkje alltid i nettlesarar pga. sikkerheit.";
    }

    // Dersom brukaren skriv "info", vis detaljert nettlesar-/skjerm-/systeminformasjon
    if (cmd === "info") {
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

// --- Matrix-regn ---
// Teiknar fallande teikn på eit <canvas> som ligg bak terminalen.
const canvas = document.querySelector("#matrix");
const ctx = canvas.getContext("2d");
const matrixChars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789";
const fontSize = 16;
let drops = [];        // Kvar kolonne har ein "dråpe" med ei y-posisjon (målt i rader)
let matrixTimer = null; // ID frå setInterval, eller null når regnet er av

// Tilpass canvas til vindauget, og lag ein dråpe per kolonne
function resizeMatrix() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const columns = Math.floor(canvas.width / fontSize);
    drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -50)); // Start litt tilfeldig over skjermen
}

function drawMatrix() {
    // Halvgjennomsiktig svart over alt gjer at gamle teikn sakte blir borte (hale-effekt)
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00ff00";
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
        const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        // Når dråpen er under botnen, start på toppen igjen (av og til, så kolonnane ikkje blir like)
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

function toggleMatrix() {
    if (matrixTimer) {
        clearInterval(matrixTimer);
        matrixTimer = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return "Matrix mode off.";
    }
    resizeMatrix();
    matrixTimer = setInterval(drawMatrix, 50); // Teikn eit nytt bilete kvart 50. millisekund
    return "Wake up, Neo... (type matrix again to stop)";
}

window.addEventListener("resize", function() {
    if (matrixTimer) resizeMatrix();
});
