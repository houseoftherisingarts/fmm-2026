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
  pointDe, positionRenard, reglement, verdict, coupEnTexte, coupDepuisTexte,
  type Camp, type Coup, type Occupant, type Plateau, type Variante,
} from './logic';
import { adaptateurRenard, choisirCoup, choisirCoupNiveau, evaluer } from './cpu';
import {
  PLAFOND_DEMI_COUPS, SEUIL_BASSE_COUR, aUnCoup, avanceDuTroupeau, etatDepuis,
  etatInitial, jouerArbitre, texteEvenement, trainarde, verdictArbitre,
  type EtatRenard, type EvenementArbitre,
} from './arbitre';
import { graine } from '../moteur/hasard';
import type { Niveau } from '../moteur/niveaux';

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

cas('au premier coup le renard a trois pas et aucune prise', () => {
  // Le quatrième voisin porte une oie, et le point derrière elle en
  // porte une autre : le saut est fermé dès la mise en place.
  const p = plateauInitial('oies13');
  const coups = coupsPossibles(p, 'renard', 'oies13');
  assert.equal(coups.length, 3);
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

// ── Le texte des coups, pour les parties en ligne ────────────────────
// La partie à deux ne partage que cette liste. Un saut relu doit
// retrouver ses étapes, sinon l'animation saute des oies.
cas('une partie entière survit à l’aller-retour par le texte', () => {
  let ici: Plateau = plateauInitial('oies13');
  let laBas: Plateau = plateauInitial('oies13');
  let tour: 'renard' | 'oies' = 'oies';
  let coups = 0;
  while (verdict(ici, tour, 'oies13') === null && coups < 400) {
    const choix = choisirCoup(ici, tour, 'oies13', 'facile');
    assert.ok(choix);
    const texte = coupEnTexte(choix);
    // L'autre bout relit le coup sur SA planche, sans rien recevoir
    // d'autre : c'est ce qui prouve que le texte suffit.
    const relu = coupDepuisTexte(texte, laBas, tour, 'oies13');
    assert.ok(relu, `coup illisible : ${texte}`);
    assert.deepEqual(relu.etapes, choix.etapes, `étapes perdues : ${texte}`);
    ici = jouer(ici, choix);
    laBas = jouer(laBas, relu);
    assert.deepEqual(laBas, ici, `divergence au coup ${coups}`);
    tour = tour === 'renard' ? 'oies' : 'renard';
    coups++;
  }
  assert.ok(coups > 4);
  assert.equal(coupDepuisTexte('0>1', plateauInitial('oies13'), 'oies', 'oies13'), null);
});

// ─── L'arbitre de la basse-cour ──────────────────────────────────────
// Alex, 2026-09-01 : « les oies se cachent dans un coin, n'essaient même
// plus de gagner et bloquent la partie. » Ce qui suit le rend impossible.

console.log('\nL’arbitre de la basse-cour');

/** Le coup légal d'un point à l'autre, sans prise. */
const pas = (e: EtatRenard, de: [number, number], vers: [number, number]): Coup => {
  const [a, b] = [pointDe(de[0], de[1]), pointDe(vers[0], vers[1])];
  const trouve = coupsPossibles(e.plateau, e.tour, e.variante)
    .find((c) => c.de === a && c.vers === b && c.prises.length === 0);
  assert.ok(trouve, `le pas (${de}) vers (${vers}) doit être légal`);
  return trouve;
};

/** Le campement d'Alex : neuf oies serrées en bas, le renard seul en haut. */
const campement = (): Occupant[] => {
  const p = vide();
  pose(p, 0, 2, 'renard');
  for (const c of [2, 3, 4]) { pose(p, 5, c, 'oie'); pose(p, 6, c, 'oie'); }
  for (const c of [0, 1, 2]) pose(p, 4, c, 'oie');
  return p;
};

/** Le renard au centre, une oie sautable devant lui, le point d'arrivée libre. */
const oieOfferte = (): Occupant[] => {
  const p = vide();
  pose(p, 3, 3, 'renard');
  pose(p, 4, 3, 'oie');
  for (const c of [2, 3, 4]) pose(p, 6, c, 'oie');
  for (const [r, c] of [[5, 2], [5, 4], [4, 1], [4, 5]]) pose(p, r, c, 'oie');
  return p;
};

cas('le raccourci « a-t-il un coup » dit la même chose que la liste complète', () => {
  // `aUnCoup` double la règle pour aller vite, et une divergence entre
  // les deux ferait déclarer des victoires imaginaires.
  const alea = graine(7);
  let controles = 0;
  for (const v of ['oies13', 'oies17'] as const) {
    let p: Plateau = plateauInitial(v);
    let tour: Camp = 'oies';
    for (let i = 0; i < 200; i++) {
      for (const camp of ['renard', 'oies'] as const) {
        assert.equal(aUnCoup(p, camp, v), coupsPossibles(p, camp, v).length > 0);
        controles++;
      }
      const coups = coupsPossibles(p, tour, v);
      if (coups.length === 0) break;
      p = jouer(p, coups[Math.floor(alea() * coups.length)]);
      tour = tour === 'renard' ? 'oies' : 'renard';
    }
  }
  assert.ok(controles > 400, `${controles} comparaisons, ce n'est pas assez`);
});

cas('la traînarde est bien l’oie la plus basse', () => {
  const p = campement();
  const perdue = trainarde(p);
  assert.ok(perdue >= 0);
  p.forEach((occ, i) => {
    if (occ !== 'oie') return;
    assert.ok(POINTS[i].r <= POINTS[perdue].r, 'aucune oie ne doit être plus bas');
    if (POINTS[i].r === POINTS[perdue].r) assert.ok(i <= perdue, 'puis le plus grand numéro');
  });
});

cas('les oies qui campent finissent mangées', () => {
  // Le renard tourne sur un circuit de huit points, les oies font
  // l'aller-retour. Personne ne monte, et rien ne revient trois fois.
  const tourDuRenard: Array<[number, number]> = [
    [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [2, 3], [2, 2], [1, 2],
  ];
  const allerRetour: Array<[number, number]> = [[4, 2], [4, 3]];
  let e = etatDepuis(campement(), 'oies', 'oies13');
  const avanceDeDepart = e.avanceRecord;
  let dernier: EvenementArbitre | null = null;

  for (let k = 0; k < SEUIL_BASSE_COUR; k++) {
    const oies = jouerArbitre(e, pas(e, allerRetour[k % 2], allerRetour[(k + 1) % 2]));
    e = oies.etat;
    dernier = oies.evenement;
    assert.equal(e.avanceRecord, avanceDeDepart, 'les oies ne montent pas');
    if (dernier !== null || e.verdict !== null) break;
    assert.equal(e.sansProgres, k + 1, `le compteur doit valoir ${k + 1}`);
    e = jouerArbitre(e, pas(e, tourDuRenard[k % 8], tourDuRenard[(k + 1) % 8])).etat;
  }
  assert.equal(dernier, 'oie-punie', 'la douzième fois, la traînarde y passe');
  assert.equal(e.punies, 1);
  assert.equal(nbOies(e.plateau), 8, 'une oie de moins sur la planche');
  assert.equal(e.sansProgres, 0, 'le compteur repart après la punition');
  assert.equal(texteEvenement('oie-punie', true), 'La traînarde s’est fait croquer.');
  assert.equal(texteEvenement('oie-punie', false), 'The straggler was snapped up.');
});

cas('le compteur repart après une prise du renard', () => {
  const e: EtatRenard = { ...etatDepuis(oieOfferte(), 'renard', 'oies13'), sansProgres: 7 };
  const saut = coupsPossibles(e.plateau, 'renard', 'oies13').find((c) => c.prises.length === 1);
  assert.ok(saut, 'le renard doit avoir un saut');
  const apres = jouerArbitre(e, saut);
  assert.equal(apres.evenement, null);
  assert.equal(apres.etat.sansProgres, 0, 'une oie croquée remet le compteur à zéro');
  assert.equal(nbOies(apres.etat.plateau), 7);
});

cas('la répétition triple rend la partie nulle', () => {
  // Le même aller-retour des deux côtés : la position revient tous les
  // deux coups, et la troisième fois close la partie.
  const oies: Array<[number, number]> = [[4, 2], [4, 3]];
  const renard: Array<[number, number]> = [[0, 2], [0, 3]];
  let e = etatDepuis(campement(), 'oies', 'oies13');
  let dernier: EvenementArbitre | null = null;

  for (let k = 0; k < SEUIL_BASSE_COUR && e.verdict === null; k++) {
    const a = jouerArbitre(e, pas(e, oies[k % 2], oies[(k + 1) % 2]));
    e = a.etat;
    if (a.evenement !== null) dernier = a.evenement;
    if (e.verdict !== null) break;
    const b = jouerArbitre(e, pas(e, renard[k % 2], renard[(k + 1) % 2]));
    e = b.etat;
    if (b.evenement !== null) dernier = b.evenement;
  }
  assert.equal(verdictArbitre(e), 'nulle');
  assert.equal(dernier, 'nulle-repetition');
  assert.ok(e.sansProgres < SEUIL_BASSE_COUR, 'la nulle arrive avant la punition');
});

cas('le plafond des quatre cents demi-coups rend la partie nulle', () => {
  const e: EtatRenard = {
    ...etatDepuis(campement(), 'oies', 'oies13'),
    demiCoups: PLAFOND_DEMI_COUPS - 1,
  };
  const fin = jouerArbitre(e, pas(e, [4, 2], [4, 3]));
  assert.equal(fin.evenement, 'nulle-plafond');
  assert.equal(verdictArbitre(fin.etat), 'nulle');
  assert.ok(texteEvenement('nulle-plafond', false).includes('draw'));
});

cas('deux clients qui rejouent la même liste de coups tombent sur le même état', () => {
  // La promesse de l'arbitre. Le second client ne reçoit que du texte.
  const alea = graine(4242);
  let ici = etatInitial('oies13');
  const liste: string[] = [];
  while (verdictArbitre(ici) === null && liste.length < 60) {
    const coup = choisirCoupNiveau(ici, 4, { alea, noeudsMax: 2_000 });
    assert.ok(coup, 'un coup doit exister tant que la partie dure');
    liste.push(coupEnTexte(coup));
    ici = jouerArbitre(ici, coup).etat;
  }
  assert.ok(liste.length > 10, `${liste.length} coups, la partie est trop courte`);
  let laBas = etatInitial('oies13');
  for (const texte of liste) {
    const relu = coupDepuisTexte(texte, laBas.plateau, laBas.tour, laBas.variante);
    assert.ok(relu, `coup illisible : ${texte}`);
    laBas = jouerArbitre(laBas, relu).etat;
  }
  assert.deepEqual(laBas, ici, 'les deux bouts doivent tomber sur le même état');
});

// ─── L'adaptateur et le moteur commun ────────────────────────────────
// Le piège du chantier : le moteur compte du point de vue du camp qui a
// le trait, l'ancienne évaluation comptait du point de vue du renard.
// Se tromper de signe fait jouer les oies POUR le renard.

cas('l’adaptateur note la position du camp qui a le trait, pas celle du renard', () => {
  const p = oieOfferte();
  const a = adaptateurRenard('oies13');
  const auRenard = a.evaluer(etatDepuis(p, 'renard', 'oies13'));
  assert.equal(a.evaluer(etatDepuis(p, 'oies', 'oies13')), -auRenard);
  // L'ancienne signature garde sa convention à elle : le renard.
  assert.equal(evaluer(p, 'oies13'), auRenard);
  const saut = coupsPossibles(p, 'renard', 'oies13').find((c) => c.prises.length === 1);
  assert.ok(saut, 'le renard doit avoir un saut');
  assert.ok(
    evaluer(jouer(p, saut), 'oies13') > evaluer(p, 'oies13'),
    'croquer une oie doit améliorer la position du renard',
  );
});

cas('l’adaptateur ne joue pas contre lui-même', () => {
  // Chacun des deux camps, mis devant la même planche, doit choisir le
  // coup de SON camp. Le connétable les joue tous les deux : il est le
  // seul sans fenêtre ni bévue, donc sans hasard.
  const p = oieOfferte();
  const coupRenard = choisirCoupNiveau(etatDepuis(p, 'renard', 'oies13'), 10, { noeudsMax: 20_000 });
  assert.ok(coupRenard, 'le renard doit jouer');
  assert.ok(coupRenard.prises.length > 0, 'le renard prend l’oie qu’on lui tend');
  const coupOies = choisirCoupNiveau(etatDepuis(p, 'oies', 'oies13'), 10, { noeudsMax: 20_000 });
  assert.ok(coupOies, 'les oies doivent jouer aussi');
  const encoreOffert = coupsPossibles(jouer(p, coupOies), 'renard', 'oies13')
    .some((c) => c.prises.length > 0);
  assert.equal(encoreOffert, false, 'les oies mettent l’oie hors de portée');
});

// ─── Le banc d'essai ─────────────────────────────────────────────────
// Une partie entière, machine contre machine, avec graine fixe et
// plafond de nœuds : elle se rejoue à l'identique d'un ordinateur à
// l'autre, là où une horloge la rendrait dépendante de la machine.

const NOEUDS_BANC = 12_000;

function duel(niveauRenard: Niveau, niveauOies: Niveau, v: Variante, g: number): EtatRenard {
  const alea = graine(g);
  let e = etatInitial(v);
  while (verdictArbitre(e) === null) {
    const niveau = e.tour === 'renard' ? niveauRenard : niveauOies;
    const coup = choisirCoupNiveau(e, niveau, { alea, noeudsMax: NOEUDS_BANC });
    if (!coup) break;
    e = jouerArbitre(e, coup).etat;
  }
  return e;
}

cas('le niveau 10 bat le niveau 3 sur cinq parties d’affilée', () => {
  // Le fort change de camp : gagner toujours du même côté ne prouverait
  // que le déséquilibre du jeu.
  const bancs: Array<[Camp, Variante, number]> = [
    ['renard', 'oies13', 1], ['oies', 'oies17', 2], ['renard', 'oies17', 3],
    ['oies', 'oies13', 4], ['renard', 'oies13', 5],
  ];
  const debut = Date.now();
  for (const [fort, v, g] of bancs) {
    const e = fort === 'renard' ? duel(10, 3, v, g) : duel(3, 10, v, g);
    console.log(
      `      ${v} · le fort tient les ${fort} · ${e.verdict} en ${e.demiCoups} demi-coups`
      + ` · ${e.punies} oie(s) punie(s)`,
    );
    assert.equal(e.verdict, fort, `le niveau 10 doit gagner (${v}, graine ${g})`);
  }
  console.log(`      cinq parties en ${((Date.now() - debut) / 1000).toFixed(1)} s`);
});

cas('deux connétables se battent vraiment, sans campement ni blocage', () => {
  // La preuve directe de la plainte d'Alex : au bout de quarante
  // demi-coups les oies ont gagné du terrain, sans punition pour les y pousser.
  const alea = graine(11);
  let e = etatInitial('oies13');
  const avanceDeDepart = avanceDuTroupeau(e.plateau);
  for (let i = 0; i < 40 && verdictArbitre(e) === null; i++) {
    const coup = choisirCoupNiveau(e, 10, { alea, noeudsMax: NOEUDS_BANC });
    assert.ok(coup);
    e = jouerArbitre(e, coup).etat;
  }
  console.log(
    `      avance ${avanceDeDepart} au départ, record ${e.avanceRecord},`
    + ` ${e.punies} oie(s) punie(s), ${nbOies(e.plateau)} oies debout`,
  );
  assert.ok(e.avanceRecord > avanceDeDepart, 'les oies doivent avoir gagné du terrain');
  assert.equal(e.punies, 0, 'aucune punition ne doit être nécessaire quand les deux jouent');
});

console.log(`\n${reussis} contrôles passés.`);
