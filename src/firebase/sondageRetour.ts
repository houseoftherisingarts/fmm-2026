// ─── Réponses au sondage de retour 2026 ─────────────────────────────
// Une réponse = un document dans `sondageRetour2026`. Le visiteur crée,
// il ne relit jamais; l'équipe lit tout depuis l'admin (Sondage 2026).
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type ValeurReponse = number | string | string[];

export interface ReponseSondage {
  id: string;
  reponses: Record<string, ValeurReponse>;
  langue: 'FR' | 'EN';
  uid?: string;
  envoyeLe?: Timestamp | null;
}

const COLLECTION = 'sondageRetour2026';

export async function envoyerSondage(reponses: Record<string, ValeurReponse>, langue: 'FR' | 'EN', uid?: string): Promise<void> {
  if (!db) throw new Error('Firebase indisponible');
  await addDoc(collection(db, COLLECTION), {
    reponses, langue, ...(uid ? { uid } : {}), envoyeLe: serverTimestamp(),
  });
}

export async function listerSondages(): Promise<ReponseSondage[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('envoyeLe', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReponseSondage, 'id'>) }));
}
