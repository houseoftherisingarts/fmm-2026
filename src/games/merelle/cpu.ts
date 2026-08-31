// ─── L'adversaire de bois ───────────────────────────────────────────
// Alex, 2026-08-30 : trois têtes, de la plus distraite à la plus dure.
//
//   facile     un tirage au sort, à peine orienté : il voit le moulin
//              qu'il peut fermer, il rate tout le reste.
//   moyen      un glouton honnête : fermer son moulin d'abord, bloquer
//              celui d'en face ensuite, et sinon occuper un carrefour.
//   difficile  minimax avec élagage alpha-bêta. La profondeur descend
//              pendant la pose, où le plateau offre vingt-quatre coups.
//
// Le retrait est un coup comme un autre dans cette machine : quand un
// moulin se ferme, la main ne change pas, donc le nœud reste du même
// côté de l'arbre et la recherche s'occupe toute seule du choix du pion
// à retirer.

import {
  LIGNES, autreCamp, compte, coupsLegaux, deplacementsDe, jouer, moulins,
  type Camp, type Case, type Coup, type Etat,
} from './logic';

export type Difficulte = 'facile' | 'moyen' | 'difficile';

/** Alignements où le camp tient deux points sur trois, le troisième
 *  étant libre : autant de moulins à un coup de se fermer. */
function moulinsOuverts(points: readonly Case[], camp: Camp): number {
  let n = 0;
  for (const l of LIGNES) {
    let a = 0; let vide = 0;
    for (const q of l) {
      if (points[q] === camp) a++;
      else if (points[q] === 0) vide++;
    }
    if (a === 2 && vide === 1) n++;
  }
  return n;
}

/** L'évaluation, vue par `camp`. Les pions d'abord, les moulins ensuite,
 *  puis la liberté de bouger : c'est l'ordre dans lequel une partie de
 *  mérelle se perd. */
function evaluer(e: Etat, camp: Camp): number {
  const adverse = autreCamp(camp);
  if (e.gagnant) return gagne(e, camp) ? 10_000 : -10_000;
  const pions = (compte(e.points, camp) + e.aPoser[camp - 1])
    - (compte(e.points, adverse) + e.aPoser[adverse - 1]);
  const mou = moulins(e.points, camp) - moulins(e.points, adverse);
  const ouverts = moulinsOuverts(e.points, camp) - moulinsOuverts(e.points, adverse);
  const mobilite = deplacementsDe(e, camp).length - deplacementsDe(e, adverse).length;
  return pions * 30 + mou * 14 + ouverts * 6 + mobilite;
}

function melanger<T>(t: T[]): T[] {
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

/** Le coup ferme-t-il un moulin tout de suite ? */
function fermeUnMoulin(e: Etat, coup: Coup): boolean {
  const apres = jouer(e, coup);
  return apres.doitRetirer && apres.tour === e.tour;
}

// ── Facile ───────────────────────────────────────────────────────────
function facile(e: Etat): Coup {
  const coups = melanger(coupsLegaux(e));
  // Une chance sur deux de voir le moulin qui se ferme sous son nez.
  if (Math.random() < 0.5) {
    const evident = coups.find((c) => fermeUnMoulin(e, c));
    if (evident) return evident;
  }
  return coups[0];
}

// ── Moyen ────────────────────────────────────────────────────────────
function moyen(e: Etat): Coup {
  const coups = melanger(coupsLegaux(e));
  const adverse = autreCamp(e.tour);

  const mien = coups.find((c) => fermeUnMoulin(e, c));
  if (mien) return mien;

  // Bloquer : occuper le point qui compléterait un alignement adverse.
  for (const l of LIGNES) {
    let a = 0; let trou = -1;
    for (const q of l) {
      if (e.points[q] === adverse) a++;
      else if (e.points[q] === 0) trou = q;
    }
    if (a !== 2 || trou < 0) continue;
    const blocage = coups.find(
      (c) => (c.type === 'pose' && c.vers === trou)
        || (c.type === 'deplacement' && c.vers === trou),
    );
    if (blocage) return blocage;
  }

  // À défaut, le meilleur coup selon l'évaluation immédiate.
  return meilleurImmediat(e, coups);
}

function meilleurImmediat(e: Etat, coups: Coup[]): Coup {
  let best = coups[0];
  let bestScore = -Infinity;
  for (const c of coups) {
    const s = evaluer(jouer(e, c), e.tour);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}

// ── Difficile ────────────────────────────────────────────────────────
// ponytail: minimax sans table de transposition ni tri des coups au-delà
// du mélange. Suffisant à profondeur 3-4 sur vingt-quatre points; si la
// machine paraît molle, la première marche est d'ordonner les coups par
// évaluation immédiate avant de descendre.
function minimax(e: Etat, camp: Camp, profondeur: number, alpha: number, beta: number): number {
  if (profondeur === 0 || e.gagnant) return evaluer(e, camp);
  const coups = coupsLegaux(e);
  if (coups.length === 0) return evaluer(e, camp);
  const maximise = e.tour === camp;
  let a = alpha; let b = beta;
  let meilleur = maximise ? -Infinity : Infinity;
  for (const c of coups) {
    const s = minimax(jouer(e, c), camp, profondeur - 1, a, b);
    if (maximise) {
      if (s > meilleur) meilleur = s;
      if (meilleur > a) a = meilleur;
    } else {
      if (s < meilleur) meilleur = s;
      if (meilleur < b) b = meilleur;
    }
    if (b <= a) break;
  }
  return meilleur;
}

function difficile(e: Etat): Coup {
  const coups = melanger(coupsLegaux(e));
  // La pose ouvre jusqu'à vingt-quatre branches par demi-coup : on
  // descend moins loin qu'en déplacement, où le plateau est étroit.
  const enPose = e.aPoser[0] > 0 || e.aPoser[1] > 0;
  const profondeur = enPose ? 3 : 4;
  let best = coups[0];
  let bestScore = -Infinity;
  for (const c of coups) {
    const s = minimax(jouer(e, c), e.tour, profondeur - 1, -Infinity, Infinity);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}

/** Le coup que l'ordinateur joue maintenant. Rend `null` quand il n'y a
 *  plus rien à jouer : la partie est déjà finie. */
export function choisirCoup(e: Etat, niveau: Difficulte): Coup | null {
  if (e.gagnant) return null;
  const coups = coupsLegaux(e);
  if (coups.length === 0) return null;
  if (niveau === 'facile') return facile(e);
  if (niveau === 'moyen') return moyen(e);
  return difficile(e);
}
