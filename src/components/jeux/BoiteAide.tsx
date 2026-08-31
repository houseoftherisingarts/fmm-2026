import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

// ─── « Je ne sais pas quoi faire » ──────────────────────────────────
// Alex, 2026-08-31 : une petite boîte posée dans un coin du plateau,
// dans les trois jeux de plateau. Elle dit deux choses en tout temps :
// le but du jeu en une ligne, et le geste attendu MAINTENANT. La
// seconde ligne est pilotée par l'état réel du moteur, jamais par un
// texte figé, donc elle suit la pose, le moulin, le retrait, le tour de
// l'ordinateur et le tour de l'autre personne en ligne.
//
// Repliable : la pastille seule quand on n'en a plus besoin, la boîte
// entière quand on la rouvre.

interface Props {
  /** Le but du jeu, en une ligne, toujours le même. */
  but: string;
  /** Ce qu'il faut faire à cet instant précis. */
  action: string;
  lang: 'FR' | 'EN';
  /** La position dans le cadre du jeu. */
  className?: string;
}

const BoiteAide: React.FC<Props> = ({ but, action, lang, className = '' }) => {
  const fr = lang === 'FR';
  const [ouverte, setOuverte] = useState(true);

  return (
    <div className={`absolute z-20 ${className}`} data-tuto="aide">
      <AnimatePresence mode="wait">
        {ouverte ? (
          <motion.div
            key="ouverte"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="w-[min(19rem,calc(100vw-1.5rem))] rounded-[15px] border border-white/15 bg-black/55 backdrop-blur-md px-4 py-3.5 pr-9"
            style={{ boxShadow: '0 14px 40px rgba(0,0,0,0.55)' }}
          >
            <button
              type="button"
              onClick={() => setOuverte(false)}
              aria-label={fr ? 'Replier l’aide' : 'Collapse the help'}
              className="absolute top-2 right-2 p-1.5 rounded-full text-ivory-soft/60 hover:text-ivory hover:bg-white/10 transition-colors"
            >
              <X size={13} />
            </button>
            <p className="flex items-center gap-1.5 font-sans uppercase tracking-[0.22em] text-[9px] text-[var(--color-amber-glow)] mb-1.5">
              <HelpCircle size={11} />
              {fr ? 'Quoi faire' : 'What to do'}
            </p>
            <p className="font-editorial text-[12px] leading-snug text-ivory-soft/65">
              {but}
            </p>
            <p className="mt-2 font-sans text-[11px] md:text-[12px] leading-snug text-ivory" aria-live="polite">
              {action}
            </p>
          </motion.div>
        ) : (
          <motion.button
            key="repliee"
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setOuverte(true)}
            title={fr ? 'Je ne sais pas quoi faire' : 'I do not know what to do'}
            aria-label={fr ? 'Je ne sais pas quoi faire' : 'I do not know what to do'}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-white/15 bg-black/55 backdrop-blur-md text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors"
            style={{ boxShadow: '0 10px 28px rgba(0,0,0,0.5)' }}
          >
            <HelpCircle size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BoiteAide;
