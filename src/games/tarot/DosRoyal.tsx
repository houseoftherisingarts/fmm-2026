import React, { useId } from 'react';

// ─── Le dos royal, dessiné ───────────────────────────────────────────
// La récompense du jour 4 (Alex, 2026-08-30) : un dos de carte qui ne
// ressemble en rien au dos du festival. Argent au lieu d'or, bleu nuit
// au lieu du bordeaux, et un saphir taillé à facettes à la place du
// blason. Tout est vectoriel : net sur le tapis comme en vignette, et
// rien à télécharger. Mêmes proportions que les lames (813 × 1536).

const DosRoyal: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => {
  const id = useId().replace(/:/g, '');
  const argent = `url(#${id}-argent)`;
  return (
    <svg viewBox="0 0 813 1536" className={className} style={style} aria-hidden focusable="false"
         preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-argent`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset="0.35" stopColor="#b9c2cc" />
          <stop offset="0.55" stopColor="#e9edf1" />
          <stop offset="0.8" stopColor="#8b95a1" />
          <stop offset="1" stopColor="#d6dce2" />
        </linearGradient>
        <radialGradient id={`${id}-fond`} cx="0.5" cy="0.42" r="0.75">
          <stop offset="0" stopColor="#15304f" />
          <stop offset="0.6" stopColor="#0b1a2e" />
          <stop offset="1" stopColor="#050b16" />
        </radialGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7fb4ff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#3a6fd8" stopOpacity="0.18" />
          <stop offset="1" stopColor="#0b1a2e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-gemme`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fc4ff" />
          <stop offset="0.45" stopColor="#2c6fe0" />
          <stop offset="1" stopColor="#0e2f78" />
        </linearGradient>
        {/* Le damas : un quadrillage de quatre-feuilles d'argent, très
            discret, qui donne au fond sa matière de velours brodé. */}
        <pattern id={`${id}-damas`} width="96" height="96" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#c9d3de" strokeOpacity="0.13" strokeWidth="1.6">
            <path d="M48 8c10 0 18 8 18 18 0 10 8 18 18 18-10 0-18 8-18 18 0 10-8 18-18 18 0-10-8-18-18-18 10 0 18-8 18-18 0-10-8-18-18-18 10 0 18-8 18-18z" />
            <circle cx="48" cy="48" r="4" />
            <path d="M0 48h12M84 48h12M48 0v12M48 84v12" />
          </g>
        </pattern>
      </defs>

      {/* Le fond et sa matière */}
      <rect width="813" height="1536" fill={`url(#${id}-fond)`} />
      <rect width="813" height="1536" fill={`url(#${id}-damas)`} />

      {/* Double liseré d'argent, coins adoucis */}
      <rect x="34" y="34" width="745" height="1468" rx="22" fill="none" stroke={argent} strokeWidth="9" />
      <rect x="62" y="62" width="689" height="1412" rx="14" fill="none" stroke={argent} strokeWidth="2.5" strokeOpacity="0.85" />

      {/* Fleurons d'angle : la même volute, tournée quatre fois */}
      {[
        { x: 62, y: 62, r: 0 }, { x: 751, y: 62, r: 90 }, { x: 751, y: 1474, r: 180 }, { x: 62, y: 1474, r: 270 },
      ].map((c) => (
        <g key={c.r} transform={`translate(${c.x} ${c.y}) rotate(${c.r})`} fill="none" stroke={argent} strokeWidth="5" strokeLinecap="round">
          <path d="M0 0c60 0 92 10 118 40M0 0c0 60 10 92 40 118" />
          <path d="M28 28c30-6 60 8 74 34M28 28c-6 30 8 60 34 74" strokeWidth="3.5" />
          <circle cx="24" cy="24" r="7" fill={argent} stroke="none" />
        </g>
      ))}

      {/* Cartouches haut et bas */}
      {[{ y: 150, f: 1 }, { y: 1386, f: -1 }].map((c) => (
        <g key={c.y} transform={`translate(406 ${c.y}) scale(1 ${c.f})`} fill="none" stroke={argent} strokeWidth="4" strokeLinecap="round">
          <path d="M-150 0h300M-150 0c-24 0-40-14-40-30M150 0c24 0 40-14 40-30" />
          <path d="M0-4l16 22-16 22-16-22z" fill={argent} stroke="none" />
          <path d="M-70 0c-10-22-30-32-52-32M70 0c10-22 30-32 52-32" strokeWidth="2.5" />
        </g>
      ))}

      {/* Le halo, puis le médaillon d'argent */}
      <circle cx="406" cy="768" r="330" fill={`url(#${id}-halo)`} />
      <circle cx="406" cy="768" r="236" fill="none" stroke={argent} strokeWidth="10" />
      <circle cx="406" cy="768" r="214" fill="none" stroke={argent} strokeWidth="2.5" strokeOpacity="0.8" />
      {/* Huit lancettes d'argent autour du saphir */}
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i} transform={`translate(406 768) rotate(${i * 45})`}>
          <path d="M0-270l12 34-12 46-12-46z" fill={argent} />
          <circle cx="0" cy="-192" r="6" fill={argent} />
        </g>
      ))}

      {/* Le saphir : une taille coussin, ses facettes, ses éclats */}
      <g transform="translate(406 768)">
        <path d="M-150-92l58-58h184l58 58v184l-58 58h-184l-58-58z" fill="#071a45" />
        <path d="M-136-82l50-50h172l50 50v164l-50 50h-172l-50-50z" fill={`url(#${id}-gemme)`} />
        {/* La table et la couronne */}
        <path d="M-72-46h144v92h-144z" fill="#3f83f2" fillOpacity="0.9" />
        <path d="M-136-82l64 36M136-82l-64 36M-136 82l64-36M136 82l-64-36M-86-132l14 86M86-132l-14 86M-86 132l14-86M86 132l-14-86"
              fill="none" stroke="#9fd0ff" strokeOpacity="0.55" strokeWidth="3" />
        <path d="M-72-46l-64-36v164l64-36zM72-46l64-36v164l-64-36z" fill="#1d54c4" fillOpacity="0.55" />
        <path d="M-72-46l14-86h116l14 86zM-72 46l14 86h116l14-86z" fill="#5e9ef5" fillOpacity="0.45" />
        {/* Les éclats de lumière */}
        <path d="M-52-34l10 0 0 10-10 0z" fill="#ffffff" fillOpacity="0.85" />
        <path d="M-58-40l30-6-6 30z" fill="#ffffff" fillOpacity="0.7" />
        <path d="M30 18l22 8-8 22-14-14z" fill="#dff0ff" fillOpacity="0.5" />
        <path d="M-150-92l58-58h184l58 58v184l-58 58h-184l-58-58z" fill="none" stroke={argent} strokeWidth="6" />
      </g>
    </svg>
  );
};

export default DosRoyal;
