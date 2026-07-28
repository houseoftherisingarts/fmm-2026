import React from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import { ScrollProgress, Reveal, Stagger, StaggerItem } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';
import { SectionBand } from './HistoirePage';
import { IconHourglass, IconTable, IconWagon } from '../components/icons/GameIcons';

// Le logo est rapatrié de la page Petite Monnaie du Salon des Inconnus
// (même famille, même marque) dans /public/petite-monnaie/.
const LOGO_SRC = '/petite-monnaie/logo.png';

// ─── Petite Monnaie — la monnaie du festival ─────────────────────────
// Une seule vérité sur cette page, celle d'Alex : le FMM accepte la
// Petite Monnaie; le réseau cellulaire est capricieux sur le site, donc
// le comptant garde les files fluides; un kiosque à l'entrée échange le
// comptant contre la Petite Monnaie, qui paie partout au festival.
const PetiteMonnaiePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  return (
    <>
      <SEO title={t.seoTitle} description={t.heroIntro} />
      <ScrollProgress />

      {/* ── Hero : le logo porte la section, comme sur la page du Salon ── */}
      <section className="relative pt-28 md:pt-36 pb-16 md:pb-24 overflow-hidden">
        <SectionFog edges="both" />
        <Motes className="opacity-60" count={22} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 flex justify-center lg:justify-start"
            >
              <div className="relative">
                <div aria-hidden className="absolute inset-0 rounded-full blur-3xl opacity-40"
                  style={{ background: 'radial-gradient(circle, rgba(232,177,74,0.5), transparent 70%)' }} />
                <img src={LOGO_SRC} alt="Petite Monnaie"
                  className="relative w-56 md:w-72 lg:w-80 h-auto drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)]" />
              </div>
            </motion.div>
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
        <SectionFog edges="top" />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            <Reveal as="div" className="lg:col-span-7">
              <p className="font-editorial uppercase tracking-[0.35em] text-[11px] md:text-xs text-brass mb-3 flex items-center gap-2.5">
                <IconWagon size={15} />{t.closeEyebrow}
              </p>
              <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-[1.05] mb-5">{t.closeTitle}</h2>
              <div className="divider-brass w-20 mb-6" />
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.closeBody}</p>
            </Reveal>
            <Reveal as="div" className="lg:col-span-5 flex justify-center">
              <img src={LOGO_SRC} alt="" aria-hidden loading="lazy"
                className="w-40 md:w-52 h-auto opacity-70" />
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
  heroLead: 'Le Festival Médiéval de Montpellier accepte la Petite Monnaie, et c’est la façon la plus douce de payer sur le site.',
  heroIntro: 'Dans la forêt de Montpellier, le réseau cellulaire aime prendre congé. Les paiements par carte ou par téléphone deviennent lents, parfois impossibles. La Petite Monnaie et l’argent comptant gardent la fête fluide, pour vous comme pour les artisans.',
  whyEyebrow: 'Avant de partir',
  whyTitle: 'Apportez du comptant',
  why1: 'Le site du festival est un grand terrain en nature, et le réseau y est capricieux. Quand des centaines de personnes paient en même temps, les terminaux de paiement ralentissent et les files s’allongent.',
  why2: 'L’argent comptant règle tout cela : votre passage au bar, au marché ou à la cantine se fait en quelques secondes, sans attendre qu’une machine retrouve le signal.',
  why3: 'Le meilleur réflexe : passez au guichet ou au comptoir de votre banque avant la route, et arrivez au festival avec du comptant en poche.',
  kioskEyebrow: 'Dès votre arrivée',
  kioskTitle: 'Le kiosque Petite Monnaie',
  kioskLead: 'La Petite Monnaie a son kiosque bien en vue à l’entrée du festival. Échangez votre comptant en arrivant, et le reste de votre séjour se paie sans téléphone ni carte.',
  steps: [
    { title: 'Apportez du comptant', body: 'Retirez votre argent avant la route : le réseau du festival ne sera plus jamais votre problème.' },
    { title: 'Passez au kiosque', body: 'À l’entrée du site, échangez votre comptant contre votre Petite Monnaie en quelques instants.' },
    { title: 'Payez partout', body: 'Bar, marché, cantine : la Petite Monnaie est acceptée partout au festival, et les files avancent.' },
  ],
  closeEyebrow: 'Une monnaie d’ici',
  closeTitle: 'Née dans la Petite-Nation',
  closeBody: 'La Petite Monnaie est une initiative du Salon des Inconnus, la maison qui porte le festival. En l’adoptant le temps d’une fin de semaine, vous faites plus que simplifier vos paiements : vous encouragez une économie locale et vivante, qui circule de main en main comme aux plus beaux jours des foires d’antan.',
};
const EN = {
  seoTitle: 'Petite Monnaie',
  heroEyebrow: 'The festival currency',
  heroLead: 'The Festival Médiéval de Montpellier accepts Petite Monnaie, and it is the smoothest way to pay on site.',
  heroIntro: 'In the Montpellier forest, cell coverage likes to take the day off. Card and phone payments get slow, sometimes impossible. Petite Monnaie and cash keep the festivities flowing, for you and for the artisans.',
  whyEyebrow: 'Before you leave',
  whyTitle: 'Bring cash',
  why1: 'The festival grounds are a large site in nature, and the network there is temperamental. When hundreds of people pay at once, payment terminals slow down and lines grow.',
  why2: 'Cash settles all of that: your stop at the bar, the market or the canteen takes seconds, with no machine hunting for a signal.',
  why3: 'The best reflex: stop by your bank or an ATM before the drive, and arrive at the festival with cash in your pocket.',
  kioskEyebrow: 'As you arrive',
  kioskTitle: 'The Petite Monnaie kiosk',
  kioskLead: 'Petite Monnaie has its own kiosk in plain sight at the festival entrance. Exchange your cash on arrival, and the rest of your stay is paid without phone or card.',
  steps: [
    { title: 'Bring cash', body: 'Withdraw your money before the drive: the festival network will never be your problem again.' },
    { title: 'Stop at the kiosk', body: 'At the site entrance, exchange your cash for your Petite Monnaie in moments.' },
    { title: 'Pay everywhere', body: 'Bar, market, canteen: Petite Monnaie is accepted all across the festival, and the lines keep moving.' },
  ],
  closeEyebrow: 'A currency from here',
  closeTitle: 'Born in the Petite-Nation',
  closeBody: 'Petite Monnaie is an initiative of the Salon des Inconnus, the house behind the festival. By adopting it for a weekend, you do more than simplify your payments: you feed a living local economy, passing from hand to hand as in the finest fair days of old.',
};

export default PetiteMonnaiePage;
