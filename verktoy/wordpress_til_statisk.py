#!/usr/bin/env python3
"""
Gjer om WordPress-eksporten (XML) til statiske HTML-sider under blogg/.

Køyr frå rota av repoet:
    python3 verktoy/wordpress_til_statisk.py
Test lokalt:
    python3 -m http.server     og opne http://localhost:8000/blogg/

Resultat:
    blogg/index.html      oversikt over alle innlegg, med filter på kategori
    blogg/<slug>.html     eitt innlegg per fil (slug = adressenamnet frå WordPress)
    blogg/om-meg.html
    blogg/bilete/         alle bilete som innlegga brukar
    blogg/gpx/            GPS-rutene
    404.html              sender gamle WordPress-adresser vidare til nye

- Utkast hamnar i utkast/ (ligg i .gitignore, blir ikkje publisert).
- Private innlegg blir ikkje med, og heller ikkje bileta som berre dei brukar.

Skriptet er meint for éi overføring. Det nektar å skrive over ei eksisterande
blogg/-mappe utan --overskriv, slik at handskrivne innlegg ikkje forsvinn.
"""
import argparse
import html
import json
import re
import shutil
import sys
import unicodedata
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlsplit

from oppdater_blogg import (KATEGORIAR, NAMN, head, innleggsside, norsk_dato, oppdater, side,
                            slugify)

ROT = Path(__file__).resolve().parent.parent
BACKUP = ROT / 'backup-wordpress-okt-2026'
VERTAR = {'hausnes.no', 'www.hausnes.no'}
NS = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
}
# Innlegg og sider frå WordPress som ikkje skal vere med vidare, og nye filnamn for dei som skal
SIDER_UTE = {'kontakt'}
INNLEGG_UTE = {'flash-as3-pong-game', 'as3-avrunde-desimaltal-round-decimals', 'deathtrip-2012-bergen-handelsgymnasium'}
NYE_FILNAMN = {'gullfjellet-987': 'gullfjellet-bergen'}
# Sider som har fått ein ny heim utanfor bloggen: gamle adresser blir sende hit
SIDER_FLYTTA = {'about-me': '/#om-meg'}
BILETE_ENDINGAR = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}

åtvaringar = []


def åtvar(melding):
    åtvaringar.append(melding)


def nfc(tekst):
    return unicodedata.normalize('NFC', tekst)


def rein_tekst(innhald):
    tekst = re.sub(r'<(script|style|pre)\b.*?</\1>', ' ', innhald, flags=re.S | re.I)
    tekst = re.sub(r'<[^>]+>', ' ', tekst)
    tekst = re.sub(r'\[/?[a-z_]+[^\]]*\]', ' ', tekst)
    return re.sub(r'\s+', ' ', html.unescape(tekst)).strip()


def kort_tekst(tekst, lengd):
    if len(tekst) <= lengd:
        return tekst
    return tekst[:lengd].rsplit(' ', 1)[0].rstrip(',.:;–- ') + ' …'


def normaliser_sti(sti):
    sti = nfc(unquote(sti))
    if not sti.endswith('/') and '.' not in sti.rsplit('/', 1)[-1]:
        sti += '/'
    return sti


# ---------------------------------------------------------------------------
# Lesing av eksporten
# ---------------------------------------------------------------------------

def les_eksport(sti):
    rå = sti.read_text(encoding='utf-8')
    # Eksporten inneheld nokre kontrollteikn som ikkje er lovlege i XML
    rå = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', rå)
    kanal = ET.fromstring(rå).find('channel')
    element = []
    for it in kanal.findall('item'):
        def felt(namn):
            return it.findtext(namn, default='', namespaces=NS) or ''
        meta = {}
        for m in it.findall('wp:postmeta', NS):
            meta.setdefault(m.findtext('wp:meta_key', namespaces=NS), []).append(
                m.findtext('wp:meta_value', default='', namespaces=NS) or '')
        element.append({
            'id': int(felt('wp:post_id')),
            'type': felt('wp:post_type'),
            'status': felt('wp:status'),
            'tittel': nfc(html.unescape(felt('title'))),
            'lenkje': felt('link'),
            'slug': nfc(unquote(felt('wp:post_name'))),
            'dato': datetime.strptime(felt('wp:post_date'), '%Y-%m-%d %H:%M:%S'),
            'endra': datetime.strptime(felt('wp:post_modified'), '%Y-%m-%d %H:%M:%S'),
            'forelder': int(felt('wp:post_parent') or 0),
            'innhald': nfc(felt('content:encoded')),
            'vedlegg_url': nfc(felt('wp:attachment_url')),
            'kategoriar': [(c.get('nicename'), nfc(html.unescape(c.text or '')))
                           for c in it.findall('category') if c.get('domain') == 'category'],
            'stikkord': [(c.get('nicename'), nfc(html.unescape(c.text or '')))
                         for c in it.findall('category') if c.get('domain') == 'post_tag'],
            'meta': meta,
        })
    return element


# ---------------------------------------------------------------------------
# Opplasta filer (bilete og GPX) i backupen
# ---------------------------------------------------------------------------

class Opplastingar:
    def __init__(self, mappe):
        self.mappe = mappe
        self.filer = {}       # relativ sti -> fil
        self.etter_namn = {}  # filnamn -> fil
        self.variantar = {}   # originalnamn -> [(breidd, filnamn)]
        for fil in sorted(mappe.rglob('*')):
            if not fil.is_file() or 'cache' in fil.parts or '~cache' in fil.parts or fil.name.startswith('.'):
                continue
            rel = nfc(fil.relative_to(mappe).as_posix())
            self.filer[rel] = fil
            self.etter_namn.setdefault(nfc(fil.name), rel)
            m = re.match(r'(.+)-(\d+)x(\d+)(\.\w+)$', nfc(fil.name))
            if m:
                self.variantar.setdefault(m[1] + m[4], []).append((int(m[2]), rel))

    def finn(self, rel):
        """Gir relativ sti til fila i backupen, eller None."""
        rel = nfc(unquote(rel)).lstrip('/')
        if rel in self.filer:
            return rel
        namn = rel.rsplit('/', 1)[-1]
        if namn in self.etter_namn:
            return self.etter_namn[namn]
        # Storleiksvariant som manglar: fall tilbake til originalen
        m = re.match(r'(.+)-\d+x\d+(\.\w+)$', namn)
        if m and m[1] + m[2] in self.etter_namn:
            return self.etter_namn[m[1] + m[2]]
        return None

    def miniatyr(self, rel, min_breidd=400):
        """Vel ein passande liten variant av eit bilete til oversiktssider."""
        namn = rel.rsplit('/', 1)[-1]
        m = re.match(r'(.+)-\d+x\d+(\.\w+)$', namn)
        original = m[1] + m[2] if m else namn
        # Store bilete har WordPress skalert ned til «-scaled», men variantane er laga frå originalnamnet
        original = re.sub(r'-scaled(\.\w+)$', r'\1', original)
        kandidatar = sorted(v for v in self.variantar.get(original, []))
        store_nok = [v for v in kandidatar if v[0] >= min_breidd]
        if store_nok:
            return store_nok[0][1]
        return self.etter_namn.get(original, rel)


# ---------------------------------------------------------------------------
# wpautop: WordPress lagar avsnitt av tomme linjer i klassiske innlegg
# ---------------------------------------------------------------------------

BLOKKAR = (r'(?:table|thead|tfoot|caption|col|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|map|'
           r'area|blockquote|address|style|p|h[1-6]|hr|fieldset|legend|section|article|aside|hgroup|header|'
           r'footer|nav|figure|figcaption|details|menu|summary|iframe|object|embed|script|noscript)')


def wpautop(tekst):
    if not tekst.strip():
        return tekst
    tekst = tekst.replace('\r\n', '\n').replace('\r', '\n') + '\n'
    tekst = re.sub(r'<br\s*/?>\s*<br\s*/?>', '\n\n', tekst)
    tekst = re.sub(r'(<' + BLOKKAR + r'[\s/>])', r'\n\n\1', tekst)
    tekst = re.sub(r'(</' + BLOKKAR + r'>)', r'\1\n\n', tekst)
    tekst = re.sub(r'(<hr\s*?/?>)', r'\1\n\n', tekst)
    tekst = re.sub(r'\n\n+', '\n\n', tekst)
    avsnitt = [a for a in re.split(r'\n\s*\n', tekst) if a.strip()]
    tekst = ''.join(f'<p>{a.strip(chr(10))}</p>\n' for a in avsnitt)
    tekst = re.sub(r'<p>\s*</p>', '', tekst)
    tekst = re.sub(r'<p>([^<]+)</(div|address|form)>', r'<p>\1</p></\2>', tekst)
    tekst = re.sub(r'<p>\s*(</?' + BLOKKAR + r'[^>]*>)\s*</p>', r'\1', tekst)
    tekst = re.sub(r'<p>(<li.+?)</p>', r'\1', tekst)
    tekst = re.sub(r'<p><blockquote([^>]*)>', r'<blockquote\1><p>', tekst, flags=re.I)
    tekst = tekst.replace('</blockquote></p>', '</p></blockquote>')
    tekst = re.sub(r'<p>\s*(</?' + BLOKKAR + r'[^>]*>)', r'\1', tekst)
    tekst = re.sub(r'(</?' + BLOKKAR + r'[^>]*>)\s*</p>', r'\1', tekst)
    # Linjeskift inne i taggar skal ikkje bli til <br />
    tekst = re.sub(r'<[^>]*>', lambda m: m[0].replace('\n', ' '), tekst)
    tekst = re.sub(r'(?<!<br />)\s*\n', '<br />\n', tekst)
    tekst = re.sub(r'(</?' + BLOKKAR + r'[^>]*>)\s*<br />', r'\1', tekst)
    tekst = re.sub(r'<br />(\s*</?(?:p|li|div|dl|dd|dt|th|pre|td|ul|ol)[^>]*>)', r'\1', tekst)
    return tekst


def attributtar(tekst):
    return {k: html.unescape(v) for k, v in re.findall(r'(\w+)=["”″]([^"”″]*)["”″]', tekst)}


def video_iframe(url):
    url = html.unescape(url)
    yt = re.search(r'(?:youtube(?:-nocookie)?\.com/(?:watch\?(?:.*&)?v=|embed/|v/)|youtu\.be/)([\w-]{11})', url)
    vm = re.search(r'vimeo\.com/(?:video/)?(\d+)', url)
    if yt:
        src = f'https://www.youtube-nocookie.com/embed/{yt[1]}'
    elif vm:
        src = f'https://player.vimeo.com/video/{vm[1]}'
    else:
        return None
    return (f'<div class="video"><iframe src="{src}" title="Video" loading="lazy" '
            f'allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>')


# ---------------------------------------------------------------------------
# Nettstaden: oversikt over alle adresser
# ---------------------------------------------------------------------------

class Nettstad:
    def __init__(self, element, opplastingar):
        self.opp = opplastingar
        self.etter_id = {e['id']: e for e in element}
        publiserte = [e for e in element if e['type'] == 'post' and e['status'] == 'publish']
        self.innlegg = sorted((e for e in publiserte if e['slug'] not in INNLEGG_UTE),
                              key=lambda e: e['dato'], reverse=True)
        publiserte_sider = [e for e in element if e['type'] == 'page' and e['status'] == 'publish']
        self.sider = [e for e in publiserte_sider if e['slug'] not in SIDER_UTE | SIDER_FLYTTA.keys()]
        flytta = [e for e in publiserte_sider if e['slug'] in SIDER_FLYTTA]
        self.fjerna = ([e for e in publiserte if e['slug'] in INNLEGG_UTE]
                       + [e for e in publiserte_sider if e['slug'] in SIDER_UTE])
        self.utkast = sorted((e for e in element if e['type'] in ('post', 'page') and e['status'] == 'draft'),
                             key=lambda e: e['dato'])
        self.private = [e for e in element if e['type'] in ('post', 'page') and e['status'] == 'private']
        self.vedlegg = [e for e in element if e['type'] == 'attachment']

        for e in self.innlegg + self.sider:
            e['fil'] = NYE_FILNAMN.get(e['slug'], e['slug']) + '.html'
            e['sti'] = '/blogg/' + e['fil']
        for e in flytta:
            e['sti'] = SIDER_FLYTTA[e['slug']]

        # gammal sti -> ('side', ny sti) | ('vedlegg', vedlegg) | ('skjult', None)
        self.adresser = {}
        self.vidaresendingar = {}  # gammal sti -> ny sti, til 404.html

        for e in self.private + self.utkast + self.fjerna:
            for sti in self._mogelege_stiar(e):
                self.adresser[sti] = ('skjult', None)
        for e in self.innlegg + self.sider + flytta:
            for sti in self._mogelege_stiar(e):
                self.adresser[sti] = ('side', e['sti'])
                self.vidaresendingar[sti] = e['sti']
        for v in self.vedlegg:
            forelder = self.etter_id.get(v['forelder'])
            stiar = {normaliser_sti(urlsplit(v['lenkje']).path)}
            if forelder:
                for f_sti in self._mogelege_stiar(forelder):
                    stiar.add(f_sti + v['slug'] + '/')
            for sti in stiar:
                self.adresser.setdefault(sti, ('vedlegg', v))
                # Vedleggssider til publiserte innlegg blir sende vidare til innlegget
                if forelder and forelder.get('sti'):
                    self.vidaresendingar.setdefault(sti, forelder['sti'])

    def _mogelege_stiar(self, e):
        stiar = set()
        if e.get('lenkje') and '?' not in e['lenkje']:
            stiar.add(normaliser_sti(urlsplit(e['lenkje']).path))
        slugs = [e['slug']] + [nfc(s) for s in e['meta'].get('_wp_old_slug', [])]
        for slug in filter(None, slugs):
            stiar.add(f'/blogg/{slug}/')
            if e['type'] == 'post':
                stiar.add(f'/blogg/{e["dato"]:%Y/%m}/{slug}/')
        return stiar

    def slå_opp(self, sti, spørjing=''):
        q = parse_qs(spørjing)
        for nøkkel in ('p', 'page_id', 'attachment_id'):
            if nøkkel in q and q[nøkkel][0].isdigit():
                e = self.etter_id.get(int(q[nøkkel][0]))
                if not e:
                    return None
                if e['type'] == 'attachment':
                    return ('vedlegg', e)
                return ('side', e['sti']) if e.get('sti') else ('skjult', None)
        return self.adresser.get(normaliser_sti(sti))


# ---------------------------------------------------------------------------
# Omsetjing av innhaldet i eitt innlegg
# ---------------------------------------------------------------------------

class Omsetjar:
    """Gjer om WordPress-innhald til rein HTML og samlar filene som trengst."""

    def __init__(self, nettstad, blogg_prefiks=''):
        self.nettstad = nettstad
        self.opp = nettstad.opp
        self.blogg_prefiks = blogg_prefiks  # relativ veg til blogg/ frå sidene som blir laga
        self.filer = {}  # ut-sti (bilete/x.jpg, gpx/y.gpx) -> kjeldefil som skal kopierast
        self.manglar = set()
        self.ukjende_kodar = set()

    @staticmethod
    def ut_sti(funnen):
        namn = funnen.rsplit('/', 1)[-1]
        return ('gpx/' if namn.lower().endswith('.gpx') else 'bilete/') + namn

    def fil_url(self, rel):
        funnen = self.opp.finn(rel)
        if not funnen:
            self.manglar.add(nfc(unquote(rel)))
            return None
        ut = self.ut_sti(funnen)
        if self.filer.get(ut, self.opp.filer[funnen]) != self.opp.filer[funnen]:
            åtvar(f'To ulike filer heiter {ut}')
        self.filer[ut] = self.opp.filer[funnen]
        return quote(ut)

    def side_url(self, sti):
        """Relativ lenkje til ei side under /blogg/."""
        if not sti.startswith('/blogg/'):
            return sti
        return self.blogg_prefiks + sti.removeprefix('/blogg/')

    def vedlegg_url(self, vedlegg):
        sti = urlsplit(vedlegg['vedlegg_url']).path
        if '/wp-content/uploads/' not in sti:
            return None
        return self.fil_url(sti.split('/wp-content/uploads/', 1)[1])

    def omset(self, e):
        self.gjeldande = e
        self.plasshaldarar = []
        self.har_kart = False
        tekst = e['innhald'].replace('\r\n', '\n')
        tekst = re.sub(r'<!--\s*more\s*-->|<!--\s*noteaser\s*-->', '', tekst)
        tekst = self._vern(tekst)
        tekst = self._kortkodar(tekst)
        if '<!-- wp:' in tekst:
            tekst = self._blokker(tekst)
        else:
            tekst = wpautop(tekst)
        tekst = self._gjenopprett(tekst)
        tekst = re.sub(r'<div class="wp-block-embed__wrapper">\s*(\S+)\s*</div>',
                       lambda m: video_iframe(m[1]) or m[0], tekst)
        tekst = self._lenkjer(tekst)
        tekst = re.sub(r'\s+rel="attachment wp-att-\d+"', '', tekst)
        return tekst.strip()

    # --- plasshaldarar: innhald som ikkje skal røyrast av wpautop ---

    def _plass(self, innhald):
        self.plasshaldarar.append(innhald)
        return f'\n\n<!--PH{len(self.plasshaldarar) - 1}-->\n\n'

    def _gjenopprett(self, tekst):
        for _ in range(3):  # plasshaldarar kan innehalde plasshaldarar
            tekst = re.sub(r'<p>\s*<!--PH(\d+)-->\s*</p>|<!--PH(\d+)-->',
                           lambda m: self.plasshaldarar[int(m[1] or m[2])], tekst)
        return tekst

    def _vern(self, tekst):
        def kode(m):
            a = attributtar(m[2])
            kjelde = m[3].strip('\n')
            for _ in range(2):  # nokre kodeblokker er dobbelt koda (&amp;lt;)
                kjelde = html.unescape(kjelde)
            språk = f' class="language-{a["language"]}"' if a.get('language') else ''
            return self._plass(f'<pre><code{språk}>{html.escape(kjelde, quote=False)}</code></pre>')

        tekst = re.sub(r'\[(code|sourcecode)([^\]]*)\](.*?)\[/\1\]', kode, tekst, flags=re.S)

        def objekt(m):
            return self._plass(video_iframe(m[0]) or m[0])

        tekst = re.sub(r'<object\b.*?</object>', objekt, tekst, flags=re.S | re.I)
        tekst = re.sub(r'<(pre|script|style|iframe|table)\b.*?</\1>', lambda m: self._plass(m[0]),
                       tekst, flags=re.S | re.I)
        return tekst

    def _kortkodar(self, tekst):
        def bilettekst(m):
            a = attributtar(m[1])
            indre = m[2].strip()
            bilete = re.match(r'((?:<a [^>]*>)?\s*<img [^>]*>\s*(?:</a>)?)(.*)$', indre, re.S)
            if bilete:
                indre, tekst_ = bilete[1], bilete[2].strip()
            else:
                tekst_ = ''
            tekst_ = tekst_ or a.get('caption', '')
            breidd = f' style="max-width:{a["width"]}px"' if a.get('width', '').isdigit() else ''
            figur = f'<figure class="wp-caption {a.get("align", "alignnone")}"{breidd}>{indre}'
            if tekst_:
                figur += f'<figcaption>{tekst_}</figcaption>'
            return self._plass(figur + '</figure>')

        def galleri(m):
            a = attributtar(m[1])
            ids = [int(i) for i in re.findall(r'\d+', a.get('ids', ''))]
            if not ids:  # [gallery] utan ids: alle vedlegg til innlegget
                ids = [v['id'] for v in self.nettstad.vedlegg if v['forelder'] == self.gjeldande['id']]
            bilete = []
            for vid in ids:
                v = self.nettstad.etter_id.get(vid)
                if not v or v['type'] != 'attachment':
                    continue
                original = urlsplit(v['vedlegg_url']).path.split('/wp-content/uploads/', 1)[-1]
                full = self.fil_url(original)
                funnen = self.opp.finn(original)
                liten = self.fil_url(self.opp.miniatyr(funnen)) if funnen else None
                if full and liten:
                    alt = html.escape(v['tittel'])
                    bilete.append(f'<a href="{full}"><img src="{liten}" alt="{alt}" loading="lazy"></a>')
            kolonnar = a.get('columns', '3')
            return self._plass(f'<div class="galleri" style="--kolonnar:{kolonnar}">{"".join(bilete)}</div>')

        def gpx(m):
            a = attributtar(m[1])
            sti = a.get('gpx', '')
            url = self.fil_url(sti.split('/wp-content/uploads/', 1)[-1]) if sti else None
            if not url:
                åtvar(f'Fann ikkje GPX-fila {sti}')
                return ''
            self.har_kart = True
            return self._plass(f'<figure class="gpx"><div class="gpx-kart" data-gpx="{url}"></div>'
                               f'<figcaption><a href="{url}" download>Last ned GPS-ruta (GPX)</a></figcaption></figure>')

        def kontaktskjema(m):
            return self._plass('<p class="merknad">Kontaktskjemaet er fjerna. <!-- TODO: skriv korleis folk kan ta kontakt --></p>')

        def innbygging(m):
            return self._plass(video_iframe(m[1]) or html.escape(m[1]))

        tekst = re.sub(r'\[caption([^\]]*)\](.*?)\[/caption\]', bilettekst, tekst, flags=re.S)
        tekst = re.sub(r'\[gallery([^\]]*)\]', galleri, tekst)
        tekst = re.sub(r'\[sgpx([^\]]*)\]', gpx, tekst)
        tekst = re.sub(r'\[contact-form[^\]]*\].*?\[/contact-form\]', kontaktskjema, tekst, flags=re.S)
        tekst = re.sub(r'\[embed[^\]]*\](.*?)\[/embed\]', innbygging, tekst)
        # Klassiske innlegg: ein YouTube-/Vimeo-adresse åleine på ei linje blir ein videospelar
        tekst = re.sub(r'^[ \t]*(https?://(?:www\.)?(?:youtube\.com/watch\?\S+|youtu\.be/\S+|vimeo\.com/\d+\S*))[ \t]*$',
                       innbygging, tekst, flags=re.M)
        for kode in re.findall(r'\[([a-z_-]+)[\s\]]', re.sub(r'<[^>]+>', '', tekst)):
            self.ukjende_kodar.add(kode)
        return tekst

    def _blokker(self, tekst):
        """Fjern blokkommentarane, og lag avsnitt av klassisk tekst mellom blokkene."""
        bitar = re.split(r'(<!--\s*/?wp:.*?-->)', tekst, flags=re.S)
        djupn, ut = 0, []
        for bit in bitar:
            m = re.match(r'<!--\s*(/?)wp:.*?(/?)-->$', bit, re.S)
            if m:
                if m[1]:
                    djupn -= 1
                elif not m[2]:
                    djupn += 1
                continue
            ut.append(wpautop(bit) if djupn == 0 and bit.strip() else bit)
        return ''.join(ut)

    def _lenkjer(self, tekst):
        def omset_url(url):
            """Returnerer ny adresse, None for å fjerne lenkja, eller adressa uendra."""
            u = html.unescape(url).strip()
            if u.startswith('//'):
                u = 'https:' + u
            d = urlsplit(u)
            vert = d.netloc.lower()
            if d.scheme in ('http', 'https') and vert not in VERTAR:
                if re.search(r'(youtube\.com|youtu\.be|vimeo\.com|soundcloud\.com)$', vert):
                    return 'https' + u[len(d.scheme):]
                return url
            if not d.scheme and not u.startswith('/'):
                return url  # #anker, mailto: og relative lenkjer
            sti = nfc(unquote(d.path))
            if '/wp-content/uploads/' in sti:
                return self.fil_url(sti.split('/wp-content/uploads/', 1)[1]) or url
            treff = self.nettstad.slå_opp(sti, d.query)
            fragment = f'#{d.fragment}' if d.fragment else ''
            if not treff:
                kategori = re.match(r'/blogg/category/(?:[^/]+/)*?([^/]+)/?$', sti)
                if kategori:
                    return self.side_url(f'/blogg/index.html?kategori={kategori[1]}')
                if sti.startswith('/blogg') and '.' not in sti.rsplit('/', 1)[-1]:
                    return self.side_url('/blogg/index.html')
                return u
            art, mål = treff
            if art == 'side':
                return self.side_url(mål) + fragment
            if art == 'vedlegg':
                return self.vedlegg_url(mål) or url
            return None

        def lenkje(m):
            ny = omset_url(m[2])
            if ny is None:
                return m[3]  # lenkje til privat innlegg: behald teksten
            return m[0].replace(m[1] + m[2] + m[1], m[1] + html.escape(ny) + m[1], 1)

        tekst = re.sub(r'<a\s[^>]*?href=(["\'])(.*?)\1[^>]*>(.*?)</a>', lenkje, tekst, flags=re.S | re.I)

        def attributt(m):
            ny = omset_url(m[3])
            return f'{m[1]}={m[2]}{html.escape(ny) if ny else m[3]}{m[2]}'

        return re.sub(r'(\ssrc|\sdata-gpx)=(["\'])(.*?)\2', attributt, tekst)


# ---------------------------------------------------------------------------
# Bygging
# ---------------------------------------------------------------------------

def skriv(sti, innhald):
    sti.parent.mkdir(parents=True, exist_ok=True)
    sti.write_text(innhald, encoding='utf-8')


def bygg(xml_fil, opplastingsmappe, overskriv):
    ut_blogg = ROT / 'blogg'
    ut_utkast = ROT / 'utkast'
    for mappe in (ut_blogg, ut_utkast):
        if mappe.exists():
            if not overskriv:
                sys.exit(f'{mappe} finst allereie. Bruk --overskriv for å byggje på nytt '
                         '(alt i mappa blir sletta).')
            shutil.rmtree(mappe)

    element = les_eksport(xml_fil)
    opp = Opplastingar(opplastingsmappe)
    nettstad = Nettstad(element, opp)
    publisert = Omsetjar(nettstad)

    # --- Innhald i alle publiserte innlegg og sider ---
    for e in nettstad.innlegg + nettstad.sider:
        e['html'] = publisert.omset(e)
        e['skildring'] = kort_tekst(rein_tekst(e['html']), 155)
        e['lang'] = 'en' if any(k == 'engelsk' for k, _ in e['kategoriar']) else 'no'
        for slug, namn in e['kategoriar']:
            if slug not in KATEGORIAR:
                åtvar(f'Kategorien {slug} ({namn}) manglar i KATEGORIAR i oppdater_blogg.py')

        # Framheva bilete (til toppen av innlegget, oversikta og deling)
        e['framheva'] = None
        e['miniatyr'] = None
        tid = e['meta'].get('_thumbnail_id', [''])[0]
        v = nettstad.etter_id.get(int(tid)) if tid.isdigit() else None
        kandidat = None
        if v and v['type'] == 'attachment':
            kandidat = opp.finn(urlsplit(v['vedlegg_url']).path.split('/wp-content/uploads/', 1)[-1])
            if kandidat:
                e['framheva'] = publisert.fil_url(kandidat)
        if not kandidat:
            m = re.search(r'<img [^>]*src="bilete/([^"]+)"', e['html'])
            if m:
                kandidat = opp.finn(m[1])
        if kandidat and Path(kandidat).suffix.lower() in BILETE_ENDINGAR:
            e['miniatyr'] = publisert.fil_url(opp.miniatyr(kandidat, min_breidd=400))

        # Øvst i innlegget: video frå det gamle temaet, eller det framheva biletet
        e['toppen'] = ''
        for video in e['meta'].get('video_url', []):
            id_ = re.search(r'(?:vimeo\.com/(?:video/)?(\d+)|([\w-]{11})$)', video)
            if video and id_ and (id_[1] or id_[2]) not in e['html']:
                e['toppen'] = video_iframe(video)
        if not e['toppen'] and e['framheva']:
            stamme = e['framheva'].rsplit('/', 1)[-1].rsplit('.', 1)[0].split('-')[0]
            if stamme not in e['html']:
                e['toppen'] = f'<img class="toppbilete" src="{e["framheva"]}" alt="">'

    # --- Innlegg og sider ---
    for e in nettstad.innlegg:
        skriv(ut_blogg / e['fil'], innleggsside(
            e['tittel'], e['fil'], e['html'], dato=e['dato'], endra=e['endra'],
            kategoriar=[s for s, _ in e['kategoriar']], skildring=e['skildring'],
            bilete=e['framheva'], miniatyr=e['miniatyr'], lang=e['lang'], toppen=e['toppen'],
            wordpress_id=e['id']))
    for e in nettstad.sider:
        skriv(ut_blogg / e['fil'], innleggsside(
            e['tittel'], e['fil'], e['html'], skildring=e['skildring'],
            bilete=e['framheva'] or e['miniatyr'], lang=e['lang'], toppen=e['toppen']))

    # --- Statiske filer, bilete og GPS-ruter ---
    for fil in (Path(__file__).resolve().parent / 'blogg-mal').iterdir():
        shutil.copy2(fil, ut_blogg / fil.name)
    kopier(publisert.filer, ut_blogg)

    # --- Gamle WordPress-adresser ---
    vidaresendingar = dict(sorted(nettstad.vidaresendingar.items()))
    vidaresendingar['/blogg/feed/'] = '/blogg/feed.xml'
    # Prosjekt som låg i hausnes.github.io og no har fått eigne repo
    vidaresendingar['/kakeklikker/'] = '/kakeklikkar/'
    vidaresendingar['/matrix-terminal/matrix-terminal.html'] = '/matrix-terminal/'
    skriv(ROT / '404.html', ikkje_funnen(vidaresendingar))

    # --- Utkast (berre lokalt) ---
    utkast = Omsetjar(nettstad, blogg_prefiks='../blogg/')
    utkast_liste = []
    for e in nettstad.utkast:
        e['html'] = utkast.omset(e)
        namn = f'{e["dato"]:%Y-%m-%d}-{e["slug"] or slugify(e["tittel"])}'
        skriv(ut_utkast / f'{namn}.html', utkastside(e, utkast.har_kart))
        skriv(ut_utkast / 'original' / f'{namn}.txt', e['innhald'])
        utkast_liste.append((namn, e))
    kopier(utkast.filer, ut_utkast)
    skriv(ut_utkast / 'index.html', utkastoversikt(utkast_liste))

    rapport(nettstad, opp, publisert, utkast, len(vidaresendingar))
    print('\nOversikt, RSS, sitemap og førre/neste-lenkjer:')
    oppdater()


def kopier(filer, mål):
    for rel, kjelde in filer.items():
        (mål / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(kjelde, mål / rel)


def ikkje_funnen(vidaresendingar):
    """404.html på rota: sender gamle WordPress-adresser vidare, og viser ei feilside elles."""
    hovud = head(f'Fann ikkje sida – {NAMN}', '/404.html', ressursar='/blogg/')
    hovud = hovud.replace('<head>', '<head>\n    <meta name="robots" content="noindex">', 1)
    innhald = '''        <p class="overtittel">404</p>
        <h1>Fann ikkje sida</h1>
        <p class="ingress">Sida finst ikkje, eller ho har flytta. Sjå <a href="/blogg/">bloggen</a>
        eller gå til <a href="/">startsida</a>.</p>'''
    skript = f'''    <script>
    // Gamle WordPress-adresser -> nye
    const vidaresendingar = {json.dumps(vidaresendingar, ensure_ascii=False, indent=8)};
    let sti = decodeURIComponent(location.pathname).normalize('NFC');
    if (!sti.endsWith('/') && !sti.split('/').pop().includes('.')) sti += '/';
    let mål = vidaresendingar[sti];
    const kategori = sti.match(/^\\/blogg\\/category\\/(?:[^/]+\\/)*?([^/]+)\\/(?:page\\/\\d+\\/)?$/);
    const opplasting = sti.match(/^\\/blogg\\/wp-content\\/uploads\\/(?:.*\\/)?([^/]+)$/);
    if (!mål && kategori) mål = '/blogg/index.html?kategori=' + kategori[1];
    if (!mål && opplasting) mål = '/blogg/' + (opplasting[1].toLowerCase().endsWith('.gpx') ? 'gpx/' : 'bilete/') + opplasting[1];
    if (!mål && /^\\/blogg\\/(tag|page|\\d{{4}})\\//.test(sti)) mål = '/blogg/';
    if (mål) location.replace(mål + location.hash);
    </script>
'''
    return side(hovud, innhald, skript, ressursar='/blogg/')


def utkastside(e, har_kart):
    skript = '    <script src="../blogg/kart.js" defer></script>\n' if har_kart else ''
    return f'''<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>UTKAST: {html.escape(e["tittel"])}</title>
    <link rel="stylesheet" href="../felles.css">
    <link rel="stylesheet" href="../blogg/blogg.css">
</head>
<body>
    <main class="ramme">
        <p class="merknad">Utkast frå WordPress, sist endra {norsk_dato(e["endra"])}.
        Kategoriar: {html.escape(", ".join(n for _, n in e["kategoriar"]) or "ingen")}.</p>
        <article class="innlegg">
            <header><h1>{html.escape(e["tittel"])}</h1></header>
            <div class="innleggstekst">
{e["html"]}
            </div>
        </article>
    </main>
{skript}</body>
</html>
'''


def utkastoversikt(liste):
    rader = '\n'.join(f'        <li><a href="{quote(namn)}.html">{html.escape(e["tittel"])}</a> '
                      f'<span class="meta">({norsk_dato(e["dato"])})</span></li>' for namn, e in liste)
    return f'''<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <meta name="robots" content="noindex">
    <title>Utkast</title>
    <link rel="stylesheet" href="../felles.css">
    <link rel="stylesheet" href="../blogg/blogg.css">
</head>
<body>
    <main class="ramme">
        <h1>Utkast</h1>
        <p class="ingress">Ikkje publiserte innlegg frå WordPress. Originalteksten ligg i mappa <code>original/</code>.</p>
        <ul>
{rader}
        </ul>
    </main>
</body>
</html>
'''


def storleik(filer):
    return sum(f.stat().st_size for f in filer) / 1024 / 1024


def rapport(nettstad, opp, publisert, utkast, vidaresende):
    alle = {rel: f for rel, f in opp.filer.items()}
    brukt_filer = set(publisert.filer.values()) | set(utkast.filer.values())
    brukt = {rel for rel, f in alle.items() if f in brukt_filer}
    ubrukt = [f for rel, f in alle.items() if rel not in brukt]
    print(f'\nPubliserte innlegg: {len(nettstad.innlegg)}, sider: {len(nettstad.sider)}')
    print(f'Utkast lagra i utkast/: {len(nettstad.utkast)}')
    print(f'Private innlegg som ikkje er med: {len(nettstad.private)}')
    for e in nettstad.private:
        print(f'   - {e["tittel"]}')
    print(f'Gamle adresser som 404.html sender vidare: {vidaresende}')
    print(f'\nFiler i backupen: {len(alle)} ({storleik(alle.values()):.0f} MB)')
    print(f'Kopiert til blogg/: {len(publisert.filer)} ({storleik(publisert.filer.values()):.0f} MB)')
    print(f'Kopiert til utkast/: {len(utkast.filer)} ({storleik(utkast.filer.values()):.0f} MB)')
    print(f'Ikkje i bruk (blir ikkje med): {len(ubrukt)} ({storleik(ubrukt):.0f} MB)')
    gpx_ubrukt = [rel for rel in alle if rel.endswith('.gpx') and rel not in brukt]
    if gpx_ubrukt:
        print('GPX-filer som ingen innlegg brukar (ligg framleis i backupen):')
        for rel in gpx_ubrukt:
            print(f'   - {rel}')
    for namn, omsetjar in (('blogg', publisert), ('utkast', utkast)):
        if omsetjar.manglar:
            print(f'\nFiler som {namn} viser til, men som ikkje finst i backupen:')
            for rel in sorted(omsetjar.manglar):
                print(f'   - {rel}')
        if omsetjar.ukjende_kodar:
            print(f'\nUkjende kortkodar i {namn}: {", ".join(sorted(omsetjar.ukjende_kodar))}')
    for melding in åtvaringar:
        print(f'Åtvaring: {melding}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--xml', type=Path, default=next(BACKUP.glob('*.xml'), None))
    parser.add_argument('--opplastingar', type=Path, default=BACKUP / 'uploads')
    parser.add_argument('--overskriv', action='store_true', help='slett blogg/ og utkast/ og byggje på nytt')
    argument = parser.parse_args()
    if not argument.xml or not argument.xml.exists():
        sys.exit('Fann ikkje XML-eksporten. Bruk --xml sti/til/fil.xml')
    bygg(argument.xml, argument.opplastingar, argument.overskriv)
