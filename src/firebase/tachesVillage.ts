// ─── Ce qui est coché dans les tâches du Village Gastronomique ──────
//
// Un seul document, `tachesVillage/etat`, qui porte un champ `coche` :
// un objet dont les clés sont les identifiants du tableau
// `TACHES_VILLAGE` (voir src/content/tachesVillage.ts) et les valeurs
// disent quand la tâche a été cochée et par qui.
//
// Le contenu des tâches, lui, ne vit jamais ici : il est écrit en dur
// dans le code, parce que la répartition se décide entre Alex,
// Marc-Alexis et Phil, pas dans une base de données. Firestore ne garde
// que l'état, ce qui rend le document minuscule et sans conséquence
// s'il se perd.
//
// Trois personnes cochent en même temps sur le terrain, alors la page
// écoute le document en direct : une case cochée sur le téléphone de
// Marc-Alexis apparaît sur l'écran d'Alex sans rechargement.

import { doc, onSnapshot, setDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '../firebase';

/** Ce que le document garde pour une tâche cochée. */
export interface Coche {
  /** Le moment de la coche, en millisecondes depuis 1970. */
  le: number;
  /** Le nom affiché de la personne qui a coché, quand il est connu. */
  par?: string;
}

export type EtatTaches = Record<string, Coche>;

const CHEMIN = ['tachesVillage', 'etat'] as const;

/**
 * Lit le champ `coche` d'un instantané et jette tout ce qui ne ressemble
 * pas à une coche. Une valeur abîmée ne doit jamais faire disparaître le
 * reste de la liste, alors chaque entrée se valide seule.
 */
export function lireEtat(brut: unknown): EtatTaches {
  if (!brut || typeof brut !== 'object') return {};
  const out: EtatTaches = {};
  for (const [id, v] of Object.entries(brut as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const { le, par } = v as { le?: unknown; par?: unknown };
    if (typeof le !== 'number' || !Number.isFinite(le) || le <= 0) continue;
    out[id] = { le, ...(typeof par === 'string' && par ? { par } : {}) };
  }
  return out;
}

/**
 * S'abonne à l'état des cases. Rend une fonction de désabonnement.
 * Quand la lecture échoue, la page reçoit un objet vide plutôt qu'une
 * erreur : elle affiche alors la liste entière décochée, ce qui reste
 * lisible.
 */
export function subscribeEtatTaches(cb: (etat: EtatTaches) => void): () => void {
  if (!db) { cb({}); return () => {}; }
  return onSnapshot(
    doc(db, ...CHEMIN),
    (snap) => cb(lireEtat(snap.exists() ? (snap.data() as { coche?: unknown }).coche : undefined)),
    () => cb({}),
  );
}

/**
 * Coche ou décoche une tâche. L'écriture est une fusion, donc deux
 * personnes qui cochent deux tâches différentes en même temps ne
 * s'effacent pas l'une l'autre.
 */
export async function cocherTache(id: string, coche: boolean, par?: string): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  await setDoc(
    doc(db, ...CHEMIN),
    {
      coche: { [id]: coche ? { le: Date.now(), ...(par ? { par } : {}) } : deleteField() },
      majLe: serverTimestamp(),
    },
    { merge: true },
  );
}
