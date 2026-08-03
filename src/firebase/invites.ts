// Invités : liste des entrées gratuites tenue par l'équipe pour la porte
// (artisans, partenaires, familles de bénévoles, médias, VIP). Collection:
// guestList/{id}, un doc par invité. Suit le même patron que dispos.ts.

import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type GuestCategorie = 'artisan' | 'partenaire' | 'benevole' | 'media' | 'artiste' | 'vip' | 'autre';

export type GuestJour = 'vendredi' | 'samedi' | 'dimanche';

export interface GuestInvite {
  id: string;
  nom: string;
  courriel?: string;
  telephone?: string;
  categorie: GuestCategorie;
  invitePar: string;
  personnes: number;
  jours: GuestJour[];
  note?: string;
  arrive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const COL = 'guestList';

// Firestore rejects payloads containing `undefined` : drop those keys.
const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
};

function fromSnap(id: string, data: Record<string, unknown>): GuestInvite {
  return {
    id,
    nom: (data.nom as string) || '',
    courriel: (data.courriel as string) || undefined,
    telephone: (data.telephone as string) || undefined,
    categorie: (data.categorie as GuestCategorie) || 'autre',
    invitePar: (data.invitePar as string) || '',
    personnes: typeof data.personnes === 'number' ? data.personnes : 1,
    jours: (data.jours as GuestJour[]) || [],
    note: (data.note as string) || undefined,
    arrive: !!data.arrive,
    createdAt: data.createdAt as Timestamp | undefined,
    updatedAt: data.updatedAt as Timestamp | undefined,
  };
}

// ── Reads ────────────────────────────────────────────────────────────

// Les plus récents en tête.
export async function listInvites(): Promise<GuestInvite[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  const invites = snap.docs.map((d) => fromSnap(d.id, d.data() as Record<string, unknown>));
  return invites.sort((a, b) => {
    const at = a.createdAt?.toMillis?.() ?? 0;
    const bt = b.createdAt?.toMillis?.() ?? 0;
    return bt - at;
  });
}

// ── Mutations ────────────────────────────────────────────────────────

export async function createInvite(invite: {
  nom: string;
  courriel?: string;
  telephone?: string;
  categorie: GuestCategorie;
  invitePar: string;
  personnes?: number;
  jours: GuestJour[];
  note?: string;
}): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  const ref = await addDoc(collection(db, COL), stripUndefined({
    nom: invite.nom.trim(),
    courriel: invite.courriel?.trim() || undefined,
    telephone: invite.telephone?.trim() || undefined,
    categorie: invite.categorie,
    invitePar: invite.invitePar.trim(),
    personnes: invite.personnes ?? 1,
    jours: invite.jours,
    note: invite.note?.trim() || undefined,
    arrive: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateInvite(id: string, patch: {
  nom?: string;
  courriel?: string;
  telephone?: string;
  categorie?: GuestCategorie;
  invitePar?: string;
  personnes?: number;
  jours?: GuestJour[];
  note?: string;
}): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, COL, id), stripUndefined({
    ...patch,
    updatedAt: serverTimestamp(),
  }));
}

export async function setArrive(id: string, arrive: boolean): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, COL, id), { arrive, updatedAt: serverTimestamp() });
}

export async function deleteInvite(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, COL, id));
}
