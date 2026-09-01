// ─── L'adversaire de bois ───────────────────────────────────────────
// Alex, 2026-09-01 : « L'IA qui contrôle les jeux est vraiment très
// mauvaise. » L'ancienne tête regardait trois coups devant elle,
// comptait les pions et les moulins, et s'arrêtait là. Elle ne voyait
// pas la fourche, c'est-à-dire les deux moulins ouverts qu'un même pion
// soutient et dont l'adversaire ne peut boucher qu'un seul avec le coup
// qui lui reste. Une partie de mérelle se gagne pourtant presque
// toujours comme cela.
//
// Ce fichier ne porte plus de recherche. Il remplit le contrat du
// moteur commun (`src/games/moteur`) et laisse la table de
// transposition, l'approfondissement progressif et la quiescence faire
// leur travail. Il ne reste ici que ce qui appartient vraiment à la
// mérelle : la note d'une position, et l'ordre dans lequel les coups
// méritent d'être essayés.
//
// LE SIGNE. Le moteur est en negamax, donc `evaluer` rend toujours la
// note du point de vue du camp QUI A LE TRAIT, jamais celle d'un camp
// fixé d'avance comme le faisait l'ancien fichier. Se tromper là-dessus
// fait jouer la machine contre elle-même, et cela ne se voit qu'au banc
// d'essai : c'est le rôle de la partie témoin de `logic.test.ts`.
//
// LE RETRAIT. Quand un moulin se ferme, la main ne change pas et le
// même joueur retire un pion. Le retrait est donc un coup comme un
// autre dans l'arbre, et la recherche continue du même côté au lieu de
// passer la main.

import {
  LIGNES, autreCamp, compte, jouer, voisins,
  coupEnTexte, type Camp, type Case, type Coup, type Etat,
} from './logic';
import {
  clePosition, coupsArbitre, depuisJeu, jouerArbitre, verdictArbitre,
  type EtatMerelle,
} from './arbitre';
import { choisirAuNiveau, type ChoixOptions, type Niveau } from '../moteur/niveaux';
import type { Adaptateur } from '../moteur/types';

/** Une partie déjà gagnée, notée assez haut pour écraser tout le reste
 *  et assez bas pour ne pas se confondre avec un mat du moteur. */
const VICTOIRE = 90_000;

/** Les alignements qui passent par chaque point. Trois au plus, et deux
 *  la plupart du temps : de quoi savoir ce qu'un coup ferme sans avoir à
 *  jouer le coup pour le découvrir. */
const LIGNES_PAR_POINT: ReadonlyArray<ReadonlyArray<readonly [number, number, number]>> =
  Array.from({ length: 24 }, (_, p) => LIGNES.filter((l) => l.includes(p)));

/** Le nombre de voisins de chaque point. Les quatre milieux du carré du
 *  milieu en ont quatre, les corners du plateau n'en ont que deux, et
 *  cette différence décide de la plupart des fins de partie. */
const DEGRE: readonly number[] = Array.from({ length: 24 }, (_, p) => voisins(p).length);

// ─── Lire une position ──────────────────────────────────────────────

interface Ouvert { vide: number; a: number; b: number }
interface Alignements { fermes: number; ouverts: Ouvert[] }

/** Un seul passage sur les seize alignements donne les moulins déjà
 *  fermés et ceux auxquels il ne manque qu'un pion, avec le point vide
 *  à remplir et les deux pions qui tiennent déjà la ligne. */
function alignements(points: readonly Case[], camp: Camp): Alignements {
  let fermes = 0;
  const ouverts: Ouvert[] = [];
  for (const l of LIGNES) {
    let miens = 0; let vides = 0; let vide = -1;
    for (const q of l) {
      const c = points[q];
      if (c === camp) miens++;
      else if (c === 0) { vides++; vide = q; }
    }
    if (miens === 3) { fermes++; continue; }
    if (miens === 2 && vides === 1) {
      const [x, y, z] = l;
      ouverts.push({ vide, a: x === vide ? y : x, b: z === vide ? y : z });
    }
  }
  return { fermes, ouverts };
}

/**
 * La double fourche : deux moulins ouverts qui partagent un pion et dont
 * les trous sont ailleurs. L'adversaire n'a qu'un coup à jouer, il ne
 * peut donc en boucher qu'un, et le pion partagé ferme l'autre au tour
 * suivant. Deux moulins ouverts qui attendent le MÊME point ne valent
 * rien : un seul bouchon les tue tous les deux.
 */
function fourches(ouverts: readonly Ouvert[]): number {
  let n = 0;
  for (let i = 0; i < ouverts.length; i++) {
    for (let j = i + 1; j < ouverts.length; j++) {
      const u = ouverts[i]; const v = ouverts[j];
      if (u.vide === v.vide) continue;
      if (u.a === v.a || u.a === v.b || u.b === v.a || u.b === v.b) n++;
    }
  }
  return n;
}

interface Souffle { sorties: number; bloques: number; carrefours: number }

/** Ce qu'un camp peut encore faire, compté en un passage : le nombre de
 *  glissements offerts, le nombre de pions qui ne peuvent plus bouger du
 *  tout, et la qualité des points tenus (`DEGRE - 3` vaut +1 sur un
 *  carrefour à quatre voies et -1 dans un coin). */
function souffle(points: readonly Case[], camp: Camp): Souffle {
  let sorties = 0; let bloques = 0; let carrefours = 0;
  for (let i = 0; i < 24; i++) {
    if (points[i] !== camp) continue;
    carrefours += DEGRE[i] - 3;
    let libres = 0;
    for (const v of voisins(i)) if (points[v] === 0) libres++;
    sorties += libres;
    if (libres === 0) bloques++;
  }
  return { sorties, bloques, carrefours };
}

// ─── Les trois phases ───────────────────────────────────────────────
// Une mérelle ne se joue pas de la même façon selon le moment. Pendant
// la pose, personne ne bouge encore et le plateau se remplit, donc la
// mobilité ne veut rien dire et les carrefours valent cher. En
// déplacement, un pion coûte plus cher puisque plus personne n'en a en
// réserve, et un camp qu'on étouffe perd sans qu'on lui prenne rien. À
// trois pions, tout se ramène au compte des pions.

type Phase = 'pose' | 'deplacement' | 'vol';

function phasePartie(e: Etat): Phase {
  if (e.aPoser[0] > 0 || e.aPoser[1] > 0) return 'pose';
  if (e.vol && (compte(e.points, 1) === 3 || compte(e.points, 2) === 3)) return 'vol';
  return 'deplacement';
}

interface Poids {
  pion: number; moulin: number; ouvert: number; fourche: number;
  bloque: number; carrefour: number; mobilite: number; etouffe: number;
}

const POIDS: Record<Phase, Poids> = {
  pose: {
    pion: 30, moulin: 24, ouvert: 12, fourche: 26,
    bloque: 5, carrefour: 7, mobilite: 0, etouffe: 0,
  },
  deplacement: {
    pion: 42, moulin: 32, ouvert: 16, fourche: 34,
    bloque: 11, carrefour: 4, mobilite: 2, etouffe: 40,
  },
  vol: {
    pion: 70, moulin: 22, ouvert: 20, fourche: 22,
    bloque: 0, carrefour: 0, mobilite: 0, etouffe: 0,
  },
};

/**
 * La note de la position, en centièmes, DU POINT DE VUE DU CAMP QUI A LE
 * TRAIT. C'est la convention du moteur, et c'est le seul endroit du
 * fichier où une erreur de signe ne se voit pas tout de suite.
 */
function noter(e: Etat, vol: boolean): number {
  const camp = e.tour;
  const adverse = autreCamp(camp);
  if (e.gagnant) return e.gagnant === camp ? VICTOIRE : -VICTOIRE;

  const p = POIDS[phasePartie(e)];
  const mien = alignements(e.points, camp);
  const sien = alignements(e.points, adverse);
  const moi = souffle(e.points, camp);
  const lui = souffle(e.points, adverse);

  const mesPions = compte(e.points, camp);
  const sesPions = compte(e.points, adverse);
  const pions = (mesPions + e.aPoser[camp - 1]) - (sesPions + e.aPoser[adverse - 1]);

  let note = pions * p.pion
    + (mien.fermes - sien.fermes) * p.moulin
    + (mien.ouverts.length - sien.ouverts.length) * p.ouvert
    + (fourches(mien.ouverts) - fourches(sien.ouverts)) * p.fourche
    + (lui.bloques - moi.bloques) * p.bloque
    + (moi.carrefours - lui.carrefours) * p.carrefour
    + (moi.sorties - lui.sorties) * p.mobilite;

  // Un camp qui n'a plus que deux sorties est à un coup de perdre par
  // étouffement. La note doit le dire avant qu'il ne soit trop tard,
  // parce qu'aucun compte de pions ne l'annonce.
  if (p.etouffe > 0) {
    if (lui.sorties <= 2) note += p.etouffe * (3 - lui.sorties);
    if (moi.sorties <= 2) note -= p.etouffe * (3 - moi.sorties);
  }

  // Tomber sous cinq pions est dangereux, et davantage encore quand la
  // variante du vol est coupée : le camp se retrouve alors enfermé bien
  // avant d'en perdre un de plus.
  if (p !== POIDS.pose) {
    const peur = vol ? 12 : 30;
    const fragile = (n: number): number => (n <= 4 ? (5 - n) * peur : 0);
    note += fragile(sesPions) - fragile(mesPions);
  }
  return note;
}

// ─── Ce qu'un coup fait, sans avoir à le jouer ──────────────────────

/** Le camp aurait-il un alignement complet en occupant `vers`, sachant
 *  qu'il vient de vider `de` ? Passer `-1` pour `de` quand rien ne part,
 *  c'est-à-dire pour une pose ou pour tester la menace d'en face. */
function ferme(points: readonly Case[], camp: Camp, vers: number, de: number): boolean {
  for (const l of LIGNES_PAR_POINT[vers]) {
    let complet = true;
    for (const q of l) {
      if (q === vers) continue;
      if (q === de || points[q] !== camp) { complet = false; break; }
    }
    if (complet) return true;
  }
  return false;
}

function fermerait(e: Etat, c: Coup): boolean {
  if (c.type === 'retrait') return false;
  return ferme(e.points, e.tour, c.vers, c.type === 'deplacement' ? c.de : -1);
}

/**
 * L'ordre a priori des coups, avant toute recherche. Plus le nombre est
 * grand, plus le coup est essayé tôt, et plus l'élagage coupe de
 * branches. Fermer un moulin passe devant tout, boucher celui d'en face
 * vient ensuite, et un carrefour vaut mieux qu'un coin.
 */
function promesseCoup(e: Etat, c: Coup): number {
  const adverse = autreCamp(e.tour);
  if (c.type === 'retrait') {
    // Retirer d'abord le pion qui sert le plus à l'adversaire, c'est-à-dire
    // celui qui soutient un moulin sur le point de se fermer.
    let p = 4 + DEGRE[c.p];
    for (const l of LIGNES_PAR_POINT[c.p]) {
      let siens = 0; let vides = 0;
      for (const q of l) {
        if (e.points[q] === adverse) siens++;
        else if (e.points[q] === 0) vides++;
      }
      if (siens === 2 && vides === 1) p += 6;
    }
    return p;
  }
  let p = DEGRE[c.vers];
  if (ferme(e.points, e.tour, c.vers, c.type === 'deplacement' ? c.de : -1)) p += 40;
  if (ferme(e.points, adverse, c.vers, -1)) p += 20;
  return p;
}

// ─── Le contrat du moteur ───────────────────────────────────────────

/**
 * L'adaptateur de la mérelle. `vol` dit si la variante du saut à trois
 * pions est en vigueur : elle change ce que vaut une fin de partie
 * serrée. Les deux points d'entrée plus bas le lisent dans l'état
 * courant, de sorte que la table et l'adaptateur ne peuvent pas se
 * contredire.
 */
export function adaptateurMerelle(vol = true): Adaptateur<EtatMerelle, Coup> {
  return {
    coups: coupsArbitre,
    jouer: jouerArbitre,
    fini: (e) => {
      if (e.nulle) return 0;
      const g = e.jeu.gagnant;
      if (g === null) return null;
      // `logic.ts` passe la main avant de trancher, donc le camp au trait
      // est le perdant. Le test reste écrit dans les deux sens : le jour
      // où la règle change, le signe suit tout seul.
      return g === e.jeu.tour ? 1 : -1;
    },
    evaluer: (e) => noter(e.jeu, vol),
    // ponytail: la clé porte le compteur des cinquante mais pas le
    // décompte des répétitions, sinon la table de transposition ne
    // servirait plus à rien. Deux positions identiques dont l'une est
    // plus près de la triple répétition se confondent donc parfois.
    // Le jour où cela se voit au banc d'essai, la marche suivante est
    // d'ajouter le décompte de la position courante à la clé.
    cle: (e) => `${clePosition(e)}|${e.sansPrise}`,
    nomCoup: coupEnTexte,
    // Un coup bruyant change la matière. Le retrait en est un, et le coup
    // qui ferme un moulin l'annonce puisque le retrait suit tout de suite.
    bruyant: (e, c) => c.type === 'retrait' || fermerait(e.jeu, c),
    promesse: (e, c) => promesseCoup(e.jeu, c),
  };
}

/** Le coup que la machine joue à ce niveau, de la première marche à la
 *  dixième. C'est le point d'entrée du mode en ligne et du banc d'essai. */
export function choisirCoupNiveau(
  e: EtatMerelle, niveau: Niveau, options: ChoixOptions = {},
): Coup | null {
  if (verdictArbitre(e).finie) return null;
  return choisirAuNiveau(adaptateurMerelle(e.jeu.vol), e, niveau, options);
}

// ─── L'ancienne porte, toujours ouverte ─────────────────────────────

export type Difficulte = 'facile' | 'moyen' | 'difficile';

/** Les trois anciennes têtes, placées sur l'échelle des dix marches. La
 *  page de jeu appelle encore `choisirCoup` et n'a rien à changer. */
export const NIVEAU_PAR_DIFFICULTE: Record<Difficulte, Niveau> = {
  facile: 2,
  moyen: 5,
  difficile: 8,
};

/**
 * Le coup que l'ordinateur joue maintenant. Rend `null` quand il n'y a
 * plus rien à jouer.
 *
 * L'appelant historique ne porte que la règle du jeu, sans les compteurs
 * de l'arbitre : la partie repart donc d'un compteur neuf à chaque coup.
 * La machine joue aussi bien, elle ignore seulement la nulle qui
 * approche. Une partie qui doit voir venir la nulle passe par
 * `choisirCoupNiveau` et garde ses compteurs d'un coup à l'autre.
 */
export function choisirCoup(e: Etat, niveau: Difficulte): Coup | null {
  if (e.gagnant) return null;
  return choisirCoupNiveau(depuisJeu(e), NIVEAU_PAR_DIFFICULTE[niveau]);
}

/** Le coup ferme-t-il un moulin sur-le-champ ? Gardé pour la page de
 *  jeu et les essais, qui s'en servent pour commenter le coup joué. */
export function fermeUnMoulin(e: Etat, coup: Coup): boolean {
  const apres = jouer(e, coup);
  return apres.doitRetirer && apres.tour === e.tour;
}
