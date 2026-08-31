#!/usr/bin/env node
// ─── Le kit de presse du FMM, fabriqué en une commande ──────────────
//   node scripts/presse/build-kit.mjs
//
// Produit dans public/presse/ :
//   · 12 cartes explicatives 1920×1080 (6 en français, 6 en anglais)
//   · 8 cartes postales 1920×1080 (la photo seule, signée)
//   · les deux logos officiels, copiés tels quels
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
import { chromium } from 'playwright';
import { PHOTOS, PHOTO_BY_ID } from './photos.mjs';
import { CARDS } from './cards.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const LENA = path.join(ROOT, 'public/histoire/archives/lena');
const OUT = path.join(ROOT, 'public/presse');
const OUT_LOGOS = path.join(OUT, 'logos');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fmm-presse-'));

const W = 1920;
const H = 1080;
const SIGNATURE = 'Léna LeBozec, photographe';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900' +
  '&family=Cormorant+SC:wght@400;500;600;700' +
  '&family=Cormorant+Garamond:wght@400;500;600;700' +
  '&family=Inter:wght@300;400;500;600;700&display=swap';

// ─── 1. Les photos, recadrées 16:9 et rien d'autre ──────────────────
async function buildBasePhotos() {
  const base = {};
  for (const p of PHOTOS) {
    const src = path.join(LENA, `${p.orig}.webp`);
    const { width, height } = await sharp(src).metadata();
    const cropH = Math.round(width / (16 / 9));
    const top = Math.round((height - cropH) / 2);
    const dest = path.join(TMP, `base-${p.id}.png`);
    await sharp(src)
      .extract({ left: 0, top, width, height: cropH })
      .resize(W, H, { kernel: 'lanczos3' })
      .png({ compressionLevel: 6 })
      .toFile(dest);
    base[p.id] = dest;
    const note = width < W ? ` (original ${width}×${height}, agrandi ×${(W / width).toFixed(2)})` : '';
    console.log(`  photo ${p.id} ${p.slug} ← ${p.orig}.webp${note}`);
  }
  return base;
}

// ─── 2. Le blason, détouré de ses poussières ────────────────────────
// Le PNG livré fait 3600×4800 avec une immense marge transparente et
// deux poussières isolées à droite du cavalier. Rognées ici, sinon le
// blason paraît décentré une fois posé dans le coin de la carte.
async function buildLogoMark() {
  const src = path.join(ROOT, 'public/fmm-logo-embossed-silver.png');
  const dest = path.join(TMP, 'mark-silver.png');
  await sharp(src).extract({ left: 805, top: 752, width: 2099, height: 2779 }).png().toFile(dest);
  return dest;
}

// ─── 3. Le gabarit ──────────────────────────────────────────────────
const url = (p) => pathToFileURL(p).href;

function shell(body, extraCss = '') {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_HREF}">
<style>
  :root {
    --bone: #E8DDC1;
    --amber: #E8B14A;
    --night: #0c0a08;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: var(--night); }
  .frame { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
  .shot { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .mark {
    position: absolute; right: 62px; bottom: 34px; height: 108px; width: auto;
    opacity: 0.92; filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.55));
  }
  ${extraCss}
</style></head><body><div class="frame">${body}</div></body></html>`;
}

function cardHtml({ photoUrl, markUrl, side, kicker, hook, body, meta }) {
  const css = `
  .plate {
    position: absolute; top: 0; bottom: 0; width: 42%;
    display: flex; flex-direction: column; justify-content: center;
  }
  .plate.left {
    left: 0; padding: 96px 168px 96px 92px;
    background: linear-gradient(to right, rgba(12,10,8,0.84) 0%, rgba(12,10,8,0.80) 76%, rgba(12,10,8,0) 100%);
  }
  .plate.right {
    right: 0; padding: 96px 92px 210px 168px;
    background: linear-gradient(to left, rgba(12,10,8,0.84) 0%, rgba(12,10,8,0.80) 76%, rgba(12,10,8,0) 100%);
  }
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
    line-height: 1.52; color: rgba(232, 221, 193, 0.84);
  }
  .meta {
    font-family: 'Inter', system-ui, sans-serif; font-weight: 500; font-size: 13px;
    letter-spacing: 0.3em; text-transform: uppercase; color: rgba(232, 177, 74, 0.9);
    margin-top: 44px;
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
     <img class="mark" src="${markUrl}" alt="">`,
    css,
  );
}

function postcardHtml({ photoUrl, markUrl }) {
  const css = `
  .credit {
    position: absolute; left: 62px; bottom: 60px;
    font-family: 'Inter', system-ui, sans-serif; font-weight: 400; font-size: 22px;
    letter-spacing: 0.04em; color: rgba(255, 255, 255, 0.85);
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.72), 0 0 18px rgba(0, 0, 0, 0.45);
  }`;
  return shell(
    `<img class="shot" src="${photoUrl}" alt="">
     <p class="credit">${SIGNATURE}</p>
     <img class="mark" src="${markUrl}" alt="">`,
    css,
  );
}

// ─── 4. Le rendu ────────────────────────────────────────────────────
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

async function shoot(page, html, dest, { fit = false } = {}) {
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))),
    ),
  );
  if (fit) await fitHook(page);
  await page.screenshot({ path: dest, type: 'png' });
  console.log(`  ${path.basename(dest)}`);
}

// ─── 5. Le tout ─────────────────────────────────────────────────────
async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT_LOGOS, { recursive: true });

  console.log('Photos, recadrées 16:9 depuis les originaux de Léna :');
  const base = await buildBasePhotos();
  const markUrl = url(await buildLogoMark());

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });

  console.log('\nCartes explicatives :');
  for (const card of CARDS) {
    const photoUrl = url(base[card.photo]);
    for (const lang of ['fr', 'en']) {
      const dest = path.join(OUT, `fmm-2026-${card.n}-${card.key}-${lang}.png`);
      await shoot(page, cardHtml({ photoUrl, markUrl, side: card.side, ...card[lang] }), dest, {
        fit: true,
      });
    }
  }

  console.log('\nCartes postales :');
  for (const p of PHOTOS) {
    const dest = path.join(OUT, `fmm-carte-postale-${p.id}-${p.slug}.png`);
    await shoot(page, postcardHtml({ photoUrl: url(base[p.id]), markUrl }), dest);
  }

  await browser.close();

  console.log('\nLogos :');
  for (const f of ['fmm-logo-embossed-silver.png', 'fmm-logo-white.png']) {
    fs.copyFileSync(path.join(ROOT, 'public', f), path.join(OUT_LOGOS, f));
    console.log(`  logos/${f}`);
  }

  const zipName = 'fmm-kit-de-presse.zip';
  execFileSync('zip', ['-r', '-q', zipName, '.', '-i', '*.png', 'logos/*'], { cwd: OUT });
  const kb = Math.round(fs.statSync(path.join(OUT, zipName)).size / 1024);
  console.log(`\n${zipName} · ${kb} Ko`);

  fs.rmSync(TMP, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
