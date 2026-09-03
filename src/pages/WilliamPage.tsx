import React from 'react';
import SEO from '../components/SEO';
import { ScrollProgress } from '../components/scroll';
import { useCaravanPage } from '../lib/useCaravanPage';
import DrapeauTisse from '../components/effets/DrapeauTisse';
import BoutiquesProchesWJW from '../components/william/BoutiquesProchesWJW';
import ConcoursWJW from '../components/william/ConcoursWJW';
import NourriturePage from './NourriturePage';
import BoissonsPage from './BoissonsPage';

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
        description="Le village gustatif du Festival Médiéval de Montpellier, présenté par William J. Walter : le menu des tentes, le banquet et le concours William."
      />
      <ScrollProgress />

      {/* La bannière du commanditaire est une étoffe qui ondule, tissée
          au chargement et simulée en Verlet (Alex, 2026-09-02, essai
          approuvé). Elle pend dans le vide, pleine largeur, et sa
          hauteur suit les proportions du tissu. Le lettrage porte l'os
          du logo, le cadre porte le vert du festival.

          Le titre reste lisible par les lecteurs d'écran : le texte est
          peint dans une texture, donc invisible pour eux, et la section
          porte son nom à leur intention. */}
      <section
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '44 / 27' }}
        aria-label="William J. Walter présente le Village Nourriture"
      >
        <DrapeauTisse legende="présente" titre={['VILLAGE NOURRITURE']} />
      </section>

      <div className="pt-0">
        <NourriturePage embedded sansEntete />
      </div>

      <ConcoursWJW />
      <BoutiquesProchesWJW />

      {/* Le Village Boissons ferme la page, APRÈS les boutiques : le bar
          est sa propre entité, hors de l'ensemble William (Alex, 29 août).
          L'ancre #boissons continue de servir l'ancienne route /boissons. */}
      <div id="boissons"><BoissonsPage embedded /></div>
    </>
  );
};

export default WilliamPage;
