import React from 'react';
import {ArrowUpRight, Heart} from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { SPONSORS } from '../content';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem, ChapterIntro, ScrollProgress } from '../components/scroll';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';
import { SponsorOffer } from './CommanditairesPage';

// Featured partners: long-form cards, cloned from the live Wix copy.
// Chaque partenaire porte SA propre image (demande d'Alex 2026-08-12 :
// fini la rotation générique où la Municipalité affichait le Marché
// Faubert). Les fichiers viennent de la banque /wix/partenaires.
const FEATURED = [
  {
    name: 'Municipalité de Montpellier',
    image: '/wix/partenaires/logo-montpellier-trim.png',
    logo: true,
    bioFR: 'En accueillant le festival sur leurs terres, la municipalité permet un événement à grand déploiement, riche, et impossible à recréer dans les grands centres urbains.',
    bioEN: 'By hosting the festival on their land, the municipality enables a sweeping, rich event impossible to recreate in major urban centres.',
    href: '#TODO_municipalite-montpellier',
    cta: { FR: 'Site de la municipalité', EN: 'Municipality site' },
  },
  {
    name: 'Groupe Gagnon',
    image: '/wix/partenaires/05fe445b.png',
    bioFR: 'Depuis la première itération, Le Groupe Gagnon est un de nos partenaires les plus fidèles et les plus généreux. Nous sommes fiers d’acheter local, et ils sont fiers de commanditer local.',
    bioEN: 'Since the very first edition, Groupe Gagnon has been one of our most loyal and generous partners. We are proud to buy local, and they are proud to sponsor local.',
    href: '#TODO_groupe-gagnon',
    cta: { FR: 'Quincaillerie', EN: 'Hardware store' },
  },
  {
    name: 'MRC Papineau',
    image: '/wix/partenaires/7a32a3a6.png',
    logo: true,
    bioFR: 'La MRC de Papineau soutient le FMM et bien d’autres initiatives locales. L’an dernier, ils ont financé le festival à hauteur de 15 000 $, ce qui permet de garder nos prix bas. Visitez leur site pour voir l’étendue de leur portée.',
    bioEN: 'MRC Papineau supports FMM and many other local initiatives. Last year they funded the festival to the tune of $15,000, helping us keep prices low. Visit their site to see the breadth of their reach.',
    href: '#TODO_mrc-papineau',
    cta: { FR: 'Site de la MRC', EN: 'MRC site' },
  },
  {
    name: 'Ferme Coopérative Agricola',
    image: '/wix/partenaires/9487bac5.jpg',
    bioFR: 'Agricola est une coopérative de travailleur·euse·s : elle appartient aux personnes qui cultivent votre nourriture. Nous croyons que la nourriture devrait construire la communauté, être écologiquement durable, et être un plaisir à grandir et à manger.',
    bioEN: 'Agricola is a worker cooperative: owned by the people who grow your food. We believe food should build community, be ecologically sustainable, and be a joy to grow and eat.',
    href: '#TODO_agricola',
    cta: { FR: 'Site et paniers', EN: 'Site and baskets' },
  },
  {
    name: 'Les Autobus du Village & Escalade Petite-Nation',
    image: '/wix/partenaires/f033a4f4.jpg',
    logo: true,
    bioFR: 'En transportant nos Vikings d’Europe et nos enfants, Les Autobus du Village nous permettent d’améliorer grandement notre programmation. Nous vous invitons à découvrir « Escalade Petite-Nation », un affilié, qui offre de magnifiques expériences locales.',
    bioEN: 'By transporting our Vikings from Europe and our children, Les Autobus du Village let us greatly improve our programming. We invite you to discover "Escalade Petite-Nation", an affiliate offering wonderful local experiences.',
    href: '#TODO_autobus',
    cta: { FR: 'Escalade & Autobus', EN: 'Climbing & Coaches' },
  },
];

// Smaller partners + sponsors, chacun avec sa propre photo.
const SHORT = [
  { name: 'Municipalité de Duhamel',     image: '/wix/partenaires/473bdc18.jpg', tag: { FR: 'Municipalité naturelle',                       EN: 'Natural municipality' } },
  { name: 'Académie Scrimicie',          image: '/wix/partenaires/2a2a4608.jpg', tag: { FR: 'École d’escrime AMHE',                          EN: 'AMHE fencing school' } },
  { name: 'Le Salon des Inconnus',       image: '/wix/partenaires/e06a7eba.jpg', tag: { FR: 'Auberge d’artistes · sites web',               EN: 'Artists’ inn · web design' } },
  { name: 'SABCO',                       image: '/wix/partenaires/cf4050ca.jpg', tag: { FR: 'Nettoyage au jet de sable',                     EN: 'Sandblasting services' } },
];

const PartenairesPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <ScrollProgress />
      {/* Page fusionnée (Alex, 2026-08-12) : l'offre de commandite
          (plans Baron / Comte / Duc + Magiciens) ouvre la page, la
          section des partenaires actuels suit en deuxième chapitre. */}
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        orbImage="/tournage/commanditaires-hero.jpg"
        orbImagePosition="center"
      />

      <SponsorOffer />

      {/* ── Chapitre 2 : les partenaires actuels ── */}
      <section className="pt-16 md:pt-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <ChapterIntro eyebrow={t.chapterPartenairesEyebrow} title={t.chapterPartenairesTitle} />
          <Reveal>
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed max-w-3xl mt-6">
              {t.chapterPartenairesIntro}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Press / sponsor logo wall */}
      <section className="py-12 md:py-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal>
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs text-center mb-6">{t.pressEyebrow}</p>
          </Reveal>
          <Stagger className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-90" stagger={0.06}>
            {SPONSORS.map((s) => (
              <StaggerItem key={s.src}>
                <img decoding="async" src={s.src} alt={s.name} title={s.name} className="h-10 md:h-14 w-auto object-contain transition-transform duration-300 hover:scale-105" loading="lazy" />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Featured partners */}
      <section className="">
        {FEATURED.map((p, i) => {
          const reverse = i % 2 === 1;
          return (
            <article key={p.name} className="relative py-16 md:py-24 overflow-hidden">
              <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-8 md:gap-12 items-center">
                <Reveal from={reverse ? 'right' : 'left'} className={`lg:col-span-5 ${reverse ? 'lg:order-2' : ''}`}>
                  {/* Ratio 8:5 = le ratio exact des visuels partenaires
                      (1600x1000) : aucune photo ni logo n'est recadré
                      (demande d'Alex 2026-08-13). */}
                  <div className="relative aspect-[8/5] rounded-lg-card overflow-hidden border">
                    {/* Image simple, pas de RevealImage : sur cette page
                        fusionnée (très longue), le rideau clip-path restait
                        fermé sur certaines cartes et les partenaires
                        semblaient sans photo (constat d'Alex 2026-08-12).
                        Les logos à fond transparent (Montpellier, MRC) se
                        posent sur un panneau ivoire en object-contain,
                        sinon ils disparaissent dans la nuit du site. */}
                    {'logo' in p && p.logo ? (
                      <div className="absolute inset-0 bg-gradient-to-b from-[#f3e9d4] to-[#e2d3b4] flex items-center justify-center p-8 md:p-12">
                        <img
                          src={p.image}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="fmm-no-grade max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <img
                        src={p.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/wix/home/scene-cinematic.jpg'; }}
                      />
                    )}
                    {/* Voile sombre pour asseoir le titre; allégé sur les
                        panneaux de logo pour ne pas les éteindre. */}
                    <div className={'logo' in p && p.logo
                      ? 'absolute inset-0 bg-gradient-to-t from-midnight-deep/85 via-transparent to-transparent'
                      : 'absolute inset-0 bg-gradient-to-t from-midnight-deep/90 via-midnight-deep/20 to-transparent'} />
                    <div className="absolute inset-0 flex items-end p-7 md:p-9">
                      <h3 className="font-display title-medieval text-2xl md:text-4xl text-ivory leading-tight">
                        {p.name}
                      </h3>
                    </div>
                  </div>
                </Reveal>
                <Reveal from={reverse ? 'left' : 'right'} delay={0.1} className={`lg:col-span-7 ${reverse ? 'lg:order-1' : ''}`}>
                  <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">
                    {String(i + 1).padStart(2, '0')} · {t.partner}
                  </p>
                  <div className="divider-brass w-20 mb-5" />
                  <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-6">
                    {lang === 'FR' ? p.bioFR : p.bioEN}
                  </p>
                  {/* Skip the CTA until a real URL is provided. Placeholder
                      anchors like `#TODO_…` are rendered as nothing so we
                      don't ship dead links to visitors. Fill in `href` to
                      promote the partner to a clickable card. */}
                  {p.href.startsWith('#TODO_') ? null : (
                    <a href={p.href} target={p.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                      {p.cta[lang]} <ArrowUpRight size={14} />
                    </a>
                  )}
                </Reveal>
              </div>
            </article>
          );
        })}
      </section>

      {/* Smaller partners, short text cards arranged around a
          Vikings-fight centerpiece. Visuals (copper backdrop glow,
          drop-shadow, bottom-fade mask) cloned from the Green-Knight
          centerpiece on /activites. On desktop the centerpiece occupies
          cols 2-3, rows 1-2 (so 2 partners sit on each side); on mobile
          the centerpiece is a full-width row and partners stack below. */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <Motes className="opacity-40" count={14} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <ChapterIntro eyebrow={t.partnersEyebrow} title={t.partnersTitle} className="mb-10" />
          <Stagger as="div" className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 [grid-auto-flow:dense] items-stretch" stagger={0.08}>
            {/* ── Centerpiece: Vikings fight figure with copper glow + bottom fade ── */}
            <div
              aria-hidden
              className="relative col-span-2 row-span-1 md:col-start-2 md:col-span-2 md:row-span-2 min-h-[280px] md:min-h-[360px] flex items-end justify-center"
            >
              <span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 60% 65% at 50% 55%, rgba(184, 106, 42, 0.22), transparent 70%),' +
                    'radial-gradient(ellipse 45% 55% at 50% 60%, rgba(232, 177, 74, 0.12), transparent 75%)',
                }}
              />
              <img
                src="/characters/vikings-fight.webp"
                alt=""
                className="fmm-no-grade relative w-full h-full object-contain"
                style={{
                  filter:
                    'drop-shadow(0 24px 40px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 24px rgba(184, 106, 42, 0.4))',
                  WebkitMaskImage: 'linear-gradient(to bottom, #000 70%, transparent 100%)',
                  maskImage:       'linear-gradient(to bottom, #000 70%, transparent 100%)',
                }}
              />
              <span
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 bottom-1 w-2/3 h-8 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(0,0,0,0.55), transparent 70%)',
                  filter: 'blur(4px)',
                }}
              />
            </div>

            {SHORT.map((s) => (
              <StaggerItem key={s.name} as="article" className="glass-light rounded-card overflow-hidden text-center transition-transform duration-300 hover:-translate-y-1">
                <div className="relative aspect-[8/5] overflow-hidden">
                  <img src={s.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight-deep/80 to-transparent" />
                </div>
                <div className="p-4 md:p-5">
                  <h3 className="font-display title-medieval text-base md:text-lg text-ivory mb-1.5">{s.name}</h3>
                  <p className="font-editorial italic text-sm text-ivory-soft">{s.tag[lang]}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Become a partner CTA */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="top" />
        <Motes className="opacity-50" count={16} />
        <Reveal className="relative z-10 max-w-2xl mx-auto px-4 md:px-8 text-center">
          <Heart size={28} className="text-brass mx-auto mb-4" />
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.becomeEyebrow}</p>
          <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-4">{t.becomeTitle}</h2>
          <div className="divider-brass w-16 mx-auto mb-6" />
          <p className="font-editorial text-base md:text-lg text-ivory-soft mb-8 leading-relaxed">{t.becomeBody}</p>
          <a href={`mailto:admin@festivalmedievaldemontpellier.org?subject=${encodeURIComponent(t.becomeMail)}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
            {t.becomeCta} <ArrowUpRight size={14} />
          </a>
        </Reveal>
      </section>
    </>
  );
};

const FR = {
  home: 'Accueil', eyebrow: 'La cour du festival', title: 'Commanditaires',
  intro: 'Votre entreprise peut prendre rang à la cour du Festival Médiéval de Montpellier. Trois plans de commandite, trois rangs de noblesse : plus votre maison s’engage, plus haut flotte sa bannière.',
  chapterPartenairesEyebrow: 'Avec nous', chapterPartenairesTitle: 'Nos Partenaires',
  chapterPartenairesIntro: 'Sans les dons en temps et en ressources, sans le soutien financier, structurel et relationnel qu’apportent nos partenaires, le FMM ne serait qu’un rêve lointain dans la tête d’un fermier du nord dont la mémoire cellulaire se rappelle des combats d’antan.',
  pressEyebrow: 'Ils en parlent',
  partner: 'Partenaire',
  partnersEyebrow: 'Plus de partenaires', partnersTitle: 'Soutiens et collaborations',
  becomeEyebrow: 'Rejoindre la cour', becomeTitle: 'Votre partenariat ici',
  becomeBody: 'Cet espace est réservé à un futur partenaire VIP souhaitant contribuer à faire évoluer le projet. Pour devenir partenaire VIP, écrivez-nous.',
  becomeCta: 'Devenir partenaire',
  becomeMail: 'Devenir partenaire : FMM 2026',
};
const EN = {
  home: 'Home', eyebrow: 'The festival court', title: 'Sponsors',
  intro: 'Your business can take rank at the court of the Festival Médiéval de Montpellier. Three sponsorship plans, three ranks of nobility: the more your house commits, the higher its banner flies.',
  chapterPartenairesEyebrow: 'With us', chapterPartenairesTitle: 'Our Partners',
  chapterPartenairesIntro: 'Without the gifts of time and resources, without the financial, structural and relational support our partners bring, FMM would only be a distant dream in the head of a northern farmer whose cellular memory recalls battles of old.',
  pressEyebrow: 'They talk about us',
  partner: 'Partner',
  partnersEyebrow: 'More partners', partnersTitle: 'Supporters and collaborators',
  becomeEyebrow: 'Join the court', becomeTitle: 'Your partnership here',
  becomeBody: 'This spot is reserved for a future VIP partner wishing to help grow the project. To become a VIP partner, write to us.',
  becomeCta: 'Become a partner',
  becomeMail: 'Become a partner: FMM 2026',
};

export default PartenairesPage;
