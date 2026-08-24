// ─── Les parties de dés entre deux personnes ────────────────────────
// Alex, 2026-08-23 : le tafl savait déjà défier un ami, les dés non.
// Ils le savent maintenant, et sur le même patron.
//
//   /desParties/{id}             ← le défi PUIS la partie
//   /desParties/{id}/mains/{uid} ← la main scellée du joueur, ce tour-ci
//
// ── Le secret des mains, et pourquoi il tient ─────────────────────
//
// Un jeu de menteur ne vaut rien si l'adversaire peut ouvrir la console
// et lire le gobelet d'en face. Des deux façons de le régler, nous
// avons pris la première, celle des sous-documents fermés, parce
// qu'elle repose sur le serveur plutôt que sur la bonne foi du client.
//
// Chaque joueur tire ses dés chez lui et les écrit dans
// `mains/{son uid}`. Les règles de sécurité y posent trois verrous :
//
//   • la lecture est réservée au propriétaire du document, tant que la
//     partie n'est pas au dévoilement. Personne d'autre ne voit jamais
//     ces faces, ni par la console, ni par une requête, ni par erreur;
//   • au dévoilement, la lecture s'ouvre à tous les joueurs de la
//     partie. Les gobelets se lèvent en même temps pour tout le monde,
//     et chacun peut refaire le compte lui-même;
//   • la main ne se récrit qu'à la manche suivante, jamais pendant la
//     manche en cours. Une main scellée est donc figée : impossible de
//     changer ses dés après avoir entendu les annonces.
//
// Le dernier trou serait de sceller sa main TARD, après avoir écouté
// les autres. Il se ferme dans le règlement partagé : tant que
// `mainsPretes` ne contient pas tout le monde, aucune annonce n'est
// recevable (voir games/des/enLigne.ts). Un joueur qui ne scelle rien
// bloquerait la manche, et c'est là que le sablier entre en scène.
//
// Une mise en œuvre par engagement haché aurait aussi tenu, et elle
// aurait même résisté à un serveur curieux. Elle laissait toutefois la
// vérification à la charge des clients, avec un joueur qui refuse de
// révéler son grain et une partie qui reste en suspens. La règle de
// sécurité fait le même travail sans rien demander à personne.

import {
  collection, doc, addDoc, getDoc, getDocs, setDoc, updateDoc, query, where,
  onSnapshot, orderBy, runTransaction, arrayUnion, serverTimestamp,
  Timestamp, type Timestamp as TS,
} from 'firebase/firestore';
import { db } from '../firebase';
import { DES_AU_DEPART, lancerLesDes, type Face } from '../games/des/regles';
import {
  apresAbandon, apresAbsence, apresAnnonce, apresDoute, apresExact, apresManche,
  type EtatDes,
} from '../games/des/enLigne';

export type StatutPartieDes = 'defi' | 'lobby' | 'refuse' | 'encours' | 'fini';

export interface PartieDes extends EtatDes {
  id: string;
  statut: StatutPartieDes;
  /** Qui a lancé le défi. */
  lancePar: string;
  /** L'heure après laquelle un joueur silencieux perd la main. */
  echeance?: TS | null;
  createdAt?: TS;
  updatedAt?: TS;
}

export interface MainScellee {
  uid: string;
  manche: number;
  des: Face[];
}

const COL = 'desParties';
const MAINS = 'mains';

/** Une minute par tour. Assez pour peser une annonce, trop court pour
 *  laisser la table entière attendre un onglet fermé. */
export const DUREE_TOUR_MS = 60_000;

const prochainSablier = () => Timestamp.fromMillis(Date.now() + DUREE_TOUR_MS);

/** L'état d'une manche neuve, gobelets pleins et parole au premier. */
function etatDeDepart(joueurs: string[], noms: Record<string, string>): EtatDes {
  return {
    joueurs,
    noms,
    des: Object.fromEntries(joueurs.map((u) => [u, DES_AU_DEPART])),
    mainsPretes: [],
    elimines: [],
    mise: null,
    tour: joueurs[0],
    phase: 'annonces',
    manche: 1,
    journal: [],
    devoilement: null,
    gagnant: null,
    abandon: null,
  };
}

/** Les seuls champs de jeu qui partent à l'écriture. Le reste du
 *  document (le statut du défi, qui l'a lancé) ne bouge plus. */
function champsEtat(e: EtatDes) {
  return {
    joueurs: e.joueurs,
    noms: e.noms,
    des: e.des,
    mainsPretes: e.mainsPretes,
    elimines: e.elimines,
    mise: e.mise,
    tour: e.tour,
    phase: e.phase,
    manche: e.manche,
    journal: e.journal,
    devoilement: e.devoilement ?? null,
    gagnant: e.gagnant ?? null,
    abandon: e.abandon ?? null,
    statut: (e.phase === 'fini' ? 'fini' : 'encours') as StatutPartieDes,
  };
}

// ─── Ouvrir une partie ──────────────────────────────────────────────

/** Défier quelqu'un par son nom. Le défi tombe dans son espace. */
export async function lancerDefiDes(opts: {
  moiUid: string; moiNom: string; cibleUid: string; cibleNom: string;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const joueurs = [opts.moiUid, opts.cibleUid];
  const noms = { [opts.moiUid]: opts.moiNom, [opts.cibleUid]: opts.cibleNom };
  const ref = await addDoc(collection(db, COL), {
    ...champsEtat(etatDeDepart(joueurs, noms)),
    statut: 'defi' as StatutPartieDes,
    lancePar: opts.moiUid,
    echeance: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Ouvrir un défi par lien, sans destinataire. Le lien se colle dans
 *  un message, l'autre tombe sur le lobby et prend le siège libre. */
export async function ouvrirDefiDesParLien(opts: {
  moiUid: string; moiNom: string;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const ref = await addDoc(collection(db, COL), {
    ...champsEtat(etatDeDepart([opts.moiUid], { [opts.moiUid]: opts.moiNom })),
    statut: 'lobby' as StatutPartieDes,
    lancePar: opts.moiUid,
    echeance: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Prendre le siège libre d'un défi ouvert. La partie démarre aussitôt. */
export async function rejoindreDefiDesParLien(
  id: string, uid: string, nom: string,
): Promise<'ok' | 'plein' | 'introuvable' | 'moi'> {
  if (!db) return 'introuvable';
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 'introuvable';
  const p = snap.data() as PartieDes;
  if (p.joueurs.includes(uid)) return 'moi';
  if (p.statut !== 'lobby') return 'plein';
  const joueurs = [...p.joueurs, uid];
  await updateDoc(ref, {
    ...champsEtat(etatDeDepart(joueurs, { ...p.noms, [uid]: nom })),
    echeance: prochainSablier(),
    updatedAt: serverTimestamp(),
  });
  return 'ok';
}

/** Accepter ou refuser un défi nommé. */
export async function repondreAuDefiDes(id: string, accepte: boolean): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  const ref = doc(db, COL, id);
  if (!accepte) {
    await updateDoc(ref, { statut: 'refuse' as StatutPartieDes, updatedAt: serverTimestamp() });
    return;
  }
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const p = snap.data() as PartieDes;
  await updateDoc(ref, {
    ...champsEtat(etatDeDepart(p.joueurs, p.noms)),
    echeance: prochainSablier(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Suivre ─────────────────────────────────────────────────────────

export async function lirePartieDes(id: string): Promise<PartieDes | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as PartieDes) : null;
}

/** Mes défis et mes parties, en direct. */
export function suivreMesPartiesDes(
  uid: string,
  cb: (parties: PartieDes[]) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(
    collection(db, COL),
    where('joueurs', 'array-contains', uid),
    orderBy('updatedAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as PartieDes))),
    // Une règle qui refuse, ou un index encore en construction, ne doit
    // pas casser la page : nous rendons une liste vide.
    () => cb([]),
  );
}

/** Une partie précise, en direct : c'est le fil du jeu. */
export function suivrePartieDes(
  id: string,
  cb: (p: PartieDes | null) => void,
): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(
    doc(db, COL, id),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as PartieDes) : null),
    () => cb(null),
  );
}

// ─── Les mains scellées ─────────────────────────────────────────────

/** Tirer sa main pour la manche en cours et la sceller. Les dés ne
 *  quittent jamais le sous-document, que les règles ferment. */
export async function scellerSaMain(
  id: string, uid: string, manche: number, combien: number,
): Promise<Face[]> {
  if (!db) throw new Error('Firestore non configuré');
  const des = lancerLesDes(combien);
  await setDoc(doc(db, COL, id, MAINS, uid), { uid, manche, des });
  await updateDoc(doc(db, COL, id), {
    mainsPretes: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });
  return des;
}

/** Ma propre main, telle qu'elle a été scellée. */
export async function lireMaMain(
  id: string, uid: string, manche: number,
): Promise<Face[] | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COL, id, MAINS, uid));
  if (!snap.exists()) return null;
  const m = snap.data() as MainScellee;
  return m.manche === manche ? m.des : null;
}

/** Toutes les mains de la manche. Les règles n'ouvrent cette lecture
 *  qu'au dévoilement : avant, elle revient vide. */
export async function lireLesMains(
  id: string, manche: number,
): Promise<Record<string, Face[]>> {
  if (!db) return {};
  try {
    const snap = await getDocs(collection(db, COL, id, MAINS));
    const mains: Record<string, Face[]> = {};
    snap.docs.forEach((d) => {
      const m = d.data() as MainScellee;
      if (m.manche === manche) mains[d.id] = m.des;
    });
    return mains;
  } catch {
    return {};
  }
}

// ─── Jouer ──────────────────────────────────────────────────────────

/** Annoncer plus haut que le voisin. */
export async function annoncerEnLigne(
  id: string, etat: EtatDes, quantite: number, face: Face,
): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  const apres = apresAnnonce(etat, quantite, face);
  if (apres === etat) return;
  await updateDoc(doc(db, COL, id), {
    ...champsEtat(apres),
    echeance: prochainSablier(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Lever les gobelets, en deux gestes.
 *
 * Le premier écrit le dévoilement avec un compte encore vide : c'est
 * lui qui ouvre la lecture des mains, et il faut donc l'avoir posé
 * avant de pouvoir compter quoi que ce soit. Le second lit les mains et
 * écrit le verdict. Si l'onglet de celui qui a crié se ferme entre les
 * deux, le sablier laisse n'importe quel autre joueur finir le compte.
 */
export async function leverLesGobelets(
  id: string, etat: EtatDes, uid: string, exact: boolean,
): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  if (etat.phase !== 'annonces' || !etat.mise) return;
  await updateDoc(doc(db, COL, id), {
    phase: 'devoilement',
    devoilement: {
      doutePar: uid,
      contre: etat.mise.parUid,
      mise: etat.mise,
      compte: -1,
      perdantUid: null,
      gagnantDeUid: null,
      exact,
      mainsLevees: {},
    },
    echeance: prochainSablier(),
    updatedAt: serverTimestamp(),
  });
  await compterLesDes(id, { ...etat, phase: 'annonces' });
}

/**
 * Compter les dés levés et écrire le verdict.
 *
 * `etat` est l'état d'AVANT le dévoilement : la mise, les gobelets et
 * le journal tels qu'ils étaient au moment du cri. La transaction
 * s'assure qu'un seul compte est écrit, même si deux joueurs s'y
 * mettent en même temps.
 */
export async function compterLesDes(id: string, etat: EtatDes): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  const mains = await lireLesMains(id, etat.manche);
  const ref = doc(db, COL, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const vu = snap.data() as PartieDes;
    // Quelqu'un a compté avant nous, ou la manche a déjà tourné.
    if (vu.manche !== etat.manche || !vu.devoilement || vu.devoilement.compte >= 0) return;
    const depart: EtatDes = { ...etat, phase: 'annonces' };
    const apres = vu.devoilement.exact ? apresExact(depart, mains) : apresDoute(depart, mains);
    tx.update(ref, {
      ...champsEtat(apres),
      echeance: prochainSablier(),
      updatedAt: serverTimestamp(),
    });
  });
}

/** Refermer les gobelets et ouvrir la manche suivante. */
export async function mancheSuivanteEnLigne(id: string, etat: EtatDes): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  const ref = doc(db, COL, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const vu = snap.data() as PartieDes;
    // Deux doigts sur le même bouton n'ouvrent qu'une seule manche.
    if (vu.manche !== etat.manche || vu.phase !== 'devoilement') return;
    tx.update(ref, {
      ...champsEtat(apresManche(etat)),
      echeance: prochainSablier(),
      updatedAt: serverTimestamp(),
    });
  });
}

/** Le sablier a coulé : le silencieux passe et perd la main. */
export async function passerLeTourAbsent(id: string, etat: EtatDes): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  const ref = doc(db, COL, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const vu = snap.data() as PartieDes;
    // Le silencieux a peut-être parlé pendant le dernier grain de sable.
    if (vu.tour !== etat.tour || vu.manche !== etat.manche || vu.phase !== etat.phase) return;
    if (vu.echeance && vu.echeance.toMillis() > Date.now()) return;
    tx.update(ref, {
      ...champsEtat(apresAbsence(etat)),
      echeance: prochainSablier(),
      updatedAt: serverTimestamp(),
    });
  });
}

/** Quitter la table. */
export async function abandonnerDes(id: string, etat: EtatDes, uid: string): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, id), {
    ...champsEtat(apresAbandon(etat, uid)),
    echeance: prochainSablier(),
    updatedAt: serverTimestamp(),
  });
}
