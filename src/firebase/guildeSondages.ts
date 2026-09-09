// ─── Les sondages d'une guilde ───────────────────────────────────────
// Addendum 2 du 6 septembre 2026, ordre 15a. Un membre pose une question
// au groupe avec deux à six réponses; chacun vote une fois et peut
// changer d'avis tant que la question reste ouverte :
//
//   guildes/{id}/sondages/{sid} { question, options: string[],
//                                  votes: { [uid]: index }, clos, creePar, creeLe }
//
// Le vote s'écrit en chemin pointé (`votes.{uid}`), pour que la règle
// Firestore n'ait à comparer que ma clé. La clôture et le retrait
// reviennent à l'auteur, à un chef ou à l'équipe (firestore.rules).

import {
  addDoc, collection, deleteDoc, doc, limit as fbLimit, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/** Les mêmes bornes que firestore.rules. */
export const LONGUEUR_MAX_QUESTION = 200;
export const LONGUEUR_MAX_OPTION = 80;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 6;

export interface Sondage {
  id: string;
  question: string;
  options: string[];
  /** L'index de la réponse choisie, par membre. */
  votes: Record<string, number>;
  clos: boolean;
  creePar: string;
  creeLe?: Timestamp | null;
}

const COL = (guildeId: string) => collection(db!, 'guildes', guildeId, 'sondages');

/** Le dépouillement : par réponse, le nombre de voix et sa part en
 *  pour cent du total. Un index qui ne pointe sur rien ne compte pas. */
export function depouiller(s: Pick<Sondage, 'options' | 'votes'>): { comptes: number[]; total: number; parts: number[] } {
  const comptes = s.options.map(() => 0);
  for (const i of Object.values(s.votes || {})) {
    if (Number.isInteger(i) && i >= 0 && i < comptes.length) comptes[i] += 1;
  }
  const total = comptes.reduce((a, b) => a + b, 0);
  return { comptes, total, parts: comptes.map((c) => (total ? Math.round((c / total) * 100) : 0)) };
}

const millis = (t: Timestamp | null | undefined): number => t?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;

/** Les sondages en direct, les ouverts d'abord, puis du plus récent au
 *  plus ancien. Une question qui vient de partir n'a pas encore son
 *  horodatage et se range en tête. */
export function suivreSondages(
  guildeId: string, cb: (sondages: Sondage[]) => void, max = 40,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(COL(guildeId), orderBy('creeLe', 'desc'), fbLimit(max));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as Omit<Sondage, 'id' | 'votes'> & { votes?: Record<string, number> };
        return { id: d.id, ...data, votes: data.votes || {} };
      });
      rows.sort((a, b) => Number(!!a.clos) - Number(!!b.clos) || millis(b.creeLe) - millis(a.creeLe));
      cb(rows);
    },
    () => cb([]),
  );
}

/** Pose la question et rend son identifiant. Les réponses vides
 *  tombent; il en faut deux à six une fois nettoyées. */
export async function creer(
  guildeId: string, creePar: string, question: string, options: string[],
): Promise<string> {
  if (!db) throw new Error('Firestore indisponible');
  const q = question.replace(/\s+/g, ' ').trim().slice(0, LONGUEUR_MAX_QUESTION);
  const o = options.map((x) => x.replace(/\s+/g, ' ').trim().slice(0, LONGUEUR_MAX_OPTION)).filter(Boolean);
  if (!q) throw new Error('Écrivez la question.');
  if (o.length < OPTIONS_MIN || o.length > OPTIONS_MAX) throw new Error('Il faut de deux à six réponses.');
  const ref = await addDoc(COL(guildeId), {
    question: q, options: o, votes: {}, clos: false, creePar, creeLe: serverTimestamp(),
  });
  return ref.id;
}

/** Ma voix, et rien d'autre : la règle refuse toute autre clé. */
export async function voter(guildeId: string, sid: string, uid: string, index: number): Promise<void> {
  if (!db) return;
  await updateDoc(doc(COL(guildeId), sid), { [`votes.${uid}`]: index });
}

/** L'auteur, un chef ou l'équipe ferment la question. */
export async function clore(guildeId: string, sid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(COL(guildeId), sid), { clos: true });
}

export async function supprimer(guildeId: string, sid: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(COL(guildeId), sid));
}
