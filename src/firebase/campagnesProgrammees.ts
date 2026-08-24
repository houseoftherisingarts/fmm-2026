// ─── Les campagnes programmées ───────────────────────────────────────
// Alex, 2026-08-24 : « Tu peux les programmer à être envoyées. » Les
// infolettres partent à des dates choisies d'avance, sans que personne
// soit devant l'écran au bon moment.
//
// Ce fichier est le pont du navigateur : il écrit le rendez-vous dans
// Firestore, suit la file de ce qui s'en vient, et annule ce qui n'est
// pas encore parti. Il n'envoie rien lui-même. C'est la fonction
// planifiée `minuterieCampagnes`, dans functions/index.js, qui va
// chercher les campagnes dont l'heure est venue et les expédie par le
// même code que l'envoi immédiat.
//
// CE QUI SE RANGE, ET CE QUI SE CALCULE PLUS TARD. La lettre se range
// rendue, telle qu'elle partira, parce que le gabarit se compose ici,
// dans le navigateur, et qu'Alex doit pouvoir la relire dans la file.
// La liste des destinataires, elle, ne se range PAS : seule la portée
// est retenue, et les gens sont retrouvés au moment de l'envoi. Une
// lettre écrite le 24 août pour partir le 2 septembre doit toucher les
// gens inscrits entre les deux, et surtout elle ne doit pas inviter à
// prendre un billet quelqu'un qui l'a pris la semaine d'avant.

import {
  addDoc, collection, doc, limit as fbLimit, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { CategorieClient } from './clients';
import type { FiltreCampagne } from './campagnes';
import type { IdCampagne, LangueCampagne } from '../content/campagnes';

const COLLECTION = 'campagnesProgrammees';

// ── La portée ───────────────────────────────────────────────────────

/**
 * À qui la lettre partira, décrit plutôt que résolu.
 *
 * Les quatre premiers champs sont le filtre de la section d'admin, mot
 * pour mot. Le cinquième sert au mode « les personnes cochées », où la
 * page nomme les adresses une à une.
 */
export interface PorteeCampagne extends FiltreCampagne {
  mode: 'filtre' | 'coches';
  courriels: string[];
}

/** La portée telle que la page la compose, à partir de son propre état. */
export function porteeDepuis(
  mode: 'filtre' | 'coches',
  filtre: FiltreCampagne,
  courriels: string[],
): PorteeCampagne {
  return {
    mode,
    annees: [...filtre.annees],
    categories: [...filtre.categories] as CategorieClient[],
    sansAchatCetteAnnee: filtre.sansAchatCetteAnnee,
    sansCompte: filtre.sansCompte,
    // Les adresses ne se rangent que dans le mode où elles comptent.
    // Les traîner dans l'autre gonflerait le document pour rien.
    courriels: mode === 'coches' ? [...courriels] : [],
  };
}

// ── Le rendez-vous ──────────────────────────────────────────────────

export type StatutProgrammee = 'prevue' | 'en cours' | 'envoyee' | 'annulee' | 'echouee';

/** Ce que chaque état veut dire, en clair, pour l'écran. */
export const LIBELLE_STATUT: Record<StatutProgrammee, string> = {
  'prevue':   'prévue',
  'en cours': 'en cours',
  'envoyee':  'envoyée',
  'annulee':  'annulée',
  'echouee':  'échouée',
};

export interface CampagneProgrammee {
  id: string;
  modele: string;
  modeleNom?: string;
  langue: LangueCampagne;
  cible: string;
  sujet: string;
  html: string;
  texte: string;
  portee: PorteeCampagne;
  /** L'instant d'envoi, absolu. Il se calcule à l'heure de Montréal
   *  dans src/lib/heureMontreal.ts, jamais à celle du portable. */
  envoiPrevuLe: Timestamp;
  /** Ce qui a été tapé à l'écran, gardé tel quel : « 2026-09-02 » et
   *  « 09:00 ». C'est ce qui remplit les champs si la campagne se
   *  relit, et c'est la trace de ce qu'Alex a voulu. */
  quandLocal: string;
  fuseau: string;
  /** Le nombre de personnes que la portée retenait au moment de la
   *  programmation. Une estimation, affichée comme telle : le compte
   *  réel se fait à l'envoi. */
  apercuDestinataires: number;
  statut: StatutProgrammee;
  parUid: string;
  parNom: string;
  parCourriel: string;
  creeeLe?: Timestamp;
  demarreeLe?: Timestamp | null;
  termineeLe?: Timestamp;
  /** Combien de destinataires ont déjà été traités, reprises comprises. */
  faits?: number;
  /** La dernière adresse traitée, curseur de reprise. */
  reprisA?: string;
  tentatives?: number;
  campagneId?: string;
  erreur?: string;
  annuleeParNom?: string;
  annuleeLe?: Timestamp;
  resultat?: {
    campagneId?: string;
    destinataires?: number;
    envoyes?: number;
    echecs?: number;
    desabonnesIgnores?: number;
    adressesInvalides?: number;
  };
}

export interface DemandeProgrammation {
  modele: IdCampagne;
  modeleNom: string;
  langue: LangueCampagne;
  cible: string;
  sujet: string;
  html: string;
  texte: string;
  portee: PorteeCampagne;
  envoiPrevuLe: Date;
  quandLocal: string;
  fuseau: string;
  apercuDestinataires: number;
  parUid: string;
  parNom: string;
  parCourriel: string;
}

/** Pose le rendez-vous. Rien ne part tout de suite : la minuterie
 *  passe toutes les quinze minutes et prend ce qui est dû. */
export async function programmerCampagne(demande: DemandeProgrammation): Promise<string> {
  if (!db) throw new Error('Firebase n’est pas configuré');
  const ref = await addDoc(collection(db, COLLECTION), {
    ...demande,
    envoiPrevuLe: Timestamp.fromDate(demande.envoiPrevuLe),
    parCourriel: demande.parCourriel.trim().toLowerCase(),
    statut: 'prevue' as StatutProgrammee,
    faits: 0,
    reprisA: '',
    tentatives: 0,
    creeeLe: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Annule une campagne qui n'est pas encore partie.
 *
 * Les règles Firestore ne laissent passer ce geste que sur une campagne
 * encore « prévue ». Une campagne déjà en cours d'envoi ne se rappelle
 * pas : les courriels sont sortis, et prétendre le contraire à l'écran
 * serait pire que de le dire franchement.
 */
export async function annulerCampagneProgrammee(id: string, parNom: string): Promise<void> {
  if (!db) throw new Error('Firebase n’est pas configuré');
  await updateDoc(doc(db, COLLECTION, id), {
    statut: 'annulee' as StatutProgrammee,
    annuleeParNom: parNom,
    annuleeLe: serverTimestamp(),
  });
}

/** La file, en direct, de la plus proche à la plus lointaine. */
export function suivreCampagnesProgrammees(
  cb: (campagnes: CampagneProgrammee[]) => void,
  max = 40,
): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, COLLECTION), orderBy('envoiPrevuLe', 'asc'), fbLimit(max)),
    (snap) => cb(snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CampagneProgrammee, 'id'>),
    }))),
    (err) => { console.warn('[campagnes] lecture de la file', err); cb([]); },
  );
}
