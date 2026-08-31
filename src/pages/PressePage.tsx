import React, { useState } from 'react';
import { Check, Download, Mail, Phone, Share2 } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { SITE } from '../content';
import { useCaravanPage } from '../lib/useCaravanPage';
import {
  CARTES_EN,
  CARTES_FR,
  CARTES_POSTALES,
  LOGOS,
  PRESSE_ZIP,
  pleineRes,
  vignette,
  type PresseAsset,
} from '../content/presse';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import {
  ChevronButton,
  DisplayTitle,
  Eyebrow,
  GildedFrame,
  HexPanel,
} from '../components/marche/atmospherics';

// ─── PressePage ──────────────────────────────────────────────────────
// La salle de presse du festival : les faits en haut, puis les images
// à télécharger. Un journaliste, un blogueur ou un partenaire arrive
// ici, prend ce qu'il lui faut et repart sans écrire à personne.
//
// Quatre routes mènent à cette page en français (/presse, /presskit,
// /press-kit) et autant en anglais : Alex veut que le raccourci
// festivalmedieval.org/presskit tombe juste, peu importe la façon dont
// il l'écrit dans un courriel.
//
// Les tuiles affichent une vignette WebP de 640 px; le bouton
// Télécharger sert le PNG 1920 × 1080. Voir src/content/presse.ts.

const PressePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const cartes = lang === 'FR' ? CARTES_FR : CARTES_EN;

  // Le fichier dont le lien vient d'être copié, pour l'accusé de
  // réception sous le bouton Partager.
  const [copie, setCopie] = useState<string | null>(null);

  const partager = async (a: PresseAsset, titre: string) => {
    const chemin = pleineRes(a);
    try {
      const reponse = await fetch(chemin);
      const blob = await reponse.blob();
      const fichier = new File([blob], a.file.split('/').pop() || 'fmm.png', {
        type: blob.type || 'image/png',
      });
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: titre });
        return;
      }
    } catch (e) {
      // Un partage annulé du doigt lève AbortError : rien à copier,
      // la personne a déjà fait son choix.
      if (e instanceof Error && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(new URL(chemin, window.location.origin).href);
    } catch {
      /* Navigateur sans presse-papiers : le bouton Télécharger reste. */
    }
    setCopie(a.file);
    window.setTimeout(() => setCopie((c) => (c === a.file ? null : c)), 2400);
  };

  const tuile = (a: PresseAsset, contain = false) => {
    const label = lang === 'FR' ? a.labelFR : a.labelEN;
    return (
      <HexPanel key={a.file} size="sm" className="h-full">
        <div className="caravan-glass h-full flex flex-col">
          <img
            src={vignette(a)}
            alt={label}
            width={640}
            height={360}
            loading="lazy"
            decoding="async"
            className={`w-full aspect-video ${contain ? 'object-contain p-8' : 'object-cover'}`}
          />
          {/* Le nom se pose sur sa propre ligne : à trois colonnes, une
              tuile fait 230 px et un titre mis à côté des deux boutons
              se faisait couper au troisième mot. */}
          <div className="px-4 py-3.5 border-t"
               style={{ borderColor: 'rgba(216, 155, 58, 0.18)' }}>
            <p className="font-display-alt text-sm tracking-[0.06em] mb-2.5"
               style={{ color: 'var(--color-bone)' }}>
              {label}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={pleineRes(a)}
                download
                title={t.download}
                aria-label={`${t.download} · ${label}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-sans uppercase tracking-[0.18em] text-[10px] transition-colors rounded-[3px]"
                style={{
                  color: 'var(--color-amber-glow)',
                  background: 'rgba(232, 177, 74, 0.09)',
                  border: '1px solid rgba(232, 177, 74, 0.3)',
                }}
              >
                <Download size={12} /> {t.download}
              </a>
              <button
                type="button"
                onClick={() => partager(a, label)}
                title={t.share}
                aria-label={`${t.share} · ${label}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-sans uppercase tracking-[0.18em] text-[10px] transition-colors rounded-[3px]"
                style={{
                  color: copie === a.file ? 'var(--color-bone)' : 'rgba(244, 239, 227, 0.72)',
                  background: 'rgba(244, 239, 227, 0.05)',
                  border: '1px solid rgba(244, 239, 227, 0.16)',
                }}
              >
                {copie === a.file ? <Check size={12} /> : <Share2 size={12} />}
                {copie === a.file ? t.copied : t.share}
              </button>
            </div>
          </div>
        </div>
      </HexPanel>
    );
  };

  return (
    <div>
      <SEO title={t.title} description={t.intro} />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/histoire/archives/lena/thumb/2025-IMG_5107.webp"
        ctas={[{ label: t.zipCta, href: PRESSE_ZIP, variant: 'primary' }]}
      />

      {/* ── En bref ─────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <GildedFrame inset={14} tone="amber">
            <div className="caravan-glass p-6 md:p-10">
              <Eyebrow tone="amber" className="mb-3">{t.brefEyebrow}</Eyebrow>
              <DisplayTitle size="lg" className="mb-8">{t.brefTitle}</DisplayTitle>

              <dl className="grid md:grid-cols-2 gap-x-10 gap-y-6">
                {t.facts.map((f) => (
                  <div key={f.k}>
                    <dt className="font-sans uppercase tracking-[0.32em] text-[10px] mb-1.5"
                        style={{ color: 'var(--color-amber-glow)' }}>
                      {f.k}
                    </dt>
                    <dd className="font-editorial text-base md:text-lg leading-relaxed"
                        style={{ color: 'rgba(244, 239, 227, 0.82)' }}>
                      {f.v}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="font-sans uppercase tracking-[0.32em] text-[10px] mb-1.5"
                      style={{ color: 'var(--color-amber-glow)' }}>
                    {t.contactLabel}
                  </dt>
                  <dd className="font-editorial text-base md:text-lg leading-relaxed flex flex-col gap-1"
                      style={{ color: 'rgba(244, 239, 227, 0.82)' }}>
                    <a href={`mailto:${SITE.contact.email}`}
                       className="inline-flex items-center gap-2 hover:text-[var(--color-amber-glow)] transition break-all">
                      <Mail size={13} className="shrink-0" style={{ color: 'var(--color-amber-glow)' }} />
                      {SITE.contact.email}
                    </a>
                    <a href={`tel:${SITE.contact.phone}`}
                       className="inline-flex items-center gap-2 hover:text-[var(--color-amber-glow)] transition">
                      <Phone size={13} className="shrink-0" style={{ color: 'var(--color-amber-glow)' }} />
                      {SITE.contact.phone}
                    </a>
                  </dd>
                </div>
              </dl>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                <ChevronButton href={PRESSE_ZIP} variant="gold">
                  {t.zipCta}
                </ChevronButton>
                <p className="font-editorial text-sm" style={{ color: 'rgba(244, 239, 227, 0.55)' }}>
                  {t.zipNote}
                </p>
              </div>
            </div>
          </GildedFrame>
        </div>
      </section>

      {/* ── Visuels à partager ──────────────────────────────────── */}
      <section className="pb-12 md:pb-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Eyebrow tone="amber" className="mb-3">{t.visuelsEyebrow}</Eyebrow>
          <DisplayTitle size="lg" className="mb-3">{t.visuelsTitle}</DisplayTitle>
          <p className="font-editorial text-base md:text-lg max-w-2xl mb-8"
             style={{ color: 'rgba(244, 239, 227, 0.72)' }}>
            {t.visuelsLead}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cartes.map((a) => tuile(a))}
          </div>
        </div>
      </section>

      {/* ── Cartes postales ─────────────────────────────────────── */}
      <section className="pb-12 md:pb-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Eyebrow tone="amber" className="mb-3">{t.postalesEyebrow}</Eyebrow>
          <DisplayTitle size="lg" className="mb-3">{t.postalesTitle}</DisplayTitle>
          <p className="font-editorial text-base md:text-lg max-w-2xl mb-3"
             style={{ color: 'rgba(244, 239, 227, 0.72)' }}>
            {t.postalesLead}
          </p>
          <p className="font-sans uppercase tracking-[0.28em] text-[10px] mb-8"
             style={{ color: 'var(--color-amber-glow)' }}>
            {t.credit}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CARTES_POSTALES.map((a) => tuile(a))}
          </div>
        </div>
      </section>

      {/* ── Logos ───────────────────────────────────────────────── */}
      <section className="pb-12 md:pb-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Eyebrow tone="amber" className="mb-3">{t.logosEyebrow}</Eyebrow>
          <DisplayTitle size="lg" className="mb-3">{t.logosTitle}</DisplayTitle>
          <p className="font-editorial text-base md:text-lg max-w-2xl mb-8"
             style={{ color: 'rgba(244, 239, 227, 0.72)' }}>
            {t.logosLead}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {LOGOS.map((a) => tuile(a, true))}
          </div>
        </div>
      </section>

      {/* ── Contact presse ──────────────────────────────────────── */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <GildedFrame inset={12}>
            <div className="caravan-glass px-6 md:px-10 py-8 md:py-10">
              <DisplayTitle size="lg" className="mb-3">{t.contactTitle}</DisplayTitle>
              <p className="font-editorial text-base md:text-xl leading-relaxed max-w-3xl"
                 style={{ color: 'rgba(244, 239, 227, 0.82)' }}>
                {t.contactLeadA}
                <a href={`mailto:${SITE.contact.email}`}
                   className="hover:opacity-80 transition"
                   style={{ color: 'var(--color-amber-glow)' }}>
                  {SITE.contact.email}
                </a>
                {t.contactLeadB}
              </p>
              <p className="mt-4 font-sans uppercase tracking-[0.28em] text-[11px]"
                 style={{ color: 'rgba(244, 239, 227, 0.55)' }}>
                {SITE.contact.phone} · {SITE.contact.address}
              </p>
            </div>
          </GildedFrame>
        </div>
      </section>
    </div>
  );
};

const FR = {
  eyebrow: 'Salle de presse',
  title: 'Kit de presse',
  intro:
    'Les visuels du festival et les logos officiels se téléchargent ici, prêts à publier. Nous vous demandons seulement de créditer Léna LeBozec pour les photographies.',
  brefEyebrow: 'En bref',
  brefTitle: 'Le festival en quelques lignes',
  facts: [
    { k: 'Quoi', v: 'Le Festival Médiéval de Montpellier, sous le titre Caravanes & Saltimbanques.' },
    { k: 'Quand', v: '25 · 26 · 27 septembre 2026. Les portes ouvrent le vendredi à 17 h.' },
    {
      k: 'Où',
      v: 'Le site se trouve au 4 rue du Bosquet à Montpellier, dans la Petite-Nation en Outaouais. À ne pas confondre avec Montpellier en France.',
    },
    {
      k: 'Billets',
      v: 'Passe journée 27 $, passe 3 jours 65 $, banquet médiéval à venir. La vente se fait en ligne par Zeffy.',
    },
    { k: 'Organisation', v: 'Le festival est opéré par Le Salon des Inconnus.' },
  ],
  contactLabel: 'Contact presse',
  zipCta: 'Télécharger tout le kit',
  zipNote: 'Un seul fichier ZIP : les douze cartes, les huit photographies et les deux logos.',
  visuelsEyebrow: 'Visuels à partager',
  visuelsTitle: 'Six cartes prêtes à publier',
  visuelsLead:
    'Chaque carte mesure 1920 × 1080 pixels et porte le blason du festival. La série anglaise vit sur la page /en/press.',
  postalesEyebrow: 'Cartes postales',
  postalesTitle: 'Les photographies, sans texte',
  postalesLead:
    'Huit images de l’édition 2025, signées par la photographe, bonnes pour l’écran comme pour le papier.',
  credit: 'Crédit obligatoire : Léna LeBozec, photographe',
  logosEyebrow: 'Logos',
  logosTitle: 'Le blason du festival',
  logosLead:
    'Le blason argenté demande un fond sombre, et la version blanche se pose sur les photographies. Gardez les proportions et la couleur telles quelles.',
  contactTitle: 'Une question, un besoin précis',
  contactLeadA: 'Écrivez à ',
  contactLeadB: ' et nous vous répondons dans la journée.',
  download: 'Télécharger',
  share: 'Partager',
  copied: 'Lien copié',
};

const EN: typeof FR = {
  eyebrow: 'Press room',
  title: 'Press kit',
  intro:
    'The festival visuals and the official logos download here, ready to publish. All we ask is a credit to Léna LeBozec for the photographs.',
  brefEyebrow: 'At a glance',
  brefTitle: 'The festival in a few lines',
  facts: [
    { k: 'What', v: 'The Festival Médiéval de Montpellier, under the title Caravans & Players.' },
    { k: 'When', v: 'September 25 · 26 · 27, 2026. Gates open Friday at 5 p.m.' },
    {
      k: 'Where',
      v: 'The grounds sit at 4 rue du Bosquet in Montpellier, in the Petite-Nation region of Outaouais. Not to be confused with Montpellier in France.',
    },
    {
      k: 'Tickets',
      v: 'Day pass $27, three-day pass $65, medieval banquet to be announced. Sold online through Zeffy.',
    },
    { k: 'Organisation', v: 'The festival is run by Le Salon des Inconnus.' },
  ],
  contactLabel: 'Press contact',
  zipCta: 'Download the whole kit',
  zipNote: 'One ZIP file: the twelve cards, the eight photographs and the two logos.',
  visuelsEyebrow: 'Visuals to share',
  visuelsTitle: 'Six cards ready to publish',
  visuelsLead:
    'Each card measures 1920 × 1080 pixels and carries the festival crest. The French series lives on the /presse page.',
  postalesEyebrow: 'Postcards',
  postalesTitle: 'The photographs, without text',
  postalesLead:
    'Eight images from the 2025 edition, signed by the photographer, good for screen and for paper.',
  credit: 'Required credit: Léna LeBozec, photographer',
  logosEyebrow: 'Logos',
  logosTitle: 'The festival crest',
  logosLead:
    'The silver crest wants a dark background, and the white version sits on photographs. Keep the proportions and the colour exactly as they are.',
  contactTitle: 'A question, a specific need',
  contactLeadA: 'Write to ',
  contactLeadB: ' and we answer the same day.',
  download: 'Download',
  share: 'Share',
  copied: 'Link copied',
};

export default PressePage;
