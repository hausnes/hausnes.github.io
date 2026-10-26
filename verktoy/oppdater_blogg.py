#!/usr/bin/env python3
"""
Vedlikehald av bloggen i blogg/.

Nytt innlegg (lagar blogg/tur-til-oksen.html frå verktoy/mal-innlegg.html):
    python3 verktoy/oppdater_blogg.py ny "Tur til Oksen" -k fjell -k turtips

Etter at du har skrive eller endra innlegg:
    python3 verktoy/oppdater_blogg.py
Det byggjer blogg/index.html, feed.xml og sitemap.xml på nytt, og oppdaterer
lenkjene til førre og neste innlegg nedst i kvart innlegg.

Skriptet les opplysningane frå <head> i kvart innlegg:
    <title>                                   tittelen
    <meta name="description">                 samandrag i Google og i oversikta
    <meta property="article:published_time">  publiseringsdato (manglar den, er fila ei vanleg side)
    <meta name="kategoriar">                  kategoriar, skilde med mellomrom
    <meta name="miniatyr">                    valfritt: bilete i oversikta (elles det første biletet)
"""
import argparse
import html
import json
import re
import sys
import unicodedata
from datetime import datetime
from email.utils import format_datetime
from pathlib import Path
from urllib.parse import quote

ROT = Path(__file__).resolve().parent.parent
BLOGG = ROT / 'blogg'
MAL = Path(__file__).resolve().parent / 'mal-innlegg.html'
DOMENE = 'https://www.hausnes.no'
NAMN = 'Jo Bjørnar Hausnes'
MÅNADER = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli',
           'august', 'september', 'oktober', 'november', 'desember']
# Alle kategoriar (adressenamn -> namn). Legg til nye her.
KATEGORIAR = {
    'fjell': 'Fjell',
    'turtips': 'Turtips',
    'teknologi': 'Teknologi',
    'media': 'Media',
    'foto': 'Foto',
    'video': 'Video',
    'musikk-media': 'Musikk',
    'engelsk': 'Engelsk',
}
# Kategoriane som får ein filterknapp i bloggoversikta
FILTER = ['fjell', 'turtips', 'teknologi', 'media']
# Hovudmenyen, same som på startsida. Relative lenkjer går frå blogg/.
HOVUDMENY = [
    ('../#framheva', 'I søkelyset'),
    ('../#prosjekt', 'Prosjekt'),
    ('index.html', 'Blogg'),
    ('../#om-meg', 'Om meg'),
    ('https://github.com/hausnes', 'GitHub ↗'),
]
# Lenkjer i botnen på alle bloggsider
EKSTERNE_LENKJER = [
    ('GitHub', 'https://github.com/hausnes'),
    ('YouTube', 'https://www.youtube.com/channel/UC1q2lz8bgTEe8jV9CIkBgew'),
    ('Foto', 'https://goo.gl/photos/qQYYQutRirPbMuCX8'),
]
SKILDRING_MAL = 'Skriv eit kort samandrag her. Det blir vist i Google og i oversikta.'

FAVICON = ("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>"
           "<text y='.9em' font-size='90'>⛰️</text></svg>")
SKRIFTER = ('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;'
            '12..96,800&family=Inter:wght@400;500;600&display=swap')


def slugify(tekst):
    tekst = unicodedata.normalize('NFC', tekst.lower()).replace('æ', 'ae').replace('ø', 'o').replace('å', 'a')
    return re.sub(r'[^a-z0-9]+', '-', tekst).strip('-') or 'utan-tittel'


def norsk_dato(dato):
    return f'{dato.day}. {MÅNADER[dato.month - 1]} {dato.year}'


# ---------------------------------------------------------------------------
# Felles sideoppsett (blir òg brukt av wordpress_til_statisk.py)
# ---------------------------------------------------------------------------

def head(tittel, sti, skildring='', bilete=None, lang='no', og_type='website', ekstra='', ressursar=''):
    """ressursar: relativ veg til blogg/ for stilark og skript ('' for sider i blogg/)."""
    t = html.escape(tittel)
    s = html.escape(skildring)
    url = html.escape(DOMENE + quote(sti))
    linjer = [
        '<!DOCTYPE html>',
        f'<html lang="{lang}">',
        '<head>',
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        f'    <title>{t}</title>',
    ]
    if skildring:
        linjer.append(f'    <meta name="description" content="{s}">')
    linjer += [
        f'    <link rel="canonical" href="{url}">',
        f'    <meta property="og:title" content="{t}">',
        f'    <meta property="og:type" content="{og_type}">',
        f'    <meta property="og:url" content="{url}">',
        f'    <meta property="og:site_name" content="{NAMN}">',
    ]
    if skildring:
        linjer.append(f'    <meta property="og:description" content="{s}">')
    if bilete:
        linjer.append(f'    <meta property="og:image" content="{DOMENE}/blogg/{bilete}">')
    linjer += [
        f'    <link rel="icon" href="{FAVICON}">',
        '    <link rel="preconnect" href="https://fonts.googleapis.com">',
        '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        f'    <link href="{SKRIFTER}" rel="stylesheet">',
        f'    <link rel="stylesheet" href="{ressursar}../felles.css">',
        f'    <link rel="stylesheet" href="{ressursar}blogg.css">',
        f'    <link rel="alternate" type="application/rss+xml" title="{NAMN} – blogg" href="{ressursar}feed.xml">',
        f'    <script src="{ressursar}../felles.js" defer></script>',
    ]
    if ekstra:
        linjer.append(ekstra)
    linjer.append('</head>')
    return '\n'.join(linjer)


def topp(ressursar=''):
    lenkjer = []
    for url, namn in HOVUDMENY:
        ekstern = url.startswith('http')
        klasse = ' class="nav-github"' if ekstern else ''
        gjeldande = ' aria-current="page"' if url == 'index.html' else ''
        lenkjer.append(f'                <a href="{url if ekstern else ressursar + url}"{klasse}{gjeldande}>'
                       f'{html.escape(namn)}</a>')
    return f'''<body>
    <a class="hopp" href="#hovudinnhald">Hopp til innhaldet</a>

    <div class="sidetopp">
        <header class="toppfelt">
            <a class="logo" href="{ressursar}../">JBH<span>.</span></a>
            <button class="menyknapp" type="button" aria-expanded="false" aria-controls="hovudmeny" aria-label="Opne meny" hidden>
                <span class="menyknapp-strekar" aria-hidden="true"></span>
            </button>
            <nav id="hovudmeny" aria-label="Hovudmeny">
{chr(10).join(lenkjer)}
            </nav>
        </header>
    </div>
    <!-- /topp -->
'''


def botn(ressursar=''):
    lenkjer = ' ·\n'.join(f'                <a href="{url}">{namn}</a>' for namn, url in EKSTERNE_LENKJER)
    return f'''    <footer class="botn">
        <div class="innhald botn-innhald">
            <p>© <span id="aar">{datetime.now().year}</span> <a href="{ressursar}../">{NAMN}</a></p>
            <p class="botn-lenkjer">
{lenkjer} ·
                <a href="{ressursar}feed.xml">RSS</a>
            </p>
        </div>
    </footer>
'''


def side(hovud, innhald, skript='', ressursar='', brei=False):
    klasse = 'ramme ramme-brei' if brei else 'ramme'
    return (f'{hovud}\n{topp(ressursar)}    <main id="hovudinnhald" class="{klasse}">\n{innhald}\n    </main>\n'
            f'{botn(ressursar)}{skript}</body>\n</html>\n')


def innleggsside(tittel, fil, innhald, *, dato=None, endra=None, kategoriar=(), skildring='',
                 bilete=None, miniatyr=None, lang='no', toppen='', wordpress_id=None):
    """Eit heilt innlegg. Utan dato blir det ei vanleg side.
    wordpress_id: ID frå WordPress, slik at gamle kortlenkjer (?p=123) finn fram."""
    sti = '/blogg/' + fil
    ekstra = ''
    meta = ''
    if dato:
        ld = {
            '@context': 'https://schema.org', '@type': 'BlogPosting',
            'headline': tittel, 'datePublished': dato.isoformat(),
            'dateModified': (endra or dato).isoformat(),
            'author': {'@type': 'Person', 'name': NAMN, 'url': DOMENE + '/'},
            'mainEntityOfPage': DOMENE + quote(sti),
        }
        if bilete or miniatyr:
            ld['image'] = f'{DOMENE}/blogg/{bilete or miniatyr}'
        linjer = [f'    <meta property="article:published_time" content="{dato.isoformat()}">',
                  f'    <meta property="article:modified_time" content="{(endra or dato).isoformat()}">',
                  f'    <meta name="kategoriar" content="{" ".join(kategoriar)}">']
        if miniatyr:
            linjer.append(f'    <meta name="miniatyr" content="{miniatyr}">')
        if wordpress_id:
            linjer.append(f'    <meta name="wordpress-id" content="{wordpress_id}">')
        linjer += [f'    <meta property="article:section" content="{html.escape(KATEGORIAR.get(k, k))}">'
                   for k in kategoriar]
        linjer.append(f'    <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>')
        ekstra = '\n'.join(linjer)
        kat = ', '.join(f'<a href="index.html?kategori={k}">{html.escape(KATEGORIAR.get(k, k))}</a>'
                        for k in kategoriar)
        dato_html = f'<time datetime="{dato:%Y-%m-%d}">{norsk_dato(dato)}</time>'
        meta = f'                <p class="meta">{dato_html}{" · " + kat if kat else ""}</p>\n'
    hovud = head(f'{tittel} – {NAMN}', sti, skildring, bilete or miniatyr, lang,
                 'article' if dato else 'website', ekstra)
    innhald = f'''        <article class="innlegg">
            <header class="innlegg-hovud">
                <p class="overtittel"><a href="index.html">Blogg</a></p>
                <h1>{html.escape(tittel)}</h1>
{meta}            </header>
            {toppen}
            <div class="innleggstekst">
{innhald}
            </div>
        </article>'''
    skript = '    <script src="kart.js" defer></script>\n' if 'gpx-kart' in innhald else ''
    return side(hovud, innhald, skript)


# ---------------------------------------------------------------------------
# Lesing av innlegga i blogg/
# ---------------------------------------------------------------------------

def meta_innhald(tekst, namn):
    m = re.search(rf'<meta (?:name|property)="{re.escape(namn)}" content="([^"]*)"', tekst)
    return html.unescape(m[1]) if m else None


def les_innlegg():
    innlegg, sider = [], []
    for fil in sorted(BLOGG.glob('*.html')):
        if fil.name == 'index.html':
            continue
        tekst = fil.read_text(encoding='utf-8')
        tittel = re.search(r'<title>(.*?)</title>', tekst, re.S)
        e = {
            'fil': fil.name,
            'sti': '/blogg/' + fil.name,
            'tittel': html.unescape(tittel[1]).removesuffix(f' – {NAMN}').strip() if tittel else fil.stem,
            'skildring': meta_innhald(tekst, 'description') or '',
            'tekst': tekst,
        }
        publisert = meta_innhald(tekst, 'article:published_time')
        if not publisert:
            sider.append(e)
            continue
        e['dato'] = datetime.fromisoformat(publisert)
        e['endra'] = datetime.fromisoformat(meta_innhald(tekst, 'article:modified_time') or publisert)
        e['kategoriar'] = (meta_innhald(tekst, 'kategoriar') or '').split()
        miniatyr = meta_innhald(tekst, 'miniatyr')
        if not miniatyr:
            første = re.search(r'<div class="innleggstekst">.*?<img [^>]*src="(bilete/[^"]+)"', tekst, re.S)
            miniatyr = første[1] if første else None
        e['miniatyr'] = miniatyr
        innlegg.append(e)
    innlegg.sort(key=lambda e: e['dato'], reverse=True)
    return innlegg, sider


# ---------------------------------------------------------------------------
# Oversikt, RSS, sitemap og førre/neste
# ---------------------------------------------------------------------------

def oversiktsside(innlegg):
    kort = []
    for e in innlegg:
        bilete = (f'<img src="{e["miniatyr"]}" alt="" loading="lazy">' if e['miniatyr']
                  else '<div class="tomt-bilete" aria-hidden="true">⛰️</div>')
        kategoriar = ''.join(f'<li>{html.escape(KATEGORIAR.get(k, k))}</li>' for k in e['kategoriar'])
        kort.append(f'''            <li data-kategoriar="{' '.join(e['kategoriar'])}">
                <a class="innleggskort" href="{e["fil"]}">
                    <div class="kort-bilete">{bilete}</div>
                    <div class="kort-tekst">
                        <p class="meta"><time datetime="{e["dato"]:%Y-%m-%d}">{norsk_dato(e["dato"])}</time></p>
                        <h2>{html.escape(e["tittel"])}</h2>
                        <p>{html.escape(e["skildring"])}</p>
                        <ul class="taggar">{kategoriar}</ul>
                    </div>
                </a>
            </li>''')
    tal = {k: sum(k in e['kategoriar'] for e in innlegg) for k in FILTER}
    knappar = [f'            <a class="filterknapp" href="index.html">Alle <span class="filtertal">{len(innlegg)}</span></a>']
    knappar += [f'            <a class="filterknapp" href="index.html?kategori={k}">{html.escape(KATEGORIAR[k])} '
                f'<span class="filtertal">{tal[k]}</span></a>' for k in FILTER]
    ingress = 'Turskildringar med kart og GPS-ruter, og litt om teknologi, foto og film.'
    hovud = head(f'Blogg – {NAMN}', '/blogg/', ingress)
    innhald = f'''        <header class="blogg-hovud">
            <p class="overtittel">Blogg</p>
            <h1 id="overskrift">Turar, fjell og teknologi</h1>
            <p class="ingress">{ingress}</p>
        </header>
        <nav class="filterknappar" aria-label="Kategoriar">
{chr(10).join(knappar)}
        </nav>
        <ul class="innleggsliste">
{chr(10).join(kort)}
        </ul>'''
    # Gamle WordPress-kortlenkjer som /blogg/?p=123 hamnar på denne sida
    kortlenkjer = {}
    for e in innlegg:
        m = re.search(r'<meta name="wordpress-id" content="(\d+)"', e['tekst'])
        if m:
            kortlenkjer[m[1]] = e['fil']
    skript = f'''    <script>
    // Filter på kategori: index.html?kategori=fjell
    const kategoriar = {json.dumps(KATEGORIAR, ensure_ascii=False)};
    const kortlenkjer = {json.dumps(kortlenkjer)};
    const parameter = new URLSearchParams(location.search);
    const gammalId = parameter.get('p') || parameter.get('page_id');
    if (gammalId && kortlenkjer[gammalId]) location.replace(kortlenkjer[gammalId]);

    const valt = kategoriar[parameter.get('kategori')] ? parameter.get('kategori') : null;
    if (valt) {{
        document.getElementById('overskrift').textContent = kategoriar[valt];
        document.title = kategoriar[valt] + ' – {NAMN}';
        document.querySelectorAll('.innleggsliste > li').forEach(li => {{
            li.hidden = !li.dataset.kategoriar.split(' ').includes(valt);
        }});
    }}
    document.querySelectorAll('.filterknapp').forEach(a => {{
        if (new URL(a.href).searchParams.get('kategori') === valt) a.setAttribute('aria-current', 'page');
    }});
    </script>
'''
    return side(hovud, innhald, skript, brei=True)


def rss(innlegg):
    element = []
    for e in innlegg:
        url = DOMENE + quote(e['sti'])
        element.append(f'''    <item>
      <title>{html.escape(e["tittel"])}</title>
      <link>{url}</link>
      <guid>{url}</guid>
      <pubDate>{format_datetime(e["dato"].astimezone())}</pubDate>
      <description>{html.escape(e["skildring"])}</description>
    </item>''')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>{NAMN}</title>
    <link>{DOMENE}/blogg/</link>
    <description>Fjell, tur og teknologi</description>
    <language>no</language>
{chr(10).join(element)}
  </channel>
</rss>
'''


def sitemap(innlegg, sider):
    adresser = [('/', None), ('/blogg/', innlegg[0]['endra'] if innlegg else None)]
    adresser += [(e['sti'], e['endra']) for e in innlegg]
    adresser += [(e['sti'], None) for e in sider]
    rader = []
    for sti, endra in adresser:
        lastmod = f'<lastmod>{endra:%Y-%m-%d}</lastmod>' if endra else ''
        rader.append(f'  <url><loc>{DOMENE}{quote(sti)}</loc>{lastmod}</url>')
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + '\n'.join(rader) + '\n</urlset>\n')


def førre_neste(forrige, neste):
    if not forrige and not neste:
        return ''
    linjer = ['        <nav class="forrige-neste">']
    if forrige:
        linjer.append(f'            <a class="forrige" href="{forrige["fil"]}"><span>← Eldre</span>'
                      f'{html.escape(forrige["tittel"])}</a>')
    if neste:
        linjer.append(f'            <a class="neste" href="{neste["fil"]}"><span>Nyare →</span>'
                      f'{html.escape(neste["tittel"])}</a>')
    linjer.append('        </nav>')
    return '\n'.join(linjer) + '\n'


def skriv_om_endra(fil, innhald):
    """Skriv berre når innhaldet faktisk er endra. Gir True om fila vart skriven."""
    if fil.exists() and fil.read_text(encoding='utf-8') == innhald:
        return False
    fil.write_text(innhald, encoding='utf-8')
    return True


def forny_ramme(tekst, ressursar=''):
    """Byt ut toppfeltet (meny) og botnen med gjeldande versjon, slik at endringar
    i HOVUDMENY, topp() eller botn() kjem med i alle sider."""
    tekst = re.sub(r'<body>\n.*?<!-- /topp -->\n', lambda _: topp(ressursar), tekst, count=1, flags=re.S)
    return re.sub(r'    <footer class="botn">.*?</footer>\n', lambda _: botn(ressursar), tekst,
                  count=1, flags=re.S)


def oppdater():
    innlegg, sider = les_innlegg()
    endra = []

    # Meny og botn i alle sider, førre/neste nedst i kvart innlegg, og kart.js der det er GPS-kart
    kronologisk = list(reversed(innlegg))
    for i, e in enumerate(kronologisk):
        forrige = kronologisk[i - 1] if i > 0 else None
        neste = kronologisk[i + 1] if i + 1 < len(kronologisk) else None
        tekst = forny_ramme(e['tekst'])
        tekst = re.sub(r'        <nav class="forrige-neste">.*?</nav>\n', '', tekst, flags=re.S)
        tekst = tekst.replace('    </main>', førre_neste(forrige, neste) + '    </main>', 1)
        if 'class="gpx-kart"' in tekst and 'src="kart.js"' not in tekst:
            tekst = tekst.replace('</body>', '    <script src="kart.js" defer></script>\n</body>', 1)
        if skriv_om_endra(BLOGG / e['fil'], tekst):
            endra.append(e['fil'])
    for e in sider:
        if skriv_om_endra(BLOGG / e['fil'], forny_ramme(e['tekst'])):
            endra.append(e['fil'])
    side_404 = ROT / '404.html'
    if side_404.exists() and skriv_om_endra(side_404, forny_ramme(side_404.read_text(encoding='utf-8'), '/blogg/')):
        endra.append('../404.html')

    for namn, innhald in (('index.html', oversiktsside(innlegg)),
                          ('feed.xml', rss(innlegg[:20])),
                          ('sitemap.xml', sitemap(innlegg, sider))):
        if skriv_om_endra(BLOGG / namn, innhald):
            endra.append(namn)

    print(f'{len(innlegg)} innlegg og {len(sider)} sider i blogg/.')
    if not endra:
        print('Oppdatert: ingenting (alt var oppdatert)')
    elif len(endra) > 6:
        print(f'Oppdatert: {len(endra)} filer')
    else:
        print('Oppdatert: ' + ', '.join(endra))
    for e in innlegg:
        if e['skildring'] in ('', SKILDRING_MAL):
            print(f'Åtvaring: {e["fil"]} manglar samandrag (<meta name="description">).')
        for k in e['kategoriar']:
            if k not in KATEGORIAR:
                print(f'Åtvaring: {e["fil"]} har ukjend kategori «{k}». Legg han til i KATEGORIAR.')
        if 'Skriv innlegget her' in e['tekst']:
            print(f'Åtvaring: {e["fil"]} inneheld framleis teksten frå malen.')


def nytt_innlegg(tittel, kategoriar, slug=None):
    ukjende = [k for k in kategoriar if k not in KATEGORIAR]
    if ukjende:
        sys.exit(f'Ukjend kategori: {", ".join(ukjende)}. Vel mellom: {", ".join(KATEGORIAR)}')
    fil = f'{slug or slugify(tittel)}.html'
    if (BLOGG / fil).exists():
        sys.exit(f'blogg/{fil} finst allereie. Vel eit anna namn med --namn.')
    nå = datetime.now().replace(microsecond=0)
    innhald = MAL.read_text(encoding='utf-8').rstrip('\n')
    (BLOGG / fil).write_text(innleggsside(tittel, fil, innhald, dato=nå, kategoriar=kategoriar,
                                          skildring=SKILDRING_MAL), encoding='utf-8')
    print(f'Laga blogg/{fil}')
    print('1. Skriv innlegget, og byt ut samandraget i <meta name="description"> øvst i fila.')
    print('2. Legg bilete i blogg/bilete/ og GPS-ruter i blogg/gpx/.')
    print('3. Køyr python3 verktoy/oppdater_blogg.py for å få innlegget inn i oversikta.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    underkommandoar = parser.add_subparsers(dest='kommando')
    ny = underkommandoar.add_parser('ny', help='lag eit nytt innlegg frå malen')
    ny.add_argument('tittel')
    ny.add_argument('-k', '--kategori', action='append', default=[], help=f'ein av: {", ".join(KATEGORIAR)}')
    ny.add_argument('--namn', help='filnamn utan .html (standard: laga frå tittelen)')
    argument = parser.parse_args()
    if argument.kommando == 'ny':
        nytt_innlegg(argument.tittel, argument.kategori, argument.namn)
    else:
        oppdater()
