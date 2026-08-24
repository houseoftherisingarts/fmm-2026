import React from 'react';

// ─── Le portrait d'un membre ─────────────────────────────────────────
// La photo si la personne en a mis une, son initiale sinon, sur une
// teinte tirée de son nom pour que deux membres ne se ressemblent pas.
// Le salon public et la boîte de réception s'en servent tous les deux.

export const Portrait: React.FC<{
  nom: string;
  url?: string;
  teinte?: number;
  taille?: number;
}> = ({ nom, url, teinte, taille = 40 }) => (
  <div className="rounded-full overflow-hidden shrink-0 border border-brass/25 flex items-center justify-center"
       style={{ width: taille, height: taille, background: `hsl(${teinte ?? teinteDe(nom)} 40% 20%)` }}>
    {url
      ? <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
      : <span className="font-display title-medieval text-ivory/75" style={{ fontSize: taille * 0.4 }}>
          {initiales(nom)}
        </span>}
  </div>
);

export function initiales(nom: string): string {
  const bouts = nom.trim().split(/\s+/).filter(Boolean);
  if (bouts.length === 0) return '?';
  if (bouts.length === 1) return bouts[0][0].toUpperCase();
  return (bouts[0][0] + bouts[bouts.length - 1][0]).toUpperCase();
}

export function teinteDe(graine: string): number {
  let h = 0;
  for (let i = 0; i < graine.length; i++) h = (h * 31 + graine.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Un horodatage de Firestore, en date utilisable. */
export function versDate(v: unknown): Date | null {
  const h = v as { toDate?: () => Date } | null;
  return h?.toDate ? h.toDate() : null;
}

/** L'heure seule pour ce qui s'est dit aujourd'hui, la date sinon. */
export function quand(v: unknown, lang: 'FR' | 'EN', avecHeure = false): string {
  const d = versDate(v);
  if (!d) return '';
  const loc = lang === 'FR' ? 'fr-CA' : 'en-CA';
  if (d.toDateString() === new Date().toDateString()) {
    return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(loc, avecHeure
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric' });
}
