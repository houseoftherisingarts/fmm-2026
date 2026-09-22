"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAGS_INTERACTIFS = exports.hash = exports.nombre = exports.texte = exports.RETENTION_JOURS_JOURS = exports.RETENTION_SESSIONS_JOURS = exports.RETENTION_LOTS_JOURS = exports.DERIVE_HORLOGE_MS = exports.RECLAMATION_MS = exports.VERROU_MS = exports.LOTS_PAR_TOUR = exports.ELEMENTS_PAR_PAGE_MAX = exports.PLAFONDS_JOURNEE = exports.TAILLE_MAX_JOUR = exports.TAILLE_MAX_CARTE = exports.POINTS_MOUV_MAX = exports.POINTS_CLICS_MAX = exports.EVENEMENTS_MAX = exports.TAILLE_MAX_REPLAY = exports.TAILLE_MAX_LOT = exports.CACHE_REGLAGES_MS = exports.DOC_VERROU = exports.DOC_REGLAGES = exports.IPS_EXCLUES_MAX = exports.DOC_EXCLUSIONS = exports.HOTES_PERMIS = exports.ORIGINES_DEV = exports.SITES_PERMIS = void 0;
exports.cheminSur = cheminSur;
exports.clePage = clePage;
exports.jourDe = jourDe;
exports.heureDe = heureDe;
exports.deviceDe = deviceDe;
exports.hoteDe = hoteDe;
exports.chaineDe = chaineDe;
exports.adresseDe = adresseDe;
const crypto_1 = require("crypto");
// ─── VexelHotjar : la mesure du comportement des visiteurs ──────────────────
// Le module maison qui remplace Hotjar : le petit script du site
// (src/vexelhotjar/tracker.ts) envoie ses lots d'événements ici, à l'adresse
// /api/vh que l'hébergement réécrit vers cette fonction. Rien ne part du
// navigateur avant le consentement aux témoins, aucune adresse IP n'est
// gardée, et les enregistrements de session masquent tout ce qui se tape.
//
// Trois portes et deux horloges :
//   vhCollecter          reçoit les lots (clics, vues, défilement, erreurs,
//                        formulaires) et les morceaux d'enregistrement rrweb
//   vhAgreger            toutes les 15 minutes, fond les lots dans les
//                        journées (vh_jours) et les cartes (vh_cartes)
//   vhAgregerMaintenant  le bouton « Rafraîchir » de l'admin, même travail
//   vhEffacerSession     l'admin retire une session, son enregistrement et ses lots
//   vhPurger             chaque nuit, jette ce qui a dépassé sa durée de vie
// et GET /api/vh?moi rend à l'admin son adresse telle que le collecteur la voit.
//
// Collections : vh_lots (brut, quelques jours), vh_sessions (une fiche par
// visite, 90 jours), vh_jours (une fiche par jour et par site, 400 jours),
// vh_cartes (les points des cartes de chaleur par page, appareil et jour).
// Les enregistrements vivent dans Storage sous vh/replays/<session>/<n>.json.gz.
//
// Ce dossier se lit en trois fichiers : commun.ts (constantes et petites
// mains), collecte.ts (la porte d'entrée) et agregation.ts (les horloges et
// les portes d'administration). index.ts rassemble les exports.
exports.SITES_PERMIS = ['fmm'];
exports.ORIGINES_DEV = ['http://localhost:5173', 'http://localhost:5199', 'http://127.0.0.1:5173'];
// Les hôtes d'où un lot peut venir (l'en-tête Origin ou Referer du navigateur) : le
// site lui-même, ses alias Firebase, et les origines de développement. Un envoi
// scripté peut imiter l'en-tête, la vraie borne reste les tailles et la cadence.
exports.HOTES_PERMIS = ['festivalmedievaldemontpellier.org', 'festivalmedieval.org', 'festivalmedieval.web.app', 'festivalmedieval.firebaseapp.com', 'localhost', '127.0.0.1'];
// Les adresses IP du client et de son équipe, à ne jamais compter : dans un document
// que seul l'admin lit (vh_prive/exclusions), jamais dans settings/ qui est public.
exports.DOC_EXCLUSIONS = ['vh_prive', 'exclusions'];
exports.IPS_EXCLUES_MAX = 40;
// Les réglages de l'admin (settings/vexelhotjar : allumée ou non, chemins à
// ignorer) et le verrou de l'agrégation, relus toutes les cinq minutes.
exports.DOC_REGLAGES = ['settings', 'vexelhotjar'];
exports.DOC_VERROU = ['vh_prive', 'verrou'];
exports.CACHE_REGLAGES_MS = 5 * 60000;
exports.TAILLE_MAX_LOT = 500000; // un lot d'événements, en octets
exports.TAILLE_MAX_REPLAY = 6000000; // un morceau d'enregistrement, gzippé ou non
exports.EVENEMENTS_MAX = 600;
// Une carte (page × appareil × jour) reste loin sous le mégaoctet de Firestore.
exports.POINTS_CLICS_MAX = 1500;
exports.POINTS_MOUV_MAX = 3000;
exports.TAILLE_MAX_CARTE = 900000;
exports.TAILLE_MAX_JOUR = 900000; // octets, journée existante plus incréments du tour
// Une journée non plus : au-delà de ces plafonds, les nouvelles clés du jour
// (une page jamais vue, une source de plus) se laissent tomber.
exports.PLAFONDS_JOURNEE = { pages: 100, entrees: 100, sources: 100, campagnes: 60, objectifs: 80, erreursListe: 40, formulaires: 60 };
exports.ELEMENTS_PAR_PAGE_MAX = 30;
// L'agrégation : tant de lots par tour, un verrou de neuf minutes, un lot
// réclamé puis oublié (fonction tuée en route) se reprend après trente
// minutes, et une horloge de visiteur décalée de plus de six heures cède la
// place à l'heure de réception.
exports.LOTS_PAR_TOUR = 250;
exports.VERROU_MS = 9 * 60000;
exports.RECLAMATION_MS = 30 * 60000;
exports.DERIVE_HORLOGE_MS = 6 * 3600000;
exports.RETENTION_LOTS_JOURS = 3;
exports.RETENTION_SESSIONS_JOURS = 90;
exports.RETENTION_JOURS_JOURS = 400;
// ─── Petites mains ──────────────────────────────────────────────────────────
const texte = (v, max) => String(v ?? '').slice(0, max);
exports.texte = texte;
// Un chemin de page vient du navigateur du visiteur, donc de n'importe qui :
// on ne garde qu'un chemin relatif propre (une seule barre au début, lettres,
// chiffres, tirets, points et barres), sans requête ni hôte, pour que l'admin
// puisse l'ouvrir en cadre sans jamais pointer ailleurs que sur le site.
function cheminSur(v) {
    const brut = String(v ?? '').split(/[?#]/)[0].replace(/\\/g, '/');
    if (!brut.startsWith('/') || brut.startsWith('//'))
        return '/';
    const propre = brut.replace(/[^a-zA-Z0-9\-._~/%]/g, '').replace(/\/{2,}/g, '/').replace(/\/+$/, '').slice(0, 200);
    return propre || '/';
}
const nombre = (v, min, max, defaut = 0) => {
    const n = Number(v);
    if (!Number.isFinite(n))
        return defaut;
    return Math.min(max, Math.max(min, n));
};
exports.nombre = nombre;
// Hexadécimal seulement : la clé sert de segment de chemin dans un update() pointé.
const hash = (s) => (0, crypto_1.createHash)('sha1').update(s).digest('hex').slice(0, 10);
exports.hash = hash;
/** Une clé de champ Firestore pour un chemin de page : p + dix hexadécimaux du
 *  chemin, pour que /a-b et /a/b ne se confondent jamais; le chemin lisible
 *  se garde à côté (pages.<clé>.path). */
function clePage(path) {
    return 'p' + (0, exports.hash)(path || '/');
}
function jourDe(ms) {
    // Le jour se compte à l'heure de Montréal, comme le reste de l'admin.
    return new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'America/Toronto' });
}
const FORMAT_HEURE = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Toronto', hour: '2-digit', hourCycle: 'h23' });
function heureDe(ms) {
    return Number(FORMAT_HEURE.format(new Date(ms))) || 0;
}
exports.TAGS_INTERACTIFS = new Set(['a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'video', 'audio']);
function deviceDe(vw) {
    if (vw < 768)
        return 'mobile';
    if (vw < 1100)
        return 'tablette';
    return 'ordinateur';
}
function hoteDe(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    }
    catch {
        return '';
    }
}
const entete = (req, nom) => String((req.get ? req.get(nom) : req.headers?.[nom]) || '');
/** Les maillons de x-forwarded-for, du plus lointain au plus proche. */
function chaineDe(req) {
    return entete(req, 'x-forwarded-for').split(',').map(s => s.trim()).filter(Boolean);
}
/** L'adresse du navigateur. Par l'hébergement (les lots, /api/vh?moi), la
 *  chaîne finit par « …, client, mandataire de Firebase Hosting » : le
 *  client est l'avant-dernier maillon, et ce qu'un navigateur glisse
 *  lui-même en tête de chaîne ne compte pas. Appelée en direct (l'adresse
 *  run.app), le client est le dernier maillon. */
function adresseDe(req) {
    const chaine = chaineDe(req);
    if (!chaine.length)
        return String(req.ip || '').trim();
    const parHebergement = !!(entete(req, 'x-country-code') || entete(req, 'x-forwarded-host'));
    return parHebergement && chaine.length >= 2 ? chaine[chaine.length - 2] : chaine[chaine.length - 1];
}
