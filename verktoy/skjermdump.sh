#!/bin/sh
# Lagar skjermdumpar av prosjekta med Playwright (Chromium i hovudlaus modus).
# Kan køyrast frå kvar som helst:  sh verktoy/skjermdump.sh
# Bileta hamnar i bileter/prosjekt/<id>.png, som prosjekt.js peikar på.
# Krev Node.js. Første gong blir Chromium lasta ned (ca. 100 MB).

ROT="$(cd "$(dirname "$0")/.." && pwd)"
UT="$ROT/bileter/prosjekt"
PW="npx --yes playwright@1.63.0"
mkdir -p "$UT"

$PW install chromium || { echo "Klarte ikkje å installere Chromium"; exit 1; }

ta() {
    echo "📸 $1"
    $PW screenshot --browser chromium --viewport-size "1280, 800" \
        --wait-for-timeout 1500 "$2" "$UT/$1.png" >/dev/null
    if [ -f "$UT/$1.png" ]; then
        sips -Z 1280 "$UT/$1.png" >/dev/null
    else
        echo "   ⚠️  Inga fil vart laga for $1"
    fi
}

ta a-puzzle-a-day  "https://hausnes.github.io/a-puzzle-a-day/"
ta kulturuke       "https://hausnes.github.io/kulturuke/"
ta webutvikling    "https://hausnes.github.io/webutvikling/"
ta nordnes-sjobad  "https://hausnes.github.io/nordnes-sjobad/"
ta vent-paa-tur    "https://hausnes.github.io/vent-paa-tur/"
ta fireplace       "https://hausnes.github.io/fireplace/"
ta matrix-terminal "file://$ROT/matrix-terminal/matrix-terminal.html"
ta kakeklikker     "file://$ROT/kakeklikker/index.html"

echo "Ferdig! Sjå $UT"
