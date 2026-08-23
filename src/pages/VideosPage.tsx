import React from 'react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import PageHeader from '../components/layout/PageHeader';
import { FilmsSection } from './HistoirePage';

// ─── Les vidéos du festival ─────────────────────────────────────────
// Le bouton de l'accueil menait au seul film de 2026. Il mène maintenant
// ici, où les trois vidéos vivent ensemble (Alex, 2026-08-23).

const VideosPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';

  return (
    <>
      <SEO
        title={fr ? 'Les vidéos du festival' : 'The festival films'}
        description={fr
          ? 'Les films du Festival Médiéval de Montpellier : la bande-annonce des Caravanes, l’édition Viking et le film du festival.'
          : 'The films of the Festival Médiéval de Montpellier: the Caravans trailer, the Viking edition and the festival film.'}
      />
      <PageHeader
        eyebrow={fr ? 'La salle de projection' : 'The screening room'}
        titleA={fr ? 'Les vidéos' : 'The films'}
        titleB={fr ? 'du festival' : 'of the festival'}
        intro={fr
          ? 'Trois films tournés sur le site, une édition après l’autre. Installez-vous, ils durent quelques minutes chacun.'
          : 'Three films shot on the grounds, one edition after another. Sit back, each runs a few minutes.'}
        orbImage="/wix/home/fire-night.jpg"
        orbImagePosition="center 35%"
      />

      <section className="relative py-14 md:py-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <FilmsSection />
        </div>
      </section>
    </>
  );
};

export default VideosPage;
