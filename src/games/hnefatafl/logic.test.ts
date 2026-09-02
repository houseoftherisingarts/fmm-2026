// ─── Le banc d'essai du Hnefatafl ───────────────────────────────────
// Alex, 2026-09-01 : pas de cadre de test dans ce dépôt, et pas besoin.
// Un fichier qui s'exécute, des assertions, un décompte à la fin :
//
//   npx esbuild src/games/hnefatafl/logic.test.ts --bundle \
//     --platform=node --format=esm --outfile=/tmp/tafl.mjs && node /tmp/tafl.mjs
//
// Il couvre les quatre règlements, les prises qui font perdre la
// partie à ceux qui les oublient, les deux règles de l'arbitre, et il
// finit par des parties entières machine contre machine. Ces dernières
// sont là pour une raison précise : un adaptateur au signe inversé joue
// contre lui-même, la recherche a l'air de tourner, et rien ne le dit
// tant que deux marches différentes ne se sont pas affrontées.

import assert from 'node:assert/strict';
import {
  REGLES, initBoard, setRegle,
  type Board, type CellValue, type Side,
} from './gameLogic';
import {
  etatInitial, jouerArbitre, verdictArbitre, clePosition, respiration,
  LIMITE_SANS_PRISE,
  type EtatTafl, type VerdictTafl,
} from './arbitre';
import {
  adaptateurTafl, choisirCoupNiveau, coupsTafl, evaluerDefense, routesRoi, pickMove,
  type Difficulty,
} from './cpuPlayer';
import { graine } from '../moteur/hasard';
import type { Niveau } from '../moteur/niveaux';

let faits = 0;
function essai(nom: string, corps: () => void): void {
  corps();
  faits++;
  console.log(`  ok  ${nom}`);
}

/** Monte un damier à la main sous le règlement voulu. Rien n'est posé
 *  qui ne soit dans la liste, et le trait revient aux assaillants. */
function poser(
  regleId: string,
  pieces: Array<[number, number, CellValue]>,
  tour: Side = 'attacker',
): EtatTafl {
  const r = setRegle(regleId);
  const board: Board = Array.from({ length: r.taille }, () =>
    new Array<CellValue>(r.taille).fill(0));
  for (const [ligne, colonne, v] of pieces) board[ligne][colonne] = v;
  const base: EtatTafl = { board, tour, sansPrise: 0, vues: {}, verdict: null };
  return { ...base, vues: { [clePosition(base)]: 1 } };
}

const compter = (b: Board): { att: number; def: number; roi: number } => {
  let att = 0;
  let def = 0;
  let roi = 0;
  for (const rangee of b) {
    for (const v of rangee) {
      if (v === 1) att++;
      else if (v === 2) def++;
      else if (v === 3) roi++;
    }
  }
  return { att, def, roi };
};

// ── Les quatre règlements ────────────────────────────────────────────

essai('les quatre règlements posent leurs hommes comme les traités le disent', () => {
  const attendu: Record<string, { taille: number; att: number; def: number }> = {
    copenhague: { taille: 11, att: 24, def: 12 },
    fetlar: { taille: 11, att: 24, def: 12 },
    tawlbwrdd: { taille: 11, att: 24, def: 12 },
    brandubh: { taille: 7, att: 8, def: 4 },
  };
  assert.equal(REGLES.length, 4);
  for (const r of REGLES) {
    const e = etatInitial(r.id);
    const c = compter(e.board);
    const att = attendu[r.id];
    assert.ok(att, `règlement inconnu : ${r.id}`);
    assert.equal(e.board.length, att.taille, `${r.id} : taille du damier`);
    assert.equal(c.att, att.att, `${r.id} : assaillants`);
    assert.equal(c.def, att.def, `${r.id} : défenseurs`);
    assert.equal(c.roi, 1, `${r.id} : un seul roi`);
    // Le roi ouvre la partie assis sur son trône, au centre exact.
    const m = (att.taille - 1) / 2;
    assert.equal(e.board[m][m], 3, `${r.id} : le roi n'est pas sur son trône`);
    assert.equal(e.tour, 'attacker', `${r.id} : les assaillants ouvrent`);
    assert.equal(e.verdict, null);
  }
});

essai('la mise en place est symétrique par quart de tour', () => {
  for (const r of REGLES) {
    setRegle(r.id);
    const b = initBoard();
    const n = r.taille;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        assert.equal(b[i][j], b[j][n - 1 - i], `${r.id} : ${i},${j} hors symétrie`);
      }
    }
  }
});

// ── Les prises ───────────────────────────────────────────────────────

essai('un homme pris en tenaille quitte le damier', () => {
  const e = poser('copenhague', [
    [3, 3, 1], [3, 4, 2], [0, 5, 1], [5, 5, 3],
  ]);
  const apres = jouerArbitre(e, [0, 5], [3, 5]);
  assert.equal(apres.board[3][4], 0, 'le défenseur devait tomber');
  assert.equal(apres.board[3][5], 1);
  assert.equal(apres.sansPrise, 0, 'une prise remet le compteur à zéro');
  assert.equal(apres.tour, 'defender');
});

essai('un homme qui se glisse LUI-MÊME entre deux ennemis ne se prend pas', () => {
  // La règle est universelle au tafl : on ne se fait pas prendre en
  // entrant dans la tenaille, seul le mouvement de l'ennemi capture.
  const e = poser('copenhague', [
    [3, 3, 1], [3, 5, 1], [7, 4, 2], [5, 5, 3],
  ], 'defender');
  const apres = jouerArbitre(e, [7, 4], [3, 4]);
  assert.equal(apres.board[3][4], 2, 'le défenseur devait survivre');
});

essai('le mur de boucliers ne tombe qu’à Copenhague', () => {
  const mur: Array<[number, number, CellValue]> = [
    [0, 3, 1], [0, 8, 1],
    [0, 4, 2], [0, 5, 2], [0, 6, 2],
    [1, 4, 1], [1, 5, 1], [1, 6, 1],
    [5, 7, 1], [5, 5, 3],
  ];
  const cope = jouerArbitre(poser('copenhague', mur), [5, 7], [0, 7]);
  assert.equal(cope.board[0][4], 0);
  assert.equal(cope.board[0][5], 0);
  assert.equal(cope.board[0][6], 0);

  // Fetlar joue le même damier et ne connaît pas le mur : les trois
  // hommes restent debout. C'est là que se voit une variante mal lue.
  const fetlar = jouerArbitre(poser('fetlar', mur), [5, 7], [0, 7]);
  assert.equal(fetlar.board[0][4], 2);
  assert.equal(fetlar.board[0][5], 2);
  assert.equal(fetlar.board[0][6], 2);
});

// ── Les fins de partie du jeu lui-même ───────────────────────────────

essai('le roi qui gagne le coin emporte la partie', () => {
  const e = poser('copenhague', [[0, 3, 3], [6, 6, 1], [8, 2, 1]], 'defender');
  const apres = jouerArbitre(e, [0, 3], [0, 0]);
  assert.deepEqual(apres.verdict, { issue: 'defender', cause: 'fuite' } as VerdictTafl);
});

essai('le roi fort tombe sous quatre lances, jamais sous trois', () => {
  const trois = poser('copenhague', [
    [4, 4, 3], [3, 4, 1], [5, 4, 1], [4, 3, 1], [8, 8, 2],
  ], 'defender');
  assert.equal(verdictArbitre(trois), null, 'trois lances ne suffisent pas');

  const e = poser('copenhague', [
    [4, 4, 3], [3, 4, 1], [5, 4, 1], [4, 3, 1], [4, 8, 1], [8, 8, 2],
  ]);
  const apres = jouerArbitre(e, [4, 8], [4, 5]);
  assert.deepEqual(apres.verdict, { issue: 'attacker', cause: 'roiPris' } as VerdictTafl);
});

essai('le roi faible du Brandubh tombe sous deux lances en ligne', () => {
  const e = poser('brandubh', [[2, 2, 3], [2, 1, 1], [5, 3, 1]]);
  const apres = jouerArbitre(e, [5, 3], [2, 3]);
  assert.deepEqual(apres.verdict, { issue: 'attacker', cause: 'roiPris' } as VerdictTafl);

  // Deux lances qui ne sont pas en ligne ne prennent rien du tout.
  const enEquerre = poser('brandubh', [[2, 2, 3], [2, 1, 1], [1, 2, 1]], 'defender');
  assert.equal(verdictArbitre(enEquerre), null);
});

essai('l’anneau refermé donne la partie aux assaillants, à Copenhague seulement', () => {
  // Le roi et son homme vivent dans une poche de trois cases, et
  // l'anneau des assaillants ne laisse plus une seule case de bord.
  const poche: Array<[number, number, CellValue]> = [
    [5, 4, 3], [5, 3, 2],
    [4, 3, 1], [4, 4, 1], [4, 5, 1],
    [6, 3, 1], [6, 4, 1], [6, 5, 1],
    [5, 2, 1], [5, 5, 1],
    // Un homme libre au large : sans lui, Fetlar trancherait par
    // blocage et l'essai ne dirait plus rien de l'encerclement.
    [9, 9, 2],
  ];
  const cope = poser('copenhague', poche, 'defender');
  const r = respiration(cope.board);
  assert.equal(r.bords, 0, 'la poche ne devait toucher aucun bord');
  assert.ok(r.cases > 1, 'la poche compte plus d’une case');
  assert.deepEqual(verdictArbitre(cope), { issue: 'attacker', cause: 'encerclement' } as VerdictTafl);

  // Fetlar ne connaît pas l'encerclement : la partie continue.
  const fetlar = poser('fetlar', poche, 'defender');
  assert.equal(verdictArbitre(fetlar), null);
});

essai('le camp qui n’a plus un seul coup perd la partie', () => {
  // Le seul assaillant est coincé contre un coin : le coin ne veut pas
  // de lui, et deux défenseurs lui ferment les deux autres côtés.
  const e = poser('copenhague', [
    [0, 1, 1], [0, 2, 2], [1, 1, 2], [5, 5, 3],
  ]);
  assert.deepEqual(verdictArbitre(e), { issue: 'defender', cause: 'blocage' } as VerdictTafl);
});

// ── Les deux règles de l'arbitre ─────────────────────────────────────

essai('la position revenue trois fois fait PERDRE celui qui la ramène', () => {
  // Un assaillant et un défenseur font la navette. Au quatrième
  // aller-retour la position initiale paraît pour la troisième fois,
  // et c'est le défenseur qui vient de la ramener.
  let e = poser('copenhague', [[2, 2, 1], [8, 8, 2], [5, 5, 3]]);
  const navette: Array<[[number, number], [number, number]]> = [
    [[2, 2], [2, 3]], [[8, 8], [8, 7]], [[2, 3], [2, 2]], [[8, 7], [8, 8]],
  ];
  for (let tour = 0; tour < 2; tour++) {
    for (const [de, vers] of navette) {
      assert.equal(e.verdict, null, `la partie s’est arrêtée trop tôt au tour ${tour}`);
      e = jouerArbitre(e, de as [number, number], vers as [number, number]);
    }
  }
  assert.ok(e.verdict, 'la répétition triple n’a pas été vue');
  assert.equal(e.verdict!.cause, 'repetition');
  assert.equal(e.verdict!.issue, 'attacker', 'le fautif était le camp du roi');
  assert.equal(e.tour, 'attacker');
});

essai('cent vingt demi-coups sans prise rendent la partie nulle', () => {
  const base = poser('copenhague', [[2, 2, 1], [8, 8, 2], [5, 5, 3]]);
  const presque: EtatTafl = { ...base, sansPrise: LIMITE_SANS_PRISE - 1 };
  assert.equal(verdictArbitre(presque), null, 'il restait un demi-coup');
  const apres = jouerArbitre(presque, [2, 2], [2, 3]);
  assert.equal(apres.sansPrise, LIMITE_SANS_PRISE);
  assert.deepEqual(apres.verdict, { issue: 'nulle', cause: 'sansPrise' } as VerdictTafl);
});

essai('une prise remet à zéro le compteur ET la mémoire des positions', () => {
  const e = { ...poser('copenhague', [[3, 3, 1], [3, 4, 2], [0, 5, 1], [5, 5, 3]]), sansPrise: 40 };
  const apres = jouerArbitre(e, [0, 5], [3, 5]);
  assert.equal(apres.sansPrise, 0);
  assert.equal(Object.keys(apres.vues).length, 1, 'la mémoire devait repartir à neuf');
});

essai('un coup illégal se fait refuser à la porte', () => {
  const e = etatInitial('copenhague');
  assert.throws(() => jouerArbitre(e, [5, 5], [4, 4]), /illégal/);
  assert.throws(() => jouerArbitre(e, [0, 3], [4, 4]), /illégal/);
  assert.throws(() => jouerArbitre(e, [0, 0], [1, 0]), /illégal/);
});

// ── Ce que l'adversaire de bois doit voir ────────────────────────────

essai('deux lignes libres vers un coin se comptent, et pèsent lourd', () => {
  // Le roi en 0,5 tient la rangée du haut des deux côtés : les deux
  // coins sont ouverts, un seul homme ne peut pas fermer les deux.
  const deux = poser('copenhague', [[0, 5, 3], [8, 8, 1]], 'defender');
  assert.equal(routesRoi(deux.board, 0, 5).enUn, 2);

  // Un assaillant posé sur la rangée en ferme une.
  const une = poser('copenhague', [[0, 5, 3], [0, 2, 1]], 'defender');
  assert.equal(routesRoi(une.board, 0, 5).enUn, 1);

  assert.ok(
    evaluerDefense(deux.board) > evaluerDefense(une.board) + 3000,
    'deux lignes ouvertes doivent valoir bien plus qu’une seule',
  );
});

essai('la note change de signe avec le trait, jamais avec le camp', () => {
  const a = adaptateurTafl('copenhague');
  const cote = poser('copenhague', [[0, 5, 3], [8, 8, 1]], 'defender');
  const memeDamierAutreTrait: EtatTafl = { ...cote, tour: 'attacker' };
  assert.equal(a.evaluer(cote), -a.evaluer(memeDamierAutreTrait));
  assert.ok(a.evaluer(cote) > 0, 'le camp du roi est gagnant, la note doit être positive');
});

essai('le connétable voit la sortie du roi et la joue', () => {
  const e = poser('copenhague', [
    [0, 5, 3], [0, 2, 1], [3, 8, 1], [7, 1, 1], [9, 9, 1],
  ], 'defender');
  const coup = choisirCoupNiveau(e, 10, { noeudsMax: 20_000, regleId: 'copenhague' });
  assert.ok(coup, 'aucun coup rendu');
  const apres = jouerArbitre(e, coup!.from, coup!.to);
  assert.deepEqual(apres.verdict, { issue: 'defender', cause: 'fuite' } as VerdictTafl);
});

essai('le connétable prend le roi quand la quatrième lance est là', () => {
  const e = poser('copenhague', [
    [4, 4, 3], [3, 4, 1], [5, 4, 1], [4, 3, 1], [4, 8, 1], [8, 8, 2], [9, 1, 1],
  ]);
  const coup = choisirCoupNiveau(e, 10, { noeudsMax: 20_000, regleId: 'copenhague' });
  assert.ok(coup);
  const apres = jouerArbitre(e, coup!.from, coup!.to);
  assert.deepEqual(apres.verdict, { issue: 'attacker', cause: 'roiPris' } as VerdictTafl);
});

essai('l’ancienne porte pickMove rend toujours un coup légal', () => {
  const e = etatInitial('copenhague');
  for (const d of ['easy', 'medium', 'hard'] as const) {
    const coup = pickMove(e.board, 'attacker', d);
    assert.ok(coup, `${d} n’a rendu aucun coup`);
    // Il passe l'arbitre sans se faire refuser : il était donc légal.
    jouerArbitre(e, coup!.from, coup!.to);
  }
});

// ── La porte que la page appelle vraiment ────────────────────────────
// `index.tsx` n'appelle ni l'arbitre ni les dix marches : il appelle
// `pickMove`, sur le fil principal, entre deux images de la scène
// Three.js. Ce que ce fichier doit garder, c'est donc ce que le joueur
// voit du bout de son doigt : une scène qui ne se fige pas, et trois
// boutons qui montent vraiment.

/** Des damiers de milieu de partie, tirés à la graine. L'ouverture seule
 *  ne dit rien du coût d'un coup : c'est au milieu que le damier est
 *  ouvert et que la recherche a le plus de branches à ouvrir. */
function damiersDeMilieu(regleId: string, graineN: number): Board[] {
  const alea = graine(graineN);
  let e = etatInitial(regleId);
  const out: Board[] = [e.board];
  for (let i = 0; i < 24 && !e.verdict; i++) {
    const coups = coupsTafl(e);
    if (coups.length === 0) break;
    const c = coups[Math.floor(alea() * coups.length)];
    e = jouerArbitre(e, c.from, c.to);
    if (i === 11 || i === 23) out.push(e.board);
  }
  return out;
}

essai('aucun bouton ne gèle la scène : la porte du fil principal est bornée', () => {
  // Les marches un à cinq n'ont aucune horloge dans `NIVEAUX`. Sans le
  // plafond de nœuds de `pickMove`, le bouton du milieu tenait le fil
  // principal deux secondes et deux dixièmes sur un damier de
  // Copenhague. Le seuil est large exprès : il n'attrape pas une machine
  // lente, il attrape un plafond qu'on aurait retiré.
  const SEUIL_MS = 1500;
  let pire = 0;
  let pireNom = '';
  for (const regleId of ['copenhague', 'brandubh']) {
    for (const board of damiersDeMilieu(regleId, 2026)) {
      for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
        setRegle(regleId);
        const debut = Date.now();
        const coup = pickMove(board, 'attacker', d);
        const ms = Date.now() - debut;
        assert.ok(coup, `${regleId} ${d} n’a rendu aucun coup`);
        if (ms > pire) { pire = ms; pireNom = `${regleId} ${d}`; }
      }
    }
  }
  console.log(`      pire réflexion du fil principal : ${pire} ms (${pireNom})`);
  assert.ok(pire < SEUIL_MS, `${pireNom} a tenu le fil principal ${pire} ms`);
});

essai('le bouton difficile est vraiment le plus dur', () => {
  // Il tombait sur la marche 8 et perdait contre la marche 5 du bouton du
  // milieu, dix parties sur douze : la quiescence lui coûtait plus de
  // profondeur qu'elle ne lui en rendait. Six parties de Brandubh
  // suffisent à rattraper la faute si elle revient un jour.
  let pour = 0;
  for (let i = 0; i < 6; i++) {
    const durAttaque = i % 2 === 0;
    let e = etatInitial('brandubh');
    let plis = 0;
    while (!e.verdict && plis < 200) {
      const d: Difficulty = (e.tour === 'attacker') === durAttaque ? 'hard' : 'medium';
      setRegle('brandubh');
      const coup = pickMove(e.board, e.tour, d);
      if (!coup) break;
      e = jouerArbitre(e, coup.from, coup.to);
      plis++;
    }
    if (e.verdict?.issue === (durAttaque ? 'attacker' : 'defender')) pour++;
  }
  console.log(`      difficile contre moyen : ${pour} parties sur six`);
  assert.ok(pour >= 4, `le bouton difficile n’a gagné que ${pour} parties sur six contre le bouton moyen`);
});

// ── Les parties entières ─────────────────────────────────────────────

interface Partie { verdict: VerdictTafl | null; plis: number }

function jouerPartie(o: {
  regleId: string;
  attaquant: Niveau;
  defenseur: Niveau;
  graineN: number;
  noeudsMax: number;
  plisMax: number;
}): Partie {
  const alea = graine(o.graineN);
  let e = etatInitial(o.regleId);
  let plis = 0;
  while (!e.verdict && plis < o.plisMax) {
    const marche = e.tour === 'attacker' ? o.attaquant : o.defenseur;
    const coup = choisirCoupNiveau(e, marche, {
      alea, noeudsMax: o.noeudsMax, regleId: o.regleId,
    });
    if (!coup) break;
    e = jouerArbitre(e, coup.from, coup.to);
    plis++;
  }
  return { verdict: e.verdict, plis };
}

essai('la partie témoin : le connétable bat le palefrenier à Copenhague', () => {
  const debut = Date.now();
  const p = jouerPartie({
    regleId: 'copenhague', attaquant: 10, defenseur: 3,
    graineN: 20260901, noeudsMax: 14_000, plisMax: 220,
  });
  console.log(
    `      témoin : ${p.verdict?.issue ?? 'inachevée'} par ${p.verdict?.cause ?? 'sans verdict'},`
    + ` ${p.plis} demi-coups, ${((Date.now() - debut) / 1000).toFixed(1)} s`,
  );
  assert.ok(p.verdict, 'la partie témoin n’a pas fini');
  assert.equal(p.verdict!.issue, 'attacker', 'le niveau 10 menait les assaillants');
});

essai('mesure appariée : le connétable domine le palefrenier des deux côtés', () => {
  // La première version de ce contrôle faisait alterner les camps et
  // comptait les victoires. Elle a échoué le 2026-09-01 pour une raison
  // qui n'était pas la force de la machine : au Brandubh, le petit
  // damier de sept sur sept donne la partie aux défenseurs quel que
  // soit le niveau, et le compte ne mesurait donc que ce déséquilibre.
  //
  // La mesure appariée règle la question. La MÊME graine se joue deux
  // fois, une fois avec le connétable aux assaillants, une fois avec
  // lui aux défenseurs. Un camp qui gagne tout seul rend un point de
  // chaque côté, donc trois sur six pour trois paires : c'est le
  // neutre. Au-dessus, la marche la plus haute a fait la différence.
  const debut = Date.now();
  const point = (issue: string, camp: Side) =>
    (issue === camp ? 1 : issue === 'nulle' ? 0.5 : 0);

  for (const [regleId, plancher] of [['copenhague', 5.5], ['brandubh', 3.5]] as Array<[string, number]>) {
    let score = 0;
    for (let i = 0; i < 3; i++) {
      const graineN = 4700 + i * 137;
      const commun = { regleId, graineN, noeudsMax: 12_000, plisMax: 160 };
      const a = jouerPartie({ ...commun, attaquant: 10, defenseur: 3 });
      const b = jouerPartie({ ...commun, attaquant: 3, defenseur: 10 });
      const pa = point(a.verdict?.issue ?? 'nulle', 'attacker');
      const pb = point(b.verdict?.issue ?? 'nulle', 'defender');
      score += pa + pb;
      console.log(
        `      ${regleId} paire ${i + 1} : le dix attaque (${a.verdict?.issue ?? 'nulle'}, ${a.plis} plis)`
        + ` puis défend (${b.verdict?.issue ?? 'nulle'}, ${b.plis} plis) · ${pa + pb} sur 2`,
      );
    }
    console.log(`      ${regleId} : score apparié ${score} sur 6, le neutre est à 3`);
    assert.ok(
      score >= plancher,
      `le niveau 10 ne marque que ${score} sur 6 au ${regleId}, le neutre étant à 3`,
    );
  }
  console.log(`      mesuré en ${((Date.now() - debut) / 1000).toFixed(1)} s`);
});

essai('aucune partie ne s’éternise : l’arbitre finit toujours par trancher', () => {
  for (const regleId of ['copenhague', 'brandubh']) {
    const p = jouerPartie({
      regleId, attaquant: 2, defenseur: 2,
      graineN: 99, noeudsMax: 2_000, plisMax: 400,
    });
    assert.ok(p.verdict, `${regleId} : la partie a tapé le plafond des 400 demi-coups`);
  }
});

console.log(`\n${faits} essais passés.`);
