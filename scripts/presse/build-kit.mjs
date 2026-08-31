#!/usr/bin/env node
// ─── Le kit de presse du FMM, fabriqué en une commande ──────────────
//   npx vite --port 5221 --strictPort      (une seule fois, pour les captures)
//   node scripts/presse/capture-site.mjs   (une seule fois, idem)
//   node scripts/presse/build-kit.mjs
//
// Vingt-neuf visuels, chacun en six fichiers :
//   <base>-fr-texte.png      la carte avec son texte français
//   <base>-fr-texte-qr.png   la même, avec le code QR vers la page FR
//   <base>-en-texte.png      la carte avec son texte anglais
//   <base>-en-texte-qr.png   la même, avec le code QR vers la page EN
//   <base>-nu.png            la photo seule, blason, lien, signature
//   <base>-nu-qr.png         la même, avec le code QR vers l'accueil
//
// Les vingt-neuf visuels se rangent en deux familles :
//   · le festival sur place : treize cartes explicatives et douze
//     photographies, toutes tirées des archives du festival;
//   · le festival en ligne : quatre cartes bâties sur des captures du
//     site (jeux, Ordre, Montpellois, Apprendre).
//
// Le reste de public/presse/ :
//   logos/            le blason argenté, le blanc et un noir fabriqué ici
//   textes/           la présentation FR et EN, les crédits, le LISEZ-MOI
//   orbe-presse-chevaliers.webp  l'image carrée de l'orbe de la page /presse
//   thumbs/           les vignettes WebP de 640 px que la page affiche
//   fmm-kit-de-presse.zip, qui contient tout ce qui précède
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
import { PHOTOS, BASE_URL, LIEN_COURT } from './photos.mjs';
import { CARTES_SITE, CARTES_LIGNE, CREDIT_LENA } from './cards.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const LENA = path.join(ROOT, 'public/histoire/archives/lena');
const CAPTURES = path.join(HERE, 'captures');
const OUT = path.join(ROOT, 'public/presse');
const OUT_LOGOS = path.join(OUT, 'logos');
const OUT_TEXTES = path.join(OUT, 'textes');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fmm-presse-'));

const W = 1920;
const H = 1080;
const BONE = '#E8DDC1';
const OFFWHITE = '#F4EFE3';
const INK = '#0B0906';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900' +
  '&family=Cormorant+SC:wght@400;500;600;700' +
  '&family=Cormorant+Garamond:wght@400;500;600;700' +
  '&family=Inter:wght@300;400;500;600;700&display=swap';

const url = (p) => pathToFileURL(p).href;

// ─── 0. La liste des visuels, dans l'ordre du kit ───────────────────
// Un visuel porte son image, ses deux textes, sa cible de QR et, quand
// la photo vient d'un photographe nommé, sa signature.
const VISUELS = [
  ...CARTES_SITE.map((c) => ({
    base: `fmm-2026-${c.n}-${c.key}`,
    famille: 'sur-place', genre: 'carte',
    src: c.src, side: c.side, credit: c.credit, qr: c.qr, fr: c.fr, en: c.en,
  })),
  ...PHOTOS.map((p) => ({
    base: `fmm-carte-postale-${p.id}-${p.slug}`,
    famille: 'sur-place', genre: 'photo',
    src: { lena: p.orig, focus: p.focus }, side: p.side, credit: CREDIT_LENA,
    qr: { fr: '/', en: '/en' }, fr: p.fr, en: p.en,
  })),
  ...CARTES_LIGNE.map((c) => ({
    base: `fmm-2026-${c.n}-${c.key}`,
    famille: 'en-ligne', genre: 'carte',
    src: c.src, side: c.side, credit: c.credit, qr: c.qr, fr: c.fr, en: c.en,
  })),
];

// ─── 1. Les images, recadrées 16:9 et rien d'autre ──────────────────
// `focus` place le centre de la fenêtre 16:9 dans la hauteur de
// l'original. Sans lui, un portrait 1280 × 1920 perd son sujet : la
// fenêtre ne garde que 37 % de la hauteur, et le chevalier sort par le
// haut. Les captures du site sont déjà en 1920 × 1080 et passent tout
// droit.
const baseCache = new Map();
function sourcePath(src) {
  if (src.lena) return path.join(LENA, `${src.lena}.webp`);
  if (src.capture) return path.join(CAPTURES, `${src.capture}.png`);
  return path.join(ROOT, src.fichier);
}

// Le champ de badges : les jetons que les membres de l'Ordre
// collectionnent, semés sur le fond de nuit du site. Les rangées se
// décalent d'un demi-pas pour éviter la grille de tableur, et le tout
// s'assombrit vers la droite, là où le bandeau de texte se pose.
async function champBadges(page, n) {
  const dossier = path.join(ROOT, 'public/badges');
  const fichiers = fs.readdirSync(dossier).filter((f) => f.endsWith('.webp')).sort().slice(0, n);
  const cols = 8;
  const cases = fichiers
    .map((f, i) => {
      const decalage = Math.floor(i / cols) % 2 ? 118 : 0;
      return `<div class="case" style="transform: translateX(${decalage}px)">
        <img src="${url(path.join(dossier, f))}" alt="">
      </div>`;
    })
    .join('');
  const css = `
    body { background: #0c0a08; }
    .champ {
      position: absolute; inset: -80px -160px -80px -60px;
      display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 26px 22px;
      align-content: center; justify-items: center;
    }
    .case img { width: 176px; height: 176px; object-fit: contain;
      filter: drop-shadow(0 6px 18px rgba(0,0,0,0.6)) drop-shadow(0 0 26px rgba(232,177,74,0.16)); }
    .voile { position: absolute; inset: 0;
      background: radial-gradient(120% 90% at 22% 45%, rgba(12,10,8,0) 0%, rgba(12,10,8,0.55) 62%, rgba(12,10,8,0.86) 100%); }`;
  const dest = path.join(TMP, `champ-badges-${n}.png`);
  await shoot(page, shell(`<div class="champ">${cases}</div><div class="voile"></div>`, css), dest);
  return dest;
}

async function baseImage(src, page) {
  const key = JSON.stringify(src);
  if (baseCache.has(key)) return baseCache.get(key);
  if (src.badges) {
    const champ = await champBadges(page, src.badges);
    baseCache.set(key, champ);
    return champ;
  }
  const file = sourcePath(src);
  if (!fs.existsSync(file)) {
    throw new Error(`image absente : ${file}` + (src.capture
      ? '\n  → lancez `npx vite --port 5221 --strictPort` puis `node scripts/presse/capture-site.mjs`'
      : ''));
  }
  const focus = src.focus ?? 0.5;
  const { width, height } = await sharp(file).metadata();
  const cropH = Math.min(height, Math.round(width / (16 / 9)));
  const wanted = Math.round(height * focus - cropH / 2);
  const top = Math.max(0, Math.min(height - cropH, wanted));
  const dest = path.join(TMP, `base-${key.replace(/\W+/g, '_')}.png`);
  await sharp(file)
    .extract({ left: 0, top, width, height: cropH })
    .resize(W, H, { kernel: 'lanczos3' })
    .png({ compressionLevel: 6 })
    .toFile(dest);
  const ratio = W / width;
  // Agrandir une image plus qu'à une fois et demie la ramollit. La
  // völva du site ne fait que 1280 de large : ×1,5, à la limite.
  if (ratio > 1.6) throw new Error(`${file} : agrandissement ×${ratio.toFixed(2)}, trop fort`);
  const note = width < W ? ` (source ${width}×${height}, agrandie ×${ratio.toFixed(2)})` : '';
  console.log(`  ${path.basename(file)} focus ${focus}${note}`);
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
// quelle que soit la longueur de l'adresse. L'adresse encodée passe
// toujours par le domaine court : il redirige en 301 en gardant le
// chemin, et il tient sur une ligne de carte.
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
    --ombre: 0 1px 2px rgba(0, 0, 0, 0.95), 0 0 5px rgba(0, 0, 0, 0.9),
             0 0 14px rgba(0, 0, 0, 0.7), 0 0 32px rgba(0, 0, 0, 0.45);
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
  /* Le coin bas gauche tient le code QR, la signature de la
     photographe et l'adresse du site. Une rangée en flex : le QR à
     gauche, le bloc de texte à sa droite, tous deux calés sur la même
     ligne de base. Rien ne peut donc se chevaucher, quelle que soit la
     combinaison. */
  .corner {
    position: absolute; left: 58px; bottom: 34px;
    display: flex; align-items: flex-end; gap: 26px;
  }
  .corner .qr { border-radius: 8px; overflow: hidden; display: block; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.55); }
  .corner .qr img { display: block; }
  .stack { display: flex; flex-direction: column; gap: 10px; }
  /* La signature de la photographe : Cormorant SC en petites
     capitales, lettrage espacé, blanc cassé à 85 %, ombre douce. */
  .credit {
    font-family: 'Cormorant SC', 'Cormorant Garamond', Georgia, serif;
    font-weight: 600; font-size: 26px; font-variant: small-caps; line-height: 1.1;
    letter-spacing: 0.16em; color: rgba(244, 239, 227, 0.85);
    text-shadow: var(--ombre);
  }
  /* L'adresse du site, dans la fonte, la couleur et la taille exactes
     de la ligne meta des cartes. */
  .lien {
    font-family: 'Inter', system-ui, sans-serif; font-weight: 500; font-size: 13px;
    letter-spacing: 0.3em; text-transform: uppercase; color: rgba(232, 177, 74, 0.9);
    line-height: 1.2; text-shadow: var(--ombre);
  }
  ${extraCss}
</style></head><body><div class="frame">${body}</div></body></html>`;
}

// La hauteur du coin, pour que le texte du bandeau s'arrête au-dessus
// quand les deux se rangent du même côté.
function cornerHeight({ qr, credit }) {
  const stack = credit ? 26 * 1.1 + 10 + 13 * 1.2 : 13 * 1.2;
  return Math.round(Math.max(qr ? qr.side : 0, stack));
}

function cornerHtml({ qr, credit }) {
  const carre = qr
    ? `<span class="qr"><img src="${url(qr.file)}" width="${qr.side}" height="${qr.side}" alt=""></span>`
    : '';
  const signature = credit ? `<p class="credit">${credit}</p>` : '';
  return `<div class="corner">${carre}<div class="stack">${signature}<p class="lien">${LIEN_COURT}</p></div></div>`;
}

function carteHtml({ photoUrl, markUrl, side, credit, kicker, hook, body, meta, qr }) {
  // Le coin bas gauche mange le bas du bandeau quand celui-ci est du
  // même côté : le texte remonte pour lui laisser la place.
  const bottomPad = side === 'left' ? 34 + cornerHeight({ qr, credit }) + 48 : 150;
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
     ${cornerHtml({ qr, credit })}
     <img class="mark" src="${markUrl}" alt="">`,
    css,
  );
}

function nuHtml({ photoUrl, markUrl, credit, qr }) {
  return shell(
    `<img class="shot" src="${photoUrl}" alt="">
     ${cornerHtml({ qr, credit })}
     <img class="mark" src="${markUrl}" alt="">`,
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
// Le chevalier au plumet, celui qu'Alex préfère en haut du kit. Le
// casque tombe sur l'axe vertical du carré et dans son tiers haut, ce
// que le cercle de l'orbe demande. L'autre chevalier reste dans les
// cartes et les cartes postales. Agrandissement Lanczos plafonné,
// aucun filtre.
// Repères mesurés sur l'original : le casque tombe à x 0,379 et le
// haut du plumet à y 0,205. Le carré de 0,734 les met sur l'axe et dans
// le tiers haut du cercle, sans couper la plume.
const ORBE = { orig: '2025-IMG_5743', cx: 0.379, cy: 0.400, size: 0.734 };
async function buildOrbe() {
  const src = path.join(LENA, `${ORBE.orig}.webp`);
  const { width, height } = await sharp(src).metadata();
  const side = Math.round(Math.min(width, height) * ORBE.size);
  const left = Math.max(0, Math.min(width - side, Math.round(width * ORBE.cx - side / 2)));
  const top = Math.max(0, Math.min(height - side, Math.round(height * ORBE.cy - side / 2)));
  const ratio = 1400 / side;
  if (ratio > 1.6) throw new Error(`orbe : agrandissement ×${ratio.toFixed(2)}, trop fort`);
  const dest = path.join(OUT, 'orbe-presse-chevaliers.webp');
  await sharp(src)
    .extract({ left, top, width: side, height: side })
    .resize(1400, 1400, { kernel: 'lanczos3' })
    .webp({ quality: 90 })
    .toFile(dest);
  console.log(`  orbe-presse-chevaliers.webp ← ${ORBE.orig} carré ${side}px agrandi ×${ratio.toFixed(2)}`);
}

// ─── 7. Les textes du kit ───────────────────────────────────────────
// Tout vient de src/content.ts (SITE, HOME, FOOTER), des pages du site
// et du prix réel du banquet (NourriturePage). Rien n'est inventé.
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
équestres et les combats des troupes vikings pendant que le marché
ouvre ses étals d'artisans. La scène accueille les troupes du vendredi
au dimanche, et le banquet médiéval se sert à la torche, sur un feu de
bois véritable. Le festival est un organisme sans but lucratif porté
par une équipe de bénévoles.

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
Banquet médiéval : 65 $ plus taxes, 50 places, inscription jusqu'au
17 septembre 2026
La vente se fait en ligne par Zeffy.
${BASE_URL}/billets

LE FESTIVAL EN LIGNE

Le site vit toute l'année. Les jeux médiévaux du festival s'y jouent
sur mobile comme au bureau, le registre de l'Ordre tient les fiches de
ses membres et leurs badges, la boutique s'ouvre contre des Montpellois
gagnés en explorant le site, et la section Apprendre poursuit la
mission éducative du festival.
${BASE_URL}/jeux-en-ligne

CONTACT PRESSE

admin@festivalmedievaldemontpellier.org
514-418-3450

EN LIGNE

${BASE_URL}
https://www.facebook.com/FestivalMedievalMontpellier/
https://www.instagram.com/festivalmedievaldemontpellier/

PHOTOGRAPHIES

Photos : Léna LeBozec, photographe. La mention est obligatoire.
Les visuels du festival en ligne sont des captures du site et ne
portent aucune signature de photographe.
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
jousts and the Viking troupes while the market opens its artisan
stalls. The stage hosts the troupes from Friday to Sunday, and the
medieval banquet is served by torchlight, over a true wood fire. The
festival is a non-profit run by a team of volunteers.

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
Medieval banquet: $65 plus tax, 50 seats, registration until
September 17, 2026
Tickets are sold online through Zeffy.
${BASE_URL}/en/tickets

THE FESTIVAL ONLINE

The site is alive all year. The festival's medieval games are played
there on mobile and at the desk, the roll of the Order keeps its
members' cards and badges, the shop opens for Montpellois earned while
exploring the site, and the Learning section carries on the festival's
educational mission.
${BASE_URL}/en/online-games

PRESS CONTACT

admin@festivalmedievaldemontpellier.org
514-418-3450

ONLINE

${BASE_URL}/en
https://www.facebook.com/FestivalMedievalMontpellier/
https://www.instagram.com/festivalmedievaldemontpellier/

PHOTOGRAPHS

Photos: Léna LeBozec, photographer. The credit is required.
The visuals of the festival online are screenshots of the site and
carry no photographer credit.
`,
  'credits.txt': `CRÉDITS PHOTOGRAPHIQUES · PHOTO CREDITS

La plupart des photographies de ce kit sont de Léna LeBozec, et chacune
porte sa signature en bas à gauche. La mention suivante est obligatoire
à chaque publication :

    Photos : Léna LeBozec, photographe

La carte « Tresse et Tisse » est une photographie d'Alex T. St-Laurent
et porte sa propre signature. Les visuels du festival en ligne sont des
captures du site et ne portent aucune signature.

Most photographs in this kit are by Léna LeBozec, and each one carries
her credit in the bottom left corner. The following credit is required
with every publication:

    Photos: Léna LeBozec, photographer

The "Tresse et Tisse" card is a photograph by Alex T. St-Laurent and
carries his own credit. The visuals of the festival online are
screenshots of the site and carry no credit.

Le blason du Festival Médiéval de Montpellier garde ses proportions et
sa couleur. Merci de ne pas le redessiner, le recolorer ni l'étirer.

The Festival Médiéval de Montpellier crest keeps its proportions and
its colour. Please do not redraw, recolour or stretch it.
`,
  'LISEZ-MOI.txt': `KIT DE PRESSE · FESTIVAL MÉDIÉVAL DE MONTPELLIER
Édition 2026 · Caravanes & Saltimbanques
25 · 26 · 27 septembre 2026 · Montpellier, Québec

CE QUE CONTIENT LE KIT

Vingt-neuf visuels en 1920 × 1080, chacun en six fichiers.

...-fr-texte.png     La carte avec son texte français.
...-en-texte.png     La même carte en anglais.
...-nu.png           La photographie seule, avec le blason, l'adresse
                     du site et la signature de la photographe.
...-qr.png           N'importe laquelle des trois, avec un code QR qui
                     mène à la page du site qui traite du sujet.

Les visuels se rangent en deux familles. Le festival sur place réunit
treize cartes explicatives et douze photographies. Le festival en ligne
réunit quatre cartes bâties sur le site : les jeux médiévaux, le
registre de l'Ordre, la monnaie du site et la section Apprendre.

logos/                       Le blason argenté, le blanc et le noir,
                             chacun en pleine résolution et en 1024 px.
textes/                      Cette note, les crédits, et la
                             présentation du festival en français et
                             en anglais.

COMMENT CRÉDITER

Photos : Léna LeBozec, photographe

La mention est obligatoire pour toutes les photographies du festival,
qu'elles portent un texte ou non. La carte « Tresse et Tisse » est
d'Alex T. St-Laurent. Le blason garde ses proportions et sa couleur.

LES BILLETS

Passe journée 27 $, passe trois jours 65 $, banquet médiéval 65 $ plus
taxes. La vente se fait en ligne par Zeffy.
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

Twenty-nine visuals at 1920 × 1080, each one in six files.

...-fr-texte.png     The card with its French text.
...-en-texte.png     The same card in English.
...-nu.png           The photograph alone, with the crest, the site
                     address and the photographer's credit.
...-qr.png           Any of the three, with a QR code leading to the
                     page of the site on that topic.

The visuals come in two families. The festival on the grounds gathers
thirteen explanatory cards and twelve photographs. The festival online
gathers four cards built on the site itself: the medieval games, the
roll of the Order, the site currency and the Learning section.

logos/                       The silver crest, the white one and the
                             black one, at full size and at 1024 px.
textes/                      This note, the credits, and the festival
                             presentation in French and in English.

HOW TO CREDIT

Photos: Léna LeBozec, photographer

The credit is required for every festival photograph, with or without
text on it. The "Tresse et Tisse" card is by Alex T. St-Laurent. The
crest keeps its proportions and its colour.

TICKETS

Day pass $27, three-day pass $65, medieval banquet $65 plus tax.
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
// ces visuels et saute le reste : les tours de vérification visuelle
// coûtent une demi-heure autrement.
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

async function main() {
  if (!ONLY.length) fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT_LOGOS, { recursive: true });
  fs.mkdirSync(OUT_TEXTES, { recursive: true });
  const visuels = ONLY.length ? VISUELS.filter((v) => ONLY.some((k) => v.base.includes(k))) : VISUELS;
  if (!visuels.length) throw new Error(`--only=${ONLY.join(',')} ne correspond à aucun visuel`);

  console.log('Codes QR :');
  const qrs = new Map();
  for (const v of visuels) {
    qrs.set(`${v.base}:fr`, await buildQr(v.qr.fr));
    qrs.set(`${v.base}:en`, await buildQr(v.qr.en));
  }
  const qrAccueil = await buildQr('/');

  console.log('\nImages, recadrées 16:9 depuis les sources :');
  const markUrl = url(await buildLogoMark());

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  for (const v of visuels) {
    const photoUrl = url(await baseImage(v.src, page));
    for (const lang of ['fr', 'en']) {
      for (const withQr of [false, true]) {
        const dest = path.join(OUT, `${v.base}-${lang}-texte${withQr ? '-qr' : ''}.png`);
        const qr = withQr ? qrs.get(`${v.base}:${lang}`) : null;
        // La signature de la photographe suit ses photographies dans
        // les deux versions; sur une carte explicative elle attend la
        // version nue, où l'image est seule à parler.
        const credit = v.genre === 'photo' ? v.credit : null;
        await shoot(page, carteHtml({ photoUrl, markUrl, side: v.side, credit, ...v[lang], qr }), dest, { fit: true });
      }
    }
    // La version nue ne porte aucun mot de langue : un seul fichier
    // sert les deux, et son code QR mène à l'accueil du site.
    for (const withQr of [false, true]) {
      const dest = path.join(OUT, `${v.base}-nu${withQr ? '-qr' : ''}.png`);
      await shoot(page, nuHtml({ photoUrl, markUrl, credit: v.credit, qr: withQr ? qrAccueil : null }), dest);
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

  // Vignettes web. La page /presse affiche près de deux cents tuiles :
  // servir les PNG pleine résolution y mettrait des centaines de Mo. Les
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
  const nPng = fs.readdirSync(OUT).filter((n) => n.endsWith('.png')).length;
  console.log(`\n${nPng} PNG · ${zipName} · ${mo} Mo`);

  fs.rmSync(TMP, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
