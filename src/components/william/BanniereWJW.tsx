import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// ─── La bannière du commanditaire ───────────────────────────────────
// Une seule rupture visuelle sur toute la page (effet Von Restorff) :
// le site est nuit bleue et laiton, cette bande est un parchemin clair
// qui coupe le noir d'un bord à l'autre. Le clash se voit, il reste
// dans la famille chaude du festival, et le logo de la maison garde son
// noir d'origine au lieu d'être renversé.
//
// La bande chapeaute la page : elle vient avant tout le reste, comme
// une plaque de commanditaire à l'entrée du village.

const BanniereWJW: React.FC = () => {
  const reduit = useReducedMotion();

  return (
    <section
      aria-label="Village Nourriture présenté par William J. Walter"
      className="relative w-full overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 140% at 50% 0%, #FBF6EA 0%, #F4EFE3 38%, #E8DDC1 100%)',
        borderTop: '1px solid var(--color-brass)',
        borderBottom: '1px solid var(--color-brass)',
      }}
    >
      {/* Grain de papier de boucher : deux trames très faibles qui
          empêchent l'aplat crème de paraître plat à l'écran. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(107,31,31,.045) 0 1px, transparent 1px 14px),' +
            'repeating-linear-gradient(0deg, rgba(107,31,31,.035) 0 1px, transparent 1px 14px)',
          mixBlendMode: 'multiply',
        }}
      />
      {/* Ombre douce sur les deux bords, pour que la bande semble posée
          sur la nuit du site plutôt que découpée dedans. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(42,10,18,.16), transparent)' }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(0deg, rgba(42,10,18,.16), transparent)' }}
      />

      <div className="relative max-w-screen-lg mx-auto px-5 md:px-10 py-14 md:py-20 text-center">
        <motion.div
          initial={reduit ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <img
            src="/fmm-crest-chrome.webp"
            alt=""
            aria-hidden
            className="mx-auto mb-5 w-11 md:w-14 opacity-90"
            style={{ filter: 'grayscale(1) brightness(.35)' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />

          <p
            className="font-sans uppercase mb-6"
            style={{
              color: 'var(--color-oxblood)',
              letterSpacing: '0.34em',
              fontSize: 'clamp(9px, 1.6vw, 11px)',
            }}
          >
            Le Village Nourriture présenté par
          </p>

          <img
            src="/partenaires/wjw-logo.svg"
            alt="William J. Walter, saucissier"
            className="mx-auto w-[min(78vw,26rem)] md:w-[min(60vw,32rem)]"
          />

          <div
            aria-hidden
            className="mx-auto mt-8 mb-6 flex items-center justify-center gap-4"
            style={{ maxWidth: '18rem' }}
          >
            <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, var(--color-brass))' }} />
            <span
              className="inline-block"
              style={{
                width: 7, height: 7, transform: 'rotate(45deg)',
                background: 'var(--color-oxblood)',
              }}
            />
            <span className="h-px flex-1" style={{ background: 'linear-gradient(270deg, transparent, var(--color-brass))' }} />
          </div>

          <p
            className="font-editorial mx-auto"
            style={{
              color: '#4A3520',
              maxWidth: '38rem',
              fontSize: 'clamp(17px, 2.3vw, 22px)',
              lineHeight: 1.5,
            }}
          >
            Trois recettes sur nos grils, du 25 au 27 septembre 2026. La William Suisse,
            la Toulouse et la Sanglier Bleuet cuisent devant vous, à quarante minutes
            de la boutique de Buckingham.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default BanniereWJW;
