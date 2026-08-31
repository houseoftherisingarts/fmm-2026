import React from 'react';

// ─── Le tarot de la caravane ─────────────────────────────────────────
// La récompense du jour 4 (Alex, 2026-08-30) : un dos de carte qui ne
// ressemble en rien au dos du festival. Vrai saphir taillé coussin dans
// un chaton d'argent, cadre de filigrane d'argent ciselé, velours bleu
// nuit : une photographie de studio (FLUX 1.1 Pro, 30 août 2026), mise
// aux proportions exactes des lames (813 × 1536), et non un dessin :
// Alex voulait la même matière que la pièce de Montpellois.

const DosCaravane: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <img
    src="/tarot/dos-caravane.webp"
    alt=""
    aria-hidden
    loading="lazy"
    decoding="async"
    className={`object-cover ${className}`}
    style={style}
  />
);

export default DosCaravane;
