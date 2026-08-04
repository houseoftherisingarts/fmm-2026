import React from 'react';
import { Swords, CalendarClock, Shield, UtensilsCrossed, Music, Baby } from 'lucide-react';
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
  { id: 'bestiaire', icon: Swords,          fr: 'Activités', en: 'Activities' },
  { id: 'horaire',   icon: CalendarClock,   fr: 'Horaire',   en: 'Schedule' },
  { id: 'clans',     icon: Shield,          fr: 'Clans',     en: 'Clans' },
  { id: 'banquet',   icon: UtensilsCrossed, fr: 'Banquet',   en: 'Banquet' },
  { id: 'musique',   icon: Music,           fr: 'Musique',   en: 'Music' },
  { id: 'jeunesse',  icon: Baby,            fr: 'Jeunesse',  en: 'Youth' },
];

const ProgrammationPage: React.FC = () => {
  useCaravanPage();
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
        orbImage="/wix/home/fire-night.jpg"
        orbImagePosition="center 35%"
      />

      {/* ── Ancres de chapitre ─────────────────────────────────────── */}
      <nav
        aria-label={fr ? 'Sections de la programmation' : 'Program sections'}
        className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 -mt-2 mb-8 md:mb-10"
      >
        <div className="flex flex-wrap justify-center gap-2.5 md:gap-3">
          {ANCRES.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => aller(a.id)}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-[15px] border backdrop-blur-md font-sans text-[11px] md:text-xs uppercase tracking-[0.18em] transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  borderColor: 'rgba(216, 155, 58, 0.3)',
                  background: 'rgba(10, 4, 6, 0.5)',
                  color: 'rgba(244, 239, 227, 0.85)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(232, 177, 74, 0.7)';
                  e.currentTarget.style.color = 'var(--color-amber-glow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(216, 155, 58, 0.3)';
                  e.currentTarget.style.color = 'rgba(244, 239, 227, 0.85)';
                }}
              >
                <Icon size={13} />
                {fr ? a.fr : a.en}
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
