import React from 'react';
import SEO from '../components/SEO';
import { useUI } from '../contexts/AppContext';
import MarchePage from './MarchePage';
import NourriturePage from './NourriturePage';

// ─── Le Village (édition 2026) ──────────────────────────────────────
// Merged pillar: Marché + Nourriture, two chapters under one route. Unified
// SEO last so it wins the page title.
const LeVillagePage: React.FC = () => {
  const { lang } = useUI();
  return (
    <>
      <MarchePage />
      <NourriturePage />
      <SEO title={lang === 'FR' ? 'Le Village' : 'The Village'} />
    </>
  );
};

export default LeVillagePage;
