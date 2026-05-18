import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Ticket, Sparkles, Crown, Flame,
  Hammer, Music2, UtensilsCrossed, Tent, Trees, Sword, ChevronDown,
} from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { SITE, PILLARS } from '../content';
import { useCountdown } from '../lib/useCountdown';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import { FullScreenScrollFX, type FxSection } from '../components/welcome/FullScreenScrollFX';

// ─── WelcomePage ────────────────────────────────────────────────────
// Standalone entry page at `/`, two-column award-style layout adapted
// from the user-supplied reference. Background is our cinematic Viking
// helmet image with a vertical gradient mask. Left column carries the
// brand pitch + CTAs; right column stacks the countdown card + a
// scrolling marquee of festival activities.

const WelcomePage: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const cd = useCountdown(`${SITE.dates.start}T10:00:00-04:00`);
  const ticketUrl = import.meta.env.VITE_ZEFFY_TICKET_URL || '#';

  // Days-until vs days-from-launch progress bar — shows festival's
  // approach. Anchor is "today" minus 365 (one year out) → 0%, festival
  // start → 100%.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const start = new Date(SITE.dates.start).getTime();
    const oneYear = 365 * 86400000;
    const elapsed = Math.max(0, Math.min(oneYear, oneYear - (start - Date.now())));
    setProgress(Math.round((elapsed / oneYear) * 100));
  }, []);

  return (
    <>
      <SEO title={t.title} />

      {/* SCOPED ANIMATIONS — fade-in stagger + horizontal marquee. */}
      <style>{`
        @keyframes fmm-fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fmm-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .fmm-fade { animation: fmm-fade-in 0.8s ease-out forwards; opacity: 0; }
        .fmm-d100 { animation-delay: 0.10s; }
        .fmm-d200 { animation-delay: 0.20s; }
        .fmm-d300 { animation-delay: 0.30s; }
        .fmm-d400 { animation-delay: 0.40s; }
        .fmm-d500 { animation-delay: 0.50s; }
        .fmm-marquee { animation: fmm-marquee 45s linear infinite; }
      `}</style>

      <main className="relative w-full bg-midnight-deep text-ivory overflow-hidden font-sans isolate">

        {/* Brand mark — top-left, replaces the global NavBar logo */}
        <Link to={addLocale('/accueil', lang)} className="absolute top-6 left-6 md:top-8 md:left-8 z-30 flex items-center gap-3 group" aria-label="FMM Accueil">
          <img decoding="async" src={SITE.logoWhite} alt="FMM" className="h-10 md:h-12 w-auto transition-opacity group-hover:opacity-80" />
          <span className="hidden sm:inline-flex flex-col leading-tight">
            <span className="font-display title-medieval text-sm md:text-base text-ivory">FMM <span className="text-brass">{SITE.year}</span></span>
            <span className="font-editorial italic text-[10px] md:text-xs text-ivory-soft tracking-wide">{SITE.edition2026}</span>
          </span>
        </Link>

        {/* ── Background — cinematic viking helmet with gradient mask ── */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-55"
          style={{
            backgroundImage: 'url(/welcome/hero-bg.jpg)',
            maskImage:        'linear-gradient(180deg, transparent 0%, black 12%, black 78%, transparent 100%)',
            WebkitMaskImage:  'linear-gradient(180deg, transparent 0%, black 12%, black 78%, transparent 100%)',
          }}
        />
        {/* Brass / oxblood atmospheric tint */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-midnight-deep/60 via-transparent to-midnight-deep" />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_120%_60%_at_50%_0%,rgba(176,141,58,0.16),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 md:pt-32 md:pb-24 lg:px-8 min-h-[100svh] flex items-center">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10 items-start w-full">

            {/* ── LEFT COLUMN — pitch + CTAs ── */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-8 pt-6">

              {/* Edition badge */}
              <div className="fmm-fade fmm-d100">
                <div className="inline-flex items-center gap-2 rounded-full border border-brass/30 bg-brass/10 px-3 py-1.5 backdrop-blur-md transition-colors hover:bg-brass/15">
                  <Sparkles className="w-3.5 h-3.5 text-brass" />
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-brass">
                    {t.badge}
                  </span>
                </div>
              </div>

              {/* Headline — capped at 2 lines, font sized so each phrase fits on one line */}
              <h1 className="fmm-fade fmm-d200 font-display title-medieval text-4xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-tight leading-[0.95]">
                <span className="block whitespace-nowrap">{t.h1Line1}</span>
                <span className="block whitespace-nowrap bg-gradient-to-br from-ivory via-ivory to-brass bg-clip-text text-transparent">
                  {t.h1Line2}
                </span>
              </h1>

              {/* Dates pill */}
              <p className="fmm-fade fmm-d300 font-display title-medieval text-base md:text-lg text-brass tracking-[0.25em]">
                {t.dates}
              </p>

              {/* Description */}
              <p className="fmm-fade fmm-d300 max-w-xl font-editorial text-lg md:text-xl text-ivory-soft leading-relaxed">
                {t.subtitle}
              </p>

              {/* Primary CTAs — Tickets + Enter the festival */}
              <div className="fmm-fade fmm-d400 flex flex-col sm:flex-row gap-3">
                <a
                  href={ticketUrl} target="_blank" rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-brass px-7 py-3.5 text-sm font-semibold text-midnight-deep transition-all hover:scale-[1.02] hover:bg-brass-soft active:scale-[0.98] uppercase tracking-wider"
                >
                  <Ticket className="w-4 h-4" /> {t.primaryCta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </a>
                <Link
                  to={addLocale('/accueil', lang)}
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-ivory-soft/20 bg-ivory-soft/5 px-7 py-3.5 text-sm font-semibold text-ivory backdrop-blur-sm transition-colors hover:bg-ivory-soft/10 hover:border-brass/40 hover:text-brass uppercase tracking-wider"
                >
                  {t.secondaryCta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Tertiary CTAs — Exposer comme artisan + Joindre l'équipe */}
              <div className="fmm-fade fmm-d500 flex flex-col sm:flex-row gap-3 -mt-3">
                <Link
                  to={addLocale('/marche/inscription', lang)}
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-brass/40 bg-brass/5 px-6 py-2.5 text-xs font-semibold text-brass hover:bg-brass/15 hover:border-brass transition uppercase tracking-wider"
                >
                  <Hammer className="w-3.5 h-3.5" /> {t.exhibitCta}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to={addLocale('/benevole', lang)}
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-brass/40 bg-brass/5 px-6 py-2.5 text-xs font-semibold text-brass hover:bg-brass/15 hover:border-brass transition uppercase tracking-wider"
                >
                  <Crown className="w-3.5 h-3.5" /> {t.joinTeamCta}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* ── RIGHT COLUMN — countdown card + activities marquee ── */}
            <div className="lg:col-span-5 space-y-5 lg:mt-12">

              {/* Countdown / festival card */}
              <div className="fmm-fade fmm-d500 relative overflow-hidden rounded-3xl border border-ivory-soft/15 bg-midnight-deep/55 p-7 md:p-8 backdrop-blur-xl shadow-2xl">
                {/* Card glow */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-brass/10 blur-3xl pointer-events-none" />

                <div className="relative z-10">
                  {/* Header — icon + headline countdown */}
                  <div className="flex items-center gap-4 mb-7">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brass/15 ring-1 ring-brass/40">
                      <Flame className="h-6 w-6 text-brass" />
                    </div>
                    <div>
                      <div className="font-display title-medieval text-3xl text-ivory tracking-tight tabular-nums">
                        {cd.isPast ? t.past : `${cd.days}j ${String(cd.hours).padStart(2,'0')}h`}
                      </div>
                      <div className="font-editorial italic text-sm text-ivory-soft">{t.untilGates}</div>
                    </div>
                  </div>

                  {/* Live countdown — 4 tiles */}
                  {!cd.isPast && (
                    <div className="grid grid-cols-4 gap-2 mb-7">
                      {[
                        { label: t.cdDays,    value: cd.days },
                        { label: t.cdHours,   value: cd.hours },
                        { label: t.cdMinutes, value: cd.minutes },
                        { label: t.cdSeconds, value: cd.seconds },
                      ].map((b) => (
                        <div key={b.label} className="text-center rounded-xl bg-ivory-soft/5 border border-ivory-soft/10 py-2.5">
                          <div className="font-display title-medieval text-xl md:text-2xl text-brass tabular-nums leading-none">
                            {String(b.value).padStart(2, '0')}
                          </div>
                          <div className="font-sans text-[9px] uppercase tracking-widest text-ivory-soft mt-1.5">{b.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Approach progress bar */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="font-editorial italic text-ivory-soft">{t.approachLabel}</span>
                      <span className="text-ivory font-medium tabular-nums">{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-ivory-soft/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-brass to-brass-soft transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="h-px w-full bg-ivory-soft/10 mb-5" />

                  {/* Mini stats grid */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Stat value="5e" label={t.statEdition} />
                    <div className="w-px h-full bg-ivory-soft/10 mx-auto" />
                    <Stat value="30+" label={t.statActivities} />
                    <div className="w-px h-full bg-ivory-soft/10 mx-auto" />
                    <Stat value="50+" label={t.statArtisans} />
                  </div>

                  {/* Tag pills */}
                  <div className="mt-7 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold tracking-wide text-emerald-300 uppercase">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                      </span>
                      {t.tagOpen}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/40 bg-brass/10 px-3 py-1 text-[10px] font-semibold tracking-wide text-brass uppercase">
                      <Crown className="w-3 h-3" />
                      {t.tagBanquet}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activities marquee — restored to right column under countdown */}
              <div className="fmm-fade fmm-d500 relative overflow-hidden rounded-3xl border border-ivory-soft/15 bg-midnight-deep/55 py-7 backdrop-blur-xl">
                <h3 className="mb-5 px-7 text-sm font-editorial italic text-ivory-soft">{t.marqueeTitle}</h3>
                <div
                  className="relative flex overflow-hidden"
                  style={{
                    maskImage:       'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
                  }}
                >
                  <div className="fmm-marquee flex gap-10 whitespace-nowrap px-4 shrink-0">
                    {[...ACTIVITIES, ...ACTIVITIES, ...ACTIVITIES].map((a, i) => (
                      <div key={i} className="flex items-center gap-2.5 opacity-70 transition-all hover:opacity-100 hover:scale-105 cursor-default">
                        <a.icon className="h-5 w-5 text-brass shrink-0" />
                        <span className="font-display title-medieval text-base text-ivory tracking-wide">
                          {a.label[lang]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Scroll hint to the GSAP showcase below */}
        <a href="#showcase" className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-ivory-soft hover:text-brass transition group">
          <span className="font-editorial italic text-[10px] uppercase tracking-[0.3em]">{t.scrollHint}</span>
          <ChevronDown size={20} className="text-brass group-hover:translate-y-0.5 transition-transform" />
        </a>
      </main>

      {/* ── Pillar showcase — GSAP scroll-pinned five-act sequence ── */}
      <div id="showcase">
        <FullScreenScrollFX
          sections={getShowcaseSections(lang, addLocale)}
          fontFamily={'"Inter", system-ui, sans-serif'}
          displayFontFamily={'"Cinzel", "Times New Roman", serif'}
          bodyFontFamily={'"Cormorant Garamond", Georgia, serif'}
          colors={{
            text:        'rgba(244, 239, 227, 0.95)',
            textSoft:    'rgba(244, 239, 227, 0.7)',
            accent:      '#B08D3A',
            accentSoft:  '#C9A85A',
            pageBg:      '#0E1F33',
            stageBg:     '#081424',
            overlay:     'rgba(8, 20, 36, 0.35)',
          }}
          header={t.showcaseHeader}
          footer={t.showcaseFooter}
          showProgress
          bgTransition="fade"
        />
      </div>
    </>
  );
};

// ─── Showcase section data — all 13 festival sections ──────────────
// Order is curated to flow narratively: program first, then cuisine,
// music, market — through to weddings and groups at the end.
type ShowcaseKey =
  | 'activites' | 'musique' | 'nourriture' | 'marche' | 'apprendre'
  | 'chevaux' | 'jeunesse' | 'hebergement' | 'benevole' | 'histoire'
  | 'partenaires' | 'mariages' | 'groupes';

interface ShowcaseItem {
  key: ShowcaseKey;
  image: string;
  slug: string;
  titleFR: string; titleEN: string;
  bodyFR: string;  bodyEN: string;
  ctaFR: string;   ctaEN: string;
  leftFR: string;  leftEN: string;
  rightFR: string; rightEN: string;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    key: 'activites', slug: '/activites', image: '/wix/home/viking-band.jpg',
    titleFR: 'Activités', titleEN: 'Activities',
    bodyFR: 'Trois jours de tournois, démonstrations, ateliers, contes et spectacles. L’horaire complet vous attend.',
    bodyEN: 'Three days of tournaments, demos, workshops, storytelling and shows. The full schedule awaits.',
    ctaFR: 'Voir l’horaire', ctaEN: 'See the schedule',
    leftFR: '01 · Programmation', leftEN: '01 · Programming',
    rightFR: '30+ activités',    rightEN: '30+ activities',
  },
  {
    key: 'musique', slug: '/musique', image: '/wix/home/stage-photo.jpg',
    titleFR: 'Musique', titleEN: 'Music',
    bodyFR: 'L’Harfang, Skarazula, Mystic Projekt, Arrünn, Trifolys, Canteraine. La musique est l’âme de l’art.',
    bodyEN: 'L’Harfang, Skarazula, Mystic Projekt, Arrünn, Trifolys, Canteraine. Music is the soul of art.',
    ctaFR: 'Voir le line-up', ctaEN: 'See the lineup',
    leftFR: '02 · Sur scène',  leftEN: '02 · On stage',
    rightFR: '6 troupes',      rightEN: '6 troupes',
  },
  {
    key: 'nourriture', slug: '/nourriture', image: '/wix/home/bonfire-warm.jpg',
    titleFR: 'Banquet', titleEN: 'Banquet',
    bodyFR: 'Cinq tentes du village gustatif et le Banquet de l’Équinoxe — 5 services, 50 places, dimanche à 13h.',
    bodyEN: 'Five tents in the food village and the Equinox Banquet — 5 courses, 50 seats, Sunday 1 PM.',
    ctaFR: 'Voir le menu', ctaEN: 'See the menu',
    leftFR: '03 · À la table',       leftEN: '03 · At the table',
    rightFR: '5 tentes · 1 banquet', rightEN: '5 tents · 1 banquet',
  },
  {
    key: 'marche', slug: '/marche', image: '/wix/marche/04065e6d.jpg',
    titleFR: 'Marché', titleEN: 'Market',
    bodyFR: 'Artisans d’Azure, forgerons, tisserandes, costumiers, marchands d’époque. Trois jours de découverte.',
    bodyEN: 'Azure artisans, blacksmiths, weavers, costumers, period merchants. Three days of discovery.',
    ctaFR: 'Découvrir le marché', ctaEN: 'Discover the market',
    leftFR: '04 · Marché médiéval', leftEN: '04 · Medieval market',
    rightFR: '15+ exposants',       rightEN: '15+ vendors',
  },
  {
    key: 'apprendre', slug: '/apprendre', image: '/wix/home/scene-cinematic.jpg',
    titleFR: 'Apprendre', titleEN: 'Learn',
    bodyFR: 'Forge, tissage, cotte de mailles, cuisine historique, charpente, sculpture, joaillerie, fonderie. Le savoir ancestral en action.',
    bodyEN: 'Forge, weaving, chainmail, historical cooking, carpentry, sculpture, jewellery, foundry. Ancestral knowledge in action.',
    ctaFR: 'Voir les ateliers',      ctaEN: 'See the workshops',
    leftFR: '05 · Savoirs ancestraux', leftEN: '05 · Ancestral knowledge',
    rightFR: '8 démonstrations',     rightEN: '8 demonstrations',
  },
  {
    key: 'chevaux', slug: '/chevaux', image: '/wix/chevaux/845ff568.jpg',
    titleFR: 'Chevaux', titleEN: 'Horses',
    bodyFR: 'La clinique équestre de l’AMQ — joutes, jeux d’adresse, démonstrations. Sept places pour cavaliers et cavalières.',
    bodyEN: 'The AMQ equestrian clinic — jousting, skill games, demonstrations. Seven seats for riders.',
    ctaFR: 'S’inscrire',             ctaEN: 'Sign up',
    leftFR: '06 · Clinique équestre', leftEN: '06 · Equestrian clinic',
    rightFR: '7 places · samedi',    rightEN: '7 seats · Saturday',
  },
  {
    key: 'jeunesse', slug: '/jeunesse', image: '/wix/jeunesse/2b1f82d0.jpg',
    titleFR: 'Jeunesse', titleEN: 'Youth',
    bodyFR: 'Un parc, des quêtes, des ateliers et le Clan Renard. Un espace dédié aux cœurs d’enfants encore dans des corps d’enfants.',
    bodyEN: 'A park, quests, workshops and the Fox Clan. A dedicated space for young hearts still in young bodies.',
    ctaFR: 'Voir le village',         ctaEN: 'See the village',
    leftFR: '07 · Village jeunesse', leftEN: '07 · Youth village',
    rightFR: 'Familles & enfants',    rightEN: 'Families & kids',
  },
  {
    key: 'hebergement', slug: '/hebergement', image: '/wix/hebergement/e1d1583b.jpg',
    titleFR: 'Hébergement', titleEN: 'Lodging',
    bodyFR: 'Camping médiéval sur place, plus le Salon des Inconnus, Camping Montpellier et nos autres partenaires de la Petite-Nation.',
    bodyEN: 'Medieval camping on site, plus Le Salon des Inconnus, Camping Montpellier and our partners across Petite-Nation.',
    ctaFR: 'Trouver un toit',         ctaEN: 'Find a roof',
    leftFR: '08 · Camping & auberges', leftEN: '08 · Camping & inns',
    rightFR: 'Sur place et alentours', rightEN: 'On-site and nearby',
  },
  {
    key: 'benevole', slug: '/benevole', image: '/wix/home/shields-blue.jpg',
    titleFR: 'Bénévole', titleEN: 'Volunteer',
    bodyFR: 'Le FMM est opéré par une équipe de bénévoles. Joignez-vous au cœur du festival — montage, accueil, animation, démontage.',
    bodyEN: 'FMM runs on volunteer power. Join the heart of the festival — setup, welcome, programming, teardown.',
    ctaFR: 'Joindre l’équipe',        ctaEN: 'Join the team',
    leftFR: '09 · Joindre l’équipe',  leftEN: '09 · Join the team',
    rightFR: 'Tous profils bienvenus', rightEN: 'All profiles welcome',
  },
  {
    key: 'histoire', slug: '/histoire', image: '/wix/histoire/722a8ce4.jpg',
    titleFR: 'Histoire', titleEN: 'Story',
    bodyFR: 'Cinq éditions, des milliers de visiteurs, des centaines de photos. Notre histoire et l’équipe qui la porte.',
    bodyEN: 'Five editions, thousands of visitors, hundreds of photos. Our story and the team behind it.',
    ctaFR: 'Plonger dans les archives', ctaEN: 'Step into the archives',
    leftFR: '10 · 5 ans d’histoire',    leftEN: '10 · 5 years of history',
    rightFR: '95 photos · 10 membres',  rightEN: '95 photos · 10 members',
  },
  {
    key: 'partenaires', slug: '/partenaires', image: '/wix/home/marchand.jpg',
    titleFR: 'Partenaires', titleEN: 'Partners',
    bodyFR: 'Sans nos partenaires publics, privés et communautaires, le FMM ne serait qu’un rêve. Voici ceux qui le rendent possible.',
    bodyEN: 'Without our public, private and community partners, FMM would be only a dream. Meet the ones who make it real.',
    ctaFR: 'Voir nos partenaires',  ctaEN: 'See our partners',
    leftFR: '11 · Avec nous',       leftEN: '11 · With us',
    rightFR: 'Public · privé · com.', rightEN: 'Public · private · com.',
  },
  {
    key: 'mariages', slug: '/mariages', image: '/wix/mariages/70dcaeae.jpg',
    titleFR: 'Mariages', titleEN: 'Weddings',
    bodyFR: 'Médiéval, païen, viking, celte ou laïc — célébrez votre union au cœur du festival. Demande pour 2026 ouverte.',
    bodyEN: 'Medieval, pagan, viking, Celtic or secular — celebrate your union at the heart of the festival. 2026 inquiries open.',
    ctaFR: 'Faire une demande',      ctaEN: 'Make an inquiry',
    leftFR: '12 · Cérémonie d’époque', leftEN: '12 · Period ceremony',
    rightFR: 'Sur réservation',      rightEN: 'By reservation',
  },
  {
    key: 'groupes', slug: '/groupes', image: '/wix/home/marchand.jpg',
    titleFR: 'Groupes', titleEN: 'Groups',
    bodyFR: 'Tarifs et accompagnement sur mesure pour les groupes scolaires, communautaires et corporatifs.',
    bodyEN: 'Tailored pricing and support for school, community and corporate groups.',
    ctaFR: 'Demander un devis',     ctaEN: 'Request a quote',
    leftFR: '13 · Sortie de groupe', leftEN: '13 · Group outing',
    rightFR: 'Scolaire · com. · corpo.', rightEN: 'School · com. · corp.',
  },
];

function getShowcaseSections(
  lang: 'FR' | 'EN',
  addLocaleFn: (path: string, lang: 'FR' | 'EN') => string,
): FxSection[] {
  return SHOWCASE_ITEMS.map((it) => ({
    id: it.key,
    background: it.image,
    title: lang === 'FR' ? it.titleFR : it.titleEN,
    leftLabel:  lang === 'FR' ? it.leftFR  : it.leftEN,
    rightLabel: lang === 'FR' ? it.rightFR : it.rightEN,
    body: (
      <>
        <p>{lang === 'FR' ? it.bodyFR : it.bodyEN}</p>
        <Link to={addLocaleFn(it.slug, lang)} className="fx-featured-cta">
          {lang === 'FR' ? it.ctaFR : it.ctaEN}
          <ArrowRight size={14} />
        </Link>
      </>
    ),
  }));
}

// ── Reusable mini-stat ──
const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center justify-center transition-transform hover:-translate-y-0.5 cursor-default">
    <span className="font-display title-medieval text-xl text-ivory tabular-nums">{value}</span>
    <span className="text-[10px] uppercase tracking-wider text-ivory-soft/70 font-medium font-sans mt-1">{label}</span>
  </div>
);

// ── Activities for the scrolling marquee — drawn from the FMM pillars ──
const ACTIVITIES = [
  { icon: UtensilsCrossed, label: { FR: 'Banquet de l’Équinoxe', EN: 'Equinox Banquet' } },
  { icon: Music2,          label: { FR: 'Musique Nordique',       EN: 'Nordic Music' } },
  { icon: Sword,           label: { FR: 'Joutes & Combats',       EN: 'Jousts & Combat' } },
  { icon: Hammer,          label: { FR: 'Forge & Artisans',       EN: 'Forge & Artisans' } },
  { icon: Flame,           label: { FR: 'Cérémonies de Feu',      EN: 'Fire Ceremonies' } },
  { icon: Tent,            label: { FR: 'Marché Médiéval',        EN: 'Medieval Market' } },
  { icon: Trees,           label: { FR: 'Camp Viking',            EN: 'Viking Camp' } },
  { icon: Sparkles,        label: { FR: 'Tarot & Divination',     EN: 'Tarot & Divination' } },
];

// Pull pillar count from PILLARS — informs scaling labels but keeps
// the value strings hand-curated so they read well typographically.
void PILLARS;

const FR = {
  title: 'FMM 2026 — Caravanes & Saltimbanques',
  badge: 'Édition 2026 · Caravanes & Saltimbanques',
  h1Line1: 'Trois jours',
  h1Line2: 'hors du temps',
  h1Line3: '',
  dates: '25 — 26 — 27 SEPTEMBRE 2026 · MONTPELLIER, QC',
  subtitle: 'Caravanes nomades, vikings, chevaliers, zone jeunesse, village nourriture, tarot, tambours et troupes nordiques. Une cinquième édition tissée de feu et de mystère, au cœur du Québec.',
  primaryCta: 'Acheter mes billets',
  secondaryCta: 'Entrer dans le festival',
  exhibitCta: 'Exposer comme artisan',
  joinTeamCta: 'Joindre l’équipe',
  past: 'Festival lancé',
  untilGates: 'avant l’ouverture des portes',
  approachLabel: 'Approche du festival',
  cdDays: 'Jours', cdHours: 'Heures', cdMinutes: 'Min', cdSeconds: 'Sec',
  statEdition:    'Édition',
  statActivities: 'Activités',
  statArtisans:   'Artisans',
  tagOpen:    'Billetterie ouverte',
  tagBanquet: 'Banquet 50 places',
  marqueeTitle: 'Au programme cette année',
  scrollHint: 'Faites défiler',
  showcaseHeader: 'EXPLOREZ LE FESTIVAL',
  showcaseFooter: 'FMM 2026',
};

const EN = {
  title: 'FMM 2026 — Caravans & Players',
  badge: '2026 Edition · Caravans & Players',
  h1Line1: 'Three days',
  h1Line2: 'out of time',
  h1Line3: '',
  dates: 'SEPTEMBER 25 — 26 — 27, 2026 · MONTPELLIER, QC',
  subtitle: 'Nomadic caravans, vikings, knights, youth village, food village, tarot, drums and Nordic troupes. A fifth edition woven of fire and mystery, in the heart of Quebec.',
  primaryCta: 'Get my tickets',
  secondaryCta: 'Enter the festival',
  exhibitCta: 'Exhibit as a vendor',
  joinTeamCta: 'Join the team',
  past: 'Festival opened',
  untilGates: 'until the gates open',
  approachLabel: 'Festival approach',
  cdDays: 'Days', cdHours: 'Hours', cdMinutes: 'Min', cdSeconds: 'Sec',
  statEdition:    'Edition',
  statActivities: 'Activities',
  statArtisans:   'Artisans',
  tagOpen:    'Tickets on sale',
  tagBanquet: '50-seat Banquet',
  marqueeTitle: 'On the program this year',
  scrollHint: 'Scroll',
  showcaseHeader: 'EXPLORE THE FESTIVAL',
  showcaseFooter: 'FMM 2026',
};

export default WelcomePage;
