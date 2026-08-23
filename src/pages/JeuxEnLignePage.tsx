import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Swords, Sparkles } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Stagger, StaggerItem, ScrollProgress } from '../components/scroll';

// ─── Jeux en ligne ──────────────────────────────────────────────────
// Les jeux médiévaux jouables (Hnefatafl + à venir) vivaient dans la
// section Jeunesse de la Programmation; ils ont maintenant leur propre
// onglet au menu principal (demande d'Alex, 2026-08-20).

const JeuxEnLignePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <ScrollProgress />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={lang === 'FR' ? 'Jeux\u00a0en\u00a0ligne' : 'Online\u00a0Games'}
        intro={t.intro}
        orbImage="/photos/hnefatafl-hero.webp"
        orbImagePosition="center 45%"
      />

      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Stagger className="grid md:grid-cols-2 gap-5 md:gap-6" stagger={0.1}>
            <StaggerItem
              as="article"
              className="glass-light rounded-lg-card p-7 md:p-9 flex flex-col"
            >
              <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mb-5">
                <Swords size={24} className="text-brass" />
              </div>
              <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">Hnefatafl</h3>
              <div className="divider-brass w-16 mb-4" />
              <p className="font-editorial text-base text-ivory-soft mb-6 flex-1">{t.hnefataflBody}</p>
              <Link
                to={lang === 'EN' ? '/en/youth/hnefatafl' : '/jeunesse/hnefatafl'}
                className="self-start inline-flex items-center gap-2 px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card"
              >
                {t.hnefataflCta}
                <ArrowUpRight size={14} />
              </Link>
            </StaggerItem>
            <StaggerItem
              as="article"
              className="glass-light rounded-lg-card p-7 md:p-9 flex flex-col"
            >
              <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mb-5">
                <Sparkles size={24} className="text-brass" />
              </div>
              <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">{t.tarotTitle}</h3>
              <div className="divider-brass w-16 mb-4" />
              <p className="font-editorial text-base text-ivory-soft mb-6 flex-1">{t.tarotBody}</p>
              <Link
                to={lang === 'EN' ? '/en/games/tarot' : '/jeux/tarot'}
                className="self-start inline-flex items-center gap-2 px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card"
              >
                {t.tarotCta}
                <ArrowUpRight size={14} />
              </Link>
            </StaggerItem>
          </Stagger>
        </div>
      </section>
    </>
  );
};

const FR = {
  eyebrow: 'La table de jeux',
  title: 'Jeux en ligne',
  intro: 'Les jeux médiévaux du festival, jouables en ligne toute l’année, sur mobile comme au bureau.',
  hnefataflBody: 'Le jeu d’échecs viking, en 3D. Les Raiders encerclent, les Défenseurs protègent le Roi qui doit s’échapper vers un coin. Plateau 11×11, règles complètes, jouable sur mobile et au bureau.',
  hnefataflCta: 'Jouer maintenant',
  jeuxComingSoon: 'Bientôt',
  jeuxMoreTitle: 'D’autres jeux à venir',
  jeuxMoreBody: 'Nous préparons d’autres jeux d’époque pour l’édition 2026. Revenez nous voir : la table se remplit.',
  tarotTitle: 'Tarot de Marseille',
  tarotBody: 'Le jeu que les caravanes portaient de foire en foire. Posez une question, choisissez une lame, trois lames ou la croix celtique, et lisez ce que disent les vieilles images.',
  tarotCta: 'Tirer les lames',
};

const EN = {
  eyebrow: 'The games table',
  title: 'Online Games',
  intro: 'The festival’s medieval games, playable online all year round, on mobile and desktop.',
  hnefataflBody: 'The Viking chess game, in 3D. Raiders surround, Defenders protect the King who must escape to a corner. 11×11 board, full rules, playable on mobile and desktop.',
  hnefataflCta: 'Play now',
  jeuxComingSoon: 'Coming soon',
  jeuxMoreTitle: 'More games on the way',
  jeuxMoreBody: 'We’re preparing more period games for the 2026 edition. Check back: the table is filling up.',
  tarotTitle: 'Marseille Tarot',
  tarotBody: 'The deck the caravans carried from fair to fair. Ask a question, pick one card, three cards or the Celtic cross, and read what the old images say.',
  tarotCta: 'Draw the cards',
};

export default JeuxEnLignePage;
