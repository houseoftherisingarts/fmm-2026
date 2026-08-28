import React from 'react';
import { BadgeCheck } from 'lucide-react';

// ─── La coche bleue vérifiée ──────────────────────────────────────────
// Décernée par l'équipe seulement (membres.verifie). Un seul composant,
// pour que le nom, le registre et le mur portent exactement le même
// rond bleu sur fond ivoire (Alex, 2026-08-28).
const BadgeVerifie: React.FC<{ size?: number; className?: string; titre?: string }> = ({ size = 18, className = '', titre }) => (
  <span
    title={titre}
    className={`inline-flex items-center justify-center rounded-full shrink-0 ${className}`}
    style={{ width: size, height: size, background: '#F4EFE3' }}
  >
    <BadgeCheck size={size} color="#4c8ef7" fill="#F4EFE3" strokeWidth={2.2} />
  </span>
);

export default BadgeVerifie;
