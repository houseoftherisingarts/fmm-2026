import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

// ─── La pièce de la Petite Monnaie ──────────────────────────────────
// Laiton frappé, tranche crantée, emblème pmonnaie.ca incrusté, reflet
// qui balaie. Entièrement en CSS : aucun fichier image de pièce à
// maintenir, et elle reste nette à toutes les tailles.
//
// Extraite de PetiteMonnaiePage le 2026-08-03 pour servir aussi dans
// l'espace client, où l'avis « apportez du comptant » montrait le
// logo plat au lieu de la pièce.
const EMBLEM_SRC = '/petite-monnaie/petite-monnaie-emblem-512.png';

const PetiteMonnaieCoin: React.FC<{
  /** Classes de dimension, par ex. "w-64 h-64 md:w-80 md:h-80". */
  className?: string;
  /** Flottement vertical continu. À couper dans une petite carte. */
  flotte?: boolean;
}> = ({ className = 'w-64 h-64 md:w-80 md:h-80', flotte = true }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [16, -16]), { stiffness: 120, damping: 16 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-16, 16]), { stiffness: 120, damping: 16 });

  const onMove = (e: React.PointerEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} style={{ perspective: 900 }}>
      <motion.div
        animate={flotte && !reduce ? { y: [0, -12, 0] } : undefined}
        transition={flotte && !reduce ? { duration: 6, repeat: Infinity, ease: 'easeInOut' } : undefined}
      >
        <motion.div
          style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
          className={`relative rounded-full select-none ${className}`}
        >
          {/* Corps de laiton */}
          <div aria-hidden className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 32% 28%, #E8B14A 0%, #C9A85A 34%, #8a6a2c 72%, #5c4118 100%)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 2px 6px rgba(255,235,180,0.55), inset 0 -8px 18px rgba(40,24,4,0.6)',
            }} />
          {/* Tranche crantée */}
          <div aria-hidden className="absolute inset-[7px] rounded-full opacity-70"
            style={{
              background: 'repeating-conic-gradient(rgba(60,40,8,0.55) 0deg 2deg, transparent 2deg 6deg)',
              WebkitMask: 'radial-gradient(circle, transparent 62%, black 66%, black 100%)',
              mask: 'radial-gradient(circle, transparent 62%, black 66%, black 100%)',
            }} />
          {/* Emblème incrusté */}
          <div className="absolute inset-[13%] rounded-full overflow-hidden border border-[#5c4118]/60"
            style={{ boxShadow: 'inset 0 4px 14px rgba(20,10,0,0.5)' }}>
            <img src={EMBLEM_SRC} alt="Petite Monnaie" className="w-full h-full object-cover" draggable={false} />
          </div>
          {/* Reflet qui balaie */}
          {!reduce && (
            <motion.div aria-hidden className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <motion.div
                className="absolute -inset-y-8 w-1/3"
                style={{ background: 'linear-gradient(100deg, transparent, rgba(255,240,200,0.28), transparent)', filter: 'blur(6px)' }}
                animate={{ x: ['-140%', '420%'] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 7.5, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PetiteMonnaieCoin;
