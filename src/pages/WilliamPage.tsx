import React from 'react';
import SEO from '../components/SEO';
import { ScrollProgress } from '../components/scroll';
import { useCaravanPage } from '../lib/useCaravanPage';
import BanniereWJW from '../components/william/BanniereWJW';
import BoutiquesProchesWJW from '../components/william/BoutiquesProchesWJW';
import ConcoursWJW from '../components/william/ConcoursWJW';
import NourriturePage from './NourriturePage';

// ─── Le Village Nourriture, présenté par William J. Walter ──────────
// Commandite acceptée le 2026-08-29 : cette version est la vraie page
// du pilier Nourriture (servie sur /nourriture; /william y redirige).
// La page Nourriture, coiffée de la bannière William J. Walter, suivie
// du concours William et des boutiques de l'Outaouais.
//
// Le contenu du milieu vient de NourriturePage en mode embarqué : le
// menu, le banquet et le livre de recettes restent la source unique.

const WilliamPage: React.FC = () => {
  useCaravanPage();

  return (
    <>
      <SEO
        title="Le Village Nourriture présenté par William J. Walter"
        description="Maquette de commandite : le village gustatif du Festival Médiéval de Montpellier, présenté par William J. Walter."
        noindex
      />
      <ScrollProgress />

      <BanniereWJW />

      <div className="pt-0">
        <NourriturePage embedded sansEntete />
      </div>

      <ConcoursWJW />
      <BoutiquesProchesWJW />
    </>
  );
};

export default WilliamPage;
