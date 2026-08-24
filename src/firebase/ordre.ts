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
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit as fbLimit,
  onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { LONGUEUR_MAX } from './moderation';

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
  administrateur: { FR: 'Administrateur', EN: 'Administrator' },
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

export interface Membre {
  uid: string;
  nom: string;
  avatarUrl?: string;
  avatarHue?: number;
  ville?: string;
  /** La description que la personne écrit sur elle-même. */
  devise?: string;
  stats?: StatsMembre;
  /** Décernées par l'équipe seulement (voir firestore.rules). */
  roles?: RoleMembre[];
  // Les trois chiffres du bandeau que personne d'autre ne peut aller
  // lire à la source : les amitiés, les parties et les avis dorment
  // dans des collections fermées. La personne les recopie ici en
  // visitant son espace, et sa fiche publique les affiche.
  amis?: number;
  parties?: number;
  avisPris?: string[];
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

/** Décerner les fonctions d'un membre. Réservé à l'équipe : la règle
 *  Firestore refuse le champ `roles` à tous les autres. */
export async function definirRoles(uid: string, roles: RoleMembre[]): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, MEMBRES, uid), { uid, roles, maj: serverTimestamp() }, { merge: true });
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
