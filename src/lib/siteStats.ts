// Compteurs de visites first-party (Firestore), lus par l'admin
// (section Analytiques). Un doc par jour à siteStats/AAAA-MM-JJ :
// { total, pages: { _activites: n, ... }, sources: { google, facebook,
// direct, autre }, pubJeux, pubJeuxParJeu: { des, hnefatafl, tarot },
// updatedAt }. Agrégats anonymes seulement — aucun identifiant, aucun
// consentement requis (Loi 25). Les chemins deviennent des clés de map
// en remplaçant « / » par « _ » (interdit dans les field paths
// Firestore).

import { doc, setDoc, getDoc, onSnapshot, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface DayStats {
  day:            string;                  // "2026-08-19"
  total:          number;
  pages:          Record<string, number>;  // clés slugifiées: "_", "_activites"…
  sources:        Record<string, number>;  // "google" | "facebook" | "direct" | "autre"
  pubJeux:        number;                  // affichages de la pub AdSense, tous jeux confondus
  pubJeuxParJeu:  Record<string, number>;  // "des" | "hnefatafl" | "tarot"
}

// Le jour se compte à l'heure du festival, jamais en UTC. Avec
// toISOString(), tout ce qui se passait entre vingt heures et minuit
// chez nous tombait dans la case du lendemain, et le graphique de la
// régie racontait une journée qui n'existait pour personne.
const FUSEAU_FESTIVAL = 'America/Toronto';
const formatJour = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU_FESTIVAL, year: 'numeric', month: '2-digit', day: '2-digit',
});
const dayId = (d: Date) => formatJour.format(d);

// Les N derniers jours civils, plus ancien en premier. L'ancre est
// posée à midi UTC pour qu'un changement d'heure avancée ne fasse
// jamais apparaître deux fois la même date.
const joursPrecedents = (n: number): string[] => {
  const [a, m, j] = dayId(new Date()).split('-').map(Number);
  const ancre = Date.UTC(a, m - 1, j, 12);
  return Array.from({ length: n }, (_, i) =>
    new Date(ancre - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
};

export const pathToSlug = (path: string) =>
  (path.split('?')[0].replace(/\//g, '_') || '_').slice(0, 120);

export const slugToPath = (slug: string) => slug.replace(/_/g, '/') || '/';

// Ce qui n'est pas une visite du site : notre propre navigation. La
// régie (/admin) gonflait le palmarès avec des pages que le public ne
// voit jamais, et le serveur de développement écrit dans la même base
// que la production, deux fois par route à cause du StrictMode.
const estUneVraieVisite = (path: string) =>
  !import.meta.env.DEV && !path.startsWith('/admin');

// Fire-and-forget : jamais bloquant pour le visiteur, silencieux si
// Firestore est absent (mode offline / dev sans clés).
export function bumpPageView(path: string): void {
  if (!db || !estUneVraieVisite(path)) return;
  const ref = doc(db, 'siteStats', dayId(new Date()));
  setDoc(ref, {
    total: increment(1),
    pages: { [pathToSlug(path)]: increment(1) },
    updatedAt: serverTimestamp(),
  }, { merge: true }).catch(() => { /* compteur best-effort */ });
}

const SOURCE_SESSION_KEY = 'fmm_utm';

// Le référent d'un autre domaine, ou rien du tout quand le visiteur
// arrive de nulle part ou d'une de nos propres pages.
const referentExterne = (): string => {
  try {
    const r = document.referrer;
    if (!r) return '';
    return new URL(r).hostname === window.location.hostname ? '' : r;
  } catch { return ''; }
};

// L'étiquette utm passe en premier, le référent la remplace quand elle
// manque. Sans cette deuxième lecture, une visite venue d'une recherche
// Google tombait dans « direct », et le tableau mentait sur la moitié
// du trafic.
const classifySource = (utmSource: string | null, referent: string): string => {
  const brut = (utmSource || referent).toLowerCase();
  if (!brut) return 'direct';
  if (brut.includes('google')) return 'google';
  if (brut.includes('facebook') || brut.includes('meta') || brut.includes('instagram') || brut.includes('fb')) return 'facebook';
  return 'autre';
};

// Attribution par source : lue une seule fois par session, à la
// première page vue. utm_source/utm_campaign restent en sessionStorage
// pour le reste de la session (aucun autre écran ne les relit pour
// l'instant, mais rien n'oblige à les redemander à l'URL). Le compteur
// Firestore n'est incrémenté qu'à cette première lecture : les pages
// suivantes de la même session trouvent la clé déjà posée et sortent
// tout de suite. Une session compte donc une fois, jamais une par page.
export function bumpSessionSource(search: string): void {
  if (!db || import.meta.env.DEV) return;
  try {
    if (sessionStorage.getItem(SOURCE_SESSION_KEY)) return;
  } catch { return; }
  const params = new URLSearchParams(search);
  const utmSource = params.get('utm_source');
  const source = classifySource(utmSource, referentExterne());
  try {
    sessionStorage.setItem(SOURCE_SESSION_KEY, JSON.stringify({
      source,
      utmSource: utmSource || '',
      utmCampaign: params.get('utm_campaign') || '',
    }));
  } catch { /* ignore, on retentera à la prochaine page */ }
  const ref = doc(db, 'siteStats', dayId(new Date()));
  setDoc(ref, {
    sources: { [source]: increment(1) },
    updatedAt: serverTimestamp(),
  }, { merge: true }).catch(() => { /* compteur best-effort */ });
}

// Un affichage de la pub AdSense au début d'une partie (PubDebutPartie),
// une fois par montage du composant, donc une fois par vraie apparition
// à l'écran.
export function bumpPubJeuxView(jeu: string): void {
  if (!db || import.meta.env.DEV) return;
  const ref = doc(db, 'siteStats', dayId(new Date()));
  setDoc(ref, {
    pubJeux: increment(1),
    pubJeuxParJeu: { [jeu]: increment(1) },
    updatedAt: serverTimestamp(),
  }, { merge: true }).catch(() => { /* compteur best-effort */ });
}

const journeeVide = (day: string): DayStats =>
  ({ day, total: 0, pages: {}, sources: {}, pubJeux: 0, pubJeuxParJeu: {} });

const lireJournee = (day: string, data: Partial<DayStats>): DayStats => ({
  day,
  total:         typeof data.total === 'number' ? data.total : 0,
  pages:         (data.pages   as Record<string, number>) || {},
  sources:       (data.sources as Record<string, number>) || {},
  pubJeux:       typeof data.pubJeux === 'number' ? data.pubJeux : 0,
  pubJeuxParJeu: (data.pubJeuxParJeu as Record<string, number>) || {},
});

// Les N derniers jours (aujourd'hui inclus), plus ancien en premier.
// Un jour sans document rend des zéros, pour que le graphique garde ses
// quatorze barres. Une lecture refusée, elle, remonte en exception :
// l'écran doit dire qu'il n'a pas pu lire plutôt qu'afficher un zéro
// qui ressemble à une vraie journée creuse.
export async function getDailyStats(days: number): Promise<DayStats[]> {
  const jours = joursPrecedents(days);
  if (!db) return jours.map(journeeVide);
  const snaps = await Promise.all(jours.map((j) => getDoc(doc(db!, 'siteStats', j))));
  return snaps.map((snap, i) => (snap.exists()
    ? lireJournee(jours[i], snap.data() as Partial<DayStats>)
    : journeeVide(jours[i])));
}

// Le document du jour, en direct. C'est le seul chiffre qui bouge
// pendant qu'on regarde l'écran : les treize journées d'avant sont
// closes et une lecture unique leur suffit. En cas d'erreur, on ne
// rappelle pas le callback, pour ne pas écraser une valeur juste par
// des zéros.
export function suivreJourCourant(cb: (jour: DayStats) => void): () => void {
  const day = dayId(new Date());
  if (!db) return () => {};
  return onSnapshot(
    doc(db, 'siteStats', day),
    (snap) => cb(snap.exists() ? lireJournee(day, snap.data() as Partial<DayStats>) : journeeVide(day)),
    () => { /* lecture refusée : la valeur déjà affichée reste la meilleure */ },
  );
}
