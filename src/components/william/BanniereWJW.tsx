import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Eyebrow, DisplayTitle } from '../marche/atmospherics';
import Orb from '../layout/Orb';

// ─── Le héros du commanditaire ──────────────────────────────────────
// L'ordre voulu par Alex (29 août, v2) : le commanditaire d'abord.
// « William J. Walter » en haut, « présente » dessous, puis « Village
// Nourriture » avec le grand cercle canon du site (composant Orb :
// bordure laiton, balayage au survol). L'entrée se fait en fondu
// séquencé, un morceau à la fois. L'image du cercle est une vraie
// photo libre de droits (Pexels), jamais de l'IA.

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fondu = (reduit: boolean | null, delai: number) => ({
  initial: reduit ? false : ({ opacity: 0, y: 16 } as const),
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay: delai, ease: EASE },
});

const BanniereWJW: React.FC = () => {
  const reduit = useReducedMotion();

  return (
    <section
      aria-label="William J. Walter présente le Village Nourriture"
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

      {/* La maison d'abord, en pleine largeur : le logo occupe toute la
          bande, « présente » le suit, centrés au-dessus du reste
          (Alex, 29 août, v3). */}
      <div className="relative z-10 max-w-screen-xl mx-auto px-5 md:px-10 pt-16 md:pt-24 text-center">
        <motion.img
          {...fondu(reduit, 0.1)}
          src="/partenaires/wjw-logo-bone.svg"
          alt="William J. Walter, saucissier"
          className="mx-auto w-[min(94vw,70rem)]"
          style={{ filter: 'drop-shadow(0 0 34px rgba(232, 177, 74, .26))' }}
        />

        <motion.div {...fondu(reduit, 0.65)} className="flex justify-center mt-8 md:mt-10">
          <Eyebrow tone="amber" className="inline-flex items-center gap-4">
            <span aria-hidden className="h-px w-10 md:w-16" style={{ background: 'var(--color-amber-glow)' }} />
            présente
            <span aria-hidden className="h-px w-10 md:w-16" style={{ background: 'var(--color-amber-glow)' }} />
          </Eyebrow>
        </motion.div>
      </div>

      {/* Puis le village : le titre à gauche, le grand cercle à droite. */}
      <div className="relative z-10 max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-4 md:pb-6 grid gap-x-12 gap-y-12 items-center lg:grid-cols-[1.05fr_1fr]">
        <motion.div {...fondu(reduit, 1.15)} className="min-w-0 text-center lg:text-left lg:pr-6">
          <DisplayTitle size="xl" glow>
            Village Nourriture
          </DisplayTitle>
        </motion.div>

        {/* Le grand cercle canon du site, photo réelle des grillades. */}
        <motion.div
          initial={reduit ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 1.5, ease: EASE }}
          className="w-full max-w-[280px] sm:max-w-[360px] md:max-w-[440px] lg:max-w-[480px] justify-self-center lg:justify-self-end"
        >
          <Orb
            image="/wix/nourriture/nourriture-orbe-p.webp"
            position="center 60%"
            label="Saucisses grillées au romarin sur planche de bois"
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
