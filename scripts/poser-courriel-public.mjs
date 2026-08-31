// ─── Poser le courriel public d'un membre, une fois ─────────────────
// Alex, 2026-08-31 : le courriel du compte ne paraît plus nulle part.
// Une adresse de contact, elle, s'affiche quand la personne en pose
// une dans « Vos informations » (prefs.courrielPublic). Ce script écrit
// cette clé pour un membre donné, sans passer par l'interface.
//
//   node scripts/poser-courriel-public.mjs <uid> <adresse>
//
// Il parle à l'API REST de Firestore avec le jeton de `gcloud auth
// print-access-token`, et l'updateMask limite l'écriture à la seule
// clé visée : rien d'autre dans `prefs` n'est touché.

import { execFileSync } from 'node:child_process';

const PROJET = 'festivalmedieval';
const [, , uid, adresse] = process.argv;

if (!uid || !adresse) {
  console.error('Usage : node scripts/poser-courriel-public.mjs <uid> <adresse>');
  process.exit(1);
}

const jeton = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();

const url = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/membres/${uid}`
  + '?updateMask.fieldPaths=prefs.courrielPublic';

const reponse = await fetch(url, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${jeton}`,
    'Content-Type': 'application/json',
    'x-goog-user-project': PROJET,
  },
  body: JSON.stringify({
    fields: {
      prefs: { mapValue: { fields: { courrielPublic: { stringValue: adresse } } } },
    },
  }),
});

const corps = await reponse.text();
console.log(reponse.status, reponse.statusText);
console.log(corps);
process.exit(reponse.ok ? 0 : 1);
