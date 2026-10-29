// Skript for Hausnesbrogg. Data om brygga ligg i brygg.js.

const SESONGAR = ["Alle", "Vinter", "Vår", "Sommar", "Haust", "Jol"];
const MÅNADER = ["januar", "februar", "mars", "april", "mai", "juni", "juli",
    "august", "september", "oktober", "november", "desember"];

let valdSesong = "Alle";

document.documentElement.classList.add("js");
visTal();
visFilterknappar();
visBrygg();
koplaDialog();
koplaSteg();


// ---------- Tal i toppbiletet ----------

function visTal() {
    const snitt = BRYGG.reduce((sum, b) => sum + b.abv, 0) / BRYGG.length;
    const fyrste = Math.min(...BRYGG.map((b) => Number(b.dato.slice(0, 4))));
    document.getElementById("tal-brygg").textContent = BRYGG.length;
    document.getElementById("tal-sidan").textContent = fyrste;
    document.getElementById("tal-snitt").textContent = `${prosent(snitt)}`;
}


// ---------- Filter ----------

function visFilterknappar() {
    const boks = document.getElementById("sesongfilter");
    boks.innerHTML = SESONGAR.map((s) => {
        const tal = s === "Alle" ? BRYGG.length : BRYGG.filter((b) => b.sesong === s).length;
        return `<button class="filterknapp" type="button" data-sesong="${s}" aria-pressed="${s === valdSesong}">
            ${s} <span class="filtertal">${tal}</span></button>`;
    }).join("");

    boks.addEventListener("click", (e) => {
        const knapp = e.target.closest("[data-sesong]");
        if (!knapp) return;
        valdSesong = knapp.dataset.sesong;
        boks.querySelectorAll("[data-sesong]").forEach((k) =>
            k.setAttribute("aria-pressed", k.dataset.sesong === valdSesong));
        visBrygg();
    });
}


// ---------- Rutenettet med etikettar ----------

function visBrygg() {
    const treff = BRYGG.filter((b) => valdSesong === "Alle" || b.sesong === valdSesong);
    document.getElementById("brygg-liste").innerHTML = treff.map((b) => `
        <li>
            <button class="brygg-kort" type="button" data-id="${b.id}">
                <img class="brygg-etikett" src="etikettar/${b.id}.jpg" alt="Etiketten til ${b.namn}" loading="lazy" width="600" height="600">
                <span class="brygg-info">
                    <span class="brygg-namn">${b.namn}</span>
                    <span class="brygg-meta">
                        <span>${månadÅr(b.dato)}</span>
                        <span class="abv">${prosent(b.abv)}</span>
                    </span>
                </span>
            </button>
        </li>`).join("");
    document.getElementById("visar").textContent = valdSesong === "Alle"
        ? `Viser alle ${treff.length} brygga, nyaste først`
        : `Viser ${treff.length} av ${BRYGG.length} brygg`;
}


// ---------- Dialog med detaljar om eitt brygg ----------

function koplaDialog() {
    const dialog = document.getElementById("brygg-dialog");

    document.getElementById("brygg-liste").addEventListener("click", (e) => {
        const kort = e.target.closest("[data-id]");
        if (!kort) return;
        opneBrygg(BRYGG.find((b) => b.id === kort.dataset.id));
        history.replaceState(null, "", `#${kort.dataset.id}`);
    });

    dialog.querySelector(".dialog-lukk").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.close(); // Klikk utanfor innhaldet lukkar
    });
    dialog.addEventListener("close", () => {
        history.replaceState(null, "", location.pathname + "#brygga");
        document.querySelector(`[data-id="${dialog.dataset.id}"]`)?.focus();
    });

    // Lenkje direkte til eit brygg, til dømes hausnesbrogg/#sommarsol-2026
    const frå = BRYGG.find((b) => b.id === location.hash.slice(1));
    if (frå) opneBrygg(frå);
}

function opneBrygg(b) {
    const dialog = document.getElementById("brygg-dialog");
    dialog.dataset.id = b.id;

    const etikett = dialog.querySelector(".dialog-etikett");
    etikett.src = `etikettar/${b.id}.jpg`;
    etikett.alt = `Etiketten til ${b.namn}`;

    document.getElementById("dialog-sesong").textContent = b.sesong;
    document.getElementById("dialog-tittel").textContent = b.namn;

    const fakta = [
        `<li class="abv">${prosent(b.abv)}</li>`,
        `<li>${datoTekst(b.dato)}</li>`,
        b.mjostolen ? `<li>Saman med Mjøstølen Bryggeri</li>` : "",
    ];
    document.getElementById("dialog-fakta").innerHTML = fakta.join("");

    const skildring = document.getElementById("dialog-skildring");
    skildring.replaceChildren(...b.tekst.map((t) => {
        const p = document.createElement("p");
        p.textContent = t;
        return p;
    }));

    document.getElementById("dialog-untappd").href = b.untappd;
    dialog.showModal();
    dialog.querySelector(".dialog-tekst").scrollTop = 0;
}


// ---------- Stega glir inn når dei kjem til syne ----------

function koplaSteg() {
    const steg = document.querySelectorAll(".steg");
    if (!("IntersectionObserver" in window)) {
        steg.forEach((s) => s.classList.add("synleg"));
        return;
    }
    const observatør = new IntersectionObserver((oppføringar) => {
        oppføringar.forEach((o) => {
            if (!o.isIntersecting) return;
            o.target.classList.add("synleg");
            observatør.unobserve(o.target);
        });
    }, { rootMargin: "0px 0px -15% 0px" });
    steg.forEach((s) => observatør.observe(s));
}


// ---------- Hjelparar ----------

function prosent(tal) {
    return `${tal.toLocaleString("nn-NO", { maximumFractionDigits: 1 })} %`;
}

function månadÅr(dato) {
    const [år, månad] = dato.split("-");
    return `${MÅNADER[Number(månad) - 1]} ${år}`;
}

function datoTekst(dato) {
    const [år, månad, dag] = dato.split("-");
    return `${Number(dag)}. ${MÅNADER[Number(månad) - 1]} ${år}`;
}
