// Compteurs de visites first-party (Firestore), lus par l'admin
// (section Analytiques). Un doc par jour à siteStats/AAAA-MM-JJ :
// { total: n, pages: { _activites: n, ... }, updatedAt }.
// Agrégats anonymes seulement — aucun identifiant, aucun consentement
// requis (Loi 25). Les chemins deviennent des clés de map en
// remplaçant « / » par « _ » (interdit dans les field paths Firestore).

import { doc, setDoc, getDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface DayStats {
  day:    string;                  // "2026-08-19"
  total:  number;
  pages:  Record<string, number>;  // clés slugifiées: "_", "_activites"…
}

const dayId = (d: Date) => d.toISOString().slice(0, 10);

export const pathToSlug = (path: string) =>
  (path.split('?')[0].replace(/\//g, '_') || '_').slice(0, 120);

export const slugToPath = (slug: string) => slug.replace(/_/g, '/') || '/';

// Fire-and-forget : jamais bloquant pour le visiteur, silencieux si
// Firestore est absent (mode offline / dev sans clés).
export function bumpPageView(path: string): void {
  if (!db) return;
  const ref = doc(db, 'siteStats', dayId(new Date()));
  setDoc(ref, {
    total: increment(1),
    pages: { [pathToSlug(path)]: increment(1) },
    updatedAt: serverTimestamp(),
  }, { merge: true }).catch(() => { /* compteur best-effort */ });
}

// Les N derniers jours (aujourd'hui inclus), plus ancien en premier.
// Jours sans doc = zéros, pour que le graphique garde 14 barres.
export async function getDailyStats(days: number): Promise<DayStats[]> {
  const out: DayStats[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    out.push({ day: dayId(d), total: 0, pages: {} });
  }
  if (!db) return out;
  await Promise.all(out.map(async (row) => {
    try {
      const snap = await getDoc(doc(db!, 'siteStats', row.day));
      if (snap.exists()) {
        const data = snap.data() as Partial<DayStats>;
        row.total = typeof data.total === 'number' ? data.total : 0;
        row.pages = (data.pages as Record<string, number>) || {};
      }
    } catch { /* jour manquant = zéros */ }
  }));
  return out;
}
