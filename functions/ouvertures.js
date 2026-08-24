// ─── Les décisions du pixel d'ouverture ──────────────────────────────
// Alex, 2026-08-24 : « Je dois pouvoir tracker qui ouvre les
// infolettres. » Chaque lettre porte une image d'un pixel, invisible,
// servie par une fonction publique. Le client de courriel va la
// chercher au moment où la personne ouvre le message, et c'est cet
// appel-là qui se note.
//
// Ce fichier ne parle ni à Firestore ni au réseau. Il ne tient que les
// trois décisions qui doivent être justes, ce qui les rend vérifiables
// par tools/ouvertures-check.mjs sans qu'une connexion s'ouvre :
// est-ce que ce jeton est le nôtre, où se range l'ouverture, et
// est-ce que celle-ci compte pour une personne de plus.
//
// LE JETON, la partie qui coûterait cher si elle était fausse. Sans
// signature, l'adresse d'une campagne suffirait à fabriquer des
// ouvertures pour n'importe qui, et le taux affiché à Alex serait un
// nombre inventé. La signature descend du même secret CAMPAGNE_CLE que
// le lien de désabonnement, sur un message de forme différente : un
// jeton de désabonnement ne peut donc pas servir de jeton d'ouverture,
// ni l'inverse.

const crypto = require('crypto');

/** Le jumeau vit dans index.js. Les deux doivent ranger l'adresse de
 *  la même façon, sinon le jeton signé à l'envoi ne vaut plus rien au
 *  retour. */
const normaliserCourriel = (c) => String(c || '').trim().toLowerCase();

/** L'image elle-même : un GIF transparent d'un pixel, 43 octets. Le
 *  plus petit fichier qu'un client de courriel accepte d'aller
 *  chercher, et le seul format que le moteur de Word comprend encore
 *  sans broncher. */
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

/**
 * La signature qui désigne un destinataire dans une campagne donnée.
 *
 * Le message signé porte les deux, séparés par une barre verticale,
 * qu'aucune adresse ne peut contenir : personne ne fabrique une
 * collision en glissant un caractère au bon endroit.
 */
function jetonPixel(campagneId, courriel, cle) {
  return crypto
    .createHmac('sha256', cle)
    .update(`${String(campagneId)}|${normaliserCourriel(courriel)}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Compare le jeton reçu au jeton attendu, en temps constant.
 *
 * `timingSafeEqual` exige deux tampons de même longueur et lève
 * autrement : la vérification de longueur vient donc avant, et une
 * chaîne vide ou tronquée repart simplement fausse.
 */
function jetonValide(campagneId, courriel, jeton, cle) {
  const recu = String(jeton || '');
  const attendu = jetonPixel(campagneId, courriel, cle);
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * L'endroit où se range une ouverture : `<campagne>__<courriel>`.
 *
 * Rend `null` plutôt qu'une clé douteuse. Une barre oblique dans l'un
 * des deux morceaux ouvrirait une sous-collection au lieu d'écrire un
 * document, et un identifiant vide écrirait n'importe où.
 */
function cleOuverture(campagneId, courriel) {
  const campagne = String(campagneId || '').trim();
  const adresse = normaliserCourriel(courriel);
  if (!campagne || !adresse) return null;
  if (campagne.includes('/') || adresse.includes('/')) return null;
  if (campagne.includes('__')) return null;
  return `${campagne}__${adresse}`;
}

/**
 * Ce qu'une ouverture change, selon ce qui était déjà écrit.
 *
 * `unique` est le seul champ qui compte pour le taux : il ne dit oui
 * qu'à la toute première ouverture d'une personne. Quelqu'un qui
 * rouvre la même lettre trois fois fait monter `fois` et laisse le
 * taux tranquille, sans quoi une seule personne curieuse suffirait à
 * faire croire à Alex que sa campagne a bien marché.
 *
 * @param existant Le document déjà en place, ou `null`.
 */
function fusionnerOuverture(existant) {
  if (!existant) return { unique: true, fois: 1 };
  const fois = Number(existant.fois);
  return { unique: false, fois: (Number.isFinite(fois) && fois > 0 ? fois : 0) + 1 };
}

module.exports = {
  PIXEL_GIF,
  normaliserCourriel,
  jetonPixel,
  jetonValide,
  cleOuverture,
  fusionnerOuverture,
};
