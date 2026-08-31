#!/usr/bin/env node
// ─── Les captures du site, pour les cartes « Le festival en ligne » ──
//   npx vite --port 5221 --strictPort
//   node scripts/presse/capture-site.mjs
//
// Ces quatre cartes ne montrent pas une photo mais le site lui-même. La
// capture se prend en 1920 × 1080, à la taille exacte d'une carte, et se
// range dans scripts/presse/captures/ pour que build-kit.mjs n'ait plus
// besoin d'un serveur qui tourne.
//
// Le défilement passe par la molette : Lenis pilote le scroll, un
// scrollIntoView ne bouge rien.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'captures');
const BASE = process.env.FMM_BASE || 'http://localhost:5221';

// Les tours de molette ont été choisis à la sonde, une capture tous les
// deux tours, puis à l'œil sur la planche-contact.
//   · /jeux-en-ligne montre ses années de jeu au deuxième tour
//   · /boutique s'ouvre en `?apercu=1`, qui saute la porte des membres
//     en développement, et montre ses articles dès le premier tour
//   · /histoire met neuf secondes à se poser avant de valoir une image
// /ordre a été écarté : sans compte, la page ne montre qu'une invitation
// à se connecter. La carte de l'Ordre se bâtit sur ses badges.
const PAGES = [
  // /histoire passe en premier : lancée en troisième, elle rendait un
  // écran blanc, le voile de transition du site ne se levant plus.
  { nom: 'apprendre', url: '/histoire', tours: 3, attente: 9000, ancre: 'Apprendre, c’est traverser les siècles' },
  { nom: 'jeux', url: '/jeux-en-ligne', tours: 2, attente: 3000 },
  { nom: 'boutique', url: '/boutique?apercu=1', tours: 1, attente: 3000 },
];

// `node capture-site.mjs --sonde` prend une capture tous les deux tours
// de molette sur chaque page, pour choisir le bon endroit à l'œil.
const SONDE = process.argv.includes('--sonde');

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

for (const p of PAGES) {
  // Un onglet neuf par page. En réutilisant le même, la troisième
  // navigation rendait un écran blanc alors que le texte était bien
  // dans le DOM : le voile de transition du site ne se levait plus.
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  // Le bandeau de consentement se règle d'avance dans le stockage local;
  // la barre de navigation se cache au moment de la capture.
  await page.addInitScript(() => {
    try { localStorage.setItem('fmm.consent.v1', 'accepted'); } catch { /* noop */ }
  });
  // Le site redirige parfois côté client (intro, garde de page) : on
  // laisse la navigation se stabiliser avant de toucher au contexte.
  await page.goto(BASE + p.url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  // Une longue page se fait attendre par son texte, pas au chronomètre :
  // /histoire est resté blanc plusieurs fois derrière un délai fixe.
  if (p.ancre) {
    await page.waitForFunction(
      // innerText rend le texte AFFICHÉ : une section en petites
      // capitales CSS sort en majuscules, d'où la comparaison sans casse.
      (mot) => document.body.innerText.toLowerCase().includes(mot.toLowerCase()),
      p.ancre,
      { timeout: 60000 },
    );
  }
  await page.waitForTimeout(p.attente ?? 2500);
  await page.addStyleTag({
    content: 'header, nav, [class*="ConsentBanner"], .fmm-consent { visibility: hidden !important; }',
  });
  // Tout ce qui flotte au-dessus de la page se cache juste avant la
  // capture : la barre de navigation, le bandeau de consentement et la
  // fenêtre de badge qui saute à l'écran au premier défilement.
  const poser = async () => {
    await page.waitForTimeout(1400);
    await page.evaluate(() => {
      // Le défilement souple pose lui aussi un conteneur fixe, qui tient
      // toute la page : seuls les petits calques se cachent.
      const plein = window.innerWidth * window.innerHeight * 0.6;
      document.querySelectorAll('body *').forEach((el) => {
        if (getComputedStyle(el).position !== 'fixed') return;
        const r = el.getBoundingClientRect();
        if (r.width * r.height < plein) el.style.visibility = 'hidden';
      });
    }).catch(() => {});
    // Une image paresseuse sans src ne résout jamais son decode() : la
    // page /histoire en compte des centaines, et l'attente restait
    // suspendue pour toujours. D'où la course contre un chronomètre.
    await page
      .evaluate(
        () =>
          Promise.race([
            Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null)))),
            new Promise((r) => setTimeout(r, 5000)),
          ]),
      )
      .catch(() => {});
  };
  if (SONDE) {
    for (let t = 0; t <= 24; t += 2) {
      if (t) for (let i = 0; i < 2; i += 1) { await page.mouse.wheel(0, 700); await page.waitForTimeout(150); }
      await poser();
      await page.screenshot({ path: path.join(OUT, `sonde-${p.nom}-${String(t).padStart(2, '0')}.png`), animations: 'disabled' });
    }
    console.log(`  sonde ${p.nom} : 13 captures`);
    await page.close();
    continue;
  }
  const tours = p.tours ?? 0;
  const dest = path.join(OUT, `${p.nom}.png`);
  // Une page unie sort à quelques kilo-octets : c'est le voile de
  // transition resté en place. On recharge et on recommence plutôt que
  // de livrer un rectangle blanc dans le kit de presse.
  let essai = 0;
  for (;;) {
    for (let i = 0; i < tours; i += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(160);
    }
    await poser();
    await page.screenshot({ path: dest, animations: 'disabled' });
    const poids = fs.statSync(dest).size;
    if (poids > 60000) {
      console.log(`  captures/${p.nom}.png ← ${p.url} (${tours} tours, ${Math.round(poids / 1024)} ko)`);
      break;
    }
    essai += 1;
    if (essai > 3) throw new Error(`${p.nom} : la page reste unie après quatre essais`);
    console.log(`     page unie (${poids} o), essai ${essai + 1}`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    if (p.ancre) {
      await page.waitForFunction(
        (mot) => document.body.innerText.toLowerCase().includes(mot.toLowerCase()),
        p.ancre,
        { timeout: 60000 },
      );
    }
    await page.waitForTimeout((p.attente ?? 2500) + 3000 * essai);
    await page.addStyleTag({
      content: 'header, nav, [class*="ConsentBanner"], .fmm-consent { visibility: hidden !important; }',
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
  }
  await page.close();
}

await browser.close();
