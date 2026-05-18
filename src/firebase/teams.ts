// Bénévole teams — admin forms small crews around stations and assigns
// each bénévole a leader/member role. Stored at /teams/{teamId}.
//
// Each team is year-bound so previous editions stay readable. The link
// between team ↔ bénévole lives on the bénévole doc (teamId, teamRole)
// — see firebase/applications.ts.

import {
  collection, doc, getDocs, query, where, addDoc, updateDoc, deleteDoc,
  serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CURRENT_YEAR } from './applications';

export interface Team {
  id: string;
  name:        string;     // e.g. "Bar principal", "Accueil"
  description?: string;
  /** Hex colour ("#c9a05a") or token name — used for the kanban column header. */
  color?: string;
  /** Optional emoji / lucide-name to mark the team visually. */
  icon?: string;
  year: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const teamsCol = () => (db ? collection(db, 'teams') : null);

export async function listTeams(year: number = CURRENT_YEAR): Promise<Team[]> {
  const col = teamsCol();
  if (!col) return [];
  const q = query(col, where('year', '==', year));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Team, 'id'>) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function createTeam(t: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const col = teamsCol();
  if (!col) throw new Error('Firestore not configured');
  const ref = await addDoc(col, { ...t, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateTeam(id: string, patch: Partial<Omit<Team, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await updateDoc(doc(db, 'teams', id), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteTeam(id: string): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await deleteDoc(doc(db, 'teams', id));
}
