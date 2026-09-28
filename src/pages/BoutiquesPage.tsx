import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, BadgeCheck, Music, Palette } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import { PRIX_BOUTIQUE_ANNUEL, listerBoutiquesActives, type Vitrine } from '../firebase/vitrines';
import { VITRINE_APERCU } from '../content/vitrineApercu';

// ─── /boutiques · les boutiques du festival ──────────────────────────
// Les vitrines qui ont pris une place à l'année. Une carte par
// boutique, avec ses premières créations, et la porte vers sa page.

const FR = {
  home: 'Accueil', eyebrow: 'Les échoppes', titre: 'Les boutiques du festival',
  lead: 'Les musiciens et les artisans qui tiennent boutique sur le site du festival, à l’année. Chaque page est la leur, et chaque commande leur revient en entier.',
  vide: 'Les premières boutiques ouvrent bientôt.',
  visiter: 'Entrer', musique: 'Musique', artisan: 'Artisanat',
  appelEyebrow: 'Vous vendez ?', appelTitre: 'Tenez boutique ici',
  appelTexte: `Une vitrine est offerte à tout musicien ou artisan qui n’a pas de site. La boutique du festival ajoute une place ici pour ${PRIX_BOUTIQUE_ANNUEL} $ par année.`,
  appel: 'Ouvrir ma vitrine',
};
const EN: typeof FR = {
  home: 'Home', eyebrow: 'The stalls', titre: 'The festival shops',
  lead: 'The musicians and artisans who keep a shop on the festival site, year round. Each page is theirs, and every order goes to them in full.',
  vide: 'The first shops open soon.',
  visiter: 'Enter', musique: 'Music', artisan: 'Crafts',
  appelEyebrow: 'Do you sell?', appelTitre: 'Keep a shop here',
  appelTexte: `A showcase is offered to any musician or artisan without a website. The festival shop adds a place here for $${PRIX_BOUTIQUE_ANNUEL} a year.`,
  appel: 'Open my showcase',
};

const ease = [0.22, 1, 0.36, 1] as const;

const BoutiquesPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const apercu = import.meta.env.DEV && new URLSearchParams(window.location.search).get('apercu') === '1';
  const [liste, setListe] = useState<Vitrine[] | null>(apercu ? [VITRINE_APERCU, { ...VITRINE_APERCU, slug: 'apercu-2', type: 'artisan', nom: 'La Forge de Sirène', accroche: 'Bijoux forgés à la main, laiton et argent.' }] : null);

  useEffect(() => { if (!apercu) listerBoutiquesActives().then(setListe).catch(() => setListe([])); }, [apercu]);

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={t.titre} description={t.lead} />
      <section className="relative caravan-stage bleed-edges pt-28 pb-12 md:pt-36 md:pb-16 overflow-hidden">
        <img decoding="async" fetchPriority="low" src="/wix/home/scene-cinematic.jpg" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep/90 via-midnight/90 to-midnight-deep" />
        <Brume />
        <div className="relative max-w-3xl mx-auto px-4 md:px-8 text-center">
          <Link to={addLocale('/', lang)} className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass mb-8 transition">
            <ArrowLeft size={14} /> {t.home}
          </Link>
          <p className="font-editorial text-brass uppercase tracking-[0.3em] text-xs md:text-sm mb-4">{t.eyebrow}</p>
          <h1 className="font-display title-medieval text-4xl md:text-6xl text-ivory mb-5">{t.titre}</h1>
          <div className="divider-brass w-24 mx-auto mb-5" />
          <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed max-w-xl mx-auto">{t.lead}</p>
        </div>
      </section>

      <section className="relative max-w-6xl mx-auto px-4 md:px-8 pb-16">
        {liste === null && <div className="w-10 h-10 mx-auto rounded-full border-2 border-t-transparent border-brass animate-spin" />}
        {liste && liste.length === 0 && <p className="text-center font-editorial text-ivory-soft">{t.vide}</p>}
        {liste && liste.length > 0 && (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {liste.map((v, i) => (
              <motion.li key={v.slug} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease, delay: (i % 3) * 0.08 }}>
                <Link to={addLocale(`/vitrine/${v.slug}`, lang)} className="group block glass-light rounded-lg-card overflow-hidden h-full">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img src={v.banniere?.url || '/wix/home/scene-cinematic.jpg'} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight-deep via-midnight-deep/30 to-transparent" />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-brass/50 font-sans text-[10px] uppercase tracking-wider text-brass">
                      <BadgeCheck size={11} /> {lang === 'FR' ? 'Boutique du festival' : 'Festival shop'}
                    </span>
                    {v.avatar && <img src={v.avatar.url} alt="" className="absolute bottom-3 left-3 w-14 h-14 rounded-full border-2 border-brass object-cover" />}
                  </div>
                  <div className="p-5">
                    <p className="inline-flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-wider text-ivory-soft mb-1">
                      {v.type === 'musique' ? <Music size={11} /> : <Palette size={11} />} {v.type === 'musique' ? t.musique : t.artisan}{v.ville ? ` · ${v.ville}` : ''}
                    </p>
                    <h2 className="font-display title-medieval text-xl text-ivory mb-2">{v.nom}</h2>
                    {v.accroche && <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-3">{v.accroche}</p>}
                    {v.produits.length > 0 && (
                      <p className="font-sans text-xs text-ivory-soft/80 mb-3">
                        {v.produits.slice(0, 3).map((p) => p.nom).filter(Boolean).join(' · ')}{v.produits.length > 3 ? ' …' : ''}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider text-brass group-hover:gap-2.5 transition-all">{t.visiter} <ArrowUpRight size={13} /></span>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <section className="relative max-w-6xl mx-auto px-4 md:px-8 pb-24">
        <div className="glass-light rounded-lg-card p-8 md:p-12 grid md:grid-cols-[1fr_auto] items-center gap-6">
          <div>
            <p className="font-editorial text-brass uppercase tracking-[0.3em] text-xs mb-2">{t.appelEyebrow}</p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">{t.appelTitre}</h2>
            <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed max-w-2xl">{t.appelTexte}</p>
          </div>
          <Link to={addLocale('/ma-vitrine', lang)} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
            {t.appel} <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
};

export default BoutiquesPage;
