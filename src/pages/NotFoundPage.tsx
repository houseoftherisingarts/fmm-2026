import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';

// ─── 404 — Salle vide ────────────────────────────────────────────────
// Visual recipe lifted from the HALT page (admin access-refused) but
// re-tuned to a "lost adventurer" register: copper/amber spotlights
// instead of oxblood, faint forest atmosphere, an empty suit of
// armour as the centrepiece, "Retour au festival" as the only CTA.
// All four corners carry copper L-ticks; the whole page shakes on
// entry like the knight's armour just toppled off its stand.

const COPY = {
  FR: {
    eyebrow:  '✦ Sentier perdu ✦',
    headline: '404',
    quote:    '« Il n’y a personne ici. Seulement une armure abandonnée et le silence des bois. »',
    line1:    'Cette page n’existe pas, ou plus.',
    line2:    'Revenez sur vos pas, le festival vous attend.',
    cta:      'Retour au festival',
  },
  EN: {
    eyebrow:  '✦ Lost path ✦',
    headline: '404',
    quote:    '"There is no one here. Only an abandoned suit of armour and the silence of the woods."',
    line1:    'This page does not exist — or no longer does.',
    line2:    'Retrace your steps. The festival awaits.',
    cta:      'Back to the festival',
  },
} as const;

const NotFoundPage: React.FC = () => {
  const { lang } = useUI();
  const t = COPY[lang];

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x: [0, -8, 8, -6, 6, -3, 3, 0] }}
      transition={{
        opacity: { duration: 0.28 },
        x:       { duration: 0.7, delay: 0.18, ease: 'easeOut' },
      }}
      className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 md:py-24 overflow-hidden text-[var(--color-bone)]"
      style={{
        background:
          // Faint deep-forest spotlights on a charcoal stage. Matches
          // the JW Green Label door tone (Super Bénévoles) so the 404
          // sits in the same atmospheric register as the rest of the
          // admin chrome — green is barely a tint, not the focus.
          `radial-gradient(900px 700px at 50% 55%, rgba(26, 68, 41, 0.09), transparent 65%),` +
          `radial-gradient(700px 500px at 50% 25%, rgba(61, 122, 79, 0.05), transparent 70%),` +
          `linear-gradient(180deg, #0c0e0b 0%, #060805 60%, #030403 100%)`,
      }}
    >
      <SEO title={t.headline + ' · ' + (lang === 'FR' ? 'Page introuvable' : 'Page not found')} />

      {/* Copper L-ticks pinned to the viewport */}
      <NotFoundCorners />

      <div className="relative w-full max-w-4xl flex flex-col items-center text-center">
        {/* Headline drops in with overshoot */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative z-10"
        >
          <p
            className="font-display title-medieval italic uppercase tracking-[0.55em] text-[11px] mb-2"
            style={{ color: '#2c5a3a', textShadow: '0 0 10px rgba(26, 68, 41, 0.22)' }}
          >
            {t.eyebrow}
          </p>
          <h1
            className="font-display title-medieval uppercase tracking-[0.04em] leading-[0.95] text-6xl sm:text-7xl md:text-8xl lg:text-9xl"
            style={{
              color: 'var(--color-bone)',
              textShadow:
                '0 0 18px rgba(26, 68, 41, 0.15), 0 2px 0 rgba(0,0,0,0.55), 0 6px 22px rgba(0,0,0,0.7)',
            }}
          >
            {t.headline}
          </h1>
        </motion.div>

        {/* Empty armour rises from below */}
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[280px] sm:max-w-xs md:max-w-sm my-2 md:my-3"
        >
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 55% 60% at 50% 55%, rgba(26, 68, 41, 0.10), transparent 70%),' +
                'radial-gradient(ellipse 40% 50% at 50% 60%, rgba(26, 68, 41, 0.05), transparent 75%)',
            }}
          />
          <img
            src="/characters/empty-armor.png"
            alt={lang === 'FR' ? 'Armure abandonnée' : 'Abandoned armour'}
            className="fmm-no-grade relative w-full h-auto object-contain"
            style={{
              filter:
                'drop-shadow(0 16px 24px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 22px rgba(26, 68, 41, 0.14))',
              // Same aggressive radial mask as HALT so the PNG's
              // bounding box dissolves into the page with no seam.
              WebkitMaskImage:
                'radial-gradient(ellipse 58% 64% at 50% 45%, #000 38%, rgba(0,0,0,0.6) 65%, transparent 92%)',
              maskImage:
                'radial-gradient(ellipse 58% 64% at 50% 45%, #000 38%, rgba(0,0,0,0.6) 65%, transparent 92%)',
            }}
          />
        </motion.div>

        {/* Flavour copy + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-2xl px-2"
        >
          <p
            className="font-editorial italic text-lg md:text-2xl leading-snug mb-4"
            style={{ color: 'var(--color-bone)' }}
          >
            {t.quote}
          </p>
          <p
            className="font-editorial italic text-sm md:text-base mb-1"
            style={{ color: 'rgba(244, 239, 227, 0.7)' }}
          >
            {t.line1}
          </p>
          <p
            className="font-editorial italic text-sm md:text-base mb-7"
            style={{ color: 'rgba(244, 239, 227, 0.55)' }}
          >
            {t.line2}
          </p>

          <Link
            to={addLocale('/', lang)}
            className="inline-flex items-center gap-2 px-7 py-3 font-sans uppercase tracking-[0.32em] text-[11px] transition-all hover:scale-[1.03]"
            style={{
              color: 'var(--color-bone)',
              background:
                'linear-gradient(180deg, #14361e 0%, #0a2614 55%, #04130a 100%)',
              border: '1px solid #2c5a3a',
              boxShadow: 'inset 0 1px 0 rgba(184, 224, 198, 0.10), 0 12px 28px -10px rgba(26, 68, 41, 0.25)',
              clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
            }}
          >
            ← {t.cta}
          </Link>
        </motion.div>
      </div>
    </motion.main>
  );
};

const NotFoundCorners: React.FC = () => {
  const color = '#2c5a3a';
  const base: React.CSSProperties = {
    position: 'absolute', width: 22, height: 22, borderColor: color,
    filter: 'drop-shadow(0 0 6px rgba(26, 68, 41, 0.22))',
    pointerEvents: 'none',
  };
  return (
    <>
      <span aria-hidden style={{ ...base, top: 18,    left: 18,    borderTop:    '2px solid', borderLeft:  '2px solid' }} />
      <span aria-hidden style={{ ...base, top: 18,    right: 18,   borderTop:    '2px solid', borderRight: '2px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 18, left: 18,    borderBottom: '2px solid', borderLeft:  '2px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 18, right: 18,   borderBottom: '2px solid', borderRight: '2px solid' }} />
    </>
  );
};

export default NotFoundPage;
