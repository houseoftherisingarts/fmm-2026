// Vérification de la partie de dés en ligne (aucun cadre de test installé).
// Le fichier vérifié, src/games/des/enLigne.ts, ne connaît ni Firestore ni
// React : il se bundle et se joue ici de bout en bout, deux joueurs, une
// manche complète, un doute, une perte de dé, une élimination, une fin.
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'des-ligne-')), 'enLigne.mjs');
await build({ entryPoints: ['src/games/des/enLigne.ts'], bundle: true, format: 'esm', outfile: out });
const E = await import(out);

let ko = 0;
const ok = (cond, msg) => { if (!cond) { console.log('KO', msg); ko++; } };

const A = 'uidAlex';
const B = 'uidBrunehilde';

/** Une table neuve, telle que firebase/desParties la pose. */
const neuve = (joueurs, des = 5) => ({
  joueurs,
  noms: Object.fromEntries(joueurs.map((u, i) => [u, ['Alex', 'Brunehilde', 'Gauvain'][i]])),
  des: Object.fromEntries(joueurs.map((u) => [u, des])),
  mainsPretes: [],
  elimines: [],
  mise: null,
  tour: joueurs[0],
  phase: 'annonces',
  manche: 1,
  journal: [],
  devoilement: null,
  gagnant: null,
  abandon: null,
});

const sceller = (etat) => ({ ...etat, mainsPretes: [...etat.joueurs] });

// ── La table se dresse ───────────────────────────────────────────────
let p = neuve([A, B]);
ok(E.totalDes(p) === 10, 'dix dés sur la table, vu ' + E.totalDes(p));
ok(E.vivants(p).length === 2, 'deux joueurs debout');
ok(E.toutLeMondeAScelle(p) === false, 'les gobelets ne sont pas encore scellés');

// Personne ne parle tant qu'un gobelet n'est pas scellé : sans cette
// barrière, un retardataire choisirait sa main après les annonces.
ok(E.peutAnnoncer(p, A, 3, 4) === false, 'aucune annonce avant que tout soit scellé');
ok(E.apresAnnonce(p, 3, 4) === p, 'une annonce prématurée ne change rien');

p = sceller(p);
ok(E.toutLeMondeAScelle(p) === true, 'les deux gobelets sont scellés');

// ── Les places, la mienne en premier ────────────────────────────────
ok(E.sieges(p, B).join() === [B, A].join(), 'mon siège passe devant, vu ' + E.sieges(p, B).join());
ok(E.sieges(p, A).join() === [A, B].join(), 'l’ordre du tour reste intact');

// ── Une manche complète : les annonces montent ──────────────────────
ok(E.peutAnnoncer(p, A, 3, 4) === true, 'Alex peut ouvrir');
ok(E.peutAnnoncer(p, B, 3, 4) === false, 'Brunehilde ne parle pas hors de son tour');
p = E.apresAnnonce(p, 3, 4);
ok(p.mise.quantite === 3 && p.mise.face === 4 && p.mise.parUid === A, 'la mise est inscrite');
ok(p.tour === B, 'la parole passe à Brunehilde, vu ' + p.tour);
ok(p.journal.length === 1, 'l’annonce est au journal');

ok(E.peutAnnoncer(p, B, 3, 3) === false, 'une face plus basse est refusée');
ok(E.peutAnnoncer(p, B, 2, 6) === false, 'une quantité plus basse est refusée');
p = E.apresAnnonce(p, 4, 2);
ok(p.mise.quantite === 4 && p.tour === A, 'la mise monte et la parole revient');

// ── Le doute : les gobelets se lèvent, quelqu'un perd un dé ─────────
// Mains connues : trois 4 en tout, plus deux as jokers, donc cinq.
// L'annonce en promettait quatre, elle tient, et le douteur paye.
const mains = {
  [A]: [4, 4, 1, 3, 5],
  [B]: [4, 1, 6, 6, 2],
};
{
  const q = E.apresDoute({ ...p, mise: { quantite: 4, face: 4, parUid: B }, tour: A }, mains);
  ok(q.phase === 'devoilement', 'la manche passe au dévoilement');
  ok(q.devoilement.compte === 5, 'le compte tient les as pour jokers, vu ' + q.devoilement.compte);
  ok(q.devoilement.perdantUid === A, 'le douteur perd quand l’annonce tient, vu ' + q.devoilement.perdantUid);
  ok(q.des[A] === 4 && q.des[B] === 5, 'un seul dé quitte la table');
  ok(q.devoilement.mainsLevees[B].length === 5, 'les mains levées sont recopiées');
  ok(q.journal.length > p.journal.length, 'le verdict est au journal');
}

// Un doute fondé fait payer celui qui a menti.
{
  const menteuse = { ...p, mise: { quantite: 8, face: 4, parUid: B }, tour: A };
  const q = E.apresDoute(menteuse, mains);
  ok(q.devoilement.perdantUid === B, 'le menteur perd, vu ' + q.devoilement.perdantUid);
  ok(q.des[B] === 4, 'Brunehilde tombe à quatre dés');
}

// ── Le pari du calzar ───────────────────────────────────────────────
{
  const juste = E.apresExact({ ...p, mise: { quantite: 5, face: 4, parUid: B }, tour: A }, mains);
  ok(juste.devoilement.exact === true, 'l’appel est marqué exact');
  ok(juste.devoilement.perdantUid === null, 'un exact réussi ne fait perdre personne');
  ok(juste.des[A] === 5, 'le gobelet ne dépasse pas cinq dés');

  const rate = E.apresExact({ ...p, mise: { quantite: 2, face: 4, parUid: B }, tour: A }, mains);
  ok(rate.devoilement.perdantUid === A, 'un exact raté coûte un dé');
  ok(rate.des[A] === 4, 'le dé est bien retiré');
}

// ── La manche suivante : le perdant ouvre, les gobelets se rouvrent ─
{
  let q = E.apresDoute({ ...p, mise: { quantite: 4, face: 4, parUid: B }, tour: A }, mains);
  q = E.apresManche(q);
  ok(q.phase === 'annonces' && q.mise === null, 'la manche est rouverte');
  ok(q.manche === 2, 'la manche a tourné');
  ok(q.mainsPretes.length === 0, 'les gobelets sont à sceller de nouveau');
  ok(q.tour === A, 'le perdant ouvre les annonces, vu ' + q.tour);
  ok(q.devoilement === null, 'le verdict précédent est rangé');
  ok(E.peutAnnoncer(q, A, 2, 3) === false, 'rien ne se dit avant que tout soit scellé');
}

// ── L'élimination et la fin de partie ───────────────────────────────
{
  // Brunehilde tient son dernier dé, un six. Alex annonce n'importe
  // quoi, elle doute avec raison, et Alex tombe à trois.
  let q = sceller(neuve([A, B]));
  q = { ...q, des: { [A]: 4, [B]: 1 }, mise: { quantite: 9, face: 3, parUid: A }, tour: B };
  q = E.apresDoute(q, { [A]: [2, 2, 5, 5], [B]: [6] });
  ok(q.devoilement.perdantUid === A, 'Alex paye son bluff');
  ok(q.des[A] === 3, 'Alex tombe à trois dés');
  ok(q.phase === 'devoilement', 'la partie continue tant que deux gobelets tiennent');

  // Cette fois, c'est Brunehilde qui doute à tort et perd son dernier dé.
  let r = sceller(neuve([A, B]));
  r = { ...r, des: { [A]: 4, [B]: 1 }, mise: { quantite: 2, face: 5, parUid: A }, tour: B };
  r = E.apresDoute(r, { [A]: [5, 5, 2, 3], [B]: [6] });
  ok(r.devoilement.perdantUid === B, 'le doute infondé coûte le dernier dé');
  ok(r.des[B] === 0 && r.elimines.includes(B), 'Brunehilde quitte la table');
  ok(r.phase === 'fini', 'la partie est finie, vu ' + r.phase);
  ok(r.gagnant === A, 'Alex ramasse la mise, vu ' + r.gagnant);
}

// ── À trois, la partie survit à une élimination ─────────────────────
{
  const C = 'uidGauvain';
  let q = sceller(neuve([A, B, C]));
  q = { ...q, des: { [A]: 3, [B]: 1, [C]: 2 }, mise: { quantite: 6, face: 3, parUid: A }, tour: B };
  q = E.apresDoute(q, { [A]: [2, 2, 4], [B]: [6], [C]: [5, 5] });
  ok(q.elimines.join() === B, 'Brunehilde sort, vu ' + q.elimines.join());
  ok(q.phase === 'devoilement', 'la table tient encore debout');
  ok(q.gagnant === null, 'personne n’a gagné, ils sont deux');
  const suite = E.apresManche(q);
  ok(suite.tour === C, 'la main revient au suivant vivant, vu ' + suite.tour);
  ok(E.suivantVivant(suite, A) === C, 'le tour de table saute les éliminés');
}

// ── Le sablier : le silencieux passe et perd la main ────────────────
{
  // Tout le monde a scellé, mais le joueur du tour s'est tu.
  const q = E.apresAbsence({ ...sceller(neuve([A, B])), tour: A });
  ok(q.tour === B, 'la parole passe au voisin, vu ' + q.tour);
  ok(q.journal[q.journal.length - 1].includes('laisse passer'), 'le journal note le silence');

  // Un gobelet jamais scellé bloquait la manche : la place se libère.
  const r = E.apresAbsence({ ...neuve([A, B]), mainsPretes: [A] });
  ok(r.elimines.join() === B, 'le joueur muet quitte la table, vu ' + r.elimines.join());
  ok(r.phase === 'fini' && r.gagnant === A, 'la partie revient au seul joueur assis');
}

// ── L'abandon ───────────────────────────────────────────────────────
{
  const q = E.apresAbandon(sceller(neuve([A, B])), A);
  ok(q.abandon === A, 'l’abandon est inscrit');
  ok(q.gagnant === B && q.phase === 'fini', 'l’autre ramasse la mise');
}

console.log(ko === 0 ? 'TOUT PASSE' : ko + ' échec(s)');
process.exit(ko === 0 ? 0 : 1);
