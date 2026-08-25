import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Eyebrow, GildedFrame, SectionFog } from '../marche/atmospherics';

// ─── La bannière du commanditaire ───────────────────────────────────
// Une seule rupture visuelle sur la page (effet Von Restorff), mais
// une rupture qui reste dans la famille : la nuit bleue du site vire
// au velours et au rubis du chapitre de la caravane, d'un bord à
// l'autre, le temps d'une bande. Le logo de la maison est repeint en
// os sur ce vin, comme un fer chaud sur un tonneau, à la façon des
// panneaux de commanditaire de la page Partenaires (logo incrusté,
// jamais posé en aplat clair).
//
// Tout vient des primitives du site : Eyebrow, GildedFrame, SectionFog
// et les jetons de couleur. Rien de neuf à entretenir.

const BanniereWJW: React.FC = () => {
  const reduit = useReducedMotion();

  return (
    <section
      aria-label="Village Nourriture présenté par William J. Walter"
      className="relative w-full overflow-hidden"
      style={{
        background:
          'radial-gradient(90% 120% at 50% 100%, rgba(123, 30, 45, .55) 0%, rgba(43, 10, 18, .0) 60%),' +
          'linear-gradient(180deg, var(--color-velvet-deep) 0%, var(--color-velvet) 55%, var(--color-velvet-deep) 100%)',
      }}
    >
      {/* La lanterne : une lueur de cuivre derrière le logo, comme la
          braise derrière le titre du banquet. */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: '50%', top: '52%', width: 'min(70vw, 44rem)', height: 'min(70vw, 44rem)',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(184, 106, 42, .28) 0%, rgba(232, 177, 74, .10) 32%, transparent 62%)',
          filter: 'blur(6px)',
        }}
      />
      <SectionFog edges="both" />

      {/* Deux filets de laiton qui bordent la bande : c'est la couture
          entre la nuit du site et le vin de la bannière. */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-brass), transparent)' }} />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-brass), transparent)' }} />

      <div className="relative z-10 max-w-screen-xl mx-auto px-5 md:px-10 py-16 md:py-24 text-center">
        <motion.div
          initial={reduit ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <Eyebrow tone="amber" className="mb-8 inline-flex items-center gap-4 justify-center">
            <span aria-hidden className="h-px w-10" style={{ background: 'var(--color-amber-glow)' }} />
            Le Village Nourriture présenté par
            <span aria-hidden className="h-px w-10" style={{ background: 'var(--color-amber-glow)' }} />
          </Eyebrow>

          <GildedFrame tone="amber" active inset={10} className="inline-block">
            <div className="px-10 py-8 md:px-16 md:py-10">
              <img
                src="/partenaires/wjw-logo-bone.svg"
                alt="William J. Walter, saucissier"
                className="mx-auto w-[min(72vw,22rem)] md:w-[min(46vw,28rem)]"
                style={{ filter: 'drop-shadow(0 0 22px rgba(232, 177, 74, .22))' }}
              />
            </div>
          </GildedFrame>

          <p
            className="font-editorial mx-auto mt-10 text-ivory-soft"
            style={{ maxWidth: '36rem', fontSize: 'clamp(16px, 2.1vw, 20px)', lineHeight: 1.55 }}
          >
            Trois recettes sur nos grils du 25 au 27 septembre. La William Suisse, la
            Toulouse et la Sanglier Bleuet cuisent devant vous, à quarante minutes de
            la boutique de Buckingham.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default BanniereWJW;
