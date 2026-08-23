import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Lock } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Stagger, StaggerItem, ScrollProgress } from '../components/scroll';

// ─── Jeux en ligne ──────────────────────────────────────────────────
// Une ANNÉE par jeu, comme les années de Gwent (Alex, 2026-08-23). On
// clique sur l'année et on tombe sur son jeu. Les années sans jeu
// restent scellées : elles annoncent la suite sans mentir.

interface Annee {
  id: string;
  chiffre: string;
  nomFR: string;  nomEN: string;
  texteFR: string; texteEN: string;
  jeuFR?: string; jeuEN?: string;
  image: string;
  href?: { fr: string; en: string };
}

const ANNEES: Annee[] = [
  {
    id: 'peste',
    chiffre: 'I',
    nomFR: 'L’année de la Peste', nomEN: 'The Year of the Plague',
    texteFR: 'Les portes closes, les croix à la craie, les corbeaux sur les toits. Le jeu de cette année-là se prépare.',
    texteEN: 'Shut doors, chalk crosses, ravens on the roofs. That year’s game is in the making.',
    image: '/tarot/T13.webp',
  },
  {
    id: 'seigneur',
    chiffre: 'II',
    nomFR: 'L’année du Seigneur', nomEN: 'The Year of the Lord',
    texteFR: 'La dîme, le donjon, la table haute. Le jeu de cette année-là se prépare.',
    texteEN: 'The tithe, the keep, the high table. That year’s game is in the making.',
    image: '/tarot/T4.webp',
  },
  {
    id: 'vikings',
    chiffre: 'III',
    nomFR: 'L’année des Vikings', nomEN: 'The Year of the Vikings',
    texteFR: 'Un roi cerné cherche la sortie, ses assaillants resserrent l’étau. Cinq règlements au choix, contre l’ordinateur ou contre quelqu’un.',
    texteEN: 'A cornered king looks for a way out while his attackers tighten the ring. Five rule sets, against the computer or against someone.',
    jeuFR: 'Hnefatafl', jeuEN: 'Hnefatafl',
    image: '/photos/hnefatafl-card.webp',
    href: { fr: '/jeunesse/hnefatafl', en: '/en/youth/hnefatafl' },
  },
  {
    id: 'caravanes',
    chiffre: 'IV',
    nomFR: 'L’année des Caravanes', nomEN: 'The Year of the Caravans',
    texteFR: 'Le jeu que les roulottes portaient de foire en foire. Une carte, trois cartes ou la croix celtique, et la lecture qui va avec.',
    texteEN: 'The deck the wagons carried from fair to fair. One card, three cards or the Celtic cross, with the reading that goes with it.',
    jeuFR: 'Tarot de Marseille', jeuEN: 'Marseille Tarot',
    image: '/tarot/T17.webp',
    href: { fr: '/jeux/tarot', en: '/en/games/tarot' },
  },
  {
    id: 'poudre',
    chiffre: 'V',
    nomFR: 'L’année de la Poudre', nomEN: 'The Year of the Powder',
    texteFR: 'La mèche, le canon, la fin d’un monde de murailles. Le jeu de cette année-là se prépare.',
    texteEN: 'The fuse, the cannon, the end of a world of walls. That year’s game is in the making.',
    image: '/tarot/T16.webp',
  },
];

const JeuxEnLignePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const t = fr ? FR : EN;

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <ScrollProgress />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={fr ? 'Jeux en ligne' : 'Online Games'}
        intro={t.intro}
        orbImage="/photos/hnefatafl-hero.webp"
        orbImagePosition="center 45%"
      />

      <section className="relative py-14 md:py-20 overflow-hidden">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6" stagger={0.08}>
            {ANNEES.map((a) => {
              const scellee = !a.href;
              const carte = (
                <div
                  className={`fmm-annee-carte relative h-full overflow-hidden rounded-lg-card border transition-transform duration-300 ${
                    scellee ? 'border-brass/15' : 'border-brass/35 hover:-translate-y-1'
                  }`}
                >
                  <div className="relative h-44 md:h-52 overflow-hidden">
                    <img
                      src={a.image}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={scellee ? { filter: 'grayscale(0.9) brightness(0.45)' } : undefined}
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(10,4,6,0.15) 0%, rgba(10,4,6,0.55) 55%, rgba(10,4,6,0.95) 100%)',
                      }}
                    />
                    <span className="absolute top-3 left-4 font-display title-medieval text-3xl md:text-4xl"
                          style={{ color: 'rgba(232,177,74,0.55)' }}>
                      {a.chiffre}
                    </span>
                    {scellee && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-brass/35 bg-black/60 font-sans uppercase tracking-[0.2em] text-[9px] text-ivory-soft/70">
                        <Lock size={10} /> {t.scelle}
                      </span>
                    )}
                  </div>

                  <div className="p-6 md:p-7">
                    <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-2">
                      {fr ? a.nomFR : a.nomEN}
                    </h3>
                    {a.jeuFR && (
                      <p className="font-sans uppercase tracking-[0.24em] text-[10px] mb-3"
                         style={{ color: 'var(--color-amber-glow)' }}>
                        {fr ? a.jeuFR : a.jeuEN}
                      </p>
                    )}
                    <div className="divider-brass w-14 mb-4" />
                    <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed">
                      {fr ? a.texteFR : a.texteEN}
                    </p>
                    {!scellee && (
                      <span className="mt-5 inline-flex items-center gap-2 font-sans uppercase tracking-widest text-xs font-semibold text-brass">
                        {t.jouer} <ArrowUpRight size={14} />
                      </span>
                    )}
                  </div>
                </div>
              );

              return (
                <StaggerItem key={a.id} as="div" className="h-full">
                  {a.href ? (
                    <Link to={fr ? a.href.fr : a.href.en} className="block h-full">{carte}</Link>
                  ) : (
                    <div className="h-full opacity-70 cursor-not-allowed" aria-disabled>{carte}</div>
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>

          <p className="font-editorial italic text-sm md:text-base text-ivory-soft/70 mt-10 max-w-2xl">
            {t.pied}
          </p>
        </div>
      </section>
    </>
  );
};

const FR = {
  title: 'Jeux en ligne',
  eyebrow: 'La table de jeux',
  intro: 'Chaque année du festival a son jeu. Les unes sont ouvertes, les autres attendent encore leur tour de table.',
  scelle: 'Scellée',
  jouer: 'Jouer',
  pied: 'Les années scellées s’ouvriront à mesure que les jeux seront prêts. Une par édition, dans l’ordre du temps.',
};

const EN = {
  title: 'Online games',
  eyebrow: 'The games table',
  intro: 'Every year of the festival has its game. Some are open, others are still waiting their turn at the table.',
  scelle: 'Sealed',
  jouer: 'Play',
  pied: 'Sealed years open as the games become ready. One per edition, in the order of time.',
};

export default JeuxEnLignePage;
