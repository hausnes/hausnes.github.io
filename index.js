const { framheva, taggRekkjefolgje, prosjekt } = PORTFOLIO;

const valdeTaggar = new Set(lesTaggarFraUrl());

document.getElementById("aar").textContent = new Date().getFullYear();
visFramheva();
visFilterknappar();
visProsjekt();


// ---------- Prosjektet i søkelyset ----------

function visFramheva() {
    const p = prosjekt.find((p) => p.id === framheva) ?? prosjekt[0];
    const boks = document.getElementById("framheva-kort");

    boks.innerHTML = `
        <div class="framheva-bilete">${bileteHtml(p, "eager")}</div>
        <div class="framheva-tekst">
            <h2 id="framheva-tittel">${p.tittel}</h2>
            <p class="framheva-kort-tekst">${p.kort}</p>
            <p>${p.lang ?? ""}</p>
            <ul class="taggar">${p.taggar.map((t) => `<li>${t}</li>`).join("")}</ul>
            <div class="lenker">${lenkjerHtml(p, true)}</div>
        </div>
    `;
    koplaBileteFallback(boks);
}


// ---------- Filter ----------

function alleTaggar() {
    const brukte = new Set(prosjekt.flatMap((p) => p.taggar));
    const sorterte = taggRekkjefolgje.filter((t) => brukte.has(t));
    const resten = [...brukte].filter((t) => !taggRekkjefolgje.includes(t)).sort();
    return [...sorterte, ...resten];
}

function visFilterknappar() {
    const boks = document.getElementById("filterknappar");
    const taggar = ["Alle", ...alleTaggar()];

    boks.innerHTML = taggar.map((t) => {
        const tal = t === "Alle" ? prosjekt.length : prosjekt.filter((p) => p.taggar.includes(t)).length;
        return `<button type="button" class="filterknapp" data-tagg="${t}">
                    ${t} <span class="filtertal">${tal}</span>
                </button>`;
    }).join("");

    boks.addEventListener("click", (e) => {
        const knapp = e.target.closest("button");
        if (!knapp) return;
        const tagg = knapp.dataset.tagg;

        if (tagg === "Alle") valdeTaggar.clear();
        else if (valdeTaggar.has(tagg)) valdeTaggar.delete(tagg);
        else valdeTaggar.add(tagg);

        skrivTaggarTilUrl();
        visProsjekt();
    });
}

function oppdaterFilterknappar() {
    document.querySelectorAll(".filterknapp").forEach((knapp) => {
        const tagg = knapp.dataset.tagg;
        const aktiv = tagg === "Alle" ? valdeTaggar.size === 0 : valdeTaggar.has(tagg);
        knapp.setAttribute("aria-pressed", aktiv);
    });
}

function lesTaggarFraUrl() {
    const verdi = new URLSearchParams(location.search).get("tagg");
    return verdi ? verdi.split(",") : [];
}

function skrivTaggarTilUrl() {
    const url = new URL(location.href);
    if (valdeTaggar.size) url.searchParams.set("tagg", [...valdeTaggar].join(","));
    else url.searchParams.delete("tagg");
    history.replaceState(null, "", url);
}


// ---------- Prosjektlista ----------

function visProsjekt() {
    oppdaterFilterknappar();

    // Prosjekt må ha alle valde taggar for å bli vist
    const treff = prosjekt.filter((p) => [...valdeTaggar].every((t) => p.taggar.includes(t)));
    const liste = document.getElementById("prosjektliste");

    liste.innerHTML = treff.map((p, i) => `
        <li class="prosjektkort" style="--forseinking: ${i * 40}ms">
            <div class="kort-bilete">
                ${bileteHtml(p, "lazy")}
                ${p.id === framheva ? '<span class="merke">I søkelyset</span>' : ""}
            </div>
            <div class="kort-tekst">
                <h3>${p.tittel}</h3>
                <p>${p.kort}</p>
                <ul class="taggar">${p.taggar.map((t) =>
                    `<li class="${valdeTaggar.has(t) ? "valt" : ""}">${t}</li>`).join("")}</ul>
                <div class="lenker">${lenkjerHtml(p, false)}</div>
            </div>
        </li>
    `).join("");

    if (treff.length === 0) {
        liste.innerHTML = `<li class="ingen-treff">Ingen prosjekt har alle desse taggane. Prøv å fjerne eit filter.</li>`;
    }

    document.getElementById("tal-treff").textContent =
        `Viser ${treff.length} av ${prosjekt.length} prosjekt`;

    koplaBileteFallback(liste);
}


// ---------- Hjelpefunksjonar ----------

function bileteHtml(p, lasting) {
    const omslag = omslagHtml(p);
    if (!p.bilete) return omslag;
    return `<img src="${p.bilete}" alt="Skjermbilete av ${p.tittel}" loading="${lasting}">
            <template>${omslag}</template>`;
}

// Generert omslag når prosjektet manglar skjermbilete
function omslagHtml(p) {
    const fargetone = [...p.id].reduce((sum, teikn) => sum + teikn.charCodeAt(0), 0) % 360;
    return `<div class="omslag" style="--fargetone: ${fargetone}" role="img" aria-label="${p.tittel}">
                <span class="omslag-ikon">${p.ikon ?? "✨"}</span>
                <span class="omslag-tittel">${p.tittel}</span>
            </div>`;
}

// Byt ut bilete som ikkje finst med det genererte omslaget
function koplaBileteFallback(boks) {
    boks.querySelectorAll("img + template").forEach((mal) => {
        const img = mal.previousElementSibling;
        const byt = () => img.replaceWith(mal.content.cloneNode(true));
        if (img.complete && img.naturalWidth === 0) byt();
        else img.addEventListener("error", byt, { once: true });
    });
}

function lenkjerHtml(p, stor) {
    const klasse = stor ? "knapp" : "lenkje";
    let html = "";
    if (p.demo) html += `<a class="${klasse} ${stor ? "knapp-primar" : ""}" href="${p.demo}">Prøv sjølv →</a>`;
    if (p.kjelde) html += `<a class="${klasse} ${stor ? "knapp-omriss" : "lenkje-dempa"}" href="${p.kjelde}">Kjeldekode</a>`;
    return html;
}
