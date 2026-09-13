// Script de vérification visuelle temporaire (RULE -5), Plan du marché.
// Ouvre /admin en mode DEV_BYPASS, capture la vue rangées, un panneau
// de kiosque ouvert et l'état après avoir posé un marchand du rail sur
// un kiosque, en 1440x900 et en 390x844. Capture aussi /qa-plan (l'espace
// exposant avec un kiosque déjà attribué).

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5179';
const OUT = '/Users/lesalondesinconnus/Documents/Websites/FMM 2026/captures/plan-marche';
mkdirSync(OUT, { recursive: true });

const TAILLES = [
  { nom: '1440', width: 1440, height: 900 },
  { nom: '390', width: 390, height: 844 },
];

async function franchirLaPorte(page) {
  // La bannière de témoins ne doit jamais se trouver dans nos captures
  // du plan du marché : le consentement est posé d'avance en local,
  // exactement comme la vraie bannière l'aurait écrit après un refus.
  await page.addInitScript(() => {
    window.localStorage.setItem('fmm.consentement.v2', JSON.stringify({
      mesure: false, publicite: false, tiers: false,
      horodatage: new Date().toISOString(), version: '2026-09-02',
    }));
  });
  // Le portail DEV_BYPASS demande de choisir un rôle avant d'entrer :
  // en super-admin, toutes les portes s'ouvrent, on prend celle du CA.
  await page.goto(`${BASE}/admin`, { waitUntil: 'load' });
  const porteCA = page.getByText(/CA \(CONSEIL D.ADMIN/i).first();
  await porteCA.waitFor({ timeout: 10000 });
  await porteCA.locator('xpath=ancestor::button[1]').getByText('ENTRER').click();
  await page.waitForTimeout(400);
}

async function ouvrirPlanMarche(page) {
  // Un goto direct vers /admin/planMarche relance l'appli et fait
  // retomber sur la porte (le rôle choisi vit dans l'état React, pas
  // dans l'URL) : on clique donc l'entrée du menu, comme Jesse le ferait.
  await page.getByText('Plan du marché', { exact: false }).first().click();
  await page.waitForTimeout(600);
}

for (const taille of TAILLES) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: taille.width, height: taille.height } });
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[console:${taille.nom}]`, m.text()); });
  page.on('pageerror', (e) => console.log(`[pageerror:${taille.nom}]`, e.message));

  await franchirLaPorte(page);
  await ouvrirPlanMarche(page);

  // 1) Vue rangées, telle quelle.
  await page.screenshot({ path: `${OUT}/01-rangees-${taille.nom}.png`, fullPage: true });

  // 2) Panneau d'un kiosque ouvert : la première carte de kiosque.
  const premiereCarte = page.locator('[title*="libre"], [title*="·"]').first();
  await premiereCarte.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/02-panneau-kiosque-${taille.nom}.png`, fullPage: true });
  // Fermer le panneau (clic sur le voile).
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 3) Poser un marchand du rail sur un kiosque libre, par le geste
  //    « en main » (toucher le marchand, puis toucher le kiosque),
  //    plus fiable ici que le drag-and-drop natif HTML5 sous Playwright.
  const marchand = page.locator('aside p.font-sans.text-xs.text-ivory').first();
  await marchand.click();
  await page.waitForTimeout(300);
  const kiosqueLibre = page.locator('[title*="libre"]').first();
  await kiosqueLibre.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/03-marchand-pose-${taille.nom}.png`, fullPage: true });

  await browser.close();
}

// 4) L'espace exposant, /qa-plan, kiosque déjà attribué.
for (const taille of TAILLES) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: taille.width, height: taille.height } });
  await page.goto(`${BASE}/qa-plan`, { waitUntil: 'load' });
  await page.waitForSelector('text=Mon kiosque', { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04-mon-kiosque-${taille.nom}.png`, fullPage: true });
  await browser.close();
}

console.log('Captures écrites dans', OUT);
