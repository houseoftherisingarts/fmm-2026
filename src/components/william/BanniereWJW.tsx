import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Eyebrow, DisplayTitle } from '../marche/atmospherics';

// ─── Le héros du commanditaire ──────────────────────────────────────
// Le gabarit pilier du site, appliqué au village : à gauche l'enseigne
// en trois temps (« Village Nourriture », « présenté par », le logo de
// la maison), à droite le grand cercle du village avec le plateau de
// dégustation. L'entrée se fait en fondu séquencé : le titre d'abord,
// la ligne ensuite, le logo enfin, l'orbe en dernier (Alex, 29 août).
// Aucun fond propre, le feu sombre du site passe au travers, et
// l'ornement forgé de chapitre ferme la bande comme partout ailleurs.

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Chaque morceau entre à son tour. `useReducedMotion` court-circuite
// tout : l'état final s'affiche d'un coup.
const fondu = (reduit: boolean | null, delai: number) => ({
  initial: reduit ? false : ({ opacity: 0, y: 16 } as const),
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay: delai, ease: EASE },
});

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

      <div className="relative z-10 max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-16 md:pt-24 pb-4 md:pb-6 grid gap-x-12 gap-y-12 items-center lg:grid-cols-[1.05fr_1fr]">
        {/* L'enseigne, en trois temps. */}
        <div className="min-w-0 text-center lg:text-left lg:pr-6">
          <motion.div {...fondu(reduit, 0.1)}>
            <DisplayTitle size="xl" glow className="mb-5 md:mb-6">
              Village Nourriture
            </DisplayTitle>
          </motion.div>

          <motion.div {...fondu(reduit, 0.65)} className="flex justify-center lg:justify-start mb-8 md:mb-10">
            <Eyebrow tone="amber" className="inline-flex items-center gap-4">
              <span aria-hidden className="h-px w-10 md:w-16" style={{ background: 'var(--color-amber-glow)' }} />
              présenté par
              <span aria-hidden className="h-px w-10 md:w-16" style={{ background: 'var(--color-amber-glow)' }} />
            </Eyebrow>
          </motion.div>

          <motion.img
            {...fondu(reduit, 1.15)}
            src="/partenaires/wjw-logo-bone.svg"
            alt="William J. Walter, saucissier"
            className="mx-auto lg:mx-0 w-[min(88vw,34rem)]"
            style={{ filter: 'drop-shadow(0 0 34px rgba(232, 177, 74, .26))' }}
          />
        </div>

        {/* Le grand cercle du village : le plateau de dégustation dans
            l'orbe du site, même écrin que les autres piliers. */}
        <motion.div
          initial={reduit ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 1.5, ease: EASE }}
          className="relative w-full max-w-[280px] sm:max-w-[360px] md:max-w-[440px] lg:max-w-[480px] aspect-square justify-self-center lg:justify-self-end"
          role="img"
          aria-label="Plateau de dégustation de saucisses grillées sur planche de bois"
        >
          <div
            aria-hidden
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(184, 106, 42, 0.32), rgba(176, 141, 58, 0.18) 40%, transparent 65%)',
              filter: 'blur(55px)',
            }}
          />
          <div className="orb-shell relative aspect-square w-full rounded-full overflow-hidden">
            <div
              className="absolute inset-0 fmm-orb-img-active"
              style={{
                backgroundImage: 'url(/wix/nourriture/wjw-plateau-orbe.webp)',
                backgroundPosition: 'center 55%',
                backgroundSize: 'cover',
              }}
            />
            <div aria-hidden className="absolute inset-0 rounded-full pointer-events-none fmm-orb-shine" />
          </div>
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
