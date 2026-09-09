// ─── L'affichage : la tournée des babillards ─────────────────────────
// Alex, 2026-09-08 : le tableur de l'affichage 2026 devient un outil de
// l'admin, « pas un spreadsheet ». La route est déjà tracée, secteur
// par secteur, et chaque commerce porte une note de pertinence sur
// cinq. Une personne prend une route ou un commerce, dit où elle en
// est, et l'équipe voit la tournée avancer en direct.
//
// Collection : affichage/{id}. Chaque document garde ce qui s'est passé
// l'an dernier (`precedent`) pour que personne ne reparte de zéro.

import {
  collection, doc, onSnapshot, updateDoc, deleteDoc, addDoc,
  writeBatch, serverTimestamp, Timestamp, arrayUnion, getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CURRENT_YEAR } from './applications';
import seed from '../content/affichage-routes.json';

/** L'édition que la tournée prépare : celle qui suit l'édition courante. */
export const ANNEE_AFFICHAGE = CURRENT_YEAR + 1;

export const STATUTS = ['a-faire', 'assigne', 'en-cours', 'pose', 'refus'] as const;
export type Statut = typeof STATUTS[number];

export const LIBELLE_STATUT: Record<Statut, string> = {
  'a-faire':  'À faire',
  'assigne':  'Confié',
  'en-cours': 'En chemin',
  'pose':     'Affiche posée',
  'refus':    'Refus',
};

/** La couleur de chaque état, en jetons de l'admin. */
export const TON_STATUT: Record<Statut, string> = {
  'a-faire':  'var(--admin-text-mute)',
  'assigne':  '#5A8FD6',
  'en-cours': '#C9A85A',
  'pose':     '#5BA372',
  'refus':    '#D87B8E',
};

export const TYPES = ['epicerie', 'station', 'cafe', 'depanneur', 'jeux', 'antiquaire',
  'communautaire', 'ecole', 'touristique', 'quincaillerie', 'service', 'village'] as const;
export type TypeLieu = typeof TYPES[number];

export const LIBELLE_TYPE: Record<TypeLieu, string> = {
  epicerie: 'Épicerie', station: 'Station service', cafe: 'Café ou crémerie', depanneur: 'Dépanneur',
  jeux: 'Boutique de jeux', antiquaire: 'Antiquaire', communautaire: 'Lieu communautaire', ecole: 'École',
  touristique: 'Bureau touristique', quincaillerie: 'Quincaillerie', service: 'Commerce de service', village: 'Village à explorer',
};

/** Les gens qui ont porté la tournée de 2026, plus le champ libre. */
export const PORTEURS = ['Alex', 'Pitch', 'Jesse Dippy', 'Léna', 'Élise', 'FMM Bénévoles'] as const;

export interface Geste {
  type: 'creation' | 'assignation' | 'statut' | 'note';
  par: string;
  quand: Timestamp;
  vers?: string;
  note?: string;
}

export interface Lieu {
  id: string;
  route: string;
  nom: string;
  type: TypeLieu;
  /** La note de pertinence, de 1 à 5. Posée au départ, ajustable. */
  pertinence: number;
  statut: Statut;
  porteur: string;
  note: string;
  annee: number;
  /** Ce que la tournée précédente a donné, figé. */
  precedent: { annee: number; statut: string; porteur: string } | null;
  historique: Geste[];
}

const col = () => (db ? collection(db, 'affichage') : null);
const HISTORIQUE_MAX = 30;

const borne = (v: unknown) => Math.max(1, Math.min(5, Math.round(Number(v) || 3)));

function fromDoc(id: string, d: Record<string, unknown>): Lieu {
  return {
    id,
    route: String(d.route ?? ''),
    nom: String(d.nom ?? ''),
    type: (TYPES as readonly string[]).includes(String(d.type)) ? (d.type as TypeLieu) : 'service',
    pertinence: borne(d.pertinence),
    statut: (STATUTS as readonly string[]).includes(String(d.statut)) ? (d.statut as Statut) : 'a-faire',
    porteur: String(d.porteur ?? ''),
    note: String(d.note ?? ''),
    annee: Number(d.annee) || ANNEE_AFFICHAGE,
    precedent: (d.precedent as Lieu['precedent']) ?? null,
    historique: Array.isArray(d.historique) ? (d.historique as Geste[]) : [],
  };
}

export function watchAffichage(cb: (lieux: Lieu[]) => void, onError?: (e: unknown) => void): () => void {
  const c = col();
  if (!c) { cb([]); return () => {}; }
  return onSnapshot(
    c,
    (snap) => cb(snap.docs.map((s) => fromDoc(s.id, s.data() as Record<string, unknown>))),
    (err) => { console.warn('[affichage] snapshot:', err); onError?.(err); },
  );
}

const geste = (g: Omit<Geste, 'quand'>): Geste => ({ ...g, quand: Timestamp.now() });

/** Confier un lieu à quelqu'un. Un lieu confié passe de « à faire » à « confié ». */
export async function confier(lieu: Lieu, porteur: string, par: string): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  const statut: Statut = porteur === '' ? 'a-faire' : (lieu.statut === 'a-faire' ? 'assigne' : lieu.statut);
  await updateDoc(doc(db, 'affichage', lieu.id), {
    porteur, statut,
    historique: arrayUnion(geste({ type: 'assignation', par, vers: porteur || 'personne' })),
    modifieLe: serverTimestamp(),
  });
}

/** Confier toute une route d'un geste. */
export async function confierRoute(lieux: Lieu[], porteur: string, par: string): Promise<number> {
  if (!db) throw new Error('Firebase non configuré');
  const aConfier = lieux.filter((l) => l.statut !== 'pose' && l.statut !== 'refus');
  for (let i = 0; i < aConfier.length; i += 400) {
    const batch = writeBatch(db);
    for (const l of aConfier.slice(i, i + 400)) {
      batch.update(doc(db, 'affichage', l.id), {
        porteur,
        statut: l.statut === 'a-faire' ? 'assigne' : l.statut,
        historique: arrayUnion(geste({ type: 'assignation', par, vers: porteur || 'personne' })),
        modifieLe: serverTimestamp(),
      });
    }
    await batch.commit();
  }
  return aConfier.length;
}

export async function poserStatut(lieu: Lieu, statut: Statut, par: string, note?: string): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await updateDoc(doc(db, 'affichage', lieu.id), {
    statut,
    ...(note !== undefined ? { note } : {}),
    historique: arrayUnion(geste({ type: 'statut', par, vers: LIBELLE_STATUT[statut], note })),
    modifieLe: serverTimestamp(),
  });
}

export async function modifierLieu(
  id: string,
  champs: Partial<Pick<Lieu, 'nom' | 'route' | 'type' | 'pertinence' | 'note'>>,
): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await updateDoc(doc(db, 'affichage', id), { ...champs, modifieLe: serverTimestamp() });
}

export async function ajouterLieu(
  l: Pick<Lieu, 'nom' | 'route' | 'type' | 'pertinence' | 'note'>,
  par: string,
): Promise<void> {
  const c = col();
  if (!c) throw new Error('Firebase non configuré');
  await addDoc(c, {
    ...l, statut: 'a-faire', porteur: '', annee: ANNEE_AFFICHAGE, precedent: null,
    historique: [geste({ type: 'creation', par })],
    creeLe: serverTimestamp(), modifieLe: serverTimestamp(),
  });
}

export async function retirerLieu(id: string): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await deleteDoc(doc(db, 'affichage', id));
}

export async function taillerHistorique(lieu: Lieu): Promise<void> {
  if (!db || lieu.historique.length <= HISTORIQUE_MAX) return;
  await updateDoc(doc(db, 'affichage', lieu.id), { historique: lieu.historique.slice(-HISTORIQUE_MAX) });
}

// ── La route de 2026, reprise pour l'édition suivante ────────────────
interface Graine { r: string; n: string; t: string; p: number; s: string; q: string; note?: string }

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const LIBELLE_PRECEDENT: Record<string, string> = {
  'termine': 'Affiche posée', 'en-cours': 'En chemin', 'non-commence': 'Pas commencé', 'bloque': 'Refus',
};

export const GRAINES_AFFICHAGE = (seed as Graine[]).map((g, i) => ({
  id: `${slug(g.n).slice(0, 44)}-${i}`,
  route: g.r,
  nom: g.n,
  type: (TYPES as readonly string[]).includes(g.t) ? (g.t as TypeLieu) : 'service',
  pertinence: borne(g.p),
  note: g.note ?? '',
  precedent: g.s ? { annee: CURRENT_YEAR, statut: LIBELLE_PRECEDENT[g.s] ?? g.s, porteur: g.q } : null,
}));

/** Écrit la route de départ. Ne touche jamais un lieu déjà en base. */
export async function semerAffichage(par: string): Promise<number> {
  const c = col();
  if (!db || !c) throw new Error('Firebase non configuré');
  const existants = new Set((await getDocs(c)).docs.map((d) => d.id));
  const manquants = GRAINES_AFFICHAGE.filter((g) => !existants.has(g.id));
  for (let i = 0; i < manquants.length; i += 400) {
    const batch = writeBatch(db);
    for (const g of manquants.slice(i, i + 400)) {
      const { id, ...reste } = g;
      batch.set(doc(db, 'affichage', id), {
        ...reste, statut: 'a-faire', porteur: '', annee: ANNEE_AFFICHAGE,
        historique: [geste({ type: 'creation', par })],
        creeLe: serverTimestamp(), modifieLe: serverTimestamp(),
      });
    }
    await batch.commit();
  }
  return manquants.length;
}

/** L'ordre des routes suit celui du tableur : le tour part de Chénéville. */
export const ORDRE_ROUTES = Array.from(new Set((seed as Graine[]).map((g) => g.r)));
