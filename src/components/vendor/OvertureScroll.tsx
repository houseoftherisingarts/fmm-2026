import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, Sparkles, CalendarDays, Coins, Hammer, CreditCard, Tent, ScrollText,
  type LucideIcon,
} from 'lucide-react';
import OrnateFrame from './OrnateFrame';

// Overture / festival preamble shown before the vendor sign-in + form.
// Asymmetric bento grid: a hero, then varied-span cards with per-section
// accent colours and lucide iconography. Every card is its own block of
// content, so the page reads as a magazine spread instead of a wall of
// centered text.

interface SectionData {
  title: string;
  body: string[];
  icon: LucideIcon;
  accent: string;          // CSS color
  span: string;            // tailwind col-span classes for lg breakpoint
}

export const FR_OVERTURE = {
  eyebrow: 'Avant de commencer',
  title:   'Bienvenue, voyageur',
  intro:   'Sixième édition du Festival Médiéval de Montpellier. Voici l’essentiel à connaître avant d’inscrire votre kiosque.',
  cta:     'Entrer dans la caravane',
  sections: [
    {
      title: 'Caravanes & Saltimbanques',
      body: [
        'Imaginez une troupe de voyageurs débarquant en village avec leur caravane : musique joyeuse, spectacles, danses, jeux et bouffe nomade. C’est le ton que nous cherchons cette année.',
        'Les kiosques qui s’accordent le mieux avec ce thème seront priorisés.',
      ],
      icon: Sparkles,
      accent: 'var(--color-ruby)',
      span: 'lg:col-span-7',
    },
    {
      title: 'Quand & où',
      body: [
        '25, 26 et 27 septembre 2026.',
        '4 Rue du Bosquet, Montpellier (Québec).',
        'Vendredi 16 h 30 – 20 h · Samedi 9 h 30 – 19 h · Dimanche 9 h 30 – 16 h.',
        'Présence obligatoire pendant tout l’horaire pour être considéré exposant.',
      ],
      icon: CalendarDays,
      accent: 'var(--color-emerald-deep)',
      span: 'lg:col-span-5',
    },
    {
      title: 'Coût',
      body: [
        '110 $ — espace 10 × 10 pi.',
        '165 $ — espace 10 × 15 pi.',
        '220 $ — espace 10 × 20 pi.',
        'Mesures impériales (vous pourrez basculer en métrique à la facture).',
      ],
      icon: Coins,
      accent: 'var(--color-mustard)',
      span: 'lg:col-span-4',
    },
    {
      title: 'Montage & démontage',
      body: [
        'Vendredi 9 h – 16 h 30 : montage libre.',
        'Tous les véhicules quittent le site avant 15 h.',
        'Vous pouvez continuer le montage de 15 h à 17 h, sans véhicules sur place. Soyez prêt·e pour l’ouverture à 17 h.',
      ],
      icon: Hammer,
      accent: 'var(--color-copper)',
      span: 'lg:col-span-4',
    },
    {
      title: 'Paiement',
      body: [
        'Si votre candidature est acceptée, vous recevrez un courriel de confirmation.',
        'Le paiement se fait en ligne via un lien Zeffy.',
      ],
      icon: CreditCard,
      accent: 'var(--color-plum)',
      span: 'lg:col-span-4',
    },
    {
      title: 'Camping',
      body: [
        'Un emplacement gratuit vous est réservé sur le terrain de baseball adjacent au festival.',
        'Aucun feu ni accès à l’électricité à cet endroit.',
        'Vous pouvez aussi dormir dans votre kiosque, mais pas monter de tente supplémentaire à côté.',
      ],
      icon: Tent,
      accent: 'var(--color-amber-glow)',
      span: 'lg:col-span-7',
    },
    {
      title: 'Bon à savoir',
      body: [
        'Aucune obligation vestimentaire ni de décor — costumes et déco encouragés, kiosques décorés/médiévaux priorisés.',
        'Événement 100 % extérieur, sur gazon (apportez vos cales si besoin).',
        'Sanitaires et toilettes chimiques sur place. Pas de douches.',
        'Nous priorisons les artisans qui créent ou démontrent leur métier plutôt que la simple revente.',
        'Réponse à votre candidature sous 1 à 2 mois, par courriel. Questions : montpelliermedieval@gmail.com.',
      ],
      icon: ScrollText,
      accent: 'var(--color-bone)',
      span: 'lg:col-span-5',
    },
  ] satisfies SectionData[],
};

export const EN_OVERTURE: typeof FR_OVERTURE = {
  eyebrow: 'Before you begin',
  title:   'Welcome, traveller',
  intro:   'Sixth edition of the Festival Médiéval de Montpellier. Here is what you should know before registering your kiosk.',
  cta:     'Enter the caravan',
  sections: [
    {
      title: 'Caravans & Saltimbanques',
      body: [
        'Picture a troupe of travellers arriving in a village with their caravan: lively music, shows, dance, games, and nomadic food. That is the tone we are aiming for this year.',
        'Kiosks that fit this theme will be given priority.',
      ],
      icon: Sparkles,
      accent: 'var(--color-ruby)',
      span: 'lg:col-span-7',
    },
    {
      title: 'When & where',
      body: [
        'September 25, 26 and 27, 2026.',
        '4 Rue du Bosquet, Montpellier (Quebec).',
        'Friday 4:30 – 8 pm · Saturday 9:30 am – 7 pm · Sunday 9:30 am – 4 pm.',
        'Full-weekend attendance is required to be considered an exhibitor.',
      ],
      icon: CalendarDays,
      accent: 'var(--color-emerald-deep)',
      span: 'lg:col-span-5',
    },
    {
      title: 'Cost',
      body: [
        '$110 — 10 × 10 ft space.',
        '$165 — 10 × 15 ft space.',
        '$220 — 10 × 20 ft space.',
        'Imperial measurements (switch to metric at the invoice step).',
      ],
      icon: Coins,
      accent: 'var(--color-mustard)',
      span: 'lg:col-span-4',
    },
    {
      title: 'Setup & teardown',
      body: [
        'Friday 9 am – 4:30 pm: open setup.',
        'All vehicles must leave the site before 3 pm.',
        'You can keep setting up from 3 to 5 pm but no vehicles on site. Be ready for gate opening at 5 pm.',
      ],
      icon: Hammer,
      accent: 'var(--color-copper)',
      span: 'lg:col-span-4',
    },
    {
      title: 'Payment',
      body: [
        'If accepted, you will receive a confirmation email.',
        'Payment is made online via a Zeffy link.',
      ],
      icon: CreditCard,
      accent: 'var(--color-plum)',
      span: 'lg:col-span-4',
    },
    {
      title: 'Camping',
      body: [
        'A free spot is reserved for you on the baseball field adjacent to the festival.',
        'No fires, no electricity at that spot.',
        'You may also sleep in your kiosk, but no extra tent set up beside it.',
      ],
      icon: Tent,
      accent: 'var(--color-amber-glow)',
      span: 'lg:col-span-7',
    },
    {
      title: 'Good to know',
      body: [
        'No costume or decor requirement — costumes and themed setups encouraged, well-decorated/medieval kiosks prioritized.',
        '100% outdoor on grass (bring shims if needed).',
        'Bathrooms and chemical toilets on site. No showers.',
        'We prioritize artisans who create or demonstrate their craft over straight resale.',
        'Replies within 1–2 months by email. Questions: montpelliermedieval@gmail.com.',
      ],
      icon: ScrollText,
      accent: 'var(--color-bone)',
      span: 'lg:col-span-5',
    },
  ] satisfies SectionData[],
};

const parchmentBg: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.77  0 0 0 0 0.64  0 0 0 0 0.35  0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
};

const OvertureScroll: React.FC<{
  lang: 'FR' | 'EN'; onEnter: () => void; reduceMotion: boolean;
}> = ({ lang, onEnter, reduceMotion }) => {
  const t = lang === 'FR' ? FR_OVERTURE : EN_OVERTURE;
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="velvet-card rounded-lg-card p-6 md:p-12 relative overflow-hidden stage-3d max-w-7xl mx-auto"
    >
      <OrnateFrame accent="var(--color-amber-glow)" duration={1} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={parchmentBg} aria-hidden />

      <div className="relative">
        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="text-center mb-10 md:mb-14">
          <p className="font-display title-medieval text-[10px] md:text-xs text-brass uppercase tracking-[0.4em] mb-2">
            {t.eyebrow}
          </p>
          <h2 className="font-display title-medieval text-4xl md:text-6xl lg:text-7xl text-ivory mb-4 copper-sheen leading-[1.05]">
            {t.title}
          </h2>
          <div className="h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent w-40 mx-auto mb-5" />
          <p className="font-editorial italic text-base md:text-xl text-ivory/90 max-w-2xl mx-auto">
            {t.intro}
          </p>
        </div>

        {/* ── Bento grid ──────────────────────────────────── */}
        <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
          {t.sections.map((s, i) => (
            <Tile key={s.title} s={s} reduceMotion={reduceMotion} delay={i * 0.05} />
          ))}
        </div>

        {/* ── CTA ─────────────────────────────────────────── */}
        <div className="mt-12 md:mt-14 flex justify-center">
          <motion.button
            type="button"
            onClick={onEnter}
            whileHover={{ y: -3, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-b from-amber-300 via-brass-soft to-brass text-midnight-deep font-sans uppercase tracking-wider text-sm md:text-base font-semibold rounded-card border border-amber-200/60 shadow-[0_0_36px_rgba(232,177,74,0.45),0_8px_24px_-4px_rgba(216,155,58,0.55)]"
          >
            {t.cta} <ArrowRight size={16} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

const Tile: React.FC<{ s: SectionData; reduceMotion: boolean; delay: number }> = ({ s, reduceMotion, delay }) => {
  const Icon = s.icon;
  return (
    <motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      className={`relative ${s.span} rounded-card p-5 md:p-6 bg-midnight-deep/55 border border-ivory-soft/10 overflow-hidden group transition-colors`}
      style={{
        boxShadow: `inset 0 0 0 1px ${s.accent}1a, 0 12px 32px -16px ${s.accent}55`,
      }}
    >
      {/* Top accent bar */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }} />

      <header className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-card flex items-center justify-center shrink-0"
          style={{
            background: `${s.accent}20`,
            border: `1px solid ${s.accent}55`,
            color: s.accent,
            boxShadow: `0 0 22px -4px ${s.accent}55`,
          }}
        >
          <Icon size={18} />
        </div>
        <h3 className="font-display title-medieval text-base md:text-xl text-ivory leading-tight uppercase tracking-wider mt-0.5">
          {s.title}
        </h3>
      </header>

      <div className="font-editorial text-sm md:text-[15px] text-ivory-soft leading-relaxed space-y-1.5">
        {s.body.map((p, j) => <p key={j}>{p}</p>)}
      </div>
    </motion.section>
  );
};

export default OvertureScroll;
