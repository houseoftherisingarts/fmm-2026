import React from 'react';
import { Flame } from 'lucide-react';
import Interrupteur from '../ui/Interrupteur';
import { useAuth } from '../../contexts/AuthContext';
import { useAnimationsFond, definirAnimationsFond } from '../../lib/usePrefsFond';

// ─── « Animations du fond », sous chaque carte de skin ───────────────
// Alex, 2026-08-31 : le feu, la neige et les bulles s'éteignent d'un
// même geste, où que la personne se trouve (boutique, coffre, espace
// VIP, réglages). L'état est lu sur <html> par useAnimationsFond : un
// clic ici met tous les autres interrupteurs à jour.

const InterrupteurAnimationsFond: React.FC<{ lang: 'FR' | 'EN'; className?: string }> = ({ lang, className }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const actif = useAnimationsFond();
  const libelle = fr ? 'Animations du fond' : 'Background animations';
  return (
    <div className={`flex items-center justify-between gap-3 ${className ?? ''}`}>
      <span className="min-w-0 flex items-start gap-1.5">
        <Flame size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--sk-gilt)' }} />
        <span className="min-w-0">
          <span className="block font-sans text-[11px] leading-tight" style={{ color: 'rgba(var(--sk-parchment-rgb),0.8)' }}>{libelle}</span>
          <span className="block font-sans text-[10px] leading-tight mt-0.5" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
            {fr ? 'feu, neige, bulles' : 'fire, snow, bubbles'}
          </span>
        </span>
      </span>
      <Interrupteur actif={actif} onClick={() => definirAnimationsFond(user?.uid, !actif)} label={libelle} />
    </div>
  );
};

export default InterrupteurAnimationsFond;
