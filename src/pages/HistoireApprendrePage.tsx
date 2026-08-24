import React from 'react';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import {
  HistoireChapterSection, ArchivesPhotosSection,
  PlongezArchivesSection, EquipeSection,
} from './HistoirePage';
import FriseHistoire from '../components/histoire/FriseHistoire';
import Bibliotheque from '../components/histoire/Bibliotheque';
import SaviezVous from '../components/apprendre/SaviezVous';
import {
  ApprendreChapterSection, ThemeCaravanesSection, OriginesCirqueSection,
  EpoqueSection, FormationsSection,
} from './ApprendrePage';

// ─── Histoire & Apprendre (édition 2026) ────────────────────────────
// Merged pillar. Section order set by Alex (2026-07-28):
// hero → 6 ans d'histoire → Ni G-N ni reconstitution → Archives photos
// → Apprendre (avec Au-delà des clichés) → Caravanes & Saltimbanques
// → Aux origines du cirque → Une époque aux réalités variées
// → Formations et démonstrations → Estage de Culture → Plongez dans nos
// archives (machine
// à remonter le temps + film Viking) → L'équipe.
// Frise animée ajoutée après « 6 ans d'histoire » le 2026-08-05, derrière
// `showHistoireFrise` (éteint) : invisible tant qu'Alex ne l'a pas validée.
const HistoireApprendrePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';

  return (
    <>
      <SEO title={fr ? 'Histoire & Apprendre' : 'History & Learning'} />
      <ScrollProgress />
      <PageHeader
        eyebrow={fr ? 'Cinq ans, et ce que nous en gardons' : 'Five years, and what we keep'}
        titleA={fr ? 'Histoire & Apprendre' : 'History & Learning'}
        intro={fr
          ? 'D’où vient le festival, et ce qu’il transmet : notre histoire, puis les savoirs et le thème 2026 à explorer.'
          : 'Where the festival comes from, and what it passes on: our history, then the crafts and the 2026 theme to explore.'}
        orbImage="/wix/histoire/03b1fe30.jpg"
      />

      {/* L'ordre voulu par Alex le 2026-08-24 : notre histoire, le thème
          de l'année, puis ce que le festival transmet, et les archives
          tout au bout. Les photos descendent après les vidéos, et
          l'équipe ferme la marche. */}
      <HistoireChapterSection />
      {/* Frise animée : en préparation, derrière `showHistoireFrise`
          (voir FriseHistoire.tsx). Ne rend rien tant que le drapeau
          est éteint. */}
      <FriseHistoire />

      <ThemeCaravanesSection />
      <OriginesCirqueSection />

      <ApprendreChapterSection />
      <EpoqueSection />
      <FormationsSection />

      {/* Estage de Culture, la rubrique née sur notre page en août
          2023 : des faits vérifiés, un par carte. */}
      <SaviezVous lang={lang} />

      {/* Ce qu'il faut lire vient juste après le carnet : les deux se
          nourrissent l'un l'autre. */}
      <Bibliotheque lang={lang} />

      <PlongezArchivesSection />
      <ArchivesPhotosSection />
      <EquipeSection />
    </>
  );
};

export default HistoireApprendrePage;
