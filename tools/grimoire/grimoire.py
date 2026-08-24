#!/usr/bin/env python3
"""Genere le livre de recettes du festival (PDF) a partir des fiches de cuisine.

Sortie : grimoire-fmm-2026.pdf (complet) et grimoire-fmm-2026-apercu.pdf
(la couverture, deux recettes et la page qui invite a prendre le livre).

Depuis le 2026-08-24, chaque ingredient ne porte qu'une seule mesure,
celle qui nourrit cinq personnes. La colonne du festival est partie.
"""
import json, base64, html, re, shutil, subprocess, pathlib, sys

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

Ces plats sont nés à cinquante couverts d’un coup, trois jours de suite, sur un terrain en herbe où rien n’est de niveau et où le vent décide de la cuisson autant que le feu. Vous les trouverez ici ramenés à cinq personnes, pour une table ordinaire un mardi soir. La recette n’a pas bougé, seule la marmite a rapetissé.

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
/* Une seule colonne de quantités depuis le 2026-08-24 : la mesure du
   festival est partie, et la place qu'elle laissait revient au texte.
   Les ingrédients tiennent sur une ligne plus large, la marche à
   suivre respire, et les corps de texte remontent d'un cran. */
.rec .cols { display:grid; grid-template-columns: 1.72in 1fr; gap:.3in; margin-top:.26in; flex:1;
  min-height:0; }
.lbl { font-family:'Cinzel',serif; font-size:7.4pt; letter-spacing:.24em; text-transform:uppercase;
  color:#a97c2a; padding-bottom:.05in; margin-bottom:.1in;
  border-bottom:1px solid rgba(169,124,42,.34); }
.rec.wide .cols { grid-template-columns: 3.05in 1fr; gap:.26in; }
.rec.wide .ing { column-count:2; column-gap:.22in; }
.rec.wide .ing li { break-inside:avoid; font-size:9pt; padding:.045in 0; }
.ing li { font-size:10pt; line-height:1.4; padding:.062in 0;
  border-bottom:1px dotted rgba(120,85,40,.2); }
.ing li b { font-weight:600; color:#8a6524; }
.chapeau { font-family:'Cormorant Garamond',serif; font-size:10.8pt; line-height:1.47;
  color:#4a3620; margin-top:.11in; max-width:4.6in; }
.steps li { font-size:11.2pt; line-height:1.55; padding-left:.32in; position:relative;
  margin-bottom:.15in; }
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
.rec[data-serre="1"] .steps li { font-size:10.4pt; margin-bottom:.115in; }
.rec[data-serre="1"] .chapeau  { font-size:10.2pt; line-height:1.42; }
.rec[data-serre="1"] .ing li   { font-size:9.2pt; padding:.042in 0; }
.rec[data-serre="1"] .note     { font-size:9pt; padding:.085in .11in; }
.rec[data-serre="2"] .steps li { font-size:9.6pt; line-height:1.46; margin-bottom:.086in; }
.rec[data-serre="2"] .chapeau  { font-size:9.6pt; line-height:1.38; }
.rec[data-serre="2"] .ing li   { font-size:8.5pt; padding:.03in 0; line-height:1.3; }
.rec[data-serre="2"] .note     { font-size:8.5pt; padding:.07in .1in; }
.rec[data-serre="3"] .steps li { font-size:8.9pt; line-height:1.4; margin-bottom:.062in; }
.rec[data-serre="3"] .chapeau  { font-size:9pt; line-height:1.32; }
.rec[data-serre="3"] .ing li   { font-size:7.8pt; padding:.02in 0; line-height:1.24; }
.rec[data-serre="3"] .note     { font-size:8pt; padding:.06in .09in; }
.rec[data-serre="3"] h2        { font-size:16.4pt; }

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
    """Combien de personnes la fiche du festival nourrit vraiment.

    Rend None quand le rendement ne se compte pas en personnes (une
    bouteille d'hypocras, un pot de beurre) : dans ce cas la colonne
    maison n'a pas de sens et le livre ne l'affiche pas.
    """
    t = (rendement or '').lower().replace('\u00a0', ' ')
    m = re.search(r'(\d+)\s*(portions?|brochettes?|tasses?)', t)
    if m:
        n = int(m.group(1))
        if 'brochette' in m.group(2):
            par = re.search(r'(\d+)\s*par portion', t)
            if par:
                n = max(1, n // int(par.group(1)))
        return n
    # « 454g · portions : 10g » : le rendement divisé par la portion.
    m = re.search(r'(\d+[.,]?\d*)\s*(kg|g|l|ml)\b.*?portions?\s*:?\s*(\d+[.,]?\d*)\s*(kg|g|l|ml)\b', t)
    if m:
        tot = _nombre(m.group(1)) * (1000 if m.group(2) in ('kg', 'l') else 1)
        par = _nombre(m.group(3)) * (1000 if m.group(4) in ('kg', 'l') else 1)
        if par > 0:
            return max(1, int(round(tot / par)))
    # Une bouteille, un pot : ça ne se divise pas par portions.
    if re.search(r'\b(bouteille|pot|pain)\b', t):
        return None
    return 50  # la marmite ordinaire du village

# Ce qu'une cuillère à thé pèse vraiment, pour les ingrédients qui
# descendent sous les cinq grammes une fois la recette ramenée à cinq
# personnes. Sous cette barre, une balance de cuisine ne sert à rien :
# on écrit la mesure que la personne peut réellement prendre.
GRAMMES_PAR_CUILLERE = {
    'sel': 6.0, 'sel kasher': 6.0, 'sucre': 4.2, 'cassonade': 4.5,
    'levure seche': 3.0, 'levure sèche': 3.0, 'levure fraiche': 5.0, 'levure fraîche': 5.0,
    'poudre a pate': 4.6, 'poudre à pâte': 4.6, 'bicarbonate de soude': 4.6,
    'cannelle': 2.6, 'canelle': 2.6, 'cumin': 2.1, 'paprika': 2.3, 'paprika doux': 2.3,
    'paprika fumé': 2.3, 'poivre': 2.4, 'poivre noir': 2.4, 'muscade': 2.2,
    'coriandre moulue': 1.8, 'marjolaine séchée': 0.9, 'graines de carvi moulues': 2.2,
    'piment d\'alep': 2.0, 'piments en poudre': 2.4, 'poudre d\'ail': 2.8,
    'poudre d\'oignon': 2.4, 'poivre de cayenne': 1.8, 'thym': 1.0, 'romarin': 1.2,
    'safran': 0.7, 'clou de girofle': 2.6, 'gingembre': 1.8, 'cardamone': 2.0,
    'origan': 1.0, 'sarriette': 1.0, 'laurier': 0.6, 'massis': 2.0,
    'persil': 1.6, 'ciboulette': 1.4, 'menthe': 1.4, 'coriandre': 1.6,
    'basilic': 1.2, 'aneth': 1.2, 'estragon': 1.2,
    # Le zeste se compte à la cuillère, jamais à la balance : deux
    # grammes de zeste d'orange ne se pèsent nulle part.
    'zeste': 2.0,
    # La moutarde se prend à la cuillère tant qu'elle reste sous la
    # cuillère à soupe : quatre grammes de dijon ne se pèsent pas.
    'dijon': 5.5, 'moutarde': 5.5,
    # La fiche du chef écrit « parpika fumé ». On ne corrige pas sa
    # feuille, on apprend juste à la lire.
    'parpika': 2.3,
}

# Au-delà d'une cuillère à soupe, la cuillère ne dit plus rien de
# clair : vingt grammes de sucre restent des grammes, et personne ne
# compte « une virgule six cuillère à soupe ». En deçà, l'épice se
# mesure, elle ne se pèse pas.
CUILLERES_MAX = 3


def _poids_cuillere(nom):
    """Ce qu'une cuillère à thé de cet ingrédient pèse, ou rien."""
    cle = (nom or '').strip().lower()
    for k, v in GRAMMES_PAR_CUILLERE.items():
        if cle == k or cle.startswith(k) or k in cle:
            return v
    return None

# Les herbes fraîches ne se pèsent pas au gramme dans une cuisine de
# maison : sous cinq grammes, on parle en poignées et en brins.
HERBES_FRAICHES = ('persil', 'ciboulette', 'menthe', 'coriandre', 'basilic',
                   'aneth', 'estragon', 'thym frais', 'romarin')

UNITES_MASSE = {'kg': 1000.0, 'g': 1.0}
UNITES_VOLUME = {'l': 1000.0, 'ml': 1.0}

def _nombre(txt):
    return float(txt.replace(',', '.'))

def _virgule(txt):
    return txt.replace('.', ',')


# Le tiers et les deux tiers de cuillère ont été retirés le 2026-08-24 :
# personne ne mesure un tiers de cuillère à soupe dans une cuisine de
# maison. Il ne reste que ce qu'un jeu de cuillères sait faire.
FRACTIONS = {0.25: '¼', 0.5: '½', 0.75: '¾'}

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
        # Au-dessus de cent, personne ne verse au millilitre près : on
        # arrondit au cinq le plus proche (312 ml devient 310 ml).
        return f"{int(round(x / 5) * 5)} {unite}"
    if x >= 10:
        return f"{int(round(x))} {unite}"
    v = round(x, 1)
    frac = _fraction(v % 1)
    if v < 1 and frac:
        return f"{frac} {unite}"
    s2 = _virgule(f"{v:.1f}".rstrip('0').rstrip('.'))
    return f"{s2} {unite}"

def _mesure_de_cuisine(grammes, nom):
    """Traduit une pesée minuscule en cuillères, ou en pincée."""
    cle = (nom or '').strip().lower()
    if any(h in cle for h in HERBES_FRAICHES) and 'sec' not in cle and 'séch' not in cle:
        if grammes < 2:
            return 'quelques brins'
        if grammes < 6:
            return 'une petite poignée'
        if grammes < 14:
            return 'une poignée'
        if grammes < 22:
            return 'une bonne poignée'
    poids = _poids_cuillere(cle)
    if poids is None:
        return None
    # Le safran ne se mesure jamais à la cuillère : il se compte en
    # pincées de filaments, quel que soit le poids.
    if 'safran' in cle:
        return 'une pincée' if grammes < 0.35 else 'une bonne pincée'
    cuilleres = grammes / poids
    if cuilleres < 0.12:
        return 'une pincée'
    if cuilleres < 0.22:
        return 'une bonne pincée'
    frac = _fraction(round(cuilleres, 2))
    if frac:
        return f'{frac} c. à thé'
    if cuilleres < 3:
        v = round(cuilleres * 4) / 4
        entier = int(v)
        reste = _fraction(round(v - entier, 2))
        if entier and reste:
            return f'{entier} {reste} c. à thé'
        if reste:
            return f'{reste} c. à thé'
        return f'{max(1, entier)} c. à thé'
    # La cuillère à soupe se compte par demies, jamais par décimales.
    soupes = round(cuilleres / 3 * 2) / 2
    entier = int(soupes)
    reste = _fraction(round(soupes - entier, 2))
    if entier and reste:
        return f'{entier} {reste} c. à soupe'
    if reste:
        return f'{reste} c. à soupe'
    return f'{max(1, entier)} c. à soupe'


def _mesure_liquide(ml):
    """Sous quinze millilitres, une cuillère vaut mieux qu'un chiffre."""
    if ml < 1.2:
        return 'quelques gouttes'
    if ml < 4:
        frac = _fraction(round(ml / 5, 2))
        return f'{frac} c. à thé' if frac else '½ c. à thé'
    if ml < 7.5:
        return '1 c. à thé'
    if ml < 12:
        return '2 c. à thé'
    if ml < 18:
        return '1 c. à soupe'
    return None


# ── Les quantités écrites DANS une marche à suivre ──────────────────
# Cinq étapes du livre portent un chiffre, et elles ne disent pas
# toutes la même chose. Certaines donnent ce que reçoit UNE part, le
# poids d'un pâton, la farce d'une datte, la contenance d'une tasse :
# celles-là ne se divisent jamais, elles sont déjà à l'échelle du
# convive. Les autres reprennent des quantités de la fiche et
# descendent à cinq personnes comme le reste. Chaque ligne a été relue
# à la main, rien n'est deviné (2026-08-24).
ETAPES_POUR_CINQ = {
    'pain insectes': [
        ('50 pâtons', '5 pâtons'),
    ],
    'olla gitana': [
        ("300ml huile", "30 ml d'huile"),
        ("1L bouillon", "100 ml de bouillon"),
        ("250ml vinaigre", "25 ml de vinaigre"),
    ],
}

# Ce qui porte un chiffre et reste tel quel, avec la raison. Le
# garde-fou de build() s'appuie là-dessus : une étape chiffrée qui
# n'est nommée ni ici ni au-dessus fait crier l'outil.
ETAPES_INCHANGEES = {
    'bloodbraud': "le poids d'une galette, déjà par portion",
    "les offrandes de l'oasis": "la farce d'une seule datte",
    'vin chaud': "la contenance d'une tasse, pas une quantité",
    'pain insectes': "le poids d'un pâton, déjà par portion",
}

ETAPE_CHIFFREE = re.compile(r'(\d+[.,]?\d*)\s*(kg|g|ml|l|L)\b(?!\w)')


def etapes_pour_cinq(txt, tab):
    """Applique à une étape les corrections relues pour cette recette."""
    for motif, remplacement in ETAPES_POUR_CINQ.get(tab, ()):
        txt = txt.replace(motif, remplacement)
    return txt


def _part_lisible(txt):
    """« 110g brut » s'écrit « 110 g brut » dans un livre."""
    t = re.sub(r'\s+', ' ', txt).strip().rstrip('.')
    return re.sub(
        r'(?i)\b(\d+[.,]?\d*)\s*(kg|g|ml|l)\b',
        lambda m: m.group(1).replace('.', ',') + ' '
        + ('L' if m.group(2).lower() == 'l' else m.group(2).lower()), t)


def rendement_pour_cinq(rendement, portions, tab=''):
    """Ce que la fiche donne une fois ramenée à cinq personnes.

    Le livre ne compte plus qu'en tablée de cinq. Ce qui ne se divise
    pas, une bouteille d'hypocras par exemple, garde le rendement de la
    fiche : une bouteille reste une bouteille.
    """
    t = (rendement or '').strip().replace(' ', ' ')
    if not portions:
        return _part_lisible(t)
    tete = 'tasses' if re.search(r'\btasses?\b', t.split('·')[0], re.I) else 'portions'
    # « 2 par portion » dit ce que chaque convive reçoit : ce chiffre
    # traverse le changement d'échelle sans bouger.
    m = re.search(r'(\d+)\s*par\s*portions?', t, re.I)
    if m:
        objet = 'brochettes' if 'brochette' in (t + tab).lower() else 'pièces'
        return f'5 portions · {m.group(1)} {objet} par personne'
    m = re.search(r'portions?\s*:?\s+([^·]+)$', t, re.I)
    part = _part_lisible(m.group(1)) if m else ''
    if not part or part.lower() == f'1 {tete[:-1]}':
        return f'5 {tete}'
    return f'5 {tete} · {part} par personne'


def pour_cinq(q, portions, nom=''):
    """Rend la quantité pour cinq personnes, ou None si ça n'a pas de sens."""
    if not q or not portions:
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
        grammes = val * UNITES_MASSE[unite]
        # Sous huit grammes, on ne pèse plus : on mesure. Les herbes
        # fraîches vont plus loin, elles se prennent à la poignée.
        herbe = any(h in (i_nom := (nom or '').lower()) for h in HERBES_FRAICHES) \
            and 'sec' not in i_nom and 'séch' not in i_nom
        # Le sel et les épices se prennent à la cuillère bien au-delà de
        # huit grammes : douze grammes de sel, ce sont deux cuillères à
        # thé, et c'est ainsi qu'une cuisine de maison les mesure.
        poids = _poids_cuillere(nom)
        epice = poids is not None and grammes <= poids * CUILLERES_MAX
        if grammes < 8 or (herbe and grammes < 22) or epice:
            mesure = _mesure_de_cuisine(grammes, nom)
            if mesure:
                return mesure
        if grammes < 1:
            return 'une pincée'
        return _joli(grammes, 'g')
    if unite in UNITES_VOLUME:
        ml = val * UNITES_VOLUME[unite]
        if ml < 18:
            mesure = _mesure_liquide(ml)
            if mesure:
                return mesure
        return _joli(ml, 'ml')
    if unite in ('un', 'unite', 'unites', 'gousse', 'gousses', 'bouteille', 'bouteilles'):
        n2 = max(1, int(round(val)))
        # « Une pièce de feuilles de laurier » ne se dit pas. Quand
        # l'ingrédient se compte, le livre écrit « 1 × feuille de
        # laurier », comme la fiche du chef l'écrit déjà.
        if unite.startswith(('gousse', 'bouteille')):
            mot = 'gousse' if unite.startswith('gousse') else 'bouteille'
            return f"{n2} {mot}{'s' if n2 > 1 else ''}"
        return f"{n2} ×"
    if unite in ('cat', 'cas'):
        # Personne ne mesure un tiers de cuillère à soupe : sous une
        # cuillère à soupe pleine, on redescend en cuillères à thé, et
        # sous le quart de cuillère à thé, on prend la pincée.
        cuilleres = val * (3 if unite == 'cas' else 1)   # en c. à thé
        if cuilleres < 0.12:
            return 'une pincée'
        if cuilleres < 0.22:
            return 'une bonne pincée'
        if cuilleres < 6:
            q = round(cuilleres * 4) / 4
            entier = int(q)
            reste = _fraction(round(q - entier, 2))
            if entier and reste:
                return f'{entier} {reste} c. à thé'
            if reste:
                return f'{reste} c. à thé'
            return f'{max(1, entier)} c. à thé'
        soupes = cuilleres / 3
        q = round(soupes * 2) / 2
        entier = int(q)
        reste = _fraction(round(q - entier, 2))
        if entier and reste:
            return f'{entier} {reste} c. à soupe'
        if reste:
            return f'{reste} c. à soupe'
        return f'{entier} c. à soupe'
    if unite == '' and suite == '':
        v = round(val, 1)
        return _virgule(f"{v:.1f}".rstrip('0').rstrip('.'))
    return None


def joli_depart(q):
    """Écrit la quantité du festival comme un cuisinier l'écrit."""
    t = (q or '').strip()
    # Une cuillère au centième ne se mesure pas. Sous le quart de
    # cuillère, on écrit ce que la main fait vraiment : une pincée.
    m = re.match(r'(?i)^([\d.,]+)\s*(cat|cas)\b\s*$', t)
    if m:
        v = float(m.group(1).replace(',', '.'))
        if m.group(2).lower() == 'cas':
            v *= 3
        if v < 0.12:
            return 'une pincée'
        if v < 0.24:
            return 'une bonne pincée'
        # Au-delà d'une douzaine de cuillères, personne ne compte : on
        # passe au volume (5 ml par cuillère à thé).
        if v > 12 and m.group(2).lower() == 'cat':
            return _joli(v * 5, 'ml')
        if m.group(2).lower() == 'cas':
            demi = round(v / 3 * 2) / 2
            entier = int(demi)
            reste = _fraction(round(demi - entier, 2))
            if entier and reste:
                return f'{entier} {reste} c. à soupe'
            if reste:
                return f'{reste} c. à soupe'
            return f'{entier} c. à soupe'
        frac = _fraction(round(v, 2))
        if frac:
            return f'{frac} c. à thé' if v < 1 else t
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


def page(inner, cls='', folio=None, runhead=None, cle=None):
    f = f'<div class="folio">· {folio} ·</div>' if folio else ''
    r = f'<div class="runhead">{esc(runhead)}</div>' if runhead else ''
    # `data-cle` sert au calage : après le rendu, la page qui déborde
    # se resserre d'un cran, puis on remesure (voir caler()).
    k = f' data-cle="{cle}" data-serre="0"' if cle else ''
    return f'<section class="page {cls}"{k}>{r}<div class="pad">{inner}</div>{f}</section>'


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
          Chaque ingrédient porte une seule mesure, celle qui nourrit cinq personnes autour
          d’une table ordinaire. Le rendement inscrit en tête de fiche vous dit ce que chacune
          reçoit.
        </p>
        <p style="font-size:11pt; line-height:1.6; max-width:3.6in">
          Les épices ont été arrondies vers le bas, et ce qui descendait sous le gramme se
          donne en cuillères et en pincées. Il est plus facile d’en rajouter à la fin que
          d’en retirer.
        </p>
        <p style="font-size:11pt; line-height:1.6; max-width:3.6in">
          Les temps de cuisson n’ont pas été divisés, parce qu’ils ne se divisent pas : un
          ragoût mijote aussi longtemps pour cinq personnes que pour cinquante, et seul le
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
        r = recs[tab]
        portions = portions_de(r.get('yield'))
        def ligne_ing(i):
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
            # Le h muet compte comme une voyelle : « d'huile », pas
            # « de huile ». La liste couvre ce qui passe en cuisine.
            H_MUET = ('huile', 'herbe', 'houmous', 'hummus', 'huitre', 'huître')
            voyelle = nom[:1] in "aeiouyéèêàâîôû" or nom.startswith(H_MUET)
            liaison = "d’" if voyelle else "de "
            if i['q']:
                # Une seule mesure par ingrédient depuis le 2026-08-24,
                # celle de la table de cinq. Quand la fiche ne se divise
                # pas, une bouteille d'hypocras par exemple, sa quantité
                # tient telle quelle.
                mesure = pour_cinq(i['q'], portions, i['n']) or joli_depart(i['q'])
                # « au goût » se met APRÈS l'ingrédient : un cuisinier
                # écrit « sel et poivre, au goût », jamais l'inverse.
                if mesure == 'au goût':
                    tete = f"{esc(clean(nom))}{esc(precision)}, <b>au goût</b>"
                else:
                    lien = '' if mesure.endswith('×') else liaison
                    tete = f"<b>{esc(mesure)}</b> {lien}{esc(nom)}{esc(precision)}"
            else:
                tete = esc(nom[0].upper() + nom[1:])
            return f"<li>{tete}</li>"
        ing = ''.join(ligne_ing(i) for i in r['ing'] if i['n'])
        # Les lignes en fin de fiche qui expliquent un sous-ensemble deviennent une note.
        steps, notes = [], []
        for s in r['steps']:
            (notes if re.match(r'^[a-zéèêà\' ]{3,24}\s*:', s.strip(), re.I) and len(steps) else steps).append(s)
        # Garde-fou : toute étape qui porte une quantité doit avoir été
        # relue à la main, sinon un chiffre du festival dormirait dans
        # une recette de cinq personnes sans que personne le voie.
        for s in r['steps']:
            if ETAPE_CHIFFREE.search(s) and tab not in ETAPES_POUR_CINQ \
                    and tab not in ETAPES_INCHANGEES:
                print(f'  ⚠ « {tab} » : quantité non relue dans une étape → {s[:70]}')
        body = ''.join(f'<li>{esc(etapes_pour_cinq(clean(s), tab))}</li>' for s in steps)
        note = ''.join(f'<div class="note">{esc(etapes_pour_cinq(clean(x), tab))}</div>'
                       for x in notes)
        wide = ' wide' if len([i for i in r['ing'] if i['n']]) > 15 else ''
        eau = filigrane(tab)
        pages.append(page(f"""
          <img class="filigrane" src="data:image/png;base64,{b64(eau)}" alt="">
          <header>
            <h2>{esc(TITRES.get(tab, clean(tab)))}</h2>
            <p class="yield">{esc(rendement_pour_cinq(r['yield'], portions, tab) or 'Pour cinq personnes')}</p>
            {f'<p class="chapeau">{esc(CHAPEAUX[tab])}</p>' if tab in CHAPEAUX else ''}
            <div class="orn" style="justify-content:flex-start; margin-top:.09in">
              <span class="rule-gold" style="width:1.15in"></span><span class="diamond"></span>
            </div>
          </header>
          <div class="cols">
            <div><p class="lbl">Ingrédients</p><ul class="ing">{ing}</ul></div>
            <div><p class="lbl">La façon de faire</p><ol class="steps">{body}</ol>{note}</div>
          </div>""", cls='rec' + wide, folio=folio, runhead=titre, cle=tab))

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
APERCU_PUBLIC = 'apercu-livre-recettes-v3.pdf'

RACINE = HERE.parent.parent


def deposer():
    """Recopie les deux PDF aux places d'ou le site et les courriels les servent."""
    cibles = [
        (HERE / 'grimoire-fmm-2026.pdf', RACINE / 'functions' / 'grimoire-fmm-2026.pdf'),
        (HERE / 'grimoire-fmm-2026-apercu.pdf', RACINE / 'public' / 'grimoire' / APERCU_PUBLIC),
    ]
    for source, cible in cibles:
        cible.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, cible)
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
              'Vingt-sept recettes écrites pour cinq personnes, réparties en six chapitres '
              'qui vont du pain viking à l’hypocras. Le livre coûte neuf dollars plus taxes '
              'et vous arrive par courriel, en format PDF.</p>'
              '<div class="orn"><span class="rule-gold" style="width:1.7in"></span></div></div></section>')
    (HERE / 'apercu.html').write_text(
        head + '<body>' + secs[0] + ''.join(choisies) + teaser + '</body></html>',
        encoding='utf-8')
    to_pdf('apercu.html', 'grimoire-fmm-2026-apercu.pdf')
    print('pdf ok')
    deposer()
