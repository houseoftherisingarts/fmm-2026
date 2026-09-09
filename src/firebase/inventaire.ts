// ─── Inventaire du container (nourriture et cuisine) ─────────────────
// Alex, 2026-09-08 : « un programme d'inventaire, pas seulement un
// spreadsheet ». Chaque objet vit à un emplacement du container en U
// (CG à gauche, CF au fond, CD à droite), sur une tablette (1 haut,
// 2 milieu, 3 bas, 4 sol) et à une profondeur (A avant … D fond).
// Quelqu'un le prend : on coche, on dit qui et où il s'en va. Il
// revient : on le marque retourné. Chaque geste s'ajoute au journal
// de l'objet, comme une bibliothèque qui prête.
//
// Collection : inventaire/{id}. Tout le monde de l'équipe lit et écrit
// (règles : isAdmin() ou un rôle admin sur adminRoles).

import {
  collection, doc, onSnapshot, updateDoc, deleteDoc, addDoc,
  writeBatch, serverTimestamp, Timestamp, arrayUnion, getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import seed from '../content/inventaire-container.json';

export const SECTIONS = ['CG', 'CF', 'CD'] as const;
export type Section = typeof SECTIONS[number];
export const NIVEAUX = [1, 2, 3, 4] as const;
export type Niveau = typeof NIVEAUX[number];
export const PROFONDEURS = ['A', 'B', 'C', 'D'] as const;
export type Profondeur = typeof PROFONDEURS[number];

export const LIBELLE_SECTION: Record<Section, string> = {
  CG: 'Container gauche',
  CF: 'Container du fond',
  CD: 'Container droit',
};
export const LIBELLE_NIVEAU: Record<Niveau, string> = {
  1: 'Tablette 1 (haut)',
  2: 'Tablette 2 (milieu)',
  3: 'Tablette 3 (bas)',
  4: 'Sol',
};
export const LIBELLE_PROFONDEUR: Record<Profondeur, string> = {
  A: 'Avant',
  B: 'Milieu-avant',
  C: 'Milieu-fond',
  D: 'Fond',
};

export const DESTINATIONS = ['Festival', 'Chez papa', 'Salon des Inconnus', 'Autre'] as const;

export interface Emplacement {
  section: Section;
  niveau: Niveau | null;
  profondeur: Profondeur | null;
}

export interface Mouvement {
  type: 'sortie' | 'retour' | 'deplacement' | 'creation';
  par: string;
  quand: Timestamp;
  vers?: string;     // sortie : destination · deplacement : nouveau code
  de?: string;       // deplacement : ancien code
  note?: string;
}

export interface Objet extends Emplacement {
  id: string;
  nom: string;
  categorie: string;
  quantite: number | null;
  detail: string;
  aVerifier: boolean;
  statut: 'range' | 'sorti';
  sorti?: { par: string; vers: string; note: string; quand: Timestamp } | null;
  historique: Mouvement[];
}

export const codeDe = (e: Emplacement) => `${e.section}${e.niveau ?? ''}${e.profondeur ?? ''}`;

export function lireCode(code: string): Emplacement {
  const m = /^(CG|CF|CD)([1-4])?([A-D])?$/.exec(code.trim().toUpperCase());
  if (!m) return { section: 'CG', niveau: null, profondeur: null };
  return {
    section: m[1] as Section,
    niveau: m[2] ? (Number(m[2]) as Niveau) : null,
    profondeur: (m[3] as Profondeur | undefined) ?? null,
  };
}

export function libelleEmplacement(e: Emplacement): string {
  const parts = [LIBELLE_SECTION[e.section]];
  if (e.niveau) parts.push(LIBELLE_NIVEAU[e.niveau].toLowerCase());
  if (e.profondeur) parts.push(LIBELLE_PROFONDEUR[e.profondeur].toLowerCase());
  return parts.join(', ');
}

const col = () => (db ? collection(db, 'inventaire') : null);

const HISTORIQUE_MAX = 40;

function fromDoc(id: string, d: Record<string, unknown>): Objet {
  return {
    id,
    nom: String(d.nom ?? ''),
    categorie: String(d.categorie ?? ''),
    quantite: typeof d.quantite === 'number' ? d.quantite : null,
    detail: String(d.detail ?? ''),
    aVerifier: d.aVerifier === true,
    section: (SECTIONS as readonly string[]).includes(String(d.section)) ? (d.section as Section) : 'CG',
    niveau: typeof d.niveau === 'number' && d.niveau >= 1 && d.niveau <= 4 ? (d.niveau as Niveau) : null,
    profondeur: (PROFONDEURS as readonly string[]).includes(String(d.profondeur)) ? (d.profondeur as Profondeur) : null,
    statut: d.statut === 'sorti' ? 'sorti' : 'range',
    sorti: (d.sorti as Objet['sorti']) ?? null,
    historique: Array.isArray(d.historique) ? (d.historique as Mouvement[]) : [],
  };
}

export function watchInventaire(cb: (objets: Objet[]) => void, onError?: (e: unknown) => void): () => void {
  const c = col();
  if (!c) { cb([]); return () => {}; }
  return onSnapshot(
    c,
    (snap) => cb(snap.docs.map((s) => fromDoc(s.id, s.data() as Record<string, unknown>))),
    (err) => { console.warn('[inventaire] snapshot:', err); onError?.(err); },
  );
}

const mouvement = (m: Omit<Mouvement, 'quand'>): Mouvement => ({ ...m, quand: Timestamp.now() });

export async function creerObjet(
  o: Pick<Objet, 'nom' | 'categorie' | 'quantite' | 'detail' | 'aVerifier'> & Emplacement,
  par: string,
): Promise<void> {
  const c = col();
  if (!c) throw new Error('Firebase non configuré');
  await addDoc(c, {
    ...o,
    statut: 'range',
    sorti: null,
    historique: [mouvement({ type: 'creation', par })],
    creeLe: serverTimestamp(),
    modifieLe: serverTimestamp(),
  });
}

export async function modifierObjet(
  id: string,
  champs: Partial<Pick<Objet, 'nom' | 'categorie' | 'quantite' | 'detail' | 'aVerifier'>>,
): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await updateDoc(doc(db, 'inventaire', id), { ...champs, modifieLe: serverTimestamp() });
}

export async function supprimerObjet(id: string): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await deleteDoc(doc(db, 'inventaire', id));
}

/** Quelqu'un prend l'objet : qui, vers où, et une note s'il le faut. */
export async function sortirObjet(id: string, par: string, vers: string, note = ''): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  const quand = Timestamp.now();
  await updateDoc(doc(db, 'inventaire', id), {
    statut: 'sorti',
    sorti: { par, vers, note, quand },
    historique: arrayUnion({ type: 'sortie', par, vers, note, quand }),
    modifieLe: serverTimestamp(),
  });
}

/** L'objet est revenu dans le container. */
export async function retournerObjet(id: string, par: string, note = ''): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await updateDoc(doc(db, 'inventaire', id), {
    statut: 'range',
    sorti: null,
    historique: arrayUnion(mouvement({ type: 'retour', par, note })),
    modifieLe: serverTimestamp(),
  });
}

/** L'objet change de tablette ou de container. */
export async function deplacerObjet(objet: Objet, vers: Emplacement, par: string): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  const de = codeDe(objet);
  const a = codeDe(vers);
  if (de === a) return;
  await updateDoc(doc(db, 'inventaire', objet.id), {
    section: vers.section,
    niveau: vers.niveau,
    profondeur: vers.profondeur,
    historique: arrayUnion(mouvement({ type: 'deplacement', par, de, vers: a })),
    modifieLe: serverTimestamp(),
  });
}

/** Coupe le journal d'un objet s'il déborde (appelé après lecture, jamais bloquant). */
export async function tailler(objet: Objet): Promise<void> {
  if (!db || objet.historique.length <= HISTORIQUE_MAX) return;
  await updateDoc(doc(db, 'inventaire', objet.id), { historique: objet.historique.slice(-HISTORIQUE_MAX) });
}

// ── L'inventaire du 8 septembre 2026, pour partir ───────────────────
interface Graine { e: string; c: string; n: string; q: number | null; d: string; v?: boolean }

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const GRAINES = (seed as Graine[]).map((g, i) => ({
  id: `${g.e.toLowerCase()}-${slug(g.n).slice(0, 40)}-${i}`,
  ...lireCode(g.e),
  nom: g.n,
  categorie: g.c,
  quantite: g.q,
  detail: g.d,
  aVerifier: g.v === true,
}));

/** Écrit les objets de départ qui n'existent pas encore. Rend le nombre écrit. */
export async function semerInventaire(par: string): Promise<number> {
  const c = col();
  if (!db || !c) throw new Error('Firebase non configuré');
  const existants = new Set((await getDocs(c)).docs.map((d) => d.id));
  const manquants = GRAINES.filter((g) => !existants.has(g.id));
  for (let i = 0; i < manquants.length; i += 400) {
    const batch = writeBatch(db);
    for (const g of manquants.slice(i, i + 400)) {
      const { id, ...reste } = g;
      batch.set(doc(db, 'inventaire', id), {
        ...reste,
        statut: 'range',
        sorti: null,
        historique: [mouvement({ type: 'creation', par })],
        creeLe: serverTimestamp(),
        modifieLe: serverTimestamp(),
      });
    }
    await batch.commit();
  }
  return manquants.length;
}
