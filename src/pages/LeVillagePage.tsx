import React from 'react';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import MarchePage from './MarchePage';
import NourriturePage from './NourriturePage';

// ─── Le Village (édition 2026) ──────────────────────────────────────
// Merged pillar: Marché + Nourriture. One unified hero + scroll-progress,
// then each source page renders embedded (compact chapter divider, no
// duplicate hero/SEO).
const LeVillagePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  return (
    <>
      <SEO title={fr ? 'Le Village' : 'The Village'} />
      <ScrollProgress />
      <PageHeader
        eyebrow={fr ? 'Le cœur battant du festival' : 'The beating heart of the festival'}
        titleA={fr ? 'Le Village' : 'The Village'}
        intro={fr
          ? 'Le marché des artisans et le village nourriture : tout ce qui se découvre, se goûte et se rapporte du festival.'
          : 'The artisan market and the food village: everything you discover, taste and bring home from the festival.'}
        orbImage="/wix/marche/47376430.jpg"
      />
      <MarchePage embedded />
      <NourriturePage embedded />
    </>
  );
};

export default LeVillagePage;
