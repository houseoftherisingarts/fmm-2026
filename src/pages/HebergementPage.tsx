import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Tent, Home, ChevronLeft, ChevronRight, MapPin, Caravan } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, ScrollProgress } from '../components/scroll';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';

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

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <ScrollProgress />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/wix/hebergement/tournage-camping.jpg"
        orbImagePosition="center 40%"
      />

      {/* ── Camping section ─────────────────────────────────────────── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="top" />
        <Motes className="opacity-50" count={16} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal className="text-center mb-10 md:mb-14">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.campingEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-2 flex items-center justify-center gap-3">
              <Tent size={28} className="text-brass" /> {t.campingTitle}
            </h2>
            <div className="divider-brass w-20 mx-auto mb-4" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft max-w-2xl mx-auto">
              {t.campingLead}
            </p>
          </Reveal>

          {/* Site map — last year's full festival map, camping emphasised.
              Interactive spot-picking is removed for now; campers pick a
              spot type below and reserve on Zeffy. */}
          <Reveal>
            <figure className="relative rounded-card border border-brass/30 overflow-hidden bg-midnight-deep/40">
              <img
                src="/site/carte-fmm-2025.jpg"
                alt={t.mapAria}
                className="w-full h-auto"
                loading="lazy"
              />
              <figcaption className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-midnight-deep/85 border border-brass/40 font-sans text-[10px] uppercase tracking-widest text-brass">
                <Tent size={12} /> {t.mapCampingTag}
              </figcaption>
            </figure>
            <p className="font-editorial italic text-sm text-ivory-soft/70 text-center mt-3">{t.mapCaption}</p>
          </Reveal>

          {/* Two spot types → reserve on Zeffy. */}
          <div className="grid sm:grid-cols-2 gap-5 md:gap-6 mt-10 md:mt-14 max-w-4xl mx-auto">
            {[
              { Icon: Caravan, title: t.optRvTitle,   body: t.optRvBody },
              { Icon: Tent,    title: t.optTentTitle, body: t.optTentBody },
            ].map(({ Icon, title, body }) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6 }}
                className="velvet-card rounded-card border border-brass/30 bg-midnight-deep/55 p-7 md:p-8 flex flex-col items-center text-center"
              >
                <Icon size={34} className="text-brass mb-4" />
                <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-2">{title}</h3>
                <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed mb-6 flex-1">{body}</p>
                <a
                  href={import.meta.env.VITE_ZEFFY_CAMPING_URL || 'https://www.zeffy.com/fr-CA/ticketing/camping-7'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card"
                >
                  {t.reserveCta} <ArrowUpRight size={14} />
                </a>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hébergement bestiary section ────────────────────────────── */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <Motes className="opacity-40" count={14} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal className="text-center mb-10 md:mb-14">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.lodgingEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-2 flex items-center justify-center gap-3">
              <Home size={26} className="text-brass" /> {t.lodgingTitle}
            </h2>
            <div className="divider-brass w-20 mx-auto mb-4" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft max-w-2xl mx-auto">
              {t.lodgingLead}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <LodgingCarousel lodgings={LODGINGS} lang={lang} t={t} />
          </Reveal>
        </div>
      </section>

      {/* Tagline footer */}
      <section className="py-12 md:py-16">
        <Reveal className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <p className="font-editorial italic text-ivory-soft text-base md:text-lg">{t.callBody}</p>
        </Reveal>
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
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/wix/hebergement/tournage-camping.jpg'; }}
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
  intro:    'Plantez votre tente ou votre roulotte sur le site du festival, ou découvrez nos hébergements partenaires dans la Petite-Nation.',
  campingEyebrow: 'Sur le site',
  campingTitle:   'Camping sur place',
  campingLead:    'Voici le plan du site du festival. Le camping est sur place : choisissez votre type d’emplacement ci-dessous et réservez en ligne.',
  reserveCta:     'Réserver mon emplacement',
  mapAria:        'Plan du site du Festival Médiéval de Montpellier',
  mapCampingTag:  'Zone camping',
  mapCaption:     'Plan du site de l’an dernier. La zone de camping est sur le terrain du festival.',
  optRvTitle:     'Espace caravane / VR',
  optRvBody:      'Pour les roulottes, caravanes et véhicules récréatifs. Stationnez sur place et profitez du festival dès le réveil.',
  optTentTitle:   'Espace tente / petit véhicule',
  optTentBody:    'Pour les tentes et les petits véhicules. Un coin de verdure pour dormir au cœur de l’ambiance médiévale.',
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
  intro:    'Pitch your tent or park your camper on the festival grounds, or discover our partner lodgings in Petite-Nation.',
  campingEyebrow: 'On site',
  campingTitle:   'On-site camping',
  campingLead:    'Here is the festival site map. Camping is on site: choose your spot type below and reserve online.',
  reserveCta:     'Reserve my spot',
  mapAria:        'Festival Médiéval de Montpellier site map',
  mapCampingTag:  'Camping zone',
  mapCaption:     'Last year’s site map. The camping zone is on the festival grounds.',
  optRvTitle:     'Caravan / RV area',
  optRvBody:      'For campers, caravans and recreational vehicles. Park on site and enjoy the festival from the moment you wake up.',
  optTentTitle:   'Tent / small vehicle area',
  optTentBody:    'For tents and small vehicles. A patch of green to sleep right in the heart of the medieval atmosphere.',
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
