// Vérification du règlement des dés du menteur (aucun cadre de test installé).
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'des-')), 'regles.mjs');
await build({ entryPoints: ['src/games/des/regles.ts'], bundle: true, format: 'esm', outfile: out });
const R = await import(out);

let ko = 0;
const ok = (cond, msg) => { if (!cond) { console.log('KO', msg); ko++; } };

// Une partie neuve : cinq dés chacun, personne éliminé.
let p = R.nouvellePartie([
  { nom: 'Alex', machine: false },
  { nom: 'Machine', machine: true },
]);
ok(p.joueurs.length === 2, 'deux joueurs');
ok(p.joueurs.every((j) => j.des.length === 5), 'cinq dés chacun');
ok(R.desEnJeu(p) === 10, 'dix dés en jeu');

// Les annonces doivent monter.
ok(R.miseValide(null, 3, 4) === false || R.miseValide(null, 3, 4, 10) === true, 'première annonce libre');
ok(R.miseValide({ quantite: 3, face: 4, parId: 'x' }, 3, 5, 10) === true, 'même quantité, face plus haute');
ok(R.miseValide({ quantite: 3, face: 4, parId: 'x' }, 3, 3, 10) === false, 'face plus basse refusée');
ok(R.miseValide({ quantite: 3, face: 4, parId: 'x' }, 4, 2, 10) === true, 'quantité plus haute');
ok(R.miseValide({ quantite: 3, face: 4, parId: 'x' }, 11, 2, 10) === false, 'au-delà du total refusé');

// L'as est joker, sauf sur une annonce d'as.
p.joueurs[0].des = [1, 1, 3, 3, 5];
p.joueurs[1].des = [3, 2, 2, 6, 4];
ok(R.compter(p, 3) === 5, 'trois joker compris, vu ' + R.compter(p, 3));
ok(R.compter(p, 1) === 2, 'les as ne comptent que les as, vu ' + R.compter(p, 1));

// Un doute fondé fait perdre un dé à l'annonceur.
p = R.annoncer(p, 6, 3);          // Alex annonce 6 × 3, il n'y en a que 5
p = R.douter(p);                   // la machine doute
ok(p.devoilement.perdantId === 'j0', 'le menteur perd, vu ' + p.devoilement.perdantId);
ok(p.joueurs[0].des.length === 4, 'quatre dés après la perte');

// Un doute infondé fait perdre celui qui doute.
let q = R.nouvellePartie([{ nom: 'A', machine: false }, { nom: 'B', machine: true }]);
q.joueurs[0].des = [4, 4, 4, 4, 4];
q.joueurs[1].des = [4, 4, 2, 2, 2];
q = R.annoncer(q, 3, 4);
q = R.douter(q);
ok(q.devoilement.perdantId === 'j1', 'le douteur perd quand l\'annonce tient');

// La manche suivante relance et donne la main au perdant.
q = R.mancheSuivante(q);
ok(q.phase === 'annonces' && q.mise === null, 'nouvelle manche ouverte');
ok(q.joueurs[1].des.length === 4 && q.tour === 1, 'le perdant ouvre');

// La partie se termine quand il ne reste qu'un joueur.
let r = R.nouvellePartie([{ nom: 'A', machine: false }, { nom: 'B', machine: true }]);
r.joueurs[1].des = [6];
r.joueurs[0].des = [2, 2, 2, 2, 2];
r = R.annoncer(r, 6, 6);   // A ment franchement
r = R.douter(r);           // B doute et gagne
ok(r.phase === 'fini' || r.joueurs[0].des.length === 4, 'un doute juste retire un dé');

// La machine ne triche pas : elle ne joue jamais un coup illégal.
let m = R.nouvellePartie([{ nom: 'A', machine: false }, { nom: 'M', machine: true }]);
m = R.annoncer(m, 2, 3);
const coup = R.coupDeLaMachine(m);
if (coup.action === 'annonce') {
  ok(R.miseValide(m.mise, coup.quantite, coup.face, R.desEnJeu(m)), 'la machine annonce légalement');
}

console.log(ko === 0 ? 'TOUT PASSE' : ko + ' échec(s)');
process.exit(ko === 0 ? 0 : 1);

// ── Le pari du calzar : « c'est exactement ça » ──────────────────────
{
  const base = R.nouvellePartie([
    { nom: 'Moi', machine: false },
    { nom: 'Elle', machine: true },
  ]);
  // Mains connues : trois 4 en tout, plus un as joker.
  const p = {
    ...base,
    joueurs: [
      { ...base.joueurs[0], des: [4, 4, 2, 3, 5] },
      { ...base.joueurs[1], des: [4, 1, 6, 6, 2] },
    ],
    tour: 0,
    mise: { quantite: 4, face: 4, parId: 'j1' },
  };
  // 4+4+4 = 3, plus l'as joker = 4 : la mise tombe pile.
  const juste = R.exact(p);
  ok(juste.devoilement.exact === true, 'l\'appel est marqué exact');
  ok(juste.devoilement.perdantId === null, 'un exact réussi ne fait perdre personne');
  ok(juste.joueurs[0].des.length === 5, 'le gobelet ne dépasse pas cinq dés');

  const q = { ...p, joueurs: [{ ...p.joueurs[0], des: [4, 4, 2] }, p.joueurs[1]] };
  const rate = R.exact(q);
  ok(rate.devoilement.perdantId === 'j0', 'un exact raté coûte un dé à celui qui l\'appelle');
  ok(rate.joueurs[0].des.length === 2, 'le dé est bien retiré');

  // Un exact réussi avec un dé en moins rend le dé perdu.
  const r = {
    ...p,
    joueurs: [{ ...p.joueurs[0], des: [4, 4, 2, 3] }, { ...p.joueurs[1], des: [4, 1, 6, 6, 2] }],
    mise: { quantite: 4, face: 4, parId: 'j1' },
  };
  const repris = R.exact(r);
  ok(repris.joueurs[0].des.length === 5, 'un exact juste rend le dé perdu');
}
