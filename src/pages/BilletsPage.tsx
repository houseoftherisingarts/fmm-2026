import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Ticket, Tent } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { Eyebrow, DisplayTitle, HexPanel, SectionFog, SectionTopRail } from '../components/marche/atmospherics';
import { useTilt, useSpotlight } from '../components/marche/effects';
import {
  BILLETS, displayAmount, formatAmount, showBeforeTax, type Billet,
} from '../content/billets';

// ─── Billetterie ────────────────────────────────────────────────────
// Une main de cartes plutôt qu'une liste. Chaque billet est une carte
// que l'on peut lire, comparer, choisir; le clic ouvre la billetterie
// Zeffy correspondante.
//
// Pourquoi : sur Zeffy tout est empilé dans un formulaire, sans image
// ni respiration, et le prix affiché n'est pas celui qu'on annonce.
// Ici on montre le prix hors taxes, la composition du billet, et ce
// que le billet donne vraiment.
//
// ⚠️ PAS ENCORE PUBLIÉE : aucune route ne mène ici tant qu'Alex n'a pas
// tranché la question des taxes (voir src/content/billets.ts).

const ZEFFY = {
  entrees: import.meta.env.VITE_ZEFFY_TICKET_URL  || 'https://www.zeffy.com/fr-CA/ticketing/fmm--2026',
  camping: import.meta.env.VITE_ZEFFY_CAMPING_URL || 'https://www.zeffy.com/fr-CA/ticketing/camping-7',
};

const BilletsPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const t = fr ? FR : EN;

  const entrees = BILLETS.filter((b) => b.billetterie === 'entrees');
  const camping = BILLETS.filter((b) => b.billetterie === 'camping');

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <ScrollProgress />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/wix/marche/64edb1ee.jpg"
      />

      <Section index="01" name={t.entreesRail} title={t.entreesTitle} lead={t.entreesLead} icon={Ticket}>
        <Deck billets={entrees} lang={lang} t={t} href={ZEFFY.entrees} />
      </Section>

      <Section index="02" name={t.campingRail} title={t.campingTitle} lead={t.campingLead} icon={Tent}>
        <Deck billets={camping} lang={lang} t={t} href={ZEFFY.camping} />
      </Section>

      <section className="relative caravan-stage bleed-edges pb-24 md:pb-32">
        <p
          className="relative max-w-3xl mx-auto px-4 md:px-8 font-sans text-sm text-center leading-relaxed"
          style={{ color: 'rgba(244, 239, 227, 0.45)', fontWeight: 300 }}
        >
          {showBeforeTax ? t.taxNote : t.taxNoteIncl}
        </p>
      </section>
    </>
  );
};

const Section: React.FC<{
  index: string; name: string; title: string; lead: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}> = ({ index, name, title, lead, icon: Icon, children }) => (
  <section className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden pt-16 md:pt-24 pb-12 md:pb-20">
    <SectionFog />
    <div className="relative max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14">
      <SectionTopRail index={index} name={name} className="mb-10 md:mb-14" />
      <header className="max-w-3xl mb-10 md:mb-14">
        <Eyebrow className="mb-5 inline-flex items-center gap-3">
          <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-copper)' }} />
          <Icon size={13} /> {name}
        </Eyebrow>
        <DisplayTitle size="lg" glow className="mb-5">{title}</DisplayTitle>
        <p
          className="font-sans text-base md:text-lg leading-[1.75]"
          style={{ color: 'rgba(244, 239, 227, 0.75)', fontWeight: 300 }}
        >
          {lead}
        </p>
      </header>
      {children}
    </div>
  </section>
);

// ─── Deck — la main de cartes ───────────────────────────────────────
const Deck: React.FC<{
  billets: Billet[]; lang: 'FR' | 'EN'; t: typeof FR; href: string;
}> = ({ billets, lang, t, href }) => (
  <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7 items-stretch">
    {billets.map((b, i) => (
      <li key={b.id} className="min-w-0">
        <Carte billet={b} lang={lang} t={t} href={href} index={i} />
      </li>
    ))}
  </ul>
);

const Carte: React.FC<{
  billet: Billet; lang: 'FR' | 'EN'; t: typeof FR; href: string; index: number;
}> = ({ billet, lang, t, href, index }) => {
  const fr = lang === 'FR';
  const tilt = useTilt(6);
  const spot = useSpotlight('rgba(232, 177, 74, 0.20)', 300);
  const [hover, setHover] = useState(false);

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: 0.05 * index, ease: [0.22, 1, 0.36, 1] }}
      className="group block h-full"
      style={{ perspective: 1400 }}
      onMouseMove={(e) => { tilt.onMove(e); spot.onMove(e); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { tilt.onLeave(); spot.onLeave(); setHover(false); }}
      ref={tilt.ref as React.Ref<HTMLAnchorElement>}
    >
      <motion.div
        style={{ rotateX: tilt.rx, rotateY: tilt.ry, transformStyle: 'preserve-3d' }}
        className="h-full"
      >
        <HexPanel size="md" active={billet.vedette} className={billet.vedette ? 'fmm-shimmer h-full' : 'h-full'}>
          <div
            className="relative h-full flex flex-col p-7 md:p-8 overflow-hidden"
            style={{
              background: billet.vedette
                ? 'linear-gradient(165deg, rgba(60,22,14,0.75) 0%, rgba(26,5,11,0.9) 60%)'
                : 'rgba(26, 5, 11, 0.6)',
              minHeight: 260,
            }}
          >
            {/* Halo qui suit le curseur */}
            <motion.span
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{ background: spot.background, mixBlendMode: 'screen' }}
            />

            {billet.vedette && (
              <span
                className="absolute top-0 right-0 px-3 py-1 font-sans uppercase tracking-[0.3em] text-[9px]"
                style={{
                  color: '#1a050b',
                  background: 'linear-gradient(180deg, #E8C87A, #C79E4A)',
                  clipPath: 'polygon(14px 0, 100% 0, 100% 100%, 0 100%)',
                }}
              >
                {t.favori}
              </span>
            )}

            <div className="relative flex-1">
              <p
                className="font-sans uppercase tracking-[0.28em] text-[10px] mb-3"
                style={{ color: 'rgba(244,239,227,0.45)' }}
              >
                {fr ? billet.noteFR : billet.noteEN}
              </p>

              <h3
                className="font-display leading-[1.1] text-xl md:text-2xl mb-4 line-clamp-2"
                style={{ color: 'var(--color-bone)', fontWeight: 400 }}
              >
                {fr ? billet.labelFR : billet.labelEN}
              </h3>

              <div className="flex items-baseline gap-2 mb-4">
                <span
                  className="font-display leading-none"
                  style={{
                    color: '#E8C87A',
                    fontSize: 'clamp(2rem, 3.4vw, 2.9rem)',
                    fontWeight: 400,
                    textShadow: '0 0 28px rgba(232,200,122,0.35)',
                  }}
                >
                  {formatAmount(displayAmount(billet), lang)}
                </span>
                <span
                  className="font-sans uppercase tracking-[0.22em] text-[10px]"
                  style={{ color: 'rgba(244,239,227,0.45)' }}
                >
                  {showBeforeTax ? t.avantTaxes : t.taxesIncluses}
                </span>
              </div>

              <p
                className="font-sans text-sm leading-[1.7]"
                style={{ color: 'rgba(244, 239, 227, 0.7)', fontWeight: 300 }}
              >
                {fr ? billet.descFR : billet.descEN}
              </p>
            </div>

            <span
              className="relative mt-6 inline-flex items-center gap-2.5 font-sans uppercase tracking-[0.28em] text-[10px] transition-colors"
              style={{ color: hover ? '#E8C87A' : 'rgba(244,239,227,0.6)' }}
            >
              {t.choisir}
              <ArrowUpRight
                size={13}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
              <span
                aria-hidden
                className="inline-block h-px transition-all"
                style={{ width: hover ? 46 : 22, background: 'currentColor' }}
              />
            </span>
          </div>
        </HexPanel>
      </motion.div>
    </motion.a>
  );
};

const FR = {
  eyebrow: 'Billetterie · Édition 2026',
  title:   'Vos billets',
  intro:   'Choisissez votre porte d’entrée. Chaque billet ouvre les mêmes trois jours, à sa manière.',
  entreesRail:  'Entrées',
  entreesTitle: 'Entrer au festival',
  entreesLead:  'Une journée ou la fin de semaine entière, seul ou en famille. Le programme complet et les activités principales sont compris dans chaque billet.',
  campingRail:  'Camping',
  campingTitle: 'Dormir sur place',
  campingLead:  'Un emplacement sur le terrain du festival, pour se réveiller au son des forges.',
  favori:  'Le plus pris',
  choisir: 'Choisir ce billet',
  avantTaxes:    'avant taxes',
  taxesIncluses: 'taxes comprises',
  taxNote:     'Les prix affichés ici sont avant taxes. Les taxes s’ajoutent au moment du paiement sur Zeffy, notre billetterie. Zeffy ne prélève aucune commission : la totalité de votre achat revient au festival.',
  taxNoteIncl: 'Les prix affichés ici sont ceux du paiement, taxes comprises. Zeffy ne prélève aucune commission : la totalité de votre achat revient au festival.',
};

const EN: typeof FR = {
  eyebrow: 'Tickets · 2026 Edition',
  title:   'Your tickets',
  intro:   'Choose your way in. Every ticket opens the same three days, in its own way.',
  entreesRail:  'Admission',
  entreesTitle: 'Enter the festival',
  entreesLead:  'One day or the whole weekend, alone or with family. The full program and the main activities come with every ticket.',
  campingRail:  'Camping',
  campingTitle: 'Sleep on site',
  campingLead:  'A pitch on the festival grounds, to wake up to the sound of the forges.',
  favori:  'Most chosen',
  choisir: 'Choose this ticket',
  avantTaxes:    'before tax',
  taxesIncluses: 'tax included',
  taxNote:     'Prices shown here are before tax. Taxes are added at checkout on Zeffy, our ticketing platform. Zeffy takes no commission: the whole of your purchase goes to the festival.',
  taxNoteIncl: 'Prices shown here are checkout prices, tax included. Zeffy takes no commission: the whole of your purchase goes to the festival.',
};

export default BilletsPage;
