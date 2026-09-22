/**
 * Auto-vérification de functions/coffre.js. Aucun émulateur, aucun
 * cadre de test : les vraies tables de prix, des assertions, et
 * `node functions/test-coffre.js` qui sort à zéro quand tout tient.
 *
 * Ce qui est vérifié : les poids qui somment à un, le livre de
 * recettes qu'un alea forcé fait sortir, le doublon qui rend la moitié
 * du prix, les dix mille coffres qui donnent à peu près un pour cent
 * de livres, et la clé qui se refuse à six jours pour s'accorder au
 * septième. Le dernier bloc relit functions/index.js pour attraper la
 * dérive : un identifiant retiré là-bas et gardé ici fait rougir le
 * test plutôt que de mentir au joueur.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const coffre = require('./coffre');

// JUMELLES des tables de functions/index.js (~2330). Elles sont
// recopiées ici, et le dernier bloc du fichier vérifie qu'elles s'y
// trouvent encore.
const TABLES = {
  PRIX_SKIN: { bleu: 0, vert: 1, dore: 5 },
  PRIX_DOS: { salon: 0 },
  PRIX_TAFL: { hullsborg: 100 },
  CATALOGUE_BOUTIQUE: [
    { id: 'casque_corbeau', prix: 15 },
    { id: 'couronne_fleurs', prix: 12 },
    { id: 'cape_etoilee', prix: 25 },
  ],
  CATALOGUE_TROUVAILLE: [
    { id: 'casque_cuir', rarete: 'commune' }, { id: 'jambes_cuir', rarete: 'commune' },
    { id: 'bottes_cuir', rarete: 'commune' }, { id: 'bouclier_bois', rarete: 'commune' },
    { id: 'casque_mailles', rarete: 'rare' }, { id: 'torse_mailles', rarete: 'rare' },
    { id: 'torse_troubadour', rarete: 'rare' }, { id: 'jambes_mailles', rarete: 'rare' },
    { id: 'bottes_ferrees', rarete: 'rare' }, { id: 'hache', rarete: 'rare' },
    { id: 'epee_errant', rarete: 'rare' }, { id: 'bouclier_fer', rarete: 'rare' },
    { id: 'cape_ordre', rarete: 'rare' }, { id: 'amulette_lievre', rarete: 'rare' },
    { id: 'anneau_brume', rarete: 'rare' },
    { id: 'casque_heaume', rarete: 'legendaire' }, { id: 'torse_plates', rarete: 'legendaire' },
    { id: 'bottes_ailees', rarete: 'legendaire' }, { id: 'epee_lune', rarete: 'legendaire' },
  ],
  AMBIANCES_ACHETABLES: ['menestrel'],
  PRIX_AMBIANCE: 1,
};

const CATALOGUE = coffre.construireCatalogue(TABLES);
const MS_PAR_JOUR = 86400000;

// ── Le catalogue et ses poids ────────────────────────────────────────
{
  const somme = CATALOGUE.reduce((t, e) => t + e.poids, 0);
  assert.ok(Math.abs(somme - 1) < 1e-12, `les poids somment à ${somme}, pas à 1`);

  // Un objet offert n'entre pas dans le coffre : il est déjà à tous.
  assert.ok(!CATALOGUE.some((e) => e.id === 'bleu'), 'le skin bleu est offert, il ne se tire pas');
  assert.ok(!CATALOGUE.some((e) => e.id === 'salon'), 'le dos du Salon est offert, il ne se tire pas');

  // Les trucs de base pèsent plus lourd que le gros lot (Alex).
  const vert = CATALOGUE.find((e) => e.id === 'vert');
  const tafl = CATALOGUE.find((e) => e.id === 'hullsborg');
  assert.ok(vert.poids > tafl.poids * 10, 'un objet à 1 doit sortir bien plus souvent qu’un objet à 100');

  // Les deux petits paliers de pièces pèsent comme un objet à cinq.
  const dix = CATALOGUE.find((e) => e.id === 'montpellois_10');
  const dore = CATALOGUE.find((e) => e.id === 'dore');
  assert.ok(Math.abs(dix.poids - dore.poids) < 1e-12, 'dix Montpellois doivent peser comme un objet à cinq');

  // Chaque entrée porte un nom dans les deux langues.
  for (const e of CATALOGUE) {
    assert.ok(e.nomFR && e.nomEN, `${e.id} n’a pas de nom`);
    assert.ok(e.nomFR !== e.id, `${e.id} n’a pas de nom français dans coffre.js`);
  }
}

// ── Un alea forcé fait sortir le livre de recettes ───────────────────
{
  // La suite consommée par tirerCoffre : la chance du livre, celle de
  // la nuit, la place du livre, puis les deux objets ordinaires.
  const suite = [0.001, 0.5, 0, 0.5, 0.5];
  let i = 0;
  const objets = coffre.tirerCoffre(CATALOGUE, new Set(), () => suite[i++]);
  assert.strictEqual(objets.length, 3, 'un coffre donne trois objets');
  assert.strictEqual(objets[0].type, 'livre', 'la première place devait porter le livre');
  assert.strictEqual(objets[0].montpellois, 0, 'le livre ne se convertit pas');
  assert.ok(objets.slice(1).every((o) => o.type !== 'livre'), 'le livre ne sort qu’une fois par coffre');
}

// ── Les deux prix rares ensemble prennent deux places différentes ────
{
  const suite = [0.001, 0.001, 0, 0, 0.5];
  let i = 0;
  const objets = coffre.tirerCoffre(CATALOGUE, new Set(), () => suite[i++]);
  const types = objets.map((o) => o.type);
  assert.ok(types.includes('livre') && types.includes('nuit-salon'), 'les deux prix rares devaient sortir');
  assert.strictEqual(objets.length, 3, 'deux prix rares ne font pas quatre objets');
  assert.strictEqual(new Set(types.filter((t) => t === 'livre')).size, 1, 'jamais deux fois le même prix rare');
}

// ── Un doublon rend la moitié du prix ────────────────────────────────
{
  // Un catalogue d'une seule entrée : chaque tirage rend la hache.
  const hache = [{ id: 'hache', type: 'trouvaille', prix: 15, nomFR: 'Hache de guerre', nomEN: 'War axe', poids: 1 }];

  const dejaLa = coffre.tirerCoffre(hache, new Set(['hache']), () => 0.5);
  for (const o of dejaLa) {
    assert.strictEqual(o.doublon, true, 'la hache était déjà au coffre');
    assert.strictEqual(o.montpellois, 7, 'quinze moins cinquante pour cent, arrondi vers le bas, fait sept');
  }

  // Sortie deux fois du même coffre : la seconde est un doublon aussi.
  const deuxFois = coffre.tirerCoffre(hache, new Set(), () => 0.5);
  assert.strictEqual(deuxFois[0].doublon, false, 'la première hache est un vrai gain');
  assert.strictEqual(deuxFois[0].montpellois, 0, 'un vrai gain ne rend pas de pièces');
  assert.strictEqual(deuxFois[1].doublon, true, 'la deuxième hache du même coffre est un doublon');
  assert.strictEqual(deuxFois[2].doublon, true, 'la troisième aussi');
}

// ── Les Montpellois ne se convertissent jamais ───────────────────────
{
  const pieces = [{ id: 'montpellois_25', type: 'montpellois', prix: 25, nomFR: '25 Montpellois', nomEN: '25 Montpellois', poids: 1 }];
  const objets = coffre.tirerCoffre(pieces, new Set(['montpellois_25']), () => 0.5);
  for (const o of objets) {
    assert.strictEqual(o.doublon, false, 'des pièces ne sont jamais un doublon');
    assert.strictEqual(o.montpellois, 25, 'un palier rend son montant entier');
  }
}

// ── Dix mille coffres : environ un pour cent de livres ───────────────
{
  const TOURS = 10000;
  let livres = 0;
  let nuits = 0;
  let objets = 0;
  for (let i = 0; i < TOURS; i++) {
    const prises = coffre.tirerCoffre(CATALOGUE, new Set());
    objets += prises.length;
    if (prises.some((o) => o.type === 'livre')) livres++;
    if (prises.some((o) => o.type === 'nuit-salon')) nuits++;
  }
  assert.strictEqual(objets, TOURS * 3, 'chaque coffre doit rendre exactement trois objets');
  // Une chance sur cent, soit cent coffres attendus sur dix mille :
  // trois écarts-types laissent la fourchette 70-130, élargie ici pour
  // qu'un mauvais jour du hasard ne fasse pas rougir le test.
  assert.ok(livres > 55 && livres < 150, `le livre est sorti ${livres} fois sur ${TOURS}, loin du un pour cent`);
  assert.ok(nuits > 55 && nuits < 150, `la nuit au Salon est sortie ${nuits} fois sur ${TOURS}, loin du un pour cent`);
}

// ── La clé, une par semaine ──────────────────────────────────────────
{
  const maintenant = new Date('2026-09-21T12:00:00Z');
  assert.strictEqual(coffre.peutAcheterCle(null, maintenant), true, 'une première clé s’achète toujours');

  const ilYASixJours = new Date(maintenant.getTime() - 6 * MS_PAR_JOUR);
  assert.strictEqual(coffre.peutAcheterCle(ilYASixJours, maintenant), false, 'six jours ne font pas une semaine');

  const ilYASeptJours = new Date(maintenant.getTime() - 7 * MS_PAR_JOUR);
  assert.strictEqual(coffre.peutAcheterCle(ilYASeptJours, maintenant), true, 'au septième jour la clé se rachète');

  const quand = coffre.prochaineCle(ilYASixJours);
  assert.strictEqual(quand.getTime(), ilYASixJours.getTime() + 7 * MS_PAR_JOUR, 'la prochaine clé tombe sept jours après la dernière');
  assert.strictEqual(coffre.prochaineCle(null), null, 'sans clé achetée, rien à attendre');
}

// ── La dérive avec functions/index.js ────────────────────────────────
{
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  for (const e of CATALOGUE) {
    if (e.type === 'montpellois') continue; // les paliers vivent dans coffre.js
    assert.ok(source.includes(e.id), `${e.id} n’existe plus dans functions/index.js`);
  }
  assert.ok(source.includes('acheterCoffre') && source.includes('acheterCle') && source.includes('ouvrirCoffre'),
    'les trois fonctions du coffre ont disparu de functions/index.js');
}

console.log('coffre : tout tient.');
