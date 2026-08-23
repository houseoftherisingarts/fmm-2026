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


# ── Le chapeau de chaque recette ────────────────────────────────────
# Le frère d'Alex a raison : sans une ligne qui dit ce qu'on cuisine et
# quand ça se sert, une page de recettes n'est qu'une fiche technique.
CHAPEAUX = {
    'olla gitana': "Le grand pot des campements gitans : pois chiches, courge, poires fermes, tout ce que la caravane avait sous la main. Il mijote tout l'après-midi et se sert dans un bol tenu à deux mains.",
    'goulash': "Palette de bœuf, paprika doux, racines coupées gros. La marmite qui reste sur le feu pendant qu'on monte les tentes.",
    'brochette de poulet du verger': "Cuisses de poulet marinées au cidre et au sirop d'érable, grillées jusqu'à ce que la peau craque. C'est la brochette qui sent le verger.",
    'sauce au cidre': "La sauce qui va avec les brochettes du verger : cidre réduit, deux moutardes, une pointe d'érable.",
    'boeuf kawaps': "Bœuf haché aux oignons râpés, attendri au bicarbonate, serré à la main sur la broche. Les kawaps se mangent brûlants, dans le pain.",
    'sauce boeuf': "Yogourt, tahini, ail rôti et menthe fraîche. La sauce froide qui calme le feu des brochettes.",
    'hotdog': "Saucisse artisanale dans un pain viking, choucroute et trois moutardes. La ligne la plus longue du village gustatif.",
    'patate chaude': "Pomme de terre entière, beurre, miel épicé et paprika. Elle sort brûlante et on la mange sans couvert.",
    'cuirs du seigneur': "Rumsteak mariné puis séché lentement jusqu'à devenir cuir. Ça se mâche longtemps, ça se garde des semaines.",
    'verdure du jardin': "Mesclun, concombre, carottes râpées, vinaigrette au cidre et à l'érable. La fraîcheur entre deux grillades.",
    'salade betteraves repas': "Betteraves rôties, orge, pois chiches et roquette. Une salade qui tient lieu de repas complet.",
    'salade betterves side': "La même salade de betteraves, servie en accompagnement à côté d'une grillade.",
    'baba ganoush': "Aubergines brûlées jusqu'à la peau noire, tahini, citron. La fumée fait la moitié du travail.",
    'hummus': "Pois chiches cuits au bicarbonate jusqu'à s'écraser sous le doigt, tahini et citron. Servi tiède, il n'a rien à voir avec celui du commerce.",
    'pain viking': "Un pain de blé au miel, pétri le matin et cuit dans la journée. C'est le pain de toutes les tables du festival.",
    'beurre aux herbes': "Persil, ciboulette, thym, romarin et ail. Le beurre qui attend le pain viking à la sortie du four.",
    'bloodbraud': "Le pain au sang des tables nordiques. Le sang remplace l'œuf, donne la mie sombre et le goût de fer.",
    'lembas': "Le pain de voyage, version festival : avoine, miel, crème. Une galette suffit pour tenir une journée de marche.",
    'pain insectes': "Farine de criquet, vers de farine, fourmis. Le pain qui fait reculer les visiteurs, puis revenir en chercher un deuxième.",
    'gateau du voyageur': "Un gâteau de route : fruits séchés, noix, cannelle. Il se transporte dans un sac et se garde plusieurs jours.",
    "les offrandes de l'oasis": "Dattes ouvertes, farcies de noix, de miel et de zeste d'orange. Deux bouchées et le café turc arrive.",
    'hypocras': "Le vin d'épices du Moyen Âge, sucré au miel, parfumé à la cannelle et au girofle. Il se boit tiède, jamais bouilli.",
    'vin chaud': "Vin rouge, oranges piquées de girofle, cannelle et anis étoilé. Le verre qu'on tient à deux mains devant le feu.",
    'bière au beurre': "La boisson des enfants au festival : crème soda, beurre fondu, cannelle et crème fouettée par-dessus.",
    'cervoise': "Bière blonde relevée de cannelle et d'un sirop de miel et de genièvre. Simple, et elle disparaît vite.",
    'limonade': "Citron, sucre, eau froide, glaçons. Rien d'autre, et c'est ce qui sauve les après-midi de septembre.",
    'café turc': "Café moulu très fin et cardamome, cuit dans le cezve posé sur le sable brûlant. Il se sert avec le marc au fond.",
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

MOT = """Ce livre a été écrit dehors, entre deux services.

À gauche, les quantités du festival : cinquante couverts d’un coup, trois jours de suite, sur un terrain en herbe où rien n’est de niveau et où le vent décide de la cuisson autant que le feu. À droite, les mêmes plats ramenés à cinq personnes, pour une table ordinaire un mardi soir. Les deux colonnes disent la même recette; seule la marmite change.

Les plats viennent de la route. L’Europe de l’Est, le Levant, l’Espagne gitane, les feux du Nord : c’est de là que viennent les caravanes de cette édition, et la table leur ressemble. Le pain au sang voisine le baba ganoush. L’hypocras voisine le café turc. Personne ne s’en plaint autour du feu.

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
  letter-spacing:.08em; margin-top:.012in; }
.ing .q b { font-weight:600; }
.ing .q i { font-style:normal; color:#a97c2a; }
.chapeau { font-family:'Cormorant Garamond',serif; font-size:10.4pt; line-height:1.45;
  color:#4a3620; margin-top:.1in; max-width:4.6in; }
.ing .q { text-transform:none; letter-spacing:.02em; }
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


# ── Ramener une recette de festival à une table de cinq ─────────────
# Chaque fiche annonce son rendement (50 portions, 100 portions, une
# bouteille…). On en tire un facteur, puis on convertit proprement :
# 4 kg deviennent 400 g, 850 ml deviennent 85 ml, 10 unités en font 1.
import unicodedata

def portions_de(rendement):
    t = (rendement or '').lower()
    m = re.search(r'(\d+)\s*(portions?|brochettes?)', t)
    if m:
        n = int(m.group(1))
        if 'brochette' in m.group(2):
            par = re.search(r'(\d+)\s*par portion', t)
            if par:
                n = max(1, n // int(par.group(1)))
        return n
    return 50  # la marmite ordinaire du village

UNITES_MASSE = {'kg': 1000.0, 'g': 1.0}
UNITES_VOLUME = {'l': 1000.0, 'ml': 1.0}

def _nombre(txt):
    return float(txt.replace(',', '.'))

def _virgule(txt):
    return txt.replace('.', ',')


FRACTIONS = {0.25: '¼', 0.33: '⅓', 0.5: '½', 0.66: '⅔', 0.75: '¾'}

def _fraction(v):
    for cle, sym in FRACTIONS.items():
        if abs(v - cle) < 0.06:
            return sym
    return None


def _joli(x, unite):
    if x >= 1000 and unite in ('g', 'ml'):
        v = x / 1000
        s2 = _virgule(f"{v:.2f}".rstrip('0').rstrip('.'))
        return f"{s2} {'kg' if unite == 'g' else 'L'}"
    if x >= 100:
        return f"{int(round(x))} {unite}"
    if x >= 10:
        return f"{int(round(x))} {unite}"
    v = round(x, 1)
    frac = _fraction(v % 1)
    if v < 1 and frac:
        return f"{frac} {unite}"
    s2 = _virgule(f"{v:.1f}".rstrip('0').rstrip('.'))
    return f"{s2} {unite}"

def pour_cinq(q, portions):
    """Rend la quantité pour cinq personnes, ou None si ça n'a pas de sens."""
    if not q:
        return None
    brut = q.strip().lower().replace('\u00a0', ' ')
    if brut in ('qs', 'q.s', 'q.s.'):
        return 'au goût'
    facteur = 5.0 / max(1, portions)
    m = re.match(r'^([\d.,]+)\s*([a-zéèà.]+)?(.*)$', brut)
    if not m:
        return None
    try:
        n = _nombre(m.group(1))
    except ValueError:
        return None
    unite = (m.group(2) or '').strip('. ')
    suite = (m.group(3) or '').strip()
    val = n * facteur

    if unite in UNITES_MASSE:
        return _joli(val * UNITES_MASSE[unite], 'g')
    if unite in UNITES_VOLUME:
        return _joli(val * UNITES_VOLUME[unite], 'ml')
    if unite in ('un', 'unite', 'unites', 'gousse', 'gousses', 'bouteille', 'bouteilles'):
        mot = 'gousse' if unite.startswith('gousse') else ('bouteille' if unite.startswith('bouteille') else 'pièce')
        n2 = max(1, int(round(val)))
        return f"{n2} {mot}{'s' if n2 > 1 else ''}"
    if unite in ('cat', 'cas'):
        nom = 'c. à thé' if unite == 'cat' else 'c. à soupe'
        v = round(val, 2)
        if v < 0.2:
            return 'une pincée'
        frac = _fraction(v)
        if frac:
            return f"{frac} {nom}"
        s2 = _virgule(f"{v:.2f}".rstrip('0').rstrip('.'))
        return f"{s2} {nom}"
    if unite == '' and suite == '':
        v = round(val, 1)
        return _virgule(f"{v:.1f}".rstrip('0').rstrip('.'))
    return None


def joli_depart(q):
    """Écrit la quantité du festival comme un cuisinier l'écrit."""
    t = (q or '').strip()
    t = re.sub(r'(?i)^([\d.,]+)\s*kg', lambda m: m.group(1).replace('.', ',') + ' kg', t)
    t = re.sub(r'(?i)^([\d.,]+)\s*g\b', lambda m: m.group(1).replace('.', ',') + ' g', t)
    t = re.sub(r'(?i)^([\d.,]+)\s*ml', lambda m: m.group(1).replace('.', ',') + ' ml', t)
    t = re.sub(r'(?i)^([\d.,]+)\s*l\b', lambda m: m.group(1).replace('.', ',') + ' L', t)
    t = re.sub(r'(?i)^([\d.,]+)\s*un\b', lambda m: m.group(1) + '\u00a0×', t)
    t = re.sub(r'(?i)^([\d.,]+)\s*cat\b', lambda m: m.group(1).replace('.', ',') + ' c. à thé', t)
    t = re.sub(r'(?i)^([\d.,]+)\s*cas\b', lambda m: m.group(1).replace('.', ',') + ' c. à soupe', t)
    if t.lower() in ('qs', 'q.s', 'q.s.'):
        return 'au goût'
    return t


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
          Chaque ingrédient porte deux mesures. En gras, celle du festival : le rendement
          annoncé en tête de fiche, cinquante portions le plus souvent. En italique, la même
          chose ramenée à cinq personnes.
        </p>
        <p style="font-size:11pt; line-height:1.6; max-width:3.6in">
          Les épices ont été arrondies vers le bas. Il est plus facile d’en rajouter à la fin
          que d’en retirer.
        </p>
        <p style="font-size:11pt; line-height:1.6; max-width:3.6in">
          Les temps de cuisson supposent un feu vif et une grande marmite. Sur une cuisinière
          de maison, comptez plus long et remuez plus souvent.
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
        portions = portions_de(r.get('yield'))
        def ligne_ing(i):
            maison = pour_cinq(i['q'], portions) if i['q'] else None
            nom = clean(i['n'])
            # « 450g avant cuisson » : la précision suit le produit, pas
            # le chiffre. Un cuisinier écrit « 450 g d'ail rôti (avant
            # cuisson) ».
            precision = ''
            if i['q']:
                m2 = re.match(r'^([\d.,]+\s*[a-zA-Z]+)\s+(.+)$', i['q'].strip())
                if m2:
                    i = {**i, 'q': m2.group(1)}
                    precision = f" ({m2.group(2)})"
            nom = nom[0].lower() + nom[1:] if nom else nom
            liaison = "d’" if nom[:1] in "aeiouyéèêàâîôû" else "de "
            if i['q']:
                depart = joli_depart(i['q'])
                lien = '' if depart.endswith('×') else liaison
                tete = f"<b>{esc(depart)}</b> {lien}{esc(nom)}{esc(precision)}"
            else:
                tete = esc(nom[0].upper() + nom[1:])
            pied = f"<span class=q>pour cinq : {esc(maison)}</span>" if maison else ''
            return f"<li>{tete}{pied}</li>"
        ing = ''.join(ligne_ing(i) for i in r['ing'] if i['n'])
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
            {f'<p class="chapeau">{esc(CHAPEAUX[tab])}</p>' if tab in CHAPEAUX else ''}
            <div class="orn" style="justify-content:flex-start; margin-top:.09in">
              <span class="rule-gold" style="width:1.15in"></span><span class="diamond"></span>
            </div>
          </header>
          <div class="cols">
            <div><p class="lbl">Ingrédients</p><ul class="ing">{ing}</ul></div>
            <div><p class="lbl">La façon de faire</p><ol class="steps">{body}</ol>{note}</div>
          </div>""", cls='rec' + wide, folio=folio, runhead=titre))

    # Colophon : la quatrième, d'un seul tenant elle aussi
    pages.append(page(
        f'<img class="plat" src="data:image/jpeg;base64,{b64('couv-dos.jpg')}" alt="">',
        cls='colo'))

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
