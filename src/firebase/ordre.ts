// ─── L'Ordre : les membres, les amitiés, les défis ouverts ───────────
// Alex, 2026-08-23 : le site devient un petit réseau de médiévistes. On
// cherche les autres membres par nom, on les ajoute comme amis, on voit
// leur fiche. Et on défie n'importe qui par un lien, même quelqu'un qui
// n'a pas encore de compte : le lien l'amène au lobby, il se crée un
// compte, la partie commence.
//
//   /membres/{uid}     fiche publique, écrite par la personne
//   /amities/{a__b}    une ligne par paire, les deux peuvent l'écrire

import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs,
  limit as fbLimit, onSnapshot, orderBy, query, serverTimestamp, setDoc,
  updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { LONGUEUR_MAX } from './moderation';
import { hueFor } from './publicProfile';

// ── Les fiches ──────────────────────────────────────────────────────
export interface StatsMembre {
  force: number; ruse: number; chance: number; verve: number; endurance: number;
}

// ── Les fonctions portées au festival ───────────────────────────────
// Une même personne en cumule souvent plusieurs : bénévole le samedi,
// marchande le dimanche, trésorière toute l'année. Les fonctions se
// décernent depuis l'espace admin et se lisent partout ailleurs, en
// petites pastilles sous le nom (Alex, 2026-08-23).
export type RoleMembre =
  | 'membre' | 'benevole' | 'marchand' | 'artisan' | 'musicien' | 'securite'
  | 'administrateur' | 'tresorier' | 'secretaire' | 'commanditaire' | 'chevalier';

export const ROLES_MEMBRE: RoleMembre[] = [
  'membre', 'benevole', 'marchand', 'artisan', 'musicien', 'securite',
  'administrateur', 'tresorier', 'secretaire', 'commanditaire', 'chevalier',
];

export const LIBELLE_ROLE: Record<RoleMembre, { FR: string; EN: string }> = {
  membre:         { FR: 'Membre',         EN: 'Member'        },
  benevole:       { FR: 'Bénévole',       EN: 'Volunteer'     },
  marchand:       { FR: 'Marchand',       EN: 'Merchant'      },
  artisan:        { FR: 'Artisan',        EN: 'Artisan'       },
  musicien:       { FR: 'Musicien',       EN: 'Musician'      },
  securite:       { FR: 'Sécurité',       EN: 'Security'      },
  administrateur: { FR: 'Admin · Modérateur', EN: 'Admin · Moderator' },
  tresorier:      { FR: 'Trésorier',      EN: 'Treasurer'     },
  secretaire:     { FR: 'Secrétaire',     EN: 'Secretary'     },
  commanditaire:  { FR: 'Commanditaire',  EN: 'Sponsor'       },
  chevalier:      { FR: 'Chevalier',      EN: 'Knight'        },
};

/** Tout le monde porte au moins « Membre », le reste s'ajoute par-dessus. */
export function rolesAffiches(roles?: RoleMembre[]): RoleMembre[] {
  const autres = (roles || []).filter((r) => r !== 'membre' && ROLES_MEMBRE.includes(r));
  return ['membre', ...autres];
}

/** Position de la bannière du bandeau : sous le nom (comme avant),
 *  au-dessus du portrait, ou en colonne verticale à droite. */
export type PositionBanniere = 'haut' | 'bas' | 'droite';
/** Le skin choisi par un membre VIP (rouge = la palette d'origine). */
export type SkinMembre = 'rouge' | 'bleu' | 'dore';

export interface PrefsMembre {
  /** La bannière glisse doucement au défilement. Défaut vrai. */
  parallaxe?: boolean;
  positionBanniere?: PositionBanniere;
  /** Le cadrage de la photo dans la bannière, en pourcentage (0..100). */
  cadrage?: { x: number; y: number };
  /** Les couches de braises/flammes/particules du site. Défaut vrai. */
  animationsFond?: boolean;
  /** Réservé aux VIP (users.sansPub) : le skin du site pour soi. */
  skin?: SkinMembre;
}

export interface Membre {
  uid: string;
  nom: string;
  avatarUrl?: string;
  /** La photo de bannière du profil (users/{uid}/banniere.webp). */
  banniereUrl?: string;
  avatarHue?: number;
  /** Position et zoom de la photo dans le médaillon rond, en fractions
   *  relatives (0,0 = centrée, zoom 1 = cadrage plein sans recul) pour
   *  tenir à toute taille d'affichage (AvatarUpload, 2026-08-23). */
  cadrage?: { x: number; y: number; zoom: number };
  ville?: string;
  /** La description que la personne écrit sur elle-même. */
  devise?: string;
  stats?: StatsMembre;
  /** Décernées par l'équipe seulement (voir firestore.rules). */
  roles?: RoleMembre[];
  /** Les étiquettes libres que l'équipe attribue pour former des
   *  groupes d'envoi : viking, pirate, villageois, saltimbanque,
   *  client, municipalité. Elles n'ont aucun effet sur les droits et
   *  ne paraissent que dans l'admin. Comme les fonctions, la règle
   *  Firestore réserve le champ à l'équipe (Alex, 2026-08-24). */
  tags?: string[];
  /** Le badge bleu vérifié : décerné par l'équipe seulement (kiosques,
   *  administrateurs, artisans reconnus). Alex, 2026-08-28. */
  verifie?: boolean;
  /** VIP = un don « sans publicité à vie » (users/{uid}.sansPub). Ce
   *  champ n'est qu'une COPIE que la personne se pose elle-même en
   *  visitant son espace : users/{uid} n'est lisible que par son
   *  propriétaire, donc la fiche publique porte la copie pour que les
   *  autres membres voient le VIP (Alex, 2026-08-28). */
  vip?: boolean;
  /** Les réglages personnels du profil : bannière, fond animé, skin. */
  prefs?: PrefsMembre;
  // Les trois chiffres du bandeau que personne d'autre ne peut aller
  // lire à la source : les amitiés, les parties et les avis dorment
  // dans des collections fermées. La personne les recopie ici en
  // visitant son espace, et sa fiche publique les affiche.
  amis?: number;
  parties?: number;
  avisPris?: string[];
  /** Les rendez-vous médiévaux que la personne fréquente (identifiants
   *  de src/content/evenementsMedievaux.ts), plus un libre. */
  evenements?: string[];
  evenementsAutre?: string;
  /** La cloche : dernier regard et pages déjà annoncées. */
  notifsVuesLe?: unknown;
  pagesVues?: string[];
  maj?: unknown;
}

export const STATS_VIDES: StatsMembre = {
  force: 10, ruse: 10, chance: 10, verve: 10, endurance: 10,
};

const MEMBRES = 'membres';

export async function publierFiche(uid: string, fiche: Partial<Membre>): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, MEMBRES, uid), { uid, ...fiche, maj: serverTimestamp() }, { merge: true });
}

/** La fiche d'entrée au registre, posée à la première connexion, quel
 *  que soit le chemin emprunté : Google, mot de passe, ou le lien reçu
 *  après une inscription à l'infolettre. Une fiche déjà là reste
 *  intacte, personne ne se fait écraser son nom à chaque visite.
 *
 *  Le champ `roles` ne s'écrit pas ici, et c'est voulu : la règle
 *  Firestore le réserve à l'équipe, et `rolesAffiches` porte déjà
 *  « membre » à tout le monde. La fonction de base n'a donc pas
 *  besoin d'être inscrite pour exister (Alex, 2026-08-24).
 *
 *  Le courriel n'entre jamais dans la fiche : la collection se lit par
 *  tous les membres connectés. Sans nom d'affichage, la personne entre
 *  sous « Un inconnu » et se renomme depuis son espace. */
export async function assurerFiche(
  uid: string, nom: string, avatarUrl?: string | null,
): Promise<void> {
  if (!db) return;
  const deja = await getDoc(doc(db, MEMBRES, uid));
  if (deja.exists()) return;
  const propre = nom.trim() || 'Un inconnu';
  await publierFiche(uid, {
    nom: propre,
    avatarHue: hueFor(propre),
    ...(avatarUrl ? { avatarUrl } : {}),
    stats: { ...STATS_VIDES },
  });
}

/** Décerner les fonctions d'un membre. Réservé à l'équipe : la règle
 *  Firestore refuse le champ `roles` à tous les autres. */
export async function definirRoles(uid: string, roles: RoleMembre[]): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, MEMBRES, uid), { uid, roles, maj: serverTimestamp() }, { merge: true });
}

/** Attribuer les étiquettes d'un membre. Réservé à l'équipe, comme
 *  les fonctions. Une étiquette vide se retire de la fiche. */
export async function definirTags(uid: string, tags: string[]): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, MEMBRES, uid), {
    uid, tags: normaliserTags(tags), maj: serverTimestamp(),
  }, { merge: true });
}

// ── Le catalogue des étiquettes ─────────────────────────────────────
// Un seul document porte la liste de toutes les étiquettes créées, pour
// que l'équipe choisisse dans une liste au lieu de retaper un mot et de
// se retrouver avec « viking », « Viking » et « vikings ». Le document
// se lit par tout membre connecté et ne s'écrit que par l'équipe.
//
//   /etiquettesOrdre/liste   { tags: ['viking', 'pirate', ...] }

const ETIQUETTES = 'etiquettesOrdre';
const DOC_ETIQUETTES = 'liste';
export const LONGUEUR_TAG = 24;

/** Une étiquette tient sur une ligne, sans espaces de bout, et deux
 *  écritures voisines du même mot deviennent la même étiquette. */
export function normaliserTag(brut: string): string {
  return brut.replace(/\s+/g, ' ').trim().slice(0, LONGUEUR_TAG);
}

function normaliserTags(tags: string[]): string[] {
  const vus = new Set<string>();
  const propres: string[] = [];
  for (const t of tags) {
    const n = normaliserTag(t);
    const cle = sansAccents(n);
    if (!n || vus.has(cle)) continue;
    vus.add(cle);
    propres.push(n);
  }
  return propres.sort((a, b) => a.localeCompare(b, 'fr'));
}

export async function listerEtiquettes(): Promise<string[]> {
  if (!db) return [];
  const snap = await getDoc(doc(db, ETIQUETTES, DOC_ETIQUETTES));
  const brut = snap.exists() ? (snap.data().tags as unknown) : [];
  return Array.isArray(brut) ? normaliserTags(brut as string[]) : [];
}

/** Ajouter une étiquette au catalogue. Le document naît à la première
 *  création, d'où la fusion plutôt qu'une mise à jour. */
export async function creerEtiquette(nom: string): Promise<string> {
  const propre = normaliserTag(nom);
  if (!db || !propre) return propre;
  await setDoc(doc(db, ETIQUETTES, DOC_ETIQUETTES), {
    tags: arrayUnion(propre), maj: serverTimestamp(),
  }, { merge: true });
  return propre;
}

/** Coller ou décoller une étiquette sur plusieurs membres d'un coup.
 *  Un lot Firestore accepte 500 écritures, donc le registre entier
 *  passe en une poignée d'allers-retours au lieu d'un par membre. */
export async function marquerMembres(
  uids: string[], tag: string, poser: boolean,
): Promise<number> {
  const propre = normaliserTag(tag);
  if (!db || !propre || !uids.length) return 0;
  let touches = 0;
  for (let i = 0; i < uids.length; i += 400) {
    const lot = writeBatch(db);
    for (const uid of uids.slice(i, i + 400)) {
      lot.set(doc(db, MEMBRES, uid), {
        uid,
        tags: poser ? arrayUnion(propre) : arrayRemove(propre),
        maj: serverTimestamp(),
      }, { merge: true });
      touches += 1;
    }
    await lot.commit();
  }
  // Une étiquette posée pour la première fois entre au catalogue, pour
  // que le choix suivant se fasse dans la liste.
  if (poser) await creerEtiquette(propre);
  return touches;
}

/** Les membres qui portent l'étiquette, sans se soucier des accents ni
 *  de la casse : « Viking » et « viking » désignent le même groupe. */
export function membresParTag(membres: Membre[], tag: string): Membre[] {
  const cible = sansAccents(normaliserTag(tag));
  if (!cible) return [];
  return membres.filter((m) => (m.tags || []).some((t) => sansAccents(t) === cible));
}

/** Les membres qui portent la fonction, « membre » comprise. */
export function membresParRole(membres: Membre[], role: RoleMembre): Membre[] {
  return membres.filter((m) => rolesAffiches(m.roles).includes(role));
}

export async function lireFiche(uid: string): Promise<Membre | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, MEMBRES, uid));
  return snap.exists() ? (snap.data() as Membre) : null;
}

/** Toute la salle, par ordre alphabétique. La recherche se fait ensuite
 *  dans le navigateur : le registre du festival tient largement. */
export async function listerMembres(max = 300): Promise<Membre[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, MEMBRES), orderBy('nom'), fbLimit(max)));
    return snap.docs.map((d) => d.data() as Membre);
  } catch {
    const snap = await getDocs(query(collection(db, MEMBRES), fbLimit(max)));
    return snap.docs.map((d) => d.data() as Membre);
  }
}

const sansAccents = (v: string) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrerMembres(membres: Membre[], terme: string): Membre[] {
  const t = sansAccents(terme.trim());
  if (!t) return membres;
  return membres.filter((m) => sansAccents(m.nom || '').includes(t)
    || sansAccents(m.ville || '').includes(t)
    || sansAccents(m.devise || '').includes(t));
}

// ── Les amitiés ─────────────────────────────────────────────────────
export type StatutAmitie = 'demande' | 'amis';

export interface Amitie {
  paire: string[];
  de: string;
  statut: StatutAmitie;
}

const AMITIES = 'amities';
export const cleAmitie = (a: string, b: string) => [a, b].sort().join('__');

export async function demanderAmitie(moi: string, autre: string): Promise<void> {
  if (!db || moi === autre) return;
  await setDoc(doc(db, AMITIES, cleAmitie(moi, autre)), {
    paire: [moi, autre].sort(), de: moi, statut: 'demande' as StatutAmitie,
    maj: serverTimestamp(),
  }, { merge: true });
}

export async function accepterAmitie(moi: string, autre: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, AMITIES, cleAmitie(moi, autre)), {
    statut: 'amis' as StatutAmitie, maj: serverTimestamp(),
  });
}

/** Les liens qui me concernent, en direct. */
export function suivreMesAmities(uid: string, cb: (liens: Amitie[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, AMITIES), where('paire', 'array-contains', uid)),
    (snap) => cb(snap.docs.map((d) => d.data() as Amitie)),
    () => cb([]),
  );
}

export function estAmi(liens: Amitie[], moi: string, autre: string): boolean {
  return liens.some((l) => l.statut === 'amis' && l.paire.includes(moi) && l.paire.includes(autre));
}

export function amitieEnAttente(liens: Amitie[], moi: string, autre: string): Amitie | undefined {
  return liens.find((l) => l.statut === 'demande' && l.paire.includes(moi) && l.paire.includes(autre));
}

// ── Le salon de l'Ordre ─────────────────────────────────────────────
// La place publique du registre (Alex, 2026-08-23). Un seul fil, ouvert
// à tous les membres connectés, du plus ancien au plus récent, comme
// une table où chacun prend la parole à son tour.
//
//   /salonOrdre/{motId}
//
// La lecture ne rapatrie que les derniers mots : le salon d'un festival
// tient largement dans deux cents lignes, et personne n'a envie de
// remonter plus loin. Firestore les rend du plus récent au plus ancien,
// donc le navigateur les retourne avant de les afficher.

const SALON = 'salonOrdre';
const MOTS_AFFICHES = 200;

export interface MotSalon {
  id?: string;
  uid: string;
  nom: string;
  avatarUrl?: string;
  avatarHue?: number;
  texte: string;
  ecritLe?: unknown;
}

/** Le salon en direct, du plus ancien au plus récent. */
export function suivreSalon(cb: (mots: MotSalon[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, SALON), orderBy('ecritLe', 'desc'), fbLimit(MOTS_AFFICHES)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MotSalon) })).reverse()),
    (err) => { console.warn('[salon] lecture', err); cb([]); },
  );
}

export async function direAuSalon(mot: Omit<MotSalon, 'id' | 'ecritLe'>): Promise<void> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  const texte = mot.texte.trim().slice(0, LONGUEUR_MAX);
  if (!texte) return;
  await addDoc(collection(db, SALON), {
    uid: mot.uid,
    nom: mot.nom,
    ...(mot.avatarUrl ? { avatarUrl: mot.avatarUrl } : {}),
    ...(typeof mot.avatarHue === 'number' ? { avatarHue: mot.avatarHue } : {}),
    texte,
    ecritLe: serverTimestamp(),
  });
}

/** Retirer son propre mot. La règle Firestore laisse aussi passer
 *  l'équipe, et personne d'autre. */
export async function retirerDuSalon(motId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, SALON, motId));
}
