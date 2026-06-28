import React from 'react';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import ActivitesPage from './ActivitesPage';
import MusiquePage from './MusiquePage';
import JeunessePage from './JeunessePage';

// ─── Programmation (édition 2026) ───────────────────────────────────
// Merged pillar: Activités + Musique + Jeunesse & Jeux. One unified hero +
// one scroll-progress, then each source page renders embedded (compact chapter
// divider instead of its own full-screen PageHeader, no duplicate SEO).
const ProgrammationPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  return (
    <>
      <SEO title={fr ? 'Programmation' : 'Program'} />
      <ScrollProgress />
      <PageHeader
        eyebrow={fr ? 'Trois villages, une fin de semaine' : 'Three villages, one weekend'}
        titleA={fr ? 'Programmation' : 'Program'}
        intro={fr
          ? 'Activités, musique et jeux de la jeunesse : tout le programme du festival, réuni en un seul lieu.'
          : 'Activities, music and youth games: the whole festival program, gathered in one place.'}
        orbImage="/wix/home/fire-night.jpg"
        orbImagePosition="center 35%"
      />
      <ActivitesPage embedded />
      <MusiquePage embedded />
      <JeunessePage embedded />
    </>
  );
};

export default ProgrammationPage;
