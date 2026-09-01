// ─── Les parties de tafl entre deux personnes ───────────────────────
// Un joueur en défie un autre depuis son espace client; le défi tombe
// dans l'espace de l'autre; s'il accepte, la partie s'ouvre et les deux
// jouent en direct (Alex, 2026-08-23).
//
//   /taflParties/{id}   ← le défi PUIS la partie, même document
//
// La collection a gardé son nom de baptême, mais elle porte maintenant
// les trois jeux de plateau (Alex, 2026-08-31) : le champ `jeu` dit
// lequel, et les camps prennent le vocabulaire du jeu concerné. Une
// partie d'avant ce jour-là n'a pas le champ, et c'est du tafl.
//
// Le plateau n'est jamais stocké : seule la LISTE DES COUPS l'est.
// Chaque camp rejoue les coups sur son propre moteur, ce qui garde le
// document minuscule et rend la triche visible (un coup illégal ne
// passe pas le moteur de l'autre).

import {
  collection, doc, addDoc, getDoc, setDoc, deleteDoc, updateDoc, query, where,
  onSnapshot, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type CampTafl = 'attacker' | 'defender';
export type StatutPartie = 'defi' | 'lobby' | 'refuse' | 'encours' | 'fini';

/** Les trois jeux de plateau qui se défient d'un compte à l'autre. */
export type JeuDefi = 'hnefatafl' | 'merelle' | 'renard';

/** Le jeu d'une partie. Les parties ouvertes avant le 31 août 2026 ne
 *  portent pas le champ : elles sont toutes du hnefatafl. */
export const jeuDe = (p: { jeu?: JeuDefi }): JeuDefi => p.jeu ?? 'hnefatafl';

/** Qui ouvre la partie, dans chaque jeu. */
export const PREMIER_CAMP: Record<JeuDefi, string> = {
  hnefatafl: 'attacker',
  merelle:   '1',
  renard:    'oies',
};

/** Les deux camps de chaque jeu, celui qui ouvre en premier. La
 *  personne défiée prend toujours le premier : elle n'a rien demandé,
 *  elle mérite le premier coup. */
export const CAMPS_DU_JEU: Record<JeuDefi, [string, string]> = {
  hnefatafl: ['attacker', 'defender'],
  merelle:   ['1', '2'],
  renard:    ['oies', 'renard'],
};

/** Le nom et l'adresse de chaque jeu, en un seul endroit : la cloche,
 *  la fiche d'un membre et la liste des défis y lisent la même chose.
 *  `auFR` porte la préposition, qui n'est pas la même d'un titre à
 *  l'autre (« au Hnefatafl », mais « à la Mérelle »). */
export const JEUX_DEFIABLES: Record<JeuDefi, {
  nomFR: string; nomEN: string; auFR: string;
  cheminFR: string; cheminEN: string;
}> = {
  hnefatafl: {
    nomFR: 'Hnefatafl', nomEN: 'Hnefatafl', auFR: 'au Hnefatafl',
    cheminFR: '/jeunesse/hnefatafl', cheminEN: '/en/youth/hnefatafl',
  },
  merelle: {
    nomFR: 'La Mérelle', nomEN: 'Nine Men’s Morris', auFR: 'à la Mérelle',
    cheminFR: '/jeux/merelle', cheminEN: '/en/games/merelle',
  },
  renard: {
    nomFR: 'Le Renard et les Oies', nomEN: 'Fox and Geese', auFR: 'au Renard et les Oies',
    cheminFR: '/jeux/renard', cheminEN: '/en/games/fox-and-geese',
  },
};

/** Le règlement pris par défaut quand le défi part d'une fiche de
 *  membre, où il n'y a pas de place pour choisir. */
export const REGLE_PAR_DEFAUT: Record<JeuDefi, string> = {
  hnefatafl: 'copenhague',
  merelle:   'vol',
  renard:    'oies13',
};

export interface PartieTafl {
  id:        string;
  /** Le jeu de la partie. Absent : hnefatafl (voir `jeuDe`). */
  jeu?:      JeuDefi;
  /** La chambre paraît dans la liste des tables ouvertes. */
  public?:   boolean;
  /** Les deux uid, pour la requête et pour les règles de sécurité. */
  joueurs:   string[];
  noms:      Record<string, string>;
  /** Qui tient quel camp, dans le vocabulaire du jeu. */
  camps:     Record<string, string>;
  /** Le règlement ou la variante, selon le jeu. */
  regleId:   string;
  statut:    StatutPartie;
  /** Qui a lancé le défi (l'autre doit accepter). */
  lancePar:  string;
  /** Les coups, dans l'ordre : "fr,fc>tr,tc". */
  coups:     string[];
  /** À qui de jouer, dans le vocabulaire du jeu. */
  tour:      string;
  gagnant?:  string | null;
  /** Le camp qui a abandonné, s'il y a lieu. */
  abandon?:  string | null;
  /** Le minuteur choisi au défi (Alex, 2026-08-27) : chaque coup doit
   *  tomber avant `echeance`, sinon l'autre réclame la partie. Absent ou
   *  nul : pas de limite. */
  delaiMs?:  number | null;
  echeance?: Timestamp | null;
  /** La partie s'est finie par forfait sur le minuteur. */
  forfait?:  boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const COL = 'taflParties';

export const coupEnTexte = (fr: number, fc: number, tr: number, tc: number): string =>
  `${fr},${fc}>${tr},${tc}`;

export const coupDepuisTexte = (s: string): [number, number, number, number] => {
  const [a, b] = s.split('>');
  const [fr, fc] = a.split(',').map(Number);
  const [tr, tc] = b.split(',').map(Number);
  return [fr, fc, tr, tc];
};

/**
 * Lance un défi, pour n'importe lequel des trois jeux de plateau.
 *
 * Le document est le même d'un jeu à l'autre : deux joueurs, une carte
 * des camps, un règlement, une liste de coups. Seul le vocabulaire des
 * camps change, et le jeu le dit dans `camps`.
 */
export async function lancerDefiJeu(opts: {
  jeu: JeuDefi;
  moiUid: string; moiNom: string;
  cibleUid: string; cibleNom: string;
  regleId: string;
  /** Le camp que JE prends; la personne défiée prend l'autre. */
  monCamp: string;
  /** Temps accordé à chaque coup, en millisecondes; 0 ou absent = sans limite. */
  delaiMs?: number;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const [a, b] = CAMPS_DU_JEU[opts.jeu];
  const autre = opts.monCamp === a ? b : a;
  const ref = await addDoc(collection(db, COL), {
    jeu: opts.jeu,
    joueurs: [opts.moiUid, opts.cibleUid],
    noms: { [opts.moiUid]: opts.moiNom, [opts.cibleUid]: opts.cibleNom },
    camps: { [opts.monCamp]: opts.moiUid, [autre]: opts.cibleUid },
    regleId: opts.regleId,
    statut: 'defi' as StatutPartie,
    lancePar: opts.moiUid,
    coups: [] as string[],
    tour: PREMIER_CAMP[opts.jeu],
    gagnant: null,
    abandon: null,
    delaiMs: opts.delaiMs || null,
    echeance: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Défier quelqu'un depuis sa fiche de membre, sans écran de réglages.
 *
 * La personne défiée reçoit le camp qui ouvre la partie : c'est elle
 * qui subit le défi, le premier coup lui revient.
 */
export const defierAuJeu = (
  jeu: JeuDefi,
  moi: { uid: string; nom: string },
  cible: { uid: string; nom: string },
): Promise<string> => lancerDefiJeu({
  jeu,
  moiUid: moi.uid, moiNom: moi.nom,
  cibleUid: cible.uid, cibleNom: cible.nom,
  regleId: REGLE_PAR_DEFAUT[jeu],
  monCamp: CAMPS_DU_JEU[jeu][1],
});

/** Lance un défi de tafl. L'adversaire le voit dans son espace. */
export const lancerDefi = (opts: {
  moiUid: string; moiNom: string;
  cibleUid: string; cibleNom: string;
  regleId: string;
  /** Le camp que JE prends; l'autre prend le camp opposé. */
  monCamp: CampTafl;
  /** Temps accordé à chaque coup, en millisecondes; 0 ou absent = sans limite. */
  delaiMs?: number;
}): Promise<string> => lancerDefiJeu({ ...opts, jeu: 'hnefatafl' });

/** L'échéance du prochain coup, d'après le délai de la partie. */
const echeanceSuivante = (delaiMs?: number | null) =>
  delaiMs ? Timestamp.fromMillis(Date.now() + delaiMs) : null;

/**
 * Ouvre un défi par lien, sans destinataire.
 *
 * C'est la porte d'entrée du site (Alex, 2026-08-23) : le lien se
 * colle dans Messenger ou dans un courriel, l'autre tombe sur le lobby,
 * se crée un compte, et la partie commence. Le siège reste libre tant
 * que personne ne l'a pris.
 */
export async function ouvrirDefiParLien(opts: {
  moiUid: string; moiNom: string; regleId: string; monCamp: CampTafl;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const autre: CampTafl = opts.monCamp === 'attacker' ? 'defender' : 'attacker';
  const ref = await addDoc(collection(db, COL), {
    jeu: 'hnefatafl' as JeuDefi,
    joueurs: [opts.moiUid],
    noms: { [opts.moiUid]: opts.moiNom },
    camps: { [opts.monCamp]: opts.moiUid, [autre]: '' },
    regleId: opts.regleId,
    statut: 'lobby' as StatutPartie,
    lancePar: opts.moiUid,
    coups: [] as string[],
    tour: 'attacker' as CampTafl,
    gagnant: null,
    abandon: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Prend le siège libre d'une partie ouverte, quel que soit le jeu.
 *
 * Le camp libre ne se devine pas à partir d'un nom en dur : la carte
 * des camps porte le vocabulaire du jeu ('attacker', '1', 'oies'), et
 * le siège vide est celui dont la valeur est une chaîne vide. C'est ce
 * qui permet au Renard et à la Mérelle d'ouvrir des chambres sans que
 * cette fonction ait à savoir à quoi on joue (Alex, 2026-09-01).
 */
export async function rejoindreDefiParLien(
  id: string, uid: string, nom: string,
): Promise<'ok' | 'plein' | 'introuvable' | 'moi'> {
  if (!db) return 'introuvable';
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 'introuvable';
  const p = snap.data() as PartieTafl;
  if (p.joueurs.includes(uid)) return 'moi';
  if (p.statut !== 'lobby') return 'plein';
  const campLibre = Object.keys(p.camps).find((c) => !p.camps[c]);
  if (!campLibre) return 'plein';
  await updateDoc(ref, {
    joueurs: [...p.joueurs, uid],
    [`noms.${uid}`]: nom,
    [`camps.${campLibre}`]: uid,
    statut: 'encours' as StatutPartie,
    updatedAt: serverTimestamp(),
  });
  return 'ok';
}

/**
 * Ouvre une chambre publique, sans destinataire et pour n'importe
 * lequel des trois plateaux.
 *
 * C'est la porte de la recherche de partie (Alex, 2026-09-01) : le
 * document est un défi par lien, plus un drapeau `public` qui le fait
 * paraître dans la liste des chambres ouvertes.
 */
export async function ouvrirSalonJeu(opts: {
  jeu: JeuDefi;
  moiUid: string; moiNom: string;
  regleId: string;
  /** Le camp que JE prends; le siège libre porte l'autre. */
  monCamp: string;
  delaiMs?: number;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const [a, b] = CAMPS_DU_JEU[opts.jeu];
  const autre = opts.monCamp === a ? b : a;
  const ref = await addDoc(collection(db, COL), {
    jeu: opts.jeu,
    public: true,
    joueurs: [opts.moiUid],
    noms: { [opts.moiUid]: opts.moiNom },
    camps: { [opts.monCamp]: opts.moiUid, [autre]: '' },
    regleId: opts.regleId,
    statut: 'lobby' as StatutPartie,
    lancePar: opts.moiUid,
    coups: [] as string[],
    tour: PREMIER_CAMP[opts.jeu],
    gagnant: null,
    abandon: null,
    delaiMs: opts.delaiMs || null,
    echeance: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function repondreAuDefi(id: string, accepte: boolean, delaiMs?: number | null): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    statut: accepte ? 'encours' : 'refuse',
    // Le sablier du premier coup part à l'acceptation.
    ...(accepte ? { echeance: echeanceSuivante(delaiMs) } : {}),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Pousse un coup. Le tour bascule dans la même écriture.
 *
 * 🚨 Surtout pas arrayUnion : il dédoublonne. Au tafl, un même coup
 * revient forcément (une pièce fait l'aller-retour) et le deuxième
 * était avalé, le tour basculait quand même, et les deux damiers
 * divergeaient pour de bon. On écrit donc la liste complète, ce que le
 * client connaît puisqu'il suit le document en direct, et seul le
 * joueur dont c'est le tour écrit.
 */
export async function jouerCoup(
  id: string,
  coupsAvant: string[],
  coup: string,
  tourSuivant: string,
  gagnant: string | null = null,
  delaiMs?: number | null,
): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    coups: [...coupsAvant, coup],
    tour: tourSuivant,
    echeance: gagnant ? null : echeanceSuivante(delaiMs),
    ...(gagnant ? { statut: 'fini' as StatutPartie, gagnant } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function abandonner(id: string, uid: string, campGagnant: string): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    statut: 'fini' as StatutPartie,
    gagnant: campGagnant,
    abandon: uid,
    updatedAt: serverTimestamp(),
  });
}

/** Le minuteur est écoulé sur le tour de l'autre : je réclame la partie. */
export async function reclamerForfait(id: string, uidPerdant: string, campGagnant: string): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    statut: 'fini' as StatutPartie,
    gagnant: campGagnant,
    abandon: uidPerdant,
    forfait: true,
    updatedAt: serverTimestamp(),
  });
}

/** Les délais proposés au défi. */
export const DELAIS_DEFI: Array<{ ms: number; FR: string; EN: string }> = [
  { ms: 0,                 FR: 'Sans limite', EN: 'No limit' },
  { ms: 60 * 60 * 1000,    FR: '1 heure par coup', EN: '1 hour per move' },
  { ms: 24 * 60 * 60 * 1000, FR: '24 heures par coup', EN: '24 hours per move' },
  { ms: 3 * 24 * 60 * 60 * 1000, FR: '3 jours par coup', EN: '3 days per move' },
];

export function tempsRestant(p: Pick<PartieTafl, 'echeance' | 'statut'>): number | null {
  if (p.statut !== 'encours' || !p.echeance) return null;
  return p.echeance.toMillis() - Date.now();
}

export function formatDelai(ms: number, fr: boolean): string {
  if (ms <= 0) return fr ? 'écoulé' : 'expired';
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 48) return fr ? `${Math.floor(h / 24)} j` : `${Math.floor(h / 24)} d`;
  if (h >= 1) return `${h} h ${m.toString().padStart(2, '0')}`;
  return `${m} min`;
}

export async function lirePartie(id: string): Promise<PartieTafl | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as PartieTafl) : null;
}

/** Toutes mes parties et mes défis, en direct. */
export function suivreMesParties(
  uid: string,
  cb: (parties: PartieTafl[]) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(
    collection(db, COL),
    where('joueurs', 'array-contains', uid),
    orderBy('updatedAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as PartieTafl))),
    // Une règle de sécurité qui refuse, ou un index manquant, ne doit
    // pas casser l'espace client : on rend une liste vide.
    () => cb([]),
  );
}

/** Une partie précise, en direct : c'est le fil du jeu. */
export function suivrePartie(
  id: string,
  cb: (p: PartieTafl | null) => void,
): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(
    doc(db, COL, id),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as PartieTafl) : null),
    () => cb(null),
  );
}


// ─── La table ouverte ───────────────────────────────────────────────
// Le répertoire des membres reste fermé (décision d'Alex du 4 juillet
// 2026 : personne ne moissonne les courriels). Pour se faire défier, on
// s'inscrit donc VOLONTAIREMENT à la table : un document par joueur,
// qui ne porte qu'un nom d'affichage.
//
//   /taflJoueurs/{uid}  { nom, depuis }

export interface JoueurTafl {
  uid: string;
  nom: string;
}

const COL_JOUEURS = 'taflJoueurs';

export async function rejoindreLaTable(uid: string, nom: string): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await setDoc(doc(db, COL_JOUEURS, uid), { nom, depuis: serverTimestamp() });
}

export async function quitterLaTable(uid: string): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await deleteDoc(doc(db, COL_JOUEURS, uid));
}

export function suivreLaTable(cb: (joueurs: JoueurTafl[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    collection(db, COL_JOUEURS),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, nom: String((d.data() as { nom?: string }).nom ?? '') }))),
    () => cb([]),
  );
}
