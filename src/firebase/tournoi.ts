// ─── Le tournoi de hnefatafl ────────────────────────────────────────
// Alex, 2026-09-28 : un tournoi sur le site, tenu le 7 mars 2027. Le
// navigateur s'inscrit, lit le tableau et joue; tout le déroulement
// (tirage, rondes, couronne) se fait côté serveur dans
// functions/tournoi.js, parce qu'une partie de tournoi s'ouvre déjà en
// cours entre deux personnes que le tirage a mises face à face.
//
//   /tournois/{id}                    la fiche
//   /tournois/{id}/inscriptions/{uid} un document par personne inscrite
//   /tournois/{id}/matchs/{id}        le tableau, lisible par tous
//
// Les parties elles-mêmes restent des `taflParties` ordinaires, avec
// `tournoiId` et `matchId` en plus : le jeu n'a rien eu à apprendre.

import {
  collection, doc, addDoc, setDoc, deleteDoc, updateDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';

/** brouillon : l'équipe le prépare, personne ne le voit.
 *  inscriptions : la page est ouverte et on peut s'y inscrire.
 *  encours : le tirage est fait, les rondes se jouent.
 *  fini : un champion est couronné. */
export type StatutTournoi = 'brouillon' | 'inscriptions' | 'encours' | 'fini';

export interface Tournoi {
  id:         string;
  nom:        string;
  jeu:        'hnefatafl';
  regleId:    string;
  /** Le temps accordé à chaque coup, en millisecondes; nul = sans limite. */
  delaiMs:    number | null;
  dateDebut:  Timestamp;
  statut:     StatutTournoi;
  ronde:      number;
  nbRondes:   number;
  nbInscrits?: number;
  champion?:  { uid: string; nom: string } | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface InscriptionTournoi {
  uid:       string;
  nom:       string;
  inscritLe?: Timestamp;
}

export interface MatchTournoi {
  id:      string;
  ronde:   number;
  ordre:   number;
  /** Le second est nul quand la personne est exemptée. */
  joueurs: [string, string | null];
  noms:    Record<string, string>;
  /** Les parties jouées, la dernière en cours; une nulle en rajoute une. */
  parties: string[];
  gagnant: string | null;
  statut:  'encours' | 'fini';
  exempt:  boolean;
}

const COL = 'tournois';
/** Les statuts qu'un membre ordinaire a le droit de lire (voir firestore.rules). */
const STATUTS_PUBLICS: StatutTournoi[] = ['inscriptions', 'encours', 'fini'];

const lire = <T>(snap: { id: string; data: () => unknown }): T =>
  ({ id: snap.id, ...(snap.data() as object) } as T);

/** Les tournois visibles du public, le plus récent en tête. */
export function suivreTournois(cb: (t: Tournoi[]) => void, tous = false): () => void {
  if (!db) { cb([]); return () => {}; }
  const base = collection(db, COL);
  const q = tous
    ? query(base, orderBy('dateDebut', 'desc'))
    : query(base, where('statut', 'in', STATUTS_PUBLICS), orderBy('dateDebut', 'desc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => lire<Tournoi>(d))), () => cb([]));
}

export function suivreInscriptions(tournoiId: string, cb: (i: InscriptionTournoi[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COL, tournoiId, 'inscriptions'), orderBy('inscritLe', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as object) } as InscriptionTournoi))),
    () => cb([]),
  );
}

export function suivreMatchs(tournoiId: string, cb: (m: MatchTournoi[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COL, tournoiId, 'matchs'), orderBy('ronde', 'asc'), orderBy('ordre', 'asc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => lire<MatchTournoi>(d))), () => cb([]));
}

// ── Ce qu'un membre fait ─────────────────────────────────────────────

export async function inscrire(tournoiId: string, uid: string, nom: string): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await setDoc(doc(db, COL, tournoiId, 'inscriptions', uid), {
    nom: nom.trim().slice(0, 60),
    inscritLe: serverTimestamp(),
  });
}

export async function desinscrire(tournoiId: string, uid: string): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await deleteDoc(doc(db, COL, tournoiId, 'inscriptions', uid));
}

// ── Ce que l'équipe fait ─────────────────────────────────────────────

export async function creerTournoi(opts: {
  nom: string; dateDebut: Date; regleId: string; delaiMs: number | null;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const ref = await addDoc(collection(db, COL), {
    nom: opts.nom.trim(),
    jeu: 'hnefatafl',
    regleId: opts.regleId,
    delaiMs: opts.delaiMs,
    dateDebut: Timestamp.fromDate(opts.dateDebut),
    statut: 'brouillon' as StatutTournoi,
    ronde: 0,
    nbRondes: 0,
    champion: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function majTournoi(
  id: string,
  champs: Partial<Pick<Tournoi, 'nom' | 'regleId' | 'delaiMs' | 'dateDebut' | 'statut'>>,
): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), { ...champs, updatedAt: serverTimestamp() });
}

export async function supprimerTournoi(id: string): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await deleteDoc(doc(db, COL, id));
}

function appeler<TIn extends object, TOut>(nom: string) {
  return async (data: TIn): Promise<TOut> => {
    if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
    const fn = httpsCallable<TIn, TOut>(getFunctions(firebaseApp, 'us-central1'), nom);
    const { data: reponse } = await fn(data);
    return reponse;
  };
}

/** Tire la première ronde : le tournoi passe d'`inscriptions` à `encours`. */
export const lancerTournoi = appeler<{ tournoiId: string }, { nbRondes: number; nbInscrits: number }>('tournoiLancer');

/** Déclare un vainqueur à la main (personne absente le jour venu). */
export const trancherMatch = appeler<{ tournoiId: string; matchId: string; gagnantUid: string }, { ok: true }>('tournoiTrancher');

// ── Lecture ──────────────────────────────────────────────────────────

/** Les matchs d'une ronde, dans l'ordre du tableau. */
export const matchsDeRonde = (matchs: MatchTournoi[], ronde: number): MatchTournoi[] =>
  matchs.filter((m) => m.ronde === ronde).sort((a, b) => a.ordre - b.ordre);

/** Le nom d'une ronde, selon sa place dans le tableau. */
export function nomDeRonde(ronde: number, nbRondes: number, fr: boolean): string {
  const reste = nbRondes - ronde;
  if (reste === 0) return fr ? 'Finale' : 'Final';
  if (reste === 1) return fr ? 'Demi-finales' : 'Semifinals';
  if (reste === 2) return fr ? 'Quarts de finale' : 'Quarterfinals';
  return fr ? `Ronde ${ronde}` : `Round ${ronde}`;
}
