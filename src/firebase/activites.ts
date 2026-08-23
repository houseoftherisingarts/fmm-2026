// ─── Les activités du festival, gérées depuis l'admin ───────────────
// Alex, 2026-08-23 : « je ne veux plus changer une photo ou un texte
// par le terminal, et d'autres que moi doivent pouvoir le faire ».
// Les quatorze fiches d'activités vivent donc dans Firestore. La page
// publique lit la collection en temps réel; tant qu'elle est vide, les
// fiches écrites dans le code font foi (aucune page vide possible).
//
//   /activitesFiches/{id}

import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export type CategorieActivite = 'combat' | 'crafts' | 'shows' | 'ripaille' | 'family';

export interface FicheActivite {
  id: string;
  titreFR: string;   titreEN: string;
  /** La ligne sous le titre, sur la tuile. */
  sousTitreFR: string; sousTitreEN: string;
  /** Le texte long, montré quand on ouvre la fiche. */
  descFR: string;    descEN: string;
  image: string;
  /** Cadrage de la photo, ex. « 38% 50% ». */
  imagePos?: string;
  categorie: CategorieActivite;
  /** Activité en relâche : tuile grisée, mention « prochaine édition ». */
  retiree?: boolean;
  ordre: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type FicheInput = Omit<FicheActivite, 'id' | 'createdAt' | 'updatedAt'>;

const COL = 'activitesFiches';

const sansUndefined = (o: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o)) if (o[k] !== undefined) out[k] = o[k];
  return out;
};

function depuisSnap(id: string, d: Record<string, unknown>): FicheActivite {
  return {
    id,
    titreFR: String(d.titreFR ?? ''),   titreEN: String(d.titreEN ?? ''),
    sousTitreFR: String(d.sousTitreFR ?? ''), sousTitreEN: String(d.sousTitreEN ?? ''),
    descFR: String(d.descFR ?? ''),     descEN: String(d.descEN ?? ''),
    image: String(d.image ?? ''),
    imagePos: d.imagePos ? String(d.imagePos) : undefined,
    categorie: (d.categorie as CategorieActivite) ?? 'crafts',
    retiree: Boolean(d.retiree),
    ordre: typeof d.ordre === 'number' ? d.ordre : 999,
  };
}

export async function listerFiches(): Promise<FicheActivite[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => depuisSnap(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.ordre - b.ordre);
}

/** Temps réel, pour la page publique comme pour l'admin. */
export function suivreFiches(cb: (fiches: FicheActivite[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    collection(db, COL),
    (snap) => cb(
      snap.docs
        .map((d) => depuisSnap(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.ordre - b.ordre),
    ),
    () => cb([]),
  );
}

export function nouvelIdFiche(): string {
  if (!db) throw new Error('Firestore non configuré');
  return doc(collection(db, COL)).id;
}

export async function creerFiche(id: string, input: FicheInput): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await setDoc(doc(db, COL, id), {
    ...sansUndefined(input as unknown as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function majFiche(id: string, patch: Partial<FicheInput>): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    ...sansUndefined(patch as unknown as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function supprimerFiche(id: string): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await deleteDoc(doc(db, COL, id));
}

/** Envoie une photo dans le Storage et rend son URL publique. */
export async function televerserPhotoFiche(id: string, fichier: File): Promise<string> {
  if (!storage) throw new Error('Storage non configuré');
  const ext = (fichier.name.split('.').pop() || 'jpg').toLowerCase();
  const chemin = `activites/${id}-${Date.now()}.${ext}`;
  const r = ref(storage, chemin);
  await uploadBytes(r, fichier);
  return getDownloadURL(r);
}

/** Sème la collection avec les fiches écrites dans le code. */
export async function semerDepuisLeCode(fiches: FicheInput[]): Promise<number> {
  if (!db) throw new Error('Firestore non configuré');
  const existantes = await listerFiches();
  if (existantes.length > 0) return 0;
  let n = 0;
  for (const f of fiches) {
    await creerFiche(nouvelIdFiche(), f);
    n += 1;
  }
  return n;
}
