/**
 * Le coffre et la clé des Montpellois (Alex, 2026-09-21).
 *
 * Alex, dicté à la voix : « un coffre qu'on ouvre avec une clé, qu'on
 * peut acheter un par semaine et qui nous donne trois objets au
 * hasard, que ce soit un skin de jeu, un skin de carte, des
 * montpellois en soi [...] On a une chance sur 100 d'avoir le livre de
 * recettes, [une chance sur 100] d'avoir une nuit gratuite au Salon
 * des Inconnus. Et en gros, le reste des pourcentages de chance arrive
 * plus avec les trucs de base qu'ils ont déjà. Si la personne gagne un
 * prix qu'elle a déjà, ça l'est converti en montpelois au prix qu'elle
 * aurait payé cet objet, moins 50 %. »
 *
 * Ce module ne touche ni Firestore ni le réseau : il ne tient que les
 * décisions, pour que `node functions/test-coffre.js` les rejoue dix
 * mille fois sans émulateur ni clé de service. functions/index.js lui
 * passe ses propres tables de prix (PRIX_SKIN, PRIX_DOS, PRIX_TAFL,
 * CATALOGUE_BOUTIQUE, CATALOGUE_TROUVAILLE, AMBIANCES_ACHETABLES) et
 * se charge seul d'écrire ce qui en sort.
 */

/** Le coffre s'achète autant de fois qu'on veut. */
const PRIX_COFFRE = 100;
/** La clé, une seule par semaine : c'est elle qui tient la cadence. */
const PRIX_CLE = 50;
const JOURS_ENTRE_DEUX_CLES = 7;
const MS_PAR_JOUR = 86400000;
const OBJETS_PAR_COFFRE = 3;
/** Une chance sur cent par prix rare, les deux tirés séparément. */
const CHANCE_PRIX_RARE = 0.01;

// Une trouvaille ne se vend nulle part, donc elle n'a pas de prix. Il
// lui en faut un quand même, parce que le prix décide à la fois du
// poids dans le tirage et de ce qu'un doublon rend en Montpellois.
// Ces trois-là suivent la rareté de CATALOGUE_TROUVAILLE.
const PRIX_TROUVAILLE = { commune: 5, rare: 15, legendaire: 40 };

// Les paliers de pièces. Ils ne se convertissent jamais : gagner des
// Montpellois qu'on possède déjà ne voudrait rien dire.
const PALIERS_MONTPELLOIS = [10, 25, 50, 100];
// Dix et vingt-cinq Montpellois tombent aussi souvent qu'un objet à
// cinq. Sans ce garde-fou, leur poids naturel (1/15 et 1/30) les
// aurait rendus plus rares que les trouvailles communes, alors qu'Alex
// les veut dans le lot des petites prises ordinaires.
const POIDS_COMME_UN_OBJET_A = { 10: 5, 25: 5 };

/**
 * Le nom affiché de chaque prise, dans les deux langues. Le serveur ne
 * lit pas src/, alors cette table est une JUMELLE de
 * src/chantier/objets.ts (les objets et les trouvailles), de NOMS_SKIN
 * dans src/components/boutique/BoutiqueMontpellois.tsx (les skins) et
 * de src/lib/ambiances.ts. Un nom qui change là-bas change ici le
 * jour même, sinon le coffre annonce une prise sous son ancien nom.
 */
const NOMS = {
  // Skins de la plateforme (NOMS_SKIN).
  vert: { FR: 'Vert de forêt', EN: 'Forest green' },
  dore: { FR: 'Bière et cervoise', EN: 'Beer and ale' },
  // Dos de carte du tarot (src/games/tarot/dos.ts).
  salon: { FR: 'Le dos du Salon des Inconnus', EN: 'The Salon des Inconnus card back' },
  // Hnefatafl (src/games/hnefatafl/assets.ts).
  hullsborg: { FR: 'Le Plateau Futhark et la hird de Hullsborg', EN: 'The Futhark Board and the Hullsborg hird' },
  // Objets de boutique.
  casque_corbeau: { FR: 'Masque du corbeau', EN: 'Raven mask' },
  couronne_fleurs: { FR: 'Couronne de fleurs', EN: 'Flower crown' },
  cape_etoilee: { FR: 'Cape étoilée', EN: 'Starlit cape' },
  // Trouvailles communes.
  casque_cuir: { FR: 'Capuche de cuir', EN: 'Leather hood' },
  jambes_cuir: { FR: 'Braies de cuir', EN: 'Leather breeches' },
  bottes_cuir: { FR: 'Bottes de route', EN: 'Road boots' },
  bouclier_bois: { FR: 'Écu de bois', EN: 'Wooden buckler' },
  // Trouvailles rares.
  casque_mailles: { FR: 'Coiffe de mailles', EN: 'Mail coif' },
  torse_mailles: { FR: 'Cotte de mailles', EN: 'Chainmail' },
  torse_troubadour: { FR: 'Justaucorps du troubadour', EN: "Troubadour's doublet" },
  jambes_mailles: { FR: 'Chausses de mailles', EN: 'Mail chausses' },
  bottes_ferrees: { FR: 'Bottes ferrées', EN: 'Ironshod boots' },
  hache: { FR: 'Hache de guerre', EN: 'War axe' },
  epee_errant: { FR: 'Épée du chevalier errant', EN: "Wandering knight's sword" },
  bouclier_fer: { FR: 'Écu ferré', EN: 'Ironbound shield' },
  cape_ordre: { FR: "Cape de l'Ordre", EN: 'Cape of the Order' },
  amulette_lievre: { FR: 'Amulette du lièvre', EN: 'Hare amulet' },
  anneau_brume: { FR: 'Anneau de brume', EN: 'Mist ring' },
  // Trouvailles légendaires.
  casque_heaume: { FR: 'Heaume du gardien', EN: "Guardian's greathelm" },
  torse_plates: { FR: 'Plates du chevalier', EN: "Knight's plate" },
  bottes_ailees: { FR: 'Bottes ailées', EN: 'Winged boots' },
  epee_lune: { FR: 'Épée de lune', EN: 'Moonlight sword' },
  // Ambiances achetables.
  menestrel: { FR: 'Le ménestrel', EN: 'The minstrel' },
  // Les paliers de pièces.
  montpellois_10: { FR: '10 Montpellois', EN: '10 Montpellois' },
  montpellois_25: { FR: '25 Montpellois', EN: '25 Montpellois' },
  montpellois_50: { FR: '50 Montpellois', EN: '50 Montpellois' },
  montpellois_100: { FR: '100 Montpellois', EN: '100 Montpellois' },
};

/**
 * Les deux prix rares, hors catalogue et hors poids : ils se jouent
 * chacun à une chance sur cent avant le reste, et prennent la place
 * d'un des trois objets. Le livre part par courriel tout de suite; la
 * nuit au Salon se remet à la main, depuis la collection prixRares.
 */
const PRIX_RARES = [
  { id: 'livre-recettes', type: 'livre', nomFR: 'Le livre de recettes du festival', nomEN: 'The festival recipe book' },
  { id: 'nuit-salon', type: 'nuit-salon', nomFR: 'Une nuit au Salon des Inconnus', nomEN: 'A night at Le Salon des Inconnus' },
];

function nomDe(id) {
  return NOMS[id] || { FR: id, EN: id };
}

/**
 * Le catalogue du coffre, bâti UNE fois au chargement des fonctions à
 * partir des tables de prix qui font déjà loi ailleurs : aucune
 * seconde liste à tenir en phase. Chaque entrée porte son poids déjà
 * normalisé, donc la somme des poids vaut 1.
 *
 * Le poids suit « le reste des pourcentages de chance arrive plus avec
 * les trucs de base » : 1 / (prix + 5), ce qui donne neuf pour cent à
 * un objet à un Montpellois et un demi pour cent à un objet à cent.
 */
function construireCatalogue(tables) {
  const entrees = [];
  const poser = (id, type, prix, prixDuPoids) => {
    const nom = nomDe(id);
    entrees.push({
      id, type, prix, nomFR: nom.FR, nomEN: nom.EN,
      poids: 1 / ((prixDuPoids === undefined ? prix : prixDuPoids) + 5),
    });
  };
  // Un objet offert (prix 0) ne se tire pas : il est déjà à tout le monde.
  for (const [skin, prix] of Object.entries(tables.PRIX_SKIN || {})) if (prix > 0) poser(skin, 'skin', prix);
  for (const [dos, prix] of Object.entries(tables.PRIX_DOS || {})) if (prix > 0) poser(dos, 'dos', prix);
  for (const [jeu, prix] of Object.entries(tables.PRIX_TAFL || {})) if (prix > 0) poser(jeu, 'tafl', prix);
  for (const objet of tables.CATALOGUE_BOUTIQUE || []) poser(objet.id, 'objet', objet.prix);
  for (const objet of tables.CATALOGUE_TROUVAILLE || []) poser(objet.id, 'trouvaille', PRIX_TROUVAILLE[objet.rarete]);
  for (const ambiance of tables.AMBIANCES_ACHETABLES || []) poser(ambiance, 'ambiance', tables.PRIX_AMBIANCE);
  for (const montant of PALIERS_MONTPELLOIS) {
    poser(`montpellois_${montant}`, 'montpellois', montant, POIDS_COMME_UN_OBJET_A[montant]);
  }
  const total = entrees.reduce((somme, e) => somme + e.poids, 0);
  for (const e of entrees) e.poids /= total;
  return entrees;
}

/** Une entrée tirée au sort selon les poids du catalogue. */
function tirerUneEntree(catalogue, alea) {
  let seuil = alea();
  for (const entree of catalogue) {
    seuil -= entree.poids;
    if (seuil < 0) return entree;
  }
  // L'arrondi flottant peut laisser un cheveu au bout de la roue.
  return catalogue[catalogue.length - 1];
}

/**
 * Les trois prises d'un coffre. `possedes` porte tout ce que la
 * personne a déjà, d'où que ça vienne; `alea` s'injecte pour que le
 * test rejoue une suite connue.
 *
 * Chaque prise rend { id, type, nomFR, nomEN, prix, doublon,
 * montpellois }. Un doublon ne se donne pas une seconde fois : il vaut
 * la moitié de son prix en pièces, arrondie vers le bas.
 */
function tirerCoffre(catalogue, possedes, alea = Math.random) {
  // Les prix rares se jouent AVANT le reste et prennent la place d'un
  // des trois objets : un coffre en donne trois, jamais quatre.
  const rares = [];
  for (const prix of PRIX_RARES) if (alea() < CHANCE_PRIX_RARE) rares.push(prix);

  // Chaque prix rare occupe une place, et jamais celle d'un autre :
  // deux fois le même prix dans un coffre n'aurait aucun sens.
  const places = new Map();
  const libres = [];
  for (let i = 0; i < OBJETS_PAR_COFFRE; i++) libres.push(i);
  for (const prix of rares) {
    const choisie = libres.splice(Math.floor(alea() * libres.length), 1)[0];
    places.set(choisie, prix);
  }

  const dansCeCoffre = new Set();
  const objets = [];
  for (let place = 0; place < OBJETS_PAR_COFFRE; place++) {
    const rare = places.get(place);
    if (rare) {
      objets.push({ ...rare, prix: 0, doublon: false, montpellois: 0 });
      continue;
    }
    const entree = tirerUneEntree(catalogue, alea);
    const commun = { id: entree.id, type: entree.type, nomFR: entree.nomFR, nomEN: entree.nomEN, prix: entree.prix };
    if (entree.type === 'montpellois') {
      objets.push({ ...commun, doublon: false, montpellois: entree.prix });
      continue;
    }
    // Déjà au coffre, ou sorti deux fois du même coffre : dans les
    // deux cas la personne ne peut pas le recevoir une seconde fois.
    const doublon = possedes.has(entree.id) || dansCeCoffre.has(entree.id);
    dansCeCoffre.add(entree.id);
    objets.push({ ...commun, doublon, montpellois: doublon ? Math.floor(entree.prix / 2) : 0 });
  }
  return objets;
}

/** Vrai quand aucune clé n'a été achetée depuis sept jours. */
function peutAcheterCle(dernierCle, maintenant) {
  if (!dernierCle) return true;
  return maintenant.getTime() - dernierCle.getTime() >= JOURS_ENTRE_DEUX_CLES * MS_PAR_JOUR;
}

/** Le moment où la prochaine clé se débloque, ou null si c'est maintenant. */
function prochaineCle(dernierCle) {
  return dernierCle ? new Date(dernierCle.getTime() + JOURS_ENTRE_DEUX_CLES * MS_PAR_JOUR) : null;
}

module.exports = {
  PRIX_COFFRE, PRIX_CLE, JOURS_ENTRE_DEUX_CLES, OBJETS_PAR_COFFRE, CHANCE_PRIX_RARE,
  PRIX_TROUVAILLE, PALIERS_MONTPELLOIS, PRIX_RARES,
  construireCatalogue, tirerCoffre, peutAcheterCle, prochaineCle,
};
