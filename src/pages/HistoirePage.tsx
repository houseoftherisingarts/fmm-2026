import React from 'react';
import { motion } from 'framer-motion';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem, ScrollProgress, Parallax } from '../components/scroll';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';
import {
  IconCastle, IconScroll, IconCamera, IconHourglass, IconTable,
} from '../components/icons/GameIcons';
import { ARCHIVES_LENA, ARCHIVES_ALEX, ARCHIVES_LIEVRE } from '../content/histoireArchives';

// Team, cloned from Wix /histoire "L'organisation". `pos` overrides the
// default vertical crop (object-[center_25%]) when a portrait sits lower
// in its frame (e.g. Léna: too much headroom at 25%).
type TeamMember = {
  name: string; photo: string; pos?: string;
  role: { FR: string; EN: string }; bioFR: string; bioEN: string;
};
const TEAM: TeamMember[] = [
  { name: 'Tristan Côté-Hotte', photo: '/wix/histoire/team/tristan.jpg',  role: { FR: 'Direction générale · Fondateur',                                  EN: 'General direction · Founder' },                          bioFR: '+10 à l’épée, +10 à cheval, +10 en hydromel.',                                                                bioEN: '+10 to sword, +10 to horse, +10 to mead.' },
  { name: 'Jesse Dippy', photo: '/wix/histoire/team/jesse.jpg',         role: { FR: 'Kiosques et marchands',                                            EN: 'Kiosks and vendors' },                                   bioFR: 'Pirate dans l’âme, travailleuse et tanneuse de cuir. Artiste traditionnelle, spécialiste en costumes médiévaux historiques et fantaisie.', bioEN: 'Pirate at heart, leather worker and tanner. Traditional artist, specialist in historical and fantasy medieval costumes.' },
  { name: 'Maïté Fournel', photo: '/wix/histoire/team/maite.jpg',       role: { FR: 'Secrétariat · Bar · Structure',                                    EN: 'Secretary · Bar · Structure' },                          bioFR: 'D’une bonté sans précédent, Maïté s’occupe que tout roule comme sur des charrettes.',                       bioEN: 'Unprecedented kindness, Maïté keeps everything running smoothly.' },
  { name: 'Alex T. St-Laurent', photo: '/wix/histoire/team/alex.jpg',  role: { FR: 'Porte-parole · Site web · Vidéo · Marketing',                      EN: 'Spokesperson · Web · Video · Marketing' },               bioFR: 'Magicien des électroniques. Aubergiste, porte-parole du festival : site web, vidéos, graphisme, recherche, développement, marketing.', bioEN: 'Wizard of electronics. Innkeeper, festival spokesperson: web, video, graphics, R&D, marketing.' },
  { name: 'Océane Leclair', photo: '/wix/histoire/team/oceane.jpg',      role: { FR: 'Artisans',                                                          EN: 'Artisans' },                                              bioFR: 'Personne attentionnée et bienveillante qui s’assure que tous soient bien et confortables.',                  bioEN: 'A caring, attentive person who ensures everyone is comfortable and well.' },
  { name: 'Léna Lebozec', photo: '/wix/histoire/team/lena.jpg', pos: 'object-center', role: { FR: 'Photographie · Réseaux sociaux · Graphisme',                       EN: 'Photography · Socials · Graphics' },                     bioFR: 'Photographe joviale aux multiples talents.',                                                                  bioEN: 'A jovial photographer of many talents.' },
  { name: 'Éric "Pitch" Pichette', photo: '/wix/histoire/team/eric.jpg',role: { FR: 'Musique · Son · Spectacles · Programmation',                       EN: 'Music · Sound · Shows · Programming' },                  bioFR: 'Anime le festival depuis le tout début. Personne au feu roulant et au fun inépuisable.',                     bioEN: 'Has animated the festival since the very start. Endless energy, endless fun.' },
  { name: 'Mikaël Lamarche', photo: '/wix/histoire/team/mikael.jpg',     role: { FR: 'Bâtisseur, palissades, scène, structures bois',                   EN: 'Builder, palisades, stage, wood structures' },          bioFR: 'Si Maïté apporte la structure figurative, son compagnon apporte la structure physique. Le festival tient littéralement debout grâce à lui.', bioEN: 'If Maïté brings the figurative structure, her partner brings the physical one. The festival literally stands thanks to him.' },
];

// Photo credits, names listed on the Wix page.
const CREDITS = [
  'Lena Photos & Aventures',
  'Alex T. St-Laurent',
  'Le Salon des Inconnus',
  'Lievre Photo',
  'Clair du Lièvre',
  'Océane Leclair',
];

const YEARS = [2021, 2022, 2023, 2024, 2025];

// Wayback Machine snapshots of the live (Wix) site for each edition. Only the
// years actually archived in that same year are linked, so the "time machine"
// shows the site as it really was. The 2021-2022 editions predate any archived
// snapshot of the domain, so they stay non-clickable.
const WAYBACK: Record<number, string> = {
  2023: 'https://web.archive.org/web/20230922184640/https://www.festivalmedievaldemontpellier.org/',
  2024: 'https://web.archive.org/web/20240901212537/https://www.festivalmedievaldemontpellier.org/',
  2025: 'https://web.archive.org/web/20250809223540/https://www.festivalmedievaldemontpellier.org/',
};

// Archives photos par photographe. Léna, Alex et Clair du Lièvre viennent
// du pipeline d'import (exports convertis en webp dans
// /public/histoire/archives/); Océane garde la sélection Wix d'origine
// (/public/wix/histoire/). Ordre des groupes fixé par Alex (2026-07-29).
// Chaque groupe se charge par lots (12 d'abord, « Voir plus » ensuite).
const GALLERY_BY_PHOTOGRAPHER: { photographer: string; base: string; photos: string[] }[] = [
  { photographer: 'Lena Photos et Aventures', base: '/histoire/archives/lena/', photos: ARCHIVES_LENA },
  { photographer: 'Alex T. St-Laurent',       base: '/histoire/archives/alex/', photos: ARCHIVES_ALEX },
  { photographer: 'Océane Leclair',           base: '/wix/histoire/', photos: ['75354f34.jpg', '7daad709.jpg', '8f8a1178.jpg', '0ca093b1.jpg', '6b19a593.jpg', '722a8ce4.jpg', '61a24378.jpg', '1e52cafb.jpg'] },
  { photographer: 'Clair du Lièvre',          base: '/histoire/archives/lievre/', photos: ARCHIVES_LIEVRE },
];

const PHOTOS_FIRST_BATCH = 12;
const PHOTOS_BATCH = 24;

// Bande passante : la mosaïque ne charge QUE des vignettes 640px (~30-60 Ko);
// le webp pleine taille (1920px) ne part que si le visiteur clique (lightbox).
// Les groupes venus du pipeline (Léna, Alex) ont un sous-dossier thumb/;
// les sélections Wix historiques restent servies telles quelles.
const thumbSrc = (base: string, file: string) =>
  base.includes('/archives/') ? `${base}thumb/${file}` : `${base}${file}`;

// Un groupe de photographe : masonry en lots, « Voir plus » tant qu'il reste
// des photos. Les groupes vides (manifeste pas encore peuplé) sont masqués.
const PhotographerGroup: React.FC<{
  photographer: string; base: string; photos: string[]; byLabel: string; moreLabel: string;
  onOpen: (src: string, alt: string) => void;
}> = ({ photographer, base, photos, byLabel, moreLabel, onOpen }) => {
  const [count, setCount] = React.useState(PHOTOS_FIRST_BATCH);
  if (photos.length === 0) return null;
  const visible = photos.slice(0, count);
  const rest = photos.length - visible.length;
  return (
    <div className="mb-12 md:mb-14">
      <Reveal>
        <p className="font-editorial uppercase tracking-[0.3em] text-[11px] text-brass/80 mb-1">{byLabel}</p>
        <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-5 flex items-center gap-3">
          {photographer}
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-brass/40 to-transparent" />
          <span className="font-sans text-xs text-stone tracking-widest tabular-nums shrink-0">{photos.length}</span>
        </h3>
      </Reveal>
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4 [&>*]:mb-3 md:[&>*]:mb-4">
        {visible.map((file, i) => (
          <motion.figure
            key={file}
            initial={{ opacity: 0, y: 22, clipPath: 'inset(8% 0 0 0)' }}
            whileInView={{ opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: (i % 4) * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="break-inside-avoid overflow-hidden rounded-card border border-brass/20 group cursor-zoom-in"
            onClick={() => onOpen(`${base}${file}`, `${byLabel} ${photographer}`)}
          >
            <img decoding="async" src={thumbSrc(base, file)} alt={`${byLabel} ${photographer}`} loading="lazy"
              className="w-full h-auto block group-hover:scale-105 transition-transform duration-700" />
          </motion.figure>
        ))}
      </div>
      {rest > 0 && (
        <div className="mt-5">
          <button
            onClick={() => setCount((c) => c + PHOTOS_BATCH)}
            className="inline-flex items-center gap-2 px-5 py-2 border border-brass/50 text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card"
          >
            {moreLabel} ({rest})
          </button>
        </div>
      )}
    </div>
  );
};

// Lightbox minimale : la pleine taille ne se télécharge qu'ici, à la demande.
const PhotoLightbox: React.FC<{ src: string; alt: string; onClose: () => void }> = ({ src, alt, onClose }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-[90] bg-black/92 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 cursor-zoom-out"
      onClick={onClose}
      role="dialog" aria-modal="true"
    >
      <img src={src} alt={alt} className="max-w-[94vw] max-h-[90vh] w-auto h-auto rounded-card border border-brass/30 shadow-2xl" />
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 w-10 h-10 rounded-full border border-ivory-soft/30 text-ivory hover:border-brass hover:text-brass transition font-sans text-lg"
      >
        ✕
      </button>
    </motion.div>
  );
};

// ─── Shared two-column section header band ───────────────────────────
// Layout law (Alex, 2026-07-28): nothing sits alone centered — every
// section opens on a two-column band (title left, lead right) and the
// content below runs full width.
export const SectionBand: React.FC<{
  icon?: React.ReactNode;
  eyebrow: string;
  title: string;
  lead?: React.ReactNode;
  className?: string;
}> = ({ icon, eyebrow, title, lead, className }) => (
  <div className={`grid lg:grid-cols-12 gap-6 lg:gap-12 items-end ${className ?? 'mb-10 md:mb-14'}`}>
    <Reveal as="div" className="lg:col-span-6">
      <p className="font-editorial uppercase tracking-[0.35em] text-[11px] md:text-xs text-brass mb-3 flex items-center gap-2.5">
        {icon}{eyebrow}
      </p>
      <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-[1.05]">{title}</h2>
      <div className="divider-brass w-20 mt-5" />
    </Reveal>
    {lead && (
      <Reveal as="div" className="lg:col-span-6">
        <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed lg:pb-1">{lead}</p>
      </Reveal>
    )}
  </div>
);

// ─── 5 ans d'histoire (chapter opener) ───────────────────────────────
export const HistoireChapterSection: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <section className="relative pt-20 md:pt-28 pb-14 md:pb-20 overflow-hidden">
      <SectionFog edges="top" />
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14">
          <Reveal as="div" className="lg:col-span-5">
            <p className="font-editorial uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3 flex items-center gap-2.5">
              <IconCastle size={15} className="text-brass" />{t.eyebrow}
            </p>
            <h2 className="font-display title-medieval text-4xl md:text-6xl text-ivory leading-[1.04]">{t.title}</h2>
            <div className="divider-brass w-24 mt-5" />
          </Reveal>
          <Reveal as="div" className="lg:col-span-7 lg:pt-3">
            <p className="font-editorial text-lg md:text-xl text-ivory-soft leading-relaxed">{t.intro1}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

// ─── Ni G-N, ni reconstitution ───────────────────────────────────────
export const NiGnSection: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <Motes className="opacity-60" count={20} />
      <SectionFog edges="top" />
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14">
          <div className="lg:col-span-5 min-w-0">
            <Reveal as="div" className="lg:sticky lg:top-28">
              <p className="font-editorial uppercase tracking-[0.35em] text-[11px] md:text-xs text-brass mb-3 flex items-center gap-2.5">
                <IconScroll size={15} />{t.niEyebrow}
              </p>
              {/* « RECONSTITUTION » ne se coupe pas : la taille est clampée
                  pour que le mot tienne dans sa piste à tous les breakpoints. */}
              <h2 className="font-display title-medieval text-3xl md:text-4xl xl:text-5xl text-ivory leading-[1.05]">{t.niTitle}</h2>
              <div className="divider-brass w-20 mt-5" />
            </Reveal>
          </div>
          <Reveal as="div" className="lg:col-span-7 min-w-0 space-y-5">
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.ni1}</p>
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.ni2}</p>
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.ni3}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

// ─── Archives photos (masonry per photographer + credits) ────────────
export const ArchivesPhotosSection: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const [lightbox, setLightbox] = React.useState<{ src: string; alt: string } | null>(null);
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
        <SectionBand
          icon={<IconCamera size={15} />}
          eyebrow={t.galleryEyebrow}
          title={t.photosTitle}
          lead={t.galleryLead}
        />
        {/* Archives, one batched masonry block per photographer */}
        {GALLERY_BY_PHOTOGRAPHER.map((grp) => (
          <PhotographerGroup
            key={grp.photographer}
            photographer={grp.photographer}
            base={grp.base}
            photos={grp.photos}
            byLabel={t.photographerBy}
            moreLabel={t.morePhotos}
            onOpen={(src, alt) => setLightbox({ src, alt })}
          />
        ))}
        {lightbox && <PhotoLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

        <Reveal as="div" className="grid lg:grid-cols-12 gap-4 lg:gap-12 border-t border-brass/15 pt-6">
          <p className="lg:col-span-4 font-editorial uppercase tracking-[0.3em] text-xs text-stone">{t.creditsEyebrow}</p>
          <div className="lg:col-span-8">
            <p className="font-editorial text-base text-ivory-soft">{CREDITS.join(' · ')}</p>
            <p className="font-editorial text-xs text-stone mt-2">{t.iconCredit}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

// ─── Plongez dans nos archives (time machine + Viking film) ──────────
export const PlongezArchivesSection: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const fr = lang === 'FR';
  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-midnight-deep">
      <SectionFog edges="top" />
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
        <SectionBand
          icon={<IconHourglass size={15} />}
          eyebrow={t.galleryEyebrow}
          title={t.galleryTitle}
          lead={t.plongezLead}
        />
        <Stagger className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-14 md:mb-16" stagger={0.07}>
          {YEARS.map((y) => (
            <StaggerItem
              key={y}
              as="div"
              className="glass-light rounded-card p-6 md:p-8 transition group hover:bg-brass/10 hover:-translate-y-1 duration-300"
            >
              {WAYBACK[y] ? (
                <a href={WAYBACK[y]} target="_blank" rel="noopener noreferrer"
                  className="block" title={`${t.edition} ${y}, ${t.viewArchive}`}>
                  <p className="font-display title-medieval text-3xl md:text-4xl text-brass group-hover:text-brass-soft transition">{y}</p>
                  <p className="font-editorial text-[10px] uppercase tracking-[0.18em] text-brass/70 group-hover:text-brass mt-1.5 inline-flex items-center gap-1 transition">
                    {t.viewArchive} <span aria-hidden>↗</span>
                  </p>
                </a>
              ) : (
                <div>
                  <p className="font-display title-medieval text-3xl md:text-4xl text-brass">{y}</p>
                  <p className="font-editorial text-xs text-ivory-soft mt-1">{t.edition}</p>
                </div>
              )}
            </StaggerItem>
          ))}
        </Stagger>

        {/* The Viking short film lives with the archives: the previous
            edition, preserved in motion. */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          <Reveal as="div" className="lg:col-span-4">
            <p className="font-editorial uppercase tracking-[0.3em] text-xs text-brass mb-3">{fr ? 'Le court-métrage' : 'The short film'}</p>
            <h3 className="font-display title-medieval text-2xl md:text-4xl text-ivory mb-4 leading-tight">
              {fr ? 'L’édition Viking en images' : 'The Viking edition in motion'}
            </h3>
            <div className="divider-brass w-16 mb-5" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">
              {fr
                ? 'Vikings, feu et tambours : revivez notre édition précédente. La troupe Hullsborg, elle, revient cette année.'
                : 'Vikings, fire and drums: relive our previous edition. The Hullsborg troupe returns this year.'}
            </p>
          </Reveal>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="lg:col-span-8 rounded-lg-card overflow-hidden border border-brass/30 aspect-video bg-black"
          >
            <video
              src="/orb/vikings.mp4"
              controls
              preload="none"
              poster="/wix/histoire/03b1fe30.jpg"
              playsInline
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// ─── L'équipe ────────────────────────────────────────────────────────
export const EquipeSection: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <Motes className="opacity-50" count={18} />
      <Parallax speed={0.12} className="absolute inset-0 -z-10">
        <div
          className="absolute inset-x-0 top-1/4 h-1/2"
          style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(184,106,42,0.10), transparent 70%)' }}
        />
      </Parallax>
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
        <SectionBand
          icon={<IconTable size={15} />}
          eyebrow={t.teamEyebrow}
          title={t.teamTitle}
          lead={t.teamLead}
        />
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5" stagger={0.05} amount={0.1}>
          {TEAM.map((m) => (
            <StaggerItem
              key={m.name}
              as="article"
              className="glass-light rounded-card p-6 md:p-7 flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
            >
              {m.photo ? (
                <div className="aspect-[4/3] -mx-6 -mt-6 md:-mx-7 md:-mt-7 mb-5 overflow-hidden border-b border-brass/20">
                  <img src={m.photo} alt={m.name} loading="lazy" className={`w-full h-full object-cover ${m.pos ?? 'object-[center_25%]'}`} />
                </div>
              ) : (
                <div className="aspect-[4/3] -mx-6 -mt-6 md:-mx-7 md:-mt-7 mb-5 border-b border-brass/20 bg-midnight-soft/40 flex items-center justify-center">
                  <span className="font-display title-medieval text-4xl text-brass/60">{m.name.charAt(0)}</span>
                </div>
              )}
              <h3 className="font-display title-medieval text-lg md:text-xl text-ivory mb-1">{m.name}</h3>
              <p className="font-editorial text-sm text-brass mb-3">{m.role[lang]}</p>
              <div className="divider-brass w-12 mb-3 opacity-60" />
              <p className="font-editorial text-sm text-ivory-soft leading-relaxed">{lang === 'FR' ? m.bioFR : m.bioEN}</p>
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal as="div" className="grid lg:grid-cols-12 mt-12">
          <p className="lg:col-span-8 lg:col-start-5 font-editorial text-base md:text-lg text-ivory-soft">
            {t.teamClose}
          </p>
        </Reveal>
      </div>
    </section>
  );
};

// ─── Standalone page (kept for completeness; the routed pillar is the
// merged Histoire & Apprendre page, which assembles these sections) ───
const HistoirePage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <>
      {!embedded && <SEO title={t.title} description={t.intro1} />}
      {!embedded && <ScrollProgress />}
      {!embedded && (
        <PageHeader
          eyebrow={t.eyebrow}
          titleA={t.title}
          intro={t.intro1}
          orbImage="/wix/histoire/03b1fe30.jpg"
          orbImagePosition="center"
        />
      )}
      {embedded && <HistoireChapterSection />}
      <NiGnSection />
      <ArchivesPhotosSection />
      <PlongezArchivesSection />
      <EquipeSection />
    </>
  );
};

const FR = {
  home: 'Accueil', eyebrow: 'Notre histoire', title: '5 ans d’histoire',
  intro1: 'Fondé en 2021, le FMM a surmonté l’épreuve de naître pendant la pandémie pour, contre toute attente, devenir l’un des plus grands festivals médiévaux du Québec. Une programmation unique et variée, une formule jusqu’ici inexplorée parmi les festivals d’ici.',
  niEyebrow: 'Une formule unique',
  niTitle: 'Ni G-N, ni reconstitution',
  ni1: 'Le Festival Médiéval de Montpellier est une expérience festive en nature, une activité fort différente d’un GN (jeu de rôle grandeur nature), d’un salon de commerce dans un centre de congrès, ou même d’un événement de reconstitution historique strict.',
  ni2: 'Toutes ces activités offrent une immersion dans le monde médiéval, mais avec des perspectives distinctes. Le GN regroupe des passionnés dans un scénario précis avec des éléments fantastiques. La reconstitution historique se base sur les écrits et vestiges historiques avec un respect extrême de la précision. Le salon de commerce, lui, est souvent en ville pour que les passionnés découvrent et achètent les produits d’artisans.',
  ni3: 'Le FMM tient à se démarquer des autres événements eurocentristes en invitant ses participants à apporter leur héritage. Bien que l’Europe soit sur-représentée dans l’axiome « médiéval », l’époque dite médiévale s’est déroulée partout dans le monde, tous sont bienvenus à exhiber leur culture, qu’ils viennent d’Orient, d’Afrique, d’Amérique ou de toute région dont l’époque médiévale est peu connue du grand public.',
  galleryEyebrow: 'Archives', photosTitle: 'Archives photos', galleryTitle: 'Plongez dans nos archives', photographerBy: 'Photos par',
  galleryLead: 'Cinq éditions immortalisées par nos photographes. Une sélection, classée selon qui l’a captée.',
  plongezLead: 'Cinq éditions, et une machine à remonter le temps : revisitez le site du festival tel qu’il était, année après année, puis revivez l’édition Viking en images.',
  edition: 'Édition', viewArchive: 'Voir l’archive', morePhotos: 'Voir plus de photos',
  creditsEyebrow: 'Crédits photo',
  iconCredit: 'Icônes : game-icons.net (Lorc, Delapouite et contributeurs) · CC BY 3.0',
  teamEyebrow: 'L’organisation', teamTitle: 'L’équipe',
  teamLead: 'Faites défiler pour nous connaître. Le FMM est organisé par des bénévoles qui donnent énormément de leur temps pour créer un festival riche, ludique, inclusif, varié et puissant.',
  teamClose: 'Sans cette équipe, et tous les bénévoles qui s’y joignent les jours du festival, rien de tout cela n’existerait.',
};
const EN = {
  home: 'Home', eyebrow: 'Our story', title: '5 years of history',
  intro1: 'Founded in 2021, FMM survived being born during the pandemic to become, against all odds, one of Quebec’s largest medieval festivals. A unique, varied program; a formula previously unexplored among local festivals.',
  niEyebrow: 'A unique formula',
  niTitle: 'Neither LARP nor re-enactment',
  ni1: 'Festival Médiéval de Montpellier is a festive experience in nature, a very different activity from a LARP (live-action role-play), a trade show in a convention centre, or even a strict historical re-enactment event.',
  ni2: 'All these offer immersion into the medieval world, but with distinct perspectives. LARP gathers enthusiasts in a specific scenario with fantasy elements. Historical re-enactment is based on writings and historical remains with extreme precision. The trade show, in turn, is usually in the city so enthusiasts can discover and buy artisans’ products.',
  ni3: 'FMM stands apart from other Eurocentric events by inviting participants to bring their own heritage. Though Europe is over-represented in the "medieval" axiom, the medieval era unfolded all across the world, all are welcome to showcase their culture, whether they come from the East, Africa, the Americas, or any region whose medieval era is little known to the general public.',
  galleryEyebrow: 'Archives', photosTitle: 'Photo archives', galleryTitle: 'Step into the archives', photographerBy: 'Photos by',
  galleryLead: 'Five editions captured by our photographers. A selection, sorted by who shot it.',
  plongezLead: 'Five editions, and a time machine: revisit the festival site as it was, year after year, then relive the Viking edition in motion.',
  edition: 'Edition', viewArchive: 'View the archive', morePhotos: 'Show more photos',
  creditsEyebrow: 'Photo credits',
  iconCredit: 'Icons: game-icons.net (Lorc, Delapouite and contributors) · CC BY 3.0',
  teamEyebrow: 'The organisation', teamTitle: 'The team',
  teamLead: 'Scroll to get to know us. FMM is organised by volunteers who give enormously of their time to create a rich, playful, inclusive, varied and powerful festival.',
  teamClose: 'Without this team, and all the volunteers who join during festival days, none of this would exist.',
};

export default HistoirePage;
