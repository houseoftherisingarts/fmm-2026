// Régénère le bloc JSON-LD FAQPage d'index.html à partir de
// src/content/faq.json, la même source que la section visible de la
// page Billets. À relancer après tout changement de la FAQ :
//   node tools/faq-jsonld.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const faq = JSON.parse(readFileSync('src/content/faq.json', 'utf8'));
const bloc = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((q) => ({
    '@type': 'Question',
    name: q.qFR,
    acceptedAnswer: { '@type': 'Answer', text: q.rFR },
  })),
});
let html = readFileSync('index.html', 'utf8');
const re = /<script type="application\/ld\+json">\s*\{"@context":"https:\/\/schema\.org","@type":"FAQPage"[\s\S]*?<\/script>/;
if (!re.test(html)) throw new Error('Bloc FAQPage introuvable dans index.html');
html = html.replace(re, `<script type="application/ld+json">\n    ${bloc}\n    </script>`);
writeFileSync('index.html', html);
console.log(`FAQPage régénéré : ${faq.length} questions`);
