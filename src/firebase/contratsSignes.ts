// ─── Les contrats signés qui reviennent à l'équipe ───────────────────
// La page /signer-cuisine construit le PDF signé dans le navigateur du
// cuisinier. Quand il appuie sur « Renvoyer le document signé », deux
// choses partent en même temps : le PDF s'en va dans la conversation
// Messenger par la feuille de partage du téléphone, et une copie monte
// ici, pour que l'équipe la retrouve dans l'admin sans dépendre de
// personne (Alex, 2026-09-04).
//
// Le PDF vit dans Storage sous `contrats-signes/{contrat}/{id}.pdf` et
// le document Firestore ne garde que le chemin, jamais une adresse
// publique : une entente porte un nom et une signature manuscrite, donc
// elle se lit uniquement par l'équipe (Loi 25). L'admin résout l'adresse
// de téléchargement au moment de l'ouvrir, en étant connecté.
//
// La création est publique et verrouillée sur une forme exacte (voir
// firestore.rules et storage.rules) : le cuisinier n'a pas de compte.

import {
  collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, type Timestamp,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase';

/** 10 Mo, en accord avec storage.rules. */
export const MAX_OCTETS = 10 * 1024 * 1024;

/** Identifiant de l'entente signée. Une entente par slug. */
export const CONTRAT_CUISINE = 'cuisine-2026';

export const NOMS_CONTRATS: Record<string, string> = {
  [CONTRAT_CUISINE]: 'Entente de cuisine 2026',
};

export interface ContratSigne {
  id: string;
  /** Slug de l'entente (voir NOMS_CONTRATS). */
  contrat: string;
  /** Nom écrit par la personne signataire. */
  nom: string;
  /** Chemin du PDF dans Storage, jamais une adresse publique. */
  chemin: string;
  signeLe?: Timestamp | null;
}

/**
 * Téléverse le PDF signé puis crée le document Firestore. Le contenu
 * du PDF n'est jamais réécrit : c'est exactement le fichier que la
 * personne vient de partager.
 */
export async function deposerContratSigne(
  contrat: string,
  nom: string,
  pdf: Blob,
): Promise<void> {
  if (!db || !storage) throw new Error('Le service est indisponible pour le moment.');
  if (!nom.trim())      throw new Error('Le nom est nécessaire.');
  if (pdf.size > MAX_OCTETS) throw new Error('Le document dépasse 10 Mo.');

  const database = db;
  const id = doc(collection(database, 'contratsSignes')).id;
  const chemin = `contrats-signes/${contrat}/${id}.pdf`;

  await uploadBytes(ref(storage, chemin), pdf, { contentType: 'application/pdf' });

  await setDoc(doc(database, 'contratsSignes', id), {
    contrat,
    nom: nom.trim(),
    chemin,
    signeLe: serverTimestamp(),
  });
}

/** La liste complète, de la plus récente à la plus ancienne (admin). */
export async function listerContratsSignes(): Promise<ContratSigne[]> {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, 'contratsSignes'), orderBy('signeLe', 'desc')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContratSigne, 'id'>) }));
}

/**
 * Adresse de téléchargement d'un contrat signé. Résolue à la demande,
 * par un admin connecté : le chemin seul ne se lit pas sans droit.
 */
export async function adresseContratSigne(chemin: string): Promise<string> {
  if (!storage) throw new Error('Le service est indisponible pour le moment.');
  return getDownloadURL(ref(storage, chemin));
}
