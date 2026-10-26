// Felles skript for heile hausnes.no: startsida, bloggen og 404-sida.

const aar = document.getElementById("aar");
if (aar) aar.textContent = new Date().getFullYear();
koplaMeny();


// ---------- Hamburgarmeny på mobil ----------

function koplaMeny() {
    const toppfelt = document.querySelector(".toppfelt");
    const knapp = toppfelt.querySelector(".menyknapp");
    toppfelt.classList.add("har-meny"); // Utan JavaScript blir menyen vist som før
    knapp.hidden = false;

    const settOpen = (open) => {
        toppfelt.classList.toggle("open", open);
        knapp.setAttribute("aria-expanded", open);
        knapp.setAttribute("aria-label", open ? "Lukk meny" : "Opne meny");
    };

    knapp.addEventListener("click", () => settOpen(!toppfelt.classList.contains("open")));
    toppfelt.querySelectorAll("nav a").forEach((a) => a.addEventListener("click", () => settOpen(false)));
    document.addEventListener("click", (e) => {
        if (!toppfelt.contains(e.target)) settOpen(false);
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && toppfelt.classList.contains("open")) {
            settOpen(false);
            knapp.focus();
        }
    });
}
