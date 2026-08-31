// Page jetable : la planche seule, sans routeur ni contextes, pour la
// regarder au rendu. À supprimer après vérification.
import { coupsPossibles, plateauInitial } from '../logic';
import { creerTable } from '../scene';

const racine = document.getElementById('racine');
if (racine) {
  const plateau = plateauInitial('oies13');
  const table = creerTable(racine, () => {});
  table.poser(plateau);
  const coups = coupsPossibles(plateau, 'renard', 'oies13');
  table.surbrillance(coups[0].de, coups.map((c) => c.vers));
}
