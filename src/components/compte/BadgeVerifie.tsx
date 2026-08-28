import React from 'react';
import { BadgeCheck } from 'lucide-react';

// ─── La coche bleue vérifiée ──────────────────────────────────────────
// Décernée par l'équipe seulement (membres.verifie). Un seul composant,
// pour que le nom, le registre et le mur portent exactement le même
// badge, collé au nom (Alex, 2026-08-28).
const BadgeVerifie: React.FC<{ size?: number; className?: string; titre?: string }> = ({ size = 18, className = '', titre }) => (
  <BadgeCheck aria-label={titre} className={`shrink-0 ${className}`} size={size} color="#4c8ef7" fill="#F4EFE3" strokeWidth={2} />
);

export default BadgeVerifie;
