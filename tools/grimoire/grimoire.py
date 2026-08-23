#!/usr/bin/env python3
"""Genere le Grimoire du Festival (PDF) a partir des fiches de cuisine.

Sortie : grimoire-fmm-2026.pdf (complet) et grimoire-fmm-2026-apercu.pdf
(les deux premieres pages seulement, celles qui se feuillettent en ligne).
"""
import json, base64, html, re, subprocess, pathlib, sys

HERE = pathlib.Path(__file__).parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def b64(p):
    return base64.b64encode((HERE / p).read_bytes()).decode()


# ── Titres de livre : la feuille de cuisine parle en raccourcis ──────
TITRES = {
    'pain viking': 'Pain viking et beurre aux herbes',
    'bloodbraud': 'Blóðbrauð, le pain au sang',
    'baba ganoush': 'Baba ganoush',
    'boeuf kawaps': 'Brochettes de bœuf façon kawaps',
    'hotdog': 'Saucisse grillée sur pain du voyageur',
    'pain insectes': 'Pain aux insectes',
    'salade betterves side': 'Salade de betteraves, en accompagnement',
    'salade betteraves repas': 'Salade de betteraves, en repas',
    "les offrandes de l'oasis": 'Les offrandes de l’oasis, dattes farcies',
    'cuirs du seigneur': 'Les cuirs du seigneur, bœuf séché',
    'gateau du voyageur': 'Gâteau du voyageur',
    'brochette de poulet du verger': 'Brochettes de poulet du verger',
    'sauce au cidre': 'Sauce au cidre',
    'sauce boeuf': 'Sauce à bœuf',
    'olla gitana': 'Olla gitana',
    'goulash': 'Goulash',
    'patate chaude': 'Pomme de terre au miel épicé',
    'verdure du jardin': 'Verdure du jardin',
    'beurre aux herbes': 'Beurre aux herbes',
    'bière au beurre': 'Bière au beurre',
    'café turc': 'Café turc',
    'vin chaud': 'Vin chaud',
    'hypocras': 'Hypocras',
    'cervoise': 'Cervoise',
    'limonade': 'Limonade',
    'lembas': 'Lembas',
    'hummus': 'Hummus',
}

# ── Le filigrane : un ingrédient dessiné, en demi-transparence ──────
# Alex, 2026-08-23 : chaque page de recette porte, en fond, le dessin
# d'un de ses ingrédients, comme les livres de cuisine d'autrefois. Le
# choix se fait sur les mots de la recette; à défaut, les herbes.
FILIGRANES = [
    (('boeuf', 'bœuf', 'kawaps', 'cuirs', 'saucisse', 'hotdog', 'poulet', 'goulash', 'porc'), 'ing-viande-a.png'),
    (('pain', 'brauð', 'bloodbraud', 'lembas', 'insectes', 'farine'), 'ing-racines-a.png'),
    (('miel', 'gateau', 'gâteau', 'dattes', 'offrandes', 'douceur'), 'ing-miel-a.png'),
    (('betterave', 'verdure', 'salade', 'herboristerie', 'hummus', 'baba'), 'ing-racines-a.png'),
    (('ail', 'aïoli', 'sauce'), 'ing-ail-a.png'),
    (('oignon', 'olla', 'marmite', 'ragout', 'ragoût'), 'ing-oignon-a.png'),
    (('pomme', 'cidre', 'verger', 'fruit'), 'ing-pomme-a.png'),
    (('vin', 'hypocras', 'cervoise', 'biere', 'bière', 'limonade', 'cafe', 'café', 'abreuvoir'), 'ing-vin-a.png'),
    (('sel', 'beurre', 'patate', 'pomme de terre'), 'ing-sel-a.png'),
]

def filigrane(*textes):
    t = ' '.join(textes).lower()
    for mots, fichier in FILIGRANES:
        if any(m in t for m in mots):
            return fichier
    return 'ing-herbes-a.png'


# ── La planche gravée qui ouvre chaque chapitre ─────────────────────
# Gravures à l'encre commandées le 2026-08-22 (Alex) : un livre de
# recettes de festival s'ouvre sur une planche d'encyclopédie ancienne,
# pas sur un titre seul. Fond détouré, posé en médaillon sur le vélin.
GRAVURES = {
    'La marmite du campement': 'ink-marmite-a.png',
    'Les grillages':            'ink-grillades-a.png',
    'Les boustifailles':        'ink-boustifailles-a.png',
    'La boulangerie':           'ink-boulangerie-a.png',
    'Les douceurs':             'ink-douceurs-a.png',
    'L’abreuvoir':              'ink-abreuvoir-a.png',
}

# ── Chapitres, dans l'ordre du livre ────────────────────────────────
CHAPITRES = [
    ('La marmite du campement', 'I', ['olla gitana', 'goulash']),
    ('Les grillages', 'II', ['brochette de poulet du verger', 'sauce au cidre', 'boeuf kawaps',
                             'sauce boeuf', 'hotdog', 'patate chaude']),
    ('Les boustifailles', 'III', ['cuirs du seigneur', 'verdure du jardin', 'salade betteraves repas',
                                  'salade betterves side', 'baba ganoush', 'hummus']),
    ('La boulangerie', 'IV', ['pain viking', 'beurre aux herbes', 'bloodbraud',
                              'lembas', 'pain insectes']),
    ('Les douceurs', 'V', ['gateau du voyageur', "les offrandes de l'oasis"]),
    ('L’abreuvoir', 'VI', ['hypocras', 'vin chaud', 'bière au beurre', 'cervoise',
                           'limonade', 'café turc']),
]

MOT = """Ce livre sort d’une cuisine de campagne, pas d’un studio.

Les quantités que vous allez lire sont celles des vraies marmites du festival, celles qui nourrissent
cinquante personnes d’un coup pendant trois jours, entre le vendredi et le dimanche, sur un terrain
en gazon où rien n’est jamais parfaitement de niveau. Nous les avons laissées telles quelles. Divisez
par dix et vous nourrirez votre tablée; gardez-les entières et vous nourrirez votre village.

Rien ici n’est reconstitué à la lettre. Ce sont des recettes de route : elles empruntent aux tables
d’Europe de l’Est, du Levant, de l’Espagne gitane et des feux nordiques, parce que c’est de là que
viennent les caravanes de cette édition. Le pain au sang côtoie le baba ganoush, l’hypocras côtoie
le café turc, et personne ne s’en plaint autour du feu.

Faites-les à votre façon. Goûtez souvent. Salez plus que vous ne pensez."""

# ── Gabarits ─────────────────────────────────────────────────────────
CSS = """
@page { size: 6in 9in; margin: 0; }
* { margin:0; padding:0; box-sizing:border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family:'Cormorant Garamond',Georgia,serif; color:#3a2a18; }

.page { position:relative; width:6in; height:9in; overflow:hidden; page-break-after:always;
  background:#f2e7d0; }
.page:last-child { page-break-after:auto; }
/* Grain et vignettage du parchemin */
.page::before { content:''; position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(ellipse at 22% 12%, rgba(255,252,242,.85), transparent 55%),
    radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(120,85,40,.16) 100%),
    repeating-linear-gradient(94deg, rgba(150,110,60,.035) 0 2px, transparent 2px 5px); }
.ink { background:#150e07; color:#efe3c8; }
.ink::before { background:
    radial-gradient(ellipse at 50% 30%, rgba(216,176,90,.16), transparent 62%),
    radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,.7) 100%); }

.pad { position:relative; z-index:1; padding: .62in .58in .5in .58in; height:100%;
  display:flex; flex-direction:column; }

h1,h2,h3,.disp { font-family:'Cinzel Decorative',Cinzel,Georgia,serif; font-weight:400; }
.gold { color:#a97c2a; }

/* ── Couverture et quatrième : le livre lui-même ───────────────
   Alex, 2026-08-23 : la couverture EST le livre. Cuir rouge, ferrures
   et cadre d'argent, et le titre GRAVÉ dans le cartouche ovale, comme
   sur un plat de reliure. Rien n'est posé sur un aplat. */
.cover, .colo { background:#140a0a; }
.cover::before, .colo::before { background:none; }
.cover .cuir, .colo .cuir { position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; z-index:0; }
.cover .pad, .colo .pad { padding:0; }

/* Le cartouche : mesuré sur la photo du plat (ovale d'argent). */
.cartouche { position:absolute; left:50%; top:2.98in; transform:translateX(-50%);
  width:1.52in; height:2.02in; z-index:3;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center; padding:.1in .06in; }
.cartouche img { width:.5in; opacity:.9; margin-bottom:.05in;
  filter: grayscale(1) brightness(.35) contrast(1.4); }
.cartouche .grave { font-family:'Cinzel',serif; font-weight:600;
  font-size:9pt; line-height:1.3; letter-spacing:.05em; text-transform:uppercase;
  color:#4a4a50; text-shadow:0 1px 0 rgba(255,255,255,.55); }
.cartouche .grave .fin { display:block; font-size:5.6pt; letter-spacing:.24em;
  margin-top:.06in; color:#5c5c63; }

/* Sous le cartouche, sur le cuir : la ligne d'argent. */
.cover .sous-cartouche { position:absolute; left:0; right:0; top:5.34in; z-index:3;
  text-align:center; padding:0 .95in; }
.cover .sous-cartouche p { font-family:'Cormorant Garamond',serif; font-size:10.5pt;
  line-height:1.45; color:rgba(242,236,226,.96);
  text-shadow:0 1px 3px rgba(0,0,0,.85), 0 0 12px rgba(0,0,0,.6); }
.cover .credits, .colo .credits { position:absolute; left:0; right:0; bottom:.78in; z-index:3;
  text-align:center; }
.cover .credits .name { font-family:'Cinzel',serif; font-size:8pt; letter-spacing:.24em;
  text-transform:uppercase; color:rgba(240,236,228,.9); text-shadow:0 1px 3px rgba(0,0,0,.9); }
.cover .credits .ed, .colo .credits .ed { font-family:'Cinzel',serif; font-size:6.2pt;
  letter-spacing:.28em; text-transform:uppercase; color:rgba(238,232,220,.62);
  text-shadow:0 1px 3px rgba(0,0,0,.9); margin-top:.07in; }
.rule-gold { width:2.1in; height:1px; background:linear-gradient(90deg,transparent,#a97c2a,transparent); }
.rule-argent { width:1.9in; height:1px;
  background:linear-gradient(90deg,transparent,rgba(226,226,232,.8),transparent); }
.diamond { width:9px; height:9px; transform:rotate(45deg); border:1px solid #a97c2a; }
.orn { display:flex; align-items:center; gap:.14in; justify-content:center; }

/* ── Page d'encre (le mot de la cuisine) ── */
.ink h2 { font-size:24pt; color:#e8c87a; line-height:1.1; }
.ink .body { font-size:11.2pt; line-height:1.62; color:rgba(239,227,200,.9); }
.ink .body p + p { margin-top:.16in; }
.dropcap::first-letter { font-family:'Cinzel Decorative',serif; float:left; font-size:40pt;
  line-height:.82; padding:.03in .07in 0 0; color:#c79a3c; }

/* ── Sommaire ── */
.toc li { display:flex; align-items:baseline; gap:.07in; font-size:9.1pt; padding:.028in 0;
  break-inside:avoid; }
.toc ul { break-inside:avoid-column; }
.toc .lead { flex:1; border-bottom:1px dotted rgba(120,85,40,.42); transform:translateY(-3px); }
.toc .num { font-variant-numeric:tabular-nums; color:#8a6524; font-size:9.5pt; }
.toc h3 { break-after:avoid; break-inside:avoid; font-size:9.6pt; letter-spacing:.16em; text-transform:uppercase; color:#a97c2a;
  margin:.17in 0 .05in; }

/* ── Ouverture de chapitre ── */
.chap .pad { justify-content:center; align-items:center; text-align:center; gap:.13in; }
.chap .rom { font-family:'Cinzel Decorative',serif; font-size:44pt; color:rgba(169,124,42,.34); line-height:1; }
.chap h2 { font-size:26pt; line-height:1.08; max-width:4in; }
/* La gravure : encre pure sur le vélin, jamais un cadre ni un aplat. */
.chap .plate { width:3.2in; height:3.2in; object-fit:contain; mix-blend-mode:multiply;
  opacity:.92; margin-top:.12in; }

/* Filigrane : l'ingrédient dessiné derrière le texte de la fiche. */
.rec .filigrane { position:absolute; left:50%; top:52%; transform:translate(-50%,-50%);
  width:4.3in; height:4.3in; object-fit:contain; opacity:.11; mix-blend-mode:multiply;
  pointer-events:none; z-index:0; }
.rec .pad { position:relative; z-index:1; }

/* ── Recette ── */
.rec h2 { font-size:17.5pt; line-height:1.16; margin-bottom:.05in; }
.rec .yield { font-family:'Cinzel',serif; font-size:7.6pt; letter-spacing:.26em;
  text-transform:uppercase; color:#8a6524; }
.rec .cols { display:grid; grid-template-columns: 1.42in 1fr; gap:.28in; margin-top:.24in; flex:1;
  min-height:0; }
.lbl { font-family:'Cinzel',serif; font-size:7.4pt; letter-spacing:.24em; text-transform:uppercase;
  color:#a97c2a; padding-bottom:.05in; margin-bottom:.1in;
  border-bottom:1px solid rgba(169,124,42,.34); }
.rec.wide .cols { grid-template-columns: 2.62in 1fr; gap:.24in; }
.rec.wide .ing { column-count:2; column-gap:.2in; }
.rec.wide .ing li { break-inside:avoid; font-size:8.4pt; padding:.032in 0; }
.rec.wide .ing .q { font-size:6.8pt; }
.ing li { font-size:9.1pt; line-height:1.34; padding:.045in 0;
  border-bottom:1px dotted rgba(120,85,40,.2); }
.ing .q { display:block; color:#8a6524; font-family:'Cinzel',serif; font-size:7.2pt;
  letter-spacing:.1em; margin-top:.012in; }
.steps li { font-size:10.4pt; line-height:1.5; padding-left:.3in; position:relative;
  margin-bottom:.115in; }
.steps li::before { content:counter(s); counter-increment:s; position:absolute; left:0; top:.015in;
  font-family:'Cinzel Decorative',serif; font-size:10pt; color:#a97c2a; }
.steps { counter-reset:s; list-style:none; }
.ing { list-style:none; }
.note { margin-top:.14in; padding:.1in .13in; font-size:9.2pt; font-style:italic; line-height:1.45;
  background:rgba(169,124,42,.09); border-left:2px solid rgba(169,124,42,.5); }

.folio { position:absolute; left:0; right:0; bottom:.3in; text-align:center;
  font-family:'Cinzel',serif; font-size:7.6pt; letter-spacing:.3em; color:rgba(120,85,40,.6); z-index:2; }
.runhead { position:absolute; top:.3in; left:0; right:0; text-align:center;
  font-family:'Cinzel',serif; font-size:7pt; letter-spacing:.32em; text-transform:uppercase;
  color:rgba(120,85,40,.5); z-index:2; }

/* ── Colophon ── */
.colo .pad { justify-content:space-between; align-items:center; text-align:center; }
.colo .maisons { position:relative; z-index:3; margin-top:4.28in; width:100%; }
.colo .logos { display:flex; align-items:flex-start; justify-content:center; gap:.72in; width:100%; }
.colo .logos img { filter: grayscale(1) brightness(1.9) contrast(.85) drop-shadow(0 2px 5px rgba(0,0,0,.7)); }
.colo .sub { font-family:'Cormorant Garamond',serif; font-size:9.6pt; line-height:1.5;
  color:rgba(238,234,226,.86); text-shadow:0 1px 2px rgba(0,0,0,.7); }
.colo .logos img { height:.72in; width:auto; object-fit:contain; }
.colo .logos img.wide { height:.56in; }
/* Le blason d'argent tient le centre, les deux ors l'encadrent. */
.colo .logos img.crest-silver { height:1.05in; }
.colo .cap { font-family:'Cinzel',serif; font-size:6.6pt; letter-spacing:.2em; text-transform:uppercase;
  color:rgba(232,228,220,.72); margin-top:.09in; text-shadow:0 1px 0 rgba(0,0,0,.6); }
.colo p { color:rgba(238,234,226,.9); text-shadow:0 1px 2px rgba(0,0,0,.6); }
.colo .logos img { filter: drop-shadow(0 2px 6px rgba(0,0,0,.6)); }
"""


def esc(t):
    return html.escape(str(t))


def clean(t):
    t = re.sub(r'\s+', ' ', str(t)).strip()
    return t[0].upper() + t[1:] if t else t


def page(inner, cls='', folio=None, runhead=None):
    f = f'<div class="folio">· {folio} ·</div>' if folio else ''
    r = f'<div class="runhead">{esc(runhead)}</div>' if runhead else ''
    return f'<section class="page {cls}">{r}<div class="pad">{inner}</div>{f}</section>'


def build():
    recs = {r['tab']: r for r in json.load(open(HERE / 'recettes.json'))}
    pages = []

    # 1 · Couverture : le plat de reliure, titre gravé dans l'argent
    pages.append(page(f"""
      <img class="cuir" src="data:image/jpeg;base64,{b64('cuir-face.jpg')}" alt="">
      <div class="cartouche">
        <img src="data:image/png;base64,{b64('fmm-logo-silver.png')}" alt="">
        <p class="grave">Le Grimoire<br>du Festival
          <span class="fin">MMXXVI</span>
        </p>
      </div>
      <div class="sous-cartouche">
        <p>Les recettes de la cuisine du festival,<br>telles qu\u2019elles sortent des marmites</p>
      </div>
      <div class="credits">
        <p class="name">Chef Marc-Alexis Pepin</p>
        <p class="ed">Festival Médiéval de Montpellier \u00b7 Caravanes et Saltimbanques</p>
      </div>""", cls='cover'))

    # 2 · Le mot de la cuisine (la seule page d'encre du corps : la rupture)
    paras = ''.join(
        f'<p class="{"dropcap" if i == 0 else ""}">{esc(p)}</p>'
        for i, p in enumerate(MOT.split('\n\n')))
    pages.append(page(f"""
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center">
        <p class="kicker" style="letter-spacing:.4em; font-size:8pt; color:rgba(232,200,122,.6);
           font-family:'Cinzel',serif; text-transform:uppercase; margin-bottom:.14in">Avant de commencer</p>
        <h2>Le mot de la cuisine</h2>
        <div class="orn" style="justify-content:flex-start; margin:.2in 0">
          <span class="rule-gold" style="width:1.3in"></span><span class="diamond"></span>
        </div>
        <div class="body">{paras}</div>
      </div>""", cls='ink'))

    # 3 · Sommaire
    n = 5  # la premiere recette tombe sur la page 5
    toc, plan = [], []
    for titre, rom, tabs in CHAPITRES:
        toc.append(f'<h3>{esc(titre)}</h3><ul>')
        n += 1  # ouverture de chapitre
        for tab in tabs:
            if tab not in recs:
                continue
            plan.append((titre, rom, tab, n))
            toc.append(
                f'<li><span>{esc(TITRES.get(tab, clean(tab)))}</span>'
                f'<span class="lead"></span><span class="num">{n}</span></li>')
            n += 1
        toc.append('</ul>')
    pages.append(page(f"""
      <p class="lbl" style="border:0; margin-bottom:.04in">Sommaire</p>
      <h2 style="font-size:21pt; margin-bottom:.1in">Ce que contient ce livre</h2>
      <div class="orn" style="justify-content:flex-start; margin-bottom:.06in">
        <span class="rule-gold" style="width:1.1in"></span>
      </div>
      <div class="toc" style="flex:1; column-count:2; column-gap:.3in">{''.join(toc)}</div>""", folio=3))

    # 4 · Note de mesure
    pages.append(page("""
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center; text-align:center;
                  align-items:center; gap:.14in">
        <div class="orn"><span class="diamond"></span></div>
        <h2 style="font-size:19pt">Sur les quantités</h2>
        <p style="font-size:11pt; line-height:1.6; max-width:3.6in">
          Chaque fiche donne son rendement en tête de page : cinquante portions, cent tasses,
          une bouteille. C’est la mesure du festival. Pour une tablée de cinq, divisez par dix et
          arrondissez vers le bas les épices, quitte à en rajouter à la fin.
        </p>
        <p style="font-size:11pt; line-height:1.6; max-width:3.6in">
          Les temps de cuisson supposent un feu vif et une grande marmite. Sur une cuisinière
          domestique, comptez plus long et remuez plus souvent.
        </p>
        <div class="orn" style="margin-top:.1in"><span class="rule-gold" style="width:1.6in"></span></div>
      </div>""", folio=4))

    # 5+ · Chapitres et recettes
    last = None
    for titre, rom, tab, folio in plan:
        if titre != last:
            gravure = GRAVURES.get(titre)
            planche = (f'<img class="plate" src="data:image/png;base64,{b64(gravure)}" alt="">'
                       if gravure else '')
            pages.append(page(f"""
              <div class="rom">{rom}</div>
              <div class="orn"><span class="rule-gold" style="width:1.5in"></span></div>
              <h2>{esc(titre)}</h2>
              <div class="orn"><span class="diamond"></span></div>
              {planche}""", cls='chap'))
            last = titre
        r = recs[tab]
        ing = ''.join(
            f'<li>{esc(clean(i["n"]))}{f"<span class=q>{esc(i['q'])}</span>" if i['q'] else ""}</li>'
            for i in r['ing'] if i['n'])
        # Les lignes en fin de fiche qui expliquent un sous-ensemble deviennent une note.
        steps, notes = [], []
        for s in r['steps']:
            (notes if re.match(r'^[a-zéèêà\' ]{3,24}\s*:', s.strip(), re.I) and len(steps) else steps).append(s)
        body = ''.join(f'<li>{esc(clean(s))}</li>' for s in steps)
        note = ''.join(f'<div class="note">{esc(clean(x))}</div>' for x in notes)
        wide = ' wide' if len([i for i in r['ing'] if i['n']]) > 13 else ''
        eau = filigrane(TITRES.get(tab, tab), ' '.join(i['n'] or '' for i in r['ing']))
        pages.append(page(f"""
          <img class="filigrane" src="data:image/png;base64,{b64(eau)}" alt="">
          <header>
            <h2>{esc(TITRES.get(tab, clean(tab)))}</h2>
            <p class="yield">{esc(r['yield'] or 'Rendement du festival')}</p>
            <div class="orn" style="justify-content:flex-start; margin-top:.09in">
              <span class="rule-gold" style="width:1.15in"></span><span class="diamond"></span>
            </div>
          </header>
          <div class="cols">
            <div><p class="lbl">Ingrédients</p><ul class="ing">{ing}</ul></div>
            <div><p class="lbl">La façon de faire</p><ol class="steps">{body}</ol>{note}</div>
          </div>""", cls='rec' + wide, folio=folio, runhead=titre))

    # Colophon : la quatrième, gravée elle aussi
    pages.append(page(f"""
      <img class="cuir" src="data:image/jpeg;base64,{b64('cuir-face.jpg')}" alt="">
      <div class="cartouche">
        <p class="grave">Trois maisons<br>pour un livre
          <span class="fin">Marc-Alexis Pepin<br>Le Salon des Inconnus<br>Festival Médiéval</span>
        </p>
      </div>
      <div class="credits">
        <p class="ed">Tous droits réservés \u00b7 Édition Caravanes et Saltimbanques \u00b7 2026</p>
      </div>""", cls='colo'))

    doc = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Le Grimoire du Festival</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>{''.join(pages)}</body></html>"""
    (HERE / 'grimoire.html').write_text(doc, encoding='utf-8')
    return len(pages)


def to_pdf(src, out, extra=()):
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
                    f'--print-to-pdf={HERE / out}', *extra,
                    '--virtual-time-budget=20000', f'file://{HERE / src}'],
                   check=True, capture_output=True)


if __name__ == '__main__':
    n = build()
    print(n, 'pages')
    to_pdf('grimoire.html', 'grimoire-fmm-2026.pdf')
    # Apercu : la couverture et le mot de la cuisine, rien de plus.
    doc = (HERE / 'grimoire.html').read_text(encoding='utf-8')
    head, rest = doc.split('<body>', 1)
    secs = re.findall(r'<section class="page.*?</section>', rest, re.S)
    teaser = ('<section class="page ink"><div class="pad" style="justify-content:center;'
              'align-items:center;text-align:center;gap:.2in">'
              '<div class="orn"><span class="diamond"></span></div>'
              '<h2 style="font-size:21pt;color:#e8c87a">La suite se trouve<br>dans le grimoire</h2>'
              '<p style="font-size:11pt;line-height:1.6;max-width:3.5in;color:rgba(239,227,200,.82)">'
              'Vingt-sept recettes, six chapitres, du pain viking à l’hypocras. '
              'Neuf dollars plus taxes, envoyé par courriel en format PDF.</p>'
              '<div class="orn"><span class="rule-gold" style="width:1.7in"></span></div></div></section>')
    (HERE / 'apercu.html').write_text(head + '<body>' + secs[0] + secs[1] + teaser + '</body></html>',
                                      encoding='utf-8')
    to_pdf('apercu.html', 'grimoire-fmm-2026-apercu.pdf')
    print('pdf ok')
