import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import { watchGroupes, type GroupeMusical, type GroupeJour } from '../firebase/groupesMusicaux';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem, ChapterIntro, ScrollProgress, Parallax } from '../components/scroll';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';

// ─── Band data ───────────────────────────────────────────────────────
// 2026 lineup (cloned from the Wix /musique page). When the artist has
// a transparent-PNG portrait it goes here too — the component will
// render with the bestiary frame ornaments unobstructed.

interface Band {
  name:        string;
  image?:      string;          // absent tant que le portrait n'est pas fourni → panneau orné en attente
  imageAlt?:   string;
  spotify?:    string;
  website?:    string;
  bioFR:       string;
  bioEN:       string;
  jour?:       'vendredi' | 'samedi' | 'dimanche'; // groupes « à l'affiche » seulement
  annee?:      number;          // groupes « archives » seulement — petite étiquette sur la vignette
}

const JOUR_LABELS: Record<NonNullable<Band['jour']>, { FR: string; EN: string }> = {
  vendredi: { FR: 'Vendredi', EN: 'Friday' },
  samedi:   { FR: 'Samedi',   EN: 'Saturday' },
  dimanche: { FR: 'Dimanche', EN: 'Sunday' },
};
const JOUR_ORDRE: Record<GroupeJour, number> = { vendredi: 0, samedi: 1, dimanche: 2 };

// 🚨 Ces six groupes sont ceux des ÉDITIONS PASSÉES. La section les
// présentait comme « Groupes 2026 » par erreur : la programmation 2026
// n'était pas encore annoncée. Photos réassignées le 2026-08-03 selon
// les corrections d'Alex (chaque portrait montre le bon groupe).
const BANDS_ARCHIVES: Band[] = [
  {
    name:  'L’Harfang',
    image: '/wix/musique/407628b7.jpg',
    bioFR: 'Jouant pour le festival depuis le tout début, L’Harfang est un duo de musique folklorique, médiévale, baroque et balfolk moderne. Vielle à roue (Alison Gowan) et musette 16 pouces (Éric Pichette).',
    bioEN: 'Playing the festival since the very beginning, L’Harfang is a folk/medieval/baroque/balfolk duo led by hurdy-gurdy (Alison Gowan) and 16-inch musette bagpipe (Éric Pichette).',
  },
  {
    name:    'Skarazula',
    image:   '/wix/musique/2c6a22e9.jpg',
    website: 'https://www.skarazula.com',
    bioFR: 'Les musiciens de Skarazula cultivent depuis des années un intérêt pour la musique ancienne et poursuivent leurs recherches dans le monde riche et fascinant de la musique médiévale. Plus d’un instrument dans leur sac — beaucoup confectionnés par le groupe lui-même.',
    bioEN: 'Skarazula’s musicians have cultivated for many years an interest in early music and continue their research into the rich, fascinating world of medieval music. More than one instrument in their bag — many handmade by the group itself.',
  },
  {
    name:    'Mystic Projekt',
    image:   '/wix/musique/2bee56ee.jpg',
    website: 'https://mysticprojekt.bandcamp.com',
    bioFR: 'Chants féminins à travers les époques et le monde. Composé des musiciens-clefs de Saltarello (transe nordique abitibienne), Mystic Projekt explore les répertoires folkloriques celte, scandinave, est-européen, les ballades médiévales et les mélodies orientales.',
    bioEN: 'Feminine voices across eras and continents. Built around the key musicians of Saltarello (Nordic-trance, Abitibi), Mystic Projekt explores Celtic, Scandinavian and Eastern European folk repertoires, medieval ballads and oriental melodies.',
  },
  {
    name:  'Arrünn',
    // Plan du vidéoclip « Sleipnir » : les cavaliers dans les hautes
    // herbes. C'est LA photo du groupe, dixit Alex (2026-08-03).
    image: '/wix/musique/715b30c7.png',
    bioFR: 'Groupe de musique néo-trad’ folk viking du clan Managarm. « Laissez-vous emmener par le talent, la magie et l’ivresse de ce merveilleux groupe. Un travail soigné tant par le son que par l’image. La passion, la culture et les voyages se ressentent par des lyrics portés par des voix envoûtantes. » — Tristan Reille',
    bioEN: 'Neo-trad Viking folk band from clan Managarm. "Let yourself be carried away by the talent, magic and intoxication of Arrünn. Careful work on stage and behind the camera. Passion, culture and travel come through in lyrics carried by spellbinding voices." — Tristan Reille',
  },
  {
    name:  'Trifolys',
    image: '/wix/musique/243cbf3c.jpg',
    bioFR: 'Explorateurs des racines profondes de la musique dans un contexte historique différent et connexe.',
    bioEN: 'Explorers of music’s deepest roots in a different yet adjacent historical context.',
  },
  {
    name:  'Canteraine',
    image: '/wix/musique/1c22d439.jpg',
    bioFR: 'Canteraine — de l’occitan : « lieu où chantent les grenouilles ». Trio féminin alliant tradition française, instruments anciens et écriture contemporaine.',
    bioEN: 'Canteraine — from Occitan: "place where the frogs sing." Female trio bringing together French tradition, early instruments and contemporary writing.',
  },
];

// ── L'affiche 2026, par journée ─────────────────────────────────────
// Liste d'Éric Pichette, confirmée et orthographes vérifiées le
// 2026-08-04 : Fuego Bohemio (spectacle de la Troupe Caravane), Svarica
// (pas Svarika). Encore en construction : d'autres noms s'ajouteront.
const AFFICHE_2026_BANDS: Band[] = [
  {
    name:  'Fuego Bohemio',
    jour:  'vendredi',
    bioFR: 'Spectacle festif de musique et de danse gitane porté par la troupe CARAVANE : rumba flamenca, chants romani et danses improvisées.',
    bioEN: 'A festive show of music and gypsy dance carried by the CARAVANE troupe: rumba flamenca, Romani songs and improvised dances.',
  },
  {
    name:    'Skarazula',
    jour:    'vendredi',
    image:   '/wix/musique/2c6a22e9.jpg',
    website: 'https://www.skarazula.com',
    bioFR: 'Les musiciens de Skarazula cultivent depuis des années un intérêt pour la musique ancienne et poursuivent leurs recherches dans le monde riche et fascinant de la musique médiévale. Plus d’un instrument dans leur sac, plusieurs confectionnés par le groupe lui-même.',
    bioEN: 'Skarazula’s musicians have cultivated for many years an interest in early music and continue their research into the rich, fascinating world of medieval music. More than one instrument in their bag, many handmade by the group itself.',
  },
  {
    name:  'St-Nigoune',
    jour:  'vendredi',
    bioFR: 'Portrait et description à venir.',
    bioEN: 'Portrait and description to come.',
  },
  {
    name:  'Bic Oasis',
    jour:  'samedi',
    bioFR: 'Portrait et description à venir.',
    bioEN: 'Portrait and description to come.',
  },
  {
    name:  'L’Harfang',
    jour:  'samedi',
    image: '/wix/musique/407628b7.jpg',
    bioFR: 'Jouant pour le festival depuis le tout début, L’Harfang est un duo de musique folklorique, médiévale, baroque et balfolk moderne. Vielle à roue (Alison Gowan) et musette 16 pouces (Éric Pichette).',
    bioEN: 'Playing the festival since the very beginning, L’Harfang is a folk/medieval/baroque/balfolk duo led by hurdy-gurdy (Alison Gowan) and 16-inch musette bagpipe (Éric Pichette).',
  },
  {
    name:  'Trifolys',
    jour:  'samedi',
    image: '/wix/musique/243cbf3c.jpg',
    bioFR: 'Explorateurs des racines profondes de la musique dans un contexte historique différent et connexe.',
    bioEN: 'Explorers of music’s deepest roots in a different yet adjacent historical context.',
  },
  {
    name:  'Svarica',
    jour:  'samedi',
    bioFR: 'Né autour du feu du campement des Cordelian à Bicolline, Svarica marie rythmes tziganes, klezmer et ska festif : guitares, hautbois, accordéon, trombone et batterie, avec un seul objectif, faire danser.',
    bioEN: 'Born around the fire of the Cordelian camp at Bicolline, Svarica weds Romani rhythms, klezmer and festive ska: guitars, oboe, accordion, trombone and drums, with one goal, to make you dance.',
  },
  {
    name:  'Las Noches Bohemios',
    jour:  'dimanche',
    bioFR: 'Portrait et description à venir.',
    bioEN: 'Portrait and description to come.',
  },
  {
    name:  'Alhambra',
    jour:  'dimanche',
    bioFR: 'Portrait et description à venir.',
    bioEN: 'Portrait and description to come.',
  },
];

// ─── Bestiary carousel ───────────────────────────────────────────────
// Witcher-inspired single-entry-at-a-time view. LB/RB chevrons + ← →
// keyboard nav + page counter. Variant changes the frame palette so
// the past-bands section reads as faded archive vs the live 2026 grid.

type BandsCarouselVariant = 'present' | 'past';

interface BandsCarouselProps {
  bands:   Band[];
  variant: BandsCarouselVariant;
  lang:    'FR' | 'EN';
  // i18n strings injected from the parent (avoids duplicating FR/EN
  // dictionaries inside this component).
  artistLabel: string;
  spotifyLabel: string;
  websiteLabel: string;
  prevLabel: string;
  nextLabel: string;
}

const BandsCarousel: React.FC<BandsCarouselProps> = ({
  bands, variant, lang, artistLabel, spotifyLabel, websiteLabel, prevLabel, nextLabel,
}) => {
  const [idx, setIdx] = useState(0);
  // Direction tracked so the framer-motion variants can slide either way
  // depending on whether we navigated forward or backward.
  const [dir, setDir] = useState<1 | -1>(1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const total = bands.length;
  const band  = bands[idx];

  const goPrev = useCallback(() => {
    setDir(-1);
    setIdx((i) => (i - 1 + total) % total);
  }, [total]);
  const goNext = useCallback(() => {
    setDir(1);
    setIdx((i) => (i + 1) % total);
  }, [total]);

  // Keyboard ← / → when the carousel is focused / in viewport.
  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  // Variant tokens — past edition reads as muted sepia archive.
  const isPast = variant === 'past';
  const frameClass = isPast
    ? 'border-stone/30 bg-midnight-deep/40'
    : 'border-brass/40 bg-midnight-deep/55';
  const imgFilter = isPast ? 'sepia(0.45) saturate(0.7) brightness(0.92) contrast(1.05)' : 'none';
  const counterClass = isPast ? 'text-stone/70' : 'text-brass';

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="group"
      aria-roledescription={lang === 'FR' ? 'Carrousel de groupes' : 'Bands carousel'}
      aria-label={band.name}
      className="relative outline-none focus-visible:ring-2 focus-visible:ring-brass/40 rounded-card"
    >
      {/* ── left arrow — prev ── */}
      <button
        type="button"
        onClick={goPrev}
        aria-label={prevLabel}
        className={`absolute left-0 md:-left-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-2 md:px-3 py-3 md:py-4 group ${isPast ? 'text-stone/70 hover:text-ivory' : 'text-brass hover:text-brass-soft'} transition-colors`}
      >
        <span className="hidden md:flex items-center justify-center w-7 h-7 rounded-md border border-current/40 bg-black/35 font-display title-medieval text-[10px] tracking-widest uppercase shadow-inner group-hover:bg-black/55 transition-colors">←</span>
        <ChevronLeft size={32} strokeWidth={1.5} className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
      </button>

      {/* ── right arrow — next ── */}
      <button
        type="button"
        onClick={goNext}
        aria-label={nextLabel}
        className={`absolute right-0 md:-right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-2 md:px-3 py-3 md:py-4 group ${isPast ? 'text-stone/70 hover:text-ivory' : 'text-brass hover:text-brass-soft'} transition-colors`}
      >
        <ChevronRight size={32} strokeWidth={1.5} className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
        <span className="hidden md:flex items-center justify-center w-7 h-7 rounded-md border border-current/40 bg-black/35 font-display title-medieval text-[10px] tracking-widest uppercase shadow-inner group-hover:bg-black/55 transition-colors">→</span>
      </button>

      {/* ── Bestiary frame — corners + brass divider ── */}
      <div className={`relative mx-8 md:mx-16 border rounded-card overflow-hidden ${frameClass}`}>
        {/* Corner ornaments — small filigree marks at each corner */}
        <CornerOrnament className="absolute top-2 left-2"     variant={variant} />
        <CornerOrnament className="absolute top-2 right-2"    variant={variant} flipX />
        <CornerOrnament className="absolute bottom-2 left-2"  variant={variant} flipY />
        <CornerOrnament className="absolute bottom-2 right-2" variant={variant} flipX flipY />

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${variant}-${idx}`}
            custom={dir}
            initial={{ opacity: 0, x: dir * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -dir * 30 }}
            transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
            className="flex flex-col"
          >
            {/* Photo pleine largeur : les portraits de groupes sont des
                paysages; la colonne 4/5 les coupait (correction d'Alex,
                2026-08-03). Bandeau 16/9 sur toute la largeur du cadre.
                Sans portrait fourni, un panneau orné tient la place
                (jamais d'image cassée). */}
            <div className={`relative w-full aspect-video overflow-hidden border-b ${isPast ? 'border-stone/30' : 'border-brass/30'}`}>
              {band.image ? (
                <>
                  <img
                    src={band.image}
                    alt={band.imageAlt || band.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    style={{ filter: imgFilter }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/wix/musique/skarazula.webp'; }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-midnight-deep/85 to-transparent" />
                </>
              ) : (
                <PortraitPlaceholder variant={variant} label={lang === 'FR' ? 'Portrait à venir' : 'Portrait coming soon'} />
              )}
            </div>

            {/* Fiche du bestiaire, sous la photo */}
            <div className="p-6 md:p-10">
              <p className={`font-editorial italic uppercase tracking-[0.3em] text-[10px] md:text-xs mb-3 ${isPast ? 'text-stone' : 'text-brass'}`}>
                {String(idx + 1).padStart(2, '0')} · {artistLabel}
              </p>
              {band.jour && (
                <span
                  className={`inline-block mb-3 px-3 py-1 rounded-full border font-sans text-[10px] md:text-xs uppercase tracking-widest font-semibold ${
                    isPast ? 'border-stone/40 text-stone' : 'border-brass/50 bg-brass/10 text-brass'
                  }`}
                >
                  {lang === 'FR' ? JOUR_LABELS[band.jour].FR : JOUR_LABELS[band.jour].EN}
                </span>
              )}
              <h3 className={`font-display title-medieval text-3xl md:text-5xl mb-3 ${isPast ? 'text-ivory-soft' : 'text-ivory'}`}>
                {band.name}
              </h3>
              <div className={`divider-brass w-24 mb-5 ${isPast ? 'opacity-50' : ''}`} />
              <p className={`font-editorial text-base md:text-lg leading-relaxed mb-6 ${isPast ? 'text-ivory-soft/80' : 'text-ivory-soft'}`}>
                {lang === 'FR' ? band.bioFR : band.bioEN}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {band.spotify && (
                  <a
                    href={band.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-card bg-[#1DB954]/15 border border-[#1DB954]/60 text-[#1DB954] hover:bg-[#1DB954]/25 transition font-sans uppercase tracking-wider text-xs font-semibold"
                  >
                    <SpotifyIcon />
                    {spotifyLabel}
                  </a>
                )}
                {band.website && (
                  <a
                    href={band.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-widest text-brass hover:text-brass-soft transition group"
                  >
                    {websiteLabel}
                    <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Page indicator — dots + counter ── */}
      <div className="mt-5 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          {bands.map((b, i) => (
            <button
              key={b.name}
              type="button"
              onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
              aria-label={b.name}
              className={`h-1.5 rounded-full transition-all ${
                i === idx
                  ? (isPast ? 'w-8 bg-stone' : 'w-8 bg-brass')
                  : 'w-1.5 bg-ivory-soft/30 hover:bg-ivory-soft/60'
              }`}
            />
          ))}
        </div>
        <span className={`font-display title-medieval text-xs tracking-widest ${counterClass}`}>
          {String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

// ─── Decorations ─────────────────────────────────────────────────────
const CornerOrnament: React.FC<{
  className?: string;
  variant:    BandsCarouselVariant;
  flipX?:     boolean;
  flipY?:     boolean;
}> = ({ className = '', variant, flipX, flipY }) => {
  const color = variant === 'past' ? '#7a7569' : 'rgb(var(--brass-rgb, 184 141 74))';
  const transform = `${flipX ? 'scaleX(-1) ' : ''}${flipY ? 'scaleY(-1)' : ''}`.trim();
  return (
    <svg
      viewBox="0 0 32 32"
      width="22"
      height="22"
      aria-hidden
      className={`pointer-events-none ${className}`}
      style={{ transform, opacity: 0.55 }}
      fill="none"
      stroke={color}
      strokeWidth="1.25"
    >
      <path d="M2 14 L2 2 L14 2" />
      <path d="M6 10 L6 6 L10 6" strokeOpacity="0.6" />
      <circle cx="2" cy="2" r="1.2" fill={color} stroke="none" />
    </svg>
  );
};

// Panneau orné remplaçant la photo quand aucun portrait n'a encore été
// fourni (plusieurs groupes de l'affiche 2026) — même format 16/9, jamais
// d'image cassée.
const PortraitPlaceholder: React.FC<{ variant: BandsCarouselVariant; label: string }> = ({ variant, label }) => {
  const isPast = variant === 'past';
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br ${
        isPast ? 'from-stone/10 via-midnight-deep to-black' : 'from-brass/10 via-midnight-deep to-black'
      }`}
    >
      <LyreMark className={isPast ? 'text-stone/40' : 'text-brass/50'} />
      <span className={`font-editorial italic text-xs md:text-sm tracking-[0.25em] uppercase ${isPast ? 'text-stone/50' : 'text-brass/60'}`}>
        {label}
      </span>
    </div>
  );
};

const LyreMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" width="48" height="48" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M18 50 C10 40 10 20 20 10" />
    <path d="M46 50 C54 40 54 20 44 10" />
    <path d="M20 10 C24 16 24 22 20 28" />
    <path d="M44 10 C40 16 40 22 44 28" />
    <line x1="24" y1="14" x2="24" y2="48" strokeWidth="1" opacity="0.7" />
    <line x1="30" y1="12" x2="30" y2="50" strokeWidth="1" opacity="0.7" />
    <line x1="36" y1="12" x2="36" y2="50" strokeWidth="1" opacity="0.7" />
    <line x1="42" y1="14" x2="42" y2="48" strokeWidth="1" opacity="0.7" />
    <path d="M14 52 L50 52 L46 58 L18 58 Z" />
  </svg>
);

const SpotifyIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

// ─── Archives — grille compacte ─────────────────────────────────────
// Simple consultation, pas de carrousel : petites cartes, teinte estompée.
const ArchiveCard: React.FC<{ band: Band; lang: 'FR' | 'EN' }> = ({ band, lang }) => (
  <div className="rounded-card border border-stone/25 bg-midnight-deep/35 overflow-hidden transition-colors hover:border-stone/45">
    <div className="relative w-full aspect-video overflow-hidden">
      <img
        src={band.image || '/wix/musique/skarazula.webp'}
        alt={band.imageAlt || band.name}
        className="w-full h-full object-cover"
        loading="lazy"
        style={{ filter: 'sepia(0.45) saturate(0.7) brightness(0.92) contrast(1.05)' }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/wix/musique/skarazula.webp'; }}
      />
      {band.annee && (
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 border border-stone/40 font-sans text-[10px] uppercase tracking-widest text-stone">
          {band.annee}
        </span>
      )}
    </div>
    <div className="p-4 md:p-5">
      <h3 className="font-display title-medieval text-lg md:text-xl text-ivory-soft mb-1.5">{band.name}</h3>
      <p className="font-editorial text-sm text-ivory-soft/70 leading-snug line-clamp-2">
        {lang === 'FR' ? band.bioFR : band.bioEN}
      </p>
      {band.website && (
        <a
          href={band.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-sans text-[11px] uppercase tracking-widest text-stone hover:text-ivory-soft transition"
        >
          {lang === 'FR' ? 'Site web' : 'Website'}
          <ArrowUpRight size={12} />
        </a>
      )}
    </div>
  </div>
);

// ─── Page ────────────────────────────────────────────────────────────
const MusiquePage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  // ── Les groupes vivent dans Firestore (gérés par Éric Pichette dans
  //    l'admin, temps réel). Tant que la collection est vide, les
  //    listes statiques ci-dessus font foi : le jour où Éric ajoute son
  //    premier groupe, sa liste prend le dessus sans redéploiement.
  const [groupes, setGroupes] = useState<GroupeMusical[]>([]);
  useEffect(() => watchGroupes(setGroupes), []);

  const afficheLive = useMemo(() => {
    const surAffiche = groupes.filter((g) => g.statut === 'affiche');
    if (surAffiche.length === 0) return null;
    return surAffiche
      .sort((a, b) => {
        const ai = a.jour ? JOUR_ORDRE[a.jour] : 99;
        const bi = b.jour ? JOUR_ORDRE[b.jour] : 99;
        return ai !== bi ? ai - bi : a.ordre - b.ordre;
      })
      .map((g): Band => ({
        name:  g.nom,
        image: g.photoUrl,
        website: g.site,
        bioFR: g.bioFR,
        bioEN: g.bioEN,
        jour:  g.jour,
      }));
  }, [groupes]);

  const archivesLive = useMemo(() => {
    const arch = groupes.filter((g) => g.statut === 'archive');
    if (arch.length === 0) return null;
    return arch
      .sort((a, b) => (b.annee ?? 0) - (a.annee ?? 0) || a.ordre - b.ordre)
      .map((g): Band => ({
        name:  g.nom,
        image: g.photoUrl,
        website: g.site,
        bioFR: g.bioFR,
        bioEN: g.bioEN,
        annee: g.annee,
      }));
  }, [groupes]);

  const affiche = afficheLive ?? AFFICHE_2026_BANDS;
  const archives = archivesLive ?? BANDS_ARCHIVES;

  return (
    <>
      {!embedded && <SEO title={t.title} description={t.intro1} />}
      {!embedded && <ScrollProgress />}
      {embedded ? (
        <section id="musique" className="relative pt-20 md:pt-28 pb-2">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">{t.eyebrow}</p>
            <h2 className="font-display title-medieval text-4xl md:text-6xl text-ivory leading-[1.04]">{t.title}</h2>
            <div className="divider-brass w-24 mt-5" />
          </div>
        </section>
      ) : (
        <PageHeader
          eyebrow={t.eyebrow}
          titleA={t.title}
          intro={t.intro1}
          orbImage="/wix/musique/skarazula.webp"
          orbImagePosition="left center"
        />
      )}

      {/* ── Bands 2026 ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <Motes className="opacity-50" count={16} />
        <SectionFog edges="top" />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <ChapterIntro
            eyebrow={t.section2026Eyebrow}
            title={t.section2026Title}
            lead={t.section2026Lead}
            className="mb-10 md:mb-14"
          />
          <Reveal from="up" delay={0.1}>
            <BandsCarousel
              bands={affiche}
              variant="present"
              lang={lang}
              artistLabel={t.artist}
              spotifyLabel={t.spotify}
              websiteLabel={t.website}
              prevLabel={t.prev}
              nextLabel={t.next}
            />
          </Reveal>
          <p className="mt-6 text-center font-editorial italic text-sm md:text-base text-ivory-soft/70">
            {t.section2026Note}
          </p>
        </div>
      </section>

      {/* ── Bands des Ans Passés — archive compacte, pas de carrousel ── */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <Motes className="opacity-30" count={10} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal className="text-center mb-10 md:mb-14 max-w-2xl mx-auto">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.sectionPastEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory-soft mb-2">{t.sectionPastTitle}</h2>
            <div className="divider-brass w-20 mx-auto mb-4 opacity-50" />
            <p className="font-editorial italic text-base md:text-lg text-ivory-soft/80 max-w-2xl mx-auto">
              {t.sectionPastLead}
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {archives.map((band: Band, bi: number) => (
              <Reveal key={band.name} from="up" delay={0.08 + bi * 0.05}>
                <ArchiveCard band={band} lang={lang} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Your troupe here CTA ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <Parallax speed={0.12} className="absolute inset-0 -z-10">
          <div
            className="absolute inset-x-0 top-1/4 h-1/2"
            style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(184,141,74,0.10), transparent 70%)' }}
          />
        </Parallax>
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 text-center">
          <ChapterIntro
            eyebrow={t.callEyebrow}
            title={t.callTitle}
            className="mb-6"
          />
          <Stagger stagger={0.1} delayChildren={0.1} className="flex flex-col items-center gap-6">
            <StaggerItem>
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">
                {t.callBody}
              </p>
            </StaggerItem>
            <StaggerItem>
              <Link
                to={addLocale('/musique/inscription', lang)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                {t.callCta}
                <ArrowUpRight size={14} />
              </Link>
            </StaggerItem>
          </Stagger>
        </div>
      </section>
    </>
  );
};

// ─── i18n ────────────────────────────────────────────────────────────
const FR = {
  home: 'Accueil',
  eyebrow: 'Programmation musicale 2026',
  title: 'Musique',
  intro1: 'Derrière le théâtre, le cinéma, derrière les histoires, autour des ronds de feu, derrière les révolutions ou simplement pour mettre de l’ambiance dans ton salon — la musique est là, pour te tenir compagnie. Ici, nous rendons hommage aux bardes qui animeront ce weekend grandiose.',
  section2026Eyebrow: 'Programmation 2026',
  section2026Title:   'À l’affiche cette année',
  section2026Lead:    'Les premiers noms de l’édition 2026, journée par journée. La programmation se complète encore : d’autres bardes s’ajouteront.',
  section2026Note:    'Programmation en cours. Les horaires de passage seront annoncés sous peu.',
  sectionPastEyebrow: 'Archives',
  sectionPastTitle:   'Groupes des ans passés',
  sectionPastLead:    'Les bardes qui ont animé les éditions précédentes du festival. Utilisez les chevrons (ou ← →) pour parcourir le bestiaire musical.',
  artist:  'Artiste',
  spotify: 'Écouter sur Spotify',
  website: 'Site web',
  prev:    'Groupe précédent',
  next:    'Groupe suivant',
  callEyebrow: 'Appel aux bardes',
  callTitle:   'Votre troupe ici',
  callBody:    'Le FMM est toujours à la recherche de nouveaux talents anciens. Si vous pensez que votre formation peut apporter une nouvelle corde à notre vielle, contactez-nous.',
  callCta:     'Soumettre ma candidature',
};

const EN = {
  home: 'Home',
  eyebrow: '2026 music programming',
  title: 'Music',
  intro1: 'Behind theater, cinema, behind stories, around fire circles, behind revolutions or just to set the mood in your living room — music is there to keep you company. Here we honour the bards who will animate this grand weekend.',
  section2026Eyebrow: '2026 programming',
  section2026Title:   'On this year’s bill',
  section2026Lead:    'The first names of the 2026 edition, day by day. The lineup is still growing: more bards will join.',
  section2026Note:    'Lineup in progress. Set times will be announced shortly.',
  sectionPastEyebrow: 'Archives',
  sectionPastTitle:   'Bands from past years',
  sectionPastLead:    'The bards who animated previous editions of the festival. Use the chevrons (or ← →) to browse the musical bestiary.',
  artist:  'Artist',
  spotify: 'Listen on Spotify',
  website: 'Website',
  prev:    'Previous band',
  next:    'Next band',
  callEyebrow: 'Call for bards',
  callTitle:   'Your troupe here',
  callBody:    'FMM is always seeking new ancient talent. If you think your formation can add a new string to our hurdy-gurdy, please reach out.',
  callCta:     'Submit my application',
};

export default MusiquePage;
