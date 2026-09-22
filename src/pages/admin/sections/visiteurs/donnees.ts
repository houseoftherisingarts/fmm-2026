// ─── Les données de VexelHotjar, côté admin ─────────────────────────────────
// Lecture des journées (vh_jours), des cartes (vh_cartes), des sessions
// (vh_sessions) et des enregistrements (Storage), plus les réglages. Tout est
// résumé ici en objets simples pour que les onglets n'aient qu'à afficher.

import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where, Timestamp } from 'firebase/firestore';
import { getStorage, ref, getBytes, listAll } from 'firebase/storage';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app, { db } from '../../../../firebase';
import { SITE_VEXELHOTJAR, REGLAGES_DEFAUT, type ReglagesVexelHotjar } from '../../../../vexelhotjar';

export type Device = 'ordinateur' | 'tablette' | 'mobile';

export interface ElementJour { s: string; tx: string; href?: string; n: number; r?: number; m?: number }
export interface PageJour {
  path: string; titre?: string;
  vues?: number; dureeMs?: number; sorties?: number; clics?: number; rage?: number; morts?: number;
  scroll?: Record<string, number>; scrollN?: number;
  elements?: Record<string, ElementJour>;
}
export interface Journee {
  site: string; jour: string;
  vues?: number; sessions?: number; nouveaux?: number; dureeMs?: number; rebonds?: number; fins?: number;
  clics?: number; rage?: number; morts?: number; erreurs?: number;
  heures?: Record<string, number>;
  appareils?: Record<string, number>;
  pages?: Record<string, PageJour>;
  entrees?: Record<string, number>;
  sources?: Record<string, { n: number; nom: string }>;
  campagnes?: Record<string, { n: number; source: string; campagne: string }>;
  objectifs?: Record<string, { n: number; nom: string; niv?: 'gros' | 'petit' }>;
  erreursListe?: Record<string, { n: number; msg: string; src: string; path: string }>;
  formulaires?: Record<string, { s: string; path: string; debuts?: number; soumis?: number; abandons?: number; dernierChamp?: string }>;
}

export interface PageResume extends Required<Pick<PageJour, 'path' | 'vues' | 'dureeMs' | 'sorties' | 'clics' | 'rage' | 'morts' | 'scrollN'>> {
  cle: string; titre: string;
  scroll: Record<string, number>;
  elements: Record<string, ElementJour>;
}

export interface Resume {
  jours: { jour: string; vues: number; sessions: number; nouveaux: number }[];
  vues: number; sessions: number; nouveaux: number; dureeMs: number; rebonds: number; fins: number;
  clics: number; rage: number; morts: number; erreurs: number;
  heures: number[];
  appareils: Record<Device, number>;
  pages: PageResume[];
  sources: { nom: string; n: number }[];
  campagnes: { source: string; campagne: string; n: number }[];
  objectifs: { nom: string; n: number; niveau: 'gros' | 'petit' }[];
  erreursListe: { msg: string; src: string; path: string; n: number }[];
  formulaires: { s: string; path: string; debuts: number; soumis: number; abandons: number; dernierChamp?: string }[];
}

export const jourISO = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Toronto' });
export const ilYA = (jours: number) => { const d = new Date(); d.setDate(d.getDate() - jours); return d; };

const fn = (nom: string) => {
  if (!app) throw new Error('Firebase non configuré');
  return httpsCallable(getFunctions(app, 'us-central1'), nom);
};

// ─── Journées ───────────────────────────────────────────────────────────────

export async function chargerJournees(de: string, a: string): Promise<Journee[]> {
  if (!db) return [];
  const q = query(collection(db, 'vh_jours'), where('site', '==', SITE_VEXELHOTJAR), where('jour', '>=', de), where('jour', '<=', a));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Journee).sort((x, y) => x.jour.localeCompare(y.jour));
}

const add = (o: Record<string, number>, k: string, n = 0) => { o[k] = (o[k] || 0) + n; };

/** Fond plusieurs journées en un seul résumé, avec la série par jour pour la courbe. */
export function resumer(journees: Journee[], de: string, a: string): Resume {
  const r: Resume = {
    jours: [], vues: 0, sessions: 0, nouveaux: 0, dureeMs: 0, rebonds: 0, fins: 0, clics: 0, rage: 0, morts: 0, erreurs: 0,
    heures: new Array(24).fill(0),
    appareils: { ordinateur: 0, tablette: 0, mobile: 0 },
    pages: [], sources: [], campagnes: [], objectifs: [], erreursListe: [], formulaires: [],
  };
  const pages = new Map<string, PageResume>();
  const sources: Record<string, number> = {};
  const campagnes = new Map<string, { source: string; campagne: string; n: number }>();
  const objectifs = new Map<string, { n: number; niveau: 'gros' | 'petit' }>();
  const erreurs = new Map<string, { msg: string; src: string; path: string; n: number }>();
  const forms = new Map<string, { s: string; path: string; debuts: number; soumis: number; abandons: number; dernierChamp?: string }>();
  const parJour = new Map<string, { vues: number; sessions: number; nouveaux: number }>();

  for (const j of journees) {
    r.vues += j.vues || 0; r.sessions += j.sessions || 0; r.nouveaux += j.nouveaux || 0; r.dureeMs += j.dureeMs || 0;
    r.rebonds += j.rebonds || 0; r.fins += j.fins || 0; r.clics += j.clics || 0; r.rage += j.rage || 0; r.morts += j.morts || 0; r.erreurs += j.erreurs || 0;
    parJour.set(j.jour, { vues: j.vues || 0, sessions: j.sessions || 0, nouveaux: j.nouveaux || 0 });
    for (let h = 0; h < 24; h += 1) r.heures[h] += j.heures?.[`h${h}`] || 0;
    for (const d of ['ordinateur', 'tablette', 'mobile'] as Device[]) r.appareils[d] += j.appareils?.[d] || 0;
    for (const [cle, p] of Object.entries(j.pages || {})) {
      // Une page se reconnaît à son chemin, et sa clé est celle de la journée
      // la plus récente (les journées arrivent triées), pour que les cartes
      // se lisent sous la clé en vigueur.
      const chemin = p.path || cle;
      let page = pages.get(chemin);
      if (!page) { page = { cle, path: chemin, titre: p.titre || '', vues: 0, dureeMs: 0, sorties: 0, clics: 0, rage: 0, morts: 0, scrollN: 0, scroll: {}, elements: {} }; pages.set(chemin, page); }
      page.cle = cle;
      if (p.titre) page.titre = p.titre;
      page.vues += p.vues || 0; page.dureeMs += p.dureeMs || 0; page.sorties += p.sorties || 0; page.clics += p.clics || 0;
      page.rage += p.rage || 0; page.morts += p.morts || 0; page.scrollN += p.scrollN || 0;
      for (const [b, n] of Object.entries(p.scroll || {})) add(page.scroll, b, n);
      for (const [k, el] of Object.entries(p.elements || {})) {
        const e = page.elements[k] || (page.elements[k] = { s: el.s, tx: el.tx, href: el.href, n: 0, r: 0, m: 0 });
        e.n += el.n || 0; e.r = (e.r || 0) + (el.r || 0); e.m = (e.m || 0) + (el.m || 0);
        if (el.tx) e.tx = el.tx;
      }
    }
    for (const s of Object.values(j.sources || {})) add(sources, s.nom, s.n);
    for (const c of Object.values(j.campagnes || {})) {
      const k = c.source + '|' + c.campagne;
      const e = campagnes.get(k) || { source: c.source, campagne: c.campagne, n: 0 };
      e.n += c.n || 0; campagnes.set(k, e);
    }
    for (const o of Object.values(j.objectifs || {})) {
      const x = objectifs.get(o.nom) || { n: 0, niveau: o.niv === 'gros' ? 'gros' as const : 'petit' as const };
      x.n += o.n || 0; objectifs.set(o.nom, x);
    }
    for (const [k, e] of Object.entries(j.erreursListe || {})) {
      const x = erreurs.get(k) || { msg: e.msg, src: e.src, path: e.path, n: 0 };
      x.n += e.n || 0; erreurs.set(k, x);
    }
    for (const [k, f] of Object.entries(j.formulaires || {})) {
      const x = forms.get(k) || { s: f.s, path: f.path, debuts: 0, soumis: 0, abandons: 0, dernierChamp: f.dernierChamp };
      x.debuts += f.debuts || 0; x.soumis += f.soumis || 0; x.abandons += f.abandons || 0;
      if (f.dernierChamp) x.dernierChamp = f.dernierChamp;
      forms.set(k, x);
    }
  }

  // La courbe porte chaque jour de la période, même ceux sans visite.
  for (let d = new Date(de + 'T12:00:00'); jourISO(d) <= a; d.setDate(d.getDate() + 1)) {
    const jour = jourISO(d);
    r.jours.push({ jour, ...(parJour.get(jour) || { vues: 0, sessions: 0, nouveaux: 0 }) });
  }
  r.pages = [...pages.values()].sort((x, y) => y.vues - x.vues);
  r.sources = Object.entries(sources).map(([nom, n]) => ({ nom, n })).sort((x, y) => y.n - x.n);
  r.campagnes = [...campagnes.values()].sort((x, y) => y.n - x.n);
  r.objectifs = [...objectifs.entries()].map(([nom, x]) => ({ nom, ...x })).sort((x, y) => y.n - x.n);
  r.erreursListe = [...erreurs.values()].sort((x, y) => y.n - x.n);
  r.formulaires = [...forms.values()].sort((x, y) => y.abandons - x.abandons);
  return r;
}

// ─── Cartes de chaleur ──────────────────────────────────────────────────────

export interface PointClic { s: string; tx: string; ex: number; ey: number; vx: number; dy: number; hd: number; r?: boolean; m?: boolean }
/** Les points d'une page sur un appareil : nClics, nRage et nMorts sont les vrais comptes, clics les points gardés (plafonnés par jour). */
export interface Carte { clics: PointClic[]; mouv: number[]; vues: number; nClics: number; nRage: number; nMorts: number; scroll: Record<string, number> }

export async function chargerCarte(device: Device, clePage: string, de: string, a: string): Promise<Carte> {
  const c: Carte = { clics: [], mouv: [], vues: 0, nClics: 0, nRage: 0, nMorts: 0, scroll: {} };
  if (!db) return c;
  const q = query(collection(db, 'vh_cartes'), where('site', '==', SITE_VEXELHOTJAR), where('device', '==', device), where('page', '==', clePage), where('jour', '>=', de), where('jour', '<=', a));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const x = d.data();
    const clics = (x.clics as PointClic[]) || [];
    c.clics.push(...clics);
    // Les points de souris en fraction de page (mouvV 2); ceux d'avant, en pixels absolus, ne se posent plus.
    if (x.mouvV === 2) c.mouv.push(...((x.mouv as number[]) || []));
    c.vues += x.vues || 0;
    c.nClics += typeof x.nClics === 'number' ? x.nClics : clics.length;
    c.nRage += typeof x.nRage === 'number' ? x.nRage : clics.filter(p => p.r).length;
    c.nMorts += typeof x.nMorts === 'number' ? x.nMorts : clics.filter(p => p.m).length;
    for (const [b, n] of Object.entries((x.scroll as Record<string, number>) || {})) add(c.scroll, b, n);
  }
  return c;
}

// ─── Sessions et enregistrements ────────────────────────────────────────────

export interface Session {
  sid: string; debut: Date; fin?: Date; jour?: string; device?: Device; vw?: number; pays?: string; lang?: string;
  ref?: string; utm?: Record<string, string>; entree?: string; derniere?: string; parcours?: string[]; nbPages?: number;
  nbClics?: number; rage?: number; mort?: number; erreurs?: number; dureeMs?: number; nouveau?: boolean;
  enregistre?: boolean; chunks?: number; octets?: number;
}

const versSession = (id: string, x: Record<string, any>): Session => ({
  ...x, sid: id,
  debut: x.debut instanceof Timestamp ? x.debut.toDate() : new Date(0),
  fin: x.fin instanceof Timestamp ? x.fin.toDate() : undefined,
});

export async function chargerSessions(de: Date, max = 2000): Promise<Session[]> {
  if (!db) return [];
  const q = query(collection(db, 'vh_sessions'), where('site', '==', SITE_VEXELHOTJAR), where('debut', '>=', Timestamp.fromDate(de)), orderBy('debut', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => versSession(d.id, d.data()));
}

export async function chargerEnregistrements(max = 200): Promise<Session[]> {
  if (!db) return [];
  const q = query(collection(db, 'vh_sessions'), where('site', '==', SITE_VEXELHOTJAR), where('enregistre', '==', true), orderBy('debut', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => versSession(d.id, d.data()));
}

async function degzipper(octets: ArrayBuffer): Promise<string> {
  const u = new Uint8Array(octets);
  const gz = u[0] === 0x1f && u[1] === 0x8b;
  if (!gz) return new TextDecoder().decode(u);
  const flux = new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(flux).text();
}

/** Les événements rrweb d'une session, morceau après morceau, dans l'ordre
 *  des fichiers réellement présents (un morceau perdu en route ne cache pas
 *  ceux qui l'ont suivi). */
export async function chargerEnregistrement(sid: string): Promise<unknown[]> {
  if (!app || !/^[a-z0-9-]{8,64}$/.test(sid)) return [];
  const storage = getStorage(app);
  const dossier = await listAll(ref(storage, `vh/replays/${sid}`));
  const morceaux = dossier.items
    .filter(f => /^\d+\.json(\.gz)?$/.test(f.name))
    .sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10));
  const events: unknown[] = [];
  for (const f of morceaux) {
    try {
      const morceau = JSON.parse(await degzipper(await getBytes(f)));
      if (Array.isArray(morceau)) events.push(...morceau);
    } catch { /* un morceau illisible ne bloque pas la lecture des autres */ }
  }
  return events;
}

export async function effacerSession(sid: string): Promise<void> {
  await fn('vhEffacerSession')({ sid });
}

// ─── Réglages et rafraîchissement ───────────────────────────────────────────

export async function chargerReglages(): Promise<ReglagesVexelHotjar> {
  if (!db) return REGLAGES_DEFAUT;
  const snap = await getDoc(doc(db, 'settings', 'vexelhotjar'));
  return snap.exists() ? { ...REGLAGES_DEFAUT, ...(snap.data() as Partial<ReglagesVexelHotjar>) } : REGLAGES_DEFAUT;
}

export async function enregistrerReglages(r: Partial<ReglagesVexelHotjar>): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'settings', 'vexelhotjar'), r, { merge: true });
}

// ─── Hors compte : les adresses IP du client et de son équipe ──────────────
// Dans vh_prive/exclusions, lisible par l'admin seul (settings/ est public).
// Le collecteur relit la liste toutes les cinq minutes.

export interface AdresseExclue { ip: string; note: string; ajoutee: number }

export async function chargerExclusions(): Promise<AdresseExclue[]> {
  if (!db) return [];
  const snap = await getDoc(doc(db, 'vh_prive', 'exclusions'));
  const liste = (snap.data()?.ips || []) as Partial<AdresseExclue>[];
  return liste.filter(e => typeof e.ip === 'string' && e.ip).map(e => ({ ip: String(e.ip), note: String(e.note || ''), ajoutee: Number(e.ajoutee) || 0 }));
}

export const EXCLUSIONS_MAX = 40;

/** Ajoute ou retire une adresse sans réécrire la liste entière : deux
 *  administratrices qui règlent en même temps ne s'effacent pas l'une l'autre. */
export async function ajouterExclusion(e: AdresseExclue): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'vh_prive', 'exclusions'), { ips: arrayUnion({ ip: e.ip, note: e.note, ajoutee: e.ajoutee }) }, { merge: true });
}
export async function retirerExclusion(e: AdresseExclue): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'vh_prive', 'exclusions'), { ips: arrayRemove({ ip: e.ip, note: e.note, ajoutee: e.ajoutee }) }, { merge: true });
}

/** L'adresse d'où l'admin regarde le tableau, vue par le collecteur lui-même
 *  (GET /api/vh?moi passe par l'hébergement comme les lots). */
export async function monAdresse(): Promise<string> {
  const res = await fetch('/api/vh?moi', { cache: 'no-store', credentials: 'omit' });
  if (!res.ok) return '';
  return String(((await res.json()) as { ip?: string })?.ip || '');
}

/** Lance un tour d'agrégation; occupe : l'horloge tenait déjà le verrou. */
export async function rafraichirMaintenant(): Promise<{ lots: number; occupe: boolean }> {
  const res = await fn('vhAgregerMaintenant')({});
  const d = (res.data as { lots?: number; occupe?: boolean }) || {};
  return { lots: d.lots || 0, occupe: !!d.occupe };
}

// ─── Petits formats ─────────────────────────────────────────────────────────

export const nb = (n: number) => n.toLocaleString('fr-CA');

/** Un nom lisible pour un élément cliqué : son texte, sinon ce qu'il est (« Champ », « Bouton », « Lien vers /formations »), jamais un sélecteur brut. */
export function nomElement(e: { tx?: string; href?: string; s: string }): string {
  if (e.tx) return e.tx.length > 44 ? `${e.tx.slice(0, 42).trim()}…` : e.tx;
  const dernier = e.s.split('>').pop()?.trim() || '';
  const tag = dernier.replace(/[^a-z].*$/, '');
  const rang = dernier.match(/nth-of-type\((\d+)\)/)?.[1];
  const numero = rang ? ` ${rang}` : '';
  if (e.href) { try { return `Lien vers ${new URL(e.href, 'https://x').pathname}`; } catch { return `Lien${numero}`; } }
  const noms: Record<string, string> = { input: 'Champ', textarea: 'Champ', select: 'Menu', button: 'Bouton', a: 'Lien', img: 'Image', video: 'Vidéo', h1: 'Titre', h2: 'Titre', h3: 'Titre', p: 'Texte', label: 'Étiquette', summary: 'Volet', header: 'En-tête', nav: 'Menu', footer: 'Pied de page', section: 'Section' };
  return `${noms[tag] || 'Élément'}${numero}`;
}
export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
export function duree(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
export const dateCourte = (jour: string) => new Date(jour + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
export const dateLongue = (d: Date) => d.toLocaleString('fr-CA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
