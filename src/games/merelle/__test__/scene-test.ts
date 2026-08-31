// Banc d'essai visuel, jeté après la vérification : monte la scène nue,
// pose quelques pions et allume une sélection, pour regarder le bois.
import { monterScene } from '../scene';
import { etatInitial, jouer } from '../logic';

const el = document.getElementById('table')!;
const sc = monterScene(el);
sc.attacherResize();

let e = etatInitial(true);
const ouverture = [4, 10, 1, 19, 7, 22, 13, 16, 0] as const;
for (const p of ouverture) e = jouer(e, { type: 'pose', vers: p });
sc.reinitialiser(e.points);
sc.allumer({ selection: 4, destinations: [3, 5], retraits: [22] });

(window as unknown as Record<string, unknown>).__merelle = {
  pret: true,
  points: e.points.join(''),
};
