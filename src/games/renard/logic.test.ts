// ─── Le contrôle de la règle ────────────────────────────────────────
// Alex, 2026-08-30 : la logique du jeu se vérifie au terminal, sans
// navigateur et sans scène 3D.
//
//   npx tsx "src/games/renard/logic.test.ts"
//
// Aucun cadre de test installé : des assertions du module `assert` de
// Node, et un compte des réussites à la fin.

import assert from 'node:assert/strict';
import {
  CENTRE, NB_POINTS, POINTS, coupsPossibles, jouer, nbOies, plateauInitial,
  pointDe, positionRenard, reglement, verdict, type Occupant, type Plateau,
} from './logic';
import { choisirCoup, evaluer } from './cpu';

let reussis = 0;
const cas = (nom: string, corps: () => void) => {
  corps();
  reussis++;
  console.log(`  ok  ${nom}`);
};

/** Un plateau vide, pour poser une position à la main. */
const vide = (): Occupant[] => new Array(NB_POINTS).fill(null);
const pose = (p: Occupant[], r: number, c: number, quoi: Occupant): void => {
  const i = pointDe(r, c);
  assert.ok(i >= 0, `le point (${r},${c}) n'est pas sur la croix`);
  p[i] = quoi;
};

console.log('Le Renard et les Oies : la règle');

cas('la croix compte 33 points et les quatre coins manquent', () => {
  assert.equal(NB_POINTS, 33);
  assert.equal(POINTS.length, 33);
  assert.equal(pointDe(0, 0), -1);
  assert.equal(pointDe(6, 6), -1);
  assert.equal(pointDe(1, 5), -1);
  assert.ok(pointDe(0, 3) >= 0);
  assert.ok(pointDe(3, 0) >= 0);
});

cas('la mise en place donne 13 oies, ou 17 dans la forme tardive', () => {
  const ancienne = plateauInitial('oies13');
  assert.equal(nbOies(ancienne), 13);
  assert.equal(positionRenard(ancienne), CENTRE);
  const tardive = plateauInitial('oies17');
  assert.equal(nbOies(tardive), 17);
  assert.equal(positionRenard(tardive), CENTRE);
});

cas('au premier coup le renard a quatre pas et aucune prise', () => {
  const p = plateauInitial('oies13');
  const coups = coupsPossibles(p, 'renard', 'oies13');
  assert.equal(coups.length, 4);
  assert.ok(coups.every((c) => c.prises.length === 0));
});

cas('les oies reculent dans la forme ancienne, jamais dans la tardive', () => {
  const p = vide();
  pose(p, 3, 3, 'renard');
  pose(p, 4, 3, 'oie');
  // Une seule oie au milieu de la croix : haut occupé par le renard,
  // donc gauche, droite et bas.
  const ancienne = coupsPossibles(p, 'oies', 'oies13');
  assert.equal(ancienne.length, 3);
  const tardive = coupsPossibles(p, 'oies', 'oies17');
  assert.equal(tardive.length, 2);
  assert.ok(tardive.every((c) => POINTS[c.vers].r <= POINTS[c.de].r));
});

cas('le renard saute une oie voisine vers le point libre derrière', () => {
  const p = vide();
  pose(p, 3, 3, 'renard');
  pose(p, 4, 3, 'oie');
  const saut = coupsPossibles(p, 'renard', 'oies13').find((c) => c.prises.length === 1);
  assert.ok(saut, 'le saut doit exister');
  assert.equal(saut.vers, pointDe(5, 3));
  const apres = jouer(p, saut);
  assert.equal(nbOies(apres), 0);
  assert.equal(positionRenard(apres), pointDe(5, 3));
});

cas('le renard n’enjambe pas une oie adossée à une autre pièce', () => {
  const p = vide();
  pose(p, 3, 3, 'renard');
  pose(p, 4, 3, 'oie');
  pose(p, 5, 3, 'oie');
  assert.equal(coupsPossibles(p, 'renard', 'oies13').filter((c) => c.prises.length > 0).length, 0);
});

cas('les sauts s’enchaînent dans le même tour', () => {
  // Le renard part de (3,1) et remonte la rangée du milieu : il saute
  // (3,2) pour se poser en (3,3), puis (3,4) pour finir en (3,5).
  const q = vide();
  pose(q, 3, 1, 'renard');
  pose(q, 3, 2, 'oie');   // saut vers (3,3)
  pose(q, 3, 4, 'oie');   // puis saut vers (3,5)
  const coups = coupsPossibles(q, 'renard', 'oies13');
  const chaine = coups.find((c) => c.prises.length === 2);
  assert.ok(chaine, 'la chaîne de deux sauts doit exister');
  assert.equal(chaine.vers, pointDe(3, 5));
  assert.deepEqual(chaine.etapes, [pointDe(3, 3), pointDe(3, 5)]);
  // L'arrêt en route reste offert : la prise n'est pas obligatoire.
  assert.ok(coups.some((c) => c.prises.length === 1 && c.vers === pointDe(3, 3)));
  const apres = jouer(q, chaine);
  assert.equal(nbOies(apres), 0);
});

cas('les oies gagnent quand le renard est immobilisé', () => {
  const p = vide();
  pose(p, 0, 2, 'renard');
  // Les deux voisins du coin de bras sont pris, et les deux points
  // d'atterrissage derrière eux aussi : plus de pas, plus de saut.
  pose(p, 0, 3, 'oie');
  pose(p, 0, 4, 'oie');
  pose(p, 1, 2, 'oie');
  pose(p, 2, 2, 'oie');
  // Assez d'oies ailleurs pour que le seuil ne donne pas la victoire
  // au renard avant que l'étau ne soit constaté.
  for (const c of [2, 3, 4]) pose(p, 5, c, 'oie');
  pose(p, 6, 3, 'oie');
  assert.ok(nbOies(p) > reglement('oies13').seuilRenard);
  assert.equal(coupsPossibles(p, 'renard', 'oies13').length, 0);
  assert.equal(verdict(p, 'renard', 'oies13'), 'oies');
});

cas('le renard gagne dès qu’il ne reste que cinq oies', () => {
  const p = vide();
  pose(p, 3, 3, 'renard');
  for (const c of [0, 1, 5, 6]) pose(p, 3, c, 'oie');
  pose(p, 6, 3, 'oie');
  assert.equal(nbOies(p), 5);
  assert.equal(verdict(p, 'oies', 'oies13'), 'renard');
});

cas('une position ouverte n’a pas encore de vainqueur', () => {
  const p = plateauInitial('oies13');
  assert.equal(verdict(p, 'oies', 'oies13'), null);
  assert.equal(verdict(p, 'renard', 'oies13'), null);
});

cas('jouer ne modifie jamais le plateau reçu', () => {
  const p = plateauInitial('oies13');
  const avant = [...p];
  const coup = coupsPossibles(p, 'oies', 'oies13')[0];
  jouer(p, coup);
  assert.deepEqual([...p], avant);
});

cas('les oies moyennes refusent d’offrir une oie au renard', () => {
  // Le renard en (3,3). Une oie en (5,3) peut monter en (4,3), ce qui
  // l'offre au saut vers (5,3). Elle a un pas de côté sans danger.
  const p = vide();
  pose(p, 3, 3, 'renard');
  pose(p, 5, 3, 'oie');
  for (const c of [2, 3, 4]) pose(p, 6, c, 'oie');
  pose(p, 5, 2, 'oie');
  pose(p, 5, 4, 'oie');
  pose(p, 4, 2, 'oie');
  pose(p, 4, 4, 'oie');
  const coup = choisirCoup(p, 'oies', 'oies13', 'moyen');
  assert.ok(coup, 'les oies doivent trouver un coup');
  const apres = jouer(p, coup);
  const offert = coupsPossibles(apres, 'renard', 'oies13').some((c) => c.prises.length > 0);
  assert.equal(offert, false, 'aucune oie ne doit être laissée sautable');
});

cas('le renard glouton ramasse la prise qu’on lui tend', () => {
  const p = vide();
  pose(p, 3, 3, 'renard');
  pose(p, 4, 3, 'oie');
  for (const c of [2, 3, 4]) { pose(p, 6, c, 'oie'); pose(p, 5, c, 'oie'); }
  p[pointDe(5, 3)] = null;   // le point derrière l'oie reste libre
  for (const d of ['moyen', 'difficile'] as const) {
    const coup = choisirCoup(p, 'renard', 'oies13', d);
    assert.ok(coup, `le renard doit jouer en ${d}`);
    assert.ok(coup.prises.length > 0, `le renard doit prendre en ${d}`);
  }
});

cas('l’évaluation préfère un troupeau maigre et un renard libre', () => {
  const plein = plateauInitial('oies13') as Plateau;
  const maigre = (() => {
    const q = [...plein] as Occupant[];
    let retires = 0;
    for (let i = 0; i < q.length && retires < 4; i++) {
      if (q[i] === 'oie') { q[i] = null; retires++; }
    }
    return q as Plateau;
  })();
  assert.ok(evaluer(maigre, 'oies13') > evaluer(plein, 'oies13'));
});

cas('une partie entière contre l’ordinateur se termine', () => {
  let p: Plateau = plateauInitial('oies13');
  let tour: 'renard' | 'oies' = 'oies';
  let coups = 0;
  while (verdict(p, tour, 'oies13') === null && coups < 400) {
    const choix = choisirCoup(p, tour, 'oies13', tour === 'renard' ? 'moyen' : 'facile');
    assert.ok(choix, 'un coup légal doit exister tant que la partie dure');
    p = jouer(p, choix);
    tour = tour === 'renard' ? 'oies' : 'renard';
    coups++;
  }
  assert.ok(coups < 400, 'la partie ne doit pas tourner en rond indéfiniment');
  assert.ok(verdict(p, tour, 'oies13') !== null, 'la partie doit avoir un vainqueur');
});

console.log(`\n${reussis} contrôles passés.`);
