import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { GildedFrame } from '../marche/atmospherics';

// ─── La bannière du commanditaire ───────────────────────────────────
// Elle chapeaute la page sans la couper : aucun fond propre, le feu
// sombre du site passe au travers, et seule la lanterne de cuivre
// derrière le logo la distingue du reste. Le logo de la maison est
// repeint en os et serré dans les quatre coins dorés du festival,
// puis l'ornement forgé de chapitre ferme la bande, le même qui
// sépare les grandes sections partout ailleurs. C'est une plaque à
// l'entrée du village, dans le même métal que le village.

const BanniereWJW: React.FC = () => {
  const reduit = useReducedMotion();

  return (
    <section
      aria-label="Village Nourriture présenté par William J. Walter"
      className="relative w-full overflow-hidden"
    >
      {/* La lanterne : une lueur de cuivre et d'ambre derrière le logo,
          comme la braise derrière le titre du banquet. */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: '50%', top: '44%', width: 'min(78vw, 48rem)', height: 'min(78vw, 48rem)',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(184, 106, 42, .30) 0%, rgba(232, 177, 74, .12) 30%, rgba(123, 30, 45, .08) 50%, transparent 66%)',
          filter: 'blur(8px)',
        }}
      />

      <div className="relative z-10 max-w-screen-xl mx-auto px-5 md:px-10 pt-14 md:pt-20 pb-6 md:pb-8 text-center">
        <motion.div
          initial={reduit ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex justify-center">
            <GildedFrame tone="amber" active inset={10}>
              <div className="px-10 py-8 md:px-16 md:py-10">
                <img
                  src="/partenaires/wjw-logo-bone.svg"
                  alt="William J. Walter, saucissier"
                  className="mx-auto w-[min(72vw,22rem)] md:w-[min(46vw,28rem)]"
                  style={{ filter: 'drop-shadow(0 0 22px rgba(232, 177, 74, .22))' }}
                />
              </div>
            </GildedFrame>
          </div>

          <p
            className="font-editorial mx-auto mt-9 text-ivory-soft"
            style={{ maxWidth: '36rem', fontSize: 'clamp(16px, 2.1vw, 20px)', lineHeight: 1.55 }}
          >
            Trois recettes sur nos grils du 25 au 27 septembre. La William Suisse, la
            Toulouse et la Sanglier Bleuet cuisent devant vous, à quarante minutes de
            la boutique de Buckingham.
          </p>
        </motion.div>
      </div>

      {/* L'ornement forgé du site, en guise de couture entre la plaque du
          commanditaire et le village qui suit. */}
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
