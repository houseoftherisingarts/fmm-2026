// ─── La monnaie d'une guilde ─────────────────────────────────────────
// Contrat CLAN-MONNAIE-CONTRAT.md, 6 septembre 2026. Chaque guilde bat
// sa propre pièce, qui ne vaut que chez elle. Le navigateur ne touche
// jamais un solde : il lit, et il demande. Tout ce qui bouge de
// l'argent passe par une callable de functions/guildes.js, qui écrit
// avec la clé d'administration.
//
//   guildes/{id}/bourses/{uid}   { solde, gagne, depense, maj }
//   guildes/{id}/registre/{txId} { type, de, a, pieces, montpellois, ... }
//
// Le patron d'appel est celui de src/firebase/montpellois.ts : même
// région, même enveloppe, mêmes codes d'erreur remontés tels quels.

import {
  collection, doc, onSnapshot, query, orderBy, limit as fbLimit,
  type Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';

/** Ce qu'un membre peut changer en une journée, dans un sens comme
 *  dans l'autre. Le serveur applique le même chiffre. */
export const PLAFOND_CHANGE_JOUR = 200;

/** Ce que la guilde retient sur un change de pièces vers Montpellois,
 *  et qui tombe dans le trésor commun. */
export const FRAIS_CHANGE = 0.05;

/** Les trois repères que la courbe montre : dix actifs, quarante, cent
 *  soixante. Ils bornent le cours entre un demi et deux. */
export const ANCRES_TAUX = [
  { nbActifs: 10,  taux: 0.5 },
  { nbActifs: 40,  taux: 1 },
  { nbActifs: 160, taux: 2 },
] as const;

/** Le cours d'une pièce en Montpellois, à un nombre d'actifs donné.
 *  Jumelle exacte de la formule du serveur : si l'une change, l'autre
 *  doit suivre le jour même, sinon l'écran ment. */
export function tauxPour(nbActifs: number): number {
  const brut = 0.5 * Math.sqrt(Math.max(0, nbActifs) / 10);
  return Math.round(Math.min(2, Math.max(0.5, brut)) * 1000) / 1000;
}

export interface BourseGuilde {
  solde: number;
  gagne: number;
  depense: number;
  /** Le compteur de change du jour, tenu par le serveur. */
  changeJour?: string;
  changeCumul?: number;
  maj?: Timestamp | null;
}

export type TypeEcriture =
  | 'entree' | 'fondation' | 'change' | 'virement'
  | 'tresor' | 'souk' | 'evenement';

export interface Ecriture {
  id: string;
  type: TypeEcriture;
  de?: string;
  a?: string;
  pieces?: number;
  montpellois?: number;
  taux?: number;
  note?: string;
  creeLe?: Timestamp | null;
}

/** Ce qui reste à changer aujourd'hui, une fois le compteur du serveur
 *  ramené à la journée en cours. */
export function resteAChanger(b: BourseGuilde | null): number {
  const jour = new Date().toISOString().slice(0, 10);
  if (!b || b.changeJour !== jour) return PLAFOND_CHANGE_JOUR;
  return Math.max(0, PLAFOND_CHANGE_JOUR - (b.changeCumul || 0));
}

/** Ma bourse de pièces dans cette guilde. Une bourse encore vide rend
 *  des zéros plutôt que rien : le panneau doit s'afficher tout de
 *  suite, même avant la première écriture du serveur. */
export function suivreMaBourseGuilde(
  guildeId: string, uid: string, cb: (b: BourseGuilde) => void,
): () => void {
  const vide: BourseGuilde = { solde: 0, gagne: 0, depense: 0 };
  if (!db) { cb(vide); return () => {}; }
  return onSnapshot(
    doc(db, 'guildes', guildeId, 'bourses', uid),
    (snap) => cb(snap.exists() ? { ...vide, ...(snap.data() as BourseGuilde) } : vide),
    () => cb(vide),
  );
}

/** Le registre de la guilde, du plus récent au plus ancien. */
export function suivreRegistre(
  guildeId: string, cb: (lignes: Ecriture[]) => void, max = 50,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(
    collection(db, 'guildes', guildeId, 'registre'),
    orderBy('creeLe', 'desc'),
    fbLimit(max),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as Ecriture))),
    () => cb([]),
  );
}

function appeler<TIn extends object, TOut>(nom: string) {
  return async (data: TIn): Promise<TOut> => {
    if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
    const fn = httpsCallable<TIn, TOut>(getFunctions(firebaseApp, 'us-central1'), nom);
    const { data: reponse } = await fn(data);
    return reponse;
  };
}

export type SensChange = 'piecesVersM' | 'mVersPieces';

export interface ResultatChange {
  soldeM: number;
  soldePieces: number;
  taux: number;
}

/** Change des pièces contre des Montpellois, ou l'inverse. Le sens
 *  « piecesVersM » laisse 5 % au trésor commun; l'autre est gratuit. */
export const guildeChanger = (args: { guildeId: string; sens: SensChange; montant: number }) =>
  appeler<typeof args, ResultatChange>('guildeChanger')(args);

/** Un membre en paie un autre, dans la même guilde, sans frais. */
export const guildeVirement = (args: { guildeId: string; aUid: string; montant: number; note?: string }) =>
  appeler<typeof args, { soldePieces: number }>('guildeVirement')(args);

/** Un chef puise dans le trésor commun pour payer un membre. */
export const guildeTresorVerser = (args: { guildeId: string; aUid: string; montant: number; note?: string }) =>
  appeler<typeof args, { tresor: number }>('guildeTresorVerser')(args);

/** Achat d'une annonce du souk réservée à la guilde, en pièces. */
export const guildeAcheterAuSouk = (args: { objetId: string }) =>
  appeler<typeof args, { soldePieces: number }>('guildeAcheterAuSouk')(args);

/** Répondre « oui » à un événement payant : les pièces vont au trésor. */
export const guildeRsvpPayant = (args: { guildeId: string; evId: string }) =>
  appeler<typeof args, { soldePieces: number }>('guildeRsvpPayant')(args);

/** Entrer dans une guilde avec son code d'invitation, sans file. */
export const guildeRejoindreParCode = (args: { code: string }) =>
  appeler<typeof args, { guildeId: string }>('guildeRejoindreParCode')(args);

/** Un chef tire un nouveau code et invalide l'ancien. */
export const guildeNouveauCode = (args: { guildeId: string }) =>
  appeler<typeof args, { codeInvitation: string }>('guildeNouveauCode')(args);

/** Un chef rattache un compte au nom d'un fondateur attendu. */
export const guildeRattacherFondateur = (args: { guildeId: string; nom: string; uid: string }) =>
  appeler<typeof args, { ok: true }>('guildeRattacherFondateur')(args);
