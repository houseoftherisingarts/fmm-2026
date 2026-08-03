// Disponibilités : sondages de disponibilité d'équipe (clone Doodle interne).
// Collection: teamPolls/{id} : un seul doc par sondage, les votes vivent
// dans un champ map plutôt qu'une sous-collection (équipe d'une dizaine
// de personnes, pas besoin de plus).

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type VoteChoice = 'oui' | 'peutetre' | 'non';

export interface PollOption {
  id: string;
  label: string;
  /** Date ISO optionnelle (YYYY-MM-DD) quand l'option représente un jour précis. */
  dateISO?: string;
}

export interface PollVote {
  name: string;
  choices: Record<string, VoteChoice>;
}

export interface TeamPoll {
  id: string;
  title: string;
  description?: string;
  options: PollOption[];
  createdByUid: string;
  createdByName: string;
  closed: boolean;
  votes: Record<string, PollVote>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const COL = 'teamPolls';

// Firestore rejects payloads containing `undefined` : drop those keys.
const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
};

function fromSnap(id: string, data: Record<string, unknown>): TeamPoll {
  return {
    id,
    title: (data.title as string) || '',
    description: (data.description as string) || undefined,
    options: (data.options as PollOption[]) || [],
    createdByUid: (data.createdByUid as string) || '',
    createdByName: (data.createdByName as string) || '',
    closed: !!data.closed,
    votes: (data.votes as Record<string, PollVote>) || {},
    createdAt: data.createdAt as Timestamp | undefined,
    updatedAt: data.updatedAt as Timestamp | undefined,
  };
}

// ── Reads ────────────────────────────────────────────────────────────

// Sondages ouverts d'abord, puis les plus récents en tête de chaque groupe.
export async function listPolls(): Promise<TeamPoll[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  const polls = snap.docs.map((d) => fromSnap(d.id, d.data() as Record<string, unknown>));
  return polls.sort((a, b) => {
    if (a.closed !== b.closed) return a.closed ? 1 : -1;
    const at = a.createdAt?.toMillis?.() ?? 0;
    const bt = b.createdAt?.toMillis?.() ?? 0;
    return bt - at;
  });
}

export async function getPoll(id: string): Promise<TeamPoll | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return fromSnap(snap.id, snap.data() as Record<string, unknown>);
}

// Live listener sur un sondage : pour que la grille se mette à jour à
// mesure que les autres votent. Erreur (permission refusée, etc.) → null.
export function subscribePoll(id: string, cb: (poll: TeamPoll | null) => void): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(
    doc(db, COL, id),
    (snap) => cb(snap.exists() ? fromSnap(snap.id, snap.data() as Record<string, unknown>) : null),
    (err) => {
      console.warn('[dispos] subscribePoll snapshot error:', err);
      cb(null);
    },
  );
}

// ── Mutations ────────────────────────────────────────────────────────

export async function createPoll(poll: {
  title: string;
  description?: string;
  options: PollOption[];
  createdByUid: string;
  createdByName: string;
}): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  const ref = await addDoc(collection(db, COL), stripUndefined({
    title: poll.title.trim(),
    description: poll.description?.trim() || undefined,
    options: poll.options,
    createdByUid: poll.createdByUid,
    createdByName: poll.createdByName,
    closed: false,
    votes: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return ref.id;
}

// Écrit le vote d'une seule personne (map path ciblée : n'écrase pas les
// votes des autres). `choices` couvre toutes les options du sondage.
export async function setVote(
  pollId: string,
  uid: string,
  name: string,
  choices: Record<string, VoteChoice>,
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, COL, pollId), {
    [`votes.${uid}`]: { name, choices },
    updatedAt: serverTimestamp(),
  });
}

export async function closePoll(id: string, closed: boolean): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, COL, id), { closed, updatedAt: serverTimestamp() });
}

export async function deletePoll(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, COL, id));
}
