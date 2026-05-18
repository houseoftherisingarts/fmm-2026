import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { PILLAR_BY_KEY, SITE, SPONSORS } from '../content';
import { useCountdown } from '../lib/useCountdown';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import Brume from '../components/Brume';

// Real homepage — clones the live Wix `/festival-medieval-de-montpellier`
// flow, captured 2026-04-25. Section order matches the source page:
//   1. Hero — viking helmet bg + glass info card right
//   2. Le Festival — guitarist glass card (À nos découvrir)
//   3. Two-up explorer cards (Activités + Histoire)
//   4. Nouveautés — 3 cards w/ vertical sword divider
//   5. Editorial body (light section) — "le Moyen Âge"
//   6. Wood-plank Billetterie callout
//   7. Banquet glass card
//   8. Full-bleed Carte du site
//   9. Marché split + 3-up cross-promo
//  10. Shields band — Devenir Bénévole overlay
//  11. Juste l'infolettre over fire scene
const AccueilPage: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const cd = useCountdown(`${SITE.dates.start}T10:00:00-04:00`);
  const ticketUrl = import.meta.env.VITE_ZEFFY_TICKET_URL || '#';

  return (
    <>
      <SEO />

      {/* ── 1. Hero — Viking helmet + glass info card (restored after the
              dedicated /welcome page took the cinematic role) ── */}
      <section className="relative min-h-[100svh] text-ivory overflow-hidden">
        <img decoding="async" fetchPriority="low" src="/wix/home/viking-helmet.jpg" alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-left" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight-deep/30 via-midnight-deep/40 to-midnight-deep/95" />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep/40 via-transparent to-midnight-deep/85" />
        <Brume />

        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 pt-32 pb-20 md:pt-40 md:pb-28 min-h-[100svh] flex items-center">
          <div className="ml-auto w-full md:w-[58%] lg:w-[48%]">
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}
              className="glass-on-photo rounded-lg-card p-7 md:p-10"
            >
              <p className="font-editorial italic text-brass uppercase tracking-[0.4em] text-xs md:text-sm mb-3">
                {t.hero.eyebrow}
              </p>
              <h1 className="font-display title-medieval text-3xl sm:text-4xl md:text-6xl text-ivory mb-3 leading-tight">
                {t.hero.title}
              </h1>
              <p className="font-display title-medieval text-base md:text-lg text-brass mb-5 tracking-widest">
                {t.hero.dates}
              </p>
              <div className="divider-brass w-20 mb-5" />
              <p className="font-editorial text-base md:text-lg text-ivory leading-relaxed mb-6">
                {t.hero.subtitle}
              </p>
              <a href={ticketUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                {t.hero.primaryCta} <ArrowUpRight size={14} />
              </a>

              {!cd.isPast && (
                <div className="mt-8 pt-6">
                  <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-[10px] mb-3 text-center">
                    {lang === 'FR' ? 'Avant l’ouverture des portes' : 'Until the gates open'}
                  </p>
                  <div className="grid grid-cols-4 gap-2 md:gap-3">
                    {[
                      { label: lang === 'FR' ? 'Jours'    : 'Days',    value: cd.days },
                      { label: lang === 'FR' ? 'Heures'   : 'Hours',   value: cd.hours },
                      { label: lang === 'FR' ? 'Minutes'  : 'Min',     value: cd.minutes },
                      { label: lang === 'FR' ? 'Secondes' : 'Sec',     value: cd.seconds },
                    ].map((b) => (
                      <div key={b.label} className="text-center glass-frost rounded-card py-2.5 md:py-3">
                        <div className="font-display title-medieval text-xl sm:text-2xl md:text-3xl text-brass tabular-nums leading-none">
                          {String(b.value).padStart(2, '0')}
                        </div>
                        <div className="font-sans text-[9px] md:text-[10px] uppercase tracking-widest text-ivory-soft mt-1.5">{b.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 2. Le Festival / À nos découvrir — guitarist photo card ── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3 text-center md:text-left">
            {t.festival.eyebrow}
          </p>
          <h2 className="font-display title-medieval text-3xl sm:text-4xl md:text-6xl text-ivory mb-12 text-center md:text-left">
            {t.festival.title}
          </h2>

          <div className="grid lg:grid-cols-12 gap-6 md:gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-7 aspect-[16/10] rounded-lg-card overflow-hidden border"
            >
              <img decoding="async" src="/wix/home/stage-photo.jpg" alt="" className="w-full h-full object-cover" loading="lazy" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="lg:col-span-5 glass-on-photo rounded-lg-card p-7 md:p-9"
            >
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">
                {t.festival.cardEyebrow}
              </p>
              <h3 className="font-display title-medieval text-xl sm:text-2xl md:text-3xl text-ivory mb-4">
                {t.festival.cardTitle}
              </h3>
              <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-6">
                {t.festival.cardBody}
              </p>
              <Link to={addLocale('/musique', lang)}
                className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-brass hover:text-brass-soft transition group">
                {t.festival.cardCta}
                <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 3. Two-up explorer cards — Activités + Histoire ── */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-6 md:gap-8">
          {[
            { key: 'activites', body: t.explorerActivites,  cta: t.explorerActivitesCta, image: '/wix/home/viking-band.jpg' },
            { key: 'histoire',  body: t.explorerHistoire,   cta: t.explorerHistoireCta,  image: '/wix/home/scene-cinematic.jpg' },
          ].map((c, i) => {
            const p = PILLAR_BY_KEY[c.key as 'activites' | 'histoire'];
            return (
              <motion.article
                key={c.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="relative aspect-[4/3] md:aspect-[4/5] rounded-lg-card overflow-hidden group"
              >
                <img decoding="async" src={c.image} alt="" className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight-deep via-midnight-deep/60 to-midnight-deep/15" />
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                  <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-2">
                    {p.short[lang]}
                  </p>
                  <h3 className="font-display title-medieval text-2xl md:text-4xl text-ivory mb-3">{p.label[lang]}</h3>
                  <div className="divider-brass w-16 mb-4" />
                  <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed mb-5">
                    {c.body}
                  </p>
                  <Link to={p.slug[lang]}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                    {c.cta} <ArrowUpRight size={14} />
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* ── 4. Nouveautés 2026 — 3 cards with vertical sword divider ── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory text-center mb-3">{t.nouveautes.title}</h2>
          <div className="divider-brass w-20 mx-auto mb-12 md:mb-16" />

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 relative">
            {/* Vertical sword divider — decorative, hidden on small */}
            <div aria-hidden className="hidden md:block absolute left-1/3 top-0 bottom-0 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-brass/40 to-transparent" />
            <div aria-hidden className="hidden md:block absolute left-2/3 top-0 bottom-0 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-brass/40 to-transparent" />

            {t.nouveautes.cards.map((c, i) => (
              <motion.article
                key={c.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="glass-on-photo rounded-lg-card p-6 md:p-8 flex flex-col text-center"
              >
                <div className="w-16 h-16 mb-5 mx-auto rounded-card overflow-hidden border border-brass/40">
                  <img decoding="async" src={c.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-3">{c.title}</h3>
                <p className="font-editorial italic text-sm text-ivory-soft mb-2">{c.eyebrow}</p>
                <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed mb-6 flex-1">
                  {c.body}
                </p>
                <Link to={c.href}
                  className="self-center inline-flex items-center gap-2 px-5 py-2 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                  {c.cta}
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Editorial body — light "Le Moyen Âge" section ── */}
      <section className="relative py-20 md:py-32 overflow-hidden" style={{ backgroundColor: 'var(--color-mist)' }}>
        <Brume tone="light" />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-3 md:order-1 order-2">
            <p className="font-editorial italic uppercase tracking-[0.3em] text-xs mb-3" style={{ color: 'var(--color-mist-deep)' }}>
              {t.editorial.eyebrow}
            </p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl mb-6" style={{ color: 'var(--color-midnight-deep)' }}>
              {t.editorial.title}
            </h2>
            <Link to={addLocale('/apprendre', lang)}
              className="inline-flex items-center gap-2 px-6 py-2.5 border-2 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card hover: hover:text-mist"
              style={{ borderColor: 'var(--color-midnight-deep)', color: 'var(--color-midnight-deep)' }}>
              {t.editorial.cta} <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="md:col-span-9 md:order-2 order-1 grid md:grid-cols-2 gap-6 md:gap-10">
            <p className="font-editorial text-base md:text-lg leading-relaxed" style={{ color: 'var(--color-midnight-deep)' }}>
              {t.editorial.body1}
            </p>
            <p className="font-editorial text-base md:text-lg leading-relaxed" style={{ color: 'var(--color-midnight-deep)' }}>
              {t.editorial.body2}
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Wood-plank Billetterie callout ── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <motion.img
            src="/site/medieval-ticket.png"
            alt=""
            initial={{ opacity: 0, rotate: -8, x: -40 }}
            whileInView={{ opacity: 1, rotate: -3, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="w-full max-w-md mx-auto md:mx-0 drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)]"
          />
          <div>
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">
              {t.billetterie.eyebrow}
            </p>
            <h2 className="font-display title-medieval text-3xl sm:text-4xl md:text-6xl text-ivory mb-4">
              {t.billetterie.title}
            </h2>
            <div className="divider-brass w-24 mb-5" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-7 max-w-md">
              {t.billetterie.lead}
            </p>
            <a href={ticketUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
              {t.billetterie.cta} <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ── 7. Banquet glass card ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <img decoding="async" fetchPriority="low" src="/wix/home/bonfire-warm.jpg" alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep via-midnight/85 to-midnight-deep" />
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <motion.article
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="glass-on-photo rounded-lg-card p-7 md:p-10 grid md:grid-cols-12 gap-6 md:gap-8 items-start"
          >
            <div className="md:col-span-3">
              <div className="aspect-square rounded-card overflow-hidden border border-brass/30">
                <img decoding="async" src="/wix/home/bonfire-warm.jpg" alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
            <div className="md:col-span-9">
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.banquet.eyebrow}</p>
              <h3 className="font-display title-medieval text-2xl md:text-4xl text-ivory mb-3">{t.banquet.title}</h3>
              <div className="divider-brass w-20 mb-4" />
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-5">{t.banquet.body}</p>
              <p className="font-editorial italic text-sm text-ivory-soft mb-6">{t.banquet.note}</p>
              <Link to={addLocale('/nourriture', lang)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                {t.banquet.cta} <ArrowUpRight size={14} />
              </Link>
            </div>
          </motion.article>
        </div>
      </section>

      {/* ── 8. Carte du site — full-bleed ── */}
      <section className="relative py-12 md:py-16">
        <div className="text-center mb-8 md:mb-12 px-4">
          <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-2">{t.map.eyebrow}</p>
          <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory">{t.map.title}</h2>
        </div>
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1 }}
          className="relative w-full overflow-hidden fade-y"
        >
          <img decoding="async" src="/site/carte-fmm-2025.jpg" alt={t.map.title} className="w-full h-auto" loading="lazy" />
        </motion.div>
      </section>

      {/* ── 9. Marché split + 3-up cross-promo ── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 space-y-6 md:space-y-8">

          <div className="grid md:grid-cols-12 gap-5 md:gap-6">
            <Link to={addLocale('/marche', lang)}
              className="md:col-span-5 group relative aspect-[4/3] md:aspect-auto md:min-h-[280px] rounded-lg-card overflow-hidden">
              <img decoding="async" src="/wix/home/marchand.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-tr from-midnight-deep via-midnight-deep/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <h3 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-3">{t.marche.title}</h3>
                <span className="inline-flex items-center gap-2 px-5 py-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold rounded-card">
                  {t.marche.cta} <ArrowUpRight size={14} />
                </span>
              </div>
            </Link>
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
              {[
                { key: 'hebergement' as const, body: t.crosspromo.hebergement, cta: t.crosspromo.hebergementCta, image: '/wix/jeunesse/2b1f82d0.jpg' },
                { key: 'partenaires' as const, body: t.crosspromo.partenaires, cta: t.crosspromo.partenairesCta, image: '/wix/home/viking-band.jpg' },
              ].map((c) => {
                const p = PILLAR_BY_KEY[c.key];
                return (
                  <Link key={c.key} to={p.slug[lang]} className="group relative min-h-[200px] rounded-lg-card overflow-hidden flex flex-col justify-end">
                    <img decoding="async" src={c.image} alt="" className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight-deep via-midnight-deep/55 to-transparent" />
                    <div className="relative p-5 md:p-6">
                      <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-1.5">{p.label[lang]}</h3>
                      <p className="font-editorial text-sm text-ivory-soft mb-3 leading-snug">{c.body}</p>
                      <span className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-widest text-brass">
                        {c.cta} <ArrowUpRight size={12} />
                      </span>
                    </div>
                  </Link>
                );
              })}
              {/* Photographies cross-promo — non-clickable until a real
                  destination exists. Keeps the visual + copy in place. */}
              <div className="sm:col-span-2 relative min-h-[140px] rounded-lg-card overflow-hidden flex items-center justify-center">
                <img decoding="async" src="/wix/home/scene-cinematic.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight-deep/95 via-midnight-deep/60 to-midnight-deep/40" />
                <div className="relative text-center p-6">
                  <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-1">{t.crosspromo.photos}</h3>
                  <p className="font-editorial italic text-sm text-ivory-soft">{t.crosspromo.photosBody}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. Shields band — Devenir Bénévole overlay ── */}
      <section className="relative">
        <Link to={addLocale('/benevole', lang)} className="block relative overflow-hidden group">
          <img decoding="async" fetchPriority="low" src="/wix/home/shields-blue.jpg" alt="" aria-hidden
            className="w-full h-[280px] md:h-[420px] object-cover scale-105 group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-r from-midnight-deep via-midnight-deep/60 to-midnight-deep/85" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-screen-xl mx-auto px-4 md:px-8 w-full">
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.shields.eyebrow}</p>
              <h2 className="font-display title-medieval text-3xl sm:text-4xl md:text-6xl text-ivory mb-4">
                {t.shields.title}
              </h2>
              <div className="divider-brass w-24 mb-5" />
              <p className="font-editorial text-base md:text-lg text-ivory-soft max-w-md mb-6">{t.shields.body}</p>
              <span className="inline-flex items-center gap-2 px-6 py-2.5 border border-brass text-brass group-hover:bg-brass group-hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                {t.shields.cta} <ArrowUpRight size={14} />
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ── 11. Juste l'infolettre over fire scene ── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <img decoding="async" fetchPriority="low" src="/wix/home/fire-night.jpg" alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep/80 via-midnight-deep/65 to-midnight-deep" />
        <div className="relative z-10 max-w-2xl mx-auto px-4 md:px-8">
          <NewsletterCard t={t.newsletter} />
        </div>
      </section>

      {/* ── Sponsor strip ── */}
      <section className="py-10">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs text-center mb-5">
            {t.sponsors}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 opacity-90">
            {SPONSORS.map((s) => (
              <img decoding="async" key={s.src} src={s.src} alt={s.name} title={s.name} className="h-8 md:h-10 w-auto object-contain" loading="lazy" />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

// ─── Newsletter card (extracted for readability) ────────────────────
interface NewsletterT { eyebrow: string; title: string; body: string; emailLabel: string; consent: string; cta: string; thanks: string }
const NewsletterCard: React.FC<{ t: NewsletterT }> = ({ t }) => {
  const [email, setEmail] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7 }}
      className="glass-on-photo rounded-lg-card p-7 md:p-10"
    >
      <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.eyebrow}</p>
      <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory mb-4">{t.title}</h2>
      <p className="font-editorial text-base text-ivory-soft mb-6">{t.body}</p>
      {sent ? (
        <p className="font-editorial italic text-brass">{t.thanks}</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (email && consent) setSent(true); }}>
          <label className="block font-display title-medieval text-xs text-brass mb-1.5">{t.emailLabel}</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full /50 border px-3.5 py-2.5 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card mb-4" />
          <label className="flex items-start gap-3 font-editorial text-sm text-ivory-soft mb-5 cursor-pointer">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-4 h-4 accent-brass" />
            <span>{t.consent}</span>
          </label>
          <button type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
            {t.cta} <ArrowUpRight size={14} />
          </button>
        </form>
      )}
    </motion.div>
  );
};

const FR = {
  hero: {
    eyebrow: 'Édition 2026 · Caravanes & Saltimbanques',
    title: 'FMM 2026',
    dates: '25 — 26 — 27 septembre 2026',
    subtitle: 'Trois jours sur les routes du temps. Caravanes, fauves de scène, tarot, tambours et troupes nordiques — au cœur de Montpellier, Québec.',
    primaryCta: 'Acheter mes billets',
    secondaryCta: 'Découvrir le festival',
  },
  festival: {
    eyebrow: 'Le festival',
    title: 'Le festival',
    cardEyebrow: 'À nos découvrir',
    cardTitle: 'Quatre ans de festoiement',
    cardBody: 'Depuis plus de 4 ans, le FMM offre une immersion unique en créant un espace où la résilience, l’histoire et l’esprit du temps se rencontrent.',
    cardCta: 'Lire',
  },
  explorerActivites: 'Enfilez votre tunique ou votre curiosité, et laissez-vous emporter par la magie du Festival Médiéval de Montpellier. Bienvenue dans le monde des Vikings, où la mer, la terre et les étoiles racontent des histoires immortelles.',
  explorerActivitesCta: 'Voir les activités',
  explorerHistoire: 'Quatre ans, des dizaines de troupes, des milliers de visiteurs et un site qui grandit d’édition en édition. Plongez dans nos archives.',
  explorerHistoireCta: 'Voir l’histoire',
  nouveautes: {
    title: 'Nouveautés 2026',
    cards: [
      { title: 'Village Nourriture',   eyebrow: 'Nouveau Banquet du Valhalla', body: 'Une expérience culinaire élargie et renouvelée qui saura vous émerveiller à boire et à manger.', image: '/wix/home/bonfire-warm.jpg', href: '/nourriture', cta: 'Voir les menus' },
      { title: 'Espace Jeunesse',      eyebrow: 'Parc et activités',           body: 'Un parc, un espace frais, un coin pour les ados et tous les ateliers pour les jeunes seigneurs.',  image: '/wix/jeunesse/2b1f82d0.jpg', href: '/jeunesse',  cta: 'Détails et inscriptions' },
      { title: 'Nouvelles Animations', eyebrow: 'De nouveaux spectacles et +', body: 'Cette année, nous ajoutons des bouchées d’animation, des troupes des attractions et de la musique aux multiples chorégraphies et cérémonies.', image: '/wix/home/fire-night.jpg', href: '/activites', cta: 'Détails' },
    ],
  },
  editorial: {
    eyebrow: 'Le Moyen Âge',
    title: 'Apprendre, c’est traverser les siècles',
    body1: 'Le « médiéval » ou le « Moyen Âge », bien que souvent associé à l’Europe, est aussi une ère vaste qui s’étend sur des siècles et des territoires variés. Avant l’époque des grandes colonisations, comment vivaient les différentes sociétés du monde ? Une plongée loin des clichés de chevaliers — une ouverture sur les multiples facettes de cette période à travers le monde.',
    body2: 'Au-delà de cette cacophonie dissonante, qu’est-ce qu’il y avait de beau dans les notes subtiles de la symphonie qui a marqué l’histoire de traits plus fins ? Desquelles de ces idéologies, pratiques et savoirs naturels, essentiels et primaires, peut-on encore s’inspirer aujourd’hui ?',
    cta: 'Apprendre',
  },
  billetterie: {
    eyebrow: 'Billetterie',
    title: 'Billets',
    lead: 'Migrez sur notre portail de paiement ZEFFY pour acheter vos billets. Tarifs adaptés aux familles, formules journée, fin de semaine ou banquet.',
    cta: 'Acheter sur Zeffy',
  },
  banquet: {
    eyebrow: 'Réservation requise',
    title: 'Banquet de l’Équinoxe (50 places)',
    body: 'Une tablée foisonnante à 5 services sur réservation, avec un spectacle musical de bardes à la table.',
    note: 'Places limitées · Pourboire non inclus · Menu sujet à changement selon la disponibilité locale des produits. Dimanche · 13h00 · 100$. Date limite d’inscription : 7 septembre 2026.',
    cta: 'Voir le menu',
  },
  map: { eyebrow: 'Plan du site', title: 'Le village s’étend dans le bois' },
  marche: { title: 'Marché', cta: 'Magasiner' },
  crosspromo: {
    hebergement:    'Le FMM est accessible aux options d’hébergement variées dans la Petite-Nation.',
    hebergementCta: 'Loger',
    partenaires:    'Vos partenaires rendent le festival possible — découvrez qui ils sont et soutenez-les.',
    partenairesCta: 'Voir et acheter',
    photos:         'Photographies',
    photosBody:     'Téléchargez les photos officielles de l’édition.',
    photosCta:      'Galerie',
  },
  shields: {
    eyebrow: 'Le cœur du festival',
    title: 'Devenir bénévole',
    body: 'Le FMM est opéré par une équipe de bénévoles. Joignez-vous à nous : montage, accueil, animation, démontage. Tous les profils bienvenus.',
    cta: 'Joindre l’équipe',
  },
  newsletter: {
    eyebrow: 'Restez à la cour',
    title: 'Juste l’infolettre',
    body: 'Si vous ne voulez pas les autres avantages d’être membre mais que vous voulez quand même tout savoir.',
    emailLabel: 'Courriel',
    consent: 'Oui, je veux prendre le temps de lire une petite lettre de temps en temps.',
    cta: 'Envoyer',
    thanks: 'Merci ! Nous vous écrirons bientôt.',
  },
  sponsors: 'Ils en parlent',
};

const EN = {
  hero: {
    eyebrow: '2026 Edition · Caravans & Players',
    title: 'FMM 2026',
    dates: 'September 25 — 26 — 27, 2026',
    subtitle: 'Three days on the roads of time. Caravans, troupe-fire, tarot, drums and Nordic clans — in the heart of Montpellier, Quebec.',
    primaryCta: 'Get my tickets',
    secondaryCta: 'Discover the festival',
  },
  festival: {
    eyebrow: 'The festival',
    title: 'The festival',
    cardEyebrow: 'Discover',
    cardTitle: 'Four years of feasting',
    cardBody: 'For over 4 years FMM has offered a unique immersion — a space where resilience, history and the spirit of the times come together.',
    cardCta: 'Read on',
  },
  explorerActivites: 'Slip on your tunic — or your curiosity — and let yourself be carried away by the magic of FMM. Welcome to the world of the Vikings, where sea, earth and stars tell immortal stories.',
  explorerActivitesCta: 'See activities',
  explorerHistoire: 'Four years, dozens of troupes, thousands of visitors and a site that grows edition by edition. Step into our archives.',
  explorerHistoireCta: 'See the history',
  nouveautes: {
    title: 'New for 2026',
    cards: [
      { title: 'Food Village',      eyebrow: 'New Valhalla banquet',   body: 'An expanded, renewed culinary experience to delight in eating and drinking.',                                          image: '/wix/home/bonfire-warm.jpg', href: '/en/food',    cta: 'See the menus' },
      { title: 'Youth Space',       eyebrow: 'Park and activities',    body: 'A park, a cool space, a teen corner, plus all the workshops for the young lords.',                                       image: '/wix/jeunesse/2b1f82d0.jpg', href: '/en/youth',   cta: 'Details & sign-up' },
      { title: 'New Programming',   eyebrow: 'New shows and more',     body: 'This year we add bites of animation, troupes, attractions and music — with multiple choreographies and ceremonies.',     image: '/wix/home/fire-night.jpg',  href: '/en/activities', cta: 'Details' },
    ],
  },
  editorial: {
    eyebrow: 'The Middle Ages',
    title: 'Learning across centuries',
    body1: '"Medieval" or "Middle Ages" — though often tied to Europe — is also a vast era stretching across centuries and territories. Before the great colonisations, how did the world’s societies live? A dive far from knight-clichés, an opening onto the many facets of the period worldwide.',
    body2: 'Beyond the dissonant cacophony, what was beautiful in the subtler notes of the symphony that shaped history with finer strokes? Which of those ideologies, practices and natural, essential, primary knowings can still inspire us today?',
    cta: 'Learn',
  },
  billetterie: { eyebrow: 'Ticketing', title: 'Tickets', lead: 'Head to our Zeffy payment portal to purchase your tickets. Family-adjusted pricing, day, weekend or banquet packages.', cta: 'Buy on Zeffy' },
  banquet:     { eyebrow: 'Reservation required', title: 'Equinox Banquet (50 seats)', body: 'A teeming 5-course table by reservation with bard musicians at table.', note: 'Limited seats · Tip not included · Menu subject to change based on local availability. Sunday · 1:00 PM · $100. Registration deadline: September 7, 2026.', cta: 'See the menu' },
  map: { eyebrow: 'Site plan', title: 'The village stretches through the woods' },
  marche: { title: 'Market', cta: 'Shop' },
  crosspromo: {
    hebergement: 'FMM is accessible from a range of lodging options in the Petite-Nation.', hebergementCta: 'Stay over',
    partenaires: 'Our partners make the festival possible — meet them and support them.',  partenairesCta: 'See and shop',
    photos: 'Photos', photosBody: 'Download the official photos of the edition.',          photosCta: 'Gallery',
  },
  shields: { eyebrow: 'The heart of the festival', title: 'Become a Volunteer', body: 'FMM is run by a volunteer team. Join us — setup, welcome, programming, teardown. All profiles welcome.', cta: 'Join the team' },
  newsletter: { eyebrow: 'Stay at court', title: 'Just the newsletter', body: 'If you don’t want the other member perks but still want to be in the know.', emailLabel: 'Email', consent: 'Yes — I’ll take the time to read a short letter now and then.', cta: 'Send', thanks: 'Thank you! We’ll be in touch.' },
  sponsors: 'They talk about us',
};

export default AccueilPage;
