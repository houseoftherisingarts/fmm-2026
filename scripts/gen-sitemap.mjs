// Generate /public/sitemap.xml + /public/robots.txt from PILLARS.
// Run via `node scripts/gen-sitemap.mjs` after route changes.

import { readFile, writeFile } from 'node:fs/promises';

const ROOT = 'https://www.festivalmedievaldemontpellier.org';
const today = new Date().toISOString().slice(0, 10);

// Parse PILLARS slugs out of src/content.ts so this stays in sync.
const content = await readFile(new URL('../src/content.ts', import.meta.url), 'utf8');
const slugRx = /slug:\s*\{\s*FR:\s*'([^']+)'\s*,\s*EN:\s*'([^']+)'/g;
const slugs = [];
for (const m of content.matchAll(slugRx)) slugs.push(m[1], m[2]);

// Public, indexable routes only. Private routes (/admin, /compte, /messages,
// /espace-benevole, /profil/:uid) and dynamic application forms are
// intentionally excluded from the sitemap.
const extraPublic = [
  '/accueil',            '/en/accueil',
  '/communaute',         '/en/community',
  '/ressources',         '/en/resources',
  '/babillard',          '/en/notice-board',
  '/contact',            '/en/contact',
  '/jeunesse/hnefatafl', '/en/youth/hnefatafl',
  '/billets',            '/en/tickets',
];
// Paires FR/EN pour les hreflang. Les slugs de PILLARS arrivent déjà en
// paires (FR, EN); on y ajoute les paires manuelles.
const pairs = [['/', '/en']];
for (let i = 0; i < slugs.length; i += 2) pairs.push([slugs[i], slugs[i + 1]]);
for (let i = 0; i < extraPublic.length; i += 2) pairs.push([extraPublic[i], extraPublic[i + 1]]);
pairs.push(['/politique-de-confidentialite', '/en/privacy']);

const urls = pairs.flat();
const altOf = Object.fromEntries(pairs.flatMap(([fr, en]) => [[fr, [fr, en]], [en, [fr, en]]]));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map((u) => {
  const [fr, en] = altOf[u];
  return `  <url>
    <loc>${ROOT}${u}</loc>
    <xhtml:link rel="alternate" hreflang="fr-CA" href="${ROOT}${fr}" />
    <xhtml:link rel="alternate" hreflang="en-CA" href="${ROOT}${en}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${ROOT}${fr}" />
    <lastmod>${today}</lastmod>
    <changefreq>${u === '/' || u === '/en' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${u === '/' || u === '/en' ? '1.0' : '0.7'}</priority>
  </url>`;
}).join('\n')}
</urlset>
`;

// Les robots IA (GPTBot, ClaudeBot, PerplexityBot...) restent les bienvenus :
// être cité par les moteurs génératifs est voulu (stratégie GEO).
const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /compte
Disallow: /en/account
Disallow: /messages
Disallow: /en/messages
Disallow: /espace-benevole
Disallow: /en/volunteer-space
Disallow: /profil/
Disallow: /en/profile/
Disallow: /communaute
Disallow: /en/community

Sitemap: ${ROOT}/sitemap.xml
`;

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml, 'utf8');
await writeFile(new URL('../public/robots.txt',   import.meta.url), robots, 'utf8');

console.log(`✓ sitemap.xml (${urls.length} urls)`);
console.log('✓ robots.txt');
