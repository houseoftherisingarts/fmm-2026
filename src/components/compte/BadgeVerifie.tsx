import React from 'react';
import { BadgeCheck } from 'lucide-react';

// ─── La coche bleue vérifiée ──────────────────────────────────────────
// Décernée par l'équipe seulement (membres.verifie). Un seul composant,
// pour que le nom, le registre et le mur portent exactement le même
// badge, collé au nom (Alex, 2026-08-28).
//
// Elle est posée sur une pastille de verre : fond translucide, léger
// flou derrière, halo bleu et un liseré clair en haut, comme le reste
// du verre du site (Alex, 2026-08-28 : « plus gros, en semi-
// transparence, plus glassmorphism »).
const BadgeVerifie: React.FC<{ size?: number; className?: string; titre?: string }> = ({
  size = 34, className = '', titre,
}) => (
  <span
    aria-label={titre}
    title={titre}
    className={`inline-flex items-center justify-center shrink-0 rounded-full align-middle ${className}`}
    style={{
      width: size,
      height: size,
      background: 'linear-gradient(150deg, rgba(120,170,255,0.32), rgba(76,142,247,0.14))',
      border: '1px solid rgba(150,195,255,0.55)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      boxShadow: '0 0 18px -4px rgba(76,142,247,0.75), inset 0 1px 0 rgba(255,255,255,0.45)',
    }}
  >
    <BadgeCheck
      aria-hidden
      size={Math.round(size * 0.66)}
      color="#bcd8ff"
      strokeWidth={2.2}
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' }}
    />
  </span>
);

export default BadgeVerifie;
