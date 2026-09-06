// ─── Le miroir public d'une guilde ───────────────────────────────────
// guildesPubliques/{id} est écrit par le déclencheur guildeMiroir
// (functions/guildes.js) à chaque écriture de guildes/{id}, avec les
// seuls champs publics, et se lit sans compte : c'est ce que le
// visiteur voit en ouvrant /{slug} (addendum du 6 septembre 2026,
// ordre 8). Aucun navigateur n'y écrit.

import { collection, doc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { FormeGuilde, MonnaieGuilde } from './guildes';

export interface GuildePublique {
  id: string;
  nom: string;
  forme?: FormeGuilde;
  slug?: string;
  description?: string;
  blason?: string;
  banniereUrl?: string;
  nbMembres?: number;
  monnaie?: MonnaieGuilde & { imageUrl?: string };
}

const COL = 'guildesPubliques';

const lire = (d: { id: string; data: () => unknown }): GuildePublique =>
  ({ id: d.id, ...(d.data() as Omit<GuildePublique, 'id'>) });

export async function lireGuildePubliqueParSlug(slug: string): Promise<GuildePublique | null> {
  if (!db) return null;
  const snap = await getDocs(query(collection(db, COL), where('slug', '==', slug), limit(1)));
  return snap.empty ? null : lire(snap.docs[0]);
}

export function suivreGuildePublique(id: string, cb: (g: GuildePublique | null) => void): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, COL, id), (snap) => cb(snap.exists() ? lire(snap) : null), () => cb(null));
}
