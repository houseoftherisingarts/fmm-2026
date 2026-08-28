import React from 'react';

// ─── L'icône du Montpellois ────────────────────────────────────────
// Une pièce d'or frappée, le M de Montpellier en relief, bord perlé.
// Dessinée en SVG (pas un glyphe, pas un aplat — RÈGLE OUTILS-DESIGN).
// `image` bascule sur /montpellois.webp (une gravure déposée séparément
// par Alex) pour les grands affichages, avec repli automatique sur le
// SVG tant que le fichier n'existe pas (Alex, 2026-08-28).

interface Props {
  size?: number;
  /** Utilise la gravure /montpellois.webp au lieu du SVG. */
  image?: boolean;
  className?: string;
}

const PieceMontpellois: React.FC<Props> = ({ size = 20, image = false, className }) => {
  if (image) {
    return (
      <img
        src="/montpellois.webp"
        alt="Montpellois"
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, objectFit: 'contain' }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role="img" aria-label="Montpellois" className={className}>
      <defs>
        <radialGradient id="piece-or" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#F7E2A0" />
          <stop offset="45%" stopColor="#D8B05A" />
          <stop offset="100%" stopColor="#8A6423" />
        </radialGradient>
        <linearGradient id="piece-relief" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r={19} fill="url(#piece-or)" stroke="#6B4A1E" strokeWidth="1" />
      {/* Bord perlé */}
      {Array.from({ length: 20 }).map((_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return <circle key={i} cx={20 + Math.cos(a) * 16.5} cy={20 + Math.sin(a) * 16.5} r="0.9" fill="rgba(0,0,0,0.25)" />;
      })}
      <circle cx="20" cy="20" r="13.5" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
      {/* Le M de Montpellier, en relief */}
      <path
        d="M 12 26 L 12 14 L 16 14 L 20 21 L 24 14 L 28 14 L 28 26 L 24.5 26 L 24.5 19 L 21 26 L 19 26 L 15.5 19 L 15.5 26 Z"
        fill="url(#piece-relief)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6"
      />
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
    </svg>
  );
};

export default PieceMontpellois;
