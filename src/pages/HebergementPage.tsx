import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Tent, Home, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';

// ─── Camping spot data ────────────────────────────────────────────────
// Placeholder schematic spots — coordinates are arbitrary % of the SVG
// viewBox until the real site map is dropped in. The same data shape
// will plug into the real map: just swap the <svg> background for the
// uploaded map image and align spot polygons over it.

type CampingTier = 'tent' | 'rv' | 'large' | 'cabin';

interface CampingSpot {
  id:    string;            // displayed code, e.g. "A-12"
  tier:  CampingTier;
  // bounding box on the SVG viewBox (0-1000 wide, 0-600 tall)
  x: number; y: number; w: number; h: number;
  pricePerNight: number;    // CAD
}

const CAMPING_SPOTS: CampingSpot[] = [
  // ROW A — small tent loop (left side)
  { id: 'A-01', tier: 'tent', x: 110, y: 100, w: 60, h: 45, pricePerNight: 35 },
  { id: 'A-02', tier: 'tent', x: 180, y: 100, w: 60, h: 45, pricePerNight: 35 },
  { id: 'A-03', tier: 'tent', x: 250, y: 100, w: 60, h: 45, pricePerNight: 35 },
  { id: 'A-04', tier: 'tent', x: 320, y: 100, w: 60, h: 45, pricePerNight: 35 },
  { id: 'A-05', tier: 'tent', x: 110, y: 160, w: 60, h: 45, pricePerNight: 35 },
  { id: 'A-06', tier: 'tent', x: 180, y: 160, w: 60, h: 45, pricePerNight: 35 },
  { id: 'A-07', tier: 'tent', x: 250, y: 160, w: 60, h: 45, pricePerNight: 40 },
  { id: 'A-08', tier: 'tent', x: 320, y: 160, w: 60, h: 45, pricePerNight: 40 },

  // ROW B — large tent / family
  { id: 'B-01', tier: 'large', x: 110, y: 235, w: 90, h: 60, pricePerNight: 55 },
  { id: 'B-02', tier: 'large', x: 210, y: 235, w: 90, h: 60, pricePerNight: 55 },
  { id: 'B-03', tier: 'large', x: 310, y: 235, w: 90, h: 60, pricePerNight: 55 },

  // ROW C — RV / camper-van loop (right side, near road)
  { id: 'C-01', tier: 'rv', x: 540, y: 100, w: 110, h: 55, pricePerNight: 75 },
  { id: 'C-02', tier: 'rv', x: 660, y: 100, w: 110, h: 55, pricePerNight: 75 },
  { id: 'C-03', tier: 'rv', x: 780, y: 100, w: 110, h: 55, pricePerNight: 75 },
  { id: 'C-04', tier: 'rv', x: 540, y: 165, w: 110, h: 55, pricePerNight: 85 },
  { id: 'C-05', tier: 'rv', x: 660, y: 165, w: 110, h: 55, pricePerNight: 85 },
  { id: 'C-06', tier: 'rv', x: 780, y: 165, w: 110, h: 55, pricePerNight: 85 },

  // ROW D — cabins / yurts (back, fewer, more expensive)
  { id: 'D-01', tier: 'cabin', x: 600, y: 330, w: 100, h: 70, pricePerNight: 145 },
  { id: 'D-02', tier: 'cabin', x: 720, y: 330, w: 100, h: 70, pricePerNight: 145 },
  { id: 'D-03', tier: 'cabin', x: 840, y: 330, w: 100, h: 70, pricePerNight: 165 },
];

const TIER_TONE: Record<CampingTier, { fill: string; stroke: string }> = {
  tent:  { fill: 'rgba(176, 141, 58, 0.18)', stroke: 'rgba(212, 168, 87, 0.55)' },
  large: { fill: 'rgba(184, 106, 42, 0.20)', stroke: 'rgba(232, 177, 74, 0.60)' },
  rv:    { fill: 'rgba(91, 143, 214, 0.18)', stroke: 'rgba(140, 184, 232, 0.55)' },
  cabin: { fill: 'rgba(91, 163, 114, 0.20)', stroke: 'rgba(140, 199, 154, 0.60)' },
};

// ─── Hébergement bestiary entries ─────────────────────────────────────
interface Lodging {
  name:     string;
  blurbFR:  string;
  blurbEN:  string;
  image:    string;
  website?: string;
  area?:    string;     // distance / location pointer
}

const LODGINGS: Lodging[] = [
  {
    name:    'Le Salon des Inconnus',
    blurbFR: 'Un de nos partenaires de longue date. Auberge victorienne et centre d’artistes — chambres, bus, yourte et espaces de camping pour la période du festival.',
    blurbEN: 'A long-time partner. Victorian inn and artists’ hub — rooms, bus, yurt and camping spots during the festival.',
    image:   '/wix/hebergement/salon-living-room.jpg',
    website: 'http://www.lesalondesinconnus.com',
    area:    'Montpellier · 10 min',
  },
  {
    name:    'Camping Montpellier',
    blurbFR: 'À proximité du village — 107 acres avec rivière, montagne, chutes et plages. Canoë, kayak, pêche et baignade sur place. 11 km de sentiers de vélo, 5 km de sentiers pédestres. Espace zen, volley-ball, jeux de fer, jeux de fléchettes, feu de camp.',
    blurbEN: 'Near the village — 107 acres with river, mountain, waterfalls and beaches. Canoe, kayak, fishing, swimming on site. 11 km of bike trails, 5 km of hiking trails. Zen space, volleyball, horseshoes, darts, campfire.',
    image:   '/wix/hebergement/camping-montpellier.jpg',
    area:    'Village de Montpellier',
  },
  {
    name:    'Les Chalets d’Aile Laine',
    blurbFR: 'Chalets en bois rond dans la forêt — confort rustique, foyer extérieur, accès direct aux sentiers. Idéal pour les groupes qui souhaitent prolonger le festival.',
    blurbEN: 'Log cabins in the forest — rustic comfort, outdoor firepit, direct trail access. Ideal for groups wanting to extend the festival.',
    image:   '/wix/hebergement/chalets-aile-laine.jpg',
    area:    'Petite-Nation',
  },
  {
    name:    'Manoir Montpellier',
    blurbFR: 'Manoir historique au cœur du village — chambres traditionnelles, petit-déjeuner copieux, accueil chaleureux. Une option élégante pour les visiteurs qui aiment le confort.',
    blurbEN: 'Historic manor at the heart of the village — traditional rooms, hearty breakfast, warm welcome. An elegant option for visitors who love comfort.',
    image:   '/wix/hebergement/manoir-montpellier.jpg',
    area:    'Cœur du village',
  },
  {
    name:    'Gîte Gill Ann',
    blurbFR: 'Maison d’hôtes intimiste tenue par Gill et Ann — quelques chambres, jardin tranquille, déjeuner maison.',
    blurbEN: 'Intimate guesthouse run by Gill and Ann — a few rooms, peaceful garden, homemade breakfast.',
    image:   '/wix/hebergement/gite-gill-ann.jpg',
    area:    'Montpellier',
  },
  {
    name:    'Auberge Montagnes Noires',
    blurbFR: 'Auberge nichée dans les Montagnes Noires — vue panoramique, restauration locale, randonnée. Le repli idéal après une journée au festival.',
    blurbEN: 'Inn nestled in the Montagnes Noires — panoramic view, local dining, hiking. The ideal retreat after a day at the festival.',
    image:   '/wix/hebergement/auberge-montagnes-noires.jpg',
    area:    'Montagnes Noires',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────
const HebergementPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const selected = useMemo(
    () => CAMPING_SPOTS.find((s) => s.id === selectedSpotId) || null,
    [selectedSpotId],
  );

  const tierLabel = (tier: CampingTier) =>
    tier === 'tent'  ? t.tierTent
    : tier === 'large' ? t.tierLarge
    : tier === 'rv'    ? t.tierRv
    :                    t.tierCabin;

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/wix/hebergement/salon-living-room.jpg"
        orbImagePosition="center 55%"
      />

      {/* ── Camping section ─────────────────────────────────────────── */}
      <section className="relative py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.campingEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-2 flex items-center justify-center gap-3">
              <Tent size={28} className="text-brass" /> {t.campingTitle}
            </h2>
            <div className="divider-brass w-20 mx-auto mb-4" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft max-w-2xl mx-auto">
              {t.campingLead}
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            {(Object.keys(TIER_TONE) as CampingTier[]).map((tier) => (
              <div key={tier} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="w-4 h-4 rounded-sm border"
                  style={{ background: TIER_TONE[tier].fill, borderColor: TIER_TONE[tier].stroke }}
                />
                <span className="font-sans text-xs uppercase tracking-wider text-ivory-soft">
                  {tierLabel(tier)}
                </span>
              </div>
            ))}
          </div>

          {/* Map + sidebar */}
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <div className="relative aspect-[16/9] rounded-card border border-brass/30 bg-midnight-deep/60 overflow-hidden">
                {/* TODO: when the real site-map image is uploaded, swap
                    this schematic <svg> background for
                    `<img src="/site/camping-map.jpg" />` underneath the
                    spot polygons. The polygons live in a 1000×600
                    viewBox — keep that viewBox or rescale spot
                    coordinates to match the new image. */}
                <svg
                  viewBox="0 0 1000 600"
                  className="w-full h-full"
                  role="img"
                  aria-label={t.mapAria}
                >
                  {/* Forest base */}
                  <rect width="1000" height="600" fill="rgba(15, 22, 30, 0.7)" />

                  {/* Water — schematic lake bottom-left */}
                  <path
                    d="M 50 480 Q 200 440 350 470 Q 480 500 380 560 Q 250 590 100 560 Q 30 540 50 480 Z"
                    fill="rgba(91, 143, 214, 0.18)"
                    stroke="rgba(140, 184, 232, 0.35)"
                    strokeWidth="1.5"
                  />
                  <text x="180" y="525" fill="rgba(140, 184, 232, 0.7)" fontSize="12" fontFamily="serif" fontStyle="italic">
                    {t.mapLake}
                  </text>

                  {/* Paths */}
                  <rect x="60" y="60" width="880" height="480" fill="none"
                        stroke="rgba(176, 141, 58, 0.18)" strokeDasharray="6 4" strokeWidth="1" />
                  <line x1="460" y1="60" x2="460" y2="540"
                        stroke="rgba(176, 141, 58, 0.18)" strokeDasharray="6 4" strokeWidth="1" />

                  {/* Stage marker */}
                  <g transform="translate(460, 320)">
                    <circle r="24" fill="rgba(184, 106, 42, 0.25)" stroke="rgba(232, 177, 74, 0.7)" strokeWidth="1.5" />
                    <text textAnchor="middle" dy="4" fill="rgba(232, 177, 74, 0.9)" fontSize="11" fontFamily="serif" fontStyle="italic">
                      {t.mapStage}
                    </text>
                  </g>

                  {/* Spots */}
                  {CAMPING_SPOTS.map((s) => {
                    const tone = TIER_TONE[s.tier];
                    const isSel = selectedSpotId === s.id;
                    return (
                      <g
                        key={s.id}
                        onClick={() => setSelectedSpotId(s.id)}
                        style={{ cursor: 'pointer' }}
                        role="button"
                        aria-label={`${t.spot} ${s.id}`}
                        aria-pressed={isSel}
                      >
                        <rect
                          x={s.x} y={s.y} width={s.w} height={s.h}
                          rx="4"
                          fill={isSel ? 'rgba(232, 177, 74, 0.55)' : tone.fill}
                          stroke={isSel ? 'rgba(255, 215, 130, 0.95)' : tone.stroke}
                          strokeWidth={isSel ? 2.5 : 1.25}
                          style={{ transition: 'fill 180ms ease, stroke 180ms ease' }}
                        />
                        <text
                          x={s.x + s.w / 2}
                          y={s.y + s.h / 2 + 4}
                          textAnchor="middle"
                          fill={isSel ? '#0c1118' : 'rgba(244, 235, 213, 0.85)'}
                          fontSize="11"
                          fontFamily="serif"
                          style={{ pointerEvents: 'none' }}
                        >
                          {s.id}
                        </text>
                      </g>
                    );
                  })}

                  {/* Watermark */}
                  <text x="940" y="585" textAnchor="end" fill="rgba(176, 141, 58, 0.4)" fontSize="10" fontFamily="serif" fontStyle="italic">
                    FMM 2026 · {t.mapPlaceholder}
                  </text>
                </svg>
              </div>
            </div>

            {/* Sidebar — selected spot */}
            <aside className="lg:col-span-4">
              <div className="velvet-card rounded-card border border-brass/30 bg-midnight-deep/55 p-6 md:p-7 lg:sticky lg:top-24">
                <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-2">
                  <MapPin size={11} className="inline mr-1 -mt-0.5" />{t.selectionEyebrow}
                </p>
                {selected ? (
                  <motion.div
                    key={selected.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-1">
                      {t.spot} {selected.id}
                    </h3>
                    <p className="font-editorial italic text-sm text-ivory-soft mb-4">
                      {tierLabel(selected.tier)}
                    </p>
                    <div className="divider-brass w-12 mb-4" />
                    <p className="font-sans text-xs uppercase tracking-widest text-ivory-soft/70 mb-1">{t.price}</p>
                    <p className="font-display title-medieval text-2xl text-brass mb-5">
                      {selected.pricePerNight}$ <span className="text-sm text-ivory-soft/70">{t.perNight}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: wire to Stripe/Zeffy checkout once payment
                        // flow is set up. Currently a placeholder hand-off.
                        console.log('[camping] reserve', selected.id);
                        alert(`${t.reserveTodo} ${selected.id}`);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card"
                    >
                      {t.reserveCta} <ArrowUpRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSpotId(null)}
                      className="w-full mt-2 text-[11px] font-sans uppercase tracking-widest text-ivory-soft/60 hover:text-ivory-soft transition"
                    >
                      {t.clearSelection}
                    </button>
                  </motion.div>
                ) : (
                  <p className="font-editorial italic text-sm text-ivory-soft/80">
                    {t.selectionHint}
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Hébergement bestiary section ────────────────────────────── */}
      <section className="relative py-16 md:py-24 bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.lodgingEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-2 flex items-center justify-center gap-3">
              <Home size={26} className="text-brass" /> {t.lodgingTitle}
            </h2>
            <div className="divider-brass w-20 mx-auto mb-4" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft max-w-2xl mx-auto">
              {t.lodgingLead}
            </p>
          </div>

          <LodgingCarousel lodgings={LODGINGS} lang={lang} t={t} />
        </div>
      </section>

      {/* Tagline footer */}
      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <p className="font-editorial italic text-ivory-soft text-base md:text-lg">{t.callBody}</p>
        </div>
      </section>
    </>
  );
};

// ─── Lodging carousel — same bestiary pattern as Musique ──────────────
interface LodgingCarouselProps {
  lodgings: Lodging[];
  lang:     'FR' | 'EN';
  t:        typeof FR;
}
const LodgingCarousel: React.FC<LodgingCarouselProps> = ({ lodgings, lang, t }) => {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const total = lodgings.length;
  const item  = lodgings[idx];

  const goPrev = useCallback(() => { setDir(-1); setIdx((i) => (i - 1 + total) % total); }, [total]);
  const goNext = useCallback(() => { setDir(1);  setIdx((i) => (i + 1) % total);          }, [total]);

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

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="group"
      aria-roledescription={lang === 'FR' ? 'Carrousel d’hébergements' : 'Lodging carousel'}
      aria-label={item.name}
      className="relative outline-none focus-visible:ring-2 focus-visible:ring-brass/40 rounded-card"
    >
      <button
        type="button"
        onClick={goPrev}
        aria-label={t.prev}
        className="absolute left-0 md:-left-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-2 md:px-3 py-3 md:py-4 text-brass hover:text-brass-soft transition-colors group"
      >
        <span className="hidden md:flex items-center justify-center w-7 h-7 rounded-md border border-current/40 bg-black/35 font-display title-medieval text-[10px] tracking-widest uppercase shadow-inner group-hover:bg-black/55 transition-colors">LB</span>
        <ChevronLeft size={32} strokeWidth={1.5} className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
      </button>
      <button
        type="button"
        onClick={goNext}
        aria-label={t.next}
        className="absolute right-0 md:-right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-2 md:px-3 py-3 md:py-4 text-brass hover:text-brass-soft transition-colors group"
      >
        <ChevronRight size={32} strokeWidth={1.5} className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
        <span className="hidden md:flex items-center justify-center w-7 h-7 rounded-md border border-current/40 bg-black/35 font-display title-medieval text-[10px] tracking-widest uppercase shadow-inner group-hover:bg-black/55 transition-colors">RB</span>
      </button>

      <div className="relative mx-8 md:mx-16 border border-brass/40 rounded-card overflow-hidden bg-midnight-deep/55">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={idx}
            custom={dir}
            initial={{ opacity: 0, x: dir * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -dir * 30 }}
            transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
            className="grid lg:grid-cols-12 gap-6 md:gap-10 items-center p-6 md:p-12"
          >
            <div className="lg:col-span-6">
              <div className="relative aspect-[4/5] md:aspect-[3/4] overflow-hidden rounded-card border border-brass/30">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/hero/viking-cinematic.webp'; }}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-midnight-deep/85 to-transparent" />
                {item.area && (
                  <div className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border border-brass/40 bg-midnight-deep/70 text-brass text-[10px] font-sans uppercase tracking-widest">
                    <MapPin size={11} /> {item.area}
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-6">
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] md:text-xs mb-3">
                {String(idx + 1).padStart(2, '0')} · {t.lodging}
              </p>
              <h3 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-3">{item.name}</h3>
              <div className="divider-brass w-24 mb-5" />
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-6">
                {lang === 'FR' ? item.blurbFR : item.blurbEN}
              </p>
              {item.website && (
                <a
                  href={item.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card"
                >
                  {t.book} <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          {lodgings.map((l, i) => (
            <button
              key={l.name}
              type="button"
              onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
              aria-label={l.name}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-8 bg-brass' : 'w-1.5 bg-ivory-soft/30 hover:bg-ivory-soft/60'
              }`}
            />
          ))}
        </div>
        <span className="font-display title-medieval text-xs tracking-widest text-brass">
          {String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

// ─── i18n ─────────────────────────────────────────────────────────────
const FR = {
  eyebrow:  'Sur place et alentours',
  title:    'Camping & Hébergement',
  intro:    'Choisissez votre emplacement de camping sur la carte interactive, ou découvrez nos hébergements partenaires dans la Petite-Nation.',
  campingEyebrow: 'Sur le site',
  campingTitle:   'Camping sur place',
  campingLead:    'Cliquez sur un emplacement de la carte pour le sélectionner et le réserver. Carte schématique en attendant la version finale.',
  tierTent:       'Tente',
  tierLarge:      'Grande tente / Famille',
  tierRv:         'VR / Roulotte',
  tierCabin:      'Chalet / Yourte',
  selectionEyebrow:'Votre sélection',
  selectionHint:  'Cliquez sur un emplacement à gauche pour le sélectionner. Le tarif et le bouton de réservation apparaîtront ici.',
  spot:           'Emplacement',
  price:          'Tarif',
  perNight:       '/ nuit',
  reserveCta:     'Réserver cet emplacement',
  reserveTodo:    'Réservation à venir — paiement à brancher pour l’emplacement',
  clearSelection: 'Annuler la sélection',
  mapAria:        'Carte interactive du camping FMM 2026',
  mapPlaceholder: 'carte schématique',
  mapLake:        'Rivière',
  mapStage:       'Scène',
  lodgingEyebrow: 'Autour du festival',
  lodgingTitle:   'Hébergements partenaires',
  lodgingLead:    'Auberges, chalets et gîtes des environs. Utilisez les chevrons (ou ← →) pour parcourir le bestiaire.',
  lodging:        'Hébergement',
  prev:           'Précédent',
  next:           'Suivant',
  book:           'Réserver',
  callBody:       'Vous ne trouvez pas votre bonheur ? Écrivez-nous à admin@festivalmedievaldemontpellier.org — on connaît tout le monde dans la Petite-Nation.',
};

const EN: typeof FR = {
  eyebrow:  'On site and nearby',
  title:    'Camping & Lodging',
  intro:    'Pick your camping spot on the interactive map, or discover our partner lodgings in Petite-Nation.',
  campingEyebrow: 'On site',
  campingTitle:   'On-site camping',
  campingLead:    'Click a spot on the map to select and reserve it. Schematic map until the final version lands.',
  tierTent:       'Tent',
  tierLarge:      'Large tent / Family',
  tierRv:         'RV / Camper',
  tierCabin:      'Cabin / Yurt',
  selectionEyebrow:'Your selection',
  selectionHint:  'Click a spot on the left to select it. The price and booking button will appear here.',
  spot:           'Spot',
  price:          'Price',
  perNight:       '/ night',
  reserveCta:     'Reserve this spot',
  reserveTodo:    'Booking coming soon — payment to be wired for spot',
  clearSelection: 'Clear selection',
  mapAria:        'Interactive FMM 2026 campsite map',
  mapPlaceholder: 'schematic map',
  mapLake:        'River',
  mapStage:       'Stage',
  lodgingEyebrow: 'Around the festival',
  lodgingTitle:   'Partner lodgings',
  lodgingLead:    'Inns, cabins and B&Bs nearby. Use the chevrons (or ← →) to browse the bestiary.',
  lodging:        'Lodging',
  prev:           'Previous',
  next:           'Next',
  book:           'Book',
  callBody:       'Can’t find what you’re looking for? Email admin@festivalmedievaldemontpellier.org — we know everyone in Petite-Nation.',
};

export default HebergementPage;
