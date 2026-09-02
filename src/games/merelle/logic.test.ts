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
import { choisirCoup, choisirCoupNiveau } from './cpu';
import {
  coupsArbitre, depuisJeu, jouerArbitre, texteArbitre, verdictArbitre,
  etatInitial as etatInitialArbitre, type EtatMerelle,
} from './arbitre';
import { graine } from '../moteur/hasard';
import type { Niveau } from '../moteur/niveaux';
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

/** Le plafond de nœuds du banc. Sans lui, le connétable réfléchit
 *  jusqu'à sa seconde et demie et le fichier prend plusieurs minutes;
 *  avec lui, il joue vite ET rend toujours exactement le même coup. */
const NOEUDS_BANC = 20_000;

/** Le coup du connétable, sans fenêtre ni bévue : il n'y a rien à
 *  tirer au sort, donc l'attente peut être exacte. */
function coupDuConnetable(e: Etat): Coup | null {
  return choisirCoupNiveau(depuisJeu(e), 10, { noeudsMax: NOEUDS_BANC });
}

essai('le connétable ferme le moulin qu\'il a sous la main', () => {
  const e = poser([0, 1], [9, 10], [7, 7], 1);
  assert.deepEqual(coupDuConnetable(e), { type: 'pose', vers: 2 });
});

essai('le connétable bloque le moulin adverse quand il n\'a rien à fermer', () => {
  const e = poser([5], [9, 10], [7, 7], 1);
  assert.deepEqual(coupDuConnetable(e), { type: 'pose', vers: 11 });
});

essai('le moulin fermé, le connétable enchaîne sur le retrait', () => {
  const e = poser([0, 1], [9, 10], [7, 7], 1);
  const coup = coupDuConnetable(e);
  assert.deepEqual(coup, { type: 'pose', vers: 2 });
  const apres = jouer(e, coup!);
  assert.equal(coupDuConnetable(apres)?.type, 'retrait');
});

essai('les trois anciennes difficultés rendent toujours un coup légal', () => {
  // La page de jeu appelle encore `choisirCoup`. Les petites marches
  // piochent au hasard, donc rien ne se prédit ici : ce qui se vérifie,
  // c'est que le coup rendu passe la règle.
  const e = poser([0, 1], [9, 10], [7, 7], 1);
  for (const d of ['facile', 'moyen', 'difficile'] as const) {
    const coup = choisirCoup(e, d);
    assert.ok(coup, `aucun coup au niveau ${d}`);
    assert.notEqual(jouer(e, coup!), e, `coup refusé au niveau ${d}`);
  }
  // `index.tsx` rappelle ensuite `choisirCoup` sur l'état qui doit un
  // retrait, le seul moment de la partie où la main ne change pas de camp.
  const apres = jouer(e, { type: 'pose', vers: 2 });
  assert.equal(apres.doitRetirer, true);
  for (const d of ['facile', 'moyen', 'difficile'] as const) {
    const retrait = choisirCoup(apres, d);
    assert.equal(retrait?.type, 'retrait', `le niveau ${d} ne retire pas`);
    assert.notEqual(jouer(apres, retrait!), apres, `retrait refusé au niveau ${d}`);
  }
  assert.equal(choisirCoup({ ...e, gagnant: 1 }, 'difficile'), null);
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

// ── L'arbitre : les deux nulles ──────────────────────────────────────
// Alex, 2026-09-01 : deux joueurs prudents peuvent glisser leurs pions
// jusqu'à la fin des temps. L'arbitre empile deux règles de tournoi
// par-dessus la règle du jeu, et ces deux règles doivent tomber au bon
// moment, ni avant ni jamais.

/** Deux circuits fermés qui ne se touchent pas et sur lesquels aucun
 *  moulin ne peut se fermer. Six points d'un côté, huit de l'autre : les
 *  deux promeneurs ne se retrouvent donc dans la même configuration
 *  qu'au bout de vingt-quatre tours, soit quarante-huit demi-coups. La
 *  règle des cinquante tombe avant la triple répétition, et c'est
 *  exactement ce que cet essai veut prouver. */
const CERCLE_CLAIR = [0, 1, 4, 3, 10, 9];
const CERCLE_SOMBRE = [6, 7, 8, 12, 17, 16, 15, 11];

essai('trois pions qui tournent en rond finissent en nulle au cinquantième demi-coup', () => {
  let e = depuisJeu({ ...poser([0, 21, 5], [6, 23, 19], [0, 0], 1), vol: false });
  let iClair = 0;
  let iSombre = 0;
  for (let n = 1; n <= 50; n++) {
    const auClair = n % 2 === 1;
    const cercle = auClair ? CERCLE_CLAIR : CERCLE_SOMBRE;
    const i = auClair ? iClair : iSombre;
    const j = (i + 1) % cercle.length;
    const avant = e;
    e = jouerArbitre(e, { type: 'deplacement', de: cercle[i], vers: cercle[j] });
    assert.notEqual(e, avant, `demi-coup ${n} refusé par la règle`);
    assert.equal(e.jeu.doitRetirer, false, `un moulin s'est fermé au demi-coup ${n}`);
    assert.equal(e.sansPrise, n, `le compteur a sauté au demi-coup ${n}`);
    if (auClair) iClair = j; else iSombre = j;
    if (n < 50) assert.equal(e.nulle, null, `nulle prématurée au demi-coup ${n}`);
  }
  assert.equal(e.nulle, 'compteur');
  const v = verdictArbitre(e);
  assert.equal(v.finie, true);
  assert.equal(v.gagnant, null);
  // La partie est close : même un coup parfaitement légal ne la rouvre pas.
  const suivant = { type: 'deplacement' as const, de: CERCLE_CLAIR[iClair], vers: CERCLE_CLAIR[(iClair + 1) % 6] };
  assert.equal(jouerArbitre(e, suivant), e, 'une partie nulle ne se rejoue pas');
});

essai('la même position pour la troisième fois : la partie est nulle', () => {
  // Quatre pions de chaque côté, deux d'entre eux qui font la navette.
  // La position revient tous les quatre demi-coups, donc la troisième
  // visite tombe au huitième, bien avant la règle des cinquante.
  let e = depuisJeu({ ...poser([0, 21, 5, 22], [6, 23, 19, 13], [0, 0], 1), vol: false });
  const navette: Coup[] = [
    { type: 'deplacement', de: 0, vers: 1 },
    { type: 'deplacement', de: 6, vers: 7 },
    { type: 'deplacement', de: 1, vers: 0 },
    { type: 'deplacement', de: 7, vers: 6 },
  ];
  for (let n = 1; n <= 8; n++) {
    const avant = e;
    e = jouerArbitre(e, navette[(n - 1) % 4]);
    assert.notEqual(e, avant, `demi-coup ${n} refusé par la règle`);
    if (n < 8) assert.equal(e.nulle, null, `nulle prématurée au demi-coup ${n}`);
  }
  assert.equal(e.nulle, 'repetition');
  assert.equal(e.sansPrise, 8, 'la règle des cinquante n\'a rien à voir ici');
  assert.equal(verdictArbitre(e).finie, true);
  assert.deepEqual(coupsArbitre(e), [], 'une partie nulle n\'offre plus de coup');
});

essai('un retrait remet le compteur et la mémoire des positions à zéro', () => {
  let e = depuisJeu({ ...poser([0, 1, 14, 22], [9, 21, 23, 13], [0, 0], 1), vol: false });
  e = jouerArbitre(e, { type: 'deplacement', de: 22, vers: 19 });
  assert.equal(e.sansPrise, 1);
  e = jouerArbitre(e, { type: 'deplacement', de: 13, vers: 12 });
  assert.equal(e.sansPrise, 2);
  assert.equal(e.vues.length, 3, 'la position de départ et les deux suivantes');

  e = jouerArbitre(e, { type: 'deplacement', de: 14, vers: 2 });
  assert.equal(e.jeu.doitRetirer, true, '0-1-2 vient de se fermer');
  assert.equal(e.sansPrise, 3, 'le coup qui ferme le moulin est encore un glissement');

  e = jouerArbitre(e, { type: 'retrait', p: 9 });
  assert.equal(e.sansPrise, 0);
  assert.equal(e.vues.length, 1, 'plus aucune position d\'avant ne peut revenir');
  assert.equal(e.nulle, null);
});

essai('la pose remet elle aussi le compteur à zéro', () => {
  const e = jouerArbitre(etatInitialArbitre(true), { type: 'pose', vers: 4 });
  assert.equal(e.sansPrise, 0);
  assert.equal(e.vues.length, 1);
  assert.equal(e.jeu.points[4], 1);
});

essai('la règle des cinquante arrête une vraie partie de la machine', () => {
  // Les autres essais poussent des coups écrits à la main. Celui-ci laisse
  // jouer deux connétables : la règle doit arrêter la machine elle-même.
  const plateau = { ...poser([9, 0, 6, 12], [14, 8, 17, 22], [0, 0], 1), vol: false };
  let e: EtatMerelle = { ...depuisJeu(plateau), sansPrise: 46 };
  let n = 0;
  while (!verdictArbitre(e).finie && n < 20) {
    const coup = choisirCoupNiveau(e, 10, { noeudsMax: NOEUDS_BANC });
    assert.ok(coup, `plus aucun coup au demi-coup ${n}`);
    e = jouerArbitre(e, coup!);
    n++;
    assert.equal(e.sansPrise, 46 + n, `coup refusé ou moulin fermé au demi-coup ${n}`);
  }
  assert.equal(n, 4, 'quatre demi-coups pour aller de quarante-six à cinquante');
  assert.equal(e.nulle, 'compteur');
  assert.equal(verdictArbitre(e).gagnant, null);
});

essai('les deux verdicts se disent en français et en anglais', () => {
  for (const raison of ['compteur', 'repetition'] as const) {
    const e: EtatMerelle = { ...etatInitialArbitre(true), nulle: raison };
    const fr = texteArbitre(e, true);
    const en = texteArbitre(e, false);
    assert.ok(fr && fr.length > 20, `pas de phrase française pour ${raison}`);
    assert.ok(en && en.length > 20, `pas de phrase anglaise pour ${raison}`);
    assert.notEqual(fr, en);
    assert.ok(!fr!.includes('—'), 'jamais de tiret cadratin');
  }
  assert.equal(texteArbitre(etatInitialArbitre(true), true), null);
});

// ── La force de la machine ───────────────────────────────────────────
// Alex, 2026-09-01 : « L'IA qui contrôle les jeux est vraiment très
// mauvaise. » Une échelle de niveaux ne vaut rien tant qu'on n'a pas
// montré que le haut bat le bas. Et comme le moteur est en negamax,
// c'est aussi le seul essai qui attrape une erreur de signe : un
// adaptateur qui note du mauvais point de vue joue contre lui-même, et
// le connétable perd alors contre le palefrenier.

interface Duel { gagnant: Camp | null; nulle: string | null; demiCoups: number }

function duel(clair: Niveau, sombre: Niveau, semence: number, plafond = 300): Duel {
  const alea = graine(semence);
  let e = etatInitialArbitre(true);
  let n = 0;
  while (!verdictArbitre(e).finie && n < plafond) {
    const niveau = e.jeu.tour === 1 ? clair : sombre;
    const coup = choisirCoupNiveau(e, niveau, { alea, noeudsMax: NOEUDS_BANC });
    if (!coup) break;
    const avant = e;
    e = jouerArbitre(e, coup);
    assert.notEqual(e, avant, `coup refusé au demi-coup ${n} : ${JSON.stringify(coup)}`);
    n++;
  }
  return { gagnant: e.jeu.gagnant, nulle: e.nulle, demiCoups: n };
}

essai('la partie témoin : le connétable bat le palefrenier', () => {
  const p = duel(10, 3, 1);
  console.log(`      témoin : ${p.demiCoups} demi-coups, gagnant ${p.gagnant ?? 'aucun'}${p.nulle ? ` (${p.nulle})` : ''}`);
  assert.equal(p.gagnant, 1, 'le niveau 10 doit gagner contre le niveau 3');
});

essai('cinq parties à graine fixe : le connétable ne perd jamais', () => {
  let victoires = 0;
  let defaites = 0;
  let nulles = 0;
  for (let i = 0; i < 5; i++) {
    // Le connétable prend le trait une partie sur deux : une machine qui
    // ne gagne qu'avec les clairs n'a pas prouvé grand-chose.
    const dixEnPremier = i % 2 === 0;
    const p = dixEnPremier ? duel(10, 3, i + 1) : duel(3, 10, i + 1);
    const campDix: Camp = dixEnPremier ? 1 : 2;
    if (p.nulle) nulles++;
    else if (p.gagnant === campDix) victoires++;
    else defaites++;
    console.log(`      partie ${i + 1} : ${p.demiCoups} demi-coups, ${p.nulle ?? (p.gagnant === campDix ? 'le connétable gagne' : 'le palefrenier gagne')}`);
  }
  console.log(`      bilan : ${victoires} victoires, ${nulles} nulles, ${defaites} défaites`);
  // Mesuré : cinq sur cinq ici, et vingt sur vingt sur un banc plus large.
  assert.equal(defaites, 0, 'le connétable ne doit jamais perdre contre le palefrenier');
  assert.equal(nulles, 0, 'une nulle contre le palefrenier serait déjà un aveu');
  assert.equal(victoires, 5, `le connétable n'a gagné que ${victoires} parties sur cinq`);
});

essai('le connétable ne laisse pas un pion partir pour rien', () => {
  // Le sombre tient 9 et 10 et n'attend que 11 pour fermer, en amenant
  // son pion de 15. Le clair n'a aucun moulin à lui à fermer et un seul
  // pion capable d'atteindre 11 : celui de 6. S'il joue ailleurs, il
  // perd un pion au coup suivant sans rien recevoir en échange.
  const e = depuisJeu(poser([6, 0, 4, 22], [9, 10, 15, 12], [0, 0], 1));
  const coup = choisirCoupNiveau(e, 10, { noeudsMax: NOEUDS_BANC });
  assert.deepEqual(coup, { type: 'deplacement', de: 6, vers: 11 });
  const apres = jouerArbitre(e, coup!);
  for (const c of coupsArbitre(apres)) {
    const suite = jouerArbitre(apres, c);
    assert.equal(suite.jeu.doitRetirer, false, `le sombre ferme encore par ${JSON.stringify(c)}`);
  }
});

console.log(`\n${faits} essais passés.`);
