// ─── Le banc d'essai du Cul de chouette ─────────────────────────────
// Même recette que les dés du menteur : aucun cadre de test, un fichier
// qui s'exécute et compte ses assertions.
//
//   npx esbuild src/games/chouette/regles.test.ts --bundle --platform=node \
//     --format=esm --outfile=/tmp/chouette.mjs && node /tmp/chouette.mjs
import assert from 'node:assert/strict';
let total = 0;
const tests: Array<[string, () => void]> = [];
const describe = (_n: string, f: () => void) => f();
const it = (n: string, f: () => void) => tests.push([n, f]);
const expect = (v: unknown) => ({
  toBe: (a: unknown) => { total++; assert.equal(v, a); },
  toMatchObject: (o: Record<string, unknown>) => { total++; for (const [k, x] of Object.entries(o)) assert.equal((v as Record<string, unknown>)[k], x, k); },
});
import {
  combinaison, crier, grelottine, lancer, nouvellePartie, siroter, soufflette, tourSuivant, clorReflexe,
} from './regles';

const partie = () => nouvellePartie([{ nom: 'Moi', machine: false }, { nom: 'Perceval', machine: true }, { nom: 'Karadoc', machine: true }]);

describe('les combinaisons', () => {
  it('lit les six combinaisons et leurs points', () => {
    expect(combinaison([4, 4, 4])).toMatchObject({ type: 'cul', valeur: 4, points: 80 });
    expect(combinaison([6, 6, 6]).points).toBe(100);
    expect(combinaison([3, 4, 3])).toMatchObject({ type: 'chouette', valeur: 3, points: 9 });
    expect(combinaison([1, 2, 3])).toMatchObject({ type: 'suite', velute: 18 });
    expect(combinaison([2, 5, 3])).toMatchObject({ type: 'velute', valeur: 5, points: 50 });
    expect(combinaison([2, 4, 2])).toMatchObject({ type: 'chouette-velute', valeur: 4, points: 32 });
    expect(combinaison([4, 5, 6])).toMatchObject({ type: 'suite', points: 0 });
    expect(combinaison([1, 4, 2])).toMatchObject({ type: 'soufflette' });
    expect(combinaison([1, 3, 5]).type).toBe('neant');
  });
});

describe('le tour', () => {
  it('crédite la velute et passe la main', () => {
    const p = tourSuivant(lancer(partie(), [2, 3, 5]));
    expect(p.joueurs[0].score).toBe(50);
    expect(p.tour).toBe(1);
  });
  it('sirote : réussi, le cul remplace la chouette; raté, la chouette part', () => {
    const p = lancer(partie(), [5, 5, 2]);
    expect(p.phase).toBe('sirop');
    expect(p.joueurs[0].score).toBe(25);
    const ok = siroter(p, { j1: 5, j2: 1 }, 5);
    expect(ok.reussi).toBe(true);
    expect(ok.partie.joueurs[0].score).toBe(25 + 90);
    expect(ok.partie.joueurs[1].score).toBe(15);
    expect(ok.partie.joueurs[2].score).toBe(-5);
    const rate = siroter(p, {}, 2);
    expect(rate.partie.joueurs[0].score).toBe(0);
  });
  it('la chouette-velute va au premier qui crie, et crier à tort coûte dix', () => {
    const p = lancer(partie(), [3, 3, 6]);
    const q = crier(p, 'j1', 'pasmou');
    expect(q.joueurs[1].score).toBe(72);
    expect(q.phase).toBe('attente');
    const r = crier(q, 'j0', 'pasmou');
    expect(r.joueurs[0].score).toBe(-10);
  });
  it('la suite punit le dernier à crier, ou le muet', () => {
    let p = lancer(partie(), [4, 5, 6]);
    p = crier(p, 'j1', 'suite');
    p = crier(p, 'j0', 'suite');
    p = crier(p, 'j2', 'suite');
    expect(p.joueurs[2].score).toBe(-10);
    let q = lancer(partie(), [2, 3, 4]);
    q = crier(q, 'j0', 'suite');
    q = clorReflexe(q);
    expect(q.joueurs[2].score).toBe(-10);
    expect(q.joueurs[0].score).toBe(0);
  });
  it('la soufflette paie 50, 40, 30 ou coûte 30', () => {
    const p = lancer(partie(), [1, 2, 4]);
    expect(p.phase).toBe('soufflette');
    const a = soufflette(p, 'j1', [[4, 2, 1]]);
    expect(a.reussiAu).toBe(0);
    expect(a.partie.joueurs[1].score).toBe(50);
    expect(a.partie.joueurs[0].score).toBe(-50);
    const b = soufflette(p, 'j1', [[4, 3, 3], [2, 5], [6]]);
    expect(b.reussiAu).toBe(null);
    expect(b.partie.joueurs[1].score).toBe(-30);
    expect(b.partie.joueurs[0].score).toBe(30);
    const c = soufflette(p, 'j1', [[4, 3, 3], [2, 1]]);
    expect(c.reussiAu).toBe(1);
    expect(c.partie.joueurs[1].score).toBe(40);
  });
  it('le néant donne une grelottine et le défi se joue sur un cul', () => {
    let p = partie();
    p.joueurs[1].grelottine = true;
    p.joueurs.forEach((j) => { j.score = 100; });
    p = lancer(p, [1, 3, 5]);
    expect(p.joueurs[0].grelottine).toBe(true);
    expect(p.phase).toBe('grelottine');
    const r = grelottine(p, 'j1', [2, 2, 2]);
    expect(r.reussi).toBe(true);
    expect(r.partie.joueurs[0].score).toBe(100 + 60 + 16);
    expect(r.partie.joueurs[1].score).toBe(84);
    expect(r.partie.joueurs[0].grelottine).toBe(false);
  });
  it('gagne à 343', () => {
    const p = partie();
    p.joueurs[0].score = 300;
    const q = tourSuivant(lancer(p, [5, 5, 5]));
    expect(q.phase).toBe('fini');
    expect(q.gagnantId).toBe('j0');
  });
});

for (const [n, f] of tests) { f(); console.log('ok', n); }
console.log(`${tests.length} tests, ${total} assertions, tout passe.`);
