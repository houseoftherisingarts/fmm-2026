import React from 'react';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import {
  HistoireChapterSection, NiGnSection, ArchivesPhotosSection,
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
// hero → 5 ans d'histoire → Ni G-N ni reconstitution → Archives photos
// → Apprendre (avec Au-delà des clichés) → Caravanes & Saltimbanques
// → Aux origines du cirque → Une époque aux réalités variées
// → Formations et démonstrations → Saviez-vous que → Plongez dans nos
// archives (machine
// à remonter le temps + film Viking) → L'équipe.
// Frise animée ajoutée après « 5 ans d'histoire » le 2026-08-05, derrière
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

      <HistoireChapterSection />
      {/* Frise animée : en préparation, derrière `showHistoireFrise`
          (voir FriseHistoire.tsx). Ne rend rien tant que le drapeau
          est éteint. */}
      <FriseHistoire />
      <NiGnSection />
      <ArchivesPhotosSection />

      <ApprendreChapterSection />
      <ThemeCaravanesSection />
      <OriginesCirqueSection />
      <EpoqueSection />
      <FormationsSection />

      {/* Le carnet des curiosités : des faits vérifiés, un par carte.
          Placé au bout du bloc « Apprendre » parce qu'il appartient à
          ce que le festival transmet, et parce que la bibliothèque
          garde le tout dernier mot de la page (Alex, 2026-08-23). */}
      <SaviezVous lang={lang} />

      <PlongezArchivesSection />
      <EquipeSection />

      {/* Tout au bout de la page : ce qu'il faut lire, un rayon par
          année du festival (Alex, 2026-08-23). Le carnet d'apprentissage
          médiéval prendra la suite. */}
      <Bibliotheque lang={lang} />
    </>
  );
};

export default HistoireApprendrePage;
