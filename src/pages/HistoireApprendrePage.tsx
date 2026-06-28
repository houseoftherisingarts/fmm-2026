import React from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import HistoirePage from './HistoirePage';
import ApprendrePage from './ApprendrePage';

// ─── Histoire & Apprendre (édition 2026) ────────────────────────────
// Merged pillar: Histoire + Apprendre. One unified hero + scroll-progress,
// then each source page renders embedded (compact chapter divider). Between
// the two chapters sits the Viking short film, moved here from the home orb.
const HistoireApprendrePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const film = fr
    ? { eyebrow: 'Le court-métrage', title: 'L’édition Viking en images',
        lead: 'Vikings, feu et tambours : revivez notre édition précédente. La troupe Hullsborg, elle, revient cette année.' }
    : { eyebrow: 'The short film', title: 'The Viking edition in motion',
        lead: 'Vikings, fire and drums: relive our previous edition. The Hullsborg troupe returns this year.' };

  return (
    <>
      <SEO title={fr ? 'Histoire & Apprendre' : 'History & Learning'} />
      <ScrollProgress />
      <PageHeader
        eyebrow={fr ? 'Quatre ans, et ce qu’on en garde' : 'Four years, and what we keep'}
        titleA={fr ? 'Histoire & Apprendre' : 'History & Learning'}
        intro={fr
          ? 'D’où vient le festival, et ce qu’il transmet : notre histoire, puis les savoirs et le thème 2026 à explorer.'
          : 'Where the festival comes from, and what it passes on: our history, then the crafts and the 2026 theme to explore.'}
        orbImage="/wix/histoire/03b1fe30.jpg"
      />

      <HistoirePage embedded />

      {/* Viking short film — moved here from the home orb. */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-midnight-deep">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{film.eyebrow}</p>
          <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-4">{film.title}</h2>
          <div className="divider-brass w-20 mb-6" />
          <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed max-w-2xl mb-8">{film.lead}</p>
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

      <ApprendrePage embedded />
    </>
  );
};

export default HistoireApprendrePage;
