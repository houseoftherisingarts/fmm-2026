import React from 'react';
import SEO from '../components/SEO';
import { useUI } from '../contexts/AppContext';
import ActivitesPage from './ActivitesPage';
import MusiquePage from './MusiquePage';
import JeunessePage from './JeunessePage';

// ─── Programmation (édition 2026) ───────────────────────────────────
// Merged pillar: Activités + Musique + Jeunesse & Jeux, presented as three
// chapters under one route. Each source page keeps its own PageHeader as a
// chapter divider. The unified SEO is rendered LAST so it wins react-helmet's
// last-write-wins for the page title.
const ProgrammationPage: React.FC = () => {
  const { lang } = useUI();
  return (
    <>
      <ActivitesPage />
      <MusiquePage />
      <JeunessePage />
      <SEO title={lang === 'FR' ? 'Programmation' : 'Program'} />
    </>
  );
};

export default ProgrammationPage;
