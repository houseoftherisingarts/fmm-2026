import React from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import { useUI } from '../contexts/AppContext';
import HistoirePage from './HistoirePage';
import ApprendrePage from './ApprendrePage';

// ─── Histoire & Apprendre (édition 2026) ────────────────────────────
// Merged pillar: Histoire + Apprendre. Between the two chapters sits the
// Viking short film, moved here from the home orb (the orb now features the
// new 2026 video). Unified SEO last so it wins the page title.
const HistoireApprendrePage: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR'
    ? { eyebrow: 'Le court-métrage', title: 'L’édition Viking en images',
        lead: 'Vikings, feu et tambours : revivez notre édition précédente. La troupe Hullsborg, elle, revient cette année.' }
    : { eyebrow: 'The short film', title: 'The Viking edition in motion',
        lead: 'Vikings, fire and drums: relive our previous edition. The Hullsborg troupe returns this year.' };

  return (
    <>
      <HistoirePage />

      {/* Viking short film — moved here from the home orb. */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-midnight-deep">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.eyebrow}</p>
          <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-4">{t.title}</h2>
          <div className="divider-brass w-20 mb-6" />
          <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed max-w-2xl mb-8">{t.lead}</p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="rounded-lg-card overflow-hidden border border-brass/30 aspect-video bg-black"
          >
            <video
              src="/orb/vikings.mp4"
              controls
              preload="none"
              poster="/wix/histoire/03b1fe30.jpg"
              playsInline
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      <ApprendrePage />
      <SEO title={lang === 'FR' ? 'Histoire & Apprendre' : 'History & Learning'} />
    </>
  );
};

export default HistoireApprendrePage;
