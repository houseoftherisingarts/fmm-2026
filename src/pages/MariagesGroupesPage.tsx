import React from 'react';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import MariagesPage from './MariagesPage';
import GroupesPage from './GroupesPage';

// ─── Mariages & Groupes (édition 2026) ──────────────────────────────
// Merged pillar: Mariages + Groupes. One unified hero + scroll-progress, then
// each source page renders embedded (compact chapter divider, no duplicate
// hero/SEO).
const MariagesGroupesPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  return (
    <>
      <SEO title={fr ? 'Mariages & Groupes' : 'Weddings & Groups'} />
      <ScrollProgress />
      <PageHeader
        eyebrow={fr ? 'Célébrer au festival' : 'Celebrate at the festival'}
        titleA={fr ? 'Mariages & Groupes' : 'Weddings & Groups'}
        intro={fr
          ? 'Se marier au cœur du médiéval, ou réserver pour un groupe : des formules sur mesure pour vivre le festival ensemble.'
          : 'Get married in the heart of the medieval, or book for a group: tailored options to experience the festival together.'}
        orbImage="/wix/mariages/70dcaeae.jpg"
      />
      <MariagesPage embedded />
      <GroupesPage embedded />
    </>
  );
};

export default MariagesGroupesPage;
