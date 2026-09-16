"""Le livre de recettes du festival en EPUB (Alex, 2026-09-16).

Alex : « pour le livre de recettes en ligne, aussi offrir la version epub au
même prix ». L'EPUB part avec le PDF dans le même courriel d'achat, donc un
seul lien Square et un seul prix.

La matière vient des mêmes sources que le PDF (recettes4.py pour les 24
recettes, grimoire.py pour les chapitres, le mot de la cuisine et les
gravures) : un plat corrigé là se corrige ici au prochain passage. Le texte
coule au lieu d'être mis en page, parce qu'une liseuse choisit elle-même sa
taille de caractère.

Usage : python3 epub_livre.py   (écrit livre-recettes-fmm-2026.epub et le
        dépose dans functions/ à côté du PDF)
"""
import html, re, shutil, uuid, zipfile, pathlib, datetime
from grimoire import RECETTES, CHAPITRES, MOT, GRAVURES, HERE, RACINE

TITRE = 'Le livre de recettes du festival'
AUTEUR = 'Marc-Alexis Pepin'
EDITEUR = 'Festival Médiéval de Montpellier'
SORTIE = HERE / 'livre-recettes-fmm-2026.epub'
UID = f'urn:uuid:{uuid.uuid5(uuid.NAMESPACE_URL, "festivalmedievaldemontpellier.org/livre-recettes-2026")}'

QUANTITES = [
    "Chaque recette de ce livre nourrit quatre personnes. Les quantités sont écrites en mesures métriques, avec l’équivalent en tasses et en cuillères entre parenthèses, pour que vous puissiez cuisiner à la balance ou au jeu de tasses, selon ce que vous avez sous la main.",
    "Ce qui se compte se compte : un oignon reste un oignon plutôt que cent soixante grammes. Les épices ont été arrondies vers le bas, parce qu’il est plus facile d’en rajouter à la fin que d’en retirer.",
    "Les temps de cuisson n’ont pas été divisés, parce qu’ils ne se divisent pas : un ragoût mijote aussi longtemps pour quatre personnes que pour cinquante, et seul le poids de la marmite change. Ces fiches ont été écrites devant un feu vif; sur une cuisinière de maison, comptez un peu plus long et remuez plus souvent.",
]

CSS = """@font-face { font-family: 'Cinzel'; src: url(fonts/Cinzel.ttf); }
@font-face { font-family: 'Cormorant'; src: url(fonts/Cormorant.ttf); }
body { font-family: 'Cormorant', Georgia, serif; font-size: 1.12em; line-height: 1.5; margin: 0 4%; }
h1, h2, h3, .rom, .kicker, .yield { font-family: 'Cinzel', Georgia, serif; font-weight: normal; }
h1 { text-align: center; font-size: 1.7em; letter-spacing: .06em; margin: 1.2em 0 .6em; }
h2 { font-size: 1.35em; letter-spacing: .03em; line-height: 1.25; margin: 2.2em 0 .3em; page-break-before: always; break-before: page; }
h3 { font-size: .82em; letter-spacing: .18em; text-transform: uppercase; color: #8a6a34; margin: 1.5em 0 .5em; }
.kicker { text-align: center; font-size: .7em; letter-spacing: .35em; text-transform: uppercase; color: #8a6a34; margin-top: 3em; }
.rom { text-align: center; font-size: 2.6em; color: #8a6a34; margin: 2em 0 0; }
.chapitre h1 { margin-top: .2em; }
.gravure { display: block; width: 70%; max-width: 22em; margin: 1.5em auto; }
.yield { font-size: .78em; letter-spacing: .08em; color: #8a6a34; margin: 0 0 .8em; }
.chapeau { margin: 0 0 1em; }
ul.ing { list-style: none; padding: 0; margin: 0; }
ul.ing li { margin: 0 0 .35em; padding-left: 1em; text-indent: -1em; }
ul.ing li.sous { font-family: 'Cinzel', Georgia, serif; font-size: .78em; letter-spacing: .1em; color: #8a6a34; margin-top: .9em; text-indent: 0; padding-left: 0; }
ol.etapes { padding-left: 1.4em; margin: 0; }
ol.etapes li { margin: 0 0 .6em; }
.note { border-left: 2px solid #a97c2a; padding: .2em 0 .2em .9em; margin: 1.2em 0 0; }
.couverture { margin: 0; padding: 0; text-align: center; }
.couverture img { max-width: 100%; max-height: 100%; }
nav ol { list-style: none; padding-left: 0; }
nav ol ol { padding-left: 1.2em; }
nav li { margin: .3em 0; }
nav a { text-decoration: none; color: inherit; }
"""

def esc(t):
    return html.escape(str(t), quote=False)

def slug(t):
    t = re.sub(r"[^a-z0-9]+", '-', t.lower().replace('œ', 'oe').replace('é', 'e').replace('è', 'e').replace('â', 'a').replace('ç', 'c'))
    return t.strip('-')

def xhtml(titre, corps, classe=''):
    return f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="fr" lang="fr">
<head><meta charset="utf-8"/><title>{esc(titre)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body{f' class="{classe}"' if classe else ''}>
{corps}
</body>
</html>
"""

# La mesure en gras et le reste en romain, comme dans le PDF (grimoire.py).
def ligne_ing(ligne):
    coupe = ligne.find(') ')
    if coupe == -1:
        m = re.match(r"^(\S+)\s+(.+)$", ligne)
        mesure, reste = (m.group(1), m.group(2)) if m else ('', ligne)
    else:
        mesure, reste = ligne[:coupe + 1], ligne[coupe + 2:]
    if not re.match(r'^[\d¼½¾⅓⅔⅛\s]', mesure) and not mesure.startswith('Le zeste'):
        return f'<li>{esc(ligne)}</li>'
    return f'<li><b>{esc(mesure)}</b> {esc(reste)}</li>'

def recette(tab):
    r = RECETTES[tab]
    ing = []
    for sous, lignes in r['ingredients']:
        if sous:
            ing.append(f'<li class="sous">{esc(sous)}</li>')
        ing += [ligne_ing(l) for l in lignes]
    tete = ' · '.join(f'{lbl} {val}'.strip() for lbl, val in r['temps'])
    return (f'<section epub:type="chapter" id="{slug(tab)}">'
            f'<h2>{esc(r["titre"])}</h2><p class="yield">{esc(tete)}</p>'
            + (f'<p class="chapeau">{esc(r["chapeau"])}</p>' if r.get('chapeau') else '')
            + f'<h3>Ingrédients</h3><ul class="ing">{"".join(ing)}</ul>'
            + '<h3>La façon de faire</h3><ol class="etapes">'
            + ''.join(f'<li>{esc(e)}</li>' for e in r['etapes']) + '</ol>'
            + (f'<p class="note">{esc(r["note"])}</p>' if r.get('note') else '')
            + '</section>')

def bati():
    fichiers = {}   # chemin dans OEBPS -> (contenu, media-type, propriétés)
    spine = []
    def pose(nom, contenu, mt='application/xhtml+xml', props='', lineaire=True):
        fichiers[nom] = (contenu, mt, props)
        if mt == 'application/xhtml+xml' and nom != 'nav.xhtml':
            spine.append(nom)

    fichiers['style.css'] = (CSS, 'text/css', '')
    for f in ('Cinzel.ttf', 'Cormorant.ttf'):
        fichiers[f'fonts/{f}'] = ((HERE / 'fonts' / f).read_bytes(), 'font/ttf', '')
    fichiers['images/couverture.jpg'] = ((HERE / 'couv-face.jpg').read_bytes(), 'image/jpeg', 'cover-image')
    fichiers['images/dos.jpg'] = ((HERE / 'couv-dos.jpg').read_bytes(), 'image/jpeg', '')

    pose('couverture.xhtml', xhtml(TITRE, f'<div class="couverture"><img src="images/couverture.jpg" alt="{esc(TITRE)}"/></div>', 'couverture'))
    pose('mot.xhtml', xhtml('Le mot de la cuisine',
        '<p class="kicker">Avant de commencer</p><h1>Le mot de la cuisine</h1>'
        + ''.join(f'<p>{esc(p)}</p>' for p in MOT.split('\n\n'))))
    pose('quantites.xhtml', xhtml('Sur les quantités',
        '<h1>Sur les quantités</h1>' + ''.join(f'<p>{esc(p)}</p>' for p in QUANTITES)))

    toc = []
    nombre = 0
    for i, (titre, rom, tabs) in enumerate(CHAPITRES, 1):
        tabs = [t for t in tabs if t in RECETTES]
        nombre += len(tabs)
        nom = f'chapitre-{i}.xhtml'
        gravure = GRAVURES.get(titre)
        if gravure:
            fichiers[f'images/{gravure}'] = ((HERE / gravure).read_bytes(), 'image/png', '')
        corps = (f'<section epub:type="part" id="chapitre-{i}"><p class="rom">{rom}</p><h1>{esc(titre)}</h1>'
                 + (f'<img class="gravure" src="images/{gravure}" alt=""/>' if gravure else '')
                 + '</section>' + ''.join(recette(t) for t in tabs))
        pose(nom, xhtml(titre, corps, 'chapitre'))
        toc.append(f'<li><a href="{nom}">{rom}. {esc(titre)}</a><ol>'
                   + ''.join(f'<li><a href="{nom}#{slug(t)}">{esc(RECETTES[t]["titre"])}</a></li>' for t in tabs)
                   + '</ol></li>')
    pose('fin.xhtml', xhtml('Au plaisir de festoyer ensemble', '<div class="couverture"><img src="images/dos.jpg" alt=""/></div>', 'couverture'))

    nav = xhtml('Sommaire',
        '<nav epub:type="toc" id="toc"><h1>Ce que contient ce livre</h1><ol>'
        '<li><a href="mot.xhtml">Le mot de la cuisine</a></li>'
        '<li><a href="quantites.xhtml">Sur les quantités</a></li>'
        + ''.join(toc) + '</ol></nav>'
        '<nav epub:type="landmarks" hidden="hidden"><ol>'
        '<li><a epub:type="cover" href="couverture.xhtml">Couverture</a></li>'
        '<li><a epub:type="toc" href="nav.xhtml">Sommaire</a></li>'
        '<li><a epub:type="bodymatter" href="chapitre-1.xhtml">Les recettes</a></li></ol></nav>')
    fichiers['nav.xhtml'] = (nav, 'application/xhtml+xml', 'nav')
    spine.insert(1, 'nav.xhtml')   # le sommaire se lit juste après la couverture

    ids = {nom: f'f{n}' for n, nom in enumerate(fichiers)}
    manifest = ''.join(
        f'<item id="{ids[nom]}" href="{nom}" media-type="{mt}"{f" properties=\"{props}\"" if props else ""}/>'
        for nom, (_, mt, props) in fichiers.items())
    opf = f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="fr">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">{UID}</dc:identifier>
<dc:title>{esc(TITRE)}</dc:title>
<dc:creator>{esc(AUTEUR)}</dc:creator>
<dc:publisher>{esc(EDITEUR)}</dc:publisher>
<dc:language>fr</dc:language>
<dc:date>2026</dc:date>
<meta property="dcterms:modified">{datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}</meta>
<meta name="cover" content="{ids['images/couverture.jpg']}"/>
</metadata>
<manifest>{manifest}</manifest>
<spine>{''.join(f'<itemref idref="{ids[n]}"/>' for n in spine)}</spine>
</package>
"""
    conteneur = ('<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" '
                 'xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles>'
                 '<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>'
                 '</rootfiles></container>\n')
    with zipfile.ZipFile(SORTIE, 'w') as z:
        z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
        z.writestr('META-INF/container.xml', conteneur, compress_type=zipfile.ZIP_DEFLATED)
        z.writestr('OEBPS/content.opf', opf, compress_type=zipfile.ZIP_DEFLATED)
        for nom, (contenu, _, _) in fichiers.items():
            z.writestr(f'OEBPS/{nom}', contenu, compress_type=zipfile.ZIP_DEFLATED)
    print(f'  {nombre} recettes, {len(CHAPITRES)} chapitres -> {SORTIE.name} ({SORTIE.stat().st_size // 1024} ko)')
    cible = RACINE / 'functions' / 'livre-recettes-fmm-2026.epub'
    shutil.copyfile(SORTIE, cible)
    print(f'  déposé : {cible.relative_to(RACINE)}')

if __name__ == '__main__':
    bati()
