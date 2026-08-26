import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Eyebrow, DisplayTitle } from '../marche/atmospherics';

// ─── Le héros du commanditaire ──────────────────────────────────────
// Un titre, une ligne, une enseigne : « Village Nourriture », « présenté
// par », puis le logo de la maison en version pâle, seul et presque
// pleine largeur. Aucun fond propre, le feu sombre du site passe au
// travers, et l'ornement forgé de chapitre ferme la bande comme partout
// ailleurs (Alex, 25 août).

const BanniereWJW: React.FC = () => {
  const reduit = useReducedMotion();

  return (
    <section
      aria-label="Village Nourriture présenté par William J. Walter"
      className="relative w-full overflow-hidden"
    >
      {/* La lanterne : une lueur de cuivre et d'ambre derrière l'enseigne. */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: '50%', top: '58%', width: 'min(96vw, 76rem)', height: 'min(60vw, 44rem)',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(184, 106, 42, .30) 0%, rgba(232, 177, 74, .12) 30%, rgba(123, 30, 45, .08) 50%, transparent 66%)',
          filter: 'blur(8px)',
        }}
      />

      <div className="relative z-10 max-w-screen-xl mx-auto px-5 md:px-10 pt-16 md:pt-24 pb-4 md:pb-6 text-center">
        <motion.div
          initial={reduit ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <DisplayTitle size="xl" glow className="mb-5 md:mb-6">
            Village Nourriture
          </DisplayTitle>

          <div className="flex justify-center mb-8 md:mb-10">
            <Eyebrow tone="amber" className="inline-flex items-center gap-4">
              <span aria-hidden className="h-px w-10 md:w-16" style={{ background: 'var(--color-amber-glow)' }} />
              présenté par
              <span aria-hidden className="h-px w-10 md:w-16" style={{ background: 'var(--color-amber-glow)' }} />
            </Eyebrow>
          </div>

          <img
            src="/partenaires/wjw-logo-bone.svg"
            alt="William J. Walter, saucissier"
            className="mx-auto w-[min(94vw,70rem)]"
            style={{ filter: 'drop-shadow(0 0 34px rgba(232, 177, 74, .26))' }}
          />
        </motion.div>
      </div>

      {/* L'ornement forgé du site, en guise de couture avec le village. */}
      <div className="relative z-10 fmm-chapter-mark" aria-hidden>
        <span className="fmm-cm-flourish fmm-cm-left" />
        <span className="fmm-cm-pip" />
        <span className="fmm-cm-diamond" />
        <span className="fmm-cm-pip" />
        <span className="fmm-cm-flourish fmm-cm-right" />
      </div>
    </section>
  );
};

export default BanniereWJW;
