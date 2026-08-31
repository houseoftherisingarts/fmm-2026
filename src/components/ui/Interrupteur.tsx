import React from 'react';

// ─── L'interrupteur du site ───────────────────────────────────────────
// Sorti de ReglagesProfil.tsx (Alex, 2026-08-31) pour servir aussi sous
// les cartes de skin. Un bouton role="switch", le curseur glisse en
// transition; les couleurs suivent la peau active (variables --sk-*).

const Interrupteur: React.FC<{ actif: boolean; onClick: () => void; label: string }> = ({ actif, onClick, label }) => (
  <button
    type="button" role="switch" aria-checked={actif} onClick={onClick}
    className="relative w-10 h-[22px] rounded-full transition-colors shrink-0"
    style={{ background: actif ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.18)' }}
    aria-label={label}
  >
    <span className="absolute left-0 top-0.5 w-[18px] h-[18px] rounded-full transition-transform"
          style={{ background: 'var(--sk-parchment)', transform: actif ? 'translateX(20px)' : 'translateX(2px)' }} />
  </button>
);

export default Interrupteur;
