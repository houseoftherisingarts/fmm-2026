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
// même joueur retire un pion. La recherche doit donc continuer du même
// côté, et c'est là qu'il a fallu s'écarter d'un cheveu de la commande.
// Le negamax de `recherche.ts` retourne le signe à CHAQUE demi-coup,
// sans condition. Donner le retrait comme un demi-coup à part fait donc
// lire la branche du moulin à l'envers, et la machine se met à fuir les
// moulins : mesuré avant la correction, fermer 0-1-2 valait 14 quand un
// simple pion au centre en valait 26, et l'écart se creusait avec la
// profondeur.
//
// Le moulin et son retrait ne font donc qu'un seul coup pour le moteur
// (`CoupMerelle`), ce qui rend l'alternance stricte et laisse quand même
// la recherche choisir le pion à retirer, branche par branche. Le point
// d'entrée public, lui, rend toujours un `Coup` de `logic.ts` : la page
// de jeu joue le moulin, l'état demande un retrait, elle rappelle la
// machine, et rien ne change pour elle.

import {
  LIGNES, autreCamp, compte, coupsLegaux, jouer, retraitsPossibles, voisins,
  coupEnTexte, type Camp, type Case, type Coup, type Etat,
} from './logic';
import {
  clePosition, depuisJeu, jouerArbitre, verdictArbitre,
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

interface Souffle { pions: number; sorties: number; bloques: number; carrefours: number }

/** Ce qu'un camp peut encore faire, compté en un seul passage sur les
 *  vingt-quatre points : combien de pions il tient, combien de
 *  glissements ils offrent, combien d'entre eux ne peuvent plus bouger du
 *  tout, et la qualité des points occupés (`DEGRE - 3` vaut +1 sur un
 *  carrefour à quatre voies et -1 dans un coin). Un seul balayage, parce
 *  que la recherche appelle cette fonction deux fois par nœud et qu'elle
 *  visite des dizaines de milliers de nœuds par coup. */
function souffle(points: readonly Case[], camp: Camp): Souffle {
  let pions = 0; let sorties = 0; let bloques = 0; let carrefours = 0;
  for (let i = 0; i < 24; i++) {
    if (points[i] !== camp) continue;
    pions++;
    carrefours += DEGRE[i] - 3;
    let libres = 0;
    for (const v of voisins(i)) if (points[v] === 0) libres++;
    sorties += libres;
    if (libres === 0) bloques++;
  }
  return { pions, sorties, bloques, carrefours };
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

// L'unité est le centième de point, et un PION VAUT CENT. Ce n'est pas
// une coquetterie : `niveaux.ts` règle la faiblesse des petites marches
// sur une fenêtre exprimée dans cette unité, et le sergent tolère cent
// centièmes d'écart au meilleur coup. Avec un pion noté quarante, il
// jetait deux pions par distraction et le capitaine ne battait plus le
// palefrenier. Mesuré : niveau 8 contre niveau 3, cinquante pour cent de
// victoires avant le recalibrage.
const POIDS: Record<Phase, Poids> = {
  pose: {
    pion: 90, moulin: 60, ouvert: 30, fourche: 70,
    bloque: 12, carrefour: 18, mobilite: 0, etouffe: 0,
  },
  deplacement: {
    pion: 100, moulin: 76, ouvert: 38, fourche: 80,
    bloque: 26, carrefour: 10, mobilite: 4, etouffe: 90,
  },
  vol: {
    pion: 160, moulin: 50, ouvert: 46, fourche: 50,
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

  const phase = phasePartie(e);
  const p = POIDS[phase];
  const mien = alignements(e.points, camp);
  const sien = alignements(e.points, adverse);
  const moi = souffle(e.points, camp);
  const lui = souffle(e.points, adverse);

  const mesPions = moi.pions;
  const sesPions = lui.pions;
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
  if (phase !== 'pose') {
    const peur = vol ? 28 : 70;
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
/** Retirer d'abord le pion qui sert le plus à l'adversaire, c'est-à-dire
 *  celui qui soutient un moulin sur le point de se fermer. */
function promesseRetrait(e: Etat, victime: number): number {
  const adverse = autreCamp(e.tour);
  let p = 4 + DEGRE[victime];
  for (const l of LIGNES_PAR_POINT[victime]) {
    let siens = 0; let vides = 0;
    for (const q of l) {
      if (e.points[q] === adverse) siens++;
      else if (e.points[q] === 0) vides++;
    }
    if (siens === 2 && vides === 1) p += 6;
  }
  return p;
}

function promesseCoup(e: Etat, c: Coup): number {
  const adverse = autreCamp(e.tour);
  if (c.type === 'retrait') return promesseRetrait(e, c.p);
  let p = DEGRE[c.vers];
  if (ferme(e.points, e.tour, c.vers, c.type === 'deplacement' ? c.de : -1)) p += 40;
  if (ferme(e.points, adverse, c.vers, -1)) p += 20;
  return p;
}

// ─── Le contrat du moteur ───────────────────────────────────────────

/**
 * Le coup tel que le moteur le voit. Un moulin qui se ferme emporte son
 * retrait dans le même paquet, sinon le negamax retournerait le signe au
 * milieu du coup et la machine passerait son temps à éviter de fermer
 * ses moulins. La recherche choisit quand même le pion à retirer :
 * chaque victime possible ouvre sa propre branche.
 */
export type CoupMerelle = Coup | { type: 'moulin'; coup: Coup; retrait: number };

/** Le coup rendu au monde extérieur : le moulin se joue d'abord, et le
 *  retrait se demandera au tour suivant, quand l'état l'annoncera. */
export const coupSimple = (c: CoupMerelle): Coup => (c.type === 'moulin' ? c.coup : c);

function coupsMoteur(e: EtatMerelle): CoupMerelle[] {
  if (e.nulle) return [];
  const base = coupsLegaux(e.jeu);
  // Un état qui doit un retrait n'arrive qu'à la racine, quand la page de
  // jeu rappelle la machine après le moulin qu'elle vient de fermer.
  if (e.jeu.doitRetirer) return base;

  // Les pions retirables ne dépendent que du camp d'en face, et un coup
  // ne déplace que les miens : la liste vaut donc avant comme après, et
  // ne se dresse que si un moulin peut vraiment se fermer.
  let victimes: number[] | null = null;
  const sortie: CoupMerelle[] = [];
  for (const c of base) {
    if (!fermerait(e.jeu, c)) { sortie.push(c); continue; }
    if (victimes === null) victimes = retraitsPossibles(e.jeu);
    if (victimes.length === 0) { sortie.push(c); continue; }
    for (const p of victimes) sortie.push({ type: 'moulin', coup: c, retrait: p });
  }
  return sortie;
}

function jouerMoteur(e: EtatMerelle, c: CoupMerelle): EtatMerelle {
  if (c.type !== 'moulin') return jouerArbitre(e, c);
  const apres = jouerArbitre(e, c.coup);
  // Le moulin peut se fermer sans rien donner à prendre quand tous les
  // pions d'en face tiennent un alignement, et la règle passe alors la
  // main toute seule. Le retrait n'a plus lieu d'être.
  if (!apres.jeu.doitRetirer) return apres;
  return jouerArbitre(apres, { type: 'retrait', p: c.retrait });
}

/**
 * L'adaptateur de la mérelle. `vol` dit si la variante du saut à trois
 * pions est en vigueur, ce qui change ce que vaut une fin de partie
 * serrée. Les deux points d'entrée plus bas le lisent dans l'état
 * courant, de sorte que la table et l'adaptateur ne peuvent pas se
 * contredire.
 */
export function adaptateurMerelle(vol = true): Adaptateur<EtatMerelle, CoupMerelle> {
  return {
    coups: coupsMoteur,
    jouer: jouerMoteur,
    fini: (e) => {
      if (e.nulle) return 0;
      const g = e.jeu.gagnant;
      if (g === null) return null;
      // `logic.ts` passe la main avant de trancher, donc le camp au trait
      // est le perdant. Le test reste écrit dans les deux sens : le jour
      // où la règle change, le signe suivra tout seul.
      return g === e.jeu.tour ? 1 : -1;
    },
    evaluer: (e) => noter(e.jeu, vol),
    // ponytail: la clé porte le compteur des cinquante mais pas le
    // décompte des répétitions, sinon la table de transposition ne
    // servirait plus à grand-chose. Deux positions identiques dont l'une
    // est plus près de la triple répétition se confondent donc parfois.
    // Le jour où cela se voit au banc d'essai, la marche suivante est
    // d'ajouter le décompte de la position courante à la clé.
    cle: (e) => `${clePosition(e)}|${e.sansPrise}`,
    // Le tri du moteur redemande ce nom à chaque comparaison, donc il se
    // construit sans allouer de coup jetable au passage.
    nomCoup: (c) => (c.type === 'moulin' ? `${coupEnTexte(c.coup)}r${c.retrait}` : coupEnTexte(c)),
    // Un coup bruyant change la matière, et la quiescence ne suit que
    // ceux-là. Le moulin et le retrait en sont, rien d'autre.
    bruyant: (_e, c) => c.type === 'moulin' || c.type === 'retrait',
    promesse: (e, c) => (c.type === 'moulin'
      ? promesseCoup(e.jeu, c.coup) + promesseRetrait(e.jeu, c.retrait)
      : promesseCoup(e.jeu, c)),
  };
}

/** Le coup que la machine joue à ce niveau, de la première marche à la
 *  dixième. C'est le point d'entrée du mode en ligne et du banc d'essai. */
export function choisirCoupNiveau(
  e: EtatMerelle, niveau: Niveau, options: ChoixOptions = {},
): Coup | null {
  if (verdictArbitre(e).finie) return null;
  const c = choisirAuNiveau(adaptateurMerelle(e.jeu.vol), e, niveau, options);
  return c === null ? null : coupSimple(c);
}

// ─── L'ancienne porte, toujours ouverte ─────────────────────────────

export type Difficulte = 'facile' | 'moyen' | 'difficile';

/**
 * Les trois anciennes têtes, placées sur l'échelle des dix marches. La
 * page de jeu appelle encore `choisirCoup` et n'a rien à changer.
 *
 * « Difficile » saute directement au connétable, et ce n'est pas de la
 * gourmandise. Toutes les marches intermédiaires piochent au hasard dans
 * une fenêtre autour du meilleur coup, or le moteur commun rétrécit sa
 * fenêtre alpha coup après coup à la racine : un coup qui n'est pas le
 * meilleur rend une borne collée au meilleur au lieu de sa vraie note,
 * et tous se ressemblent. Mesuré sur quarante-neuf positions d'une vraie
 * partie : au niveau 9, dont la fenêtre ne vaut pourtant que huit
 * centièmes, 13,2 coups sur 16,2 tombent dedans. Le connétable est la
 * seule marche à fenêtre nulle, donc la seule que ce défaut n'atteint
 * pas. Le jour où `recherche.ts` renotera ses coups de racine en fenêtre
 * pleine, « difficile » pourra redescendre au capitaine.
 */
export const NIVEAU_PAR_DIFFICULTE: Record<Difficulte, Niveau> = {
  facile: 2,
  moyen: 5,
  difficile: 10,
};

/**
 * Le budget de réflexion de chaque tête, en nœuds. La page de jeu appelle
 * la machine sur le fil principal, et le connétable a droit à deux
 * secondes et demie d'horloge : sans plafond, l'écran se fige le temps
 * qu'il réfléchisse, ce qui se mesurait à 1,4 seconde au pire.
 *
 * Douze mille nœuds tiennent autour du sixième de seconde ici, et la
 * force ne bouge pas : à six mille nœuds déjà, le connétable gagne les
 * douze parties contre le palefrenier ET les douze contre le sergent. Le
 * plafond est donc le double de ce qui suffit.
 */
export const NOEUDS_PAR_DIFFICULTE: Record<Difficulte, number> = {
  facile: 2_000,
  moyen: 8_000,
  difficile: 12_000,
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
  return choisirCoupNiveau(depuisJeu(e), NIVEAU_PAR_DIFFICULTE[niveau], {
    noeudsMax: NOEUDS_PAR_DIFFICULTE[niveau],
  });
}

/** Le coup ferme-t-il un moulin sur-le-champ ? Gardé pour la page de
 *  jeu et les essais, qui s'en servent pour commenter le coup joué. */
export function fermeUnMoulin(e: Etat, coup: Coup): boolean {
  const apres = jouer(e, coup);
  return apres.doitRetirer && apres.tour === e.tour;
}
