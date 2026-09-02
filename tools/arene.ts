// ─── L'arène ────────────────────────────────────────────────────────
// Alex, 2026-09-01 : « simule peut-être mille parties et vois les
// genres de choses qui font en sorte que le AI peut être un peu
// bizarre. » Ce fichier est le plan du tournoi. Il dit qui joue contre
// qui, combien de fois, et sur quelle graine. Le reste vit à côté :
// ./arene/bancs décrit les huit tables, ./arene/duel joue une partie
// et compte, ./arene/des tient les dés, ./arene/rapport écrit.
//
//   npm run arene
//
// LA MÉTHODE APPARIÉE, ET POURQUOI ELLE N'EST PAS UN LUXE. Ces jeux
// sont déséquilibrés par camp, et c'est historiquement juste : au
// Renard à treize oies, deux connétables donnent la victoire aux oies
// presque à tous les coups. Comparer deux marches en leur faisant
// alterner les camps ne mesurerait donc que ce déséquilibre. Chaque
// position se joue ici deux fois sur la même graine, une fois avec la
// marche forte du côté qui ouvre et une fois avec la faible à la même
// place, et les deux résultats se comparent camp par camp.
//
// LE PLAFOND DE NŒUDS PLUTÔT QUE L'HORLOGE. Une horloge rend un
// résultat différent selon la charge de la machine, et deux tournois
// ne seraient plus comparables. Le temps réel se mesure à part, dans
// une passe courte où chaque marche prend son propre temps.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { graine } from '../src/games/moteur/hasard';
import { chercher } from '../src/games/moteur/recherche';
import type { Niveau } from '../src/games/moteur/niveaux';

import { BANCS } from './arene/bancs';
import { journalNeuf, jouerDuel, type Journal, type Reglages } from './arene/duel';
import { journalDesNeuf, jouerTableDes, type JournalDes } from './arene/des';
import type {
  Appariement, AppariementDes, Bilan, ControleMoteur, Equilibre, LigneBanc, LigneChrono,
} from './arene/bilan';
import { rapport } from './arene/rapport';

// ─── Les réglages du tournoi ────────────────────────────────────────

/** Le budget de nœuds de chaque marche. Il monte avec la force, sans
 *  quoi le banc mesurerait le budget et non la marche. */
const NOEUDS: Record<Niveau, number> = {
  1: 200, 2: 350, 3: 700, 4: 1_200, 5: 2_000,
  6: 3_000, 7: 4_200, 8: 5_500, 9: 7_000, 10: 9_000,
};

/** Les couples qui ne coûtent presque rien. */
const COUPLES_LEGERS: ReadonlyArray<readonly [Niveau, Niveau]> = [[3, 1], [5, 3]];

/** Ceux où un connétable réfléchit, et qui prennent dix fois le temps. */
const COUPLES_LOURDS: ReadonlyArray<readonly [Niveau, Niveau]> = [
  [8, 5], [10, 8], [10, 10], [10, 5],
];

const GRAINES_LEGERES = 3;
const GRAINES_LOURDES = 2;

/** Le couple du connétable contre lui-même mesure l'équilibre du jeu,
 *  et non la force d'une marche. Quatre parties ne suffisent pas à
 *  dire qu'un camp gagne toujours : ce couple en reçoit davantage. */
const GRAINES_EGALITE = 6;

/** Le plafond du banc, par-dessus celui des arbitres. Il ne devrait
 *  jamais servir : s'il sert, c'est l'arbitre qui a un trou. */
const PLAFOND = 500;

/** La recherche de référence qui juge les bévues. */
const REFERENCE = { profondeur: 12, noeuds: 40_000, pas: 7 };

/** Les marches dont on pèse les coups un par un. */
const MARCHES_BEVUE: readonly Niveau[] = [1, 3, 5, 8, 10];

/** Les tables où l'on chronomètre, et le filet qui empêche une marche
 *  sans horloge de bloquer le banc. */
const TABLES_CHRONO: readonly string[] = ['13 oies', 'avec le vol', 'Copenhague'];
const FILET_CHRONO = 400_000;
const COUPS_CHRONO = 3;

/** Les tables de dés, et le nombre de graines par couple de marches. */
const TAILLES_DES: readonly number[] = [2, 5];
const GRAINES_DES = 35;

const REGLAGES: Reglages = {
  plafond: PLAFOND,
  noeuds: NOEUDS,
  bevue: { actif: false, ...REFERENCE },
};

const cle = (jeu: string, variante: string): string => `${jeu} · ${variante}`;

// ─── Le contrôle du moteur ──────────────────────────────────────────
// Avant de juger la machine, on vérifie l'instrument. Les marches à
// fenêtre demandent au moteur la note juste de chaque coup de la
// racine, par le réglage `notesExactes`. Ce contrôle regarde si ces
// notes sont finies, dans les deux mélanges possibles : avec la
// quiescence et sans elle.

function controlerMoteur(): ControleMoteur[] {
  const out: ControleMoteur[] = [];
  for (const b of BANCS) {
    const a = b.adaptateur();
    let e = b.depart();
    // Quatre coups pour sortir de la mise en place, où la position est
    // trop symétrique pour que les notes disent quoi que ce soit.
    for (let k = 0; k < 4 && b.issue(e) === null; k++) {
      const coups = a.coups(e);
      if (coups.length === 0) break;
      e = a.jouer(e, coups[0]);
    }
    const commun = { profondeurMax: 4, noeudsMax: 40_000, notesExactes: true };
    const avec = chercher(a, e, { ...commun, quiescence: true });
    const sans = chercher(a, e, { ...commun, quiescence: false });
    const finies = (r: { racine: Array<{ note: number }> }): number =>
      r.racine.filter((x) => Number.isFinite(x.note)).length;
    out.push({
      table: cle(b.jeu, b.variante),
      notes: sans.racine.length,
      finiesAvecQuiescence: finies(avec),
      finiesSansQuiescence: finies(sans),
      profondeurAvec: avec.profondeur,
      profondeurSans: sans.profondeur,
    });
  }
  return out;
}

// ─── Le tournoi des plateaux ────────────────────────────────────────

interface Tournoi {
  bancs: LigneBanc[];
  global: Journal;
  echelle: Appariement[];
  equilibre: Equilibre[];
  parties: number;
}

function tournoi(): Tournoi {
  const global = journalNeuf();
  const bancs: LigneBanc[] = [];
  const echelle: Appariement[] = [];
  const equilibre: Equilibre[] = [];
  let parties = 0;
  let numero = 1;

  for (const b of BANCS) {
    const journal = journalNeuf();
    const couples = [
      ...COUPLES_LEGERS.map((c) => [c, GRAINES_LEGERES] as const),
      ...COUPLES_LOURDS.map(
        (c) => [c, c[0] === c[1] ? GRAINES_EGALITE : GRAINES_LOURDES] as const,
      ),
    ];
    for (const [[fort, faible], tours] of couples) {
      const a: Appariement = {
        jeu: b.jeu, variante: b.variante, nomA: b.nomA, nomB: b.nomB, fort, faible, parties: 0,
        fortOuvre: 0, faibleOuvre: 0, fortSuit: 0, faibleSuit: 0, nulles: 0,
      };
      for (let t = 0; t < tours; t++) {
        // La même graine des deux côtés : c'est tout l'intérêt de la
        // méthode appariée. Le hasard des coups d'égale valeur est
        // alors le même, et seule la marche change de camp.
        const g = numero++;
        // Le couple du connétable contre lui-même n'apparie rien : les
        // deux camps portent la même marche, donc rejouer la même
        // graine rendrait deux fois la même partie. On lui donne une
        // seconde graine, et il sert alors à mesurer l'équilibre du jeu.
        const revanche = fort === faible ? g + 500_000 : g;
        const droit = jouerDuel(b, fort, faible, graine(g), REGLAGES, journal, global);
        const revers = jouerDuel(b, faible, fort, graine(revanche), REGLAGES, journal, global);
        a.parties += 2;
        parties += 2;
        if (droit.gagnant === 'A') a.fortOuvre++;
        else if (droit.gagnant === 'B') a.faibleSuit++;
        else a.nulles++;
        if (revers.gagnant === 'A') a.faibleOuvre++;
        else if (revers.gagnant === 'B') a.fortSuit++;
        else a.nulles++;
        // Deux marches identiques ne mesurent pas la force mais
        // l'équilibre du jeu, et ces parties-là se rangent à part.
        if (fort === faible) {
          let e = equilibre.find((x) => x.jeu === b.jeu && x.variante === b.variante);
          if (!e) {
            e = {
              jeu: b.jeu, variante: b.variante, nomA: b.nomA, nomB: b.nomB,
              parties: 0, a: 0, b: 0, nulles: 0,
            };
            equilibre.push(e);
          }
          e.parties += 2;
          for (const i of [droit, revers]) {
            if (i.gagnant === 'A') e.a++;
            else if (i.gagnant === 'B') e.b++;
            else e.nulles++;
          }
        }
      }
      echelle.push(a);
    }
    bancs.push({
      jeu: b.jeu, variante: b.variante, nomA: b.nomA, nomB: b.nomB,
      budget: b.budget ?? 1, journal,
    });
    console.log(`  ${cle(b.jeu, b.variante)} : ${journal.parties} parties`);
  }
  return { bancs, global, echelle, equilibre, parties };
}

// ─── La passe des bévues ────────────────────────────────────────────
// Elle se fait à part parce qu'elle coûte cher : chaque position pesée
// relance une recherche de référence bien plus profonde que le joueur.
// Les deux camps portent la même marche, de sorte que chaque coup pesé
// s'impute sans ambiguïté à cette marche.

function passeBevues(global: Journal): number {
  // Ces parties s'arrêtent au cinquantième demi-coup, faute de quoi la
  // passe coûterait plus cher que le tournoi entier. Elles tiennent
  // donc leur propre journal, et seule la mesure des bévues rejoint
  // celui du tournoi : verser leurs fins de partie dans les
  // pathologies ferait passer une coupure voulue pour un blocage.
  const carnet = journalNeuf();
  const reglages: Reglages = {
    plafond: 50, noeuds: NOEUDS, bevue: { actif: true, ...REFERENCE },
  };
  let parties = 0;
  let numero = 10_000;
  for (const b of BANCS) {
    for (const n of MARCHES_BEVUE) {
      jouerDuel(b, n, n, graine(numero++), reglages, carnet);
      parties++;
    }
    console.log(`  bévues mesurées sur ${cle(b.jeu, b.variante)}`);
  }
  for (const [n, v] of carnet.bevues) global.bevues.set(n, v);
  return parties;
}

// ─── La passe du chronomètre ────────────────────────────────────────
// Ici, aucune marche n'est bornée par le budget du tournoi : chacune
// prend le temps que `NIVEAUX` lui donne, ou le temps qu'elle veut
// quand `NIVEAUX` ne lui donne rien. C'est cette passe qui dit si la
// promesse des trois secondes tient.

function passeChrono(): { lignes: LigneChrono[]; parties: number } {
  const lignes: LigneChrono[] = [];
  let parties = 0;
  const filet = Object.fromEntries(
    Object.keys(NOEUDS).map((k) => [k, FILET_CHRONO]),
  ) as Record<Niveau, number>;
  const reglages: Reglages = {
    plafond: COUPS_CHRONO, noeuds: filet, bevue: { actif: false, ...REFERENCE },
  };
  for (const b of BANCS) {
    if (!TABLES_CHRONO.includes(b.variante)) continue;
    const journal = journalNeuf();
    // Le budget d'une table lourde ne s'applique pas ici : ce qu'on
    // mesure est le temps que la marche prend vraiment devant un joueur.
    const nu = { ...b, budget: 1 };
    for (let n = 1 as Niveau; n <= 10; n = (n + 1) as Niveau) {
      jouerDuel(nu, n, n, graine(20_000 + n), reglages, journal);
      parties++;
    }
    lignes.push({
      table: cle(b.jeu, b.variante),
      parNiveau: [...journal.chrono.entries()].sort((x, y) => x[0] - y[0]),
    });
    console.log(`  chronomètre sur ${cle(b.jeu, b.variante)}`);
  }
  return { lignes, parties };
}

// ─── Les dés ────────────────────────────────────────────────────────

function tournoiDes(): { global: JournalDes; parTaille: Array<{ taille: number; journal: JournalDes }>; echelle: AppariementDes[]; parties: number } {
  const global = journalDesNeuf();
  const parTaille: Array<{ taille: number; journal: JournalDes }> = [];
  const echelle: AppariementDes[] = [];
  let parties = 0;
  let numero = 30_000;

  for (const taille of TAILLES_DES) {
    const journal = journalDesNeuf();
    for (const [fort, faible] of [...COUPLES_LEGERS, ...COUPLES_LOURDS]) {
      const a: AppariementDes = {
        taille, fort, faible, tables: 0,
        fortOuvre: 0, faibleOuvre: 0, fortSuit: 0, faibleSuit: 0, sansVainqueur: 0,
      };
      for (let t = 0; t < GRAINES_DES; t++) {
        const g = numero++;
        // Les sièges alternent, et la table jumelle les inverse. Le
        // siège zéro ouvre les annonces : c'est lui qui « ouvre ».
        const pairs = Array.from({ length: taille }, (_, i) => (i % 2 === 0 ? fort : faible));
        const impairs = pairs.map((n) => (n === fort ? faible : fort));
        const revanche = fort === faible ? g + 500_000 : g;
        const droit = jouerTableDes(pairs, graine(g), journal, global);
        const revers = jouerTableDes(impairs, graine(revanche), journal, global);
        a.tables += 2;
        parties += 2;
        if (droit === null) a.sansVainqueur++;
        else if (droit === fort) a.fortOuvre++;
        else a.faibleSuit++;
        if (revers === null) a.sansVainqueur++;
        else if (revers === faible) a.faibleOuvre++;
        else a.fortSuit++;
      }
      echelle.push(a);
    }
    parTaille.push({ taille, journal });
    console.log(`  dés à ${taille} joueurs : ${journal.parties} tables`);
  }
  return { global, parTaille, echelle, parties };
}

// ─── Le banc entier ─────────────────────────────────────────────────

function main(): void {
  const debut = Date.now();
  console.log('Le contrôle du moteur.');
  const controle = controlerMoteur();
  console.log('Le tournoi des plateaux.');
  const t = tournoi();
  console.log('La passe des bévues.');
  const bevues = passeBevues(t.global);
  console.log('La passe du chronomètre.');
  const chrono = passeChrono();
  console.log('Les dés.');
  const des = tournoiDes();

  const bilan: Bilan = {
    // La date LOCALE, jamais celle d'`toISOString`. Un banc lancé le
    // soir à Montpellier tombe déjà au lendemain en temps universel, et
    // le rapport porterait une date que personne n'a vécue.
    date: new Date().toLocaleDateString('fr-CA'),
    dureeMs: Date.now() - debut,
    noeuds: NOEUDS,
    refBevue: REFERENCE,
    filetChrono: FILET_CHRONO,
    plafondArene: PLAFOND,
    controle,
    bancs: t.bancs,
    global: t.global,
    echelle: t.echelle,
    equilibre: t.equilibre,
    chrono: chrono.lignes,
    des,
    partiesTotal: t.parties + bevues + chrono.parties + des.parties,
    reductions: [
      `Les couples qui font réfléchir un connétable coûtent dix fois le temps des `
      + `autres. Ils sont donc joués sur ${GRAINES_LOURDES} graines et les couples `
      + `légers sur ${GRAINES_LEGERES}, ce qui donne ${GRAINES_LOURDES * 2} et `
      + `${GRAINES_LEGERES * 2} parties par table. Le couple du connétable contre `
      + `lui-même en reçoit ${GRAINES_EGALITE * 2}, parce que c'est lui qui porte le `
      + 'verdict sur l\'équilibre des camps.',
      `La passe des bévues joue ${bevues} parties de plus, arrêtées à cinquante `
      + 'demi-coups, et la passe du chronomètre ' + `${chrono.parties} parties de trois `
      + 'demi-coups. Les dés portent le gros du volume, parce qu\'une table de dés se '
      + 'joue en quelques millisecondes.',
    ],
  };

  const chemin = join(process.cwd(), 'docs', 'rapport-arene.md');
  writeFileSync(chemin, rapport(bilan), 'utf8');
  console.log(`\n${bilan.partiesTotal} parties en ${(bilan.dureeMs / 60000).toFixed(1)} min.`);
  console.log(`Rapport écrit dans ${chemin}`);
}

main();
