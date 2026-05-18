import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { SITE } from '../content';
import SEO from '../components/SEO';

// Renders the Wix-style "back in May" placeholder: misty fog backdrop,
// vertical 2026 poster card, dates + ticket button. Toggled via env
// (VITE_SITE_MODE=placeholder) — defaults off in favor of the live home.
const PlaceholderHome: React.FC = () => {
  const { lang } = useUI();
  return (
    <>
      <SEO />
      <main className="relative min-h-screen flex items-center justify-center bg-midnight-deep text-ivory overflow-hidden">
        {/* Foggy backdrop — generic torch+sword cinematic; swap when ready. */}
        <img
          src="/hero/viking-cinematic.webp"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep/60 via-midnight/70 to-midnight-deep/95" />
        <div className="grain absolute inset-0 opacity-20" aria-hidden />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 max-w-5xl mx-auto px-6 items-center">
          {/* Vertical poster card */}
          <div className="glass-on-photo rounded-lg-card overflow-hidden max-w-xs mx-auto md:mx-0">
            <img
              src="/hero/fmm-poster-card.jpg"
              alt="FMM 2026 — 25-26-27 septembre"
              className="w-full h-auto"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>

          {/* Caption + CTA */}
          <div className="text-center md:text-left">
            <p className="font-editorial italic text-brass uppercase tracking-[0.4em] text-xs mb-4">
              {SITE.edition2026}
            </p>
            <h1 className="font-display title-medieval text-4xl md:text-6xl text-ivory mb-4 leading-tight">
              FMM {SITE.year}
            </h1>
            <p className="font-editorial text-lg md:text-xl text-ivory-soft mb-2">
              {lang === 'FR' ? 'Nous reviendrons les' : 'We return on'}
            </p>
            <p className="font-display title-medieval text-2xl md:text-3xl text-brass mb-6">
              {SITE.datesLabel[lang]}
            </p>
            <p className="font-editorial italic text-sm text-ivory-soft mb-8">
              {lang === 'FR' ? 'Site internet de retour en mai.' : 'Website returns in May.'}
            </p>
            <a
              href={import.meta.env.VITE_ZEFFY_TICKET_URL || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-sm font-semibold hover:bg-brass-soft transition rounded-card"
            >
              {lang === 'FR' ? 'Acheter mes billets' : 'Get my tickets'}
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 z-10 font-display title-medieval text-2xl text-ivory/80">
          FMM {SITE.year}
        </div>
      </main>
    </>
  );
};

export default PlaceholderHome;
