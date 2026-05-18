import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';

// ─── Band data ───────────────────────────────────────────────────────
// 2026 lineup (cloned from the Wix /musique page). When the artist has
// a transparent-PNG portrait it goes here too — the component will
// render with the bestiary frame ornaments unobstructed.

interface Band {
  name:        string;
  image:       string;          // current photo (will be replaced by transparent PNG later)
  imageAlt?:   string;
  spotify?:    string;
  website?:    string;
  bioFR:       string;
  bioEN:       string;
}

const BANDS_2026: Band[] = [
  {
    name:  'L’Harfang',
    image: '/wix/musique/407628b7.jpg',
    bioFR: 'Jouant pour le festival depuis le tout début, L’Harfang est un duo de musique folklorique, médiévale, baroque et balfolk moderne. Vielle à roue (Alison Gowan) et musette 16 pouces (Éric Pichette).',
    bioEN: 'Playing the festival since the very beginning, L’Harfang is a folk/medieval/baroque/balfolk duo led by hurdy-gurdy (Alison Gowan) and 16-inch musette bagpipe (Éric Pichette).',
  },
  {
    name:    'Skarazula',
    image:   '/wix/musique/17e5523c.jpg',
    website: 'https://www.skarazula.com',
    bioFR: 'Les musiciens de Skarazula cultivent depuis des années un intérêt pour la musique ancienne et poursuivent leurs recherches dans le monde riche et fascinant de la musique médiévale. Plus d’un instrument dans leur sac — beaucoup confectionnés par le groupe lui-même.',
    bioEN: 'Skarazula’s musicians have cultivated for many years an interest in early music and continue their research into the rich, fascinating world of medieval music. More than one instrument in their bag — many handmade by the group itself.',
  },
  {
    name:    'Mystic Projekt',
    image:   '/wix/musique/1c22d439.jpg',
    website: 'https://mysticprojekt.bandcamp.com',
    bioFR: 'Chants féminins à travers les époques et le monde. Composé des musiciens-clefs de Saltarello (transe nordique abitibienne), Mystic Projekt explore les répertoires folkloriques celte, scandinave, est-européen, les ballades médiévales et les mélodies orientales.',
    bioEN: 'Feminine voices across eras and continents. Built around the key musicians of Saltarello (Nordic-trance, Abitibi), Mystic Projekt explores Celtic, Scandinavian and Eastern European folk repertoires, medieval ballads and oriental melodies.',
  },
  {
    name:  'Arrünn',
    image: '/wix/musique/243cbf3c.jpg',
    bioFR: 'Groupe de musique néo-trad’ folk viking du clan Managarm. « Laissez-vous emmener par le talent, la magie et l’ivresse de ce merveilleux groupe. Un travail soigné tant par le son que par l’image. La passion, la culture et les voyages se ressentent par des lyrics portés par des voix envoûtantes. » — Tristan Reille',
    bioEN: 'Neo-trad Viking folk band from clan Managarm. "Let yourself be carried away by the talent, magic and intoxication of Arrünn. Careful work on stage and behind the camera. Passion, culture and travel come through in lyrics carried by spellbinding voices." — Tristan Reille',
  },
  {
    name:  'Trifolys',
    image: '/wix/musique/2bee56ee.jpg',
    bioFR: 'Explorateurs des racines profondes de la musique dans un contexte historique différent et connexe.',
    bioEN: 'Explorers of music’s deepest roots in a different yet adjacent historical context.',
  },
  {
    name:  'Canteraine',
    image: '/wix/musique/2c6a22e9.jpg',
    bioFR: 'Canteraine — de l’occitan : « lieu où chantent les grenouilles ». Trio féminin alliant tradition française, instruments anciens et écriture contemporaine.',
    bioEN: 'Canteraine — from Occitan: "place where the frogs sing." Female trio bringing together French tradition, early instruments and contemporary writing.',
  },
];

// Past editions — placeholder roster. Replace with the real archive once
// we surface it (probably via Firestore once Tristan ports the historic
// programming list).
const BANDS_PAST: Band[] = [
  {
    name:  'Les Anciens',
    image: '/wix/musique/skarazula.jpg',
    bioFR: 'Anciens compagnons des éditions précédentes — leurs noms et leurs visages reviendront ici dès que la liste d’archives sera prête.',
    bioEN: 'Past companions from previous editions — their names and faces will return here once the archive list is ready.',
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
      {/* ── LB chevron — left ── */}
      <button
        type="button"
        onClick={goPrev}
        aria-label={prevLabel}
        className={`absolute left-0 md:-left-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-2 md:px-3 py-3 md:py-4 group ${isPast ? 'text-stone/70 hover:text-ivory' : 'text-brass hover:text-brass-soft'} transition-colors`}
      >
        <span className="hidden md:flex items-center justify-center w-7 h-7 rounded-md border border-current/40 bg-black/35 font-display title-medieval text-[10px] tracking-widest uppercase shadow-inner group-hover:bg-black/55 transition-colors">
          LB
        </span>
        <ChevronLeft size={32} strokeWidth={1.5} className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
      </button>

      {/* ── RB chevron — right ── */}
      <button
        type="button"
        onClick={goNext}
        aria-label={nextLabel}
        className={`absolute right-0 md:-right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-2 md:px-3 py-3 md:py-4 group ${isPast ? 'text-stone/70 hover:text-ivory' : 'text-brass hover:text-brass-soft'} transition-colors`}
      >
        <ChevronRight size={32} strokeWidth={1.5} className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
        <span className="hidden md:flex items-center justify-center w-7 h-7 rounded-md border border-current/40 bg-black/35 font-display title-medieval text-[10px] tracking-widest uppercase shadow-inner group-hover:bg-black/55 transition-colors">
          RB
        </span>
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
            className="grid lg:grid-cols-12 gap-6 md:gap-10 items-center p-6 md:p-12"
          >
            {/* Portrait — left column */}
            <div className="lg:col-span-6">
              <div className={`relative aspect-[4/5] md:aspect-[3/4] overflow-hidden rounded-card border ${isPast ? 'border-stone/30' : 'border-brass/30'}`}>
                <img
                  src={band.image}
                  alt={band.imageAlt || band.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  style={{ filter: imgFilter }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/hero/viking-cinematic.webp'; }}
                />
                {/* Soft bottom vignette so the page-counter chip reads */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-midnight-deep/85 to-transparent" />
              </div>
            </div>

            {/* Bestiary entry — right column */}
            <div className="lg:col-span-6">
              <p className={`font-editorial italic uppercase tracking-[0.3em] text-[10px] md:text-xs mb-3 ${isPast ? 'text-stone' : 'text-brass'}`}>
                {String(idx + 1).padStart(2, '0')} · {artistLabel}
              </p>
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

const SpotifyIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

// ─── Page ────────────────────────────────────────────────────────────
const MusiquePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <>
      <SEO title={t.title} description={t.intro1} />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro1}
        orbImage="/wix/musique/skarazula.jpg"
        orbImagePosition="left center"
      />

      {/* ── Bands 2026 ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.section2026Eyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-2">{t.section2026Title}</h2>
            <div className="divider-brass w-20 mx-auto mb-4" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft max-w-2xl mx-auto">
              {t.section2026Lead}
            </p>
          </div>
          <BandsCarousel
            bands={BANDS_2026}
            variant="present"
            lang={lang}
            artistLabel={t.artist}
            spotifyLabel={t.spotify}
            websiteLabel={t.website}
            prevLabel={t.prev}
            nextLabel={t.next}
          />
        </div>
      </section>

      {/* ── Bands des Ans Passés ── */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.sectionPastEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory-soft mb-2">{t.sectionPastTitle}</h2>
            <div className="divider-brass w-20 mx-auto mb-4 opacity-50" />
            <p className="font-editorial italic text-base md:text-lg text-ivory-soft/80 max-w-2xl mx-auto">
              {t.sectionPastLead}
            </p>
          </div>
          <BandsCarousel
            bands={BANDS_PAST}
            variant="past"
            lang={lang}
            artistLabel={t.artist}
            spotifyLabel={t.spotify}
            websiteLabel={t.website}
            prevLabel={t.prev}
            nextLabel={t.next}
          />
        </div>
      </section>

      {/* ── Your troupe here CTA ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.callEyebrow}</p>
          <h2 className="font-display title-medieval text-3xl md:text-4xl text-ivory mb-4">{t.callTitle}</h2>
          <div className="divider-brass w-16 mx-auto mb-6" />
          <p className="font-editorial text-base md:text-lg text-ivory-soft mb-8 leading-relaxed">
            {t.callBody}
          </p>
          <Link
            to={addLocale('/musique/inscription', lang)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
            {t.callCta}
            <ArrowUpRight size={14} />
          </Link>
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
  section2026Title:   'Groupes 2026',
  section2026Lead:    'L’Harfang et Skarazula reviennent — accompagnés cette année de Mystic Projekt, Arrünn, Trifolys et Canteraine. Utilisez les chevrons (ou ← →) pour parcourir le bestiaire musical.',
  sectionPastEyebrow: 'Archives',
  sectionPastTitle:   'Groupes des ans passés',
  sectionPastLead:    'Les bardes qui ont animé les éditions précédentes du festival. Galerie en cours de constitution.',
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
  section2026Title:   '2026 Bands',
  section2026Lead:    'L’Harfang and Skarazula return — joined this year by Mystic Projekt, Arrünn, Trifolys and Canteraine. Use the chevrons (or ← →) to browse the musical bestiary.',
  sectionPastEyebrow: 'Archives',
  sectionPastTitle:   'Bands from past years',
  sectionPastLead:    'The bards who animated previous editions of the festival. Gallery being assembled.',
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
