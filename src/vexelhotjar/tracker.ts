// ─── VexelHotjar, côté navigateur ───────────────────────────────────────────
// Le petit script qui regarde ce que font les visiteuses : les pages vues,
// où elles cliquent (et sur quoi, avec la position dans l'élément pour que la
// carte de chaleur retombe au bon endroit même quand la mise en page bouge),
// jusqu'où elles descendent, les clics de rage et les clics morts, les
// erreurs JavaScript, les formulaires commencés puis laissés, et les
// objectifs (`data-vh-objectif="nom"` sur un bouton, `data-vh-niveau="gros"`
// pour une transaction, « petit » sinon).
//
// Il ne démarre qu'après le consentement aux témoins, ne pose aucun témoin,
// garde l'identifiant de session dans sessionStorage et celui de visiteuse
// dans localStorage (un nombre aléatoire, rien d'autre). Les lots partent par
// sendBeacon vers /api/vh toutes les huit secondes ou quand la page se ferme.
// Aucune dépendance : le fichier s'emporte tel quel sur un autre site.

export interface ConfigVexelHotjar {
  site: string;
  /** L'adresse de la fonction de collecte, /api/vh par défaut (réécriture Hosting). */
  endpoint?: string;
  /** Chemins ignorés (préfixes) : l'admin, par exemple. */
  exclure?: string[];
  /** Part des sessions enregistrées (0 à 1), 0 pour ne rien enregistrer. */
  echantillonReplay?: number;
  /** Le module d'enregistrement, chargé à part pour ne pas alourdir le site. */
  chargerReplay?: () => Promise<{ demarrer: (envoyer: (seq: number, events: unknown[]) => void) => () => void }>;
}

type Ev = Record<string, unknown> & { t: string; ts: number; path: string; pv: string };

const CLE_SID = 'vh.sid';
const CLE_SID_T = 'vh.sid.t';
const CLE_VID = 'vh.vid';
const CLE_REPLAY = 'vh.replay';
const CLE_MORCEAU = 'vh.morceau';   // le prochain numéro de morceau du film, continu d'un rechargement à l'autre
const CLE_PARCOURS = 'vh.parcours';
const CLE_MOI = 'vh.moi';   // '1' : ce navigateur ne se compte pas (le client et son équipe); '0' : il se compte malgré tout
const INACTIVITE_MS = 30 * 60_000;
const CADENCE_ENVOI_MS = 8_000;
const RAGE_FENETRE_MS = 1000;
const RAGE_RAYON_PX = 30;
const MORT_DELAI_MS = 1500;
const MOUV_PAS_MS = 250;
const MOUV_MAX_PAR_PAGE = 400;

let actif = false;
let config: Required<Pick<ConfigVexelHotjar, 'site' | 'endpoint' | 'exclure' | 'echantillonReplay'>> & ConfigVexelHotjar;
let sid = '';
let vid = '';
let nouveau = false;
let file: Ev[] = [];
let parcours: string[] = [];
let minuterie: number | undefined;
let arreterReplay: (() => void) | null = null;

// L'état de la page en cours.
let pv = '';
let pathCourant = '';
let debutPage = 0;
let scrollMax = 0;
let mouvements: number[] = [];
let dernierMouv = 0;
let clicsRecents: { x: number; y: number; t: number }[] = [];
// Mutations du DOM récentes, par paires (horodatage, nombre), pour juger un
// clic mort en comparant le remue-ménage d'avant le clic à celui d'après.
let mutations: number[] = [];
// Les clics dont on guette la réponse (une seconde et demie chacun) : un
// compteur par clic, pour qu'un second clic n'efface pas la preuve du premier.
const guetteurs: { el: Element; n: number }[] = [];
let formsCommences = new Map<string, string>();   // sélecteur du formulaire → dernier champ touché
let formsSoumis = new Set<string>();

const id = (): string => {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; }
};
const lire = (s: Storage, k: string): string => { try { return s.getItem(k) || ''; } catch { return ''; } };
const ecrire = (s: Storage, k: string, v: string) => { try { s.setItem(k, v); } catch { /* navigation privée */ } };

function chemin(): string {
  return location.pathname.replace(/\/+$/, '') || '/';
}

function exclu(path: string): boolean {
  return config.exclure.some(p => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'));
}

// ─── Identités ──────────────────────────────────────────────────────────────

function ouvrirSession() {
  const dernier = Number(lire(sessionStorage, CLE_SID_T)) || 0;
  sid = lire(sessionStorage, CLE_SID);
  if (!sid || Date.now() - dernier > INACTIVITE_MS) {
    sid = id();
    ecrire(sessionStorage, CLE_SID, sid);
    ecrire(sessionStorage, CLE_PARCOURS, '[]');
    ecrire(sessionStorage, CLE_REPLAY, '');
    ecrire(sessionStorage, CLE_MORCEAU, '0');
  }
  // Le parcours survit à un rechargement : la deuxième page d'une même visite
  // ne se compte pas comme une nouvelle visite.
  try { parcours = JSON.parse(lire(sessionStorage, CLE_PARCOURS) || '[]'); } catch { parcours = []; }
  if (!Array.isArray(parcours)) parcours = [];
  toucherSession();
  vid = lire(localStorage, CLE_VID);
  if (!vid) { vid = id(); nouveau = true; ecrire(localStorage, CLE_VID, vid); }
}

function toucherSession() { ecrire(sessionStorage, CLE_SID_T, String(Date.now())); }

// ─── Sélecteurs ─────────────────────────────────────────────────────────────

const INTERACTIFS = 'a,button,input,select,textarea,label,summary,[role="button"],[role="link"],[data-vh-objectif]';
// Deux niveaux d'objectif : « gros » pour une transaction (un achat, un
// billet), « petit » pour l'engagement qui revient (une liste d'attente,
// l'infolettre, un quiz complété).
export type NiveauObjectif = 'gros' | 'petit';
const niveauDe = (v: unknown): NiveauObjectif => (v === 'gros' ? 'gros' : 'petit');


/** Un chemin CSS court et stable : un id s'il y en a un, sinon la lignée avec nth-of-type, six niveaux au plus. */
export function selecteur(el: Element): string {
  const parts: string[] = [];
  let e: Element | null = el;
  while (e && e !== document.body && parts.length < 6) {
    if (e.id && !/\d{3,}/.test(e.id)) { parts.unshift(`#${CSS.escape(e.id)}`); break; }
    const tag = e.tagName.toLowerCase();
    const parent: Element | null = e.parentElement;
    let part = tag;
    if (parent) {
      const freres = Array.from(parent.children).filter(c => c.tagName === e!.tagName);
      if (freres.length > 1) part += `:nth-of-type(${freres.indexOf(e) + 1})`;
    }
    parts.unshift(part);
    e = parent;
  }
  return parts.join('>');
}

function texteDe(el: Element): string {
  const aria = el.getAttribute('aria-label');
  // Un champ de formulaire n'a pas de texte : son étiquette, son placeholder
  // ou son nom disent ce qu'il est (« Courriel », « Votre prénom »).
  const champ = el.matches('input,select,textarea')
    ? (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent) || el.getAttribute('placeholder') || el.getAttribute('name') || ''
    : '';
  let t = (aria || champ || (el as HTMLElement).innerText || el.getAttribute('title') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
  // Un clic dans le vide d'un bandeau ou d'une section ramène tout le texte du
  // bloc : on garde plutôt ce qu'est le bloc, avec ses premiers mots.
  if (t.length > 40 && !el.matches(INTERACTIFS)) {
    const noms: Record<string, string> = { header: 'En-tête', nav: 'Menu', footer: 'Pied de page', section: 'Section', article: 'Article', aside: 'Encadré', main: 'Contenu', form: 'Formulaire' };
    t = `${noms[el.tagName.toLowerCase()] || 'Zone'} · ${t.slice(0, 28).trim()}…`;
  }
  return t.slice(0, 60);
}

// ─── La file et l'envoi ─────────────────────────────────────────────────────

// enFermeture : la page se ferme ou se cache; un lot qui déborde la file
// pendant ces poussées (la sortie, les formulaires laissés, la souris) part
// aussi par beacon, sinon la fermeture de l'onglet l'annulerait.
let enFermeture = false;

function pousser(e: Omit<Ev, 'ts' | 'path' | 'pv'> & Partial<Ev>) {
  if (!actif) return;
  file.push({ ts: Date.now(), path: pathCourant, pv, ...e } as Ev);
  toucherSession();
  if (file.length >= 40) envoyer(enFermeture);
  else if (minuterie === undefined) minuterie = window.setTimeout(() => envoyer(), CADENCE_ENVOI_MS);
}

// urgent : la page se ferme ou se cache, le lot part par beacon (voir livrer).
function envoyer(urgent = false) {
  if (minuterie !== undefined) { clearTimeout(minuterie); minuterie = undefined; }
  if (!file.length) return;
  const lot = file;
  file = [];
  const corps = JSON.stringify({ v: 1, t: 'lot', site: config.site, sid, vid, nouveau, parcours: parcours.slice(-60), ev: lot });
  nouveau = false;
  livrer(corps, urgent);
}

// Le quota de 64 Kio de sendBeacon et de fetch keepalive est partagé par tous
// les envois en attente de la page : ils ne servent qu'au moment où la page
// se cache ou se ferme (le navigateur peut la tuer sans prévenir); les envois
// de routine, toutes les huit secondes, passent par un fetch ordinaire. Le
// signal vient de l'appelant (pagehide arrive alors que visibilityState dit
// encore « visible »), l'état du document ne sert que de filet.
function livrer(corps: string | Blob, urgent = false) {
  const blob = corps instanceof Blob ? corps : new Blob([corps], { type: 'text/plain' });
  const ferme = (urgent || document.visibilityState === 'hidden') && blob.size < 60_000;
  try {
    if (ferme && navigator.sendBeacon && navigator.sendBeacon(config.endpoint, blob)) return;
  } catch { /* on passe par fetch */ }
  fetch(config.endpoint, { method: 'POST', body: blob, keepalive: ferme, credentials: 'omit' }).catch(() => {});
}

// ─── Pages ──────────────────────────────────────────────────────────────────

function utmDe(): Record<string, string> | undefined {
  const q = new URLSearchParams(location.search);
  const u: Record<string, string> = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const v = q.get(k); if (v) u[k] = v.slice(0, 80);
  }
  return Object.keys(u).length ? u : undefined;
}

function hauteurDoc(): number {
  return Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0, 1);
}

function noterMutations(recs: MutationRecord[]) {
  const now = Date.now();
  let n = 0;
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    if (r.type === 'attributes' && r.attributeName === 'style') {
      // Une animation en style ne compte que sur l'élément cliqué, ses
      // descendants ou ses ancêtres (le bouton qui s'enfonce, la carte qui se
      // presse quand on clique son texte); ailleurs, c'est le décor qui bouge
      // tout seul, et html ou body ne comptent pas (une variable de curseur
      // posée sur la racine masquerait tous les clics morts).
      const t = r.target;
      for (const g of guetteurs) {
        if (g.el.contains(t) || (t !== document.documentElement && t !== document.body && t.contains(g.el))) g.n += 1;
      }
    } else n += 1;
  }
  if (n) mutations.push(now, n);
  if (mutations.length > 400) {
    let i = 0;
    while (i < mutations.length && mutations[i] < now - MORT_DELAI_MS * 2) i += 2;
    mutations = mutations.slice(i);
  }
}

function mutationsEntre(a: number, b: number): number {
  let n = 0;
  for (let i = 0; i + 1 < mutations.length; i += 2) if (mutations[i] >= a && mutations[i] < b) n += mutations[i + 1];
  return n;
}

function mesurerScroll() {
  const y = window.scrollY + window.innerHeight;
  const p = Math.min(100, Math.round((y / hauteurDoc()) * 100));
  if (p > scrollMax) scrollMax = p;
}

function ouvrirPage(premier: boolean) {
  const path = chemin();
  if (exclu(path)) { pv = ''; pathCourant = path; return; }
  pv = id();
  pathCourant = path;
  debutPage = Date.now();
  scrollMax = 0;
  mouvements = [];
  clicsRecents = [];
  formsCommences = new Map();
  formsSoumis = new Set();
  const premiereDeLaVisite = parcours.length === 0;
  if (parcours[parcours.length - 1] !== path) { parcours.push(path); ecrire(sessionStorage, CLE_PARCOURS, JSON.stringify(parcours.slice(-60))); }
  window.setTimeout(mesurerScroll, 400);
  pousser({
    t: 'vue', titre: document.title.slice(0, 120),
    ref: premier ? document.referrer.slice(0, 300) : '',
    vw: window.innerWidth, vh: window.innerHeight, lang: document.documentElement.lang || navigator.language,
    premier: premier && premiereDeLaVisite, utm: utmDe(),
  });
}

function fermerPage(fin: boolean) {
  if (!pv) return;
  enFermeture = fin;
  try {
    mesurerScroll();
    viderMouvements();
    if (fin) {
      for (const [s, champ] of formsCommences) {
        if (!formsSoumis.has(s)) pousser({ t: 'form', s, etat: 'abandon', champ });
      }
      formsCommences.clear();
    }
    // clos : la vue de page est finie (changement de page ou fermeture); fin : la visite quitte le site.
    pousser({ t: 'sortie', duree: Date.now() - debutPage, scrollMax, pages: parcours.length, fin, clos: 1, vw: window.innerWidth });
    debutPage = Date.now();
    envoyer(fin);
  } finally {
    enFermeture = false;
  }
  if (fin) pv = '';
}

// L'onglet passe à l'arrière-plan : le temps passé part tout de suite (le
// navigateur peut tuer la page sans prévenir), et la même vue reprend au
// retour sans compter une nouvelle visite de la page.
function pauserPage() {
  if (!pv) return;
  enFermeture = true;
  try {
    mesurerScroll();
    viderMouvements();
    // L'onglet passe à l'arrière-plan : la vue continue (pas de clos), seule la durée s'additionne.
    pousser({ t: 'sortie', duree: Date.now() - debutPage, scrollMax, pages: parcours.length, fin: false, vw: window.innerWidth });
    debutPage = Date.now();
    envoyer(true);
  } finally {
    enFermeture = false;
  }
}

// ─── Clics, mouvements, erreurs, formulaires ────────────────────────────────

function surClic(ev: MouseEvent) {
  if (!pv || !(ev.target instanceof Element)) return;
  const cible = ev.target;
  const interactif = cible.closest(INTERACTIFS);
  const inter = interactif || cible;
  const rect = inter.getBoundingClientRect();
  const ex = rect.width ? (ev.clientX - rect.left) / rect.width : 0.5;
  const ey = rect.height ? (ev.clientY - rect.top) / rect.height : 0.5;
  const now = Date.now();

  // Clic de rage : au moins trois clics en moins d'une seconde dans un rayon de 30 px.
  clicsRecents = clicsRecents.filter(c => now - c.t < RAGE_FENETRE_MS);
  clicsRecents.push({ x: ev.clientX, y: ev.clientY, t: now });
  const rage = clicsRecents.length >= 3 && clicsRecents.every(c => Math.hypot(c.x - ev.clientX, c.y - ev.clientY) < RAGE_RAYON_PX);
  if (rage) clicsRecents = [];

  const e: Ev = {
    t: 'clic', ts: now, path: pathCourant, pv,
    s: selecteur(inter), tx: texteDe(inter), href: (inter as HTMLAnchorElement).href?.slice(0, 300) || '',
    tg: inter.tagName.toLowerCase(),
    ex: +Math.min(1, Math.max(0, ex)).toFixed(3), ey: +Math.min(1, Math.max(0, ey)).toFixed(3),
    vx: +(ev.clientX / window.innerWidth).toFixed(3), dy: Math.round(ev.clientY + window.scrollY), hd: hauteurDoc(),
    vw: window.innerWidth, r: rage, m: false,
    ia: interactif ? 1 : 0,   // un vrai élément cliquable (lien, bouton, champ, rôle de bouton)
    obj: inter.getAttribute('data-vh-objectif') || undefined,
    niv: niveauDe(inter.getAttribute('data-vh-niveau')),
  };
  if (!e.obj) { delete e.obj; delete e.niv; }
  if (!e.ia) delete e.ia;

  // Clic mort : rien ne bouge dans la seconde et demie (ni l'adresse, ni le
  // défilement, ni la page) après un clic sur autre chose qu'un champ de
  // saisie. La page a répondu si le DOM a bougé plus qu'il ne bougeait déjà
  // avant le clic (un panneau ouvert, une classe basculée, des nœuds ajoutés)
  // ou si l'élément cliqué lui-même s'anime : le remue-ménage de fond
  // (carrousel, décor animé) se retranche puisqu'il existait avant le clic.
  const champ = inter.matches('input,select,textarea,label');
  const pathAvant = location.href;
  const scrollAvant = window.scrollY;
  const pvAvant = pv;
  if (champ) { pousser(e); return; }
  const avant = mutationsEntre(now - MORT_DELAI_MS, now);
  const g = { el: inter, n: 0 };
  guetteurs.push(g);
  window.setTimeout(() => {
    const apres = mutationsEntre(now, now + MORT_DELAI_MS + 100);
    const bouge = location.href !== pathAvant || Math.abs(window.scrollY - scrollAvant) > 4 || pv !== pvAvant || apres > avant || g.n > 0;
    guetteurs.splice(guetteurs.indexOf(g), 1);
    e.m = !bouge;
    pousser(e);   // garde son horodatage et sa page; la file part à quarante événements comme pour le reste
  }, MORT_DELAI_MS);
}

function surMouvement(ev: MouseEvent) {
  if (!pv) return;
  const now = Date.now();
  if (now - dernierMouv < MOUV_PAS_MS || mouvements.length >= MOUV_MAX_PAR_PAGE * 2) return;
  dernierMouv = now;
  // x en millièmes de la largeur, y en dix-millièmes de la hauteur du document
  // mesurée au moment du point : la page peut grandir entre deux points.
  mouvements.push(Math.round((ev.clientX / window.innerWidth) * 1000), Math.min(10000, Math.round(((ev.clientY + window.scrollY) / hauteurDoc()) * 10000)));
  if (mouvements.length >= 200) viderMouvements();
}

function viderMouvements() {
  if (!mouvements.length) return;
  pousser({ t: 'mouv', vw: window.innerWidth, nrm: 1, pts: mouvements });
  mouvements = [];
}

function surErreur(ev: ErrorEvent | PromiseRejectionEvent) {
  if (!pv) return;
  const err = 'reason' in ev ? ev.reason : ev.error;
  const msg = ('message' in ev && ev.message) || (err && (err.message || String(err))) || 'Erreur';
  pousser({ t: 'erreur', msg: String(msg).slice(0, 200), src: ('filename' in ev ? ev.filename : '') || '', ligne: ('lineno' in ev ? ev.lineno : 0) || 0 });
}

function surFocus(ev: FocusEvent) {
  if (!pv || !(ev.target instanceof Element) || !ev.target.matches('input,select,textarea')) return;
  const form = ev.target.closest('form');
  if (!form) return;
  const s = selecteur(form);
  const champ = ev.target.getAttribute('name') || ev.target.getAttribute('id') || ev.target.getAttribute('placeholder') || ev.target.tagName.toLowerCase();
  if (!formsCommences.has(s)) pousser({ t: 'form', s, etat: 'debut', champ });
  formsCommences.set(s, champ.slice(0, 80));
}

function surSoumission(ev: Event) {
  if (!pv || !(ev.target instanceof HTMLFormElement)) return;
  const s = selecteur(ev.target);
  // Un formulaire compte une seule fois par page vue, même si le bouton est
  // pressé dix fois; et un envoi sans champ touché avant (formulaire à bouton
  // seul) compte aussi comme un début, sinon les envois dépassent les débuts.
  if (formsSoumis.has(s)) return;
  if (!formsCommences.has(s)) { formsCommences.set(s, ''); pousser({ t: 'form', s, etat: 'debut', champ: '' }); }
  formsSoumis.add(s);
  pousser({ t: 'form', s, etat: 'soumis', champ: '' });
}

// ─── Navigation d'application (React Router) ────────────────────────────────

function brancherNavigation() {
  const changer = () => {
    if (chemin() === pathCourant) return;
    fermerPage(false);
    ouvrirPage(false);
  };
  for (const m of ['pushState', 'replaceState'] as const) {
    const orig = history[m];
    history[m] = function (this: History, ...args: Parameters<History['pushState']>) {
      const r = orig.apply(this, args);
      window.setTimeout(changer, 0);
      return r;
    } as History['pushState'];
  }
  window.addEventListener('popstate', () => window.setTimeout(changer, 0));
}

// ─── Enregistrement (rrweb), à part et échantillonné ───────────────────────

function peutEtreEnregistrer() {
  if (!config.chargerReplay || config.echantillonReplay <= 0) return;
  let choix = lire(sessionStorage, CLE_REPLAY);
  if (!choix) { choix = Math.random() < config.echantillonReplay ? 'oui' : 'non'; ecrire(sessionStorage, CLE_REPLAY, choix); }
  if (choix !== 'oui') return;
  config.chargerReplay().then(mod => {
    if (!actif) return;
    arreterReplay = mod.demarrer((_seq, events) => {
      // Numéroté sur la session et non sur la page : un rechargement n'écrase pas le film déjà reçu.
      const seq = Number(lire(sessionStorage, CLE_MORCEAU)) || 0;
      ecrire(sessionStorage, CLE_MORCEAU, String(seq + 1));
      const corps = JSON.stringify({ v: 1, t: 'replay', site: config.site, sid, seq, events });
      // La page se ferme : la compression, asynchrone, finirait après elle; le morceau part tel quel.
      if (document.visibilityState === 'hidden' && corps.length < 60_000) livrer(corps, true);
      else compresser(corps).then((b) => livrer(b));
    });
  }).catch(() => {});
}

async function compresser(texte: string): Promise<Blob> {
  const brut = new Blob([texte], { type: 'text/plain' });
  if (typeof CompressionStream === 'undefined' || brut.size < 4_000) return brut;
  try {
    const flux = brut.stream().pipeThrough(new CompressionStream('gzip'));
    return new Blob([await new Response(flux).arrayBuffer()], { type: 'application/octet-stream' });
  } catch { return brut; }
}

// ─── Démarrage et arrêt ─────────────────────────────────────────────────────

let observateur: MutationObserver | null = null;

export function demarrerVexelHotjar(c: ConfigVexelHotjar) {
  if (actif || typeof window === 'undefined' || mesureExclue()) return;
  if (new URLSearchParams(location.search).get('vh') === 'apercu') return;   // l'aperçu de l'admin ne se compte pas
  config = { endpoint: '/api/vh', exclure: ['/admin'], echantillonReplay: 0, ...c };
  actif = true;
  ouvrirSession();
  brancherNavigation();
  // On note les mutations du DOM (nœuds ajoutés ou retirés, états qui
  // basculent, style) pour juger les clics morts dans surClic; le texte qui
  // se met à jour tout seul (horloges, compteurs) ne compte pas.
  observateur = new MutationObserver(noterMutations);
  observateur.observe(document.documentElement, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['class', 'hidden', 'open', 'src', 'href', 'disabled', 'value', 'checked', 'aria-expanded', 'aria-hidden', 'aria-selected', 'aria-pressed', 'aria-checked', 'data-state', 'style'],
  });
  document.addEventListener('click', surClic, true);
  document.addEventListener('mousemove', surMouvement, { passive: true });
  document.addEventListener('scroll', mesurerScroll, { passive: true });
  document.addEventListener('focusin', surFocus, true);
  document.addEventListener('submit', surSoumission, true);
  window.addEventListener('error', surErreur);
  window.addEventListener('unhandledrejection', surErreur);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') pauserPage(); else debutPage = Date.now(); });
  window.addEventListener('pagehide', () => fermerPage(true));
  ouvrirPage(true);
  peutEtreEnregistrer();
}

export function arreterVexelHotjar() {
  if (!actif) return;
  fermerPage(true);
  actif = false;
  observateur?.disconnect();
  arreterReplay?.();
  arreterReplay = null;
}

// ─── Se tenir hors compte ───────────────────────────────────────────────────
// Les navigateurs de Krystine et d'Alex ne comptent pas : dès qu'une
// administratrice se connecte, le drapeau se pose dans localStorage et reste
// après la déconnexion, pour ce navigateur. La bannière de consentement et la
// façade de suivi (src/lib/track.ts) le lisent aussi, pour le Pixel et GA4.

const moi = (): string => (typeof localStorage === 'undefined' ? '' : lire(localStorage, CLE_MOI));

/** Vrai quand ce navigateur a demandé à ne pas être compté. */
export function mesureExclue(): boolean { return moi() === '1'; }

/** Vrai quand ce navigateur a déjà choisi, dans un sens ou dans l'autre. */
export function exclusionDecidee(): boolean { return moi() !== ''; }

/** Compter ou non ce navigateur; ne pas compter arrête la mesure sur-le-champ. */
export function exclureMoi(oui: boolean) {
  if (typeof localStorage === 'undefined') return;
  ecrire(localStorage, CLE_MOI, oui ? '1' : '0');
  if (oui) arreterVexelHotjar();
}

/** Un objectif atteint hors clic (un achat confirmé, une inscription) : `window.vexelhotjar.objectif('achat', 'gros')`. */
export function objectif(nom: string, niveau: NiveauObjectif = 'petit') {
  pousser({ t: 'objectif', nom: String(nom).slice(0, 40), niv: niveauDe(niveau) });
}

declare global {
  interface Window { vexelhotjar?: { objectif: (nom: string, niveau?: NiveauObjectif) => void } }
}
if (typeof window !== 'undefined') window.vexelhotjar = { objectif };
