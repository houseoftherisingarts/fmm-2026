// ─── Le concours de parrainage · la porte du tirage ─────────────────
// Un artisan commandite un prix et le tirage se fait parmi ceux qui ont
// amené quelqu'un au festival. Cocher la case remet aussi son courriel
// au commanditaire, donc la coche vaut consentement.
//
// Pourquoi cette fonction existe. La première version comptait les
// filleuls dans le navigateur puis écrivait `concoursParrainage`
// directement dans `users/{uid}`. Les règles Firestore laissent chaque
// membre écrire les champs de sa propre fiche qui ne figurent pas dans
// userChampsServeur(), et ce champ n'y était pas : n'importe qui pouvait
// donc entrer au tirage depuis la console sans avoir parrainé personne,
// et se faire remettre au commanditaire par la même occasion. Le compte
// des filleuls se fait maintenant ici, avec le SDK admin, et le champ est
// passé du côté serveur dans les règles.
//
// Même patron que functions/placeClan.js : une fabrique qui reçoit du
// serveur ce dont elle a besoin et rend les fonctions Cloud.

const { onCall, HttpsError } = require('firebase-functions/v2/https');

const REGION = 'us-central1';

/** Le commanditaire de l'édition, pour ne pas mêler deux tirages. */
const COMMANDITAIRE = 'artisans-azure-2026';

// Alex tient le site et n'a pas de filleul à lui. Son compte vaut une
// chance pour qu'il puisse essayer le bouton avant de le montrer au
// commanditaire. La liste vit ici plutôt que dans le navigateur, où elle
// publiait son adresse en clair dans le bundle.
const COURRIELS_TEST = ['alex@lesalondesinconnus.com'];

const handlers = ({ db, FieldValue }) => {
  const SV = () => FieldValue.serverTimestamp();

  /** Le nombre de personnes réellement entrées avec mon code. */
  async function compterFilleuls(uid) {
    const snap = await db.collection('parrainages').where('parrainUid', '==', uid).get();
    if (snap.size > 0) return snap.size;
    const fiche = await db.collection('users').doc(uid).get();
    const courriel = fiche.exists ? String(fiche.data().email || '').toLowerCase() : '';
    return COURRIELS_TEST.includes(courriel) ? 1 : 0;
  }

  /** Ce que la fiche dit aujourd'hui, plus le nombre de chances. */
  async function lire(uid) {
    const [fiche, chances] = await Promise.all([
      db.collection('users').doc(uid).get(),
      compterFilleuls(uid),
    ]);
    const c = fiche.exists ? fiche.data().concoursParrainage : null;
    return {
      chances,
      consentement: c ? { accepte: !!c.accepte, commanditaire: c.commanditaire || null } : null,
    };
  }

  /**
   * Cocher la case, ou la décocher. Sans filleul, rien ne s'écrit et la
   * réponse dit pourquoi, pour que l'espace membre affiche la phrase.
   * Décocher reste toujours permis : personne ne doit être retenu dans
   * une liste qu'il vient de quitter.
   */
  async function poser(uid, data) {
    const accepte = data.accepte !== false;
    if (accepte) {
      const chances = await compterFilleuls(uid);
      if (chances === 0) return { etat: 'sans-filleul', chances: 0 };
    }
    await db.collection('users').doc(uid).set({
      concoursParrainage: { accepte, commanditaire: COMMANDITAIRE, signeLe: SV() },
    }, { merge: true });
    return { etat: 'ok', chances: await compterFilleuls(uid) };
  }

  return { lire, poser };
};

module.exports = (deps) => {
  const h = handlers(deps);
  const appel = (fn) => onCall({ region: REGION }, async (requete) => {
    const uid = requete.auth && requete.auth.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous d’abord.');
    return fn(uid, requete.data || {}, requete);
  });
  return {
    concoursParrainageLire: appel(h.lire),
    concoursParrainagePoser: appel(h.poser),
  };
};
module.exports.handlers = handlers;
