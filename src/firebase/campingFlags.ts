// Les places de camping, tenues dans Firestore au document
// `siteFlags/camping`, voisin de `siteFlags/hebergement` (les heures).
//
// Alex, 2026-09-07 : la section Camping de l'admin montre les places
// vendues au public (Zeffy), celles réservées aux kiosques et celles
// des bénévoles, chacune en tentes et en VR, avec en haut le total et
// le maximum du terrain. Les chiffres du public se reprennent du
// registre des clients d'un clic; le reste s'écrit à la main, parce
// que ni les kiosques ni les bénévoles ne passent par Zeffy.
//
// Tout est un entier, jamais négatif. Un champ absent vaut zéro.

import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Client } from './clients';

export const CATEGORIES_CAMPING = ['public', 'kiosques', 'benevoles'] as const;
export type CategorieCamping = typeof CATEGORIES_CAMPING[number];

export const LIBELLE_CAMPING: Record<CategorieCamping, string> = {
  public:    'Public',
  kiosques:  'Kiosques',
  benevoles: 'Bénévoles',
};

export interface Places { tentes: number; vr: number }

export interface CampingFlags {
  maxTentes: number;
  maxVr:     number;
  publicTentes:    number;
  publicVr:        number;
  kiosquesTentes:  number;
  kiosquesVr:      number;
  benevolesTentes: number;
  benevolesVr:     number;
}

export const CAMPING_FLAGS_DEFAULTS: CampingFlags = {
  maxTentes: 0, maxVr: 0,
  publicTentes: 0, publicVr: 0,
  kiosquesTentes: 0, kiosquesVr: 0,
  benevolesTentes: 0, benevolesVr: 0,
};

const CLES = Object.keys(CAMPING_FLAGS_DEFAULTS) as (keyof CampingFlags)[];

const entier = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));

const campingDoc = () => (db ? doc(db, 'siteFlags', 'camping') : null);

export function watchCampingFlags(cb: (flags: CampingFlags) => void): () => void {
  const ref = campingDoc();
  if (!ref) { cb(CAMPING_FLAGS_DEFAULTS); return () => {}; }
  return onSnapshot(
    ref,
    (snap) => {
      const data = (snap.exists() ? snap.data() : {}) as Partial<Record<keyof CampingFlags, unknown>>;
      const flags = { ...CAMPING_FLAGS_DEFAULTS };
      for (const k of CLES) flags[k] = entier(data[k]);
      cb(flags);
    },
    () => cb(CAMPING_FLAGS_DEFAULTS),
  );
}

export async function setCampingFlags(valeurs: Partial<CampingFlags>): Promise<void> {
  const ref = campingDoc();
  if (!ref) throw new Error('Firestore indisponible');
  const propre: Partial<CampingFlags> = {};
  for (const k of CLES) if (k in valeurs) propre[k] = entier(valeurs[k]);
  await setDoc(ref, { ...propre, majLe: serverTimestamp() }, { merge: true });
}

export function placesDe(flags: CampingFlags, cat: CategorieCamping): Places {
  return { tentes: flags[`${cat}Tentes`], vr: flags[`${cat}Vr`] };
}

/** Ce que Zeffy a vendu, lu dans le registre des clients : chaque fiche
 *  camping porte un détail « 5 × Espace t=Tentes · 2 × Espace Caravane
 *  (VR) ». Tente d'un côté, caravane ou VR de l'autre. */
export function placesZeffy(clients: Client[], annee: number): Places {
  const p: Places = { tentes: 0, vr: 0 };
  for (const c of clients) {
    if (c.categorie !== 'camping' || c.annee !== annee || c.statut !== 'confirme') continue;
    for (const art of String(c.detail || '').split(' · ')) {
      const m = art.match(/^(\d+)\s*×\s*(.+)$/);
      const n = m ? Number(m[1]) : 1;
      const lib = (m ? m[2] : art).toLowerCase();
      if (/tente/.test(lib)) p.tentes += n;
      else if (/caravane|\bvr\b|\brv\b/.test(lib)) p.vr += n;
    }
  }
  return p;
}
