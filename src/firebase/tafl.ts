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
  collection, doc, addDoc, getDoc, setDoc, deleteDoc, updateDoc, query, where,
  onSnapshot, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type CampTafl = 'attacker' | 'defender';
export type StatutPartie = 'defi' | 'lobby' | 'refuse' | 'encours' | 'fini';

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
  /** Le minuteur choisi au défi (Alex, 2026-08-27) : chaque coup doit
   *  tomber avant `echeance`, sinon l'autre réclame la partie. Absent ou
   *  nul : pas de limite. */
  delaiMs?:  number | null;
  echeance?: Timestamp | null;
  /** La partie s'est finie par forfait sur le minuteur. */
  forfait?:  boolean;
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
  /** Temps accordé à chaque coup, en millisecondes; 0 ou absent = sans limite. */
  delaiMs?: number;
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
    delaiMs: opts.delaiMs || null,
    echeance: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** L'échéance du prochain coup, d'après le délai de la partie. */
const echeanceSuivante = (delaiMs?: number | null) =>
  delaiMs ? Timestamp.fromMillis(Date.now() + delaiMs) : null;

/**
 * Ouvre un défi par lien, sans destinataire.
 *
 * C'est la porte d'entrée du site (Alex, 2026-08-23) : le lien se
 * colle dans Messenger ou dans un courriel, l'autre tombe sur le lobby,
 * se crée un compte, et la partie commence. Le siège reste libre tant
 * que personne ne l'a pris.
 */
export async function ouvrirDefiParLien(opts: {
  moiUid: string; moiNom: string; regleId: string; monCamp: CampTafl;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const autre: CampTafl = opts.monCamp === 'attacker' ? 'defender' : 'attacker';
  const ref = await addDoc(collection(db, COL), {
    joueurs: [opts.moiUid],
    noms: { [opts.moiUid]: opts.moiNom },
    camps: { [opts.monCamp]: opts.moiUid, [autre]: '' },
    regleId: opts.regleId,
    statut: 'lobby' as StatutPartie,
    lancePar: opts.moiUid,
    coups: [] as string[],
    tour: 'attacker' as CampTafl,
    gagnant: null,
    abandon: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Prend le siège libre d'un défi ouvert. La partie démarre aussitôt. */
export async function rejoindreDefiParLien(
  id: string, uid: string, nom: string,
): Promise<'ok' | 'plein' | 'introuvable' | 'moi'> {
  if (!db) return 'introuvable';
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 'introuvable';
  const p = snap.data() as PartieTafl;
  if (p.joueurs.includes(uid)) return 'moi';
  if (p.statut !== 'lobby') return 'plein';
  const campLibre: CampTafl = p.camps.attacker ? 'defender' : 'attacker';
  await updateDoc(ref, {
    joueurs: [...p.joueurs, uid],
    [`noms.${uid}`]: nom,
    [`camps.${campLibre}`]: uid,
    statut: 'encours' as StatutPartie,
    updatedAt: serverTimestamp(),
  });
  return 'ok';
}

export async function repondreAuDefi(id: string, accepte: boolean, delaiMs?: number | null): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    statut: accepte ? 'encours' : 'refuse',
    // Le sablier du premier coup part à l'acceptation.
    ...(accepte ? { echeance: echeanceSuivante(delaiMs) } : {}),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Pousse un coup. Le tour bascule dans la même écriture.
 *
 * 🚨 Surtout pas arrayUnion : il dédoublonne. Au tafl, un même coup
 * revient forcément (une pièce fait l'aller-retour) et le deuxième
 * était avalé, le tour basculait quand même, et les deux damiers
 * divergeaient pour de bon. On écrit donc la liste complète, ce que le
 * client connaît puisqu'il suit le document en direct, et seul le
 * joueur dont c'est le tour écrit.
 */
export async function jouerCoup(
  id: string,
  coupsAvant: string[],
  coup: string,
  tourSuivant: CampTafl,
  gagnant: CampTafl | null = null,
  delaiMs?: number | null,
): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    coups: [...coupsAvant, coup],
    tour: tourSuivant,
    echeance: gagnant ? null : echeanceSuivante(delaiMs),
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

/** Le minuteur est écoulé sur le tour de l'autre : je réclame la partie. */
export async function reclamerForfait(id: string, uidPerdant: string, campGagnant: CampTafl): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    statut: 'fini' as StatutPartie,
    gagnant: campGagnant,
    abandon: uidPerdant,
    forfait: true,
    updatedAt: serverTimestamp(),
  });
}

/** Les délais proposés au défi. */
export const DELAIS_DEFI: Array<{ ms: number; FR: string; EN: string }> = [
  { ms: 0,                 FR: 'Sans limite', EN: 'No limit' },
  { ms: 60 * 60 * 1000,    FR: '1 heure par coup', EN: '1 hour per move' },
  { ms: 24 * 60 * 60 * 1000, FR: '24 heures par coup', EN: '24 hours per move' },
  { ms: 3 * 24 * 60 * 60 * 1000, FR: '3 jours par coup', EN: '3 days per move' },
];

export function tempsRestant(p: Pick<PartieTafl, 'echeance' | 'statut'>): number | null {
  if (p.statut !== 'encours' || !p.echeance) return null;
  return p.echeance.toMillis() - Date.now();
}

export function formatDelai(ms: number, fr: boolean): string {
  if (ms <= 0) return fr ? 'écoulé' : 'expired';
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 48) return fr ? `${Math.floor(h / 24)} j` : `${Math.floor(h / 24)} d`;
  if (h >= 1) return `${h} h ${m.toString().padStart(2, '0')}`;
  return `${m} min`;
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


// ─── La table ouverte ───────────────────────────────────────────────
// Le répertoire des membres reste fermé (décision d'Alex du 4 juillet
// 2026 : personne ne moissonne les courriels). Pour se faire défier, on
// s'inscrit donc VOLONTAIREMENT à la table : un document par joueur,
// qui ne porte qu'un nom d'affichage.
//
//   /taflJoueurs/{uid}  { nom, depuis }

export interface JoueurTafl {
  uid: string;
  nom: string;
}

const COL_JOUEURS = 'taflJoueurs';

export async function rejoindreLaTable(uid: string, nom: string): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await setDoc(doc(db, COL_JOUEURS, uid), { nom, depuis: serverTimestamp() });
}

export async function quitterLaTable(uid: string): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await deleteDoc(doc(db, COL_JOUEURS, uid));
}

export function suivreLaTable(cb: (joueurs: JoueurTafl[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    collection(db, COL_JOUEURS),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, nom: String((d.data() as { nom?: string }).nom ?? '') }))),
    () => cb([]),
  );
}
