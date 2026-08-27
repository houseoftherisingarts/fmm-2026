// ─── Rapports de publicité ────────────────────────────────────────────
// Un document par rapport (Meta, Google Ads, AdSense, journal papier),
// écrit par Claude après une analyse de campagne. Lecture et écriture
// réservées aux admins (règle `/rapports_pubs` dans firestore.rules).
// La section d'admin Publicité affiche la liste, du plus récent au
// plus ancien; rien ne s'écrit ici depuis l'interface pour l'instant.

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'rapports_pubs';

export type SourcePub = 'meta' | 'google_ads' | 'adsense' | 'journal';

export interface LigneRapportPub {
  libelle: string;
  valeur: string;
}

export interface RapportPub {
  id: string;
  date: string;
  titre: string;
  source: SourcePub;
  resume: string;
  lignes: LigneRapportPub[];
  detail?: string;
  auteur: string;
}

export const SOURCE_LABEL: Record<SourcePub, string> = {
  meta: 'Meta',
  google_ads: 'Google Ads',
  adsense: 'AdSense',
  journal: 'Journal',
};

export async function listRapportsPubs(): Promise<RapportPub[]> {
  if (!db) throw new Error('Firestore not configured');
  const snap = await getDocs(query(collection(db, COL), orderBy('date', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RapportPub, 'id'>) }));
}
