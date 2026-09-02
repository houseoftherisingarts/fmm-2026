// ─── Le banc d'essai : une partie de machine contre machine ─────────
// Alex, 2026-09-01 : « simule peut-être mille parties et vois les
// genres de choses qui font en sorte que le AI peut être un peu
// bizarre. » C'est ici que se joue une partie, et c'est ici qu'on
// compte ce qui cloche pendant qu'elle se joue.
//
// Rien de ce fichier ne connaît un jeu en particulier. Les trois
// plateaux passent par le même `Adaptateur` que le moteur commun, et
// le banc n'a besoin que de quatre choses de plus : la position de
// départ, qui a le trait, ce que vaut la fin, et les événements que
// l'arbitre a déclenchés en chemin.
//
// LES DEUX PORTES D'UN COUP. Le Renard cherche avec `jouerRecherche`,
// qui ne tient pas le registre des positions, et joue pour de vrai
// avec `jouerArbitre`, qui le tient. Confondre les deux ferait rater
// au banc toutes les nulles par répétition. `jouerReel` existe pour
// cette raison, et pour elle seule.

import { chercher } from '../../src/games/moteur/recherche';
import { choisirAuNiveau, type Niveau } from '../../src/games/moteur/niveaux';
import type { Alea } from '../../src/games/moteur/hasard';
import type { Adaptateur, Resultat } from '../../src/games/moteur/types';

/** Le camp qui ouvre la partie s'appelle A, l'autre B. */
export type Cote = 'A' | 'B';

export interface Issue {
  /** `null` quand la partie est nulle. */
  gagnant: Cote | null;
  /** Ce qui a mis fin à la partie, en un mot du vocabulaire du jeu. */
  cause: string;
}

export interface Banc<E, C> {
  jeu: string;
  variante: string;
  /** Le camp qui ouvre, puis celui qui répond, dans la langue du jeu. */
  nomA: string;
  nomB: string;
  /** Bâti à chaque duel : au tafl, il pose le règlement du module. */
  adaptateur(): Adaptateur<E, C>;
  depart(): E;
  auTrait(e: E): Cote;
  issue(e: E): Issue | null;
  /** Le vrai coup de la partie, quand il diffère de celui de l'arbre. */
  jouerReel?(e: E, c: C): E;
  /** Ce que l'arbitre a fait entre ces deux états. */
  evenements?(avant: E, apres: E): readonly string[];
}

// ─── Ce que le banc compte ──────────────────────────────────────────

export interface Chrono { coups: number; total: number; max: number }

export interface Bevue {
  /** Les coups qu'une recherche de référence a pesés. */
  mesures: number;
  /** La somme de ce que ces coups ont perdu, en centièmes de point. */
  perte: number;
  /** Ceux qui ont perdu plus d'un demi-point. */
  graves: number;
  /** Ceux qui ont jeté une position gagnante dans une position perdue. */
  renversements: number;
}

export interface Journal {
  parties: number;
  victoiresA: number;
  victoiresB: number;
  nulles: number;
  causes: Record<string, number>;
  evenements: Record<string, number>;
  demiCoups: number;
  demiCoupsMax: number;
  chrono: Map<Niveau, Chrono>;
  bevues: Map<Niveau, Bevue>;
}

export const journalNeuf = (): Journal => ({
  parties: 0, victoiresA: 0, victoiresB: 0, nulles: 0,
  causes: {}, evenements: {}, demiCoups: 0, demiCoupsMax: 0,
  chrono: new Map(), bevues: new Map(),
});

const compter = (r: Record<string, number>, cle: string): void => {
  r[cle] = (r[cle] ?? 0) + 1;
};

export interface Reglages {
  /** Le plafond du banc, au-delà de celui des arbitres. */
  plafond: number;
  /** Le budget de nœuds par marche. Il rend le banc reproductible. */
  noeuds: Record<Niveau, number>;
  /** La mesure des bévues, qui coûte cher et ne se fait pas partout. */
  bevue: { actif: boolean; profondeur: number; noeuds: number; pas: number };
}

/** Une note de mat écrase toutes les moyennes. Elle se ramène ici à
 *  vingt points, ce qui est déjà quatre fois une pièce. */
const BORNE = 2000;
const borner = (n: number): number => Math.max(-BORNE, Math.min(BORNE, n));

/** Une position vaut d'être appelée gagnante à partir d'une pièce d'avance. */
const SEUIL_GAGNANT = 100;

/** Un coup qui perd plus d'un demi-point est une bévue. */
const SEUIL_BEVUE = 50;

const chronoDe = (j: Journal, n: Niveau): Chrono => {
  const vu = j.chrono.get(n);
  if (vu) return vu;
  const neuf: Chrono = { coups: 0, total: 0, max: 0 };
  j.chrono.set(n, neuf);
  return neuf;
};

const bevueDe = (j: Journal, n: Niveau): Bevue => {
  const vu = j.bevues.get(n);
  if (vu) return vu;
  const neuf: Bevue = { mesures: 0, perte: 0, graves: 0, renversements: 0 };
  j.bevues.set(n, neuf);
  return neuf;
};

/**
 * Compare le coup joué au meilleur coup d'une recherche plus profonde.
 *
 * La référence est jetée quand elle n'a pas fini sa deuxième marche :
 * une recherche coupée avant d'avoir vu la réponse de l'adversaire ne
 * juge personne. Le coup joué doit se retrouver dans la liste de la
 * racine, ce qui est le cas dès que les deux recherches partent de la
 * même position.
 */
function noterBevue<E, C>(
  journaux: readonly Journal[], a: Adaptateur<E, C>,
  ref: Resultat<C>, coup: C, niveau: Niveau,
): void {
  if (ref.profondeur < 2 || ref.racine.length < 2) return;
  const nom = a.nomCoup(coup);
  const joue = ref.racine.find((x) => a.nomCoup(x.coup) === nom);
  if (!joue) return;
  const meilleur = borner(ref.racine[0].note);
  const note = borner(joue.note);
  const perte = meilleur - note;
  for (const j of journaux) {
    const b = bevueDe(j, niveau);
    b.mesures++;
    b.perte += perte;
    if (perte > SEUIL_BEVUE) b.graves++;
    if (meilleur >= SEUIL_GAGNANT && note <= -SEUIL_GAGNANT) b.renversements++;
  }
}

/**
 * Une partie, du premier coup au verdict, et tout ce qu'elle a appris
 * versé dans chacun des journaux qu'on lui donne. Le banc en tient
 * plusieurs à la fois : un par variante, et un pour tout le tournoi.
 */
export function jouerDuel<E, C>(
  b: Banc<E, C>, nA: Niveau, nB: Niveau, alea: Alea, r: Reglages,
  ...journaux: Journal[]
): Issue {
  const a = b.adaptateur();
  const jouer = b.jouerReel ?? ((e: E, c: C) => a.jouer(e, c));
  let etat = b.depart();
  let demi = 0;
  let issue = b.issue(etat);

  while (issue === null && demi < r.plafond) {
    const cote = b.auTrait(etat);
    const niveau = cote === 'A' ? nA : nB;

    const ref = r.bevue.actif && demi % r.bevue.pas === 0
      ? chercher(a, etat, {
        profondeurMax: r.bevue.profondeur,
        noeudsMax: r.bevue.noeuds,
        quiescence: true,
        notesExactes: true,
      })
      : null;

    const t0 = performance.now();
    const coup = choisirAuNiveau(a, etat, niveau, { alea, noeudsMax: r.noeuds[niveau] });
    const ms = performance.now() - t0;
    for (const j of journaux) {
      const c = chronoDe(j, niveau);
      c.coups++;
      c.total += ms;
      if (ms > c.max) c.max = ms;
    }

    if (coup === null) {
      // La machine ne trouve plus rien à jouer alors que l'arbitre n'a
      // pas tranché : c'est un trou dans le règlement, pas une fin.
      issue = { gagnant: null, cause: 'sans-coup' };
      break;
    }
    if (ref) noterBevue(journaux, a, ref, coup, niveau);

    const suivant = jouer(etat, coup);
    if (b.evenements) {
      for (const ev of b.evenements(etat, suivant)) {
        for (const j of journaux) compter(j.evenements, ev);
      }
    }
    etat = suivant;
    demi++;
    issue = b.issue(etat);
  }

  const finale: Issue = issue ?? { gagnant: null, cause: 'plafond-arene' };
  for (const j of journaux) {
    j.parties++;
    j.demiCoups += demi;
    if (demi > j.demiCoupsMax) j.demiCoupsMax = demi;
    compter(j.causes, finale.cause);
    if (finale.gagnant === 'A') j.victoiresA++;
    else if (finale.gagnant === 'B') j.victoiresB++;
    else j.nulles++;
  }
  return finale;
}
