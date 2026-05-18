import React from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Image as ImageIcon, ArrowUpRight, Sparkles } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';

// ─── Resource entries ─────────────────────────────────────────────────
// Each entry maps to a public asset in /public/ressources/. The user
// uploads the actual files later; the page reads `href` and `comingSoon`
// gates the download button when the file isn't there yet.

type ResourceKind = 'image' | 'archive' | 'pdf';

interface ResourceItem {
  id:          string;
  kind:        ResourceKind;
  titleFR:     string;
  titleEN:     string;
  blurbFR:     string;
  blurbEN:     string;
  href?:       string;       // when missing → "à venir"
  filename?:   string;
  preview?:    string;       // preview image
}

const RESOURCES: ResourceItem[] = [
  {
    id:       'support-border',
    kind:     'image',
    titleFR:  'Bordure de support — « J’y serai ! »',
    titleEN:  '"I’ll be there!" supporter border',
    blurbFR:  'Cadre photo médiéval à appliquer sur votre photo de profil ou publication pour annoncer votre présence au festival. PNG transparent, prêt à coller sur Facebook, Instagram ou en story.',
    blurbEN:  'Medieval frame to overlay on your profile photo or post to announce you’re coming to the festival. Transparent PNG, ready for Facebook, Instagram or stories.',
    href:     '/ressources/fmm-2026-support-border.png',
    filename: 'fmm-2026-support-border.png',
    preview:  '/ressources/fmm-2026-support-border.png',
  },
  {
    id:       'press-kit',
    kind:     'archive',
    titleFR:  'Trousse de presse — FMM 2026',
    titleEN:  '2026 Press Kit',
    blurbFR:  'Communiqué de presse, fiche d’identité, logos haute résolution (noir, blanc, argent, or), photographies des éditions passées et historique des partenariats. ZIP prêt à transmettre aux médias.',
    blurbEN:  'Press release, identity sheet, hi-res logos (black, white, silver, gold), photos from past editions and partnership history. ZIP ready to send to media.',
    href:     '/ressources/fmm-2026-press-kit.zip',
    filename: 'fmm-2026-press-kit.zip',
  },
];

const COMING_SOON_HINT_FR = 'D’autres ressources arrivent : affiche imprimable, bannières web, calendrier des annonces…';
const COMING_SOON_HINT_EN = 'More to come: printable poster, web banners, announcement calendar…';

const RessourcesPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/hero/viking-cinematic.webp"
        orbImagePosition="center 40%"
      />

      <section className="relative py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.libraryEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-2">{t.libraryTitle}</h2>
            <div className="divider-brass w-20 mx-auto mb-4" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft max-w-2xl mx-auto">{t.libraryLead}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {RESOURCES.map((r, i) => (
              <motion.article
                key={r.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className="relative bg-midnight-deep/55 border border-brass/30 rounded-card overflow-hidden flex flex-col"
              >
                <div className="aspect-[16/9] bg-midnight-deep/60 relative overflow-hidden">
                  {r.preview ? (
                    <img
                      src={r.preview}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Placeholder when the asset isn't uploaded yet
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = 'none';
                        const ph = el.nextElementSibling as HTMLElement | null;
                        if (ph) ph.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    aria-hidden
                    className={`absolute inset-0 ${r.preview ? 'hidden' : 'flex'} items-center justify-center bg-gradient-to-br from-brass/15 via-midnight-deep/60 to-brass/5`}
                  >
                    {r.kind === 'image'   && <ImageIcon size={44} className="text-brass/60" />}
                    {r.kind === 'archive' && <Download size={44} className="text-brass/60" />}
                    {r.kind === 'pdf'     && <FileText size={44} className="text-brass/60" />}
                  </div>
                </div>

                <div className="p-6 md:p-7 flex flex-col flex-1">
                  <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-2">
                    {lang === 'FR' ? r.titleFR : r.titleEN}
                  </h3>
                  <div className="divider-brass w-16 mb-3" />
                  <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed mb-5 flex-1">
                    {lang === 'FR' ? r.blurbFR : r.blurbEN}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-auto">
                    <a
                      href={r.href || '#'}
                      download={r.filename}
                      target={r.href ? '_self' : undefined}
                      onClick={(e) => {
                        if (!r.href) { e.preventDefault(); }
                      }}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-card font-sans uppercase tracking-wider text-xs font-semibold transition ${
                        r.href
                          ? 'bg-brass text-midnight-deep hover:bg-brass-soft'
                          : 'bg-midnight-deep/40 border border-ivory-soft/25 text-ivory-soft cursor-not-allowed'
                      }`}
                    >
                      <Download size={14} /> {r.href ? t.download : t.comingSoon}
                    </a>
                    {r.filename && (
                      <span className="font-editorial italic text-[11px] text-ivory-soft/60">
                        {r.filename}
                      </span>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}

            {/* "More to come" placeholder card */}
            <article className="md:col-span-2 bg-midnight-deep/40 border border-dashed border-brass/30 rounded-card p-8 md:p-10 text-center">
              <Sparkles size={28} className="mx-auto mb-3 text-brass/70" />
              <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-2">{t.moreTitle}</h3>
              <p className="font-editorial italic text-sm md:text-base text-ivory-soft max-w-xl mx-auto">
                {lang === 'FR' ? COMING_SOON_HINT_FR : COMING_SOON_HINT_EN}
              </p>
              <p className="font-editorial italic text-xs text-ivory-soft/60 mt-3">
                {t.moreContact}{' '}
                <a href="mailto:admin@festivalmedievaldemontpellier.org" className="text-brass hover:text-brass-soft underline">
                  admin@festivalmedievaldemontpellier.org
                </a>
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Press contact CTA */}
      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.pressEyebrow}</p>
          <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">{t.pressTitle}</h2>
          <div className="divider-brass w-16 mx-auto mb-5" />
          <p className="font-editorial text-base text-ivory-soft mb-6">{t.pressBody}</p>
          <a
            href="mailto:admin@festivalmedievaldemontpellier.org?subject=Demande%20presse%20—%20FMM%202026"
            className="inline-flex items-center gap-2 px-6 py-3 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card"
          >
            {t.pressCta} <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
    </>
  );
};

const FR = {
  eyebrow:        'Pour les supporters, la presse et les partenaires',
  title:          'Ressources',
  intro:          'Tout le nécessaire pour porter les couleurs du Festival Médiéval de Montpellier — bordures pour vos publications, trousse de presse, et plus à venir.',
  libraryEyebrow: 'Téléchargements',
  libraryTitle:   'Bibliothèque',
  libraryLead:    'Téléchargez librement les ressources ci-dessous. Pour toute demande spécifique (format, langue, droits d’usage), écrivez-nous.',
  download:       'Télécharger',
  comingSoon:     'Bientôt disponible',
  moreTitle:      'Et plus à venir',
  moreContact:    'Une ressource manquante&nbsp;?',
  pressEyebrow:   'Médias',
  pressTitle:     'Contact presse',
  pressBody:      'Vous écrivez un article sur le FMM&nbsp;? Vous voulez réaliser un reportage&nbsp;? Écrivez-nous, nous vous orientons vers le bon interlocuteur.',
  pressCta:       'Nous écrire',
};

const EN: typeof FR = {
  eyebrow:        'For supporters, press and partners',
  title:          'Resources',
  intro:          'Everything you need to fly the Festival Médiéval de Montpellier colours — borders for your posts, press kit, and more to come.',
  libraryEyebrow: 'Downloads',
  libraryTitle:   'Library',
  libraryLead:    'Download the resources below freely. For specific requests (format, language, usage rights), reach out.',
  download:       'Download',
  comingSoon:     'Coming soon',
  moreTitle:      'And more to come',
  moreContact:    'Missing a resource?',
  pressEyebrow:   'Media',
  pressTitle:     'Press contact',
  pressBody:      'Writing an article about FMM? Producing a feature? Email us and we’ll route you to the right person.',
  pressCta:       'Email us',
};

export default RessourcesPage;
