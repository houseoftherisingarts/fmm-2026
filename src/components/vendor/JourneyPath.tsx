import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import TarotCard, { type TarotGlyph } from '../TarotCard';

interface Props {
  chapter: number;          // 1..5
  completed: number[];      // ids whose required fields are valid
  onJump: (id: number) => void;
  labels: string[];         // 5 labels (chapter I..V)
}

// 5 cards from the FMM deck — one per chapter.
const GLYPHS: TarotGlyph[] = ['wanderer', 'flame', 'wheel', 'mask', 'helm'];
const ACCENTS = [
  'var(--color-ruby)',
  'var(--color-emerald-deep)',
  'var(--color-mustard)',
  'var(--color-plum)',
  'var(--color-amber-glow)',
];

// Tarot-spread progress nav. Cards sit face-down (rotated, dimmed) until
// their chapter is reached or completed; current card lifts and glows.
export const JourneyPath: React.FC<Props> = ({ chapter, completed, onJump, labels }) => {
  const reduce = useReducedMotion();

  return (
    <nav aria-label="Quest progress" className="w-full">
      <ol className="flex items-end justify-center gap-2 md:gap-3">
        {GLYPHS.map((glyph, i) => {
          const id = i + 1;
          const isCurrent  = chapter === id;
          const isComplete = completed.includes(id);
          const reachable  =
            id <= chapter ||
            GLYPHS.slice(0, id - 1).every((_, k) => completed.includes(k + 1));

          // Resting tilt for stack-of-cards feel; current card stands up.
          const restRot = (id - 3) * 4;       // -8 / -4 / 0 / 4 / 8 deg
          const rotZ = isCurrent ? 0 : restRot;
          const yOff = isCurrent ? -10 : isComplete ? -2 : 0;

          return (
            <motion.li
              key={glyph}
              animate={reduce ? { y: 0, rotate: 0 } : { y: yOff, rotate: rotZ }}
              transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 200, damping: 22 }}
              className="flex flex-col items-center"
            >
              <motion.button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onJump(id)}
                whileHover={reachable && !isCurrent ? { y: -6, scale: 1.04 } : undefined}
                whileTap={reachable ? { scale: 0.97 } : undefined}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                className={`relative cursor-pointer transition-opacity ${
                  reachable ? 'opacity-100' : 'opacity-40 cursor-not-allowed'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={labels[i] || `Chapitre ${id}`}
                style={{
                  filter: isCurrent ? `drop-shadow(0 6px 18px ${ACCENTS[i]}) drop-shadow(0 0 28px rgba(232, 177, 74, 0.45))` : undefined,
                }}
              >
                <div className="w-12 sm:w-14 md:w-16">
                  <TarotCard
                    glyph={glyph}
                    className={`${isCurrent ? '' : 'saturate-50 brightness-75'} transition-all`}
                  />
                </div>
                {isComplete && !isCurrent && (
                  <motion.span
                    initial={reduce ? { opacity: 0 } : { scale: 0, rotate: -25, opacity: 0 }}
                    animate={reduce ? { opacity: 1 } : { scale: 1, rotate: 0, opacity: 1 }}
                    transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 300, damping: 16 }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 35% 30%, #E5C679 0%, #C4A45A 55%, #7A6534 100%)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.4) inset',
                    }}
                    aria-hidden
                  />
                )}
              </motion.button>
              <span className={`mt-2 text-[8px] sm:text-[9px] md:text-[10px] font-display title-medieval uppercase tracking-[0.2em] text-center max-w-[70px] truncate ${
                isCurrent ? 'text-amber-200' : 'text-stone'
              }`}>
                {labels[i] || ''}
              </span>
            </motion.li>
          );
        })}
      </ol>
    </nav>
  );
};
