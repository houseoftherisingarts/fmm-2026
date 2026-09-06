// ─── L'agenda d'une guilde ───────────────────────────────────────────
// Contrat CLAN-MONNAIE-CONTRAT.md, 6 septembre 2026.
//
//   guildes/{id}/evenements/{evId}
//     { titre, description, lieu, debut, fin, creePar, prixPieces?,
//       rsvp: { [uid]: 'oui'|'non'|'peut-etre' }, nbOui, creeLe, maj }
//
// Les chefs tiennent l'agenda. Un membre ne touche que sa propre clé de
// `rsvp`, et la règle Firestore lui refuse un « oui » sur un événement
// payant : celui-là passe par `guildeRsvpPayant`, qui débite les pièces
// et pose la réponse dans le même geste. `nbOui` appartient au serveur,
// le navigateur ne l'écrit jamais.

import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type Reponse = 'oui' | 'non' | 'peut-etre';

export interface Evenement {
  id: string;
  titre: string;
  description?: string;
  lieu?: string;
  debut: Timestamp;
  fin: Timestamp;
  creePar: string;
  /** Zéro ou absent : l'événement est gratuit. */
  prixPieces?: number;
  rsvp: Record<string, Reponse>;
  /** Recalculé par un déclencheur serveur; jamais écrit ici. */
  nbOui?: number;
  creeLe?: Timestamp | null;
  maj?: Timestamp | null;
}

/** Ce qu'un chef remplit dans le formulaire. */
export interface BrouillonEvenement {
  titre: string;
  description?: string;
  lieu?: string;
  debut: Date;
  fin: Date;
  prixPieces?: number;
}

const chemin = (guildeId: string) => collection(db!, 'guildes', guildeId, 'evenements');

/** L'agenda du groupe, en direct, du plus proche au plus lointain. */
export function suivreEvenements(
  guildeId: string, cb: (evenements: Evenement[]) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(chemin(guildeId), orderBy('debut')),
    (snap) => cb(snap.docs.map((d) => {
      const data = d.data() as Omit<Evenement, 'id' | 'rsvp'> & { rsvp?: Record<string, Reponse> };
      return { id: d.id, ...data, rsvp: data.rsvp || {} };
    })),
    () => cb([]),
  );
}

/** Chef seulement (la règle Firestore le vérifie). `rsvp` part vide :
 *  sans lui, la règle du RSVP n'aurait rien à comparer. */
export async function creerEvenement(
  guildeId: string, creePar: string, brouillon: BrouillonEvenement,
): Promise<string> {
  if (!db) throw new Error('Firestore indisponible');
  const ref = await addDoc(chemin(guildeId), {
    ...champsEcrits(brouillon),
    creePar,
    rsvp: {},
    creeLe: serverTimestamp(),
    maj: serverTimestamp(),
  });
  return ref.id;
}

export async function modifierEvenement(
  guildeId: string, evId: string, brouillon: BrouillonEvenement,
): Promise<void> {
  if (!db) throw new Error('Firestore indisponible');
  await updateDoc(doc(db, 'guildes', guildeId, 'evenements', evId), {
    ...champsEcrits(brouillon),
    maj: serverTimestamp(),
  });
}

export async function supprimerEvenement(guildeId: string, evId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, 'guildes', guildeId, 'evenements', evId));
}

function champsEcrits(b: BrouillonEvenement) {
  return {
    titre: b.titre.trim().slice(0, 120),
    description: (b.description || '').trim().slice(0, 2000),
    lieu: (b.lieu || '').trim().slice(0, 160),
    debut: Timestamp.fromDate(b.debut),
    fin: Timestamp.fromDate(b.fin),
    prixPieces: Math.max(0, Math.round(b.prixPieces || 0)),
  };
}

/** Répondre présent, ou non. La règle n'accepte que la clé de celui qui
 *  écrit, et refuse un « oui » sur un événement payant : pour celui-là,
 *  la page appelle `guildeRsvpPayant`. */
export async function repondre(
  guildeId: string, evId: string, uid: string, reponse: Reponse,
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'guildes', guildeId, 'evenements', evId), {
    [`rsvp.${uid}`]: reponse,
    maj: serverTimestamp(),
  });
}

// ─── Emporter la date ailleurs ───────────────────────────────────────
// Aucun OAuth, aucun jeton : un lien que le navigateur ouvre chez
// Google, et un abonnement que le calendrier du téléphone lit tout seul.

const HOTE_FONCTIONS = 'us-central1-festivalmedieval.cloudfunctions.net';

/** AAAAMMJJTHHMMSSZ, le format que Google et l'ICS attendent. */
const horodate = (t: Timestamp | undefined): string =>
  (t?.toDate?.() || new Date()).toISOString().replace(/[-:]|\.\d{3}/g, '');

export function lienGoogleAgenda(ev: Pick<Evenement, 'titre' | 'description' | 'lieu' | 'debut' | 'fin'>): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.titre || '',
    dates: `${horodate(ev.debut)}/${horodate(ev.fin || ev.debut)}`,
  });
  if (ev.description) p.set('details', ev.description);
  if (ev.lieu) p.set('location', ev.lieu);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** L'abonnement que le calendrier d'Apple ou d'Outlook avale d'un clic. */
export const lienWebcal = (guildeId: string, code: string): string =>
  `webcal://${HOTE_FONCTIONS}/guildeIcs?guilde=${encodeURIComponent(guildeId)}&cle=${encodeURIComponent(code)}`;

/** Le même agenda en https, pour qui préfère téléverser le fichier. */
export const lienIcsHttps = (guildeId: string, code: string): string =>
  `https://${HOTE_FONCTIONS}/guildeIcs?guilde=${encodeURIComponent(guildeId)}&cle=${encodeURIComponent(code)}`;
