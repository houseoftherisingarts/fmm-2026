import React, { useMemo, useState } from 'react';
import { nb } from './donnees';
import { Icone } from './Icone';

// ─── Les graphiques de VexelHotjar, en SVG nu ───────────────────────────────
// Une seule échelle par graphique, des traits fins, une grille discrète, la
// couleur cuivre pour la série principale, et une info-bulle au survol. Les
// trois teintes de catégorie (cuivre, bleu, prune) ont passé le validateur de
// palette pour les daltoniens.

export const TEINTES = { cuivre: '#C9A85A', bleu: '#6FA3E0', prune: '#C38BC0', encre: '#ECE5D2', grille: 'rgba(236,229,210,0.08)' };

const Bulle: React.FC<{ x: number | string; y: number; children: React.ReactNode }> = ({ x, y, children }) => (
  <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[10px] border border-[#ECE5D2]/15 bg-[#04080B] px-3 py-2 text-[11px] leading-snug text-[#ECE5D2] shadow-[0_10px_30px_-12px_rgba(41,48,39,0.6)]" style={{ left: x, top: y - 8 }}>
    {children}
  </div>
);

// ─── Courbe (sessions par jour) ─────────────────────────────────────────────

export const Courbe: React.FC<{ points: { x: string; y: number; etiquette?: string }[]; couleur?: string; hauteur?: number; nomSerie: string }> = ({ points, couleur = TEINTES.cuivre, hauteur = 180, nomSerie }) => {
  const [survol, setSurvol] = useState<number | null>(null);
  const L = 600, H = hauteur, mg = { g: 34, d: 10, h: 12, b: 26 };
  const max = Math.max(1, ...points.map(p => p.y));
  const pas = points.length > 1 ? (L - mg.g - mg.d) / (points.length - 1) : 0;
  const X = (i: number) => mg.g + i * pas;
  const Y = (v: number) => H - mg.b - (v / max) * (H - mg.b - mg.h);
  const chemin = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const aire = points.length ? `${chemin} L${X(points.length - 1).toFixed(1)},${H - mg.b} L${X(0).toFixed(1)},${H - mg.b} Z` : '';
  const ticks = [0, 0.5, 1].map(t => Math.round(max * t));
  const etiquettesX = points.filter((_, i) => points.length <= 8 || i % Math.ceil(points.length / 6) === 0 || i === points.length - 1);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${L} ${H}`} className="w-full" style={{ height: hauteur }} role="img" aria-label={nomSerie}
        onMouseLeave={() => setSurvol(null)}
        onMouseMove={e => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * L;
          setSurvol(pas ? Math.max(0, Math.min(points.length - 1, Math.round((x - mg.g) / pas))) : 0);
        }}>
        <defs>
          <linearGradient id="vh-aire" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={couleur} stopOpacity="0.22" />
            <stop offset="1" stopColor={couleur} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map(t => (
          <g key={t}>
            <line x1={mg.g} x2={L - mg.d} y1={Y(t)} y2={Y(t)} stroke={TEINTES.grille} strokeWidth="1" />
            <text x={mg.g - 8} y={Y(t) + 4} textAnchor="end" fontSize="10" fill="rgba(41,48,39,0.5)">{nb(t)}</text>
          </g>
        ))}
        {aire && <path d={aire} fill="url(#vh-aire)" />}
        {chemin && <path d={chemin} fill="none" stroke={couleur} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {etiquettesX.map(p => {
          const i = points.indexOf(p);
          return <text key={p.x} x={X(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="10" fill="rgba(41,48,39,0.55)">{p.etiquette || p.x}</text>;
        })}
        {survol !== null && points[survol] && (
          <g>
            <line x1={X(survol)} x2={X(survol)} y1={mg.h} y2={H - mg.b} stroke={TEINTES.encre} strokeOpacity="0.25" strokeDasharray="3 3" />
            <circle cx={X(survol)} cy={Y(points[survol].y)} r="5" fill={couleur} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {survol !== null && points[survol] && (
        <Bulle x={`${(X(survol) / L) * 100}%`} y={(Y(points[survol].y) / H) * hauteur}>
          <div className="font-semibold">{nb(points[survol].y)} {nomSerie}</div>
          <div className="opacity-70">{points[survol].etiquette || points[survol].x}</div>
        </Bulle>
      )}
    </div>
  );
};

// ─── Barres horizontales (pages, sources) ───────────────────────────────────

export const Barres: React.FC<{ lignes: { nom: string; n: number; detail?: string; onClick?: () => void }[]; couleur?: string; unite?: string; max?: number }> = ({ lignes, couleur = TEINTES.cuivre, unite = '', max }) => {
  const plafond = Math.max(1, max ?? Math.max(0, ...lignes.map(l => l.n)));
  return (
    <ul className="space-y-2.5">
      {lignes.map((l, i) => (
        <li key={`${i}-${l.nom}`}>
          <button type="button" onClick={l.onClick} disabled={!l.onClick} className={`group block w-full text-left ${l.onClick ? 'cursor-pointer' : 'cursor-default'}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className={`min-w-0 truncate text-[#ECE5D2] dark:text-white ${l.onClick ? 'group-hover:text-[#C9A85A]' : ''}`}>{l.nom}</span>
              <span className="max-w-[55%] shrink-0 truncate tabular-nums text-[#ECE5D2]/70 dark:text-white/60">{nb(l.n)}{unite}{l.detail ? <span className="ml-2 text-[11px] text-[#ECE5D2]/45">{l.detail}</span> : null}</span>
            </div>
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#ECE5D2]/[0.07] dark:bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, (l.n / plafond) * 100)}%`, background: couleur }} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
};

// ─── Anneau (appareils) ─────────────────────────────────────────────────────

export const Anneau: React.FC<{ parts: { nom: string; n: number; couleur: string }[] }> = ({ parts }) => {
  const total = parts.reduce((s, p) => s + p.n, 0) || 1;
  const R = 44, C = 2 * Math.PI * R;
  let cumul = 0;
  const arcs = parts.map(p => {
    const l = (p.n / total) * C;
    const a = { ...p, offset: cumul, longueur: Math.max(0, l - 2) };   // 2 px d'écart entre les segments
    cumul += l;
    return a;
  });
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" role="img" aria-label="Répartition par appareil">
        <circle cx="60" cy="60" r={R} fill="none" stroke={TEINTES.grille} strokeWidth="12" />
        {arcs.map(a => (
          <circle key={a.nom} cx="60" cy="60" r={R} fill="none" stroke={a.couleur} strokeWidth="12"
            strokeDasharray={`${a.longueur} ${C - a.longueur}`} strokeDashoffset={-a.offset} transform="rotate(-90 60 60)" />
        ))}
        <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="600" fill={TEINTES.encre}>{nb(total)}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="9" fill="rgba(41,48,39,0.5)" letterSpacing="1">VUES</text>
      </svg>
      <ul className="space-y-2 text-[13px]">
        {parts.map(p => (
          <li key={p.nom} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.couleur }} />
            <span className="text-[#ECE5D2] dark:text-white">{p.nom}</span>
            <span className="tabular-nums text-[#ECE5D2]/60 dark:text-white/50">{Math.round((p.n / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── Heures de la journée ───────────────────────────────────────────────────

export const Heures: React.FC<{ valeurs: number[] }> = ({ valeurs }) => {
  const [survol, setSurvol] = useState<number | null>(null);
  const max = Math.max(1, ...valeurs);
  const L = 600, H = 120, b = 22;
  const larg = (L - 20) / 24;
  const pic = useMemo(() => valeurs.indexOf(Math.max(...valeurs)), [valeurs]);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${L} ${H}`} className="w-full" style={{ height: 120 }} role="img" aria-label="Vues par heure" onMouseLeave={() => setSurvol(null)}>
        {valeurs.map((v, h) => {
          const hb = (v / max) * (H - b - 10);
          return (
            <g key={h} onMouseEnter={() => setSurvol(h)}>
              <rect x={10 + h * larg} y={0} width={larg} height={H - b} fill="transparent" />
              <rect x={10 + h * larg + 3} y={H - b - hb} width={larg - 6} height={hb} rx="3" fill={h === pic ? TEINTES.cuivre : 'rgba(201,168,90,0.45)'} />
              {h % 3 === 0 && <text x={10 + h * larg + larg / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="rgba(41,48,39,0.5)">{h} h</text>}
            </g>
          );
        })}
      </svg>
      {survol !== null && (
        <Bulle x={`${((10 + survol * larg + larg / 2) / L) * 100}%`} y={(H - b - (valeurs[survol] / max) * (H - b - 10)) / H * 120}>
          <div className="font-semibold">{nb(valeurs[survol])} vues</div>
          <div className="opacity-70">entre {survol} h et {survol + 1} h</div>
        </Bulle>
      )}
    </div>
  );
};

// ─── Tuile de chiffre ───────────────────────────────────────────────────────

export const Tuile: React.FC<{ etiquette: string; valeur: string; note?: string; icone: string; accent?: string }> = ({ etiquette, valeur, note, icone, accent = 'text-[#C9A85A]' }) => (
  <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_-18px_rgba(41,48,39,0.3)] backdrop-blur-md dark:border-white/10 dark:bg-black/30">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ECE5D2]/55 dark:text-white/50">{etiquette}</span>
      <Icone nom={icone} className={`${accent} text-sm`} />
    </div>
    <p className="mt-2 font-serif text-3xl leading-none text-[#ECE5D2] dark:text-white">{valeur}</p>
    {note && <p className="mt-1.5 text-[11px] text-[#ECE5D2]/55 dark:text-white/45">{note}</p>}
  </div>
);
