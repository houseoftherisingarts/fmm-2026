import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Ticket, Tent, HelpCircle, ChevronDown } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { Eyebrow, DisplayTitle, SectionFog, SectionTopRail } from '../components/marche/atmospherics';
import {
  BILLETS, displayAmount, formatAmount, showBeforeTax, carteFond, type Billet,
} from '../content/billets';
import FAQ from '../content/faq.json';
import { useAuth } from '../contexts/AuthContext';
import { lienBilletterie, ouvrirBilletterie, surchargeBillet, tarifMembre } from '../lib/billetterie';

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

const ZEFFY_CAMPING = import.meta.env.VITE_ZEFFY_CAMPING_URL || 'https://www.zeffy.com/fr-CA/ticketing/camping-7';

const BilletsPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const t = fr ? FR : EN;
  const { user } = useAuth();
  const connecte = Boolean(user);
  // Sans compte, ET si le système des billets non membres est allumé :
  // le prix affiché et le lien sont ceux de la campagne publique (5 $ de
  // plus par billet) et la carte ouvre d'abord la porte qui offre le
  // rabais membre. Système éteint, tout le monde voit le tarif membre.
  // Le camping n'a qu'une campagne.
  const membre = tarifMembre(connecte);
  const surcharge = surchargeBillet(connecte);

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
        orbImage="/photos/tournage-2026/cavaliere-charge.webp"
      />

      <Section index="01" name={t.entreesRail} title={t.entreesTitle} lead={t.entreesLead} icon={Ticket}>
        <Deck billets={entrees} lang={lang} t={t} href={lienBilletterie(connecte)}
              surcharge={surcharge} porte={!membre} />
      </Section>

      <Section index="02" name={t.campingRail} title={t.campingTitle} lead={t.campingLead} icon={Tent}>
        <Deck billets={camping} lang={lang} t={t} href={ZEFFY_CAMPING} />
      </Section>

      {/* Questions fréquentes. Une seule source (src/content/faq.json)
          nourrit cette liste ET le bloc JSON-LD FAQPage d'index.html
          (tools/faq-jsonld.mjs) : Google veut que le balisage reflète un
          contenu visible. Un <details> natif fait le pliage, sans état ni
          bibliothèque; l'ancre #questions sert aux liens externes. */}
      <Section index="03" name={t.faqRail} title={t.faqTitle} lead={t.faqLead} icon={HelpCircle}>
        <div
          id="questions"
          className="max-w-3xl mx-auto scroll-mt-28"
          style={{ borderTop: '1px solid rgba(var(--sk-mustard-rgb), 0.22)' }}
        >
          {FAQ.map((q, i) => (
            <details
              key={q.id}
              className="group fmm-faq"
              style={{ borderBottom: '1px solid rgba(var(--sk-mustard-rgb), 0.22)' }}
            >
              <summary className="list-none cursor-pointer flex items-start gap-4 md:gap-6 py-5 md:py-6 [&::-webkit-details-marker]:hidden">
                <span
                  className="font-display title-medieval text-[11px] tracking-[0.3em] shrink-0 pt-1.5 tabular-nums"
                  style={{ color: 'var(--color-copper)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 min-w-0 font-display title-medieval text-lg md:text-xl leading-snug text-ivory transition-colors duration-300 group-open:text-brass">
                  {fr ? q.qFR : q.qEN}
                </span>
                <ChevronDown
                  size={18}
                  strokeWidth={1.6}
                  aria-hidden
                  className="shrink-0 mt-1.5 transition-transform duration-300 ease-out group-open:rotate-180"
                  style={{ color: 'var(--color-copper)' }}
                />
              </summary>
              <div className="fmm-faq-reponse pb-6 md:pb-7 pl-9 md:pl-12 pr-8">
                <p
                  className="font-sans text-base md:text-lg leading-[1.75] max-w-[68ch]"
                  style={{ color: 'rgba(var(--sk-parchment-rgb), 0.8)', fontWeight: 300 }}
                >
                  {fr ? q.rFR : q.rEN}
                </p>
              </div>
            </details>
          ))}
        </div>
      </Section>

      <section className="relative caravan-stage bleed-edges pb-24 md:pb-32">
        <p
          className="relative max-w-3xl mx-auto px-4 md:px-8 font-sans text-sm text-center leading-relaxed"
          style={{ color: 'rgba(var(--sk-parchment-rgb), 0.45)', fontWeight: 300 }}
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
  <section className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden pt-6 md:pt-10 pb-12 md:pb-20">
    <SectionFog />
    <div className="relative max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14">
      <SectionTopRail index={index} name={name} className="mb-6 md:mb-8" />
      <header className="max-w-3xl mx-auto mb-8 md:mb-10 text-center">
        <Eyebrow className="mb-4 inline-flex items-center gap-3">
          <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-copper)' }} />
          <Icon size={13} /> {name}
          <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-copper)' }} />
        </Eyebrow>
        <DisplayTitle size="lg" glow className="mb-4">{title}</DisplayTitle>
        <p
          className="font-sans text-base md:text-lg leading-[1.75] mx-auto max-w-2xl"
          style={{ color: 'rgba(var(--sk-parchment-rgb), 0.75)', fontWeight: 300 }}
        >
          {lead}
        </p>
      </header>
      {children}
    </div>
  </section>
);

// ─── Deck · la main de cartes ───────────────────────────────────────
const Deck: React.FC<{
  billets: Billet[]; lang: 'FR' | 'EN'; t: typeof FR; href: string;
  surcharge?: number; porte?: boolean;
}> = ({ billets, lang, t, href, surcharge = 0, porte = false }) => (
  <ul
    className={`grid grid-cols-2 gap-5 md:gap-7 items-stretch mx-auto ${
      billets.length >= 3 ? 'md:grid-cols-3 max-w-5xl' : 'max-w-3xl'
    }`}
  >
    {billets.map((b, i) => (
      <li key={b.id} className="min-w-0">
        <Carte billet={b} lang={lang} t={t} href={href} index={i} surcharge={surcharge} porte={porte} />
      </li>
    ))}
  </ul>
);

const Carte: React.FC<{
  billet: Billet; lang: 'FR' | 'EN'; t: typeof FR; href: string; index: number;
  surcharge?: number; porte?: boolean;
}> = ({ billet, lang, t, href, index, surcharge = 0, porte = false }) => {
  const fr = lang === 'FR';
  const [flipped, setFlipped] = useState(false);

  const nom  = fr ? billet.labelFR : billet.labelEN;
  const note = fr ? billet.noteFR  : billet.noteEN;
  const mention = fr ? billet.mentionFR : billet.mentionEN;
  const fondDos   = carteFond(billet, false);
  const fondRecto = carteFond(billet, true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: 0.06 * index, ease: [0.22, 1, 0.36, 1] }}
      className="group"
      style={{ perspective: 1600 }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={flipped}
        aria-label={`${nom}, ${flipped ? t.retourner : t.devoiler}`}
        onClick={() => setFlipped((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped((v) => !v); }
        }}
        className="gwent-card cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--sk-gilt)]/70 rounded"
        style={{
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          // teinte du filet intérieur de la plaque, propre à chaque billet
          ['--gwent-tint' as string]: fondDos.borderColor,
        }}
      >
        {/* ── DOS : l'emblème et le nom, rien d'autre ─────────── */}
        <div
          className="gwent-face gwent-back gwent-sheen flex flex-col items-center justify-between p-3.5 sm:p-5 md:p-6 text-center"
          style={{ background: fondDos.background }}
        >
          <span className="gwent-stud" style={{ top: 10, left: 10 }} aria-hidden />
          <span className="gwent-stud" style={{ top: 10, right: 10 }} aria-hidden />
          <span className="gwent-stud" style={{ bottom: 10, left: 10 }} aria-hidden />
          <span className="gwent-stud" style={{ bottom: 10, right: 10 }} aria-hidden />

          <p
            className="font-sans uppercase tracking-[0.4em] text-[9px] pt-1"
            style={{ color: 'rgba(var(--sk-gilt-rgb),0.6)' }}
          >
            {t.eyebrowCarte}
          </p>

          <img
            src="/fmm-crest-chrome.webp"
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="w-[44%] sm:w-[48%] max-w-[130px] opacity-90"
            style={{
              filter: billet.teinte === 'vert'
                ? 'drop-shadow(0 6px 22px rgba(0,0,0,0.8)) sepia(0.4) saturate(1.3) hue-rotate(58deg) brightness(1.05)'
                : 'drop-shadow(0 6px 22px rgba(0,0,0,0.8)) sepia(0.35) saturate(1.5) hue-rotate(-12deg)',
            }}
          />

          <div className="w-full">
            <span aria-hidden className="block h-px w-2/3 mx-auto mb-2 sm:mb-3"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(var(--sk-gilt-rgb),0.6), transparent)' }} />
            <h3
              className="font-display leading-[1.12] text-[13px] sm:text-base md:text-xl mb-1"
              style={{ color: 'var(--color-bone)', fontWeight: 400, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
            >
              {nom}
            </h3>
            {note && (
              <p className="font-sans uppercase tracking-[0.16em] sm:tracking-[0.22em] text-[8px] sm:text-[9px] leading-snug"
                 style={{ color: 'rgba(var(--sk-parchment-rgb),0.42)' }}>
                {note}
              </p>
            )}
            <p className="font-sans uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[8px] sm:text-[9px] mt-2 sm:mt-3.5"
               style={{ color: 'rgba(var(--sk-gilt-rgb),0.75)' }}>
              {t.devoiler}
            </p>
          </div>
        </div>

        {/* ── RECTO : le détail, révélé au clic ────────────────── */}
        <div
          className="gwent-face gwent-front flex flex-col p-4 sm:p-6 md:p-7"
          style={{ background: fondRecto.background }}
        >
          <span className="gwent-stud" style={{ top: 10, left: 10 }} aria-hidden />
          <span className="gwent-stud" style={{ top: 10, right: 10 }} aria-hidden />
          <span className="gwent-stud" style={{ bottom: 10, left: 10 }} aria-hidden />
          <span className="gwent-stud" style={{ bottom: 10, right: 10 }} aria-hidden />

          {mention && (
            <span
              className="self-start px-2.5 py-1 mb-3 font-sans uppercase tracking-[0.28em] text-[8px]"
              style={{
                color: 'var(--sk-deep)',
                background: 'linear-gradient(180deg, var(--sk-gilt-lit), #C79E4A)',
                borderRadius: 14,
              }}
            >
              {mention}
            </span>
          )}

          <h3
            className="font-display leading-[1.15] text-lg md:text-xl mb-3"
            style={{ color: 'var(--color-bone)', fontWeight: 400 }}
          >
            {nom}
          </h3>

          <div className="mb-4">
            <span
              className="font-display leading-none block"
              style={{
                color: 'var(--sk-gilt-lit)',
                fontSize: 'clamp(1.9rem, 2.6vw, 2.5rem)',
                fontWeight: 400,
                textShadow: '0 0 26px rgba(var(--sk-gilt-lit-rgb),0.4)',
              }}
            >
              {formatAmount(displayAmount(billet, surcharge), lang)}
            </span>
            <span
              className="font-sans uppercase tracking-[0.24em] text-[9px] block"
              style={{ color: 'rgba(var(--sk-parchment-rgb),0.45)' }}
            >
              {showBeforeTax ? t.avantTaxes : t.taxesIncluses}
            </span>
            {/* Le montant reellement debite. Afficher le hors-taxes seul
                surprendrait l'acheteur au paiement, et la Loi sur la
                protection du consommateur veut le tout-inclus visible. */}
            {showBeforeTax && (
              <span
                className="font-sans text-[10px] block mt-1.5"
                style={{ color: 'rgba(var(--sk-parchment-rgb),0.38)', fontWeight: 300 }}
              >
                {formatAmount(billet.zeffyAmount + surcharge, lang)} {t.auPaiement}
              </span>
            )}
          </div>

          <p
            className="font-sans text-[11px] sm:text-[13px] leading-[1.6] flex-1 overflow-hidden"
            style={{ color: 'rgba(var(--sk-parchment-rgb), 0.72)', fontWeight: 300 }}
          >
            {fr ? billet.descFR : billet.descEN}
          </p>

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              // Sans compte : la porte d'abord, qui offre le rabais membre.
              if (porte) { e.preventDefault(); ouvrirBilletterie(false); }
            }}
            className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 font-sans uppercase tracking-[0.26em] text-[10px] transition-transform hover:scale-[1.02]"
            style={{
              color: 'var(--sk-deep)',
              background: 'linear-gradient(180deg, var(--sk-gilt-lit) 0%, var(--sk-gilt) 55%, #B98F3E 100%)',
              borderRadius: 16,
            }}
          >
            {t.choisir} <ArrowUpRight size={12} />
          </a>

          {/* Sur mobile la carte est trop courte pour ce bouton (il se fait
              couper par l'overflow); toucher la carte la retourne déjà. */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
            className="mt-2.5 hidden sm:block font-sans uppercase tracking-[0.26em] text-[9px] opacity-55 hover:opacity-100 transition"
            style={{ color: 'rgba(var(--sk-parchment-rgb),0.8)' }}
          >
            {t.retourner}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const FR = {
  eyebrow: 'Billetterie · Édition 2026',
  title:   'Vos billets',
  intro:   'Choisissez votre porte d’entrée. Une journée ou les trois, seul ou en famille.',
  entreesRail:  'Entrées',
  entreesTitle: 'Entrer au festival',
  entreesLead:  'Une journée ou la fin de semaine entière, seul ou en famille. Le programme complet et les activités principales sont compris dans chaque billet.',
  campingRail:  'Camping',
  campingTitle: 'Dormir sur place',
  campingLead:  'Un emplacement sur le terrain du festival, pour se réveiller au son des forges.',
  faqRail:      'Questions',
  faqTitle:     'Questions fréquentes',
  faqLead:      'Les réponses aux questions que les festivaliers nous posent le plus souvent avant de partir.',
  eyebrowCarte: 'Billet',
  devoiler: 'Toucher pour dévoiler',
  retourner: 'Retourner la carte',
  choisir: 'Choisir ce billet',
  avantTaxes:    'avant taxes',
  auPaiement:    'taxes comprises au paiement',
  taxesIncluses: 'taxes comprises',
  taxNote:     'Les prix affichés ici sont avant taxes. Les taxes s’ajoutent au moment du paiement sur Zeffy, notre billetterie. Zeffy ne prélève aucune commission : la totalité de votre achat revient au festival.',
  taxNoteIncl: 'Les prix affichés ici sont ceux du paiement, taxes comprises. Zeffy ne prélève aucune commission : la totalité de votre achat revient au festival.',
};

const EN: typeof FR = {
  eyebrow: 'Tickets · 2026 Edition',
  title:   'Your tickets',
  intro:   'Choose your way in. One day or all three, alone or with family.',
  entreesRail:  'Admission',
  entreesTitle: 'Enter the festival',
  entreesLead:  'One day or the whole weekend, alone or with family. The full program and the main activities come with every ticket.',
  campingRail:  'Camping',
  campingTitle: 'Sleep on site',
  campingLead:  'A pitch on the festival grounds, to wake up to the sound of the forges.',
  faqRail:      'Questions',
  faqTitle:     'Frequently asked questions',
  faqLead:      'Answers to the questions festival-goers ask us most often before they set out.',
  eyebrowCarte: 'Ticket',
  devoiler: 'Tap to reveal',
  retourner: 'Flip back',
  choisir: 'Choose this ticket',
  avantTaxes:    'before tax',
  auPaiement:    'tax included at checkout',
  taxesIncluses: 'tax included',
  taxNote:     'Prices shown here are before tax. Taxes are added at checkout on Zeffy, our ticketing platform. Zeffy takes no commission: the whole of your purchase goes to the festival.',
  taxNoteIncl: 'Prices shown here are checkout prices, tax included. Zeffy takes no commission: the whole of your purchase goes to the festival.',
};

export default BilletsPage;
