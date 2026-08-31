// ─── L'adversaire de bois ───────────────────────────────────────────
// Alex, 2026-08-30 : trois niveaux, la même évaluation pour les trois.
// Facile joue au hasard, moyen prend le meilleur coup immédiat,
// difficile regarde trois demi-coups plus loin avec un élagage alpha
// bêta. La note est toujours donnée du point de vue du renard : les
// oies cherchent donc à la faire baisser.

import {
  coupsPossibles, jouer, nbOies, PAS, pointDe, POINTS, positionRenard,
  reglement, type Camp, type Coup, type Plateau, type Variante,
} from './logic';

export type Difficulte = 'facile' | 'moyen' | 'difficile';

const GAGNE = 100_000;

/** Le nombre de points libres autour du renard. Sa vraie liberté, sans
 *  compter les sauts, qui gonfleraient le compte. */
function souffleDuRenard(p: Plateau): number {
  const ou = positionRenard(p);
  if (ou < 0) return 0;
  const { r, c } = POINTS[ou];
  let n = 0;
  for (const { dr, dc } of PAS) {
    const voisin = pointDe(r + dr, c + dc);
    if (voisin >= 0 && p[voisin] === null) n++;
  }
  return n;
}

/** La note de la position, vue par le renard. */
export function evaluer(p: Plateau, v: Variante): number {
  const reste = nbOies(p);
  if (reste <= reglement(v).seuilRenard) return GAGNE;

  const coupsRenard = coupsPossibles(p, 'renard', v);
  if (coupsRenard.length === 0) return -GAGNE;

  // Ce que le renard peut emporter tout de suite. C'est aussi ce que
  // les oies doivent refuser de lui offrir : une oie laissée sautable
  // fait chuter la note du camp des oies.
  let meilleurGain = 0;
  for (const c of coupsRenard) if (c.prises.length > meilleurGain) meilleurGain = c.prises.length;

  // Les oies gagnent du terrain en montant vers la tanière. Plus elles
  // sont hautes et serrées, plus l'étau se referme.
  let avance = 0;
  p.forEach((occ, i) => { if (occ === 'oie') avance += 6 - POINTS[i].r; });

  return -12 * reste + 26 * meilleurGain + 4 * souffleDuRenard(p) - 1.5 * avance;
}

function ordonner(coups: Coup[]): Coup[] {
  return [...coups].sort((a, b) => b.prises.length - a.prises.length);
}

function minimax(p: Plateau, tour: Camp, v: Variante, profondeur: number, alpha: number, beta: number): number {
  const coups = coupsPossibles(p, tour, v);
  if (coups.length === 0) return tour === 'renard' ? -GAGNE : GAGNE;
  if (nbOies(p) <= reglement(v).seuilRenard) return GAGNE;
  if (profondeur === 0) return evaluer(p, v);

  let a = alpha;
  let b = beta;
  if (tour === 'renard') {
    let meilleur = -Infinity;
    for (const coup of ordonner(coups)) {
      const note = minimax(jouer(p, coup), 'oies', v, profondeur - 1, a, b);
      if (note > meilleur) meilleur = note;
      if (meilleur > a) a = meilleur;
      if (a >= b) break;
    }
    return meilleur;
  }
  let pire = Infinity;
  for (const coup of coups) {
    const note = minimax(jouer(p, coup), 'renard', v, profondeur - 1, a, b);
    if (note < pire) pire = note;
    if (pire < b) b = pire;
    if (a >= b) break;
  }
  return pire;
}

/** Le coup que l'ordinateur joue pour ce camp. Rend null quand il n'a
 *  plus rien de légal, ce qui vaut défaite (la partie le voit ailleurs). */
export function choisirCoup(p: Plateau, camp: Camp, v: Variante, d: Difficulte): Coup | null {
  const coups = coupsPossibles(p, camp, v);
  if (coups.length === 0) return null;

  if (d === 'facile') {
    // Assez maladroit pour être battu, jamais au point de refuser un
    // cadeau : le renard ramasse quand même une prise offerte.
    if (camp === 'renard') {
      const prises = coups.filter((c) => c.prises.length > 0);
      if (prises.length > 0 && Math.random() < 0.6) {
        return prises[Math.floor(Math.random() * prises.length)];
      }
    }
    return coups[Math.floor(Math.random() * coups.length)];
  }

  const profondeur = d === 'difficile' ? 3 : 1;
  let meilleur: Coup = coups[0];
  let meilleureNote = camp === 'renard' ? -Infinity : Infinity;

  for (const coup of ordonner(coups)) {
    const suite = jouer(p, coup);
    const note = profondeur <= 1
      ? evaluer(suite, v)
      : minimax(suite, camp === 'renard' ? 'oies' : 'renard', v, profondeur - 1, -Infinity, Infinity);
    const mieux = camp === 'renard' ? note > meilleureNote : note < meilleureNote;
    if (mieux) { meilleureNote = note; meilleur = coup; }
  }
  return meilleur;
}
