// ─── Les décisions de la minuterie ───────────────────────────────────
// Alex, 2026-08-24 : « Tu peux les programmer à être envoyées. » Les
// infolettres doivent pouvoir partir à des dates choisies d'avance,
// sans que personne soit devant l'écran au bon moment.
//
// Ce fichier ne parle ni à Firestore ni à Zoho. Il ne contient que les
// deux décisions qui doivent être justes, et rien d'autre : est-ce que
// cette campagne se prend maintenant, et à qui part-elle. Les garder
// ici, séparées de tout le reste, les rend vérifiables par
// tools/campagnes-programmees-check.mjs sans qu'une seule connexion
// s'ouvre et sans qu'un seul courriel risque de sortir.
//
// LE VERROU, la partie qui coûterait cher si elle était fausse. Deux
// exécutions de la minuterie peuvent se chevaucher, et une infolettre
// reçue en double par trois cents personnes est une faute qu'on ne
// rattrape pas. Le passage à « en cours » se fait donc dans une
// transaction, avant le premier courriel, et une campagne déjà en
// cours se refuse d'elle-même. C'est `estAPrendre` qui tranche, et la
// transaction vit dans index.js.

/** Le délai après lequel une campagne restée « en cours » est tenue
 *  pour abandonnée plutôt que vivante. La fonction d'envoi meurt à 540
 *  secondes, soit neuf minutes : à vingt minutes, aucune exécution
 *  vivante ne peut se faire voler son travail, et un plantage franc
 *  libère quand même la campagne au tour suivant. */
const VERROU_MS = 20 * 60 * 1000;

/** Les états qu'une campagne programmée peut porter. */
const ETATS = ['prevue', 'en cours', 'envoyee', 'annulee', 'echouee'];

/** Firestore rend des Timestamp, la page rend des Date, les essais
 *  rendent des nombres. Les trois se lisent pareil ici. */
function enMillis(valeur) {
  if (valeur == null) return null;
  if (typeof valeur === 'number') return valeur;
  if (valeur instanceof Date) return valeur.getTime();
  if (typeof valeur.toMillis === 'function') return valeur.toMillis();
  if (typeof valeur.seconds === 'number') return valeur.seconds * 1000;
  return null;
}

const normaliserCourriel = (c) => String(c || '').trim().toLowerCase().replace(/\s+/g, '');

/**
 * Est-ce que la minuterie prend cette campagne, maintenant ?
 *
 * Une seule porte, quatre refus, et chaque refus porte son nom pour
 * que le journal dise pourquoi une campagne est restée là.
 *
 * @returns {{ prendre: boolean, raison: string, reprisA: string }}
 *   `reprisA` est l'adresse jusqu'à laquelle le tour précédent s'était
 *   rendu. Vide quand la campagne part du début.
 */
function estAPrendre(doc, maintenant, verrouMs = VERROU_MS) {
  const refus = (raison) => ({ prendre: false, raison, reprisA: '' });
  if (!doc) return refus('document introuvable');

  const statut = String(doc.statut || '');
  if (!ETATS.includes(statut)) return refus(`état inconnu (${statut})`);

  // Les trois états qui ferment la porte pour de bon. Une campagne
  // annulée ne part JAMAIS, même si son heure est passée depuis
  // longtemps : c'est le seul geste qu'Alex a pour rattraper une
  // lettre avant qu'elle sorte.
  if (statut === 'annulee') return refus('campagne annulée');
  if (statut === 'envoyee') return refus('campagne déjà envoyée');
  if (statut === 'echouee') return refus('campagne en échec, à reprendre à la main');

  const prevu = enMillis(doc.envoiPrevuLe);
  if (prevu == null) return refus('aucune heure d’envoi');
  if (prevu > maintenant) return refus('l’heure n’est pas venue');

  // Une campagne « en cours » appartient à l'exécution qui l'a prise.
  // Elle ne se reprend qu'une fois le verrou périmé, et elle repart
  // alors d'où le tour précédent s'était arrêté.
  if (statut === 'en cours') {
    const depuis = enMillis(doc.demarreeLe);
    if (depuis != null && maintenant - depuis < verrouMs) return refus('déjà en cours');
    return { prendre: true, raison: 'reprise après interruption', reprisA: String(doc.reprisA || '') };
  }

  return { prendre: true, raison: 'l’heure est venue', reprisA: '' };
}

/**
 * À qui la lettre part.
 *
 * Le jumeau de `appliquerFiltre` et `destinatairesDepuis`, dans
 * src/firebase/campagnes.ts. Les deux doivent rendre exactement la même
 * liste pour la même portée, et tools/campagnes-programmees-check.mjs
 * les fait tourner côte à côte sur le même registre pour s'en assurer.
 *
 * La liste se résout au MOMENT DE L'ENVOI, jamais au moment où la
 * campagne est programmée. Une lettre écrite le 24 août pour partir le
 * 2 septembre doit toucher les gens inscrits entre les deux, et surtout
 * elle ne doit pas inviter à acheter un billet quelqu'un qui l'a acheté
 * la semaine d'avant.
 *
 * Le tri par adresse n'est pas cosmétique : c'est lui qui rend la
 * reprise exacte. Quand un envoi s'interrompt, la campagne retient la
 * dernière adresse traitée, et le tour suivant écarte tout ce qui vient
 * avant elle. L'ordre doit donc être le même d'un tour à l'autre.
 *
 * @param clients  Les fiches du registre.
 * @param comptes  Les adresses qui portent déjà un compte sur le site.
 * @param portee   Le filtre tel que la page d'admin l'a posé.
 */
function destinatairesDuFiltre(clients, comptes, portee, anneeCourante) {
  const p = portee || {};
  const listeComptes = comptes instanceof Set
    ? comptes
    : new Set(comptes ? [...comptes.keys()].map(normaliserCourriel) : []);

  // ── Les personnes cochées à la main ──
  // La page a nommé les adresses une à une. Le registre ne sert alors
  // qu'à retrouver le prénom qui personnalise la lettre.
  if (p.mode === 'coches') {
    const noms = new Map();
    for (const c of clients || []) {
      const adresse = normaliserCourriel(c && c.courriel);
      if (adresse && !noms.get(adresse)) noms.set(adresse, String((c && c.nom) || '').trim());
    }
    const vus = new Set();
    const retenus = [];
    for (const brut of p.courriels || []) {
      const adresse = normaliserCourriel(brut);
      if (!adresse || vus.has(adresse)) continue;
      vus.add(adresse);
      retenus.push({ courriel: adresse, nom: noms.get(adresse) || '' });
    }
    return retenus.sort((a, b) => (a.courriel < b.courriel ? -1 : a.courriel > b.courriel ? 1 : 0));
  }

  // ── Le filtre ──
  // Les adresses qui ont déjà pris quelque chose pour l'année en cours.
  // Le regroupement se fait sur l'ADRESSE et non sur la fiche :
  // quelqu'un qui a pris un billet en 2024 et un kiosque en 2026 est
  // bien revenu cette année, même si sa fiche de 2024 dit le contraire.
  // Une commande annulée ne compte pas.
  let dejaCetteAnnee = null;
  if (p.sansAchatCetteAnnee) {
    dejaCetteAnnee = new Set();
    for (const c of clients || []) {
      if (c && c.annee === anneeCourante && c.statut !== 'annule') {
        dejaCetteAnnee.add(normaliserCourriel(c.courriel));
      }
    }
  }

  const annees = Array.isArray(p.annees) ? p.annees : [];
  const categories = Array.isArray(p.categories) ? p.categories : [];

  const parAdresse = new Map();
  for (const c of clients || []) {
    if (!c) continue;
    if (annees.length && !annees.includes(c.annee)) continue;
    if (categories.length && !categories.includes(c.categorie)) continue;
    const adresse = normaliserCourriel(c.courriel);
    if (!adresse) continue;
    if (dejaCetteAnnee && dejaCetteAnnee.has(adresse)) continue;
    if (p.sansCompte && listeComptes.has(adresse)) continue;
    // Le premier nom non vide l'emporte : une fiche sans nom ne doit
    // pas effacer celui d'une autre année.
    if (!parAdresse.get(adresse)) parAdresse.set(adresse, String(c.nom || '').trim());
  }

  return [...parAdresse]
    .map(([courriel, nom]) => ({ courriel, nom }))
    .sort((a, b) => (a.courriel < b.courriel ? -1 : a.courriel > b.courriel ? 1 : 0));
}

/** Ce qui reste à envoyer après une interruption. Les adresses déjà
 *  traitées viennent avant `reprisA` dans l'ordre alphabétique, alors
 *  il suffit de les écarter. La reprise reste juste même si le registre
 *  a bougé entre les deux tours. */
function resteAFaire(vises, reprisA) {
  if (!reprisA) return vises;
  return vises.filter((v) => v.courriel > reprisA);
}

module.exports = {
  VERROU_MS, ETATS, enMillis, normaliserCourriel,
  estAPrendre, destinatairesDuFiltre, resteAFaire,
};
