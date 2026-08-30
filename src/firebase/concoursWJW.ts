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
//
// Depuis le 30 août 2026, une personne connectée participe d'un clic
// (« Participer avec mon compte ») : c'est la Cloud Function
// participerConcoursAvecCompte qui écrit, avec le nom de sa fiche et le
// courriel de son compte. Le jour 7 des récompenses quotidiennes
// l'inscrit aussi d'office et lui ajoute une chance (`chances`).

import { collection, doc, getDocs, orderBy, query, setDoc, serverTimestamp, updateDoc, type Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';

export interface InscriptionConcoursWJW {
  nom: string;
  courriel: string;
  telephone: string;
}

/** Le document tel qu'il vit dans Firestore (formulaire ou compte). */
export interface ParticipationWJW {
  nom: string;
  courriel: string;
  telephone?: string;
  consentementPartage?: boolean;
  inscritLe?: Timestamp | null;
  /** Entrées dans le chapeau : 1 à l'inscription, +1 par jour 7. */
  chances?: number;
  uid?: string;
  viaCompte?: boolean;
  viaRecompense?: boolean;
  /** Index du prix gagné (PRIX_CONCOURS_WJW), posé par l'équipe. */
  gagnant?: number | null;
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

/** Participe avec le compte connecté : nom de la fiche, courriel du
 *  compte, téléphone facultatif. Le serveur écrit; une personne déjà
 *  inscrite garde son inscription et son consentement passe à vrai. */
export async function participerConcoursAvecCompte(telephone = ''): Promise<{ courriel: string }> {
  if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
  const fn = httpsCallable<{ telephone: string }, { courriel: string }>(
    getFunctions(firebaseApp, 'us-central1'), 'participerConcoursAvecCompte',
  );
  const { data } = await fn({ telephone });
  return data;
}

/** Toute la liste, pour l'admin (la règle réserve la lecture globale à l'équipe). */
export async function listerConcoursWJW(): Promise<ParticipationWJW[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'concoursWJW'), orderBy('inscritLe', 'desc')));
  return snap.docs.map((d) => d.data() as ParticipationWJW);
}

/** L'équipe pose (ou retire, avec null) le prix gagné. */
export async function poserGagnantWJW(courriel: string, gagnant: number | null): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await updateDoc(doc(db, 'concoursWJW', normaliserCourriel(courriel)), { gagnant });
}
