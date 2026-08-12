// Demandes de commandite (plans Baron / Comte / Duc du Festival).
// Même patron que les autres formulaires publics (mariages, groupes) :
// création ouverte au public, lecture et gestion réservées aux admins
// (règle `/commanditaires` dans firestore.rules). La grille des plans
// vit sur la page publique /commanditaires; la stratégie complète dans
// le vault : 10_projects/fmm/05-partenaires/strategie-commandites.md

import {
  addDoc, collection, deleteDoc, doc, getDocs, orderBy, query,
  serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'commanditaires';

export type SponsorPlan = 'baron' | 'comte' | 'duc';
export type SponsorRequestStatus = 'new' | 'contacted' | 'signed' | 'declined';

export interface SponsorRequest {
  id: string;
  plan: SponsorPlan;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
  lang: 'FR' | 'EN';
  year: number;
  status: SponsorRequestStatus;
  createdAt?: { toDate?: () => Date } | null;
}

export const PLAN_LABEL: Record<SponsorPlan, string> = {
  baron: 'Baron · 1 500 $',
  comte: 'Comte · 4 000 $',
  duc:   'Duc du Festival · 10 000 $',
};

export const STATUS_LABEL: Record<SponsorRequestStatus, string> = {
  new:       'Nouvelle',
  contacted: 'Contacté',
  signed:    'Signée',
  declined:  'Déclinée',
};

export async function addSponsorRequest(data: Omit<SponsorRequest, 'id' | 'status' | 'year' | 'createdAt'>): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await addDoc(collection(db, COL), {
    ...data,
    year: 2026,
    status: 'new',
    createdAt: serverTimestamp(),
  });
}

export async function listSponsorRequests(): Promise<SponsorRequest[]> {
  if (!db) throw new Error('Firestore not configured');
  const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SponsorRequest, 'id'>) }));
}

export async function updateSponsorRequest(id: string, data: Partial<Omit<SponsorRequest, 'id'>>): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteSponsorRequest(id: string): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await deleteDoc(doc(db, COL, id));
}
