import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { watchSchedule, CURRENT_SCHEDULE_YEAR, type ScheduleDay } from '../firebase/schedule';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import { useSfx, useHoverSfx } from '../components/marche/effects';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import BehourdRegistrationForm from '../components/activites/BehourdRegistrationForm';
import {
  Eyebrow,
  DisplayTitle,
  HexPanel,
  HexMark,
  ChevronButton,
  GildedFrame,
  SectionTopRail,
  SectionBottomRail,
  EnergyPulse,
} from '../components/marche/atmospherics';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ── Schedule data (cloned from Wix /activités). 2025 schedule — dates
// updated to 2026 (Sept 25-26-27); event details kept as-is. Mark for
// review once 2026 line-up is locked.  TODO_VERIFY_2026
const SCHEDULE = [
  {
    dateFR: 'Vendredi 25 septembre',
    dateEN: 'Friday September 25',
    items: [
      { time: '17h00', label: 'Ouverture des portes',                                 where: 'Site' },
      { time: '17h00', label: 'Ouverture de la Boustifaille — Village Bouffe',        where: 'Village gustatif' },
      { time: '18h00', label: 'Spectacle d’Arrünn',                                    where: 'Scène' },
      { time: '19h00', label: 'Danse des Völvas',                                      where: 'Autour du feu' },
      { time: '19h15', label: 'Spectacle de Trifolys',                                 where: 'Scène' },
    ],
  },
  {
    dateFR: 'Samedi 26 septembre',
    dateEN: 'Saturday September 26',
    items: [
      { time: '10h00',       label: 'Ouverture des portes',                            where: 'Site' },
      { time: '11h00–11h30', label: 'Démonstration de tissage',                        where: 'Village paysan' },
      { time: '11h15–12h15', label: 'Clinique équestre',                               where: 'Arène' },
      { time: '11h30–12h00', label: 'Démonstration cotte de mailles',                  where: 'Village paysan' },
      { time: '12h00–12h30', label: 'Démonstration d’équarrissage',                    where: 'Village paysan' },
      { time: '12h30–13h00', label: 'Démonstration de coulage du bronze',              where: 'Village paysan' },
      { time: '13h00–14h00', label: 'Combat viking',                                   where: 'Arène' },
      { time: '14h00–14h30', label: 'Démonstration de forge',                          where: 'Village paysan' },
      { time: '14h45–15h00', label: 'Démonstration de gravure sur os',                 where: 'Village paysan' },
      { time: '14h45–15h45', label: 'Joute',                                           where: 'Arène' },
      { time: '15h45–16h15', label: 'Parcours d’herboristerie',                        where: 'Village paysan' },
      { time: '15h45–16h15', label: 'Démonstration de planage de bois ancestral',      where: 'Village paysan' },
      { time: '16h00–16h30', label: 'Conférence — Construction du Drakkar',            where: 'Village viking' },
      { time: '16h30–17h00', label: 'Concours culinaire',                              where: 'Campement viking' },
      { time: '18h00–18h30', label: 'Démonstration de fonderie de fer',                where: 'Village paysan' },
      { time: '18h30–19h30', label: 'Spectacle de Harfang',                            where: 'Scène' },
      { time: '19h00–19h30', label: 'Parade',                                          where: 'Village paysan' },
      { time: '19h30–19h45', label: 'Allumage du feu + Danse des Berserkirs',          where: 'Feu' },
      { time: '19h45–20h45', label: 'Spectacle de Mystic Projekt',                     where: 'Scène' },
      { time: '20h45–21h00', label: 'Spectacle de feu',                                where: 'Feu' },
      { time: '21h00',       label: 'Spectacle de Skarazula',                          where: 'Scène' },
    ],
  },
  {
    dateFR: 'Dimanche 27 septembre',
    dateEN: 'Sunday September 27',
    items: [
      { time: '11h00–12h00', label: 'Jeu équestre',                                    where: 'Arène' },
      { time: '11h45–12h15', label: 'Parcours d’herboristerie',                        where: 'Village paysan' },
      { time: '11h45–12h15', label: 'Démonstration de forge',                          where: 'Village paysan' },
      { time: '12h00–13h00', label: 'Cérémonie de Freya — Célébration de l’équinoxe',  where: 'Camp viking' },
      { time: '13h00–14h00', label: 'Spectacle de Canteraine',                         where: 'Scène' },
      { time: '13h00–15h00', label: 'Banquet de l’Équinoxe',                            where: 'Scène' },
      { time: '13h30–15h00', label: 'Tournoi de bridge fight',                         where: 'Arène' },
      { time: '14h30–15h00', label: 'Démonstration de fonderie de fer',                where: 'Village paysan' },
    ],
  },
];

type Category = 'combat' | 'crafts' | 'shows' | 'ripaille' | 'family';

// ── Activity feature cards. Images sourced from public/wix/* — hashed
// Wix filenames mapped to the closest thematic match. Category drives
// the filter chips / arrow navigation. `descFR/descEN` are the long
// descriptions revealed when a tile is clicked (flip-expand modal).
const ACTIVITIES: Array<{
  titleFR: string;
  titleEN: string;
  bodyFR:  string;
  bodyEN:  string;
  descFR:  string;
  descEN:  string;
  image:   string;
  category: Category;
}> = [
  { titleFR: 'Escrime',          titleEN: 'Fencing',           bodyFR: 'et autres combats',                                       bodyEN: 'and other combat arts',
    descFR: 'L’escrime artistique et le combat médiéval — sous l’œil du Chevalier Vert, des duels en armure complète, l’épée longue, le combat libre. Toute la gamme de la guerre courtoise et de la guerre brute, présentée par les fines lames du festival.',
    descEN: 'Artistic fencing and medieval combat under the Green Knight’s watch — full-armour duels, longsword fencing, free combat. The full range of courtly war and raw war, performed by the festival’s finest blades.',
    image: '/wix/activites/25880822.jpg', category: 'combat' },
  { titleFR: 'Sorcières',        titleEN: 'Witches',           bodyFR: 'Herboristerie, tissage, artisanat',                       bodyEN: 'Herbalism, weaving, crafts',
    descFR: 'Herboristerie, tissage, cuisine ancestrale, sortilèges domestiques. Les sorcières du festival ouvrent leurs grimoires et partagent les savoirs qu’on a presque oubliés — entre racines, fils et chaudron.',
    descEN: 'Herbalism, weaving, ancestral cooking, household spellwork. The festival’s witches open their grimoires and share knowledge that’s almost forgotten — between roots, threads and cauldron.',
    image: '/wix/activites/1f021070.jpg', category: 'crafts' },
  { titleFR: 'Démonstrations',   titleEN: 'Demonstrations',    bodyFR: 'Forge, savoirs ancestraux',                               bodyEN: 'Forge, ancestral knowledge',
    descFR: 'Forge, fonderie, gravure sur os, planage de bois ancestral, tissage. Les artisans-démonstrateurs travaillent devant vous, expliquant chaque geste hérité d’une époque où la matière était travaillée à la main.',
    descEN: 'Forge, foundry, bone engraving, ancestral wood planing, weaving. The demonstrator-artisans work in front of you, explaining each gesture handed down from an age when matter was shaped by hand.',
    image: '/wix/activites/1eb43235.jpg', category: 'crafts' },
  { titleFR: 'Joutes',           titleEN: 'Jousts',            bodyFR: 'Équestres',                                                bodyEN: 'On horseback',
    descFR: 'Joutes équestres à la lance et à l’épée. Chevaliers et destriers s’affrontent dans l’arène — une tradition millénaire remise au goût du jour.',
    descEN: 'Mounted joust with lance and sword. Knights and chargers face off in the arena — a thousand-year-old tradition brought up to date.',
    image: '/wix/activites/04ba7d92.jpg', category: 'combat' },
  { titleFR: 'Spectacles',       titleEN: 'Shows',             bodyFR: 'Et musique',                                               bodyEN: 'And music',
    descFR: 'Compagnies de scène, musiciens, conteurs, troupes itinérantes. Mystic Projekt, Skarazula, Harfang, Canteraine, Trifolys et plus — du tambour viking aux ballades médiévales.',
    descEN: 'Stage companies, musicians, storytellers, travelling troupes. Mystic Projekt, Skarazula, Harfang, Canteraine, Trifolys and more — from Viking drums to medieval ballads.',
    image: '/wix/activites/145157f8.jpg', category: 'shows' },
  { titleFR: 'Marché',           titleEN: 'Market',            bodyFR: 'Artisans et foire locale',                                 bodyEN: 'Artisans and local fair',
    descFR: 'Une cinquantaine d’artisans et marchands d’époque. Forgerons, costumiers, bijoutiers, brasseurs, herboristes. Achetez local, en armure ou en bourgeois.',
    descEN: 'Some fifty period artisans and merchants. Smiths, costumers, jewellers, brewers, herbalists. Buy local — in armour or in burgher’s garb.',
    image: '/orb/marche.jpg', category: 'crafts' },
  { titleFR: 'Danses et Rituels',titleEN: 'Dances & Rituals',  bodyFR: 'Völvas',                                                   bodyEN: 'Völvas',
    descFR: 'Les völvas du clan Hullsborg dansent autour du grand feu. Rituels nordiques, cérémonie de Freya, allumage solennel — un héritage spirituel partagé sous les étoiles.',
    descEN: 'The Hullsborg clan’s völvas dance around the great fire. Nordic rituals, Freya ceremony, solemn lighting — a shared spiritual heritage under the stars.',
    image: '/wix/activites/3c294775.jpg', category: 'shows' },
  { titleFR: 'Espace Jeunesse',  titleEN: 'Youth Space',       bodyFR: 'Parc, jeux, animations, gardiennage',                     bodyEN: 'Park, games, activities, supervision',
    descFR: 'Un campement réservé aux jeunes seigneurs : ateliers d’écuyer, jeux d’adresse, contes, gardiennage encadré. L’enfance médiévale, mais sans la peste.',
    descEN: 'A camp reserved for young lords: squire workshops, skill games, tales, supervised babysitting. Medieval childhood — without the plague.',
    image: '/wix/jeunesse/2b1f82d0.jpg', category: 'family' },
  { titleFR: 'À Boire !',        titleEN: 'Drink!',            bodyFR: 'Bières des Brasseurs Philosophales et autres rinces-gosier', bodyEN: 'Beers from Brasseurs Philosophales and other tipples',
    descFR: 'Bières des Brasseurs Philosophales, hydromels, vins épicés, infusions sans alcool. Plusieurs estaminets répartis sur le site pour étancher la soif des aventuriers.',
    descEN: 'Beers from Brasseurs Philosophales, meads, spiced wines, alcohol-free infusions. Several taverns across the site to quench adventurers’ thirst.',
    image: '/wix/activites/1f021070.jpg', category: 'ripaille' },
  { titleFR: 'Soirée Dansante',  titleEN: 'Dance Party',       bodyFR: 'Ateliers éducatifs',                                       bodyEN: 'Educational workshops',
    descFR: 'La nuit venue, le feu prend, les tambours s’animent et le festival devient un grand bal médiéval. Ouvert à tous — gigue ou bourrée, on y danse autour des flammes jusqu’au matin.',
    descEN: 'Once night falls, the fire kindles, the drums come alive and the festival becomes a great medieval ball. Open to all — jig or bourrée, danced around the flames till morning.',
    image: '/wix/activites/2c6a22e9.jpg', category: 'shows' },
  { titleFR: 'Boustifaille',     titleEN: 'Feast',             bodyFR: 'La becquetance et la ripaille avec le nouveau village gustatif', bodyEN: 'Eating and feasting at the new food village',
    descFR: 'Le nouveau village gustatif — cuisines de clans, table d’hôte, banquet de l’équinoxe. Cochon de lait, pain plat, ragoûts, pâtisseries d’époque. La becquetance et la ripaille comme on aime.',
    descEN: 'The new food village — clan kitchens, table d’hôte, equinox banquet. Suckling pig, flatbread, stews, period pastries. Feasting and merrymaking as we love it.',
    image: '/wix/activites/1f021070.jpg', category: 'ripaille' },
  { titleFR: 'Clinique Équestre',titleEN: 'Equestrian Clinic', bodyFR: 'Pour les spécialistes',                                    bodyEN: 'For experienced riders',
    descFR: 'Pour les cavaliers expérimentés : cours intensifs sous les conseils des maîtres écuyers du festival. Travail au sol, jeux équestres, initiation à la joute. Inscription requise.',
    descEN: 'For experienced riders: intensive courses under the festival’s master squires. Groundwork, equestrian games, joust initiation. Registration required.',
    image: '/wix/activites/1c869c8b.jpg', category: 'family' },
  { titleFR: 'Tournois',         titleEN: 'Tournaments',       bodyFR: 'Et jeux d’adresse',                                        bodyEN: 'And skill games',
    descFR: 'Tournoi de bridge fight, combats vikings, jeux d’adresse à l’arc et au lancer de hache. Les meilleurs guerriers du festival s’affrontent pour la gloire — et un peu de bière.',
    descEN: 'Bridge-fight tournament, Viking combat, archery and axe-throwing competitions. The festival’s best warriors face off for glory — and a bit of beer.',
    image: '/wix/activites/4027b51a.jpg', category: 'combat' },
];

const CATEGORIES = ['all', 'combat', 'crafts', 'shows', 'ripaille', 'family'] as const;
type FilterKey = typeof CATEGORIES[number];

const ROMAN = ['I', 'II', 'III'] as const;

// Four lit gold L-ticks pinned to a parent's corners — marks the
// active inventory cell. Pure CSS, no SVG, no hex clipping conflict.
const CornerTicks: React.FC = () => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: 'var(--color-amber-glow)',
    filter: 'drop-shadow(0 0 4px rgba(232, 177, 74, 0.7))',
    pointerEvents: 'none',
  };
  return (
    <>
      <span aria-hidden style={{ ...base, top: 4, left:  4, borderTop:    '1.5px solid', borderLeft:  '1.5px solid' }} />
      <span aria-hidden style={{ ...base, top: 4, right: 4, borderTop:    '1.5px solid', borderRight: '1.5px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 4, left:  4, borderBottom: '1.5px solid', borderLeft:  '1.5px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 4, right: 4, borderBottom: '1.5px solid', borderRight: '1.5px solid' }} />
    </>
  );
};

// ─── HUD primitives — inventory header/footer chrome ──────────────────
// Round arrow button used on either side of the filter chip rail. Drives
// the prev/next filter cycle so the menu is navigable without touching
// a chip directly.
const HudArrow: React.FC<{
  icon:      React.ReactNode;
  onClick:   () => void;
  ariaLabel: string;
}> = ({ icon, onClick, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className="inline-flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-full transition hover:scale-110"
    style={{
      background: 'linear-gradient(180deg, rgba(232, 177, 74, 0.10), rgba(232, 177, 74, 0.02))',
      color: 'var(--color-amber-glow)',
      border: '1px solid rgba(232, 177, 74, 0.35)',
      boxShadow: 'inset 0 1px 0 rgba(255, 241, 181, 0.18)',
    }}
  >
    {icon}
  </button>
);

const HudMeter: React.FC<{
  label:  string;
  value:  number;          // 0-100
  accent: 'amber' | 'copper';
  align?: 'left' | 'right';
}> = ({ label, value, accent, align = 'left' }) => {
  const color = accent === 'amber' ? 'var(--color-amber-glow)' : 'var(--color-copper)';
  return (
    <div className={`flex flex-col gap-1.5 ${align === 'right' ? 'md:items-end md:text-right' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-sans uppercase tracking-[0.3em] text-[10px]"
              style={{ color: 'rgba(244, 239, 227, 0.65)' }}>
          {label}
        </span>
        <span className="font-display title-medieval text-sm" style={{ color }}>
          {value}%
        </span>
      </div>
      <div
        className="relative h-1.5 w-full overflow-hidden"
        style={{
          background: 'rgba(244, 239, 227, 0.08)',
          border: '1px solid rgba(216, 155, 58, 0.15)',
        }}
      >
        <span
          aria-hidden
          className="acti-meter-fill absolute inset-y-0 left-0 transition-all"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}, ${color === 'var(--color-amber-glow)' ? 'rgba(232, 177, 74, 0.6)' : 'rgba(184, 106, 42, 0.6)'})`,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    </div>
  );
};

const HudPrompt: React.FC<{ glyph: string; label: string; accent?: boolean }> = ({ glyph, label, accent = false }) => (
  <span className="inline-flex items-center gap-2">
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full font-sans text-[11px] font-semibold"
      style={{
        background: accent ? 'rgba(232, 177, 74, 0.15)' : 'rgba(244, 239, 227, 0.08)',
        color: accent ? 'var(--color-amber-glow)' : 'rgba(244, 239, 227, 0.78)',
        border: `1px solid ${accent ? 'rgba(232, 177, 74, 0.4)' : 'rgba(244, 239, 227, 0.18)'}`,
      }}
    >
      {glyph}
    </span>
    <span
      className="font-sans uppercase tracking-[0.25em] text-[10px]"
      style={{ color: accent ? 'var(--color-amber-glow)' : 'rgba(244, 239, 227, 0.65)' }}
    >
      {label}
    </span>
  </span>
);

const ActivitesPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  // ─── Shared SFX (matches OrbHomePage so the orb → pillar transition
  // feels continuous). `loot` fires on every selection (day, category,
  // tile); `hover` is a throttled rustle for mouse-only pointer enters.
  const playSelect = useSfx('/orb/sfx/loot.mp3', 0.45);
  const playHover  = useHoverSfx('/orb/sfx/hover.mp3', 0.28);

  // Live schedule — subscribes to Firestore so a save in the admin
  // Horaire section shows up here immediately. Falls back to the
  // SCHEDULE constant baked in below when Firestore is empty (e.g.
  // first deploy before any admin save) or unconfigured (offline mode).
  const [liveSchedule, setLiveSchedule] = useState<ScheduleDay[]>(SCHEDULE as unknown as ScheduleDay[]);
  useEffect(() => {
    const unsub = watchSchedule(CURRENT_SCHEDULE_YEAR, (doc) => {
      if (doc?.days && doc.days.length > 0) setLiveSchedule(doc.days);
    });
    return () => unsub();
  }, []);

  // Schedule day-tab state — index into liveSchedule. Default to
  // Saturday (idx 1), the marquee day with the densest line-up.
  const [activeDay, setActiveDay] = useState(1);
  const day = liveSchedule[activeDay] ?? liveSchedule[0];

  // Inventory filter state — drives both the chip rail and the arrow
  // controls. `all` shows every card; any other value filters by
  // category. Arrows cycle through CATEGORIES with wrap-around.
  const [filter, setFilter] = useState<FilterKey>('all');
  const filterIdx = CATEGORIES.indexOf(filter);
  const visible = filter === 'all' ? ACTIVITIES : ACTIVITIES.filter((a) => a.category === filter);
  const filterLabel = (k: FilterKey) => t.filters[k];

  // Click-to-flip-expand: tracks which activity is open in the modal.
  // null = no modal; otherwise an index into the ACTIVITIES array.
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const activeActivity = activeIdx !== null ? ACTIVITIES[activeIdx] : null;
  const openActivity = (idx: number) => { playSelect(); setActiveIdx(idx); };
  const closeActivity = () => { playSelect(); setActiveIdx(null); };

  // Wrap every selection in playSelect so the SFX is the single source
  // of "you chose something" feedback across the page.
  const selectDay = (idx: number) => {
    if (idx === activeDay) return;
    playSelect();
    setActiveDay(idx);
  };
  const selectFilter = (key: FilterKey) => {
    if (key === filter) return;
    playSelect();
    setFilter(key);
  };
  const prevFilter = () => {
    playSelect();
    setFilter(CATEGORIES[(filterIdx - 1 + CATEGORIES.length) % CATEGORIES.length]);
  };
  const nextFilter = () => {
    playSelect();
    setFilter(CATEGORIES[(filterIdx + 1) % CATEGORIES.length]);
  };

  // ─── GSAP scrollytelling. One context for the static, mount-time
  // reveals; separate effects below for filter/day changes so re-renders
  // get a fresh "shuffle" beat without fighting the scroll-tied timeline.
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !rootRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    // Pass the element (not the ref object) so gsap.context resolves
    // class selectors against it immediately.
    const root = rootRef.current;
    const ctx = gsap.context(() => {
      // ── Section header reveals (eyebrow + title block at the top of
      //    every section). Stagger the inner nodes so the eyebrow lands
      //    before the title — feels like the section is "introducing"
      //    itself rather than dropping all at once.
      gsap.utils.toArray<HTMLElement>('.sec-head').forEach((head) => {
        const kids = head.querySelectorAll(':scope > *');
        gsap.set(kids, { autoAlpha: 0, y: 36 });
        gsap.to(kids, {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: head, start: 'top 88%', once: true },
        });
      });

      // ── SectionTopRail strips — slide in from the side as the section
      //    enters view. SectionBottomRail mirrors it.
      gsap.utils.toArray<HTMLElement>('.sec-rail').forEach((rail) => {
        gsap.set(rail, { autoAlpha: 0, x: -40 });
        gsap.to(rail, {
          autoAlpha: 1,
          x: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: rail, start: 'top 90%', once: true },
        });
      });

      // ── HUD top bar — slides down + glints. Filter chips ride a wave
      //    so the menu "lights up" left-to-right.
      gsap.set('.acti-hud-top', { autoAlpha: 0, y: -28, scale: 0.98 });
      gsap.to('.acti-hud-top', {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.acti-hud-top', start: 'top 90%', once: true },
      });

      gsap.set('.acti-chip', { autoAlpha: 0, y: 18, rotationX: -45, transformPerspective: 600, transformOrigin: 'top center' });
      gsap.to('.acti-chip', {
        autoAlpha: 1,
        y: 0,
        rotationX: 0,
        duration: 0.7,
        stagger: 0.06,
        ease: 'back.out(1.7)',
        scrollTrigger: { trigger: '.acti-hud-top', start: 'top 82%', once: true },
        clearProps: 'transform',
      });

      // ── Green Knight — soft fade-and-up, scrub-tied so the rise
      //    is physically driven by scroll. Slightly bigger numbers than
      //    before so the entrance reads, but still calm enough that he
      //    doesn't compete with the tiles erupting around him.
      gsap.set('.acti-knight-img',  { autoAlpha: 0.25, y: 55 });
      gsap.to('.acti-knight-img', {
        autoAlpha: 1,
        y: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '.acti-grid',
          start: 'top 92%',
          end: 'top 30%',
          scrub: 1,
        },
      });

      gsap.set('.acti-knight-glow', { autoAlpha: 0.4, scale: 0.92 });
      gsap.to('.acti-knight-glow', {
        autoAlpha: 1,
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '.acti-grid',
          start: 'top 90%',
          end: 'center 55%',
          scrub: true,
        },
      });

      // ── Activity tiles — 3D flip-reveal entrance. Each tile starts
      //    edge-on (rotationY: 90deg) so it's effectively invisible,
      //    then flips down to 0deg as the section scrolls into view —
      //    the card face swings into the viewer like a playing card
      //    being turned over. transformPerspective gives the flip its
      //    depth; stagger from DOM start cascades the reveal top-left
      //    to bottom-right.
      gsap.fromTo('.acti-tile',
        {
          rotationY: 90,
          scale: 0.92,
          transformPerspective: 1200,
          transformOrigin: 'center center',
        },
        {
          rotationY: 0,
          scale: 1,
          ease: 'power2.out',
          stagger: { each: 0.06, from: 'start' },
          scrollTrigger: {
            trigger: '.acti-grid',
            start: 'top 85%',
            end:   'top 25%',
            scrub: 0.6,
          },
        }
      );

      // ── HUD bottom bar — slides up + meters "load" with scroll
      gsap.set('.acti-hud-bottom', { autoAlpha: 0, y: 28 });
      gsap.to('.acti-hud-bottom', {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.acti-hud-bottom', start: 'top 92%', once: true },
      });
      // Meter inner fills — width 0→target scrubbed to scroll position
      gsap.utils.toArray<HTMLElement>('.acti-meter-fill').forEach((el) => {
        const target = el.style.width || '0%';
        gsap.fromTo(el, { width: '0%' }, {
          width: target,
          ease: 'none',
          scrollTrigger: {
            trigger: '.acti-hud-bottom',
            start: 'top 92%',
            end: 'top 50%',
            scrub: 0.6,
          },
        });
      });
      // Controller-prompt row at the very bottom — glyph-by-glyph stagger
      gsap.utils.toArray<HTMLElement>('.acti-prompt-row > *').forEach((node) => {
        gsap.set(node, { autoAlpha: 0, y: 18, scale: 0.85 });
      });
      gsap.to('.acti-prompt-row > *', {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        stagger: 0.08,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: '.acti-hud-bottom', start: 'top 80%', once: true },
        clearProps: 'transform',
      });

      // ── Day plates — one-shot back-ease pop. Three plates rise +
      //    scale-up into view as the schedule section enters.
      gsap.fromTo('.sched-day-plate',
        { autoAlpha: 0, y: 28, scale: 0.94 },
        {
          autoAlpha: 1, y: 0, scale: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: 'back.out(1.4)',
          scrollTrigger: { trigger: '.sched-day-tabs', start: 'top 85%', once: true },
        }
      );

      // ── Vikings — panel flips up from the bottom, then chips inscribe
      //    as glowing runes (scale + blur + tiny rotate for character).
      gsap.set('.vikings-panel', {
        autoAlpha: 0,
        y: 80,
        rotationX: 28,
        scale: 0.95,
        transformPerspective: 1000,
        transformOrigin: 'center bottom',
      });
      gsap.to('.vikings-panel', {
        autoAlpha: 1,
        y: 0,
        rotationX: 0,
        scale: 1,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.vikings-section', start: 'top 82%', once: true },
        clearProps: 'transform',
      });
      gsap.set('.vikings-chip', { autoAlpha: 0, scale: 0.4, rotation: -18, filter: 'blur(10px)' });
      gsap.to('.vikings-chip', {
        autoAlpha: 1,
        scale: 1,
        rotation: 0,
        filter: 'blur(0px)',
        duration: 0.85,
        stagger: 0.14,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: '.vikings-section', start: 'top 72%', once: true },
      });

      // ── Cross-promo cards — slide in from opposite sides. Left
      //    card kicks in from the left, right card from the right,
      //    each with a small delay between them.
      gsap.fromTo('.cross-card-left',
        { autoAlpha: 0, x: -50 },
        {
          autoAlpha: 1, x: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.cross-section', start: 'top 82%', once: true },
        }
      );
      gsap.fromTo('.cross-card-right',
        { autoAlpha: 0, x: 50 },
        {
          autoAlpha: 1, x: 0,
          duration: 0.8,
          delay: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.cross-section', start: 'top 82%', once: true },
        }
      );
    }, root);

    // Refresh after the first paint so ScrollTrigger uses real layout
    // measurements (PageHeader image + tile images shift the page as
    // they load — without this, the cached start/end can be off-screen
    // and scrub triggers appear "dead").
    const refresh = () => ScrollTrigger.refresh();
    requestAnimationFrame(refresh);
    window.addEventListener('load', refresh);

    return () => {
      window.removeEventListener('load', refresh);
      ctx.revert();
    };
  }, []);

  // ─── Schedule rows — scrub-tied reveal of the timeline. Lives in its
  // own context that re-runs on day change so the new <li> set is the
  // one being animated (the .sched-panel wrapper remounts via key=day).
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !rootRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const root = rootRef.current;
    const ctx = gsap.context(() => {
      gsap.set('.sched-row',     { autoAlpha: 0.2, x: -14 });
      gsap.set('.sched-pip',     { scale: 0.45, autoAlpha: 0.35 });
      gsap.set('.sched-rail',    { scaleY: 0, transformOrigin: 'top center' });
      gsap.set('.sched-content', { autoAlpha: 0.45 });

      const trigger = {
        trigger: '.sched-panel',
        start: 'top 78%',
        end: 'bottom 65%',
        scrub: 0.6,
      } as const;

      gsap.to('.sched-rail',    { scaleY: 1,   ease: 'none', scrollTrigger: { ...trigger, scrub: 0.3 } });
      gsap.to('.sched-row',     { autoAlpha: 1, x: 0,        ease: 'none', stagger: 0.04, scrollTrigger: trigger });
      gsap.to('.sched-pip',     { scale: 1, autoAlpha: 1,    ease: 'back.out(2)', stagger: 0.04, scrollTrigger: trigger });
      gsap.to('.sched-content', { autoAlpha: 1,              ease: 'none', stagger: 0.04, scrollTrigger: trigger });

      // ScrollTrigger needs a refresh after the DOM swaps in fresh rows
      // (otherwise it caches the previous list's start/end positions).
      ScrollTrigger.refresh();
    }, root);

    return () => ctx.revert();
  }, [activeDay]);

  // ─── Filter shuffle animation intentionally removed alongside the
  //  activity-tile cascade rollback. Filter changes now swap the
  //  visible tile set with no entry animation; tiles render at rest.
  return (
    <div ref={rootRef}>
      <SEO title={t.title} description={t.intro} />

      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/wix/home/fire-night.jpg"
        orbImagePosition="center 35%"
      />

      {/* ── Activity grid — Bestiary register ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <SectionTopRail
            index="01"
            name={t.activitiesEyebrow}
            meta={t.activitiesMeta}
            metaValue={ACTIVITIES.length}
            className="sec-rail mb-10 md:mb-14"
          />
          <div className="sec-head text-center mb-10 md:mb-14">
            <Eyebrow tone="copper" className="mb-3 inline-flex items-center gap-3 justify-center">
              <HexMark />
              {t.activitiesEyebrow}
              <HexMark />
            </Eyebrow>
            <DisplayTitle size="lg" className="mb-4">{t.activitiesTitle}</DisplayTitle>
            <p className="font-editorial text-base md:text-lg max-w-2xl mx-auto"
               style={{ color: 'rgba(244, 239, 227, 0.78)' }}>
              {t.activitiesLead}
            </p>
          </div>

          {/* ── HUD top bar — inventory header. Two rows: title + stats,
              then arrow nav flanking the filter chips. Chips + arrows
              both drive the same `filter` state. */}
          <div
            className="acti-hud-top mb-4"
            style={{ borderTop: '1px solid rgba(216, 155, 58, 0.22)', borderBottom: '1px solid rgba(216, 155, 58, 0.22)' }}
          >
            {/* Row 1: title centered, stat readouts on the right. */}
            <div
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-2 py-2.5"
              style={{ borderBottom: '1px solid rgba(216, 155, 58, 0.10)' }}
            >
              <span aria-hidden />
              <span
                className="font-display title-medieval uppercase tracking-[0.5em] text-[11px] md:text-xs text-center whitespace-nowrap"
                style={{ color: 'var(--color-amber-glow)', textShadow: '0 0 12px rgba(232, 177, 74, 0.4)' }}
              >
                {t.activitiesTitle}
              </span>
              <div
                className="flex items-center justify-end gap-3 md:gap-4 font-sans uppercase tracking-[0.22em] text-[10px]"
                style={{ color: 'rgba(244, 239, 227, 0.7)' }}
              >
                <span className="inline-flex items-baseline gap-1.5">
                  <span aria-hidden className="w-1.5 h-1.5 rotate-45 self-center" style={{ background: 'var(--color-amber-glow)' }} />
                  <span style={{ color: 'var(--color-bone)' }}>{visible.length}</span>
                  <span className="opacity-50">/</span>
                  <span className="opacity-50">{ACTIVITIES.length}</span>
                </span>
                <span className="opacity-50 hidden md:inline">·</span>
                <span className="hidden md:inline" style={{ color: 'var(--color-amber-glow)' }}>2026</span>
              </div>
            </div>

            {/* Row 2: arrow nav flanking the filter chip rail. */}
            <div className="flex items-center justify-center gap-2 md:gap-3 px-2 py-2.5 overflow-x-auto">
              <HudArrow icon={<ChevronLeft size={14} />} onClick={prevFilter} ariaLabel={t.prevCategory} />
              {CATEGORIES.map((key) => {
                const isActive = key === filter;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectFilter(key)}
                    onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !isActive) playHover(); }}
                    className="acti-chip inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1 font-sans uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[10px] sm:text-[9px] md:text-[10px] transition whitespace-nowrap cursor-pointer hover:!opacity-100"
                    style={{
                      color: isActive ? 'var(--color-amber-glow)' : 'rgba(244, 239, 227, 0.55)',
                      borderBottom: isActive ? '1px solid var(--color-amber-glow)' : '1px solid transparent',
                    }}
                  >
                    {filterLabel(key)}
                  </button>
                );
              })}
              <HudArrow icon={<ChevronRight size={14} />} onClick={nextFilter} ariaLabel={t.nextCategory} />
            </div>
          </div>

          {/* Inventory-style grid — Witcher redesign register (Martin
              Coates inspo). The Green Knight occupies the centerpiece cell as the
              focal figure (transparent PNG, no frame, no slab — just the
              character standing inside the grid). Activity tiles pack
              around him via grid-flow-dense. */}
          <div className="acti-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 [grid-auto-flow:dense]">
            {/* ── Centerpiece figure ── */}
            <div
              aria-hidden
              className="relative col-span-2 row-span-1 md:col-start-2 md:col-span-1 md:row-span-2 lg:col-start-2 lg:col-span-3 lg:row-span-2 min-h-[260px] md:min-h-[420px] lg:min-h-[520px] flex items-end justify-center"
            >
              {/* Copper backdrop glow — places him in warm light. Sits
                  behind the figure, masked elliptically so it never
                  reads as a rectangle. */}
              <span
                className="acti-knight-glow absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 60% 65% at 50% 55%, rgba(184, 106, 42, 0.22), transparent 70%),' +
                    'radial-gradient(ellipse 45% 55% at 50% 60%, rgba(232, 177, 74, 0.12), transparent 75%)',
                }}
              />
              <img
                src="/characters/green-knight.png"
                alt={t.championName}
                className="acti-knight-img fmm-no-grade relative w-full h-full object-contain"
                style={{
                  filter:
                    'drop-shadow(0 24px 40px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 24px rgba(184, 106, 42, 0.4))',
                  // Fade the bottom 30% gradually to transparent so the
                  // knight dissolves into the page rather than sitting
                  // on a hard edge. Gradient: opaque from the top down
                  // to 70% of the image, then linearly fades to 0 at
                  // the bottom.
                  WebkitMaskImage: 'linear-gradient(to bottom, #000 70%, transparent 100%)',
                  maskImage:       'linear-gradient(to bottom, #000 70%, transparent 100%)',
                }}
              />
              {/* Floor shadow — anchors him to the page so he doesn't
                  float in the void. */}
              <span
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 bottom-1 w-2/3 h-8 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(0,0,0,0.55), transparent 70%)',
                  filter: 'blur(4px)',
                }}
              />
            </div>

            {/* ── Activity inventory tiles — full-bleed image with the
                label overlaid at the bottom. Plain rectangular cells
                with 15px rounding. Active tile (first of the visible
                set) gets four lit corner ticks. */}
            {visible.map((a, i) => {
              const active = i === 0;
              const absoluteIdx = ACTIVITIES.indexOf(a);
              return (
                <div
                  key={a.titleFR}
                  onClick={() => openActivity(absoluteIdx)}
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse') playHover(); }}
                  className="acti-tile relative aspect-[4/5] group cursor-pointer"
                >
                  <div
                    className="relative h-full overflow-hidden"
                    style={{
                      borderRadius: 15,
                      border: `1px solid ${active ? 'rgba(232, 177, 74, 0.55)' : 'rgba(216, 155, 58, 0.20)'}`,
                      boxShadow: active
                        ? 'inset 0 0 0 1px rgba(232, 177, 74, 0.35), 0 0 24px -8px rgba(232, 177, 74, 0.45)'
                        : '0 12px 30px -18px rgba(0, 0, 0, 0.7)',
                    }}
                  >
                    {/* Full-bleed photo — caravan-graded so all photos
                        (different photographers, lighting, era) read
                        as a homogeneous set. */}
                    <img
                      src={a.image}
                      alt={lang === 'FR' ? a.titleFR : a.titleEN}
                      loading="lazy"
                      decoding="async"
                      className="fmm-grade-caravan absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />

                    {/* Warm tint overlay — pushes residual hue cast
                        toward amber-copper, unifying photos that were
                        originally shot under cool / mixed light. */}
                    <span aria-hidden className="fmm-grade-caravan-tint absolute inset-0 pointer-events-none" />

                    {/* Glistening sweep — re-uses the orb's diagonal
                        shine. Staggered delay per card so the row
                        twinkles asynchronously instead of in unison. */}
                    <span
                      aria-hidden
                      className="fmm-card-shine"
                      style={{ animationDelay: `${(i * 0.85) % 8}s` }}
                    />

                    {/* Dark gradient at the bottom for label legibility */}
                    <span
                      aria-hidden
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(10, 2, 7, 0) 35%, rgba(10, 2, 7, 0.55) 65%, rgba(10, 2, 7, 0.92) 100%)',
                      }}
                    />

                    {/* Active-state corner brackets — overlaid above
                        the image so they're not clipped by it. */}
                    {active && <CornerTicks />}

                    {/* N° chip — top-left */}
                    <span
                      className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2 py-1 font-display title-medieval text-[10px] tracking-[0.3em]"
                      style={{
                        background: 'rgba(10, 2, 7, 0.7)',
                        color: 'var(--color-amber-glow)',
                        border: '1px solid rgba(232, 177, 74, 0.35)',
                        borderRadius: 6,
                      }}
                    >
                      N° {String(absoluteIdx + 1).padStart(2, '0')}
                    </span>

                    {/* Title + body — pinned to the bottom of the card */}
                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                      <h3
                        className="font-display title-medieval text-base md:text-lg mb-1 transition leading-tight"
                        style={{ color: 'var(--color-bone)' }}
                      >
                        {lang === 'FR' ? a.titleFR : a.titleEN}
                      </h3>
                      <p
                        className="font-editorial italic text-xs md:text-sm leading-snug"
                        style={{ color: 'rgba(244, 239, 227, 0.75)' }}
                      >
                        {lang === 'FR' ? a.bodyFR : a.bodyEN}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── HUD bottom bar — Witcher inventory footer.
              Left: Vitality-style progress meter (festival readiness).
              Right: Toxicity-style meter (ticket availability).
              Below: controller-prompt row (back / details / select). */}
          <div
            className="acti-hud-bottom mt-6 px-2 py-4"
            style={{ borderTop: '1px solid rgba(216, 155, 58, 0.22)' }}
          >
            <div className="grid md:grid-cols-2 gap-6 md:gap-12 mb-4">
              <HudMeter label={t.meterReady} value={68} accent="amber" />
              <HudMeter label={t.meterTickets} value={32} accent="copper" align="right" />
            </div>
            <div
              className="acti-prompt-row flex items-center justify-end gap-4 md:gap-6 flex-wrap pt-3"
              style={{ borderTop: '1px solid rgba(216, 155, 58, 0.12)' }}
            >
              <HudPrompt glyph="○" label={t.promptBack} />
              <HudPrompt glyph="□" label={t.promptDetails} />
              <HudPrompt glyph="△" label={t.promptFilter} />
              <HudPrompt glyph="✕" label={t.promptSelect} accent />
            </div>
          </div>

          <SectionBottomRail
            hint={t.activitiesHint}
            meta={t.activitiesFootMeta}
            className="sec-rail mt-10"
          />
        </div>
      </section>

      {/* ── Schedule — Quest Log (3 day plates) ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <SectionTopRail
            index="02"
            name={t.scheduleEyebrow}
            meta={t.scheduleMeta}
            metaValue={liveSchedule.reduce((n, d) => n + d.items.length, 0)}
            className="sec-rail mb-10 md:mb-14"
          />
          <div className="sec-head text-center mb-10 md:mb-14">
            <Eyebrow tone="amber" className="mb-3 inline-flex items-center gap-3 justify-center">
              <Calendar size={12} className="opacity-80" />
              {t.scheduleEyebrow}
              <HexMark />
            </Eyebrow>
            <DisplayTitle size="lg" glow className="mb-2">{t.scheduleTitle}</DisplayTitle>
          </div>
          {/* Day tabs — three illuminated day plates. Click to switch.
              The active plate gets amber-lit border + corner ticks. */}
          <div className="sched-day-tabs grid grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
            {liveSchedule.map((d, idx) => {
              const isActive   = idx === activeDay;
              const dayName    = (lang === 'FR' ? d.dateFR : d.dateEN).split(' ')[0];
              const dayDate    = (lang === 'FR' ? d.dateFR : d.dateEN).split(' ').slice(1).join(' ');
              return (
                <button
                  key={d.dateFR}
                  type="button"
                  onClick={() => selectDay(idx)}
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !isActive) playHover(); }}
                  className="sched-day-plate relative text-left transition-transform hover:-translate-y-0.5"
                  aria-pressed={isActive}
                  aria-label={`${dayName} ${dayDate}`}
                >
                  <div
                    className="relative h-full px-2.5 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 overflow-hidden"
                    style={{
                      borderRadius: 12,
                      background: isActive
                        ? 'linear-gradient(180deg, rgba(232, 177, 74, 0.10), rgba(19, 8, 11, 0.78))'
                        : 'rgba(19, 8, 11, 0.55)',
                      border: `1px solid ${isActive ? 'rgba(232, 177, 74, 0.55)' : 'rgba(216, 155, 58, 0.18)'}`,
                      boxShadow: isActive
                        ? 'inset 0 1px 0 rgba(232, 177, 74, 0.18), 0 0 28px -10px rgba(232, 177, 74, 0.55)'
                        : 'inset 0 1px 0 rgba(232, 177, 74, 0.05)',
                    }}
                  >
                    {isActive && <CornerTicks />}

                    <div className="flex items-baseline justify-between mb-2">
                      <span
                        className="font-display title-medieval text-2xl md:text-3xl leading-none"
                        style={{
                          color: isActive ? 'var(--color-amber-glow)' : 'rgba(244, 239, 227, 0.45)',
                          textShadow: isActive ? '0 0 14px rgba(232, 177, 74, 0.45)' : undefined,
                        }}
                      >
                        {ROMAN[idx]}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 font-sans uppercase tracking-[0.25em] text-[10px]"
                        style={{ color: isActive ? 'var(--color-bone)' : 'rgba(244, 239, 227, 0.45)' }}
                      >
                        <span aria-hidden className="w-1.5 h-1.5 rotate-45"
                              style={{ background: isActive ? 'var(--color-amber-glow)' : 'var(--color-copper)' }} />
                        {d.items.length}
                      </span>
                    </div>

                    <p
                      className="font-display title-medieval uppercase tracking-[0.12em] sm:tracking-[0.18em] text-[11px] sm:text-sm md:text-base"
                      style={{ color: isActive ? 'var(--color-bone)' : 'rgba(244, 239, 227, 0.7)' }}
                    >
                      {dayName}
                    </p>
                    <p
                      className="font-editorial italic text-xs md:text-sm mt-0.5"
                      style={{ color: isActive ? 'rgba(244, 239, 227, 0.7)' : 'rgba(244, 239, 227, 0.45)' }}
                    >
                      {dayDate}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active day's timeline — single rich panel. Three-column
              layout: time anchor on the left, vertical hairline + pip
              in the middle, event title + location chip on the right.
              Events are grouped by hour so the time only paints once
              when consecutive items share an hour. */}
          <div key={`day-${activeDay}`} className="sched-panel">
            <GildedFrame inset={12} tone="amber" className="relative">
              <div className="caravan-glass relative p-5 md:p-8 lg:p-10">
                {/* Header strip — day title + meta */}
                <div className="flex items-baseline justify-between gap-4 flex-wrap pb-4 mb-6"
                     style={{ borderBottom: '1px solid rgba(216, 155, 58, 0.22)' }}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display title-medieval text-3xl md:text-4xl leading-none"
                          style={{ color: 'var(--color-amber-glow)', textShadow: '0 0 14px rgba(232, 177, 74, 0.45)' }}>
                      {ROMAN[activeDay]}
                    </span>
                    <h3 className="font-display title-medieval text-lg sm:text-xl md:text-2xl"
                        style={{ color: 'var(--color-bone)' }}>
                      {lang === 'FR' ? day.dateFR : day.dateEN}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 font-sans uppercase tracking-[0.25em] text-[10px]"
                       style={{ color: 'rgba(244, 239, 227, 0.6)' }}>
                    <span>{day.items.length} {t.scheduleMeta}</span>
                    <span className="opacity-50">·</span>
                    <span style={{ color: 'var(--color-amber-glow)' }}>{day.items[0].time}–{day.items[day.items.length - 1].time.split('–').pop()}</span>
                  </div>
                </div>

                {/* Timeline rows */}
                <ol className="relative">
                  {day.items.map((item, i) => {
                    const prev = i > 0 ? day.items[i - 1] : null;
                    const hourOf = (s: string) => s.split('–')[0].split('h')[0].slice(0, 2);
                    const showTime = !prev || hourOf(item.time) !== hourOf(prev.time);
                    return (
                      <li
                        key={i}
                        className="sched-row relative grid grid-cols-[48px_16px_1fr] sm:grid-cols-[60px_20px_1fr] md:grid-cols-[88px_28px_1fr] items-start gap-x-2 py-2.5 group/row transition"
                      >
                        {/* Time anchor */}
                        <span
                          className="font-display title-medieval text-right pt-1 tracking-[0.06em] text-[10px] sm:text-[12px] md:text-sm"
                          style={{
                            color: showTime ? 'var(--color-amber-glow)' : 'transparent',
                          }}
                        >
                          {showTime && (
                            <>
                              {/* Show start-time only on mobile (narrow
                                  column), full range on sm+. */}
                              <span className="sm:hidden">{item.time.split('–')[0]}</span>
                              <span className="hidden sm:inline">{item.time}</span>
                            </>
                          )}
                        </span>

                        {/* Vertical rail + pip */}
                        <span className="relative h-full flex justify-center">
                          {/* Continuous hairline behind the pips */}
                          <span aria-hidden className="sched-rail absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px"
                                style={{
                                  background: i === 0
                                    ? 'linear-gradient(180deg, transparent, var(--color-copper) 50%)'
                                    : i === day.items.length - 1
                                    ? 'linear-gradient(180deg, var(--color-copper) 0%, var(--color-copper) 50%, transparent 100%)'
                                    : 'var(--color-copper)',
                                  opacity: 0.55,
                                }} />
                          <span aria-hidden
                                className="sched-pip relative mt-2 w-2 h-2 rotate-45 transition group-hover/row:scale-125"
                                style={{
                                  background: 'var(--color-amber-glow)',
                                  boxShadow: '0 0 8px rgba(232, 177, 74, 0.55)',
                                }} />
                        </span>

                        {/* Event content */}
                        <div className="sched-content flex items-start justify-between gap-3 md:gap-5 flex-wrap pt-0.5 pb-1">
                          <p className="font-display title-medieval text-sm md:text-base leading-snug flex-1 transition"
                             style={{ color: 'var(--color-bone)' }}>
                            {item.label}
                          </p>
                          <span
                            className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 font-sans uppercase tracking-[0.2em] text-[9px] md:text-[10px]"
                            style={{
                              color: 'rgba(244, 239, 227, 0.65)',
                              background: 'rgba(232, 177, 74, 0.05)',
                              border: '1px solid rgba(216, 155, 58, 0.22)',
                              borderRadius: 4,
                            }}
                          >
                            <MapPin size={9} style={{ color: 'var(--color-copper)' }} />
                            {item.where}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </GildedFrame>
          </div>
          <SectionBottomRail
            hint={t.scheduleNote}
            meta={t.scheduleVersion}
            className="sec-rail mt-10"
          />
        </div>
      </section>

      {/* ── Vikings — Compendium entry ── */}
      <section className="vikings-section relative py-16 md:py-24 overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <SectionTopRail
            index="03"
            name={t.vikingsRailName}
            meta={t.vikingsMeta}
            metaValue={t.vikingsMetaValue}
            className="sec-rail mb-10 md:mb-14"
          />
          <div className="vikings-panel relative max-w-3xl mx-auto">
            <EnergyPulse className="absolute inset-0 -z-0 opacity-40" />
            <GildedFrame inset={14} tone="amber" className="relative">
              <div className="caravan-glass p-8 md:p-12 text-center">
                <Eyebrow tone="amber" className="mb-3 inline-flex items-center gap-3 justify-center">
                  <HexMark />
                  {t.vikingsEyebrow}
                  <HexMark />
                </Eyebrow>
                <DisplayTitle size="lg" glow className="mb-6">{t.vikingsTitle}</DisplayTitle>
                <p className="font-editorial text-base md:text-xl leading-relaxed mb-8"
                   style={{ color: 'rgba(244, 239, 227, 0.85)' }}>
                  {t.vikingsBody}
                </p>
                {/* Clan shields — three transparent-bg PNGs sit on top of
                    the gilded frame. Files live in /public/clans/ ; the
                    user uploads them after the structure is in place.
                    Fallback to a faint amber lozenge so the layout doesn't
                    collapse if a file is missing. */}
                <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto">
                  {[
                    { id: 'hullsborg', name: 'Hullsborg', image: '/clans/shield-hullsborg.png' },
                    { id: 'managarm',  name: 'Managarm',  image: '/clans/shield-managarm.png'  },
                    { id: 'berserkir', name: 'Berserkirs', image: '/clans/shield-berserkirs.png' },
                  ].map((clan) => (
                    <figure key={clan.id} className="vikings-chip group flex flex-col items-center text-center">
                      <div
                        className="relative w-full aspect-square flex items-center justify-center"
                        style={{
                          filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.55)) drop-shadow(0 0 24px rgba(232,177,74,0.15))',
                        }}
                      >
                        <img
                          src={clan.image}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          className="w-[78%] h-[78%] object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                          onError={(e) => {
                            // Placeholder lozenge while the real shield isn't uploaded yet
                            const el = e.currentTarget as HTMLImageElement;
                            el.style.display = 'none';
                            const fallback = el.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <span
                          aria-hidden
                          className="absolute inset-[12%] hidden items-center justify-center rounded-full border-2"
                          style={{
                            borderColor: 'rgba(216, 155, 58, 0.45)',
                            background: 'radial-gradient(circle at 50% 35%, rgba(232,177,74,0.18), rgba(176,141,58,0.06) 55%, transparent 75%)',
                          }}
                        >
                          <span
                            className="font-display title-medieval uppercase tracking-[0.35em] text-[10px] md:text-xs"
                            style={{ color: 'var(--color-amber-glow)' }}
                          >
                            {clan.name}
                          </span>
                        </span>
                      </div>
                      <figcaption
                        className="mt-3 md:mt-4 font-display title-medieval uppercase tracking-[0.35em] text-[10px] md:text-xs"
                        style={{ color: 'var(--color-amber-glow)' }}
                      >
                        {clan.name}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </GildedFrame>
          </div>
        </div>
      </section>

      {/* ── Banquet + Youth — Champion-select cross-promo ── */}
      <section className="cross-section py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <SectionTopRail
            index="04"
            name={t.crossRailName}
            meta={t.crossMeta}
            metaValue="II"
            className="sec-rail mb-10 md:mb-14"
          />
          <div className="grid md:grid-cols-2 gap-5 md:gap-7">
            {[
              {
                idx: 'I',
                eyebrow: t.banquetEyebrow,
                title:   t.banquetTitle,
                body:    t.banquetBody,
                cta:     t.banquetCta,
                href:    addLocale('/nourriture', lang),
                tone:    'amber' as const,
                variant: 'gold' as const,
              },
              {
                idx: 'II',
                eyebrow: t.youthEyebrow,
                title:   t.youthTitle,
                body:    t.youthBody,
                cta:     t.youthCta,
                href:    addLocale('/jeunesse', lang),
                tone:    'copper' as const,
                variant: 'ghost' as const,
              },
            ].map((c, ci) => (
              <HexPanel
                key={c.title}
                size="md"
                className={`group h-full ${ci === 0 ? 'cross-card-left' : 'cross-card-right'}`}
              >
                <GildedFrame inset={12} tone={c.tone} className="h-full">
                  <div className="caravan-glass p-7 md:p-9 flex flex-col h-full min-h-[260px]">
                    <div className="flex items-baseline justify-between mb-3">
                      <Eyebrow tone={c.tone}>
                        {c.eyebrow}
                      </Eyebrow>
                      <span
                        className="font-display title-medieval text-2xl leading-none opacity-80"
                        style={{ color: 'var(--color-amber-glow)' }}
                      >
                        {c.idx}
                      </span>
                    </div>
                    <DisplayTitle size="lg" className="text-2xl md:text-3xl mb-4">
                      {c.title}
                    </DisplayTitle>
                    <p className="font-editorial text-base leading-relaxed mb-6 flex-1"
                       style={{ color: 'rgba(244, 239, 227, 0.75)' }}>
                      {c.body}
                    </p>
                    <ChevronButton to={c.href} variant={c.variant} onClick={playSelect} className="self-start ml-3">
                      {c.cta}
                    </ChevronButton>
                  </div>
                </GildedFrame>
              </HexPanel>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tournoi de Behourd 2027 — early registration ──────────────
          Inscription anticipée (1 an d'avance). Form saves to Firestore
          (behourd/{autoId}) and then opens the Zeffy payment link. */}
      <section className="behourd-section relative py-16 md:py-24 overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <SectionTopRail
            index="05"
            name={t.behourdRailName}
            meta={t.behourdMeta}
            metaValue="2027"
            className="sec-rail mb-10 md:mb-14"
          />
          <div className="relative max-w-3xl mx-auto">
            <GildedFrame inset={14} tone="copper" className="relative">
              <div className="caravan-glass p-8 md:p-12 text-center">
                <Eyebrow tone="copper" className="mb-3 inline-flex items-center gap-3 justify-center">
                  <HexMark />
                  {t.behourdEyebrow}
                  <HexMark />
                </Eyebrow>
                <DisplayTitle size="lg" glow className="mb-6">{t.behourdTitle}</DisplayTitle>
                <p className="font-editorial text-base md:text-lg leading-relaxed mb-8"
                   style={{ color: 'rgba(244, 239, 227, 0.85)' }}>
                  {t.behourdBody}
                </p>
                <BehourdRegistrationForm lang={lang} />
              </div>
            </GildedFrame>
          </div>
        </div>
      </section>

      {/* ── Activity flip-expand modal ──────────────────────────────
          Clicking a tile in the bestiary opens the activity in a
          centred overlay with a 3D flip-in entrance (rotateY -180 →
          0deg + scale + opacity). The "back" of the card carries the
          long description, the hero image, the category chip and a
          dismiss button. Backdrop click or X closes. */}
      <AnimatePresence>
        {activeActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto"
            style={{
              background: 'rgba(10, 2, 7, 0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={closeActivity}
          >
            <motion.div
              initial={{ rotateY: -180, scale: 0.7, opacity: 0 }}
              animate={{ rotateY: 0,    scale: 1,   opacity: 1 }}
              exit={{    rotateY: 180,  scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl my-auto overflow-hidden"
              style={{
                transformStyle: 'preserve-3d',
                transformPerspective: 1400,
                background:
                  `linear-gradient(180deg, rgba(232, 177, 74, 0.04) 0%, transparent 30%, rgba(184, 106, 42, 0.05) 100%),` +
                  `linear-gradient(180deg, #1a0e10 0%, #0d0608 100%)`,
                border: '1px solid rgba(232, 177, 74, 0.45)',
                borderRadius: 15,
                boxShadow:
                  'inset 0 1px 0 rgba(232, 177, 74, 0.18), 0 30px 80px -20px rgba(232, 177, 74, 0.4), 0 0 60px -20px rgba(184, 106, 42, 0.45)',
              }}
            >
              {/* Hero image */}
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={activeActivity.image}
                  alt={lang === 'FR' ? activeActivity.titleFR : activeActivity.titleEN}
                  className="fmm-grade-caravan absolute inset-0 w-full h-full object-cover"
                />
                <span aria-hidden className="fmm-grade-caravan-tint absolute inset-0 pointer-events-none" />
                <span
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(10,2,7,0) 30%, rgba(10,2,7,0.55) 70%, rgba(10,2,7,0.95) 100%)',
                  }}
                />
                {/* N° chip — top-left */}
                <span
                  className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 font-display title-medieval text-[10px] tracking-[0.3em]"
                  style={{
                    background: 'rgba(10, 2, 7, 0.7)',
                    color: 'var(--color-amber-glow)',
                    border: '1px solid rgba(232, 177, 74, 0.45)',
                    borderRadius: 6,
                  }}
                >
                  N° {String(activeIdx! + 1).padStart(2, '0')}
                </span>
                {/* Category chip — top-right */}
                <span
                  className="absolute top-3 right-12 inline-flex items-center gap-1.5 px-2 py-1 font-sans uppercase tracking-[0.25em] text-[9px]"
                  style={{
                    background: 'rgba(10, 2, 7, 0.7)',
                    color: 'rgba(244, 239, 227, 0.75)',
                    border: '1px solid rgba(216, 155, 58, 0.30)',
                    borderRadius: 6,
                  }}
                >
                  {t.filters[activeActivity.category]}
                </span>
              </div>

              {/* Content */}
              <div className="relative px-6 md:px-8 py-6 md:py-7">
                <h2
                  className="font-display title-medieval text-3xl md:text-4xl tracking-[0.04em] uppercase leading-tight mb-2"
                  style={{ color: 'var(--color-bone)' }}
                >
                  {lang === 'FR' ? activeActivity.titleFR : activeActivity.titleEN}
                </h2>
                <p
                  className="font-editorial italic text-base mb-4"
                  style={{ color: 'rgba(244, 239, 227, 0.65)' }}
                >
                  {lang === 'FR' ? activeActivity.bodyFR : activeActivity.bodyEN}
                </p>
                <span
                  aria-hidden
                  className="block h-px w-24 mb-5"
                  style={{ background: 'linear-gradient(90deg, var(--color-amber-glow), transparent)' }}
                />
                <p
                  className="font-editorial text-base md:text-lg leading-relaxed mb-6"
                  style={{ color: 'rgba(244, 239, 227, 0.85)' }}
                >
                  {lang === 'FR' ? activeActivity.descFR : activeActivity.descEN}
                </p>
                <button
                  type="button"
                  onClick={closeActivity}
                  className="inline-flex items-center gap-2 px-6 py-2.5 font-sans uppercase tracking-[0.3em] text-[11px] transition-all hover:scale-[1.02]"
                  style={{
                    color: 'var(--color-velvet-deep)',
                    background:
                      'linear-gradient(180deg, var(--color-amber-glow) 0%, var(--color-mustard) 55%, var(--color-copper) 100%)',
                    clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
                    boxShadow:
                      'inset 0 1px 0 rgba(255, 240, 200, 0.4), 0 8px 22px -8px rgba(216, 155, 58, 0.55)',
                  }}
                >
                  {lang === 'FR' ? 'Fermer' : 'Close'}
                </button>
              </div>

              {/* Close × — top-right */}
              <button
                type="button"
                onClick={closeActivity}
                aria-label={lang === 'FR' ? 'Fermer' : 'Close'}
                className="absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 transition-colors"
                style={{
                  color: 'rgba(244, 239, 227, 0.85)',
                  background: 'rgba(10, 2, 7, 0.7)',
                  border: '1px solid rgba(232, 177, 74, 0.35)',
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-amber-glow)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(244, 239, 227, 0.85)'; }}
              >
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FR = {
  home: 'Accueil',
  eyebrow: 'Programmation 2026',
  title: 'Activités',
  intro: 'Une fin de semaine entière de tournois, démonstrations, ateliers, contes et spectacles. Voici l’horaire complet et l’éventail d’activités qui vous attendent au festival.',
  scheduleEyebrow: 'Chronique',
  scheduleTitle: 'Horaire et Programmation',
  scheduleMeta: 'Inscriptions',
  scheduleNote: 'L’horaire est sujet à changement sans préavis.',
  scheduleVersion: 'Édition · printemps 2026',
  dayLabel: 'Journée',
  activitiesEyebrow: 'Le grand programme',
  activitiesMeta: 'Activités',
  activitiesTitle: 'Nos Activités',
  activitiesLead: 'Le FMM est fier de présenter une grande variété d’activités pour petits et grands, agréables autant pour les passionnés de médiéval que pour les gens qui ne font que passer.',
  activitiesHint: 'Cliquez sur une tuile pour ouvrir la fiche (bientôt)',
  activitiesFootMeta: 'Bestiaire · 2026',
  filterLabel: 'Filtrer',
  filters: {
    all:      'Tout',
    combat:   'Combat',
    crafts:   'Métiers',
    shows:    'Spectacles',
    ripaille: 'Ripaille',
    family:   'Famille',
  },
  prevCategory: 'Catégorie précédente',
  nextCategory: 'Catégorie suivante',
  meterReady:   'Prêt pour le festival',
  meterTickets: 'Billets restants',
  promptBack:    'Retour',
  promptDetails: 'Détails',
  promptFilter:  'Filtrer',
  promptSelect:  'Réserver',
  vikingsRailName: 'Les Clans restants',
  vikingsMeta: 'Présents',
  vikingsMetaValue: 'III',
  vikingsEyebrow: 'Vous avez aimé l’édition Viking de 2025 ?',
  vikingsTitle: 'Les Clans restants',
  vikingsBody: 'Ces clans sont encore des nôtres cette année.',
  behourdRailName: 'Tournoi de Behourd',
  behourdMeta: 'Édition',
  behourdEyebrow: 'Inscription anticipée',
  behourdTitle: 'Tournoi de Behourd · 2027',
  behourdBody: 'Le Behourd revient au FMM en 2027 — combat médiéval à équipes, en armure complète, dans l’esprit des grands tournois historiques. Les places sont limitées et l’inscription se fait un an à l’avance afin de bien préparer les équipes, l’arène et la sécurité. Remplissez le formulaire ci-dessous puis finalisez votre inscription via Zeffy.',
  championRailName: 'Figure du clan',
  championMeta: 'Rang',
  championRank: 'Jarl',
  championEyebrow: 'Personnage en vedette',
  championName: 'Le Chevalier Vert',
  championEpithet: '« héhéhé comment ça va poto ! »',
  championBody: 'Co-chef du clan Viking Autonome avec Ariane Sigurdsdottir. Au fond des bois, loin de l’électricité, il tient forge et atelier — l’un des piliers vivants du festival. Retrouvez-le au marché ou autour du feu pour entendre les sagas.',
  championCta: 'Visiter son kiosque',
  statClan: 'Clan',
  statClanValue: 'Viking Autonome',
  statSkill: 'Métier',
  statSkillValue: 'Forge · Sagas',
  statSeen: 'Aperçu',
  statSeenValue: 'Marché · Feu · Scène',
  crossRailName: 'Quêtes secondaires',
  crossMeta: 'Disponibles',
  banquetEyebrow: 'Réservation requise',
  banquetTitle: 'Le Banquet de l’Équinoxe',
  banquetBody: 'Un grand banquet sera préparé par les chefs de clans du village gustatif. Le billet pour la grande tablée est vendu séparément des billets d’entrée.',
  banquetCta: 'Voir le menu',
  youthEyebrow: 'Pour les jeunes seigneurs',
  youthTitle: 'Espace Jeunesse',
  youthBody: 'Un espace dédié aux enfants avec une panoplie d’ateliers et activités. Certaines activités nécessitent une inscription.',
  youthCta: 'Inscrire mon enfant',
};

const EN: typeof FR = {
  home: 'Home',
  eyebrow: '2026 Programming',
  title: 'Activities',
  intro: 'A full weekend of tournaments, demonstrations, workshops, storytelling and shows. Below: the complete schedule and the spread of activities awaiting you at the festival.',
  scheduleEyebrow: 'Chronicle',
  scheduleTitle: 'Schedule & Program',
  scheduleMeta: 'Entries',
  scheduleNote: 'Schedule subject to change without notice.',
  scheduleVersion: 'Build · spring 2026',
  dayLabel: 'Day',
  activitiesEyebrow: 'The grand program',
  activitiesMeta: 'Activities',
  activitiesTitle: 'Our Activities',
  activitiesLead: 'FMM is proud to present a wide variety of activities for kids and adults — equally enjoyable for medieval enthusiasts and casual visitors alike.',
  activitiesHint: 'Tap a tile to open the entry (soon)',
  activitiesFootMeta: 'Bestiary · 2026',
  filterLabel: 'Filter',
  filters: {
    all:      'All',
    combat:   'Combat',
    crafts:   'Crafts',
    shows:    'Shows',
    ripaille: 'Feasting',
    family:   'Family',
  },
  prevCategory: 'Previous category',
  nextCategory: 'Next category',
  meterReady:   'Festival readiness',
  meterTickets: 'Tickets remaining',
  promptBack:    'Back',
  promptDetails: 'Details',
  promptFilter:  'Filter',
  promptSelect:  'Reserve',
  vikingsRailName: 'The remaining clans',
  vikingsMeta: 'Present',
  vikingsMetaValue: 'III',
  vikingsEyebrow: 'Loved the 2025 Viking edition?',
  vikingsTitle: 'The remaining clans',
  vikingsBody: 'These clans are still with us this year.',
  behourdRailName: 'Behourd Tournament',
  behourdMeta: 'Edition',
  behourdEyebrow: 'Early registration',
  behourdTitle: 'Behourd Tournament · 2027',
  behourdBody: 'Behourd returns to FMM in 2027 — team-vs-team medieval combat in full armour, in the spirit of historical tournaments. Slots are limited and registration opens one year in advance to properly prepare teams, the arena and safety. Fill in the form below, then finalize your registration via Zeffy.',
  championRailName: 'Clan figure',
  championMeta: 'Rank',
  championRank: 'Jarl',
  championEyebrow: 'Featured character',
  championName: 'The Green Knight',
  championEpithet: '"Hey-hey, how’s it going buddy!"',
  championBody: 'Co-chief of the Autonomous Viking Clan with Ariane Sigurdsdottir. Deep in the northern woods, far from electricity, he tends a forge and a workshop — one of the living pillars of the festival. Find him at the market or around the fire for the sagas.',
  championCta: 'Visit his kiosk',
  statClan: 'Clan',
  statClanValue: 'Autonomous Viking',
  statSkill: 'Trade',
  statSkillValue: 'Forge · Sagas',
  statSeen: 'Seen at',
  statSeenValue: 'Market · Fire · Stage',
  crossRailName: 'Side quests',
  crossMeta: 'Available',
  banquetEyebrow: 'Reservation required',
  banquetTitle: 'The Equinox Banquet',
  banquetBody: 'A great banquet prepared by the clan chefs of the food village. The banquet seat is sold separately from regular entry tickets.',
  banquetCta: 'See the menu',
  youthEyebrow: 'For the young lords',
  youthTitle: 'Youth Space',
  youthBody: 'A dedicated space for children with a panoply of workshops and activities. Some activities require advance registration.',
  youthCta: 'Sign up my child',
};

export default ActivitesPage;
