// =============================================
// GPS-KART — teiknar GPX-ruter på eit kart med
// høgdeprofil. Bruk i eit innlegg:
// <div class="gpx-kart" data-gpx="/sti/til/rute.gpx"></div>
// =============================================

const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';

function lastInn(fil) {
    return new Promise((ferdig, feil) => {
        const el = fil.endsWith('.css') ? document.createElement('link') : document.createElement('script');
        if (fil.endsWith('.css')) { el.rel = 'stylesheet'; el.href = LEAFLET + fil; }
        else { el.src = LEAFLET + fil; }
        el.onload = ferdig;
        el.onerror = feil;
        document.head.appendChild(el);
    });
}

// Avstand mellom to punkt i meter (haversine)
function avstand(a, b) {
    const r = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * r * Math.asin(Math.sqrt(h));
}

function lesGpx(tekst) {
    const dok = new DOMParser().parseFromString(tekst, 'application/xml');
    const punkt = el => ({
        lat: parseFloat(el.getAttribute('lat')),
        lon: parseFloat(el.getAttribute('lon')),
        ele: parseFloat(el.getElementsByTagName('ele')[0]?.textContent),
        namn: el.getElementsByTagName('name')[0]?.textContent
    });
    const spor = [...dok.getElementsByTagName('trkseg'), ...dok.getElementsByTagName('rte')]
        .map(seg => [...seg.getElementsByTagName('trkpt'), ...seg.getElementsByTagName('rtept')].map(punkt))
        .filter(seg => seg.length > 1);
    const veipunkt = [...dok.getElementsByTagName('wpt')].map(punkt);
    return { spor, veipunkt };
}

function statistikk(spor) {
    let lengd = 0, stigning = 0, maks = -Infinity, min = Infinity;
    const profil = [];
    for (const seg of spor) {
        for (let i = 0; i < seg.length; i++) {
            if (i > 0) {
                lengd += avstand(seg[i - 1], seg[i]);
                const diff = seg[i].ele - seg[i - 1].ele;
                if (diff > 0) stigning += diff;
            }
            if (!isNaN(seg[i].ele)) {
                maks = Math.max(maks, seg[i].ele);
                min = Math.min(min, seg[i].ele);
                profil.push([lengd, seg[i].ele]);
            }
        }
    }
    return { lengd, stigning, maks, min, profil };
}

function teiknProfil(profil, lengd, min, maks) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'gpx-profil');
    svg.setAttribute('viewBox', '0 0 1000 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Høgdeprofil frå ${Math.round(min)} til ${Math.round(maks)} moh.`);
    const spenn = Math.max(maks - min, 1);
    const d = profil.map(([x, y], i) =>
        `${i ? 'L' : 'M'}${(x / lengd * 1000).toFixed(1)},${(95 - (y - min) / spenn * 90).toFixed(1)}`).join('');
    const sti = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sti.setAttribute('d', `${d}L1000,100L0,100Z`);
    svg.appendChild(sti);
    return svg;
}

// Kartverket sitt topografiske kart i Noreg, OpenStreetMap elles
function iNoreg(grenser) {
    const s = grenser.getCenter();
    return s.lat > 57.5 && s.lat < 71.5 && s.lng > 4 && s.lng < 31.5;
}

async function visKart(boks) {
    const svar = await fetch(boks.dataset.gpx);
    const { spor, veipunkt } = lesGpx(await svar.text());
    if (!spor.length && !veipunkt.length) return;

    const kart = L.map(boks, { scrollWheelZoom: false });
    const lag = {
        'Topografisk (Kartverket)': L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
            { maxZoom: 18, attribution: '© <a href="https://www.kartverket.no/">Kartverket</a>' }),
        'OpenStreetMap': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' })
    };

    const linjer = spor.map(seg => L.polyline(seg.map(p => [p.lat, p.lon]), { color: '#d63a2f', weight: 4 }));
    const gruppe = L.featureGroup(linjer);
    for (const p of veipunkt) {
        L.circleMarker([p.lat, p.lon], { radius: 6, color: '#5b4bd1' }).bindPopup(p.namn || 'Veipunkt').addTo(gruppe);
    }
    if (spor.length) {
        const start = spor[0][0];
        L.circleMarker([start.lat, start.lon], { radius: 7, color: '#fff', fillColor: '#2a9d3f', fillOpacity: 1 })
            .bindTooltip('Start').addTo(gruppe);
    }
    // Kartet må ha ein posisjon før rutene blir lagde til
    const grenser = gruppe.getBounds();
    kart.fitBounds(grenser, { padding: [20, 20] });
    (iNoreg(grenser) ? lag['Topografisk (Kartverket)'] : lag['OpenStreetMap']).addTo(kart);
    L.control.layers(lag).addTo(kart);
    gruppe.addTo(kart);

    const s = statistikk(spor);
    if (s.lengd > 0) {
        const liste = document.createElement('ul');
        liste.className = 'gpx-statistikk meta';
        const tal = n => Math.round(n).toLocaleString('nn-NO');
        liste.innerHTML = `<li>Lengd: <strong>${(s.lengd / 1000).toLocaleString('nn-NO', { maximumFractionDigits: 1 })} km</strong></li>`;
        if (s.profil.length > 1) {
            liste.innerHTML += `<li>Stigning: <strong>${tal(s.stigning)} m</strong></li>
                <li>Høgaste punkt: <strong>${tal(s.maks)} moh.</strong></li>
                <li>Lågaste punkt: <strong>${tal(s.min)} moh.</strong></li>`;
        }
        boks.after(liste);
        if (s.profil.length > 1) liste.after(teiknProfil(s.profil, s.lengd, s.min, s.maks));
    }
}

const kartboksar = document.querySelectorAll('.gpx-kart');
if (kartboksar.length) {
    Promise.all([lastInn('leaflet.min.css'), lastInn('leaflet.min.js')])
        .then(() => kartboksar.forEach(boks => visKart(boks).catch(feil => {
            boks.textContent = 'Klarte ikkje å vise kartet.';
            console.error(feil);
        })));
}
