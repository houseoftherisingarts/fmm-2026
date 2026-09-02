// ─── La messagerie de l'équipe vers les membres ──────────────────────
// Alex, 2026-08-24 : depuis l'espace admin, l'équipe écrit dans la
// boîte de réception d'un membre, d'une poignée de membres cochés, ou
// de tout le registre d'un seul coup. Rien de neuf du côté du membre :
// le message atterrit dans le fil ordinaire de /messages, celui que
// tout le monde connaît déjà.
//
// Alex, 2026-09-01 : « quand on écrit à un membre, il faut que ça leur
// envoie un courriel ET un message dans son espace client. » Le même
// geste dépose donc les deux, et il n'existe qu'un seul chemin pour le
// faire : la Cloud Function `messagerieDeMasse`, qui écrit les fils
// d'abord et poste les lettres ensuite. Le navigateur n'écrit plus
// aucun fil lui-même, faute de quoi la lettre et le message se
// mettraient à diverger dès la première panne.
//
// Deux voix, et la différence est voulue.
//
//   • À une personne, le message part au nom de celle qui l'écrit. Le
//     membre voit « Maïté Fournel » dans sa boîte et lui répond
//     directement : la conversation est celle de deux personnes, et la
//     lettre porte son adresse en « répondre à ».
//
//   • À un groupe ou à tout le monde, le message part au nom du
//     festival. Trois cents membres n'ont pas à recevoir une lettre
//     signée d'un prénom qu'ils ne connaissent pas, et le fil du
//     festival se distingue au premier coup d'œil dans la boîte.
//
// Dans les deux cas le SIÈGE du fil appartient à la personne de
// l'équipe qui écrit : la réponse du membre arrive dans sa boîte, et
// firestore.rules la lui laisse lire puisqu'elle est participante.

import {
  collection, limit as fbLimit, onSnapshot, orderBy, query,
  type Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';
import { LONGUEUR_MAX } from './moderation';
import type { Membre } from './ordre';

/** Le compte au nom duquel partent les envois de groupe. Il n'existe
 *  dans aucune table d'authentification : c'est une identité
 *  d'affichage, et la même chaîne vit dans functions/index.js. */
/** L'ancien siège « festival » ne recevait aucune réponse : le fil
 *  appartient désormais à la personne de l'équipe qui écrit, et seul le
 *  nom affiché reste celui du festival. La constante survit pour écarter
 *  d'anciennes fiches qui porteraient encore cet identifiant. */
export const FESTIVAL_UID = 'festival';
export const FESTIVAL_NOM = 'Le Festival Médiéval de Montpellier';
/** La teinte du médaillon quand aucune photo n'est jointe : le laiton
 *  du site, pour que le fil du festival se reconnaisse de loin. */
export const FESTIVAL_TEINTE = 38;
export const FESTIVAL_PHOTO = '/fmm-logo-embossed-silver.webp';

/** La région des Cloud Functions du festival, la même que squareGrimoire
 *  et banquetLien dans functions/index.js. */
const REGION = 'us-central1';

/** Le nombre de fiches que la page et la fonction acceptent de lire.
 *  Les deux chiffres doivent rester égaux : si la page en comptait 300
 *  et la fonction 3 000, le panneau de confirmation annoncerait un
 *  nombre de destinataires plus petit que ce qui partirait vraiment.
 *  Le jumeau vit dans functions/index.js sous PLAFOND_REGISTRE. */
export const PLAFOND_REGISTRE = 3000;

// ── L'envoi, par la Cloud Function ──────────────────────────────────
// Écrire deux ou trois cents fils depuis un onglet de navigateur est
// long, fragile, et laisse la moitié du travail derrière si quelqu'un
// ferme la fenêtre. Un navigateur ne poste pas de courriel non plus.
// La fonction appelable fait le tour du registre par lots, poste les
// lettres au rythme du serveur, et rend le compte exact des fils
// touchés et des lettres parties.

export type PorteeEnvoi = 'tous' | 'selection';

/** À sa propre voix ou à celle du festival. Le nom affiché dans la
 *  boîte du membre en dépend, et l'adresse de réponse de la lettre
 *  aussi (voir l'en-tête de ce fichier). */
export type VoixEnvoi = 'moi' | 'festival';

export interface DemandeEnvoi {
  portee: PorteeEnvoi;
  /** Les uid visés. Ignoré quand la portée est « tous ». */
  uids?: string[];
  texte: string;
  /** La phrase qui décrit la cible dans l'historique : « Tout le
   *  registre », « Fonction : Marchand », « Étiquette : viking ». */
  cible: string;
  /** Par défaut le festival, comme avant. */
  voix?: VoixEnvoi;
}

export interface ResultatEnvoi {
  /** Les fils écrits, donc les messages posés dans les espaces clients. */
  fils: number;
  ignores: number;
  envoiId: string;
  /** Les lettres réellement parties. */
  lettres: number;
  /** Les lettres refusées par le serveur de courriel, adresse par adresse. */
  lettresEchouees: number;
  /** Les membres qui n'ont reçu que le message : pas d'adresse au
   *  dossier, ou l'alerte correspondante éteinte dans leur espace. */
  sansLettre: number;
  /** Rempli seulement quand le serveur de courriel n'a pas pu s'ouvrir
   *  du tout. Les messages sont posés quand même. */
  erreurCourriel?: string;
}

async function appeler(demande: DemandeEnvoi): Promise<ResultatEnvoi> {
  if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
  const texte = demande.texte.trim().slice(0, LONGUEUR_MAX);
  if (!texte) throw new Error('Le message est vide.');
  const fonction = httpsCallable<DemandeEnvoi, ResultatEnvoi>(
    getFunctions(firebaseApp, REGION),
    'messagerieDeMasse',
  );
  // La charge se construit clé par clé : un `uids: undefined` traverse
  // le sérialiseur en `null` et brouille la lecture côté fonction.
  const charge: DemandeEnvoi = { portee: demande.portee, texte, cible: demande.cible };
  if (demande.portee === 'selection') charge.uids = demande.uids || [];
  if (demande.voix) charge.voix = demande.voix;
  const { data } = await fonction(charge);
  return data;
}

/** Écrire à un membre, en son propre nom. Le message rejoint le fil qui
 *  existe déjà entre les deux, ou en ouvre un neuf, et la lettre part à
 *  l'adresse du compte. */
export async function ecrireAUnMembre(
  membre: Pick<Membre, 'uid' | 'nom'>,
  texte: string,
): Promise<ResultatEnvoi> {
  if (!membre.uid) throw new Error('Ce membre n’a pas de fiche.');
  return appeler({
    portee: 'selection',
    uids: [membre.uid],
    texte,
    cible: (membre.nom || '').trim() || 'Un membre',
    voix: 'moi',
  });
}

/** Écrire à un groupe ou à tout le registre, au nom du festival. */
export async function envoyerEnNombre(demande: DemandeEnvoi): Promise<ResultatEnvoi> {
  return appeler({ ...demande, voix: 'festival' });
}

// ── L'historique des envois ─────────────────────────────────────────
// Chaque envoi laisse sa trace, celui à une seule personne comme celui
// à tout le registre : qui, quand, à qui, combien de fils, combien de
// lettres, et le texte exact. Alex doit pouvoir savoir ce qui est
// parti, sans avoir à fouiller les fils un par un.

export type StatutEnvoi = 'en cours' | 'terminé' | 'échoué';

export interface EnvoiMasse {
  id: string;
  parUid: string;
  parNom: string;
  parCourriel?: string;
  cible: string;
  portee: PorteeEnvoi;
  texte: string;
  /** À sa propre voix, ou à celle du festival. Absent sur les traces
   *  écrites avant le 1er septembre 2026, qui partaient toutes au nom
   *  du festival. */
  voix?: VoixEnvoi;
  /** Le nombre de membres visés au départ. */
  destinataires: number;
  /** Le nombre de fils réellement écrits, qui monte lot par lot. */
  faits: number;
  /** Le nombre de lettres à poster, une fois les adresses relues et les
   *  alertes éteintes retirées du compte. */
  lettresPrevues?: number;
  /** Les lettres parties, qui monte lot par lot après les fils. */
  lettres?: number;
  /** Les lettres refusées par le serveur de courriel. */
  lettresEchouees?: number;
  /** Les membres qui n'ont reçu que le message. */
  sansLettre?: number;
  /** Les vingt-cinq premières adresses en échec, avec la raison rendue
   *  par le serveur de courriel. */
  adressesEchouees?: { courriel: string; raison: string }[];
  statut: StatutEnvoi;
  erreur?: string;
  /** Le serveur de courriel n'a pas pu s'ouvrir du tout. Les messages
   *  sont posés quand même : c'est le sens des deux temps. */
  erreurCourriel?: string;
  envoyeLe?: Timestamp;
}

const ENVOIS = 'envoisMasse';

/** L'historique en direct, du plus récent au plus ancien. Le compteur
 *  `faits` monte pendant que la fonction travaille : c'est ce qui donne
 *  l'avancement à l'écran, sans que le navigateur ait à sonder quoi que
 *  ce soit. */
export function suivreEnvois(cb: (envois: EnvoiMasse[]) => void, max = 40): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, ENVOIS), orderBy('envoyeLe', 'desc'), fbLimit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EnvoiMasse, 'id'>) }))),
    (err) => { console.warn('[messagerie] lecture de l’historique', err); cb([]); },
  );
}
