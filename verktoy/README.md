# Bloggen – slik gjer du det

Alle kommandoar blir køyrde frå rota av repoet (`hausnes.no/`).

## Skrive eit nytt innlegg

1. **Lag innlegget**

   ```
   python3 verktoy/oppdater_blogg.py ny "Tur til Oksen" -k fjell -k turtips
   ```

   Dette lagar `blogg/tur-til-oksen.html` med dagens dato, kategoriane og heile
   sideoppsettet ferdig. Vil du ha eit anna filnamn, legg til `--namn oksen-2026`.

2. **Skriv teksten** inne i `<div class="innleggstekst">` i den nye fila.
   Byggeklossar (bilete, galleri, GPS-kart, video, sitat) ligg i ein kommentar
   i fila. Kopier ut dei du treng, og slett resten av kommentaren.

3. **Skriv samandraget** i `<meta name="description" content="…">` øvst i fila.
   Det blir vist i Google og i oversikta. Hald det under ca. 155 teikn.

4. **Legg filene på plass**
   - bilete i `blogg/bilete/`
   - GPS-ruter (`.gpx`) i `blogg/gpx/`

   Det første biletet i innlegget blir brukt i oversikta.

5. **Oppdater oversikta**

   ```
   python3 verktoy/oppdater_blogg.py
   ```

   Dette oppdaterer `blogg/index.html`, `feed.xml`, `sitemap.xml` og
   førre/neste-lenkjene nedst i innlegga. Les åtvaringane til slutt. Dei seier frå
   om du har gløymt samandraget, eller om teksten frå malen framleis står att.

6. **Sjå over resultatet lokalt**

   ```
   python3 -m http.server
   ```

   Opne <http://localhost:8000/blogg/>. Stopp tenaren med Ctrl+C.

7. **Publiser**: commit og push.

## Kategoriar

| Skriv (`-k`)   | Blir vist som |
| -------------- | ------------- |
| `fjell`        | Fjell         |
| `turtips`      | Turtips       |
| `teknologi`    | Teknologi     |
| `media`        | Media         |
| `foto`         | Foto          |
| `video`        | Video         |
| `musikk-media` | Musikk        |
| `engelsk`      | Engelsk       |

Nye kategoriar legg du til i `KATEGORIAR` øvst i `verktoy/oppdater_blogg.py`.
Dei som skal ha ein filterknapp i bloggoversikta, står i `FILTER` rett under.

## Endre eller slette

- **Endre tekst:** Rediger fila, og køyr `python3 verktoy/oppdater_blogg.py`.
- **Endre tittel:** Endre han både i `<title>` og i `<h1>`, og køyr oppdateringa.
- **Endre kategoriar:** Endre `<meta name="kategoriar" content="fjell turtips">`
  (adressenamna, skilde med mellomrom) og lenkjene i `<p class="meta">`.
  Køyr så oppdateringa.
- **Slette eit innlegg:** Slett fila, og køyr oppdateringa. Bilete som berre det
  innlegget brukte, kan du slette frå `blogg/bilete/`.
- **Gi eit publisert innlegg nytt namn:** Gi fila nytt namn, byt ut det gamle
  namnet inne i fila (canonical, `og:url` og strukturerte data), og køyr
  oppdateringa. Legg også til ei linje i `vidaresendingar` i `404.html` frå den
  gamle adressa til den nye, slik at gamle lenkjer framleis verkar.

## Andre filer

- **Meny og botn i bloggen:** Endre `HOVUDMENY`, `EKSTERNE_LENKJER` eller funksjonane `topp()`
  og `botn()` i `verktoy/oppdater_blogg.py`, og køyr oppdateringa. Endringa kjem då med i
  alle bloggsidene og i `404.html`. Menyen på startsida (`index.html`) endrar du for hand.
- **Utsjånad:** Fargar, skrifter, knappar, toppfelt og botn ligg i `felles.css` på rota og
  gjeld heile nettstaden. Stil som berre gjeld bloggen, ligg i `blogg/blogg.css`.
- `verktoy/mal-innlegg.html`: malen nye innlegg blir laga frå. Endre han om du vil.
- `verktoy/blogg-mal/`: originalane av `blogg.css` og `kart.js`. Kopier endringar
  over til `blogg/`, eller endre direkte i `blogg/`.
- `404.html`: sender gamle WordPress-adresser vidare til dei nye sidene.
- `utkast/`: gamle utkast frå WordPress. Mappa blir ikkje publisert (står i
  `.gitignore`). Når eit utkast er klart, lag eit nytt innlegg med `ny` og
  flytt teksten over.

## Ikkje gjer dette

- **Ikkje køyr `wordpress_til_statisk.py --overskriv`.** Skriptet var for
  overføringa frå WordPress. Det sletter heile `blogg/` og byggjer han på nytt
  frå backupen, så alle nye innlegg ville forsvinne.
- **Ikkje legg backupen (`backup-wordpress-okt-2026/`) i git.** Han inneheld private
  innlegg og meldingar frå kontaktskjemaet. Mappa står i `.gitignore`.
