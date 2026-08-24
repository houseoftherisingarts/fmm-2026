// ─── Les campagnes de courriels ──────────────────────────────────────
// Alex, 2026-08-24 : l'équipe écrit aux gens des listes de clients,
// depuis l'espace admin. Ce fichier fait trois choses et rien d'autre :
// il lit le registre des clients, il taille la liste des destinataires
// selon le filtre choisi à l'écran, et il appelle la Cloud Function
// `envoyerCampagne`.
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

// ── Le registre des clients ─────────────────────────────────────────

export type CategorieClient = 'billets' | 'kiosques' | 'camping' | 'bal-folk' | 'mecenes';

export const CATEGORIES_CLIENT: { id: CategorieClient; libelle: string }[] = [
  { id: 'billets',  libelle: 'Billets' },
  { id: 'kiosques', libelle: 'Kiosques' },
  { id: 'camping',  libelle: 'Camping' },
  { id: 'bal-folk', libelle: 'Bal folk' },
  { id: 'mecenes',  libelle: 'Mécènes' },
];

const CATEGORIES_CONNUES = new Set<string>(CATEGORIES_CLIENT.map((c) => c.id));

export interface Client {
  id: string;
  courriel: string;
  nom: string;
  annee: number;
  categorie: CategorieClient;
  /** Vrai quand la personne a déjà un compte sur le site. */
  compte: boolean;
}

/** Une fiche du registre, telle qu'elle sort de Firestore.
 *  Les noms français sont ceux du dépôt. Les jumeaux anglais sont lus
 *  en repli, pour que la section marche du premier coup quelle que soit
 *  la convention retenue par le chantier voisin. */
function depuisFiche(id: string, d: DocumentData): Client | null {
  const courriel = String(d.courriel ?? d.email ?? '').trim().toLowerCase();
  if (!courriel) return null;
  const categorie = String(d.categorie ?? d.category ?? '').trim();
  return {
    id,
    courriel,
    nom: String(d.nom ?? d.name ?? '').trim(),
    annee: Number(d.annee ?? d.year ?? 0) || 0,
    categorie: (CATEGORIES_CONNUES.has(categorie) ? categorie : 'billets') as CategorieClient,
    compte: Boolean(d.compte ?? d.hasAccount ?? d.aUnCompte ?? false),
  };
}

/** ⚠️ LE POINT D'ADAPTATION. À remplacer par l'appel de
 *  `src/firebase/clients.ts` le jour où ce fichier existe. */
export async function lireClients(): Promise<Client[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'clients'));
  const fiches: Client[] = [];
  for (const doc of snap.docs) {
    const fiche = depuisFiche(doc.id, doc.data());
    if (fiche) fiches.push(fiche);
  }
  return fiches;
}

// ── Le filtre ───────────────────────────────────────────────────────

export interface FiltreCampagne {
  /** Les années retenues. Vide veut dire toutes. */
  annees: number[];
  /** Les catégories retenues. Vide veut dire toutes. */
  categories: CategorieClient[];
  /** Ne garder que les gens qui n'ont aucune fiche pour l'année en
   *  cours. C'est le filtre de l'invitation au festival. */
  sansAchatCetteAnnee: boolean;
}

export const FILTRE_VIDE: FiltreCampagne = {
  annees: [],
  categories: [],
  sansAchatCetteAnnee: false,
};

/** Les années présentes dans le registre, de la plus récente à la plus
 *  ancienne. Elles se déduisent des fiches plutôt que d'être écrites
 *  en dur : le jour où l'édition 2027 arrive, la liste suit. */
export function anneesDuRegistre(clients: Client[]): number[] {
  return [...new Set(clients.map((c) => c.annee).filter((a) => a > 0))].sort((a, b) => b - a);
}

export function filtrerClients(clients: Client[], filtre: FiltreCampagne): Client[] {
  // Les adresses qui ont déjà une fiche pour l'année en cours. Le
  // regroupement se fait sur l'adresse et non sur la fiche : quelqu'un
  // qui a pris un billet en 2024 et un kiosque en 2026 a bien acheté
  // cette année, même si sa fiche de 2024 dit le contraire.
  const dejaCetteAnnee = new Set(
    clients.filter((c) => c.annee === ANNEE_COURANTE).map((c) => c.courriel),
  );

  return clients.filter((c) => {
    if (filtre.annees.length && !filtre.annees.includes(c.annee)) return false;
    if (filtre.categories.length && !filtre.categories.includes(c.categorie)) return false;
    if (filtre.sansAchatCetteAnnee && dejaCetteAnnee.has(c.courriel)) return false;
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
    const nomConnu = parAdresse.get(c.courriel);
    // Le premier nom non vide l'emporte : une fiche sans nom ne doit
    // pas effacer celui d'une autre année.
    if (!nomConnu) parAdresse.set(c.courriel, c.nom);
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
