// Banc d'essai visuel, jeté après la vérification : monte la scène nue,
// laisse la machine remplir le plateau et allume une sélection, pour
// regarder le bois, les gravures et les pions tournés.
import { monterScene } from '../scene';
import { destinations, etatInitial, jouer, retraitsPossibles } from '../logic';
import { choisirCoup } from '../cpu';

const el = document.getElementById('table')!;
const sc = monterScene(el);
sc.attacherResize();

let e = etatInitial(true);
for (let i = 0; i < 26 && !e.gagnant; i++) {
  const coup = choisirCoup(e, 'moyen');
  if (!coup) break;
  e = jouer(e, coup);
}
sc.reinitialiser(e.points);

const tenu = e.points.findIndex((v) => v === e.tour);
sc.allumer({
  selection: tenu >= 0 ? tenu : null,
  destinations: tenu >= 0 ? destinations(e, tenu) : [],
  retraits: e.doitRetirer ? retraitsPossibles(e) : [],
});

(window as unknown as Record<string, unknown>).__merelle = {
  pret: true,
  points: e.points.join(''),
  tenu,
};
