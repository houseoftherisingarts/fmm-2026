// Vérifie, dans un vrai navigateur et sans compte, que le système des
// billets non membres reste invisible tant que le drapeau de site
// `billetsNonMembres` est éteint : prix membres sur /billets, aucune
// porte, aucun rabais annoncé. Playwright local, en tête sans écran.
//   node tools/billets-non-membres-check.mjs [http://localhost:5251]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:5251';
const sortie = process.argv[3] || 'captures';
mkdirSync(sortie, { recursive: true });

const TAXE = 1.14975;
const prix = (m) => (m / TAXE).toFixed(2).replace('.', ',');
// Les huit cartes, dans l'ordre de la page : six entrées puis deux
// campings. Pour chacune, le prix membre attendu et le prix majoré de
// cinq dollars qui ne doit apparaître nulle part. La comparaison se fait
// carte par carte : un prix majoré peut être, ailleurs, le prix membre
// légitime d'un autre billet (25 $ enfant fin de semaine, 40 $ caravane).
const CARTES = [
  { nom: 'Enfant, une journée',            membre: 20,  majore: 25 },
  { nom: 'Adulte, une journée',            membre: 35,  majore: 40 },
  { nom: 'Famille, une journée',           membre: 90,  majore: 95 },
  { nom: 'Enfant, passe fin de semaine',   membre: 25,  majore: 30 },
  { nom: 'Adulte, passe fin de semaine',   membre: 55,  majore: 60 },
  { nom: 'Famille, passe fin de semaine',  membre: 125, majore: 130 },
  { nom: 'Emplacement tente',              membre: 20,  majore: null },
  { nom: 'Emplacement caravane',           membre: 40,  majore: null },
];

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
// La campagne Zeffy s'ouvrirait en onglet : on referme tout ce qui s'ajoute.
ctx.on('page', (p) => { if (p !== page) p.close().catch(() => {}); });

// `networkidle` ne vient jamais : l'écoute Firestore garde une connexion
// ouverte. On attend les cartes, puis le drapeau qui arrive du serveur.
await page.goto(`${base}/billets`, { waitUntil: 'domcontentloaded' });
await page.locator('.gwent-card').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(2500);

// Retourner toutes les cartes : le prix vit au recto.
for (const carte of await page.locator('.gwent-card').all()) {
  await carte.click();
  await page.waitForTimeout(120);
}
await page.waitForTimeout(700);

const rectos = await page.locator('.gwent-front').allInnerTexts();
const manquants = [];
const intrus = [];
if (rectos.length !== CARTES.length) {
  manquants.push(`${rectos.length} cartes lues au lieu de ${CARTES.length}`);
} else {
  CARTES.forEach((c, i) => {
    if (!rectos[i].includes(prix(c.membre))) manquants.push(`${c.nom} : ${prix(c.membre)} attendu`);
    if (c.majore && rectos[i].includes(prix(c.majore))) intrus.push(`${c.nom} : ${prix(c.majore)} affiché`);
    if (c.majore && rectos[i].includes(`${c.majore} $`)) intrus.push(`${c.nom} : ${c.majore} $ au paiement`);
  });
}

const texte = await page.locator('body').innerText();
const mots = ['Économisez', 'devenant membre', 'rabais', 'non membre']
  .filter((m) => texte.toLowerCase().includes(m.toLowerCase()));

// Le bouton d'achat ne doit pas convoquer la porte : on écoute son
// événement plutôt que le texte du modal, qui arrive en chargement lazy.
await page.evaluate(() => {
  window.__porte = false;
  window.addEventListener('fmm:porte-billets', () => { window.__porte = true; });
});
await page.locator('a', { hasText: 'Choisir ce billet' }).first().click({ force: true });
await page.waitForTimeout(900);
const porte = await page.evaluate(() => window.__porte === true);

await page.screenshot({ path: `${sortie}/billets-desktop.png`, fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${sortie}/billets-mobile.png`, fullPage: true });

await nav.close();

const fautes = [];
if (manquants.length) fautes.push(`prix membres absents : ${manquants.join(', ')}`);
if (intrus.length)    fautes.push(`prix majorés affichés : ${intrus.join(', ')}`);
if (mots.length)      fautes.push(`mention non membre : ${mots.join(', ')}`);
if (porte)            fautes.push('la porte du rabais s’est ouverte');

if (fautes.length) { console.error('ÉCHEC\n- ' + fautes.join('\n- ')); process.exit(1); }
console.log(`OK · ${CARTES.length} cartes au tarif membre, aucune porte, aucune mention non membre.`);
console.log(`Captures : ${sortie}/billets-desktop.png · ${sortie}/billets-mobile.png`);
