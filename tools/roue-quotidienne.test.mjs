// ─── Le banc de la roue quotidienne ──────────────────────────────────
// Alex, 2026-09-02 : la roue servait le jour 1 deux jours de suite. La
// fenêtre glissante de 24 heures en était la cause; la règle compte
// désormais par journée civile dans le fuseau du festival.
//
// Ce banc ne récrit pas la règle : il va CHERCHER les deux moitiés dans
// leurs fichiers (functions/index.js et src/firebase/montpellois.ts),
// les exécute pour de vrai, et vérifie qu'elles disent la même chose sur
// une douzaine de scénarios. Si une des deux dérive, le banc casse.
//
//   node tools/roue-quotidienne.test.mjs
//
// Aucune écriture, aucun accès au réseau, aucun identifiant.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = (f) => readFileSync(path.join(racine, f), 'utf8');

// ── Les deux moitiés, extraites de leurs fichiers ────────────────────
function extraire(texte, debut, fin, fichier) {
  const a = texte.indexOf(debut);
  const b = texte.indexOf(fin, a + 1);
  if (a < 0 || b < 0) throw new Error(`Bloc introuvable dans ${fichier} : la règle a été déplacée ou renommée.`);
  return texte.slice(a, b);
}

const SOURCE_SERVEUR = lire('functions/index.js');
const SOURCE_CLIENT = lire('src/firebase/montpellois.ts');

// Le serveur : ses deux aides de date, sa roue, et la décision même,
// prise mot pour mot dans le corps de la transaction. Rien n'est récrit
// ici, sinon `Date.now()` qui devient l'instant que le scénario impose.
const reclamerServeur = new Function('data', 'maintenant', 'HttpsError', `
  ${extraire(SOURCE_SERVEUR, 'const FUSEAU_FESTIVAL', '// ── La roue des sept jours', 'functions/index.js')}
  ${extraire(SOURCE_SERVEUR, 'const ROUE_QUOTIDIENNE = [', 'const MONTPELLOIS_DE_REMPLACEMENT', 'functions/index.js')}
  ${extraire(SOURCE_SERVEUR, '    // Une réclamation par journée civile', '    const don = ROUE_QUOTIDIENNE[', 'functions/index.js')
      .replace('Date.now()', 'maintenant')}
  return { suite, jour };`);

// Le panneau : ses fonctions exportées, telles quelles, les types en moins.
const client = new Function(`${stripTypeScriptTypes(
  extraire(SOURCE_CLIENT, 'export const FUSEAU_FESTIVAL', '/** Le prix des skins', 'src/firebase/montpellois.ts'),
).replace(/^export /gm, '')}
  return { journeeFestival, dejaReclameAujourdhui, suiteApresReclamation, resteAvantMinuitFestival };`)();

class RefusDuServeur extends Error {}

/** Une visite, jouée par le vrai code du serveur. */
function reclamer(dernierMs, suiteEnregistree, maintenant) {
  const data = { quotidienSuite: suiteEnregistree };
  if (dernierMs) data.dernierQuotidien = { toMillis: () => dernierMs };
  try {
    return { refus: false, ...reclamerServeur(data, maintenant, RefusDuServeur) };
  } catch (e) {
    if (e instanceof RefusDuServeur) return { refus: true };
    throw e;
  }
}

// ── Lire « 2026-09-07 21:00 » dans le fuseau du festival ─────────────
const LECTURE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
function t(local) {
  const vise = Date.parse(`${local.replace(' ', 'T')}:00Z`);
  let ms = vise;
  // Deux passes : la première trouve le décalage, la seconde le confirme
  // même les jours où l'heure change.
  for (let i = 0; i < 2; i++) {
    const p = {};
    for (const m of LECTURE.formatToParts(new Date(ms))) p[m.type] = m.value;
    ms += vise - Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);
  }
  return ms;
}

// ── Les scénarios ────────────────────────────────────────────────────
// Chacun rejoue une suite de visites et donne le résultat attendu :
// 'refus' quand la récompense est déjà prise, sinon le numéro de suite.
const SCENARIOS = [
  ['La toute première réclamation, bourse neuve',
    ['2026-09-07 09:00'], [1]],
  ['Deux réclamations le même soir',
    ['2026-09-07 21:00', '2026-09-07 23:30'], [1, 'refus']],
  ['Le même soir à cheval sur minuit UTC (le bug du 2026-08-30)',
    ['2026-09-07 20:05', '2026-09-07 21:30'], [1, 'refus']],
  ['Le piège de la fenêtre glissante : le soir, puis le midi du lendemain',
    ['2026-09-07 21:00', '2026-09-08 13:00'], [1, 2]],
  ['Le même piège au troisième jour, là où la roue retombait à 1',
    ['2026-09-07 21:00', '2026-09-08 13:00', '2026-09-09 20:00'], [1, 2, 3]],
  ['Une journée entière sautée',
    ['2026-09-07 20:00', '2026-09-09 20:00'], [1, 1]],
  ['Un retour après trois jours',
    ['2026-09-07 20:00', '2026-09-10 20:00'], [1, 1]],
  ['Sept jours d’affilée, à des heures qui varient',
    ['2026-09-07 22:40', '2026-09-08 08:15', '2026-09-09 23:50', '2026-09-10 07:05',
     '2026-09-11 19:00', '2026-09-12 12:00', '2026-09-13 21:00'], [1, 2, 3, 4, 5, 6, 7]],
  ['Le quinzième jour : la roue recommence sans casser la suite',
    ['2026-09-01 12:00', '2026-09-02 12:00', '2026-09-03 12:00', '2026-09-04 12:00',
     '2026-09-05 12:00', '2026-09-06 12:00', '2026-09-07 12:00', '2026-09-08 12:00',
     '2026-09-09 12:00', '2026-09-10 12:00', '2026-09-11 12:00', '2026-09-12 12:00',
     '2026-09-13 12:00', '2026-09-14 12:00', '2026-09-15 12:00'],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]],
  ['Le passage à l’heure d’été (la journée de 23 heures, 8 mars)',
    ['2026-03-07 22:00', '2026-03-08 22:00', '2026-03-09 22:00'], [1, 2, 3]],
  ['Le passage à l’heure d’hiver (la journée de 25 heures, 1er novembre)',
    ['2026-10-31 23:30', '2026-11-01 23:30', '2026-11-02 23:30'], [1, 2, 3]],
  ['Deux visites le 1er novembre, de part et d’autre du recul de l’heure',
    ['2026-11-01 00:30', '2026-11-01 03:30'], [1, 'refus']],
];

let fautes = 0;
const dit = (ok, texte) => { if (!ok) fautes++; console.log(`  ${ok ? '✓' : '✗'} ${texte}`); };

for (const [nom, visites, attendu] of SCENARIOS) {
  console.log(`\n${nom}`);
  let dernierMs = 0;
  let suite = 0;
  visites.forEach((visite, i) => {
    const maintenant = t(visite);
    const r = reclamer(dernierMs, suite, maintenant);
    const obtenu = r.refus ? 'refus' : r.suite;
    dit(obtenu === attendu[i], `${visite} → ${r.refus ? 'refusée' : `suite ${r.suite}, jour ${r.jour}`} (attendu : ${attendu[i]})`);

    // Le panneau doit annoncer exactement ce que le serveur vient de faire.
    const vuDuPanneau = client.dejaReclameAujourdhui(dernierMs, maintenant)
      ? 'refus' : client.suiteApresReclamation(dernierMs, suite, maintenant);
    dit(vuDuPanneau === obtenu, `    le panneau dit la même chose (${vuDuPanneau})`);

    if (!r.refus) { dernierMs = maintenant; suite = r.suite; }
  });
}

console.log('\nUne vieille bourse sans le champ quotidienSuite');
{
  const hier = t('2026-09-07 20:00');
  const r = reclamer(hier, undefined, t('2026-09-08 20:00'));
  dit(r.suite === 2, `réclamée hier, compteur absent → suite ${r.suite} (attendu : 2)`);
  const v = reclamer(t('2026-09-04 20:00'), undefined, t('2026-09-08 20:00'));
  dit(v.suite === 1, `réclamée il y a quatre jours, compteur absent → suite ${v.suite} (attendu : 1)`);
}

console.log('\nLe compte à rebours vise minuit au festival');
{
  const reste = client.resteAvantMinuitFestival(t('2026-09-07 21:00')) / 3600000;
  dit(Math.abs(reste - 3) < 0.01, `à 21 h, il reste ${reste.toFixed(2)} h (attendu : 3)`);
}

console.log('\nNi l’une ni l’autre moitié n’a gardé la fenêtre glissante');
for (const [nom, source] of [['functions/index.js', SOURCE_SERVEUR], ['src/firebase/montpellois.ts', SOURCE_CLIENT]]) {
  dit(source.includes("'America/Toronto'"), `${nom} compte dans le fuseau du festival`);
  dit(!/2 \* JOUR_MS/.test(source), `${nom} ne compare plus à 48 heures`);
}

console.log(fautes ? `\n${fautes} faute(s).` : '\nTout passe.');
process.exit(fautes ? 1 : 0);
