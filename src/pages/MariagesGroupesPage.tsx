import React from 'react';
import SEO from '../components/SEO';
import { useUI } from '../contexts/AppContext';
import MariagesPage from './MariagesPage';
import GroupesPage from './GroupesPage';

// ─── Mariages & Groupes (édition 2026) ──────────────────────────────
// Merged pillar: Mariages + Groupes, two chapters under one route. Unified
// SEO last so it wins the page title.
const MariagesGroupesPage: React.FC = () => {
  const { lang } = useUI();
  return (
    <>
      <MariagesPage />
      <GroupesPage />
      <SEO title={lang === 'FR' ? 'Mariages & Groupes' : 'Weddings & Groups'} />
    </>
  );
};

export default MariagesGroupesPage;
