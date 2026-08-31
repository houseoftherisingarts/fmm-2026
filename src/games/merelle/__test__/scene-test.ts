// Banc d'essai visuel, jeté après la vérification : monte la scène nue,
// pose quelques pions et allume une sélection, pour regarder le bois.
import { monterScene } from '../scene';
import { etatInitial, jouer } from '../logic';

const el = document.getElementById('table')!;
const sc = monterScene(el);
sc.attacherResize();

import { choisirCoup } from '../cpu';

let e = etatInitial(true);
// Dix-huit demi-coups joués par la machine : le plateau se remplit
// vraiment, moulins et retraits compris.
for (let i = 0; i < 26 && !e.gagnant; i++) {
  const coup = choisirCoup(e, 'moyen');
  if (!coup) break;
  e = jouer(e, coup);
}
sc.reinitialiser(e.points);
const tenu = e.points.findIndex((v) => v === 1);
sc.allumer({ selection: tenu, destinations: [], retraits: [] });

(window as unknown as Record<string, unknown>).__merelle = {
  pret: true,
  points: e.points.join(''),
};
