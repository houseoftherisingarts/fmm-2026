// ─── Les huit tables du banc d'essai ────────────────────────────────
// Chaque variante des trois plateaux devient un `Banc` : la position
// de départ, qui a le trait, ce que vaut la fin, et les événements que
// l'arbitre déclenche en chemin. Les dés vivent à part, dans ./des,
// parce qu'on n'y cherche rien dans un arbre.
//
// ⚠️ LE RÈGLEMENT DU TAFL EST UNE VARIABLE DE MODULE. `setRegle` change
// `N` et `REGLE` pour tout le module d'un coup, et les quatre
// règlements se suivent dans le même processus. Le banc du tafl repose
// donc son règlement à chaque duel, dans `adaptateur()` comme dans
// `depart()`, et jamais au milieu d'une partie.

import { adaptateurRenard } from '../../src/games/renard/cpu';
import {
  PLAFOND_DEMI_COUPS, clePosition as cleRenard, etatInitial as departRenard,
  jouerArbitre as jouerRenard,
  type EtatRenard,
} from '../../src/games/renard/arbitre';
import {
  nbOies, reglement, type Coup as CoupRenard, type Variante,
} from '../../src/games/renard/logic';

import { adaptateurMerelle, type CoupMerelle } from '../../src/games/merelle/cpu';
import {
  clePosition as cleMerelle, etatInitial as departMerelle, verdictArbitre as verdictMerelle,
  type EtatMerelle,
} from '../../src/games/merelle/arbitre';

import { adaptateurTafl, type CpuMove } from '../../src/games/hnefatafl/cpuPlayer';
import {
  clePosition as cleTafl, etatInitial as departTafl, type EtatTafl,
} from '../../src/games/hnefatafl/arbitre';
import { REGLES } from '../../src/games/hnefatafl/gameLogic';

import type { Banc, Cote, Issue } from './duel';

/** L'événement qu'on note quand une position revient pour la deuxième
 *  fois. Elle n'a encore rien clos, mais c'est le premier signe qu'un
 *  camp tourne en rond au lieu d'essayer de gagner. */
const REPETEE = 'position-repetee';

// ─── Le Renard et les Oies ──────────────────────────────────────────

function issueRenard(e: EtatRenard): Issue | null {
  const v = e.verdict;
  if (v === null) return null;
  if (v === 'nulle') {
    return {
      gagnant: null,
      cause: e.demiCoups >= PLAFOND_DEMI_COUPS ? 'nulle-plafond' : 'nulle-repetition',
    };
  }
  if (v === 'renard') {
    // Le renard l'emporte de deux façons : il a croqué assez d'oies
    // pour passer sous le seuil de la variante, ou le troupeau n'a
    // plus un seul coup à jouer.
    const croque = nbOies(e.plateau) <= reglement(e.variante).seuilRenard;
    return { gagnant: 'B', cause: croque ? 'renard-a-croque' : 'oies-bloquees' };
  }
  return { gagnant: 'A', cause: 'renard-enferme' };
}

const bancRenard = (variante: Variante): Banc<EtatRenard, CoupRenard> => ({
  jeu: 'Renard et Oies',
  variante: variante === 'oies13' ? '13 oies' : '17 oies',
  nomA: 'oies',
  nomB: 'renard',
  adaptateur: () => adaptateurRenard(variante),
  depart: () => departRenard(variante),
  auTrait: (e) => (e.tour === 'oies' ? 'A' : 'B'),
  issue: issueRenard,
  // La recherche joue avec `jouerRecherche`, qui ne tient pas le
  // registre des positions. La vraie partie passe par l'arbitre.
  jouerReel: (e, c) => jouerRenard(e, c).etat,
  evenements: (avant, apres) => {
    const vus: string[] = [];
    if (apres.punies > avant.punies) vus.push('oie-punie');
    if ((apres.vues[cleRenard(apres.plateau, apres.tour)] ?? 0) === 2) vus.push(REPETEE);
    return vus;
  },
});

// ─── La Mérelle ─────────────────────────────────────────────────────

function issueMerelle(e: EtatMerelle): Issue | null {
  const v = verdictMerelle(e);
  if (!v.finie) return null;
  if (v.nulle) return { gagnant: null, cause: `nulle-${v.nulle}` };
  return {
    gagnant: v.gagnant === 1 ? 'A' : 'B',
    // `logic.ts` déclare le gagnant quand l'autre tombe à deux pions ou
    // n'a plus un coup. Les deux fins se ressemblent assez pour tenir
    // sous un seul mot ici.
    cause: 'moulin-decisif',
  };
}

const bancMerelle = (vol: boolean): Banc<EtatMerelle, CoupMerelle> => ({
  jeu: 'Mérelle',
  variante: vol ? 'avec le vol' : 'sans le vol',
  nomA: 'chêne clair',
  nomB: 'bois teint',
  adaptateur: () => adaptateurMerelle(vol),
  depart: () => departMerelle(vol),
  auTrait: (e) => (e.jeu.tour === 1 ? 'A' : 'B'),
  issue: issueMerelle,
  evenements: (_avant, apres) => {
    const cle = cleMerelle(apres);
    let n = 0;
    for (const v of apres.vues) if (v === cle) n++;
    return n === 2 ? [REPETEE] : [];
  },
});

// ─── Le Hnefatafl ───────────────────────────────────────────────────

function issueTafl(e: EtatTafl): Issue | null {
  const v = e.verdict;
  if (!v) return null;
  const gagnant: Cote | null =
    v.issue === 'nulle' ? null : v.issue === 'attacker' ? 'A' : 'B';
  return { gagnant, cause: v.cause };
}

const bancTafl = (regleId: string, nom: string): Banc<EtatTafl, CpuMove> => ({
  jeu: 'Hnefatafl',
  variante: nom,
  nomA: 'assaillants',
  nomB: 'défenseurs',
  adaptateur: () => adaptateurTafl(regleId),
  depart: () => departTafl(regleId),
  auTrait: (e) => (e.tour === 'attacker' ? 'A' : 'B'),
  issue: issueTafl,
  evenements: (_avant, apres) =>
    ((apres.vues[cleTafl(apres)] ?? 0) === 2 ? [REPETEE] : []),
});

// ─── La liste ───────────────────────────────────────────────────────
// Le type est effacé : le banc d'essai ne fait que jouer, et il n'a
// jamais à ouvrir un état ni un coup.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BANCS: Array<Banc<any, any>> = [
  bancRenard('oies13'),
  bancRenard('oies17'),
  bancMerelle(true),
  bancMerelle(false),
  ...REGLES.map((r) => bancTafl(r.id, r.nomFR)),
];
