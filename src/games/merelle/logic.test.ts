// ─── Le banc d'essai de la Mérelle ──────────────────────────────────
// Alex, 2026-08-30 : pas de cadre de test dans ce dépôt, et pas besoin.
// Un fichier qui s'exécute, des assertions, un décompte à la fin :
//
//   npx tsx src/games/merelle/logic.test.ts
//
// Il couvre ce qui casse vraiment quand on touche aux règles : le
// moulin, le pion protégé, le vol à trois pions, le blocage, la fin de
// partie, et l'ordinateur qui doit voir le moulin sous son nez.

import assert from 'node:assert/strict';
import {
  LIGNES, POSITIONS, aPoserDe, autreCamp, compte, coupsLegaux, deplacementsDe,
  destinations, estDansMoulin, etatInitial, jouer, moulins, phaseDe,
  retraitsPossibles, voisins, coupEnTexte, coupDepuisTexte,
  type Camp, type Case, type Etat,
} from './logic';
import { choisirCoup } from './cpu';
import type { Coup } from './logic';

let faits = 0;
function essai(nom: string, corps: () => void): void {
  corps();
  faits++;
  console.log(`  ok  ${nom}`);
}

/** Monte un état à la main. `clair` et `sombre` sont des listes de
 *  points, et rien n'est laissé en main sauf mention contraire. */
function poser(clair: number[], sombre: number[], reste: [number, number] = [0, 0], tour: Camp = 1): Etat {
  const points = Array(24).fill(0) as Case[];
  for (const p of clair) points[p] = 1;
  for (const p of sombre) points[p] = 2;
  return { points, tour, aPoser: reste, doitRetirer: false, vol: true, gagnant: null };
}

// ── La géométrie du plateau ──────────────────────────────────────────

essai('vingt-quatre points, seize alignements, seize positions distinctes', () => {
  assert.equal(POSITIONS.length, 24);
  assert.equal(LIGNES.length, 16);
  const vues = new Set(POSITIONS.map(([x, z]) => `${x},${z}`));
  assert.equal(vues.size, 24, 'deux points ne peuvent pas partager une case');
});

essai('aucun alignement ne passe par le centre vide du plateau', () => {
  for (const l of LIGNES) {
    const pos = l.map((p) => POSITIONS[p]);
    const memeLigne = pos.every(([, z]) => z === pos[0][1]);
    const memeColonne = pos.every(([x]) => x === pos[0][0]);
    assert.ok(memeLigne || memeColonne, `alignement en diagonale : ${l}`);
  }
});

essai('le voisinage est symétrique et va de deux à quatre', () => {
  for (let p = 0; p < 24; p++) {
    const v = voisins(p);
    assert.ok(v.length >= 2 && v.length <= 4, `point ${p} : ${v.length} voisins`);
    for (const q of v) assert.ok(voisins(q).includes(p), `${p}-${q} à sens unique`);
  }
  // Les quatre milieux des côtés extérieurs touchent trois points.
  assert.equal(voisins(1).length, 3);
  // Le milieu d'un côté du carré du milieu en touche quatre.
  assert.equal(voisins(4).length, 4);
});

// ── La pose ──────────────────────────────────────────────────────────

essai('la partie ouvre sur neuf pions en main de chaque côté', () => {
  const e = etatInitial();
  assert.equal(aPoserDe(e, 1), 9);
  assert.equal(aPoserDe(e, 2), 9);
  assert.equal(coupsLegaux(e).length, 24);
  assert.equal(phaseDe(e, 1), 'pose');
});

essai('poser rend la main à l\'autre camp', () => {
  const apres = jouer(etatInitial(), { type: 'pose', vers: 4 });
  assert.equal(apres.points[4], 1);
  assert.equal(apres.tour, 2);
  assert.equal(aPoserDe(apres, 1), 8);
});

essai('un point occupé refuse la pose et l\'état ne bouge pas', () => {
  const e = jouer(etatInitial(), { type: 'pose', vers: 4 });
  const encore = jouer(e, { type: 'pose', vers: 4 });
  assert.equal(encore, e, 'un coup illégal doit rendre l\'état d\'origine');
});

// ── Le moulin ────────────────────────────────────────────────────────

essai('fermer un alignement garde la main et ouvre le retrait', () => {
  const e = poser([0, 1], [9, 10], [7, 7], 1);
  const apres = jouer(e, { type: 'pose', vers: 2 });
  assert.ok(estDansMoulin(apres.points, 2));
  assert.equal(apres.doitRetirer, true);
  assert.equal(apres.tour, 1, 'le joueur garde la main pour retirer');
  assert.deepEqual(coupsLegaux(apres).map((c) => c.type), ['retrait', 'retrait']);
});

essai('le retrait rend la main et le pion disparaît', () => {
  const e = poser([0, 1], [9, 10], [7, 7], 1);
  const moulin = jouer(e, { type: 'pose', vers: 2 });
  const apres = jouer(moulin, { type: 'retrait', p: 9 });
  assert.equal(apres.points[9], 0);
  assert.equal(apres.doitRetirer, false);
  assert.equal(apres.tour, 2);
});

essai('un pion en moulin est protégé tant qu\'il en reste un dehors', () => {
  // Le sombre tient un moulin (9-10-11) et garde un pion isolé en 23.
  const e = poser([0, 1, 3], [9, 10, 11, 23], [6, 5], 1);
  const moulin = jouer(e, { type: 'pose', vers: 2 });
  assert.deepEqual(retraitsPossibles(moulin), [23]);
  assert.equal(jouer(moulin, { type: 'retrait', p: 10 }), moulin, 'le moulin est intouchable');
});

essai('tous les pions adverses en moulin : le moulin devient prenable', () => {
  const e = poser([0, 1, 3], [9, 10, 11], [6, 6], 1);
  const moulin = jouer(e, { type: 'pose', vers: 2 });
  assert.deepEqual(retraitsPossibles(moulin), [9, 10, 11]);
});

essai('rouvrir puis refermer le même moulin donne bien un second retrait', () => {
  // 0-1-2 est fermé, le pion 2 sort en 5 puis revient : moulin de nouveau.
  const e = poser([0, 1, 2], [9, 21, 23], [0, 0], 1);
  const sorti = jouer(e, { type: 'deplacement', de: 2, vers: 14 });
  assert.equal(sorti.doitRetirer, false);
  const retour = jouer({ ...sorti, tour: 1 }, { type: 'deplacement', de: 14, vers: 2 });
  assert.equal(retour.doitRetirer, true);
});

// ── Le déplacement et le vol ─────────────────────────────────────────

essai('un pion glisse vers un point voisin libre, jamais plus loin', () => {
  const e = poser([4], [21, 23, 9, 14], [0, 0], 1);
  const d = destinations(e, 4).sort((a, b) => a - b);
  assert.deepEqual(d, [1, 3, 5, 7]);
  assert.equal(jouer(e, { type: 'deplacement', de: 4, vers: 22 }), e, 'pas de saut hors variante');
});

essai('à trois pions, le vol ouvre tout le plateau', () => {
  const e = poser([0, 1, 2], [10, 21, 23], [0, 0], 1);
  assert.equal(phaseDe(e, 1), 'vol');
  assert.ok(destinations(e, 0).includes(17), 'le vol atteint le carré du milieu');
  const sans = { ...e, vol: false };
  assert.equal(phaseDe(sans, 1), 'deplacement');
  assert.deepEqual(destinations(sans, 0), [9], 'sans le vol, il ne reste que le voisin libre');
});

essai('la variante du vol se coupe et le camp reste enfermé', () => {
  // Les trois pions clairs tiennent 0, 1, 2; leurs seules sorties (9, 4,
  // 14) sont bouchées. Avec le vol, ils s'échapperaient encore.
  const e = { ...poser([0, 1, 2], [9, 4, 14], [0, 0], 1), vol: false };
  assert.equal(deplacementsDe(e, 1).length, 0);
});

// ── La fin de partie ─────────────────────────────────────────────────

essai('tomber à deux pions fait perdre', () => {
  // Le clair ferme 0-1-2 et retire le troisième pion du sombre.
  const e = poser([0, 1], [9, 10, 23], [7, 7], 1);
  const sansMain = { ...e, aPoser: [0, 0] as [number, number] };
  const moulin = jouer(sansMain, { type: 'pose', vers: 2 });
  assert.equal(moulin, sansMain, 'plus rien en main : la pose est refusée');

  const e2 = poser([0, 1, 5], [9, 10, 23], [0, 0], 1);
  const ferme = jouer(e2, { type: 'deplacement', de: 5, vers: 2 });
  assert.equal(ferme.doitRetirer, true);
  const fin = jouer(ferme, { type: 'retrait', p: 23 });
  assert.equal(compte(fin.points, 2), 2);
  assert.equal(fin.gagnant, 1);
  assert.deepEqual(coupsLegaux(fin), []);
});

essai('un camp qui ne peut plus bouger perd', () => {
  // Le sombre tient le bas du grand carré (21, 22, 23). Ses trois
  // sorties (9, 19, 14) sont tenues par le clair, et le vol est coupé.
  const e: Etat = { ...poser([9, 19, 14, 16], [21, 22, 23], [0, 0], 1), vol: false };
  assert.equal(deplacementsDe(e, 2).length, 0);
  const apres = jouer(e, { type: 'deplacement', de: 16, vers: 15 });
  assert.equal(apres.gagnant, 1);
});

essai('la pose ne fait jamais perdre, même à deux pions sur le plateau', () => {
  const e = poser([0], [9], [8, 8], 1);
  const apres = jouer(e, { type: 'pose', vers: 1 });
  assert.equal(apres.gagnant, null);
});

// ── L'ordinateur ─────────────────────────────────────────────────────

essai('le moyen ferme le moulin qu\'il a sous la main', () => {
  const e = poser([0, 1], [9, 10], [7, 7], 1);
  const coup = choisirCoup(e, 'moyen');
  assert.deepEqual(coup, { type: 'pose', vers: 2 });
});

essai('le moyen bloque le moulin adverse quand il n\'a rien à fermer', () => {
  const e = poser([5], [9, 10], [7, 7], 1);
  const coup = choisirCoup(e, 'moyen');
  assert.deepEqual(coup, { type: 'pose', vers: 11 });
});

essai('le difficile ferme aussi le moulin, et retire un pion utile', () => {
  const e = poser([0, 1], [9, 10], [7, 7], 1);
  const coup = choisirCoup(e, 'difficile');
  assert.deepEqual(coup, { type: 'pose', vers: 2 });
  const apres = jouer(e, coup!);
  const retrait = choisirCoup(apres, 'difficile');
  assert.equal(retrait?.type, 'retrait');
});

essai('une partie complète ordinateur contre ordinateur se termine', () => {
  let e = etatInitial(true);
  let tours = 0;
  while (!e.gagnant && tours < 400) {
    const coup = choisirCoup(e, tours % 2 === 0 ? 'moyen' : 'facile');
    if (!coup) break;
    const avant = e;
    e = jouer(e, coup);
    assert.notEqual(e, avant, `coup refusé par les règles : ${JSON.stringify(coup)}`);
    tours++;
  }
  // Une partie qui tourne en rond est un vrai résultat de mérelle. Ce
  // qui compte : aucun coup illégal, et le plateau reste cohérent.
  assert.ok(tours > 18, 'la phase de pose seule fait dix-huit demi-coups');
  const total = compte(e.points, 1) + compte(e.points, 2);
  assert.ok(total <= 18 && total >= 4);
  for (const camp of [1, 2] as Camp[]) {
    assert.ok(moulins(e.points, camp) <= 3);
    assert.equal(autreCamp(autreCamp(camp)), camp);
  }
});

// ── Le texte des coups, pour les parties en ligne ────────────────────
// Une partie jouée à deux ne partage que cette liste : si l'aller-retour
// perd un coup, les deux plateaux divergent en silence.
essai('un coup écrit puis relu rend le même coup', () => {
  const coups: Coup[] = [
    { type: 'pose', vers: 0 },
    { type: 'pose', vers: 23 },
    { type: 'retrait', p: 7 },
    { type: 'deplacement', de: 3, vers: 10 },
  ];
  for (const c of coups) {
    assert.deepEqual(coupDepuisTexte(coupEnTexte(c)), c, coupEnTexte(c));
  }
  for (const brut of ['', 'x1', 'p', 'p99', 'd3', 'd3>', 'r-1']) {
    assert.equal(coupDepuisTexte(brut), null, brut);
  }
});

essai('une partie entière survit à l’aller-retour par le texte', () => {
  let ici = etatInitial(true);
  let laBas = etatInitial(true);
  let tours = 0;
  while (!ici.gagnant && tours < 300) {
    const coup = choisirCoup(ici, 'facile');
    if (!coup) break;
    ici = jouer(ici, coup);
    // L'autre bout ne reçoit que le texte, et rejoue dans son moteur.
    const relu = coupDepuisTexte(coupEnTexte(coup));
    assert.ok(relu, 'coup illisible');
    laBas = jouer(laBas, relu);
    assert.deepEqual(laBas.points, ici.points, `divergence au coup ${tours}`);
    assert.equal(laBas.tour, ici.tour);
    assert.equal(laBas.doitRetirer, ici.doitRetirer);
    tours++;
  }
  assert.ok(tours > 18);
});

console.log(`\n${faits} essais passés.`);
