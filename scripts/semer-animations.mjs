// Sème les trois premières fiches d'animation (Aslak, Hullsborg, AMQ)
// dans la collection `animations` de la production, une seule fois.
//
//   npx esbuild src/content/animationsDeBase.ts --bundle --platform=node \
//     --format=esm --outfile=node_modules/.cache/animations-de-base.mjs \
//     && node scripts/semer-animations.mjs
//
// Le script ne touche à rien si la collection porte déjà une fiche : il
// se relance donc sans risque. Il passe par les droits d'administration
// du compte gcloud connecté, pas par les règles Firestore.

import admin from 'firebase-admin';
import { ANIMATIONS_DE_BASE } from '../node_modules/.cache/animations-de-base.mjs';

const ANNEE = 2026;

admin.initializeApp({ projectId: 'festivalmedieval' });
const db = admin.firestore();

const existantes = await db.collection('animations').limit(1).get();
if (!existantes.empty) {
  console.log('La collection porte déjà des fiches : rien n’a été semé.');
  process.exit(0);
}

let n = 0;
for (const fiche of ANIMATIONS_DE_BASE) {
  const ref = db.collection('animations').doc();
  const propre = Object.fromEntries(Object.entries(fiche).filter(([, v]) => v !== undefined));
  await ref.set({
    ...propre,
    annee: ANNEE,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('semée :', fiche.nom, '→', ref.id);
  n += 1;
}
console.log(`${n} fiches semées.`);
process.exit(0);
