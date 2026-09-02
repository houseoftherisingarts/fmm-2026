// ─── Les dix marches ────────────────────────────────────────────────
// Alex, 2026-09-01 : trois niveaux ne suffisaient plus. Le plus fort se
// battait au premier essai, et « facile » jouait n'importe quoi. La
// force monte maintenant sur dix marches nommées comme les gens d'une
// maisonnée médiévale, du marmiton au connétable.
//
// Une marche se règle sur trois cadrans, et JAMAIS en cassant la
// recherche :
//
//   profondeur   jusqu'où elle regarde;
//   fenêtre      de combien elle accepte de s'écarter du meilleur coup
//                (elle pioche au hasard dans cette marge, ce qui donne
//                des parties variées sans donner des coups absurdes);
//   bévue        la part de coups pris complètement au hasard, la
//                distraction d'un joueur qui pense à autre chose.
//
// Le connétable (dix) n'a ni fenêtre ni bévue, tient le livre
// d'ouvertures, suit les prises jusqu'au calme et réfléchit pendant le
// tour d'en face. Il est fait pour ne pas se laisser battre.

import { chercher } from './recherche';
import { auHasard, entier, piocher, type Alea } from './hasard';
import { MAT, type Adaptateur, type Resultat } from './types';

export type Niveau = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const NIVEAUX_POSSIBLES: readonly Niveau[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export interface ReglageNiveau {
  niveau: Niveau;
  nomFR: string;
  nomEN: string;
  profondeurMax: number;
  tempsMs?: number;
  quiescence: boolean;
  livre: boolean;
  /** Part de coups tirés au hasard parmi tous les coups légaux. */
  bevue: number;
  /** Écart toléré au meilleur coup, en centièmes de point. */
  fenetre: number;
  /** Même distraite, la machine ne laisse pas passer un mat en un coup. */
  voitLeMat: boolean;
  /** Elle réfléchit pendant le tour de l'autre. */
  pense: boolean;
}

const marche = (
  niveau: Niveau, nomFR: string, nomEN: string,
  profondeurMax: number, bevue: number, fenetre: number,
  extra: Partial<ReglageNiveau> = {},
): ReglageNiveau => ({
  niveau, nomFR, nomEN, profondeurMax, bevue, fenetre,
  quiescence: profondeurMax >= 4,
  livre: profondeurMax >= 5,
  voitLeMat: profondeurMax >= 2,
  pense: false,
  ...extra,
});

export const NIVEAUX: Record<Niveau, ReglageNiveau> = {
  1:  marche(1,  'Marmiton',    'Scullion',   1, 0.80, 400),
  2:  marche(2,  'Vilain',      'Villein',    1, 0.55, 300),
  3:  marche(3,  'Palefrenier', 'Groom',      2, 0.35, 220),
  4:  marche(4,  'Écuyer',      'Squire',     2, 0.20, 150),
  5:  marche(5,  'Sergent',     'Sergeant',   3, 0.10, 100),
  // À partir du chevalier, la force ne vient plus d'une fenêtre mais
  // de la profondeur. La raison est mesurée, pas théorique : peser
  // exactement chaque coup de la racine coûte si cher que les marches
  // 6 à 9 tombaient toutes à la même profondeur et jouaient la même
  // partie (banc du Renard, 2026-09-01). Elles cherchent donc à plein
  // régime, et leur maladresse tient à la seule bévue, qui devient
  // rare. La variété vient du tirage entre les coups d'égale valeur.
  6:  marche(6,  'Chevalier',   'Knight',     4, 0.06,   0, { tempsMs: 350 }),
  7:  marche(7,  'Banneret',    'Banneret',   5, 0.035,  0, { tempsMs: 600 }),
  8:  marche(8,  'Capitaine',   'Captain',    6, 0.02,   0, { tempsMs: 1000 }),
  9:  marche(9,  'Sénéchal',    'Seneschal',  8, 0.008,  0, { tempsMs: 1600 }),
  10: marche(10, 'Connétable',  'Constable', 14, 0,      0, { tempsMs: 2600, pense: true }),
};

export const nomNiveau = (n: Niveau, fr: boolean): string =>
  fr ? NIVEAUX[n].nomFR : NIVEAUX[n].nomEN;

/** Une note de mat, pour reconnaître un coup qui gagne tout de suite. */
const gagnant = (note: number): boolean => note > MAT - 1000;

export interface ChoixOptions {
  alea?: Alea;
  livre?: Record<string, string>;
  /** Coupe la réflexion de l'extérieur (le travailleur s'en sert). */
  arret?: () => boolean;
  /** Plafond de nœuds : le banc d'essai en a besoin pour rester égal. */
  noeudsMax?: number;
}

/** La recherche brute, sans le tempérament du niveau. */
export function reflechir<E, C>(
  a: Adaptateur<E, C>, etat: E, n: Niveau, o: ChoixOptions = {},
): Resultat<C> {
  const r = NIVEAUX[n];
  return chercher(a, etat, {
    profondeurMax: r.profondeurMax,
    tempsMs: r.tempsMs,
    quiescence: r.quiescence,
    livre: r.livre ? o.livre : undefined,
    arret: o.arret,
    noeudsMax: o.noeudsMax,
    // Une marche qui pioche dans une fenêtre a besoin de la note juste
    // de chaque coup, pas seulement de celle du meilleur.
    notesExactes: r.fenetre > 0,
  });
}

/**
 * Le coup que joue la machine à ce niveau.
 *
 * La faiblesse ne se fabrique pas en abîmant la recherche mais en
 * choisissant moins bien dans ce qu'elle a trouvé : c'est ce qui
 * distingue un adversaire maladroit d'un adversaire cassé.
 */
export function choisirAuNiveau<E, C>(
  a: Adaptateur<E, C>, etat: E, n: Niveau, o: ChoixOptions = {},
): C | null {
  const alea = o.alea ?? auHasard;
  const r = NIVEAUX[n];
  const legaux = a.coups(etat);
  if (legaux.length === 0) return null;
  if (legaux.length === 1) return legaux[0];

  const res = reflechir(a, etat, n, o);
  if (!res.coup) return null;
  if (res.duLivre) return res.coup;

  // Le coup qui gagne sur-le-champ se joue toujours, à partir de la
  // troisième marche : rater un mat en un coup, ce n'est plus de la
  // maladresse, c'est un adversaire qui ne sait pas à quoi il joue.
  const meilleur = res.racine[0];
  if (r.voitLeMat && meilleur && gagnant(meilleur.note)) return meilleur.coup;

  if (r.bevue > 0 && alea() < r.bevue) {
    return legaux[entier(alea, legaux.length)];
  }

  // Sans fenêtre, la machine joue le meilleur coup et rien d'autre. Le
  // tirage au sort entre coups d'égale valeur a été essayé le
  // 2026-09-01 puis retiré : il rendait le connétable imprévisible d'une
  // partie à l'autre, ce qui est bien, mais aussi d'une exécution à
  // l'autre sur la même position, ce qui rend tout contrôle impossible
  // et fait choisir un coup qui vaut autant à l'horizon de la recherche
  // sans valoir autant sur la planche. La variété des débuts vient du
  // livre d'ouvertures, dont c'est le métier.
  if (r.fenetre <= 0 || !meilleur) return res.coup;
  const seuil = meilleur.note - r.fenetre;
  const acceptables = res.racine.filter((c) => c.note >= seuil);
  return piocher(alea, acceptables).coup;
}
