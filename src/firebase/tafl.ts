// ─── Les parties de tafl entre deux personnes ───────────────────────
// Un joueur en défie un autre depuis son espace client; le défi tombe
// dans l'espace de l'autre; s'il accepte, la partie s'ouvre et les deux
// jouent en direct (Alex, 2026-08-23).
//
//   /taflParties/{id}   ← le défi PUIS la partie, même document
//
// Le plateau n'est jamais stocké : seule la LISTE DES COUPS l'est.
// Chaque camp rejoue les coups sur son propre moteur, ce qui garde le
// document minuscule et rend la triche visible (un coup illégal ne
// passe pas le moteur de l'autre).

import {
  collection, doc, addDoc, getDoc, updateDoc, query, where,
  onSnapshot, orderBy, serverTimestamp, arrayUnion, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type CampTafl = 'attacker' | 'defender';
export type StatutPartie = 'defi' | 'refuse' | 'encours' | 'fini';

export interface PartieTafl {
  id:        string;
  /** Les deux uid, pour la requête et pour les règles de sécurité. */
  joueurs:   string[];
  noms:      Record<string, string>;
  /** Qui tient quel camp. */
  camps:     Record<CampTafl, string>;
  regleId:   string;
  statut:    StatutPartie;
  /** Qui a lancé le défi (l'autre doit accepter). */
  lancePar:  string;
  /** Les coups, dans l'ordre : "fr,fc>tr,tc". */
  coups:     string[];
  /** À qui de jouer. */
  tour:      CampTafl;
  gagnant?:  CampTafl | null;
  /** Le camp qui a abandonné, s'il y a lieu. */
  abandon?:  string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const COL = 'taflParties';

export const coupEnTexte = (fr: number, fc: number, tr: number, tc: number): string =>
  `${fr},${fc}>${tr},${tc}`;

export const coupDepuisTexte = (s: string): [number, number, number, number] => {
  const [a, b] = s.split('>');
  const [fr, fc] = a.split(',').map(Number);
  const [tr, tc] = b.split(',').map(Number);
  return [fr, fc, tr, tc];
};

/** Lance un défi. L'adversaire le voit dans son espace et l'accepte. */
export async function lancerDefi(opts: {
  moiUid: string; moiNom: string;
  cibleUid: string; cibleNom: string;
  regleId: string;
  /** Le camp que JE prends; l'autre prend le camp opposé. */
  monCamp: CampTafl;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const autre: CampTafl = opts.monCamp === 'attacker' ? 'defender' : 'attacker';
  const ref = await addDoc(collection(db, COL), {
    joueurs: [opts.moiUid, opts.cibleUid],
    noms: { [opts.moiUid]: opts.moiNom, [opts.cibleUid]: opts.cibleNom },
    camps: { [opts.monCamp]: opts.moiUid, [autre]: opts.cibleUid },
    regleId: opts.regleId,
    statut: 'defi' as StatutPartie,
    lancePar: opts.moiUid,
    coups: [] as string[],
    // Les assaillants ouvrent toujours la partie.
    tour: 'attacker' as CampTafl,
    gagnant: null,
    abandon: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function repondreAuDefi(id: string, accepte: boolean): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    statut: accepte ? 'encours' : 'refuse',
    updatedAt: serverTimestamp(),
  });
}

/** Pousse un coup. Le tour bascule dans la même écriture. */
export async function jouerCoup(
  id: string,
  coup: string,
  tourSuivant: CampTafl,
  gagnant: CampTafl | null = null,
): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    coups: arrayUnion(coup),
    tour: tourSuivant,
    ...(gagnant ? { statut: 'fini' as StatutPartie, gagnant } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function abandonner(id: string, uid: string, campGagnant: CampTafl): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    statut: 'fini' as StatutPartie,
    gagnant: campGagnant,
    abandon: uid,
    updatedAt: serverTimestamp(),
  });
}

export async function lirePartie(id: string): Promise<PartieTafl | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as PartieTafl) : null;
}

/** Toutes mes parties et mes défis, en direct. */
export function suivreMesParties(
  uid: string,
  cb: (parties: PartieTafl[]) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(
    collection(db, COL),
    where('joueurs', 'array-contains', uid),
    orderBy('updatedAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as PartieTafl))),
    // Une règle de sécurité qui refuse, ou un index manquant, ne doit
    // pas casser l'espace client : on rend une liste vide.
    () => cb([]),
  );
}

/** Une partie précise, en direct : c'est le fil du jeu. */
export function suivrePartie(
  id: string,
  cb: (p: PartieTafl | null) => void,
): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(
    doc(db, COL, id),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as PartieTafl) : null),
    () => cb(null),
  );
}
