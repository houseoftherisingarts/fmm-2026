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
  '/contact',            '/en/contact',
  '/jeunesse/hnefatafl', '/en/youth/hnefatafl',
];
const urls = ['/', '/en', ...slugs, ...extraPublic, '/politique-de-confidentialite', '/en/privacy'];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${ROOT}${u}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u === '/' || u === '/en' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${u === '/' || u === '/en' ? '1.0' : '0.7'}</priority>
  </url>`).join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${ROOT}/sitemap.xml
`;

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml, 'utf8');
await writeFile(new URL('../public/robots.txt',   import.meta.url), robots, 'utf8');

console.log(`✓ sitemap.xml (${urls.length} urls)`);
console.log('✓ robots.txt');
