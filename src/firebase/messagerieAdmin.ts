// ─── La messagerie de l'équipe vers les membres ──────────────────────
// Alex, 2026-08-24 : depuis l'espace admin, l'équipe écrit dans la
// boîte de réception d'un membre, d'une poignée de membres cochés, ou
// de tout le registre d'un seul coup. Rien de neuf du côté du membre :
// le message atterrit dans le fil ordinaire de /messages, celui que
// tout le monde connaît déjà.
//
// Deux voix, et la différence est voulue.
//
//   • À une personne, le message part au nom de celle qui l'écrit. Le
//     membre voit « Maïté Fournel » dans sa boîte et lui répond
//     directement : la conversation est celle de deux personnes.
//
//   • À un groupe ou à tout le monde, le message part au nom du
//     festival. Trois cents membres n'ont pas à recevoir une lettre
//     signée d'un prénom qu'ils ne connaissent pas, et le fil du
//     festival se distingue au premier coup d'œil dans la boîte.
//
// ponytail: le fil du festival est un canal d'annonces. Un membre peut
// y répondre, et personne dans l'équipe ne lira cette réponse, puisque
// firestore.rules réserve la lecture d'un fil à ses deux participants
// et que « festival » n'est le compte de personne. Le jour où les
// réponses comptent, il faudra soit ouvrir la lecture des fils du
// festival à l'équipe dans les règles, soit envoyer les groupes au nom
// de la personne qui écrit, comme pour un envoi à une seule personne.

import {
  collection, limit as fbLimit, onSnapshot, orderBy, query,
  type Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';
import { ensureThread, sendDM, threadId } from './dms';
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

// ── L'envoi à une seule personne ────────────────────────────────────

export interface Expediteur {
  uid: string;
  nom: string;
  teinte?: number;
  photo?: string;
}

/** Écrire à un membre, en son propre nom. Le message rejoint le fil qui
 *  existe déjà entre les deux, ou en ouvre un neuf. */
export async function ecrireAUnMembre(
  moi: Expediteur,
  membre: Pick<Membre, 'uid' | 'nom' | 'avatarHue' | 'avatarUrl'>,
  texte: string,
): Promise<void> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  const corps = texte.trim().slice(0, LONGUEUR_MAX);
  if (!corps) throw new Error('Le message est vide.');
  if (moi.uid === membre.uid) throw new Error('Ce message vous serait adressé à vous.');

  await ensureThread(
    moi.uid, moi.nom, moi.teinte ?? 0, moi.photo,
    membre.uid, (membre.nom || '').trim() || 'Membre',
    membre.avatarHue ?? 0, membre.avatarUrl,
  );
  await sendDM(
    threadId(moi.uid, membre.uid),
    { senderUid: moi.uid, senderName: moi.nom, body: corps },
    membre.uid,
  );
}

// ── L'envoi en nombre, par la Cloud Function ────────────────────────
// Écrire deux ou trois cents fils depuis un onglet de navigateur est
// long, fragile, et laisse la moitié du travail derrière si quelqu'un
// ferme la fenêtre. La fonction appelable fait le tour du registre par
// lots et rend le compte exact des fils touchés.

export type PorteeEnvoi = 'tous' | 'selection';

export interface DemandeEnvoi {
  portee: PorteeEnvoi;
  /** Les uid visés. Ignoré quand la portée est « tous ». */
  uids?: string[];
  texte: string;
  /** La phrase qui décrit la cible dans l'historique : « Tout le
   *  registre », « Fonction : Marchand », « Étiquette : viking ». */
  cible: string;
}

export interface ResultatEnvoi {
  fils: number;
  ignores: number;
  envoiId: string;
}

export async function envoyerEnNombre(demande: DemandeEnvoi): Promise<ResultatEnvoi> {
  if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
  const texte = demande.texte.trim().slice(0, LONGUEUR_MAX);
  if (!texte) throw new Error('Le message est vide.');
  const appeler = httpsCallable<DemandeEnvoi, ResultatEnvoi>(
    getFunctions(firebaseApp, REGION),
    'messagerieDeMasse',
  );
  // La charge se construit clé par clé : un `uids: undefined` traverse
  // le sérialiseur en `null` et brouille la lecture côté fonction.
  const charge: DemandeEnvoi = { portee: demande.portee, texte, cible: demande.cible };
  if (demande.portee === 'selection') charge.uids = demande.uids || [];
  const { data } = await appeler(charge);
  return data;
}

// ── L'historique des envois ─────────────────────────────────────────
// Chaque envoi de groupe laisse sa trace : qui, quand, à qui, combien,
// et le texte exact. Alex doit pouvoir savoir ce qui est parti, sans
// avoir à fouiller les fils un par un.

export type StatutEnvoi = 'en cours' | 'terminé' | 'échoué';

export interface EnvoiMasse {
  id: string;
  parUid: string;
  parNom: string;
  parCourriel?: string;
  cible: string;
  portee: PorteeEnvoi;
  texte: string;
  /** Le nombre de membres visés au départ. */
  destinataires: number;
  /** Le nombre de fils réellement écrits, qui monte lot par lot. */
  faits: number;
  statut: StatutEnvoi;
  erreur?: string;
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
