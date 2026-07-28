import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import SEO from '../components/SEO';
import { ScrollProgress, Reveal, Stagger, StaggerItem } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';
import { SectionBand } from './HistoirePage';
import { IconHourglass, IconTable, IconWagon } from '../components/icons/GameIcons';

// Assets rapatriés de pmonnaie.ca (recon 2026-07-28) : l'emblème rond qui
// vit au cœur de la pièce, et le mot-symbole renversé pour fond sombre.
const EMBLEM_SRC   = '/petite-monnaie/petite-monnaie-emblem-512.png';
const WORDMARK_SRC = '/petite-monnaie/petite-monnaie-wordmark-reverse-1054.png';

// ─── La pièce frappée ────────────────────────────────────────────────
// Essence de la page Petite Monnaie du Salon des Inconnus : le logo n'est
// pas une image plate, c'est une pièce de laiton frappée. Elle flotte au
// repos, s'incline sous le curseur, et un reflet balaie sa surface.
// Statique sous prefers-reduced-motion.
const PetiteMonnaieCoin: React.FC = () => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [16, -16]), { stiffness: 120, damping: 16 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-16, 16]), { stiffness: 120, damping: 16 });

  const onMove = (e: React.PointerEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} style={{ perspective: 900 }}>
      <motion.div
        animate={reduce ? undefined : { y: [0, -12, 0] }}
        transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          style={{ rotateX: reduce ? 0 : rotX, rotateY: reduce ? 0 : rotY, transformStyle: 'preserve-3d' }}
          className="relative w-64 h-64 md:w-80 md:h-80 rounded-full select-none"
        >
          {/* Corps de laiton */}
          <div aria-hidden className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 32% 28%, #E8B14A 0%, #C9A85A 34%, #8a6a2c 72%, #5c4118 100%)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 2px 6px rgba(255,235,180,0.55), inset 0 -8px 18px rgba(40,24,4,0.6)',
            }} />
          {/* Tranche crantée */}
          <div aria-hidden className="absolute inset-[7px] rounded-full opacity-70"
            style={{
              background: 'repeating-conic-gradient(rgba(60,40,8,0.55) 0deg 2deg, transparent 2deg 6deg)',
              WebkitMask: 'radial-gradient(circle, transparent 62%, black 66%, black 100%)',
              mask: 'radial-gradient(circle, transparent 62%, black 66%, black 100%)',
            }} />
          {/* Emblème incrusté */}
          <div className="absolute inset-[13%] rounded-full overflow-hidden border border-[#5c4118]/60"
            style={{ boxShadow: 'inset 0 4px 14px rgba(20,10,0,0.5)' }}>
            <img src={EMBLEM_SRC} alt="Petite Monnaie" className="w-full h-full object-cover" draggable={false} />
          </div>
          {/* Reflet qui balaie */}
          {!reduce && (
            <motion.div aria-hidden className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <motion.div
                className="absolute -inset-y-8 w-1/3"
                style={{ background: 'linear-gradient(100deg, transparent, rgba(255,240,200,0.28), transparent)', filter: 'blur(6px)' }}
                animate={{ x: ['-140%', '420%'] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 7.5, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

// ─── Petite Monnaie — la monnaie du festival ─────────────────────────
// Les faits de cette page : le FMM accepte la Petite Monnaie (1 petite-
// monnaie = 1 $ CA); le réseau cellulaire est capricieux sur le site,
// donc le comptant garde les files fluides; un kiosque à l'entrée
// échange le comptant contre la Petite Monnaie, acceptée partout au
// festival et dans plus de 150 commerces de la Petite-Nation.
const PetiteMonnaiePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  return (
    <>
      <SEO title={t.seoTitle} description={t.heroIntro} />
      <ScrollProgress />

      {/* ── Hero : texte à gauche, la pièce frappée à droite ── */}
      <section className="relative pt-28 md:pt-36 pb-16 md:pb-24 overflow-hidden">
        {/* Lueur verte « monnaie », signature de la marque, posée sur le noir chaud du FMM */}
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 45% at 72% 40%, rgba(58,107,98,0.22), transparent 70%)' }} />
        <SectionFog edges="both" />
        <Motes className="opacity-60" count={22} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-7">
              <Reveal>
                <p className="font-editorial uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">
                  {t.heroEyebrow}
                </p>
                <h1 className="font-display title-medieval text-5xl md:text-7xl text-ivory leading-[1.02] mb-6">
                  Petite Monnaie
                </h1>
                <div className="divider-brass w-24 mb-7" />
                <p className="font-editorial text-lg md:text-2xl text-ivory leading-relaxed mb-4">{t.heroLead}</p>
                <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.heroIntro}</p>
              </Reveal>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 flex justify-center lg:justify-end"
            >
              <PetiteMonnaieCoin />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Pourquoi le comptant ── */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-midnight-deep">
        <SectionFog edges="top" />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-14">
            <div className="lg:col-span-4">
              <Reveal as="div" className="lg:sticky lg:top-28">
                <p className="font-editorial uppercase tracking-[0.35em] text-[11px] md:text-xs text-brass mb-3 flex items-center gap-2.5">
                  <IconHourglass size={15} />{t.whyEyebrow}
                </p>
                <h2 className="font-display title-medieval text-3xl md:text-4xl xl:text-5xl text-ivory leading-[1.05]">{t.whyTitle}</h2>
                <div className="divider-brass w-20 mt-5" />
              </Reveal>
            </div>
            <Reveal as="div" className="lg:col-span-8 space-y-5">
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.why1}</p>
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.why2}</p>
              <p className="font-editorial text-base md:text-lg text-brass leading-relaxed">{t.why3}</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Le kiosque à l'entrée ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <Motes className="opacity-50" count={16} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <SectionBand
            icon={<IconTable size={15} />}
            eyebrow={t.kioskEyebrow}
            title={t.kioskTitle}
            lead={t.kioskLead}
          />
          <Stagger className="grid md:grid-cols-3 gap-4 md:gap-5" stagger={0.08}>
            {t.steps.map((s, i) => (
              <StaggerItem
                key={s.title}
                as="article"
                distance={56}
                className="glass-light rounded-card p-6 md:p-8 hover:bg-brass/10 transition group hover:-translate-y-1 duration-300"
              >
                <p className="font-display title-medieval text-4xl md:text-5xl text-brass/50 group-hover:text-brass transition mb-4">{i + 1}</p>
                <h3 className="font-display title-medieval text-lg md:text-xl text-ivory mb-2.5">{s.title}</h3>
                <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed">{s.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Le mot de la fin ── */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-midnight-deep">
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 45% at 25% 55%, rgba(58,107,98,0.16), transparent 70%)' }} />
        <SectionFog edges="top" />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <Reveal as="div" className="lg:col-span-7">
              <p className="font-editorial uppercase tracking-[0.35em] text-[11px] md:text-xs text-brass mb-3 flex items-center gap-2.5">
                <IconWagon size={15} />{t.closeEyebrow}
              </p>
              <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-[1.05] mb-5">{t.closeTitle}</h2>
              <div className="divider-brass w-20 mb-6" />
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-7">{t.closeBody}</p>
              <a href="https://pmonnaie.ca" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                {t.closeCta} <span aria-hidden>↗</span>
              </a>
            </Reveal>
            <Reveal as="div" className="lg:col-span-5 flex justify-center lg:justify-end">
              <img src={WORDMARK_SRC} alt="Petite Monnaie" loading="lazy"
                className="w-56 md:w-72 h-auto opacity-85" />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
};

const FR = {
  seoTitle: 'Petite Monnaie',
  heroEyebrow: 'La monnaie du festival',
  heroLead: 'Le Festival Médiéval de Montpellier accepte la Petite Monnaie, la monnaie locale de la Petite-Nation. Une petite-monnaie vaut un dollar canadien, tout simplement.',
  heroIntro: 'Dans la forêt de Montpellier, le réseau cellulaire aime prendre congé. Les paiements par carte ou par téléphone deviennent lents, parfois impossibles. La Petite Monnaie et l’argent comptant gardent la fête fluide, pour vous comme pour les artisans.',
  whyEyebrow: 'Avant de partir',
  whyTitle: 'Apportez du comptant',
  why1: 'Le site du festival est un grand terrain en nature, et le réseau y est capricieux. Quand des centaines de personnes paient en même temps, les terminaux ralentissent et les files s’allongent.',
  why2: 'L’argent comptant règle tout cela : votre passage au bar, au marché ou à la cantine se fait en quelques secondes, sans attendre qu’une machine retrouve le signal.',
  why3: 'Le meilleur réflexe : passez au guichet de votre banque avant la route, et arrivez au festival avec du comptant en poche.',
  kioskEyebrow: 'Dès votre arrivée',
  kioskTitle: 'Le kiosque Petite Monnaie',
  kioskLead: 'La Petite Monnaie a son kiosque bien en vue à l’entrée du festival. Échangez votre comptant en arrivant, et le reste de votre séjour se paie sans téléphone ni carte.',
  steps: [
    { title: 'Apportez du comptant', body: 'Retirez votre argent avant la route : le réseau du festival ne sera plus jamais votre problème.' },
    { title: 'Passez au kiosque', body: 'À l’entrée du site, échangez votre comptant contre vos petites-monnaies en quelques instants.' },
    { title: 'Payez partout', body: 'Bar, marché, cantine : la Petite Monnaie est acceptée partout au festival, et les files avancent.' },
  ],
  closeEyebrow: 'Une monnaie d’ici',
  closeTitle: 'Née dans la Petite-Nation',
  closeBody: 'La Petite Monnaie est une monnaie locale et communautaire qui circule dans la MRC de Papineau, acceptée par plus de 150 commerces de la région. En l’adoptant le temps d’une fin de semaine, vous faites plus que simplifier vos paiements : vous encouragez une économie locale et vivante, qui circule de main en main comme aux plus beaux jours des foires d’antan.',
  closeCta: 'Découvrir la Petite Monnaie',
};
const EN = {
  seoTitle: 'Petite Monnaie',
  heroEyebrow: 'The festival currency',
  heroLead: 'The Festival Médiéval de Montpellier accepts Petite Monnaie, the local currency of the Petite-Nation. One petite-monnaie is worth one Canadian dollar, simple as that.',
  heroIntro: 'In the Montpellier forest, cell coverage likes to take the day off. Card and phone payments get slow, sometimes impossible. Petite Monnaie and cash keep the festivities flowing, for you and for the artisans.',
  whyEyebrow: 'Before you leave',
  whyTitle: 'Bring cash',
  why1: 'The festival grounds are a large site in nature, and the network there is temperamental. When hundreds of people pay at once, terminals slow down and lines grow.',
  why2: 'Cash settles all of that: your stop at the bar, the market or the canteen takes seconds, with no machine hunting for a signal.',
  why3: 'The best reflex: stop by your bank before the drive, and arrive at the festival with cash in your pocket.',
  kioskEyebrow: 'As you arrive',
  kioskTitle: 'The Petite Monnaie kiosk',
  kioskLead: 'Petite Monnaie has its own kiosk in plain sight at the festival entrance. Exchange your cash on arrival, and the rest of your stay is paid without phone or card.',
  steps: [
    { title: 'Bring cash', body: 'Withdraw your money before the drive: the festival network will never be your problem again.' },
    { title: 'Stop at the kiosk', body: 'At the site entrance, exchange your cash for your petites-monnaies in moments.' },
    { title: 'Pay everywhere', body: 'Bar, market, canteen: Petite Monnaie is accepted all across the festival, and the lines keep moving.' },
  ],
  closeEyebrow: 'A currency from here',
  closeTitle: 'Born in the Petite-Nation',
  closeBody: 'Petite Monnaie is a local community currency circulating in the MRC de Papineau, accepted by more than 150 businesses across the region. By adopting it for a weekend, you do more than simplify your payments: you feed a living local economy, passing from hand to hand as in the finest fair days of old.',
  closeCta: 'Discover Petite Monnaie',
};

export default PetiteMonnaiePage;
