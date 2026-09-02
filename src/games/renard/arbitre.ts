// ─── Le Renard et les Oies : l'arbitre de la basse-cour ─────────────
// Alex, 2026-09-01 : « les oies se cachent dans un coin, n'essaient
// même plus de gagner et bloquent la partie pour ne pas perdre. » Le
// règlement du jeu ne dit rien contre ça, parce qu'une planche de bois
// n'a jamais eu à trancher un litige. L'arbitre le dit à sa place.
//
// Rien ici ne touche à `logic.ts`, qui reste la seule autorité sur ce
// qui est un coup légal. Les parties en ligne rejouent leur liste de
// coups avec exactement les mêmes fonctions qu'avant, et l'arbitre
// empile ses compteurs par-dessus.
//
// La règle de la basse-cour tient en trois phrases. L'avance du
// troupeau vaut la somme de 6 moins la rangée sur toutes les oies, et
// elle monte quand les oies montent vers la tanière. Un coup d'oie qui
// ne bat pas le record d'avance de la partie fait avancer un compteur,
// qu'une prise du renard ou un record battu remet à zéro. Au douzième
// coup d'oie sans progrès, la traînarde quitte le plateau, et comme le
// renard l'emporte dès qu'il ne reste que cinq oies, une bande qui
// campe finit mangée en une dizaine de coups.
//
// Deux fermetures complètent le tableau : la même position revenue
// trois fois rend la partie nulle, et un plafond dur de quatre cents
// demi-coups la rend nulle aussi.
//
// TOUT est pur et déterministe. Deux joueurs qui rejouent la même liste
// de coups chacun de son côté tombent sur le même état et sur le même
// verdict, sans horloge, sans hasard et sans `Math.random`.

import {
  COTE, PAS, POINTS, jouer, nbOies, plateauInitial, pointDe, positionRenard, reglement,
  type Camp, type Coup, type Occupant, type Plateau, type Variante,
} from './logic';

/** Douze coups d'oies sans progrès, et la traînarde y passe. */
export const SEUIL_BASSE_COUR = 12;

/** La même position revenue ce nombre de fois rend la partie nulle. */
export const LIMITE_REPETITION = 3;

/** Le plafond dur, en demi-coups. Au-delà, plus personne ne gagne. */
export const PLAFOND_DEMI_COUPS = 400;

export type VerdictArbitre = 'renard' | 'oies' | 'nulle';

/** Ce que l'arbitre vient de faire, quand il a eu à faire quelque chose. */
export type EvenementArbitre = 'oie-punie' | 'nulle-repetition' | 'nulle-plafond';

export interface EtatRenard {
  readonly plateau: Plateau;
  /** Le camp qui doit jouer. Les oies ouvrent la partie. */
  readonly tour: Camp;
  readonly variante: Variante;
  /** Les coups d'oies enchaînés sans que le record d'avance soit battu. */
  readonly sansProgres: number;
  /** La plus forte avance que le troupeau ait atteinte depuis le début. */
  readonly avanceRecord: number;
  /** Les oies que la règle de la basse-cour a retirées jusqu'ici. */
  readonly punies: number;
  /** Le registre des positions déjà vues, pour la répétition triple. */
  readonly vues: Readonly<Record<string, number>>;
  /** Le verdict, une fois qu'il est tombé. */
  readonly verdict: VerdictArbitre | null;
  /**
   * Les demi-coups joués. Le plafond des quatre cents en a besoin, et
   * il ne se déduit pas du registre des positions, que les prises
   * vident. Il n'entre dans la clé de transposition qu'à l'approche du
   * plafond, là où il change vraiment la valeur d'une position : loin
   * de lui, deux positions identiques au même compteur de basse-cour
   * valent la même chose, même arrivées par des chemins de longueurs
   * différentes.
   */
  readonly demiCoups: number;
}

// ─── Les mesures du troupeau ────────────────────────────────────────

/** L'avance du troupeau : plus les oies sont hautes, plus elle est forte. */
export function avanceDuTroupeau(p: Plateau): number {
  let total = 0;
  for (let i = 0; i < p.length; i++) if (p[i] === 'oie') total += 6 - POINTS[i].r;
  return total;
}

/** Un texte qui identifie la position, le trait compris. */
export function clePosition(p: Plateau, tour: Camp): string {
  let s = '';
  for (const occ of p) s += occ === null ? '.' : occ === 'oie' ? 'o' : 'R';
  return `${s}|${tour === 'renard' ? 'R' : 'O'}`;
}

/**
 * La traînarde : l'oie de la rangée la plus grande, et le plus grand
 * numéro de point pour départager. `POINTS` étant numéroté de haut en
 * bas puis de gauche à droite, c'est simplement la dernière oie de la
 * liste. Le contrôle de `logic.test.ts` tient cet ordre pour acquis.
 */
export const trainarde = (p: Plateau): number => p.lastIndexOf('oie');

/**
 * Le camp a-t-il au moins un coup ? La question se pose à chaque nœud
 * de la recherche, et bâtir la liste complète des coups pour découvrir
 * qu'elle n'est pas vide coûtait la moitié de la vitesse.
 */
export function aUnCoup(p: Plateau, camp: Camp, v: Variante): boolean {
  if (camp === 'renard') {
    const ou = positionRenard(p);
    if (ou < 0) return false;
    const { r, c } = POINTS[ou];
    for (const { dr, dc } of PAS) {
      const survole = pointDe(r + dr, c + dc);
      if (survole < 0) continue;
      if (p[survole] === null) return true;
      const arrivee = pointDe(r + dr * 2, c + dc * 2);
      if (p[survole] === 'oie' && arrivee >= 0 && p[arrivee] === null) return true;
    }
    return false;
  }
  const recul = reglement(v).reculAutorise;
  for (let i = 0; i < p.length; i++) {
    if (p[i] !== 'oie') continue;
    const { r, c } = POINTS[i];
    for (const { dr, dc } of PAS) {
      if (!recul && dr > 0) continue;
      const voisin = pointDe(r + dr, c + dc);
      if (voisin >= 0 && p[voisin] === null) return true;
    }
  }
  return false;
}

/** Le verdict du seul règlement du jeu, sans les fermetures de l'arbitre. */
function verdictDeBase(p: Plateau, tour: Camp, v: Variante): VerdictArbitre | null {
  if (nbOies(p) <= reglement(v).seuilRenard) return 'renard';
  if (!aUnCoup(p, tour, v)) return tour === 'renard' ? 'oies' : 'renard';
  return null;
}

// ─── La mise en place ───────────────────────────────────────────────

/** Un état bâti sur une position posée à la main, compteurs à neuf. */
export function etatDepuis(plateau: Plateau, tour: Camp, variante: Variante): EtatRenard {
  return {
    plateau,
    tour,
    variante,
    sansProgres: 0,
    avanceRecord: avanceDuTroupeau(plateau),
    punies: 0,
    vues: { [clePosition(plateau, tour)]: 1 },
    verdict: verdictDeBase(plateau, tour, variante),
    demiCoups: 0,
  };
}

/** La position de départ de la variante, prête à être jouée. */
export const etatInitial = (variante: Variante): EtatRenard =>
  etatDepuis(plateauInitial(variante), 'oies', variante);

// ─── Le coup ────────────────────────────────────────────────────────

export interface CoupArbitre {
  etat: EtatRenard;
  evenement: EvenementArbitre | null;
}

/**
 * Le coup joué et la basse-cour appliquée, mais le registre des
 * positions laissé tel quel.
 *
 * C'est la porte de la recherche. Un negamax ouvre des centaines de
 * milliers de nœuds, et recopier le registre à chacun d'eux coûterait
 * plus cher que tout le reste. L'objet `vues` est partagé et jamais
 * modifié en place, ce qui reste sans danger tant que l'arbre ne fait
 * que le lire, et la recherche s'en sert quand même pour reconnaître
 * une position déjà jouée deux fois. Elle ne voit donc pas les
 * répétitions qu'elle fabrique elle-même à l'intérieur de son arbre :
 * celles-là sont comptées par `jouerArbitre`, sur le vrai plateau.
 */
export function jouerRecherche(e: EtatRenard, c: Coup): CoupArbitre {
  if (e.verdict !== null) return { etat: e, evenement: null };

  const joueur = e.tour;
  let plateau = jouer(e.plateau, c);
  let sansProgres = e.sansProgres;
  let avanceRecord = e.avanceRecord;
  let punies = e.punies;
  let evenement: EvenementArbitre | null = null;

  if (joueur === 'renard') {
    // Une oie croquée est un progrès de la partie, même si ce n'est pas
    // celui des oies : le compteur repart.
    if (c.prises.length > 0) sansProgres = 0;
  } else {
    const avance = avanceDuTroupeau(plateau);
    if (avance > avanceRecord) {
      avanceRecord = avance;
      sansProgres = 0;
    } else if (++sansProgres >= SEUIL_BASSE_COUR) {
      const perdue = trainarde(plateau);
      if (perdue >= 0) {
        const suite: Occupant[] = [...plateau];
        suite[perdue] = null;
        plateau = suite;
        punies += 1;
        evenement = 'oie-punie';
      }
      sansProgres = 0;
    }
  }

  const tour: Camp = joueur === 'renard' ? 'oies' : 'renard';
  const demiCoups = e.demiCoups + 1;
  let verdict = verdictDeBase(plateau, tour, e.variante);
  if (verdict === null) {
    // La recherche ne tient pas son propre registre, mais elle LIT celui
    // de la vraie partie. Revenir une troisième fois sur une position
    // déjà jouée deux fois clôt la partie, et un camp qui gagne doit
    // pouvoir refuser de s'y engager. Sans cette lecture, deux machines
    // qui se valent tournent en rond et l'arbitre annule une partie que
    // l'une des deux tenait.
    if ((e.vues[clePosition(plateau, tour)] ?? 0) >= LIMITE_REPETITION - 1) {
      verdict = 'nulle';
      evenement = 'nulle-repetition';
    } else if (demiCoups >= PLAFOND_DEMI_COUPS) {
      verdict = 'nulle';
      evenement = 'nulle-plafond';
    }
  }

  return {
    etat: { ...e, plateau, tour, sansProgres, avanceRecord, punies, verdict, demiCoups },
    evenement,
  };
}

/**
 * Le coup de la vraie partie : tout ce que fait `jouerRecherche`, plus
 * le registre des positions et la nulle par répétition triple.
 *
 * Une prise ou une punition vide le registre. Le nombre d'oies vient de
 * changer, donc aucune position d'avant ne peut revenir, et la carte
 * reste petite du début à la fin de la partie.
 */
export function jouerArbitre(e: EtatRenard, c: Coup): CoupArbitre {
  const { etat, evenement } = jouerRecherche(e, c);
  if (etat === e) return { etat, evenement };

  const irreversible = c.prises.length > 0 || evenement === 'oie-punie';
  const cle = clePosition(etat.plateau, etat.tour);
  const compte = irreversible ? 1 : (etat.vues[cle] ?? 0) + 1;
  const vues = irreversible ? { [cle]: 1 } : { ...etat.vues, [cle]: compte };

  if (etat.verdict === null && compte >= LIMITE_REPETITION) {
    return {
      etat: { ...etat, vues, verdict: 'nulle' },
      evenement: 'nulle-repetition',
    };
  }
  return { etat: { ...etat, vues }, evenement };
}

/** Qui a gagné, ou personne tant que la partie dure. */
export const verdictArbitre = (e: EtatRenard): VerdictArbitre | null => e.verdict;

// ─── Ce qui s'affiche ───────────────────────────────────────────────
// Même patron que les pages voisines : un dictionnaire par langue, et
// une fonction qui choisit.

const FR: Record<EvenementArbitre, string> = {
  'oie-punie': 'La traînarde s’est fait croquer.',
  'nulle-repetition': 'La même position pour la troisième fois. La partie est nulle.',
  'nulle-plafond': 'Quatre cents demi-coups sans vainqueur. La partie est nulle.',
};

const EN: Record<EvenementArbitre, string> = {
  'oie-punie': 'The straggler was snapped up.',
  'nulle-repetition': 'The same position for the third time. The game is a draw.',
  'nulle-plafond': 'Four hundred half-moves without a winner. The game is a draw.',
};

export const TEXTES_EVENEMENT = { FR, EN };

export const texteEvenement = (e: EvenementArbitre, fr: boolean): string =>
  (fr ? FR : EN)[e];

// ─── Les mesures dont l'évaluation se sert ──────────────────────────
// Elles vivent ici parce qu'elles décrivent la position, pas le goût de
// la machine. `cpu.ts` leur donne un poids, et le banc d'essai les lit
// telles quelles pour expliquer une partie.

/**
 * Les trous derrière la ligne d'oies. Dans chaque colonne de la croix,
 * on cherche l'oie la plus haute et on compte le vide sous elle. Un
 * trou est un couloir par lequel le renard passe dans le dos du
 * troupeau, et une fois derrière il mange à loisir.
 */
export function trousDansLaLigne(p: Plateau): number {
  let total = 0;
  for (let c = 0; c < COTE; c++) {
    let front = -1;
    for (let r = 0; r < COTE && front < 0; r++) {
      const i = pointDe(r, c);
      if (i >= 0 && p[i] === 'oie') front = r;
    }
    if (front < 0) continue;
    for (let r = front + 1; r < COTE; r++) {
      const i = pointDe(r, c);
      if (i >= 0 && p[i] === null) total++;
    }
  }
  return total;
}

/**
 * Les oies qui se tiennent la main, comptées une fois par paire. Un
 * troupeau soudé ne se laisse pas enjamber, parce que le point
 * d'atterrissage derrière chaque oie sautable porte déjà une voisine.
 */
export function cohesionDuTroupeau(p: Plateau): number {
  let paires = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] !== 'oie') continue;
    const { r, c } = POINTS[i];
    const bas = pointDe(r + 1, c);
    const droite = pointDe(r, c + 1);
    if (bas >= 0 && p[bas] === 'oie') paires++;
    if (droite >= 0 && p[droite] === 'oie') paires++;
  }
  return paires;
}

/**
 * Les points libres que le renard atteint en marchant, sans sauter.
 * C'est sa vraie cage. Quatre voisins libres ne veulent rien dire quand
 * les quatre mènent au fond du même bras.
 */
export function libertesDuRenard(p: Plateau): number {
  const depart = positionRenard(p);
  if (depart < 0) return 0;
  const vus = new Uint8Array(p.length);
  const pile = [depart];
  vus[depart] = 1;
  let atteints = 0;
  while (pile.length > 0) {
    const ici = pile.pop() as number;
    const { r, c } = POINTS[ici];
    for (const { dr, dc } of PAS) {
      const voisin = pointDe(r + dr, c + dc);
      if (voisin < 0 || vus[voisin] === 1 || p[voisin] !== null) continue;
      vus[voisin] = 1;
      atteints++;
      pile.push(voisin);
    }
  }
  return atteints;
}

/**
 * De combien de pas le renard s'est engagé dans un bras de la croix. Le
 * carré du milieu est large et il s'y défend tout seul; le fond d'un
 * bras se ferme avec trois oies.
 */
export function profondeurDansUnBras(p: Plateau): number {
  const ou = positionRenard(p);
  if (ou < 0) return 0;
  const { r, c } = POINTS[ou];
  const hors = (x: number): number => (x < 2 ? 2 - x : x > 4 ? x - 4 : 0);
  return hors(r) + hors(c);
}

/**
 * Les oies que le renard croque sur-le-champ, en un seul saut. Les
 * enchaînements ne sont pas comptés ici : la recherche les voit d'elle
 * même dès deux demi-coups, et les dérouler à chaque feuille coûterait
 * la moitié de sa vitesse.
 */
export function menacesDuRenard(p: Plateau): number {
  const ou = positionRenard(p);
  if (ou < 0) return 0;
  const { r, c } = POINTS[ou];
  let n = 0;
  for (const { dr, dc } of PAS) {
    const survole = pointDe(r + dr, c + dc);
    const arrivee = pointDe(r + dr * 2, c + dc * 2);
    if (survole >= 0 && arrivee >= 0 && p[survole] === 'oie' && p[arrivee] === null) n++;
  }
  return n;
}
