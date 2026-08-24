import React from 'react';
import { IconSwords, IconScroll, IconGoblet, IconLyre, IconHobbyHorse } from '../components/icons/Medieval';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { useBadgeAuBout } from '../contexts/BadgesContext';
import ActivitesPage from './ActivitesPage';
import MusiquePage from './MusiquePage';
import JeunessePage from './JeunessePage';

// ─── Programmation (édition 2026) ───────────────────────────────────
// Merged pillar: Activités + Musique + Jeunesse & Jeux. One unified hero +
// one scroll-progress, then each source page renders embedded (compact chapter
// divider instead of its own full-screen PageHeader, no duplicate SEO).
//
// La page est une fusion de trois pages, donc très longue : la rangée
// d'ancres sous l'en-tête permet de sauter à chaque chapitre au lieu de
// tout défiler (demande d'Alex, 2026-08-04). Les cibles vivent dans les
// pages embarquées (id posés sur leurs sections) et ici même (#jeunesse).

const ANCRES: Array<{
  id: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  fr: string;
  en: string;
}> = [
  { id: 'bestiaire', icon: IconSwords,      fr: 'Activités', en: 'Activities' },
  { id: 'horaire',   icon: IconScroll,      fr: 'Horaire',   en: 'Schedule' },
  { id: 'banquet',   icon: IconGoblet,      fr: 'Banquet',   en: 'Banquet' },
  { id: 'musique',   icon: IconLyre,        fr: 'Musique',   en: 'Music' },
  { id: 'jeunesse',  icon: IconHobbyHorse,  fr: 'Jeunesse',  en: 'Youth' },
];

const ProgrammationPage: React.FC = () => {
  useCaravanPage();
  useBadgeAuBout('programme');
  const { lang } = useUI();
  const fr = lang === 'FR';

  const aller = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
        orbImage="/wix/home/danse-jupe-mauve-v2.webp"
        orbImagePosition="44% 42%"
      />

      {/* ── Ancres de chapitre ─────────────────────────────────────── */}
      <nav
        aria-label={fr ? 'Sections de la programmation' : 'Program sections'}
        className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 -mt-2 mb-8 md:mb-10"
      >
        {/* Ces boutons se lisaient comme du texte posé sur un filet : on
            ne voyait pas qu'ils cliquaient (Alex, 2026-08-22). Plaque de
            laiton pleine, arête franche, glyphe médiéval dans son propre
            cartouche, ombre portée. Ça se voit et ça s'appuie. */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {ANCRES.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => aller(a.id)}
                className="prog-anchor group inline-flex items-center gap-3 pl-3 pr-5 py-3 min-h-[52px] font-sans text-[11px] md:text-xs uppercase tracking-[0.2em] font-semibold"
              >
                <span aria-hidden className="prog-anchor-glyph">
                  <Icon size={17} />
                </span>
                <span>{fr ? a.fr : a.en}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <ActivitesPage embedded />
      <MusiquePage embedded />
      <div id="jeunesse">
        <JeunessePage embedded />
      </div>
    </>
  );
};

export default ProgrammationPage;
