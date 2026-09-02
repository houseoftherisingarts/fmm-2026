// ─── Le banc d'essai des Dés du menteur ─────────────────────────────
// Aux dés, il n'y a pas d'arbre à fouiller : personne ne voit la main
// du voisin. Le banc ne mesure donc ni profondeur ni bévue au sens des
// plateaux, mais ce qui fait vraiment le tempérament de la maison :
// combien de fois elle crie « menteur ! » à tort, combien de fois son
// « c'est exactement ça » tombe juste, et combien de dés chaque marche
// laisse sur la table.
//
// ⚠️ LE HASARD DU RÈGLEMENT. `regles.ts` lance ses dés avec
// `Math.random`, et c'est très bien pour une vraie partie : personne
// ne rejoue une soirée de dés. Le banc, lui, doit refaire exactement
// les mêmes mille parties quand un réglage change. Il remplace donc
// `Math.random` par la graine du moteur le temps d'une table, et le
// remet en place ensuite, même si la table se termine mal.

import {
  annoncer, douter, exact, mancheSuivante, nouvellePartie,
  type Partie,
} from '../../src/games/des/regles';
import { choisirCoupDes, memoireNeuve, observer, type MemoireDes } from '../../src/games/des/cpu';
import type { Niveau } from '../../src/games/moteur/niveaux';
import type { Alea } from '../../src/games/moteur/hasard';

export interface ActionsDes {
  coups: number;
  annonces: number;
  doutes: number;
  doutesJustes: number;
  exacts: number;
  exactsJustes: number;
  /** Les annonces que le règlement a refusées : la machine a proposé
   *  un coup illégal, ce qui ne devrait jamais arriver. */
  refusees: number;
  ms: number;
  msMax: number;
}

export interface JournalDes {
  parties: number;
  manches: number;
  manchesMax: number;
  /** Combien de sièges de cette marche ont fini derniers debout. */
  victoires: Map<Niveau, number>;
  /** Combien de sièges de cette marche se sont assis à une table. */
  sieges: Map<Niveau, number>;
  actions: Map<Niveau, ActionsDes>;
  pathologies: Record<string, number>;
}

export const journalDesNeuf = (): JournalDes => ({
  parties: 0, manches: 0, manchesMax: 0,
  victoires: new Map(), sieges: new Map(), actions: new Map(), pathologies: {},
});

const compter = (r: Record<string, number>, cle: string): void => {
  r[cle] = (r[cle] ?? 0) + 1;
};

const ajouter = (m: Map<Niveau, number>, n: Niveau, k = 1): void => {
  m.set(n, (m.get(n) ?? 0) + k);
};

const actionsDe = (j: JournalDes, n: Niveau): ActionsDes => {
  const vu = j.actions.get(n);
  if (vu) return vu;
  const neuf: ActionsDes = {
    coups: 0, annonces: 0, doutes: 0, doutesJustes: 0,
    exacts: 0, exactsJustes: 0, refusees: 0, ms: 0, msMax: 0,
  };
  j.actions.set(n, neuf);
  return neuf;
};

/** Le plafond de tours de parole d'une table. Une manche de vingt-cinq
 *  dés ne peut pas porter plus de cent cinquante annonces, puisque
 *  chacune monte; ce plafond n'existe donc que pour attraper une
 *  boucle, jamais pour couper une partie normale. */
const PLAFOND_TOURS = 4000;

/**
 * Une table entière, de la première annonce au dernier debout.
 *
 * Rend la marche du siège vainqueur, ou `null` quand la table se ferme
 * sans vainqueur. Le règlement de la maison arrête en effet la partie
 * dès que le premier siège tombe, parce qu'un joueur humain ne regarde
 * pas les autres finir sans lui : à cinq machines, cela laisse souvent
 * trois convives encore debout et personne de proclamé.
 */
export function jouerTableDes(
  niveaux: readonly Niveau[], alea: Alea, ...journaux: JournalDes[]
): Niveau | null {
  const vraiHasard = Math.random;
  Math.random = alea;
  try {
    const noms = niveaux.map((n, i) => ({ nom: `siege${i}-n${n}`, machine: true }));
    const memoires: MemoireDes[] = niveaux.map(() => memoireNeuve());
    let p: Partie = nouvellePartie(noms);
    for (const j of journaux) for (const n of niveaux) ajouter(j.sieges, n);

    let tours = 0;
    while (p.phase !== 'fini' && tours < PLAFOND_TOURS) {
      tours++;
      if (p.phase === 'devoilement') {
        // Tout le monde apprend qui a crié au menteur, la machine y
        // comprise : c'est la seule occasion de le noter.
        for (const m of memoires) observer(m, p);
        p = mancheSuivante(p);
        continue;
      }

      const siege = p.tour;
      const niveau = niveaux[siege];
      const t0 = performance.now();
      const coup = choisirCoupDes(p, niveau, alea, { memoire: memoires[siege] });
      const ms = performance.now() - t0;
      for (const j of journaux) {
        const a = actionsDe(j, niveau);
        a.coups++;
        a.ms += ms;
        if (ms > a.msMax) a.msMax = ms;
      }

      if (coup.action === 'annonce') {
        const suite = annoncer(p, coup.quantite ?? 0, coup.face ?? 1);
        if (suite === p) {
          // Le règlement a refusé l'annonce. Le banc doit le dire et
          // sortir de la manche, sinon la table tourne à vide.
          for (const j of journaux) {
            actionsDe(j, niveau).refusees++;
            compter(j.pathologies, 'annonce-refusee');
          }
          p = p.mise ? douter(p) : mancheSuivante(p);
          continue;
        }
        for (const j of journaux) actionsDe(j, niveau).annonces++;
        p = suite;
        continue;
      }

      const avant = p;
      p = coup.action === 'exact' ? exact(p) : douter(p);
      if (p === avant) {
        for (const j of journaux) compter(j.pathologies, 'appel-sans-mise');
        break;
      }
      const perdant = p.devoilement?.perdantId;
      const moi = avant.joueurs[siege].id;
      for (const j of journaux) {
        const a = actionsDe(j, niveau);
        if (coup.action === 'exact') {
          a.exacts++;
          if (perdant === null) a.exactsJustes++;
        } else {
          a.doutes++;
          if (perdant !== moi) a.doutesJustes++;
        }
      }
    }

    const gagnant = p.joueurs.findIndex((j) => j.id === p.gagnantId);
    for (const j of journaux) {
      j.parties++;
      j.manches += p.manche;
      if (p.manche > j.manchesMax) j.manchesMax = p.manche;
      if (gagnant < 0) compter(j.pathologies, 'table-close-sans-vainqueur');
      else ajouter(j.victoires, niveaux[gagnant]);
      if (tours >= PLAFOND_TOURS) compter(j.pathologies, 'plafond-de-tours');
    }
    return gagnant < 0 ? null : niveaux[gagnant];
  } finally {
    Math.random = vraiHasard;
  }
}
