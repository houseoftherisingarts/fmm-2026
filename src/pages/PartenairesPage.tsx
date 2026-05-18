import React from 'react';
import { motion } from 'framer-motion';
import {ArrowUpRight, Heart} from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { SPONSORS } from '../content';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';

// Featured partners — long-form cards, cloned from the live Wix copy.
const FEATURED = [
  {
    name: 'Municipalité de Montpellier',
    bioFR: 'En accueillant le festival sur leurs terres, la municipalité permet un événement à grand déploiement, riche, et impossible à recréer dans les grands centres urbains.',
    bioEN: 'By hosting the festival on their land, the municipality enables a sweeping, rich event impossible to recreate in major urban centres.',
    href: '#TODO_municipalite-montpellier',
    cta: { FR: 'Site de la municipalité', EN: 'Municipality site' },
  },
  {
    name: 'Groupe Gagnon',
    bioFR: 'Depuis la première itération, Le Groupe Gagnon est un de nos partenaires les plus fidèles et les plus généreux. Nous sommes fiers d’acheter local — et ils sont fiers de commanditer local.',
    bioEN: 'Since the very first edition, Groupe Gagnon has been one of our most loyal and generous partners. We are proud to buy local — and they are proud to sponsor local.',
    href: '#TODO_groupe-gagnon',
    cta: { FR: 'Quincaillerie', EN: 'Hardware store' },
  },
  {
    name: 'MRC Papineau',
    bioFR: 'La MRC de Papineau soutient le FMM et bien d’autres initiatives locales. L’an dernier, ils ont financé le festival à hauteur de 15 000 $, ce qui permet de garder nos prix bas. Visitez leur site pour voir l’étendue de leur portée.',
    bioEN: 'MRC Papineau supports FMM and many other local initiatives. Last year they funded the festival to the tune of $15,000, helping us keep prices low. Visit their site to see the breadth of their reach.',
    href: '#TODO_mrc-papineau',
    cta: { FR: 'Site de la MRC', EN: 'MRC site' },
  },
  {
    name: 'Ferme Coopérative Agricola',
    bioFR: 'Agricola est une coopérative de travailleur·euse·s — elle appartient aux personnes qui cultivent votre nourriture. Nous croyons que la nourriture devrait construire la communauté, être écologiquement durable, et être un plaisir à grandir et à manger.',
    bioEN: 'Agricola is a worker cooperative — owned by the people who grow your food. We believe food should build community, be ecologically sustainable, and be a joy to grow and eat.',
    href: '#TODO_agricola',
    cta: { FR: 'Site et paniers', EN: 'Site and baskets' },
  },
  {
    name: 'Les Autobus du Village & Escalade Petite-Nation',
    bioFR: 'En transportant nos Vikings d’Europe et nos enfants, Les Autobus du Village nous permettent d’améliorer grandement notre programmation. Nous vous invitons à découvrir « Escalade Petite-Nation », un affilié, qui offre de magnifiques expériences locales.',
    bioEN: 'By transporting our Vikings from Europe and our children, Les Autobus du Village let us greatly improve our programming. We invite you to discover "Escalade Petite-Nation", an affiliate offering wonderful local experiences.',
    href: '#TODO_autobus',
    cta: { FR: 'Escalade & Autobus', EN: 'Climbing & Coaches' },
  },
];

// Smaller partners + sponsors (text-only cards)
const SHORT = [
  { name: 'Municipalité de Duhamel',     tag: { FR: 'Municipalité naturelle',                       EN: 'Natural municipality' } },
  { name: 'Académie Scrimicie',          tag: { FR: 'École d’escrime AMHE',                          EN: 'AMHE fencing school' } },
  { name: 'Le Salon des Inconnus',       tag: { FR: 'Auberge d’artistes — sites web',               EN: 'Artists’ inn — web design' } },
  { name: 'SABCO',                       tag: { FR: 'Nettoyage au jet de sable',                     EN: 'Sandblasting services' } },
];

const PartenairesPage: React.FC = () => {
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
        orbImage="/wix/partenaires/2a2a4608.jpg"
        orbImagePosition="center"
      />

      {/* Press / sponsor logo wall */}
      <section className="py-12 md:py-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs text-center mb-6">{t.pressEyebrow}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-90">
            {SPONSORS.map((s) => (
              <img decoding="async" key={s.src} src={s.src} alt={s.name} title={s.name} className="h-10 md:h-14 w-auto object-contain" loading="lazy" />
            ))}
          </div>
        </div>
      </section>

      {/* Featured partners */}
      <section className="">
        {FEATURED.map((p, i) => {
          const reverse = i % 2 === 1;
          return (
            <article key={p.name} className="relative py-16 md:py-24 overflow-hidden">
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.6 }}
                className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-8 md:gap-12 items-center"
              >
                <div className={`lg:col-span-5 ${reverse ? 'lg:order-2' : ''}`}>
                  <div className="relative aspect-square md:aspect-[4/3] rounded-lg-card overflow-hidden border">
                    <img src={['/wix/partenaires/89f9a2db.jpg','/wix/partenaires/58f7a1f9.jpg','/wix/partenaires/9487bac5.jpg','/wix/partenaires/473bdc18.jpg','/wix/partenaires/7a32a3a6.png'][i % 5]}
                      alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/wix/home/scene-cinematic.jpg'; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight-deep via-midnight-deep/70 to-midnight-deep/30" />
                    <div className="absolute inset-0 flex items-end p-7 md:p-9">
                      <h3 className="font-display title-medieval text-2xl md:text-4xl text-ivory leading-tight">
                        {p.name}
                      </h3>
                    </div>
                  </div>
                </div>
                <div className={`lg:col-span-7 ${reverse ? 'lg:order-1' : ''}`}>
                  <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">
                    {String(i + 1).padStart(2, '0')} · {t.partner}
                  </p>
                  <div className="divider-brass w-20 mb-5" />
                  <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-6">
                    {lang === 'FR' ? p.bioFR : p.bioEN}
                  </p>
                  {/* Skip the CTA until a real URL is provided — placeholder
                      anchors like `#TODO_…` are rendered as nothing so we
                      don't ship dead links to visitors. Fill in `href` to
                      promote the partner to a clickable card. */}
                  {p.href.startsWith('#TODO_') ? null : (
                    <a href={p.href} target={p.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                      {p.cta[lang]} <ArrowUpRight size={14} />
                    </a>
                  )}
                </div>
              </motion.div>
            </article>
          );
        })}
      </section>

      {/* Smaller partners — short text cards arranged around a
          Vikings-fight centerpiece. Visuals (copper backdrop glow,
          drop-shadow, bottom-fade mask) cloned from the Green-Knight
          centerpiece on /activites. On desktop the centerpiece occupies
          cols 2-3, rows 1-2 (so 2 partners sit on each side); on mobile
          the centerpiece is a full-width row and partners stack below. */}
      <section className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.partnersEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-4xl text-ivory mb-3">{t.partnersTitle}</h2>
            <div className="divider-brass w-20 mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 [grid-auto-flow:dense] items-stretch">
            {/* ── Centerpiece — Vikings fight figure with copper glow + bottom fade ── */}
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
                src="/characters/vikings-fight.png"
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
              <article key={s.name} className="glass-light rounded-card p-5 md:p-6 text-center">
                <h3 className="font-display title-medieval text-base md:text-lg text-ivory mb-1.5">{s.name}</h3>
                <p className="font-editorial italic text-sm text-ivory-soft">{s.tag[lang]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Become a partner CTA */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto px-4 md:px-8 text-center">
          <Heart size={28} className="text-brass mx-auto mb-4" />
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.becomeEyebrow}</p>
          <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-4">{t.becomeTitle}</h2>
          <div className="divider-brass w-16 mx-auto mb-6" />
          <p className="font-editorial text-base md:text-lg text-ivory-soft mb-8 leading-relaxed">{t.becomeBody}</p>
          <a href={`mailto:admin@festivalmedievaldemontpellier.org?subject=${encodeURIComponent(t.becomeMail)}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
            {t.becomeCta} <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
    </>
  );
};

const FR = {
  home: 'Accueil', eyebrow: 'Avec nous', title: 'Nos Partenaires',
  intro: 'Sans les dons en temps et en ressources, sans le soutien financier, structurel et relationnel qu’apportent nos partenaires, le FMM ne serait qu’un rêve lointain dans la tête d’un fermier du nord dont la mémoire cellulaire se rappelle des combats d’antan.',
  pressEyebrow: 'Ils en parlent',
  partner: 'Partenaire',
  partnersEyebrow: 'Plus de partenaires', partnersTitle: 'Soutiens et collaborations',
  becomeEyebrow: 'Rejoindre la cour', becomeTitle: 'Votre partenariat ici',
  becomeBody: 'Cet espace est réservé à un futur partenaire VIP souhaitant contribuer à faire évoluer le projet. Pour devenir partenaire VIP, écrivez-nous.',
  becomeCta: 'Devenir partenaire',
  becomeMail: 'Devenir partenaire — FMM 2026',
};
const EN = {
  home: 'Home', eyebrow: 'With us', title: 'Our Partners',
  intro: 'Without the gifts of time and resources, without the financial, structural and relational support our partners bring, FMM would only be a distant dream in the head of a northern farmer whose cellular memory recalls battles of old.',
  pressEyebrow: 'They talk about us',
  partner: 'Partner',
  partnersEyebrow: 'More partners', partnersTitle: 'Supporters and collaborators',
  becomeEyebrow: 'Join the court', becomeTitle: 'Your partnership here',
  becomeBody: 'This spot is reserved for a future VIP partner wishing to help grow the project. To become a VIP partner, write to us.',
  becomeCta: 'Become a partner',
  becomeMail: 'Become a partner — FMM 2026',
};

export default PartenairesPage;
