// Ping IndexNow (Bing, Seznam, Naver, Yandex...) après chaque deploy.
// Bing alimente ChatGPT search : l'indexation rapide y sert la visibilité IA.
// Run: node scripts/indexnow-ping.mjs
const KEY = '7032a599230a68c3d60e2a78b685d2fb';
const HOST = 'www.festivalmedievaldemontpellier.org';
const res = await fetch('https://' + HOST + '/sitemap.xml');
const xml = await res.text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const r = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: 'https://' + HOST + '/' + KEY + '.txt', urlList: urls }),
});
console.log('IndexNow:', r.status, urls.length + ' urls');
