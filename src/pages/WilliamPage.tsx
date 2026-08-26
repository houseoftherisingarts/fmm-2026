import React from 'react';
import SEO from '../components/SEO';
import { ScrollProgress } from '../components/scroll';
import { useCaravanPage } from '../lib/useCaravanPage';
import BanniereWJW from '../components/william/BanniereWJW';
import BoutiquesProchesWJW from '../components/william/BoutiquesProchesWJW';
import ConcoursWJW from '../components/william/ConcoursWJW';
import NourriturePage from './NourriturePage';

// ─── La page du commanditaire, en maquette ──────────────────────────
// Copie de la page Nourriture, coiffée de la bannière William J. Walter
// et suivie des boutiques de l'Outaouais. Elle vit sur son propre slug,
// `/william`, pour être montrée au commanditaire sans rien changer au
// site public. Rien ne remplace la vraie page tant qu'Alex n'a pas
// tranché (règle de la branche unique : une page d'essai est un slug,
// jamais une branche).
//
// Le contenu du milieu vient de NourriturePage en mode embarqué : le
// menu, le banquet et le livre de recettes restent la source unique,
// donc la maquette ne peut pas dériver du vrai site.
//
// Cette page est volontairement absente des menus et du plan du site.

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
