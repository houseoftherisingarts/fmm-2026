#!/usr/bin/env python3
"""Genere le livre de recettes du festival (PDF) a partir des fiches de cuisine.

Sortie : grimoire-fmm-2026.pdf (complet) et grimoire-fmm-2026-apercu.pdf
(la couverture, deux recettes et la page qui invite a prendre le livre).

Depuis le 2026-09-14, le texte des recettes ne se calcule plus : il est
ecrit a la main dans recettes4.py, pour quatre personnes, avec la
formulation de Ricardo Cuisine que le chef Marc-Alexis Pepin a demandee
(mesure metrique puis imperiale entre parentheses, participe apres la
virgule, etape a l'infinitif qui commence par le lieu). recettes.json
reste la feuille de cuisine d'origine, celle du festival.
"""
import json, base64, html, re, shutil, subprocess, pathlib, sys

HERE = pathlib.Path(__file__).parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def b64(p):
    return base64.b64encode((HERE / p).read_bytes()).decode()


# ── Les vingt-quatre recettes, ecrites pour quatre ──────────────────
from recettes4 import RECETTES

TITRES = {cle: r['titre'] for cle, r in RECETTES.items()}


# ── Le filigrane : un ingrédient dessiné, en demi-transparence ──────
# Alex, 2026-08-23 : chaque page de recette porte, en fond, le dessin
# d'un de ses ingrédients, comme les livres de cuisine d'autrefois. Le
# choix se fait sur les mots de la recette; à défaut, les herbes.
# Un dessin par recette, jamais deux fois le même : Alex a compté.
# Chaque fiche porte son propre ingrédient en filigrane, choisi pour ce
# qu'elle contient vraiment (2026-08-23).
FILIGRANE_PAR_RECETTE = {
    'salade betteraves repas': 'ing-betterave-a.png',
    'salade betterves side':   'ing-noix-a.png',
    'hypocras':                'ing-vin-a.png',
    'baba ganoush':            'ing-aubergine-a.png',
    'brochette poulet':        'ing-poulet-a.png',
    'pain viking':             'ing-seigle-a.png',
    'pain insectes':           'ing-criquet-a.png',
    'cervoise':                'ing-houblon-a.png',
    'biere au beurre':         'ing-baratte-a.png',
    'bloodbraud':              'ing-os-a.png',
    'limonade':                'ing-citron-a.png',
    'boeuf kawaps':            'ing-viande-a.png',
    'sauce au cidre':          'ing-pomme-a.png',
    'gateau du voyageur':      'ing-seche-a.png',
    'lembas':                  'ing-orge-a.png',
    'cuirs du seigneur':       'ing-sel-a.png',
    'beurre aux herbes':       'ing-herbes-a.png',
    'olla gitana':             'ing-racines-a.png',
    'hotdog':                  'ing-saucisse-a.png',
    'verdure du jardin':       'ing-laitue-a.png',
    'goulash':                 'ing-paprika-a.png',
    'patate chaude':           'ing-patates-a.png',
    'sauce boeuf':             'ing-menthe-a.png',
    'cafe turc':               'ing-cafe-a.png',
    'offrande oasis':          'ing-dattes-a.png',
    'hummus':                  'ing-poischiche-a.png',
    'vin chaud':               'ing-cannelle-a.png',
}

# Repli, si une recette arrivait sans entrée : on prend un dessin qui
# n'est pas encore servi plutôt que d'en répéter un.
FILIGRANES_LIBRES = [
    'ing-ail-a.png', 'ing-oignon-a.png', 'ing-miel-a.png', 'ing-orange-a.png',
    'ing-feuille-a.png', 'ing-sesame-a.png',
]

_deja_servis = set()

def filigrane(tab, *_ignore):
    """Le dessin de CETTE recette, et d'aucune autre."""
    cle = (tab or '').strip().lower()
    fichier = FILIGRANE_PAR_RECETTE.get(cle)
    if not fichier:
        # Correspondance souple : « brochette de poulet du verger »
        # trouve « brochette poulet ».
        mots = set(re.findall(r'[a-zéèêàâîôûç]+', cle))
        meilleur, score = None, 0
        for k, v in FILIGRANE_PAR_RECETTE.items():
            commun = len(mots & set(re.findall(r'[a-zéèêàâîôûç]+', k)))
            if commun > score:
                meilleur, score = v, commun
        fichier = meilleur
    if not fichier or fichier in _deja_servis:
        for libre in FILIGRANES_LIBRES:
            if libre not in _deja_servis:
                fichier = libre
                break
    _deja_servis.add(fichier)
    return fichier


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
                             'sauce boeuf', 'patate chaude']),
    ('Les boustifailles', 'III', ['verdure du jardin', 'salade betteraves repas',
                                  'baba ganoush', 'hummus']),
    ('La boulangerie', 'IV', ['pain viking', 'beurre aux herbes', 'bloodbraud',
                              'lembas', 'pain insectes']),
    ('Les douceurs', 'V', ['gateau du voyageur', "les offrandes de l'oasis"]),
    ('L’abreuvoir', 'VI', ['hypocras', 'vin chaud', 'bière au beurre', 'cervoise',
                           'limonade', 'café turc']),
]

MOT = """Ces plats sont nés à cinquante couverts d’un coup, trois jours de suite, sur un terrain en herbe où rien n’est de niveau et où le vent décide de la cuisson autant que le feu. Vous les trouverez ici ramenés à quatre personnes, pour une table ordinaire un mardi soir. La recette n’a pas bougé, seule la marmite a rapetissé.

Ce livre couvre deux éditions plutôt qu’une. Vous y trouverez les recettes de 2025 et celles de 2026 dans le même volume, parce que la cuisine du festival se bâtit d’une année à l’autre et qu’il aurait été dommage de laisser la première derrière.

Les plats viennent de la route. L’Europe de l’Est, le Levant, l’Espagne gitane, les feux du Nord : c’est de là que viennent les caravanes qui campent chez nous, et la table leur ressemble. Le pain au sang voisine le baba ganoush. L’hypocras voisine le café turc. Personne ne s’en plaint autour du feu.

Les proportions ont été écrites la main dans le sac de farine. Elles supportent d’être poussées, et elles pardonnent.

Goûtez souvent. Salez un peu plus que vous ne croyez devoir le faire : dehors, le froid mange le sel."""

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
    radial-gradient(ellipse at 22% 12%, rgba(255,252,242,.8), transparent 58%),
    radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(120,85,40,.13) 100%); }
.ink { background:#150e07; color:#efe3c8; }
.ink::before { background:
    radial-gradient(ellipse at 50% 30%, rgba(216,176,90,.16), transparent 62%),
    radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,.7) 100%); }

.pad { position:relative; z-index:1; padding: .62in .58in .5in .58in; height:100%;
  display:flex; flex-direction:column; }

h1,h2,h3,.disp { font-family:'Cinzel Decorative',Cinzel,Georgia,serif; font-weight:400; }
.gold { color:#a97c2a; }

/* ── Couverture et quatrième ──────────────────────────────────
   Alex, 2026-08-23, troisième passe : la page EST le plat de reliure.
   Le titre et les marques sont GRAVÉS dans l'image elle-même, générée
   d'un bloc. Aucun texte, aucun logo, aucun voile posé par-dessus :
   sur un vrai livre, rien ne flotte au-dessus du cuir. */
.cover, .colo { background:#140a0a; }
.cover::before, .colo::before { background:none; }
.cover .plat, .colo .plat { position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; object-position:center; z-index:0; }
.cover .pad, .colo .pad { padding:0; }
.rule-gold { width:2.1in; height:1px; background:linear-gradient(90deg,transparent,#a97c2a,transparent); }
.diamond { width:9px; height:9px; transform:rotate(45deg); border:1px solid #a97c2a; }
.orn { display:flex; align-items:center; gap:.14in; justify-content:center; }

/* ── Page d'encre (le mot de la cuisine) ── */
.mot h2 { font-size:24pt; color:#8a6524; line-height:1.1; }
.mot .body { font-size:11.2pt; line-height:1.62; color:#3a2a18; }
.mot .body p + p { margin-top:.16in; }
.mot .kicker { color:#a97c2a !important; }
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
/* Une seule colonne de quantités depuis le 2026-08-24 : la mesure du
   festival est partie, et la place qu'elle laissait revient au texte.
   Les ingrédients tiennent sur une ligne plus large, la marche à
   suivre respire, et les corps de texte remontent d'un cran. */
.rec .cols { display:grid; grid-template-columns: 1.85in 1fr; gap:.3in; margin-top:.26in; flex:1;
  min-height:0; }
.rec .ing li.sous { font-family:'Cinzel',serif; font-size:7.2pt; letter-spacing:.2em;
  text-transform:uppercase; color:#a97c2a; list-style:none; margin:.1in 0 .05in;
  padding-left:0; }
.rec .ing li.sous:first-child { margin-top:0; }
.lbl { font-family:'Cinzel',serif; font-size:7.4pt; letter-spacing:.24em; text-transform:uppercase;
  color:#a97c2a; padding-bottom:.05in; margin-bottom:.1in;
  border-bottom:1px solid rgba(169,124,42,.34); }
/* Une fiche de cinq ingrédients n'a pas besoin d'une colonne de deux
   pouces : elle la laisse à la marche à suivre, qui est ce qui reste
   long quand les quantités tiennent sur une ligne. */
.rec.maigre .cols { grid-template-columns: 1.4in 1fr; }
/* À l'inverse, une fiche de vingt ingrédients coupés en sections perd
   une ligne sur deux à force de retours : elle prend plus large et
   cesse de déborder sur le folio (2026-09-14, les kawaps). */
.rec.dense .cols { grid-template-columns: 2.3in 1fr; }
/* La verdure du jardin n'a aucune étape sur la fiche du chef : plutôt
   qu'un titre « La façon de faire » posé au-dessus du vide, la liste
   des ingrédients prend toute la largeur. */
.rec .cols.solo { grid-template-columns: 1fr; }
.rec .cols.solo .ing { column-count:2; column-gap:.36in; }
.rec .cols.solo .ing li { break-inside:avoid; }
.ing li { font-size:9.6pt; line-height:1.38; padding:.055in 0;
  border-bottom:1px dotted rgba(120,85,40,.2); }
.ing li b { font-weight:600; color:#8a6524; }
.chapeau { font-family:'Cormorant Garamond',serif; font-size:10.6pt; line-height:1.46;
  color:#4a3620; margin-top:.11in; max-width:4.6in; }
.steps li { font-size:10.9pt; line-height:1.52; padding-left:.32in; position:relative;
  margin-bottom:.135in; }
.steps li::before { content:counter(s); counter-increment:s; position:absolute; left:0; top:.015in;
  font-family:'Cinzel Decorative',serif; font-size:10pt; color:#a97c2a; }
.steps { counter-reset:s; list-style:none; }
.ing { list-style:none; }
.note { margin-top:.14in; padding:.1in .13in; font-size:9.2pt; font-style:italic; line-height:1.45;
  background:rgba(169,124,42,.09); border-left:2px solid rgba(169,124,42,.5); }

/* Calage d'une fiche trop longue : une recette de vingt-et-un
   ingrédients ne tient pas dans la même fonte qu'une recette de six.
   Plutôt que de la couper au ras du papier, la page se resserre d'un
   cran, mesure faite (Alex, 2026-08-23). */
/* L'échelle des crans, du plus aéré au plus serré. caler.py choisit
   celui qui remplit la page sans la faire déborder : une fiche de six
   ingrédients grossit, une fiche de vingt et un se resserre. */
.rec[data-serre="-2"] .steps li { font-size:12.6pt; line-height:1.6; margin-bottom:.195in; }
.rec[data-serre="-2"] .chapeau  { font-size:11.8pt; line-height:1.52; }
.rec[data-serre="-2"] .ing li   { font-size:11.2pt; line-height:1.44; padding:.085in 0; }
.rec[data-serre="-2"] .note     { font-size:10.2pt; padding:.13in .15in; }
.rec[data-serre="-2"] h2        { font-size:18.6pt; }
.rec[data-serre="-1"] .steps li { font-size:11.8pt; line-height:1.56; margin-bottom:.165in; }
.rec[data-serre="-1"] .chapeau  { font-size:11.2pt; line-height:1.5; }
.rec[data-serre="-1"] .ing li   { font-size:10.4pt; line-height:1.41; padding:.07in 0; }
.rec[data-serre="-1"] .note     { font-size:9.8pt; padding:.115in .14in; }
.rec[data-serre="1"] .steps li { font-size:10.2pt; margin-bottom:.105in; }
.rec[data-serre="1"] .chapeau  { font-size:10.1pt; line-height:1.42; }
.rec[data-serre="1"] .ing li   { font-size:9pt; padding:.042in 0; }
.rec[data-serre="1"] .note     { font-size:9pt; padding:.085in .11in; }
.rec[data-serre="2"] .steps li { font-size:9.5pt; line-height:1.46; margin-bottom:.08in; }
.rec[data-serre="2"] .chapeau  { font-size:9.5pt; line-height:1.38; }
.rec[data-serre="2"] .ing li   { font-size:8.4pt; padding:.03in 0; line-height:1.3; }
.rec[data-serre="2"] .note     { font-size:8.5pt; padding:.07in .1in; }
.rec[data-serre="3"] .steps li { font-size:8.8pt; line-height:1.4; margin-bottom:.058in; }
.rec[data-serre="3"] .chapeau  { font-size:9pt; line-height:1.32; }
.rec[data-serre="3"] .ing li   { font-size:7.7pt; padding:.02in 0; line-height:1.24; }
.rec[data-serre="3"] .note     { font-size:8pt; padding:.06in .09in; }
.rec[data-serre="3"] h2        { font-size:16.4pt; }
.rec[data-serre="4"] .steps li { font-size:8.2pt; line-height:1.34; margin-bottom:.042in; }
.rec[data-serre="4"] .chapeau  { font-size:8.5pt; line-height:1.28; }
.rec[data-serre="4"] .ing li   { font-size:7.2pt; padding:.014in 0; line-height:1.2; }
.rec[data-serre="4"] .note     { font-size:7.6pt; padding:.05in .08in; }
.rec[data-serre="4"] h2        { font-size:15.6pt; }

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


def page(inner, cls='', folio=None, runhead=None, cle=None):
    f = f'<div class="folio">· {folio} ·</div>' if folio else ''
    r = f'<div class="runhead">{esc(runhead)}</div>' if runhead else ''
    # `data-cle` sert au calage : après le rendu, la page qui déborde
    # se resserre d'un cran, puis on remesure (voir caler()).
    k = f' data-cle="{cle}" data-serre="0"' if cle else ''
    return f'<section class="page {cls}"{k}>{r}<div class="pad">{inner}</div>{f}</section>'


def build():
    pages = []

    # 1 · Couverture : le plat, d'un seul tenant
    pages.append(page(
        f'<img class="plat" src="data:image/jpeg;base64,{b64('couv-face.jpg')}" alt="Le Livre de Recettes du Festival">',
        cls='cover'))

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
      </div>""", cls='mot'))

    # 3 · Sommaire
    n = 5  # la premiere recette tombe sur la page 5
    toc, plan = [], []
    for titre, rom, tabs in CHAPITRES:
        toc.append(f'<h3>{esc(titre)}</h3><ul>')
        n += 1  # ouverture de chapitre
        for tab in tabs:
            if tab not in RECETTES:
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
          Chaque recette de ce livre nourrit quatre personnes. Les quantités sont écrites
          en mesures métriques, avec l’équivalent en tasses et en cuillères entre parenthèses,
          pour que vous puissiez cuisiner à la balance ou au jeu de tasses, selon ce que
          vous avez sous la main.
        </p>
        <p style="font-size:11pt; line-height:1.6; max-width:3.6in">
          Ce qui se compte se compte : un oignon reste un oignon plutôt que cent soixante
          grammes. Les épices ont été arrondies vers le bas, parce qu’il est plus facile
          d’en rajouter à la fin que d’en retirer.
        </p>
        <p style="font-size:11pt; line-height:1.6; max-width:3.6in">
          Les temps de cuisson n’ont pas été divisés, parce qu’ils ne se divisent pas : un
          ragoût mijote aussi longtemps pour quatre personnes que pour cinquante, et seul le
          poids de la marmite change. Ces fiches ont été écrites devant un feu vif; sur une
          cuisinière de maison, comptez un peu plus long et remuez plus souvent.
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
        r = RECETTES[tab]

        # ── Les ingredients, dans la formulation de Ricardo ──────────
        # « 30 ml (2 c. a soupe) d'huile d'olive » : la mesure en gras,
        # le reste en romain. La coupure se fait a la premiere
        # parenthese fermante, ou a defaut apres le premier mot.
        def ligne_ing(ligne):
            coupe = ligne.find(') ')
            if coupe == -1:
                m = re.match(r"^(\S+)\s+(.+)$", ligne)
                mesure, reste = (m.group(1), m.group(2)) if m else ('', ligne)
            else:
                mesure, reste = ligne[:coupe + 1], ligne[coupe + 2:]
            # « Sel et poivre, au gout » n'a pas de mesure en tete : la
            # ligne s'ecrit alors d'un seul tenant.
            if not re.match(r'^[\d¼½¾⅓⅔⅛\s]', mesure) and not mesure.startswith('Le zeste'):
                return f'<li>{esc(ligne)}</li>'
            return f'<li><b>{esc(mesure)}</b> {esc(reste)}</li>'

        ing, combien = [], 0
        for titre_section, lignes in r['ingredients']:
            if titre_section:
                ing.append(f'<li class="sous">{esc(titre_section)}</li>')
            ing += [ligne_ing(l) for l in lignes]
            combien += len(lignes)
        ing = ''.join(ing)

        body = ''.join(f'<li>{esc(e)}</li>' for e in r['etapes'])
        note = f'<div class="note">{esc(r["note"])}</div>' if r.get('note') else ''
        # Le rendement et les temps, sur la meme ligne, separes du
        # point median : « 4 portions · Cuisson 3 h ».
        tete = ' · '.join(f'{lbl} {val}'.strip() for lbl, val in r['temps'])
        forme = ' maigre' if combien <= 9 else (' dense' if combien >= 17 else '')
        eau = filigrane(tab)
        pages.append(page(f"""
          <img class="filigrane" src="data:image/png;base64,{b64(eau)}" alt="">
          <header>
            <h2>{esc(r['titre'])}</h2>
            <p class="yield">{esc(tete)}</p>
            {f'<p class="chapeau">{esc(r["chapeau"])}</p>' if r.get('chapeau') else ''}
            <div class="orn" style="justify-content:flex-start; margin-top:.09in">
              <span class="rule-gold" style="width:1.15in"></span><span class="diamond"></span>
            </div>
          </header>
          <div class="cols">
            <div><p class="lbl">Ingrédients</p><ul class="ing">{ing}</ul></div>
            <div><p class="lbl">La façon de faire</p><ol class="steps">{body}</ol>{note}</div>
          </div>""", cls='rec' + forme, folio=folio, runhead=titre, cle=tab))

    # Colophon : la quatrième, d'un seul tenant elle aussi
    pages.append(page(
        f'<img class="plat" src="data:image/jpeg;base64,{b64('couv-dos.jpg')}" alt="">',
        cls='colo'))

    doc = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Le livre de recettes du festival</title>
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


# Les deux recettes qui se feuillettent en ligne, choisies pour montrer
# le livre sans le donner : la marmite qui ouvre le premier chapitre et
# la brochette qui ouvre le second.
APERCU_RECETTES = ('olla gitana', 'brochette de poulet du verger')

# `public/**` est servi avec un cache d'un an marque immuable. Remplacer
# le fichier sans changer son nom laisserait tout le monde devant
# l'ancien aperçu : le numero monte a chaque refonte du livre.
APERCU_PUBLIC = 'apercu-livre-recettes-v5.pdf'

RACINE = HERE.parent.parent


def deposer():
    """Recopie les deux PDF aux places d'ou le site et les courriels les servent."""
    cibles = [
        (HERE / 'grimoire-fmm-2026.pdf', RACINE / 'functions' / 'grimoire-fmm-2026.pdf'),
        (HERE / 'grimoire-fmm-2026-apercu.pdf', RACINE / 'public' / 'grimoire' / APERCU_PUBLIC),
    ]
    for source, cible in cibles:
        cible.parent.mkdir(parents=True, exist_ok=True)
        # Compactage sans perte (objets en double, flux compressés) : le PDF
        # passait de 11,7 à 7,6 Mo, et le courriel d'achat, qui porte aussi
        # l'EPUB, doit rester sous la limite de 20 Mo des boîtes Outlook.
        import fitz
        fitz.open(source).save(cible, garbage=4, deflate=True, deflate_images=True,
                               deflate_fonts=True, clean=True, use_objstms=1)
        print(f'  déposé : {cible.relative_to(RACINE)} ({cible.stat().st_size // 1024} ko)')


if __name__ == '__main__':
    n = build()
    print(n, 'pages')
    # Rien ne s'imprime avant que le calage ait vérifié qu'aucune page
    # ne déborde (voir caler.py). Une fiche coupée au ras du papier ne
    # doit plus jamais sortir d'ici (Alex, 2026-08-23).
    try:
        from caler import caler as _caler
        _caler()
    except Exception as e:  # noqa: BLE001
        print('calage impossible :', e)
    to_pdf('grimoire.html', 'grimoire-fmm-2026.pdf')
    # Aperçu : la couverture, deux vraies recettes, puis l'invitation.
    doc = (HERE / 'grimoire.html').read_text(encoding='utf-8')
    head, rest = doc.split('<body>', 1)
    secs = re.findall(r'<section class="page.*?</section>', rest, re.S)
    choisies = [sec for cle in APERCU_RECETTES
                for sec in secs if f'data-cle="{cle}"' in sec]
    if len(choisies) != len(APERCU_RECETTES):
        raise SystemExit('aperçu : une des recettes vitrine est introuvable')
    teaser = ('<section class="page ink"><div class="pad" style="justify-content:center;'
              'align-items:center;text-align:center;gap:.2in">'
              '<div class="orn"><span class="diamond"></span></div>'
              '<h2 style="font-size:21pt;color:#e8c87a">La suite se trouve<br>dans le livre</h2>'
              '<p style="font-size:11pt;line-height:1.6;max-width:3.5in;color:rgba(239,227,200,.82)">'
              'Vingt-quatre recettes des éditions 2025 et 2026, écrites pour quatre personnes et '
              'réparties en six chapitres qui vont du pain viking à l’hypocras. Le livre coûte '
              'neuf dollars plus taxes '
              'et vous arrive par courriel en deux formats, PDF et EPUB.</p>'
              '<div class="orn"><span class="rule-gold" style="width:1.7in"></span></div></div></section>')
    (HERE / 'apercu.html').write_text(
        head + '<body>' + secs[0] + ''.join(choisies) + teaser + '</body></html>',
        encoding='utf-8')
    to_pdf('apercu.html', 'grimoire-fmm-2026-apercu.pdf')
    print('pdf ok')
    deposer()
