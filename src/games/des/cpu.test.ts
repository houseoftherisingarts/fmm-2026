// ─── Le banc d'essai des dés du menteur ─────────────────────────────
// Pas de cadre de test dans ce dépôt, et pas besoin : un fichier qui
// s'exécute, des assertions, un décompte à la fin.
//
//   npx esbuild src/games/des/cpu.test.ts --bundle --platform=node \
//     --format=esm --outfile=/tmp/des-cpu.mjs && node /tmp/des-cpu.mjs
//
// Il couvre ce qui casse vraiment quand on touche à l'adversaire : le
// compte des probabilités, le doute qui tient compte de la table, le
// pari du calzar, et l'échelle de force, mesurée sur mille parties.
//
// Le hasard vient de `moteur/hasard`, jamais de `Math.random` : les
// mêmes mille parties se rejouent à l'identique quand un réglage
// change. L'arbitre lui-même en est propre, dé repris compris, et un
// essai plus bas le vérifie.

import assert from 'node:assert/strict';
import {
  DES_AU_DEPART, annoncer, desEnJeu, douter, exact, miseValide,
  type Face, type Partie,
} from './regles';
import {
  chanceDe, choisirCoupDes, marchesDes, memoireNeuve, observer,
  probaAuMoins, probaExactement, temperament,
} from './cpu';
import { graine, type Alea } from '../moteur/hasard';
import { NIVEAUX_POSSIBLES, nomNiveau, type Niveau } from '../moteur/niveaux';

let faits = 0;
function essai(nom: string, corps: () => void): void {
  corps();
  faits++;
  console.log(`  ok  ${nom}`);
}

/** Monte une table à la main : chaque main est donnée telle qu'elle
 *  est tombée, et c'est au premier assis de parler. */
function table(mains: Face[][], mise: Partie['mise'] = null, tour = 0): Partie {
  return {
    joueurs: mains.map((des, i) => ({
      id: `j${i}`, nom: `J${i}`, des, machine: true, elimine: des.length === 0,
    })),
    tour,
    mise,
    phase: 'annonces',
    manche: 1,
    journal: [],
  };
}

// ── Le compte des dés inconnus ───────────────────────────────────────

/** Le même calcul, mais fait bêtement : on énumère les 6^n mains
 *  possibles et on compte. C'est lent, c'est juste, et c'est la seule
 *  façon honnête de vérifier une formule. */
function forceBrute(n: number, face: Face, k: number): { exact: number; auMoins: number } {
  const des = new Array<number>(n).fill(1);
  let total = 0; let pile = 0; let auMoins = 0;
  const parcourir = (i: number): void => {
    if (i === n) {
      total++;
      let c = 0;
      for (const d of des) if (d === face || (face !== 1 && d === 1)) c++;
      if (c === k) pile++;
      if (c >= k) auMoins++;
      return;
    }
    for (let v = 1; v <= 6; v++) { des[i] = v; parcourir(i + 1); }
  };
  parcourir(0);
  return { exact: pile / total, auMoins: auMoins / total };
}

essai('la table de probabilité tombe sur le compte fait à la main', () => {
  for (const n of [0, 1, 2, 3, 5]) {
    for (const face of [1, 3, 6] as Face[]) {
      for (let k = 0; k <= n + 1; k++) {
        const brut = forceBrute(n, face, k);
        const ch = chanceDe(face);
        assert.ok(
          Math.abs(probaExactement(n, k, ch) - brut.exact) < 1e-9,
          `exactement ${k} sur ${n} dés, face ${face}`,
        );
        assert.ok(
          Math.abs(probaAuMoins(n, k, ch) - brut.auMoins) < 1e-9,
          `au moins ${k} sur ${n} dés, face ${face}`,
        );
      }
    }
  }
  // Deux valeurs connues, écrites en toutes lettres.
  assert.ok(Math.abs(probaAuMoins(2, 1, 1 / 3) - 5 / 9) < 1e-12);
  assert.ok(Math.abs(probaExactement(4, 0, 1 / 6) - Math.pow(5 / 6, 4)) < 1e-12);
});

essai('l’as est joker partout, sauf dans une annonce d’as', () => {
  assert.equal(chanceDe(1), 1 / 6);
  for (const f of [2, 3, 4, 5, 6] as Face[]) assert.equal(chanceDe(f), 1 / 3);
});

// ── Le tempérament des dix marches ───────────────────────────────────

essai('les dix marches montent, et le connétable ne se trompe jamais', () => {
  let bevuePrecedente = Infinity;
  let ciblePrecedente = 0;
  for (const n of NIVEAUX_POSSIBLES) {
    const t = temperament(n);
    assert.ok(t.bevue <= bevuePrecedente, `la bévue remonte au niveau ${n}`);
    assert.ok(t.cible > ciblePrecedente, `la cible ne monte pas au niveau ${n}`);
    bevuePrecedente = t.bevue;
    ciblePrecedente = t.cible;
  }
  const dix = temperament(10);
  assert.equal(dix.bevue, 0);
  assert.equal(dix.flou, 0);
  assert.equal(dix.patience, 0);
  assert.ok(dix.appelleExact);
  // Les noms sont ceux des plateaux, et ils existent dans les deux langues.
  const fr = marchesDes(true);
  const en = marchesDes(false);
  assert.equal(fr.length, 10);
  assert.equal(fr[0].nom, nomNiveau(1, true));
  assert.equal(en[9].nom, nomNiveau(10, false));
  assert.ok(fr.every((m) => m.humeur.length > 20));
  assert.ok(en.every((m) => m.humeur.length > 20));
});

// ── Le doute ─────────────────────────────────────────────────────────

essai('elle ne crie jamais au menteur sur une annonce déjà certaine', () => {
  // Deux cinq et un as en main : l'annonce de trois cinq tient toute
  // seule, quoi que cachent les cinq dés d'en face.
  for (const n of NIVEAUX_POSSIBLES) {
    for (let g = 1; g <= 60; g++) {
      const p = table([[5, 5, 1, 3, 4], [2, 2, 2, 2, 2]], { quantite: 3, face: 5, parId: 'j1' });
      const coup = choisirCoupDes(p, n, graine(g));
      assert.notEqual(coup.action, 'doute', `niveau ${n}, graine ${g}`);
    }
  }
});

/** Sur combien des annonces possibles la machine retourne les
 *  gobelets. Un seul seuil se lit mal, parce que la loi binomiale
 *  avance par marches; le compte sur toutes les annonces, lui, dit
 *  franchement si la machine doute plus ou moins souvent. */
function comptedesDoutes(mains: Face[][], niveau: Niveau): number {
  const total = mains.reduce((n, m) => n + m.length, 0);
  let doutes = 0;
  for (const face of [1, 2, 3, 4, 5, 6] as Face[]) {
    for (let q = 1; q <= total; q++) {
      const p = table(mains, { quantite: q, face, parId: 'j1' });
      if (choisirCoupDes(p, niveau, graine(3)).action === 'doute') doutes++;
    }
  }
  return doutes;
}

essai('le nombre de joueurs déplace le seuil du doute', () => {
  // Douze dés dans les deux cas, deux dés en main dans les deux cas :
  // seul le nombre de gobelets autour de la table change. À trois, un
  // doute juste retire la moitié d'un dé à la table; à six, il profite
  // surtout aux quatre qui regardent, et il faut donc être plus sûr
  // avant de crier au menteur.
  const aTrois = comptedesDoutes([[3, 4], [6, 6, 6, 6, 6], [2, 2, 2, 2, 2]], 10);
  const aSix = comptedesDoutes([[3, 4], [6, 6], [2, 2], [3, 3], [4, 4], [5, 5]], 10);
  console.log(`      annonces doutées : ${aTrois} à trois joueurs, ${aSix} à six`);
  assert.ok(aSix < aTrois, 'la table ne change rien au doute, c’est le vieux défaut');
});

// ── Le pari du calzar ────────────────────────────────────────────────

essai('elle appelle le compte exact quand c’est le meilleur des trois coups', () => {
  // Quatre dés en main dont deux cinq, un seul dé inconnu, et une
  // annonce de deux cinq : le compte est déjà pile, il ne peut que
  // rester pile ou monter. Deux chances sur trois de reprendre un dé.
  const p = table([[5, 5, 3, 2], [6]], { quantite: 2, face: 5, parId: 'j1' });
  const coup = choisirCoupDes(p, 10, graine(11));
  assert.equal(coup.action, 'exact');
});

essai('le gobelet plein ne fait jamais appeler le compte exact', () => {
  // Le même compte, mais avec cinq dés en main : un calzar réussi ne
  // rapporterait rien, et il risquerait un dé pour du vent.
  const p = table([[5, 5, 3, 2, 6], [6]], { quantite: 2, face: 5, parId: 'j1' });
  for (let g = 1; g <= 40; g++) {
    assert.notEqual(choisirCoupDes(p, 10, graine(g)).action, 'exact', `graine ${g}`);
  }
});

essai('l’arbitre rejoue le même état sur la même liste de coups', () => {
  // Deux joueurs en ligne rejouent les mêmes coups chacun de son côté
  // et doivent tomber sur exactement la même table. Un dé repris qu'on
  // tirerait au hasard suffirait à les faire diverger.
  const depart = table([[5, 5, 3, 2], [6]], { quantite: 2, face: 5, parId: 'j1' });
  const mains = (p: Partie): string => JSON.stringify(p.joueurs.map((j) => j.des));
  assert.equal(mains(exact(depart)), mains(exact(depart)));
  assert.equal(mains(douter(depart)), mains(douter(depart)));
  // Le calzar réussi rend bien un dé, et le gobelet ne dépasse pas cinq.
  assert.equal(exact(depart).joueurs[0].des.length, 5);
});

essai('le vieil appelant ne reçoit jamais un appel qu’il ne sait pas jouer', () => {
  const p = table([[5, 5, 3, 2], [6]], { quantite: 2, face: 5, parId: 'j1' });
  for (let g = 1; g <= 40; g++) {
    const coup = choisirCoupDes(p, 5, graine(g), { autoriserExact: false });
    assert.notEqual(coup.action, 'exact');
  }
});

// ── Le duel, machine contre machine ──────────────────────────────────

interface Bilan {
  manches: number;
  coups: number;
  doutes: number;
  exacts: number;
  annonces: number;
}

const deSeme = (a: Alea): Face => ((Math.floor(a() * 6) + 1) as Face);

/** La manche qui s'ouvre : chacun relance derrière son gobelet. */
function mancheNeuve(a: Alea, des: number[], ouvreur: number, manche: number): Partie {
  return {
    joueurs: des.map((n, i) => ({
      id: `j${i}`,
      nom: `J${i}`,
      des: Array.from({ length: n }, () => deSeme(a)),
      machine: true,
      elimine: n === 0,
    })),
    tour: ouvreur,
    mise: null,
    phase: 'annonces',
    manche,
    journal: [],
  };
}

/**
 * Une partie entière, gobelet contre gobelet, jusqu'à ce qu'il n'en
 * reste qu'un. Rend l'indice du siège gagnant.
 *
 * Chaque coup rendu par la machine est vérifié contre le règlement
 * avant d'être joué : une annonce illégale ferait tourner la partie en
 * rond au lieu de lever une erreur, et le banc ne verrait rien.
 */
function duel(a: Alea, niveaux: [Niveau, Niveau], bilan: Bilan, journal?: string[]): 0 | 1 {
  let des = [DES_AU_DEPART, DES_AU_DEPART];
  const memoires = [memoireNeuve(), memoireNeuve()];
  let ouvreur = 0;
  let manche = 1;

  while (des[0] > 0 && des[1] > 0 && manche <= 60) {
    let p = mancheNeuve(a, des, ouvreur, manche);
    if (journal) journal.push(`Manche ${manche} : ${p.joueurs.map((j) => `${j.nom} ${j.des.join('')}`).join(' · ')}`);
    let tours = 0;
    while (p.phase === 'annonces' && tours++ < 150) {
      const siege = p.tour;
      const avant = p;
      const coup = choisirCoupDes(p, niveaux[siege], a, { memoire: memoires[siege] });
      if (coup.action === 'doute') {
        bilan.doutes++;
        p = douter(p);
      } else if (coup.action === 'exact') {
        bilan.exacts++;
        p = exact(p);
      } else {
        bilan.annonces++;
        assert.ok(
          miseValide(avant.mise, coup.quantite!, coup.face!, desEnJeu(avant)),
          `annonce illégale au niveau ${niveaux[siege]} : ${coup.quantite} × ${coup.face}`,
        );
        p = annoncer(p, coup.quantite!, coup.face!);
      }
      assert.notEqual(p, avant, 'le règlement a refusé le coup de la machine');
      bilan.coups++;
      // Un doute écrit deux lignes au journal, une annonce une seule :
      // nous reprenons tout ce qui s'est ajouté depuis le coup d'avant.
      if (journal) for (const l of p.journal.slice(avant.journal.length)) journal.push(`  ${l}`);
    }

    const d = p.devoilement;
    assert.ok(d, 'la manche ne s’est pas terminée');
    memoires.forEach((m) => observer(m, p));
    des = p.joueurs.map((j) => j.des.length);
    const perdant = d.perdantId ?? d.doutePar;
    const siegePerdant = p.joueurs.findIndex((j) => j.id === perdant);
    ouvreur = siegePerdant >= 0 && des[siegePerdant] > 0 ? siegePerdant : (des[0] > 0 ? 0 : 1);
    bilan.manches++;
    manche++;
  }
  return des[0] > 0 ? 0 : 1;
}

essai('la partie témoin : le connétable contre le palefrenier', () => {
  const journal: string[] = [];
  const bilan: Bilan = { manches: 0, coups: 0, doutes: 0, exacts: 0, annonces: 0 };
  const gagnant = duel(graine(1789), [10, 3], bilan, journal);
  console.log(journal.map((l) => `      ${l}`).join('\n'));
  console.log(`      ${gagnant === 0 ? 'Le connétable' : 'Le palefrenier'} ramasse la mise.`);
  assert.equal(gagnant, 0, 'le connétable a perdu la partie témoin');
});

essai('le connétable bat le palefrenier dans plus de 65 % des parties', () => {
  const a = graine(20260901);
  const bilan: Bilan = { manches: 0, coups: 0, doutes: 0, exacts: 0, annonces: 0 };
  const parties = 1000;
  let victoires = 0;
  for (let k = 0; k < parties; k++) {
    // Les sièges alternent : ouvrir les annonces n'est pas neutre.
    const niveaux: [Niveau, Niveau] = k % 2 === 0 ? [10, 3] : [3, 10];
    const gagnant = duel(a, niveaux, bilan);
    if (niveaux[gagnant] === 10) victoires++;
  }
  const taux = victoires / parties;
  console.log(
    `      ${(taux * 100).toFixed(1)} % pour le connétable sur ${parties} parties · `
    + `${bilan.manches} manches · ${bilan.coups} coups · `
    + `${bilan.annonces} annonces, ${bilan.doutes} doutes, ${bilan.exacts} appels exacts`,
  );
  assert.ok(taux > 0.65, `le connétable ne gagne que ${(taux * 100).toFixed(1)} %`);
});

console.log(`\n${faits} essais passés.`);
