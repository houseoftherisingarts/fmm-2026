// Bulk-download page-specific images from the live Wix CDN into
// /public/wix/{slug}/. Skips known sponsor-logo IDs (already in
// /public/sponsors/). One-off — re-runnable.

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/Users/lesalondesinconnus/Documents/Websites/FMM 2026';
const HTML = path.join(ROOT, '_wix-clone/html');
const OUT  = path.join(ROOT, 'public/wix');

const PAGES = [
  ['activites',  '03-activites.html'],
  ['nourriture', '04-nourriture.html'],
  ['musique',    '06-musique.html'],
  ['benevole',   '11-benevole.html'],
  ['marche',     '02-marche.html'],
  ['jeunesse',   '05-jeunesse.html'],
  ['chevaux',    '07-chevaux.html'],
  ['apprendre',  '08-apprendre.html'],
  ['hebergement','09-hebergement.html'],
  ['partenaires','10-partenaires.html'],
  ['histoire',   '12-histoire.html'],
  ['mariages',   '13-mariages.html'],
];

const SKIP = new Set([
  '150c7c904ea7435989d81adc027bd9e3',
  '6d903a21409b475d911ce064f11f409c',
  'cb8622e8477f483c917e4cb53d1dafaa',
  'a0e208f986c64248b71880a45fb958c2',
  'de2f95faaf6a4525be3fdad697e425c9',
  'b17fdda9624c4645b079ae19c0a7cff0',
]);

const RX = /static\.wixstatic\.com\/media\/57b705_([a-f0-9]+)~mv2\.(png|jpg|jpeg|webp)/g;

for (const [slug, file] of PAGES) {
  const html = await readFile(path.join(HTML, file), 'utf8');
  const seen = new Map();
  for (const m of html.matchAll(RX)) {
    const id = m[1];
    const ext = m[2];
    if (SKIP.has(id)) continue;
    if (!seen.has(id)) seen.set(id, ext);
  }
  const dir = path.join(OUT, slug);
  await mkdir(dir, { recursive: true });
  const items = [...seen.entries()];
  console.log(`[${slug}] downloading ${items.length} images…`);
  for (const [id, ext] of items) {
    const url = `https://static.wixstatic.com/media/57b705_${id}~mv2.${ext}/v1/fill/w_1600,h_1000,al_c,q_85,enc_avif,quality_auto/57b705_${id}~mv2.${ext}`;
    const short = id.slice(0, 8);
    const target = path.join(dir, `${short}.${ext === 'png' ? 'png' : 'jpg'}`);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`status ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      await writeFile(target, buf);
      console.log(`  ✓ ${short}.${ext}  (${(buf.length/1024).toFixed(0)}kb)`);
    } catch (e) {
      console.log(`  ✗ ${short}.${ext}: ${e.message}`);
    }
  }
}
console.log('done.');
