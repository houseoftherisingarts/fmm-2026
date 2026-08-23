import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Lock } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
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
    id: 'poudre',
    chiffre: 'III',
    nomFR: 'L’année de la Poudre', nomEN: 'The Year of the Powder',
    texteFR: 'Cinq dés sous un gobelet, une annonce qui monte, et le premier qui doute retourne les gobelets. Jusqu’à cinq joueurs, contre la maison ou contre du vrai monde.',
    texteEN: 'Five dice under a cup, a bid that climbs, and the first to doubt turns the cups over. Up to five players, against the house or against real people.',
    jeuFR: 'Les dés du menteur', jeuEN: 'Liar’s Dice',
    image: '/tarot/T16.webp',
    href: { fr: '/jeux/des', en: '/en/games/dice' },
  },
  {
    id: 'vikings',
    chiffre: 'IV',
    nomFR: 'L’année des Vikings', nomEN: 'The Year of the Vikings',
    texteFR: 'Un roi cerné cherche la sortie, ses assaillants resserrent l’étau. Cinq règlements au choix, contre l’ordinateur ou contre quelqu’un.',
    texteEN: 'A cornered king looks for a way out while his attackers tighten the ring. Five rule sets, against the computer or against someone.',
    jeuFR: 'Hnefatafl', jeuEN: 'Hnefatafl',
    image: '/photos/hnefatafl-card.webp',
    href: { fr: '/jeunesse/hnefatafl', en: '/en/youth/hnefatafl' },
  },
  {
    id: 'caravanes',
    chiffre: 'V',
    nomFR: 'L’année des Caravanes', nomEN: 'The Year of the Caravans',
    texteFR: 'Le jeu que les roulottes portaient de foire en foire. Une carte, trois cartes ou la croix celtique, et la lecture qui va avec.',
    texteEN: 'The deck the wagons carried from fair to fair. One card, three cards or the Celtic cross, with the reading that goes with it.',
    jeuFR: 'Tarot de Marseille', jeuEN: 'Marseille Tarot',
    image: '/tarot/T17.webp',
    href: { fr: '/jeux/tarot', en: '/en/games/tarot' },
  },
  {
    id: 'mystere',
    chiffre: 'VI',
    nomFR: 'L’année du ?', nomEN: 'The Year of the ?',
    texteFR: 'Jeu disponible lorsque nous annoncerons le thème.',
    texteEN: 'The game opens when we announce the theme.',
    image: '/tarot/TT.webp',
  },
];

const JeuxEnLignePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const { user, openSignIn } = useAuth();
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
        <div className="relative z-10 max-w-screen-2xl mx-auto px-4 md:px-8">
          {/* Le rail des années : une console de jeu, comme le menu de
              Gwent (référence donnée par Alex, 2026-08-23). Les tuiles
              défilent à l'horizontale, la vignette se voit en entier. */}
          <div className="fmm-console rounded-lg-card overflow-hidden">
            {/* Barre haute de la console : le nom de la table et le
                décompte, comme la barre de Gwent. */}
            <div className="flex items-center justify-between gap-4 px-5 md:px-7 py-3.5 border-b border-brass/20"
                 style={{ background: 'linear-gradient(180deg, rgba(232,177,74,0.07), rgba(10,4,6,0))' }}>
              <span className="inline-flex items-center gap-3 font-display title-medieval uppercase tracking-[0.32em] text-[11px] md:text-xs"
                    style={{ color: 'var(--color-amber-glow)' }}>
                <span aria-hidden className="w-1.5 h-1.5 rotate-45 bg-brass" />
                {fr ? 'La table de jeux' : 'The games table'}
              </span>
              <span className="font-sans uppercase tracking-[0.24em] text-[10px] text-ivory-soft/55">
                {ANNEES.filter((a) => a.href).length} / {ANNEES.length} {fr ? 'ouvertes' : 'open'}
              </span>
            </div>
            <div className="p-4 md:p-7">
          <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5" stagger={0.08}>
            {ANNEES.map((a) => {
              const scellee = !a.href;
              const carte = (
                <div
                  className={`fmm-annee-carte relative h-full overflow-hidden rounded-lg-card border transition-transform duration-300 ${
                    scellee ? 'border-brass/15' : 'border-brass/35 hover:-translate-y-1'
                  }`}
                >
                  <div className="relative h-56 md:h-64 overflow-hidden" style={{ background: 'rgba(8,3,5,0.85)' }}>
                    <img
                      src={a.image}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-contain"
                      style={scellee ? { filter: 'grayscale(0.85) brightness(0.5)' } : undefined}
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
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brass/35 bg-black/70 font-sans uppercase tracking-[0.18em] text-[9px] text-ivory-soft/75 whitespace-nowrap">
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
                        {user ? t.jouer : t.connecter} <ArrowUpRight size={14} />
                      </span>
                    )}
                  </div>
                </div>
              );

              return (
                <StaggerItem key={a.id} as="div" className="h-full">
                  {a.href ? (
                    user ? (
                      <Link to={fr ? a.href.fr : a.href.en} className="block h-full">{carte}</Link>
                    ) : (
                      // Jouer demande un compte du festival : c'est ce
                      // compte qui porte les défis et les parties en
                      // ligne (Alex, 2026-08-23).
                      <button type="button" onClick={openSignIn} className="block h-full w-full text-left">
                        {carte}
                      </button>
                    )
                  ) : (
                    <div className="h-full opacity-70 cursor-not-allowed" aria-disabled>{carte}</div>
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>
            </div>
            {/* Pied de console : la ligne d'aide, comme sur la manette. */}
            <div className="px-5 md:px-7 py-3 border-t border-brass/20 bg-black/30 flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="font-sans uppercase tracking-[0.24em] text-[9px] text-ivory-soft/60">
                <span className="text-brass">◇</span> {fr ? 'Choisir une année' : 'Pick a year'}
              </span>
              <span className="font-sans uppercase tracking-[0.24em] text-[9px] text-ivory-soft/40">
                <span className="text-brass/60">◇</span> {fr ? 'Les années scellées s’ouvrent une par édition' : 'Sealed years open one per edition'}
              </span>
            </div>
          </div>

          <p className="font-editorial italic text-sm md:text-base text-ivory-soft/70 mt-8 max-w-2xl">
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
  scelle: 'À venir',
  jouer: 'Jouer',
  connecter: 'Connectez-vous pour jouer',
  pied: 'Les années scellées s’ouvriront à mesure que les jeux seront prêts. Une par édition, dans l’ordre du temps. Les parties se jouent avec un compte du festival : c’est lui qui porte vos défis et vos parties en ligne.',
};

const EN = {
  title: 'Online games',
  eyebrow: 'The games table',
  intro: 'Every year of the festival has its game. Some are open, others are still waiting their turn at the table.',
  scelle: 'Coming',
  jouer: 'Play',
  connecter: 'Sign in to play',
  pied: 'Sealed years open as the games become ready. One per edition, in the order of time. Games are played with a festival account: it carries your challenges and your online games.',
};

export default JeuxEnLignePage;
