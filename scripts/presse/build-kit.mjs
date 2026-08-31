#!/usr/bin/env node
// ─── Le kit de presse du FMM, fabriqué en une commande ──────────────
//   node scripts/presse/build-kit.mjs
//
// Produit dans public/presse/ :
//   · 24 cartes explicatives 1920×1080 (12 en français, 12 en anglais)
//   · les mêmes 24 avec un code QR discret en bas à gauche (suffixe -qr)
//   · 12 cartes postales 1920×1080 (la photo seule, signée), plus
//     leurs 12 variantes QR vers l'accueil du site
//   · logos/ : le blason argenté, le blanc et un noir fabriqué ici,
//     chacun en pleine résolution et en 1024 px
//   · textes/ : la présentation FR et EN, les crédits, le LISEZ-MOI
//   · orbe-presse.webp, l'image carrée de l'orbe de la page /presse
//   · thumbs/ : les vignettes WebP de 640 px que la page affiche
//   · fmm-kit-de-presse.zip, qui contient tout ce qui précède
//
// Le rendu passe par Chromium plutôt que par un compositeur d'images :
// les cartes héritent ainsi des vraies fontes du site (Cinzel
// Decorative, Cormorant SC, Cormorant Garamond, Inter) et de son
// approche typographique, au pixel près.
//
// 🚨 Règle dure, ordre d'Alex : aucun filtre, aucun dégradé, aucune
// correction de couleur ne touche les photos de Léna. Elle travaille
// déjà sa couleur. Le recadrage 16:9 est la seule opération subie par
// l'image; le texte se pose à côté, sur un bandeau de verre, jamais
// par-dessus la photo entière.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { chromium } from 'playwright';
import { PHOTOS, BASE_URL } from './photos.mjs';
import { CARDS } from './cards.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const LENA = path.join(ROOT, 'public/histoire/archives/lena');
const OUT = path.join(ROOT, 'public/presse');
const OUT_LOGOS = path.join(OUT, 'logos');
const OUT_TEXTES = path.join(OUT, 'textes');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fmm-presse-'));

const W = 1920;
const H = 1080;
const SIGNATURE = 'Léna LeBozec, photographe';
const BONE = '#E8DDC1';
const OFFWHITE = '#F4EFE3';
const INK = '#0B0906';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900' +
  '&family=Cormorant+SC:wght@400;500;600;700' +
  '&family=Cormorant+Garamond:wght@400;500;600;700' +
  '&family=Inter:wght@300;400;500;600;700&display=swap';

const url = (p) => pathToFileURL(p).href;

// ─── 1. Les photos, recadrées 16:9 et rien d'autre ──────────────────
// `focus` place le centre de la fenêtre 16:9 dans la hauteur de
// l'original. Sans lui, un portrait 1280 × 1920 perd son sujet : la
// fenêtre ne garde que 37 % de la hauteur, et le chevalier sort par le
// haut.
const baseCache = new Map();
async function basePhoto(orig, focus = 0.5) {
  const key = `${orig}@${focus}`;
  if (baseCache.has(key)) return baseCache.get(key);
  const src = path.join(LENA, `${orig}.webp`);
  const { width, height } = await sharp(src).metadata();
  const cropH = Math.min(height, Math.round(width / (16 / 9)));
  const wanted = Math.round(height * focus - cropH / 2);
  const top = Math.max(0, Math.min(height - cropH, wanted));
  const dest = path.join(TMP, `base-${orig}-${Math.round(focus * 100)}.png`);
  await sharp(src)
    .extract({ left: 0, top, width, height: cropH })
    .resize(W, H, { kernel: 'lanczos3' })
    .png({ compressionLevel: 6 })
    .toFile(dest);
  const note = width < W ? ` (original ${width}×${height}, agrandi ×${(W / width).toFixed(2)})` : '';
  console.log(`  ${orig} focus ${focus}${note}`);
  baseCache.set(key, dest);
  return dest;
}

// ─── 2. Le blason, détouré de ses poussières ────────────────────────
// Le PNG livré fait 3600×4800 avec une immense marge transparente et
// deux poussières isolées à droite du cavalier. Rognées ici, sinon le
// blason paraît décentré une fois posé dans le coin de la carte.
const CREST_CROP = { left: 805, top: 752, width: 2099, height: 2779 };
const SILVER_SRC = path.join(ROOT, 'public/fmm-logo-embossed-silver.png');

async function buildLogoMark() {
  const dest = path.join(TMP, 'mark-silver.png');
  await sharp(SILVER_SRC).extract(CREST_CROP).png().toFile(dest);
  return dest;
}

// Le blason plein, teinté d'une seule couleur. Le PNG blanc livré ne
// fait que 192 × 256 : agrandi, il bave. L'alpha du blason argenté
// porte exactement la même silhouette en 2099 × 2779, alors le noir et
// le blanc haute définition se taillent dedans.
async function buildLogoSolid(hex, dest) {
  const { width, height } = CREST_CROP;
  await sharp(SILVER_SRC)
    .extract(CREST_CROP)
    .composite([{ input: { create: { width, height, channels: 4, background: hex } }, blend: 'in' }])
    .png({ compressionLevel: 9 })
    .toFile(dest);
  return dest;
}

// ─── 3. Les codes QR ────────────────────────────────────────────────
// Correction de niveau M, encre noire, fond blanc cassé. Le module se
// dimensionne pour que le carré tombe entre 150 et 170 px de côté,
// quelle que soit la longueur de l'adresse.
const qrCache = new Map();
async function buildQr(target) {
  if (qrCache.has(target)) return qrCache.get(target);
  const full = target.startsWith('http') ? target : `${BASE_URL}${target}`;
  const { modules } = await QRCode.create(full, { errorCorrectionLevel: 'M' });
  const scale = Math.max(3, Math.min(6, Math.round(162 / (modules.size + 8))));
  const dest = path.join(TMP, `qr-${Buffer.from(full).toString('hex').slice(-24)}.png`);
  await QRCode.toFile(dest, full, {
    errorCorrectionLevel: 'M',
    margin: 4,
    scale,
    color: { dark: `${INK}ff`, light: `${OFFWHITE}ff` },
  });
  const side = (modules.size + 8) * scale;
  qrCache.set(target, { file: dest, side, full });
  console.log(`  QR ${side}px · ${full}`);
  return qrCache.get(target);
}

// ─── 4. Le gabarit ──────────────────────────────────────────────────

// Le bandeau de verre s'éteint en courbe douce plutôt qu'en rampe
// droite. Une rampe linéaire laisse une arête verticale en travers du
// ciel : l'œil attrape la cassure de pente, même quand l'opacité passe
// par plusieurs paliers. Le lissage de Perlin (6t⁵-15t⁴+10t³) a une
// dérivée nulle aux deux bouts, donc le bandeau naît et meurt sans
// bord. La zone de fondu couvre ici 39 % de la largeur de la carte.
const PLATE_W = 58; // % de la largeur de la carte
const SOLID_END = 0.32; // fraction du bandeau restée pleine
function plateGradient(dir, a0 = 0.86, stops = 18) {
  const smooth = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  const parts = [];
  for (let i = 0; i <= stops; i += 1) {
    const t = i / stops;
    const a = t <= SOLID_END ? a0 : a0 * (1 - smooth((t - SOLID_END) / (1 - SOLID_END)));
    parts.push(`rgba(12,10,8,${a.toFixed(4)}) ${(t * 100).toFixed(2)}%`);
  }
  return `linear-gradient(to ${dir}, ${parts.join(', ')})`;
}

function shell(body, extraCss = '') {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_HREF}">
<style>
  :root {
    --bone: ${BONE};
    --amber: #E8B14A;
    --night: #0c0a08;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: var(--night); }
  .frame { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
  .shot { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .mark {
    position: absolute; right: 58px; bottom: 34px; height: 112px; width: auto;
    opacity: 0.94;
    /* Sur une photo claire (les poteries, les paniers d'herbes), un
       blason blanc cassé disparaît. Le halo sombre le rattrape sans
       durcir le trait. */
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 7px rgba(0, 0, 0, 0.72))
            drop-shadow(0 0 20px rgba(0, 0, 0, 0.5));
  }
  /* Le carré du QR, en bas à gauche, à 3 % du bord. */
  .qr {
    position: absolute; left: 58px; bottom: 34px;
    border-radius: 8px; overflow: hidden; display: block;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
  }
  .qr img { display: block; }
  /* La signature de la photographe : Cormorant SC en petites
     capitales, lettrage espacé, blanc cassé à 85 %, ombre douce. */
  .credit {
    position: absolute; left: 58px; bottom: 62px;
    font-family: 'Cormorant SC', 'Cormorant Garamond', Georgia, serif;
    font-weight: 600; font-size: 26px; font-variant: small-caps;
    letter-spacing: 0.16em; color: rgba(244, 239, 227, 0.85);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.95), 0 0 5px rgba(0, 0, 0, 0.9),
                 0 0 14px rgba(0, 0, 0, 0.7), 0 0 32px rgba(0, 0, 0, 0.45);
  }
  ${extraCss}
</style></head><body><div class="frame">${body}</div></body></html>`;
}

function qrTag(qr) {
  if (!qr) return '';
  return `<span class="qr"><img src="${url(qr.file)}" width="${qr.side}" height="${qr.side}" alt=""></span>`;
}

function cardHtml({ photoUrl, markUrl, side, kicker, hook, body, meta, qr }) {
  // Le QR se pose dans le coin bas gauche : quand le bandeau est de ce
  // côté, son texte remonte pour lui laisser la place.
  const bottomPad = qr && side === 'left' ? 96 + qr.side + 46 : side === 'left' ? 96 : 150;
  const css = `
  .plate {
    position: absolute; top: 0; bottom: 0; width: ${PLATE_W}%;
    display: flex; flex-direction: column; justify-content: center;
  }
  .plate.left  { left: 0;  padding: 96px 430px ${bottomPad}px 88px; background: ${plateGradient('right')}; }
  .plate.right { right: 0; padding: 96px 88px ${bottomPad}px 430px; background: ${plateGradient('left')}; }
  .kicker {
    font-family: 'Inter', system-ui, sans-serif; font-weight: 500; font-size: 14px;
    letter-spacing: 0.42em; text-transform: uppercase; color: var(--amber);
  }
  .hook {
    font-family: 'Cinzel Decorative', Georgia, serif; font-weight: 400;
    color: var(--bone); line-height: 1.1; margin-top: 30px;
  }
  .rule { width: 74px; height: 1px; background: var(--amber); opacity: 0.75; margin: 34px 0 30px; }
  .body {
    font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 400; font-size: 31px;
    line-height: 1.52; color: rgba(232, 221, 193, 0.84); text-wrap: pretty;
  }
  .meta {
    font-family: 'Inter', system-ui, sans-serif; font-weight: 500; font-size: 13px;
    letter-spacing: 0.3em; text-transform: uppercase; color: rgba(232, 177, 74, 0.9);
    margin-top: 44px; text-wrap: pretty;
  }`;
  return shell(
    `<img class="shot" src="${photoUrl}" alt="">
     <div class="plate ${side}">
       <p class="kicker">${kicker}</p>
       <h1 class="hook" id="hook">${hook}</h1>
       <span class="rule"></span>
       <p class="body">${body}</p>
       <p class="meta">${meta}</p>
     </div>
     ${qrTag(qr)}
     <img class="mark" src="${markUrl}" alt="">`,
    css,
  );
}

function postcardHtml({ photoUrl, markUrl, qr }) {
  // Sans QR, la signature tient le coin. Avec, elle se range à sa
  // droite, à mi-hauteur du carré, et les deux forment un seul bloc.
  const css = qr
    ? `.credit { left: ${58 + qr.side + 24}px; bottom: ${Math.round(34 + qr.side / 2 - 17)}px; }`
    : '';
  return shell(
    `<img class="shot" src="${photoUrl}" alt="">
     ${qrTag(qr)}
     <p class="credit">${SIGNATURE}</p>
     <img class="mark" src="${markUrl}" alt="">`,
    css,
  );
}

// ─── 5. Le rendu ────────────────────────────────────────────────────
// L'accroche ne dépasse JAMAIS deux lignes (règle dure d'Alex). Le
// gabarit part de 62 px et redescend d'un pixel à la fois tant que le
// titre déborde, plutôt que de laisser la copie couler sur trois
// lignes.
async function fitHook(page) {
  await page.evaluate(() => {
    const el = document.getElementById('hook');
    if (!el) return;
    const lh = () => parseFloat(getComputedStyle(el).lineHeight);
    for (let size = 62; size >= 30; size -= 1) {
      el.style.fontSize = `${size}px`;
      if (el.offsetHeight <= lh() * 2 + 2) return;
    }
  });
}

// Chromium refuse de charger une image file:// depuis une page posée
// par setContent (origine « about:blank »). Le gabarit s'écrit donc sur
// le disque, à côté des photos, et la page y navigue pour de vrai.
//
// La capture de Playwright sort un PNG RGBA peu compressé : 2,6 Mo par
// carte, soit 190 Mo pour la série complète. Le même pixel repassé
// dans sharp sans alpha, en compression 9, tombe à 0,9 Mo, sans perte.
let shotSeq = 0;
async function shoot(page, html, dest, { fit = false } = {}) {
  const stage = path.join(TMP, `stage-${shotSeq++}.html`);
  fs.writeFileSync(stage, html);
  await page.goto(url(stage), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))),
    ),
  );
  if (fit) await fitHook(page);
  const raw = await page.screenshot({ type: 'png' });
  await sharp(raw).removeAlpha().png({ compressionLevel: 9, effort: 8 }).toFile(dest);
  console.log(`  ${path.basename(dest)}`);
}

// ─── 6. L'orbe de la page /presse ───────────────────────────────────
// Un carré serré sur le guerrier, tête et épaules dans le tiers haut
// du cercle, tiré de l'original et non de la vignette. Agrandissement
// Lanczos plafonné, aucun filtre.
const ORBE = { orig: '2025-IMG_5107', cx: 0.469, cy: 0.457, size: 0.82 };
async function buildOrbe() {
  const src = path.join(LENA, `${ORBE.orig}.webp`);
  const { width, height } = await sharp(src).metadata();
  const side = Math.round(Math.min(width, height) * ORBE.size);
  const left = Math.max(0, Math.min(width - side, Math.round(width * ORBE.cx - side / 2)));
  const top = Math.max(0, Math.min(height - side, Math.round(height * ORBE.cy - side / 2)));
  const ratio = 1400 / side;
  if (ratio > 1.6) throw new Error(`orbe : agrandissement ×${ratio.toFixed(2)}, trop fort`);
  const dest = path.join(OUT, 'orbe-presse.webp');
  await sharp(src)
    .extract({ left, top, width: side, height: side })
    .resize(1400, 1400, { kernel: 'lanczos3' })
    .webp({ quality: 90 })
    .toFile(dest);
  console.log(`  orbe-presse.webp ← ${ORBE.orig} carré ${side}px agrandi ×${ratio.toFixed(2)}`);
}

// ─── 7. Les textes du kit ───────────────────────────────────────────
// Tout vient de src/content.ts (SITE, HOME, FOOTER) et des pages du
// site. Rien n'est inventé.
const TEXTES = {
  'festival-fr.txt': `FESTIVAL MÉDIÉVAL DE MONTPELLIER
Édition 2026 · Caravanes & Saltimbanques

EN UNE PHRASE

Le Festival Médiéval de Montpellier réunit les caravanes et les
saltimbanques dans le village de Montpellier, au Québec, du 25 au 27
septembre 2026.

EN UN PARAGRAPHE

Trois jours sur les routes du temps. Les caravanes et les saltimbanques
s'installent dans le village de Montpellier, en Outaouais, avec le
tarot, les tambours et les clans nordiques. L'arène reçoit les joutes
équestres et les combats en armure pendant que le marché ouvre ses
étals d'artisans. La scène accueille les troupes du vendredi au
dimanche, et le banquet médiéval se sert à la torche. Le festival est
un organisme sans but lucratif porté par une équipe de bénévoles et
opéré par Le Salon des Inconnus.

QUAND

25 · 26 · 27 septembre 2026.
Les portes ouvrent le vendredi à 17 h.

OÙ

4 rue du Bosquet, Montpellier, Québec.
Dans la Petite-Nation, en Outaouais. À ne pas confondre avec
Montpellier en France.

BILLETS

Passe journée : 27 $
Passe trois jours : 65 $, bracelet officiel FMM compris
Banquet médiéval : prix à venir
La vente se fait en ligne par Zeffy.
${BASE_URL}/billets

CONTACT PRESSE

admin@festivalmedievaldemontpellier.org
514-418-3450

EN LIGNE

${BASE_URL}
https://www.facebook.com/FestivalMedievalMontpellier/
https://www.instagram.com/festivalmedievaldemontpellier/

PHOTOGRAPHIES

Photos : Léna LeBozec, photographe. La mention est obligatoire.
`,
  'festival-en.txt': `FESTIVAL MÉDIÉVAL DE MONTPELLIER
2026 edition · Caravans & Players

IN ONE SENTENCE

The Festival Médiéval de Montpellier gathers caravans and travelling
players in the village of Montpellier, Quebec, from September 25 to 27,
2026.

IN ONE PARAGRAPH

Three days on the roads of time. Caravans and travelling players settle
into the village of Montpellier, in the Outaouais region of Quebec,
with tarot, drums and the Nordic clans. The arena takes the mounted
jousts and the armoured combat while the market opens its artisan
stalls. The stage hosts the troupes from Friday to Sunday, and the
medieval banquet is served by torchlight. The festival is a non-profit
run by a team of volunteers and operated by Le Salon des Inconnus.

WHEN

September 25 · 26 · 27, 2026.
Gates open Friday at 5 p.m.

WHERE

4 rue du Bosquet, Montpellier, Quebec.
In the Petite-Nation region of Outaouais. Not to be confused with
Montpellier in France.

TICKETS

Day pass: $27
Three-day pass: $65, official FMM wristband included
Medieval banquet: price to be announced
Tickets are sold online through Zeffy.
${BASE_URL}/en/tickets

PRESS CONTACT

admin@festivalmedievaldemontpellier.org
514-418-3450

ONLINE

${BASE_URL}/en
https://www.facebook.com/FestivalMedievalMontpellier/
https://www.instagram.com/festivalmedievaldemontpellier/

PHOTOGRAPHS

Photos: Léna LeBozec, photographer. The credit is required.
`,
  'credits.txt': `CRÉDITS PHOTOGRAPHIQUES · PHOTO CREDITS

Toutes les photographies de ce kit sont de Léna LeBozec.
La mention suivante est obligatoire à chaque publication :

    Photos : Léna LeBozec, photographe

All photographs in this kit are by Léna LeBozec.
The following credit is required with every publication:

    Photos: Léna LeBozec, photographer

Le blason du Festival Médiéval de Montpellier garde ses proportions et
sa couleur. Merci de ne pas le redessiner, le recolorer ni l'étirer.

The Festival Médiéval de Montpellier crest keeps its proportions and
its colour. Please do not redraw, recolour or stretch it.
`,
  'LISEZ-MOI.txt': `KIT DE PRESSE · FESTIVAL MÉDIÉVAL DE MONTPELLIER
Édition 2026 · Caravanes & Saltimbanques
25 · 26 · 27 septembre 2026 · Montpellier, Québec

CE QUE CONTIENT LE KIT

fmm-2026-NN-sujet-fr.png     Douze cartes explicatives en français,
                             1920 × 1080, blason du festival compris.
fmm-2026-NN-sujet-en.png     Les mêmes douze cartes en anglais.
...-qr.png                   La même carte avec un code QR qui mène à
                             la page du site qui traite du sujet.
fmm-carte-postale-NN-...png  Douze photographies sans texte, signées.
                             Leur variante QR mène à l'accueil.
logos/                       Le blason argenté, le blanc et le noir,
                             chacun en pleine résolution et en 1024 px.
textes/                      Cette note, les crédits, et la
                             présentation du festival en français et
                             en anglais.

COMMENT CRÉDITER

Photos : Léna LeBozec, photographe

La mention est obligatoire. Elle vaut pour les cartes comme pour les
photographies sans texte. Le blason garde ses proportions et sa
couleur.

LES BILLETS

Passe journée 27 $, passe trois jours 65 $, banquet médiéval à venir.
La vente se fait en ligne par Zeffy.
${BASE_URL}/billets

UNE QUESTION

admin@festivalmedievaldemontpellier.org
514-418-3450
${BASE_URL}/presse
`,
  'README.txt': `PRESS KIT · FESTIVAL MÉDIÉVAL DE MONTPELLIER
2026 edition · Caravans & Players
September 25 · 26 · 27, 2026 · Montpellier, Quebec

WHAT IS IN THE KIT

fmm-2026-NN-topic-fr.png     Twelve explanatory cards in French,
                             1920 × 1080, festival crest included.
fmm-2026-NN-topic-en.png     The same twelve cards in English.
...-qr.png                   The same card with a QR code that leads
                             to the page of the site on that topic.
fmm-carte-postale-NN-...png  Twelve photographs without text, signed.
                             Their QR variant leads to the home page.
logos/                       The silver crest, the white one and the
                             black one, at full size and at 1024 px.
textes/                      This note, the credits, and the festival
                             presentation in French and in English.

HOW TO CREDIT

Photos: Léna LeBozec, photographer

The credit is required. It applies to the cards as much as to the
photographs without text. The crest keeps its proportions and its
colour.

TICKETS

Day pass $27, three-day pass $65, medieval banquet to be announced.
Tickets are sold online through Zeffy.
${BASE_URL}/en/tickets

A QUESTION

admin@festivalmedievaldemontpellier.org
514-418-3450
${BASE_URL}/en/press
`,
};

// ─── 8. Le tout ─────────────────────────────────────────────────────
// `node scripts/presse/build-kit.mjs --only=escrime,marche` ne rend que
// ces cartes et saute le reste : les tours de vérification visuelle
// coûtent dix minutes autrement.
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

async function main() {
  if (!ONLY.length) fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT_LOGOS, { recursive: true });
  fs.mkdirSync(OUT_TEXTES, { recursive: true });
  const cartes = ONLY.length ? CARDS.filter((c) => ONLY.includes(c.key)) : CARDS;

  console.log('Codes QR :');
  const qrs = new Map();
  for (const c of cartes) {
    qrs.set(`${c.key}:fr`, await buildQr(c.qr.fr));
    qrs.set(`${c.key}:en`, await buildQr(c.qr.en));
  }
  const qrAccueil = await buildQr('/');

  console.log('\nPhotos, recadrées 16:9 depuis les originaux de Léna :');
  const markUrl = url(await buildLogoMark());

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  console.log('\nCartes explicatives :');
  for (const card of cartes) {
    const photoUrl = url(await basePhoto(card.orig, card.focus));
    for (const lang of ['fr', 'en']) {
      for (const withQr of [false, true]) {
        const suffix = withQr ? '-qr' : '';
        const dest = path.join(OUT, `fmm-2026-${card.n}-${card.key}-${lang}${suffix}.png`);
        const qr = withQr ? qrs.get(`${card.key}:${lang}`) : null;
        await shoot(page, cardHtml({ photoUrl, markUrl, side: card.side, ...card[lang], qr }), dest, {
          fit: true,
        });
      }
    }
  }

  console.log('\nCartes postales :');
  for (const p of (ONLY.length ? PHOTOS.slice(0, 1) : PHOTOS)) {
    const photoUrl = url(await basePhoto(p.orig, p.focus));
    for (const withQr of [false, true]) {
      const suffix = withQr ? '-qr' : '';
      const dest = path.join(OUT, `fmm-carte-postale-${p.id}-${p.slug}${suffix}.png`);
      await shoot(page, postcardHtml({ photoUrl, markUrl, qr: withQr ? qrAccueil : null }), dest);
    }
  }

  await browser.close();
  if (ONLY.length) { console.log('\n(--only : logos, textes, vignettes et zip sautés)'); fs.rmSync(TMP, { recursive: true, force: true }); return; }

  console.log('\nOrbe de la page :');
  await buildOrbe();

  console.log('\nLogos :');
  const silverFull = path.join(OUT_LOGOS, 'fmm-logo-embossed-silver.png');
  fs.copyFileSync(SILVER_SRC, silverFull);
  fs.copyFileSync(path.join(ROOT, 'public/fmm-logo-white.png'), path.join(OUT_LOGOS, 'fmm-logo-white.png'));
  const noirFull = await buildLogoSolid(INK, path.join(OUT_LOGOS, 'fmm-logo-noir.png'));
  const blancHD = await buildLogoSolid('#FFFFFF', path.join(TMP, 'blason-blanc-hd.png'));
  const crestSilver = await buildLogoMark();
  const to1024 = async (src, name) => {
    await sharp(src).resize({ width: 1024 }).png({ compressionLevel: 9, effort: 8 }).toFile(path.join(OUT_LOGOS, name));
  };
  await to1024(crestSilver, 'fmm-logo-argent-1024.png');
  await to1024(blancHD, 'fmm-logo-blanc-1024.png');
  await to1024(noirFull, 'fmm-logo-noir-1024.png');
  for (const f of fs.readdirSync(OUT_LOGOS)) console.log(`  logos/${f}`);

  console.log('\nTextes :');
  for (const [name, contenu] of Object.entries(TEXTES)) {
    fs.writeFileSync(path.join(OUT_TEXTES, name), contenu, 'utf8');
    console.log(`  textes/${name}`);
  }

  // Vignettes web. La page /presse affiche une soixantaine de tuiles :
  // servir les PNG pleine résolution y mettrait des dizaines de Mo. Les
  // tuiles montrent un WebP de 640 px, le bouton Télécharger sert le
  // PNG d'origine. Le blason garde sa transparence, il se pose sur du
  // verre sombre.
  console.log('\nVignettes 640 px :');
  const thumbs = path.join(OUT, 'thumbs');
  fs.mkdirSync(thumbs, { recursive: true });
  let nThumbs = 0;
  const toThumb = async (src, name) => {
    await sharp(src).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(thumbs, name));
    nThumbs += 1;
  };
  for (const f of fs.readdirSync(OUT).filter((n) => n.endsWith('.png'))) {
    await toThumb(path.join(OUT, f), f.replace(/\.png$/, '.webp'));
  }
  // Le blason argenté traîne 3600 × 4800 de marge transparente : la
  // vignette part de la version détourée, sinon la tuile montre du vide.
  await toThumb(crestSilver, 'fmm-logo-embossed-silver.webp');
  await toThumb(blancHD, 'fmm-logo-white.webp');
  await toThumb(crestSilver, 'fmm-logo-argent-1024.webp');
  await toThumb(blancHD, 'fmm-logo-blanc-1024.webp');
  await toThumb(noirFull, 'fmm-logo-noir.webp');
  await toThumb(noirFull, 'fmm-logo-noir-1024.webp');
  console.log(`  ${nThumbs} vignettes`);

  const zipName = 'fmm-kit-de-presse.zip';
  execFileSync('zip', ['-r', '-q', zipName, '.', '-i', '*.png', 'logos/*', 'textes/*'], { cwd: OUT });
  const mo = (fs.statSync(path.join(OUT, zipName)).size / 1048576).toFixed(1);
  console.log(`\n${zipName} · ${mo} Mo`);

  fs.rmSync(TMP, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
