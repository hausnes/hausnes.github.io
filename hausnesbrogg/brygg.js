/*
  Alle brygga frå Hausnesbrogg. Henta frå https://untappd.com/Hausnesbrogg/beer (oktober 2026).

  - Nytt brygg: legg det øvst i lista, og legg etiketten i etikettar/<id>.jpg (helst 600 px brei).
  - `dato` er datoen brygget vart lagt inn på Untappd (ÅÅÅÅ-MM-DD).
  - `sesong` styrer filterknappane: Vinter, Vår, Sommar, Haust eller Jol.
  - `mjostolen: true` betyr at brygget er laga saman med Mjøstølen Bryggeri.
  - `tekst` er ei liste med avsnitt.
*/

const BRYGG = [
  {
    "id": "sommarsol-2026",
    "namn": "Sommarsøl (2026)",
    "dato": "2026-06-23",
    "abv": 10.1,
    "sesong": "Sommar",
    "mjostolen": true,
    "tekst": [
      "Sommarølet er på plass. Med 5 kg ekstra malt (pale ale), i tillegg til den vanlege dosen med 25 kg pilsner malt, og ingen andre variablar endra, så gjekk me på ein smell med tanke på alkoholstyrken. Fortsatt leskande, men pass deg så du ikkje går på ein smell. Bryggekarar er Jo Bjørnar og Svein, med litt hjelp frå Magnus. Brygging onsdag 17. juni, og ølet vart teke måndag 22. juni.",
      "Kveik frå Dyrvedalen (Rivenes). Humle, type Cascade, Amarillo og Chinook. 25 kg pilsner- og 5 kg pale ale malt. Vatn frå nyebrønnen."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-sommarsol-2026/6763419"
  },
  {
    "id": "var-herre",
    "namn": "Vår Herre",
    "dato": "2026-03-15",
    "abv": 8.5,
    "sesong": "Vår",
    "mjostolen": true,
    "tekst": [
      "Våren og påsken nærmar seg, og då passar det seg godt med ein saftig feiring. Vår Herre byr opp til dans med den vanlege miksen av brakje (frå Espelandsdalen og Bønes), humle (Cascade, Amarillo og ein skvett med Chinook), kveik (frå Dyrvedalen) og vatn frå Hausnes (nyebrønnen, denne gong). Bryggekarane var, som alltid, Jo Bjørnar og Svein, med besøk frå Harald. God vår, og måtte Vår Herre behandla deg vel."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-var-herre/6636292"
  },
  {
    "id": "denna-va-de-heldige-med-2025",
    "namn": "Denna Va' De Heldige Med (2025)",
    "dato": "2025-10-12",
    "abv": 8.5,
    "sesong": "Haust",
    "mjostolen": true,
    "tekst": [
      "Det er haust, og på tide å samlast rundt eit godt glas med heimabrygg. Om du likar den slags. Hausnesbrogg og Mjøstølen stiller på ny, med både gamle og nye bryggevener på denne flotte søndagen. Som alltid er det fokus på å halde standarden; med pilsnermalt, brakje frå Olastøl, humle (Cascade og Amarillo), vatn frå gamlebrønnen og kveik frå Kjetil Dale. \"Denna va' de heldige med\", som mor til eine bryggaren alltid seier."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-denna-va-de-heldige-med-2025/6445825"
  },
  {
    "id": "sommarsol-2025",
    "namn": "Sommarsøl (2025)",
    "dato": "2025-07-01",
    "abv": 8.4,
    "sesong": "Sommar",
    "mjostolen": true,
    "tekst": [
      "Hausnesbrogg og Mjøstølen samla seg på ny i Hausnes (25. juni), og laga eit saftig stykke Sommarsøl. Lett å drikke, og lett å like - for dei som likar den slags. Pilsnermalt, brakje (einer) frå Olastøl, Vossakveik, Cascade- og Amarillo-humle og ikkje minst vatn frå gamlebrønnen. God sommar!"
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-sommarsol-2025/6324448"
  },
  {
    "id": "harald-harmangel",
    "namn": "Harald Hårmangel",
    "dato": "2025-03-04",
    "abv": 7.5,
    "sesong": "Vinter",
    "mjostolen": false,
    "tekst": [
      "Vinterferien skuffa vermessig, så då var det lettare å rettferdiggjere brygging. Tradisjonen tru så blei det denne gongen eit stykke heimabrygg med brakje (einebærbusk) frå Espelandsdalen, pilsnermalt, Cascade- og Amarillo-humle og Vossakveik (Gjernes)."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-harald-harmangel/6179267"
  },
  {
    "id": "granvinsgraps",
    "namn": "Granvinsgraps",
    "dato": "2025-03-01",
    "abv": 8.4,
    "sesong": "Vinter",
    "mjostolen": false,
    "tekst": [
      "Hausnesbrogg eksperimenterer #1. Det vart ein del liter til overs, som ikkje fekk plass i kokekaret. Dette blei kokt nokre dagar seinare, med eit par appelsiner, litt honning og nokre nellikspikar. Humle i form av Cascade (1 pose), Amarillo (halv) og Tettnager (halv)."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-granvinsgraps/6176141"
  },
  {
    "id": "litt-krydra-jolastol-2024",
    "namn": "Litt Krydra Jolastøl 2024",
    "dato": "2024-12-02",
    "abv": 8.0,
    "sesong": "Jol",
    "mjostolen": true,
    "tekst": [
      "Kva gjer du om krydringa i Krydra Jolastøl blir litt voldsom? Jau, du blandar med Jolastøl som kanskje blei eit knepp for søtt. Det verste frå begge versjonar, kombinert til noko av det beste med jola?"
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-litt-krydra-jolastol-2024/6080863"
  },
  {
    "id": "krydra-jolastol-2024",
    "namn": "Krydra Jolastøl (2024)",
    "dato": "2024-11-28",
    "abv": 8.0,
    "sesong": "Jol",
    "mjostolen": true,
    "tekst": [
      "Som vanleg sat me igjen med nokre gode liter med heimabrygg som ikkje fekk plass i kjelen når me skulle koka det opp. Denne gongen blei det ikkje kasta, men Svein tok det med seg til Mjøstølen og fekk hive i litt jolekrydder og radon frå Kinsarvik. Eksperimentering FTW!"
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-krydra-jolastol-2024/6075676"
  },
  {
    "id": "jolastol-2024",
    "namn": "Jolastøl (2024)",
    "dato": "2024-11-12",
    "abv": 7.7,
    "sesong": "Jol",
    "mjostolen": true,
    "tekst": [
      "9. november 2024 samla fjordbryggeria (Svein og Jo Bjørnar) seg atter ein gong i bryggeløo. Denne gongen var utgangspunktet 15 kg pilsner-, og 15 kg Munichmalt, flust med brakje frå Olastøl, humle (Cascade og Amarillo), samt mykje godt humør. Vonar ølet treff, og at det bidrar til jolestemning for deg og dine. Håo, håo, håo!"
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-jolastol-2024/6056551"
  },
  {
    "id": "solastol-2024",
    "namn": "Solastøl (2024)",
    "dato": "2024-07-03",
    "abv": 8.3,
    "sesong": "Sommar",
    "mjostolen": false,
    "tekst": [
      "Sommaren er på plass, og det er òg behovet for eit lettdrikkeleg heimabrygg som lar deg halde energinivået oppe, og naboar og gjester i ekstra godt humør. Brakjen er henta på Olastøl, derav navnet. Ellers er det pur pilsnermalt, Vossakveik, humle type Amarillo og Cascade - og ikkje minst vatn frå gamlebrønnen. Lat oss ikkje gløyme bryggekarane Svein, Magnus og Jo Bjørnar, og gjestar som kikka innom i løpet av dagen. God sommar!"
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-solastol-2024/5893884"
  },
  {
    "id": "taoskjen-i-paoskjen-full-oppstandelse-2024",
    "namn": "Taoskjen I Paoskjen (Full Oppstandelse) 2024",
    "dato": "2024-03-31",
    "abv": 8.5,
    "sesong": "Vår",
    "mjostolen": true,
    "tekst": [
      "Vår og paoskje! Kva er det å ikkje lika med den slags? Kvitt på toppen av Nesheimshorgi, grønt på bakkane. Det einaste som manglar då er litt heimabrygg, denne gongen tilbake til pur pilsnermalt, Vossakveik, humle type Amarillo og Cascade - og ikkje minst vatn frå gamlebrønnen. Lat oss ikkje gløyme bryggekarane Svein og Jo Bjørnar, og gjestar som kikka innom i løpet av dagen. God påske!"
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-taoskjen-i-paoskjen-full-oppstandelse-2024/5771587"
  },
  {
    "id": "og-eg-eg-kjem-fra-kinsarvik",
    "namn": "Og Eg - Eg Kjem Frå Kinsarvik",
    "dato": "2023-11-19",
    "abv": 8.5,
    "sesong": "Jol",
    "mjostolen": false,
    "tekst": [
      "Då var det på tide med årets joleøl. Denne gongen spelar gutane opp til dans med både pilsner- og munich-malt. Brakjen kom smygande inn fjorden frå Kinsarvik - derav tittelen. Kveiken er fortsatt frå Voss, sjølv om det går rykter om at den kosar seg veldig i Granvin òg. Ellers kan det nemnast at ølet fekk stå på badet til \"Besto\" og godgjera seg, noko som med stort sannsyn gjorde noko med smaken.",
      "Bryggekarar denne gongen var Jo Bjørnar og Svein, med mange hyggelege besøk i løpet av dagen."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-og-eg-eg-kjem-fra-kinsarvik/5612600"
  },
  {
    "id": "haustavloysar-2023",
    "namn": "Haustavløysar (2023)",
    "dato": "2023-08-13",
    "abv": 8.0,
    "sesong": "Haust",
    "mjostolen": false,
    "tekst": [
      "Sommaren er dessverre på hell. Når du har drikke opp Mjøstølen sitt Postludium, så kan du kalla på haustavløysaren for å gje deg fine stunder utover seinsommaren og hausten. Nett når du treng det, og fortjener det. Brygga 5. august i det nye bryggerommet i løo, oppskåka 13. august. Brakje frå Olastøl, kveik frå Voss. Bryggekarar var Jo Bjørnar og Svein."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-haustavloysar-2023/5485169"
  },
  {
    "id": "kosa-i-osa",
    "namn": "Kosa i Osa",
    "dato": "2023-06-01",
    "abv": 7.8,
    "sesong": "Vår",
    "mjostolen": false,
    "tekst": [
      "Ein vårkåt bryggelåve stilte opp for og med låvebrygg, med brakje frå Norddalen i Osa og kveik frå Voss. Brygging 20. mai 2023, oppskåka 1. juni."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-kosa-i-osa/5383389"
  },
  {
    "id": "hjemmebrogg-2023",
    "namn": "Hjemmebrogg (2023)",
    "dato": "2023-02-25",
    "abv": 8.0,
    "sesong": "Vinter",
    "mjostolen": false,
    "tekst": [
      "Me går attende til kombinasjonen av eldgamle tradisjonar og moderne og framoverlente byfisar. Vill eksperimentering med brakje frå Bydn (Herlandsfjellet, Bjørndalen, Bergen). Kveik frå Voss.",
      "Brygga 18. februar 2023, i ein forblåst og kald - men akk så koseleg - låve i Hausnes. Bryggekarar: Svein, Jo Bjørnar, Knut, Stian og fleire gjestedrikkarar."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-hjemmebrogg-2023/5252061"
  },
  {
    "id": "aust-moter-vest-haust-og-fest-2022",
    "namn": "Aust Møter Vest. Haust og Fest. (2022)",
    "dato": "2022-09-20",
    "abv": 8.3,
    "sesong": "Haust",
    "mjostolen": true,
    "tekst": [
      "Hausnesbrogg og Mjøstølen fekk med seg mange gode vener og hjelparar frå både Austlandet og Vestlandet for å laga årets haustøl. Brakje (einer) frå Olastøl, kveik frå Kjetil Dale, pilsnermalt. Bryggedato 11. september, oppskåka 20. september."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-aust-moter-vest-haust-og-fest-2022/5029252"
  },
  {
    "id": "sommarsol-2022",
    "namn": "Sommarsøl (2022)",
    "dato": "2022-06-04",
    "abv": 8.5,
    "sesong": "Sommar",
    "mjostolen": true,
    "tekst": [
      "Sommaren er redda. Lyst og lettdrikkeleg heimabrygg på gamlemåten, men akt deg for styrken. Brakje frå Espelandsdalen, kveik frå Kjetil Dale. Hausnesbrogg og Mjøstølen Bryggeri koste seg ute i tunet i Hausnes 28. mai. Oppskåka 4. juli. Me ynskjer god sommar!"
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-sommarsol/4872632"
  },
  {
    "id": "taoskjen-i-paoskjen-2022",
    "namn": "Taoskjen i Paoskjen (2022)",
    "dato": "2022-04-16",
    "abv": 5.0,
    "sesong": "Vår",
    "mjostolen": false,
    "tekst": [
      "Kjetil Dale \"tek ein Hausnes\" med berre pilsnermalt. Men, desto meir brakjelåg og dertil høyrande smak. Passar utmerka til påske og det du måtte finna på då."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-taoskjen-i-paoskjen-2022/4800641"
  },
  {
    "id": "jolastol-2021",
    "namn": "Jolastøl (2021)",
    "dato": "2021-12-25",
    "abv": 5.0,
    "sesong": "Jol",
    "mjostolen": true,
    "tekst": [
      "Joleøl med ingrediensar frå Olastøl og kveik frå Kjetil Dale (på Voss). Det blir fort Jolastøl, det. Laurdag 18. desember på den \"nyoppussa\" låven. Jo Bjørnar og Svein. Håo, håo, håo."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-jolastol-2021/4655604"
  },
  {
    "id": "hao-hao-frao-trao-2020",
    "namn": "Hao, Hao, Frao Trao (2020)",
    "dato": "2020-10-22",
    "abv": 7.8,
    "sesong": "Haust",
    "mjostolen": true,
    "tekst": [
      "Brygga 10. oktober 2020. Arne, Svein og Jo Bjørnar, samt flust med gjester som sjekka innom i løpet av dagen."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-hao-hao-frao-trao-2020/4019168"
  },
  {
    "id": "vaoryr-mai-2020",
    "namn": "Vaoryr (mai 2020)",
    "dato": "2020-06-01",
    "abv": 8.0,
    "sesong": "Vår",
    "mjostolen": false,
    "tekst": [
      "Brygga våren 2020 (mai). Arne, Svein, Jo Bjørnar, med små hint av Jarle og Elisabeth. Litt meir vassent enn vanleg, men det passar gjerne for eit vårøl?"
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-vaoryr-mai-2020/3809278"
  },
  {
    "id": "hao-hao-frao-trao-2019",
    "namn": "Hao, Hao, Frao Trao (2019)",
    "dato": "2019-12-22",
    "abv": 5.0,
    "sesong": "Jol",
    "mjostolen": false,
    "tekst": [
      "Joleøl, 2019. Brygga på Trå. Slutten av november. Arne, Svein, Stian og Jo Bjørnar."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-hao-hao-frao-trao-2019/3594178"
  },
  {
    "id": "hjemmebrogg-2019",
    "namn": "Hjemmebrogg (2019)",
    "dato": "2019-04-05",
    "abv": 6.0,
    "sesong": "Vår",
    "mjostolen": false,
    "tekst": [
      "Brygga på Holven i mars, 2019, i Arne sitt lysthus. Svein, Stian, Jo Bjørnar og bryggemester Arne."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-hjemmebrogg-2019/3161438"
  },
  {
    "id": "hausnesbrogg-2018",
    "namn": "Hausnesbrogg (2018)",
    "dato": "2018-12-25",
    "abv": 4.0,
    "sesong": "Jol",
    "mjostolen": false,
    "tekst": [
      "Desember 2018. Lite alkohol. Litt søtt. Nummenumm."
    ],
    "untappd": "https://untappd.com/b/hausnesbrogg-hausnesbrogg-2018/3007883"
  }
];
