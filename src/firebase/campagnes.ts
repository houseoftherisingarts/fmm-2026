// ─── Les campagnes de courriels ──────────────────────────────────────
// Alex, 2026-08-24 : l'équipe écrit aux gens des listes de clients,
// depuis l'espace admin. Ce fichier fait deux choses et rien d'autre :
// il taille la liste des destinataires selon le filtre choisi à
// l'écran, et il appelle la Cloud Function `envoyerCampagne`.
//
// À NE PAS CONFONDRE avec `messagerieAdmin.ts`, qui écrit dans la boîte
// de réception des membres, sur le site. Ici, ce sont de vrais
// courriels qui sortent par le SMTP Zoho du festival.
//
// LE REGISTRE DES CLIENTS ne se relit pas ici : il vit dans
// `src/firebase/clients.ts`, bâti par le chantier voisin. Ce fichier
// s'en sert et n'en duplique rien, pas même la liste des catégories.
// Le seul travail propre aux campagnes est le FILTRE, qui taille la
// liste des destinataires, et l'appel de la Cloud Function.

import {
  collection, limit as fbLimit, onSnapshot, orderBy, query,
  type Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';
import {
  listerClients, listerComptes, anneesDuRegistre, courrielsDeLAnnee,
  CATEGORIES_CLIENT, LIBELLE_CATEGORIE,
  type Client, type CategorieClient,
} from './clients';
import type { IdCampagne, LangueCampagne } from '../content/campagnes';

// Réexportés pour que la section d'admin n'ait qu'une porte d'entrée.
export {
  listerClients, listerComptes, anneesDuRegistre,
  CATEGORIES_CLIENT, LIBELLE_CATEGORIE,
};
export type { Client, CategorieClient };

/** La région des Cloud Functions du festival, la même que
 *  `messagerieDeMasse` et `squareGrimoire`. */
const REGION = 'us-central1';

/** Le plafond par envoi. Le jumeau vit dans `functions/index.js` sous
 *  PLAFOND_CAMPAGNE, et les deux chiffres doivent rester égaux : sinon
 *  le panneau de confirmation annonce un nombre que la fonction
 *  refusera d'envoyer. */
export const PLAFOND_CAMPAGNE = 1500;

/** L'édition en cours. C'est elle qui définit « n'a rien acheté cette
 *  année » : la personne a une fiche pour une année passée, et aucune
 *  pour celle-ci. */
export const ANNEE_COURANTE = 2026;

// ── Le filtre ───────────────────────────────────────────────────────

export interface FiltreCampagne {
  /** Les années retenues. Vide veut dire toutes. */
  annees: number[];
  /** Les catégories retenues. Vide veut dire toutes. */
  categories: CategorieClient[];
  /** Ne garder que les gens qui n'ont rien pris pour l'année en cours.
   *  C'est le filtre de l'invitation au festival. */
  sansAchatCetteAnnee: boolean;
  /** Ne garder que les gens qui n'ont pas encore de compte sur le site.
   *  C'est le filtre de la lettre sur l'espace membre. */
  sansCompte: boolean;
}

export const FILTRE_VIDE: FiltreCampagne = {
  annees: [],
  categories: [],
  sansAchatCetteAnnee: false,
  sansCompte: false,
};

/**
 * Taille la liste des destinataires.
 *
 * Le nom évite `filtrerClients`, qui existe déjà dans `clients.ts` et
 * qui fait autre chose : là-bas c'est la recherche par nom, ici c'est
 * le filtre d'une campagne.
 *
 * @param comptes Les courriels qui portent déjà un compte, tels que
 *   `listerComptes()` les rend. Sans cette carte, le filtre « sans
 *   compte » ne peut rien trancher et se tait plutôt que de deviner.
 */
export function appliquerFiltre(
  clients: Client[],
  filtre: FiltreCampagne,
  comptes?: Map<string, string>,
): Client[] {
  // Les adresses qui ont déjà pris quelque chose pour l'année en cours.
  // Le regroupement se fait sur l'ADRESSE et non sur la fiche :
  // quelqu'un qui a pris un billet en 2024 et un kiosque en 2026 est
  // bien revenu cette année, même si sa fiche de 2024 dit le contraire.
  // Une commande annulée ne compte pas, et c'est `courrielsDeLAnnee`
  // qui le sait.
  const dejaCetteAnnee = filtre.sansAchatCetteAnnee
    ? courrielsDeLAnnee(clients, ANNEE_COURANTE)
    : null;

  return clients.filter((c) => {
    if (filtre.annees.length && !filtre.annees.includes(c.annee)) return false;
    if (filtre.categories.length && !filtre.categories.includes(c.categorie)) return false;
    if (dejaCetteAnnee && dejaCetteAnnee.has(c.courriel)) return false;
    if (filtre.sansCompte && comptes && comptes.has(c.courriel)) return false;
    return true;
  });
}

export interface Destinataire {
  courriel: string;
  nom: string;
}

/** La liste finale, une ligne par personne. Le dédoublonnage se fait
 *  ici, à l'écran, pour que le nombre annoncé dans le panneau de
 *  confirmation soit exactement celui qui partira. La fonction
 *  dédoublonne aussi, de son côté, parce qu'un compte juste ne se
 *  confie pas au navigateur. */
export function destinatairesDepuis(clients: Client[]): Destinataire[] {
  const parAdresse = new Map<string, string>();
  for (const c of clients) {
    if (!c.courriel) continue;
    // Le premier nom non vide l'emporte : une fiche sans nom ne doit
    // pas effacer celui d'une autre année.
    if (!parAdresse.get(c.courriel)) parAdresse.set(c.courriel, c.nom || '');
  }
  return [...parAdresse].map(([courriel, nom]) => ({ courriel, nom }));
}

// ── L'envoi ─────────────────────────────────────────────────────────

export interface DemandeCampagne {
  modele: IdCampagne;
  modeleNom: string;
  langue: LangueCampagne;
  /** La phrase qui décrit la cible dans l'historique. */
  cible: string;
  sujet: string;
  html: string;
  texte: string;
  destinataires: Destinataire[];
  /** Un seul exemplaire, à l'adresse de la personne qui envoie. La
   *  fonction ignore alors la liste : elle choisit elle-même l'adresse
   *  d'essai, pour qu'un essai ne serve jamais à écrire à un tiers. */
  essai?: boolean;
}

export interface ResultatCampagne {
  campagneId?: string;
  envoyes?: number;
  echecs?: number;
  desabonnesIgnores?: number;
  adressesInvalides?: number;
  essai?: boolean;
  courriel?: string;
}

export async function envoyerCampagne(demande: DemandeCampagne): Promise<ResultatCampagne> {
  if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
  const appeler = httpsCallable<DemandeCampagne, ResultatCampagne>(
    getFunctions(firebaseApp, REGION),
    'envoyerCampagne',
  );
  const { data } = await appeler(demande);
  return data;
}

// ── L'historique ────────────────────────────────────────────────────

export type StatutCampagne = 'en cours' | 'terminé' | 'échoué';

export interface Campagne {
  id: string;
  parNom: string;
  parCourriel?: string;
  modele: string;
  modeleNom?: string;
  langue: LangueCampagne;
  cible: string;
  sujet: string;
  destinataires: number;
  envoyes: number;
  echecs: number;
  desabonnesIgnores?: number;
  adressesInvalides?: number;
  adressesEchouees?: { courriel: string; raison: string }[];
  statut: StatutCampagne;
  erreur?: string;
  envoyeLe?: Timestamp;
}

const COLLECTION = 'campagnes';

/** L'historique en direct, du plus récent au plus ancien. Le compteur
 *  `envoyes` monte pendant que la fonction travaille : c'est ce qui
 *  donne l'avancement à l'écran, sans que le navigateur ait à sonder
 *  quoi que ce soit. */
export function suivreCampagnes(cb: (campagnes: Campagne[]) => void, max = 40): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, COLLECTION), orderBy('envoyeLe', 'desc'), fbLimit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Campagne, 'id'>) }))),
    (err) => { console.warn('[campagnes] lecture de l’historique', err); cb([]); },
  );
}
