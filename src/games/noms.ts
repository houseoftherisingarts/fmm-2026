// ─── Les noms de la table ───────────────────────────────────────────
// Alex, 2026-09-01 : quand personne ne se présente en une minute, la
// partie s'ouvre quand même, contre la maison. L'adversaire prend alors
// un nom tiré au sort, comme n'importe quel joueur du festival.
//
// Les noms sont composés d'un prénom médiéval courant et d'un surnom de
// métier ou de lieu, à la façon des rôles de taille du XIVe siècle.
// Rien de tout cela ne désigne quelqu'un : ce sont des assemblages, et
// la liste évite les noms de familles encore portées dans la région.

const PRENOMS = [
  'Aymeric', 'Bertrand', 'Colin', 'Enguerrand', 'Firmin', 'Gauvain',
  'Hersent', 'Isabeau', 'Jehan', 'Lambert', 'Mahaut', 'Nicolas',
  'Oudard', 'Perrine', 'Raoul', 'Sibylle', 'Thibaut', 'Ursin',
  'Vivien', 'Aliénor', 'Berthe', 'Clément', 'Eudes', 'Garin',
  'Guillemette', 'Hugues', 'Jacquette', 'Martin', 'Ysabel', 'Renaud',
];

const SURNOMS = [
  'le Charpentier', 'la Tisserande', 'le Fauconnier', 'du Moulin',
  'le Bouvier', 'la Meunière', 'le Vannier', 'de la Combe',
  'le Ferrand', 'la Potière', 'le Sellier', 'du Gué',
  'le Tanneur', 'la Bergère', 'le Verrier', 'des Bois',
  'le Boisselier', 'la Chandelière', 'le Cordier', 'du Puits',
  'le Maçon', 'la Brodeuse', 'le Berger', 'de la Lande',
];

const SURNOMS_EN = [
  'the Carpenter', 'the Weaver', 'the Falconer', 'of the Mill',
  'the Oxherd', 'the Miller', 'the Basketmaker', 'of the Combe',
  'the Smith', 'the Potter', 'the Saddler', 'of the Ford',
  'the Tanner', 'the Shepherdess', 'the Glazier', 'of the Woods',
  'the Cooper', 'the Chandler', 'the Roper', 'of the Well',
  'the Mason', 'the Broiderer', 'the Shepherd', 'of the Heath',
];

/** Un nom d'adversaire, tiré au sort. */
export function nomDadversaire(fr = true): string {
  const p = PRENOMS[Math.floor(Math.random() * PRENOMS.length)];
  const liste = fr ? SURNOMS : SURNOMS_EN;
  const s = liste[Math.floor(Math.random() * liste.length)];
  return `${p} ${s}`;
}
