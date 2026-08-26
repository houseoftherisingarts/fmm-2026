// ─── Le concours William J. Walter ──────────────────────────────────
// Une inscription par personne, dans la collection `concoursWJW`. Le
// visiteur laisse son nom, son courriel et son téléphone, et il
// consent en cochant à ce que la liste soit remise à William J.
// Walter : c'est écrit noir sur blanc dans le règlement affiché, et
// le consentement se garde ici, daté, avec l'inscription.
//
// L'identifiant du document est le courriel normalisé, donc la même
// personne ne s'inscrit pas deux fois : la seconde écriture échoue
// sur la règle Firestore (création seulement, jamais d'écrasement).

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface InscriptionConcoursWJW {
  nom: string;
  courriel: string;
  telephone: string;
}

export const PRIX_CONCOURS_WJW = [
  { titre: 'Un coffret William J. Walter pour la maison', detail: 'Les recettes de la dégustation du festival, à emporter' },
  { titre: 'Une place au Banquet du Prince William', detail: 'Le dimanche 27 septembre, à la grande table' },
  { titre: 'Un certificat-cadeau de 50 $', detail: 'Dans la boutique William J. Walter de votre choix' },
] as const;

export function normaliserCourriel(c: string): string {
  return c.trim().toLowerCase();
}

export async function inscrireConcoursWJW(i: InscriptionConcoursWJW): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  const courriel = normaliserCourriel(i.courriel);
  await setDoc(doc(db, 'concoursWJW', courriel), {
    nom: i.nom.trim(),
    courriel,
    telephone: i.telephone.trim(),
    consentementPartage: true,
    inscritLe: serverTimestamp(),
  });
}
