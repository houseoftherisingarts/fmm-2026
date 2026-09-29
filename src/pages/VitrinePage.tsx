import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, BadgeCheck, ExternalLink, Mail, MapPin, Music, Palette, PenLine, ShoppingBag } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import LecteurPistes from '../components/vitrine/LecteurPistes';
import { suivreVitrine, type Liens, type Produit, type Vitrine } from '../firebase/vitrines';
import { VITRINE_APERCU } from '../content/vitrineApercu';

// ─── /vitrine/{slug} · la page publique d'un musicien ou d'un artisan ─
// La page que la personne partage à ses amis quand elle n'a pas de
// site. Elle se lit sans compte dès qu'elle est publiée; en brouillon,
// seule la personne (et l'équipe) la voit, avec un bandeau qui le dit.
// Alex, 2026-09-28.

const FOND_PAR_DEFAUT = '/wix/home/scene-cinematic.jpg';

const LIENS: { cle: keyof Liens; label: string }[] = [
  { cle: 'site',      label: 'Site' },
  { cle: 'instagram', label: 'Instagram' },
  { cle: 'facebook',  label: 'Facebook' },
  { cle: 'youtube',   label: 'YouTube' },
  { cle: 'spotify',   label: 'Spotify' },
  { cle: 'bandcamp',  label: 'Bandcamp' },
  { cle: 'tiktok',    label: 'TikTok' },
];

const ease = [0.22, 1, 0.36, 1] as const;

/** Seules les adresses http(s) deviennent des liens; le reste ne sort pas de la page. */
const sur = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : undefined);

const VitrinePage: React.FC = () => {
  useCaravanPage();
  const { slug = '' } = useParams<{ slug: string }>();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const { user, isAdmin } = useAuth();
  const [v, setV] = useState<Vitrine | null | undefined>(undefined);

  // Échappatoire de développement : /vitrine/apercu?apercu=1 montre une
  // vitrine remplie sans Firestore, pour vérifier le rendu.
  const apercu = slug === 'apercu' && new URLSearchParams(window.location.search).get('apercu') === '1';
  useEffect(() => {
    if (apercu) { setV(VITRINE_APERCU); return; }
    return suivreVitrine(slug, setV);
  }, [slug, apercu]);

  if (v === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }
  if (!v) return <Introuvable fr={fr} lang={lang} />;

  const proprietaire = !!user && user.uid === v.uid;
  const boutiqueActive = v.boutique?.statut === 'active';
  const lienCommandeGeneral = sur(v.liens?.square) || sur(v.liens?.stripe);
  const liens = LIENS.filter((l) => sur(v.liens?.[l.cle]));
  const aDesPistes = v.pistes.length > 0;
  const aDesProduits = v.produits.length > 0;
  const musiqueDAbord = v.type === 'musique';

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={v.nom} description={v.accroche || v.bio?.slice(0, 150)} image={v.banniere?.url} noindex={!v.publie} />

      {/* ── Le bandeau d'entrée : la bannière pleine largeur ── */}
      <section className="relative caravan-stage bleed-edges min-h-[78vh] md:min-h-[86vh] flex items-end overflow-hidden">
        <motion.img
          key={v.banniere?.url || 'fond'}
          initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.4, ease }}
          src={v.banniere?.url || FOND_PAR_DEFAUT} alt="" aria-hidden
          className={`absolute inset-0 w-full h-full object-cover ${v.banniere ? '' : 'opacity-35'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep/40 via-midnight-deep/20 to-midnight-deep" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight-deep/70 via-transparent to-transparent" />
        <Brume />

        <div className="relative w-full w-full px-4 md:px-8 lg:px-12 pb-12 md:pb-20 pt-32">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.2 }}
                      className="flex flex-col md:flex-row md:items-end gap-6 md:gap-10">
            <div className="shrink-0">
              {v.avatar ? (
                <img src={v.avatar.url} alt="" className="w-28 h-28 md:w-40 md:h-40 rounded-full object-cover border-2 border-brass/70"
                     style={{ boxShadow: '0 0 60px -10px rgba(176,141,58,0.55)' }} />
              ) : (
                <div className="w-28 h-28 md:w-40 md:h-40 rounded-full border-2 border-brass/70 bg-black/40 backdrop-blur-md flex items-center justify-center">
                  {musiqueDAbord ? <Music size={44} className="text-brass" /> : <Palette size={44} className="text-brass" />}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-editorial text-brass uppercase tracking-[0.3em] text-[13px] md:text-sm mb-3 flex items-center gap-3 flex-wrap">
                <span>{musiqueDAbord ? (fr ? 'Musique' : 'Music') : (fr ? 'Artisan' : 'Artisan')}</span>
                {v.ville && <span className="inline-flex items-center gap-1 text-ivory-soft normal-case tracking-normal"><MapPin size={12} />{v.ville}</span>}
                {boutiqueActive && (
                  <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-midnight-deep bg-brass px-2.5 py-0.5 rounded-full text-[13px] font-sans font-semibold">
                    <BadgeCheck size={12} />{fr ? 'Boutique du festival' : 'Festival shop'}
                  </span>
                )}
              </p>
              <h1 className="font-display title-medieval text-4xl md:text-6xl lg:text-7xl text-ivory leading-[1.02] mb-4 break-words">{v.nom}</h1>
              {v.accroche && <p className="font-editorial text-lg md:text-2xl text-ivory-soft leading-relaxed max-w-3xl">{v.accroche}</p>}
              {(liens.length > 0 || v.liens?.courriel || lienCommandeGeneral) && (
                <ul className="flex flex-wrap gap-2 mt-6">
                  {lienCommandeGeneral && (
                    <li>
                      <a href={lienCommandeGeneral} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-2 px-4 py-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[13px] font-semibold hover:bg-brass-soft transition rounded-card">
                        <ShoppingBag size={14} />{fr ? 'Commander en ligne' : 'Order online'}
                      </a>
                    </li>
                  )}
                  {liens.map((l) => (
                    <li key={l.cle}>
                      <a href={v.liens[l.cle]} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-card bg-black/40 backdrop-blur-md border border-white/15 hover:border-brass/60 font-sans text-[13px] uppercase tracking-wider text-ivory transition">
                        {l.label} <ArrowUpRight size={12} />
                      </a>
                    </li>
                  ))}
                  {v.liens?.courriel && (
                    <li>
                      <a href={`mailto:${v.liens.courriel}`}
                         className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-card bg-black/40 backdrop-blur-md border border-white/15 hover:border-brass/60 font-sans text-[13px] uppercase tracking-wider text-ivory transition">
                        <Mail size={12} /> {fr ? 'Écrire' : 'Write'}
                      </a>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {!v.publie && (proprietaire || isAdmin) && (
        <div className="bg-brass/15 border-y border-brass/40">
          <p className="w-full px-4 md:px-8 lg:px-12 py-3 font-sans text-[13px] uppercase tracking-wider text-brass">
            {fr ? 'Brouillon : cette vitrine ne se voit que par vous tant qu’elle n’est pas publiée.' : 'Draft: only you can see this page until it is published.'}
          </p>
        </div>
      )}

      <div className="relative bleed-edges overflow-hidden pb-24">
        <div className="relative z-10 w-full px-4 md:px-8 lg:px-12 space-y-16 md:space-y-24 pt-16 md:pt-24">
          {/* Les pistes et l'histoire se partagent la largeur de l'écran
              quand les deux existent; seules, chacune prend tout. */}
          {musiqueDAbord && (aDesPistes || v.bio) && <PistesEtBio v={v} fr={fr} />}
          {aDesProduits && <SectionProduits v={v} fr={fr} lienGeneral={lienCommandeGeneral} />}
          {!musiqueDAbord && (aDesPistes || v.bio) && <PistesEtBio v={v} fr={fr} />}
          {v.photos.length > 0 && <SectionGalerie v={v} fr={fr} />}

          <footer className="pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="font-editorial text-sm text-ivory-soft">
              {fr ? 'Une vitrine offerte par le Festival Médiéval de Montpellier.' : 'A showcase offered by the Festival Médiéval de Montpellier.'}
            </p>
            <div className="flex items-center gap-4">
              <Link to={addLocale('/', lang)} className="inline-flex items-center gap-2 font-sans text-[13px] uppercase tracking-widest text-ivory-soft hover:text-brass transition">
                <ArrowLeft size={14} /> {fr ? 'Le festival' : 'The festival'}
              </Link>
              {!proprietaire && (
                <Link to={addLocale('/ma-vitrine', lang)} className="font-sans text-[13px] uppercase tracking-widest text-brass hover:text-brass-soft transition">
                  {fr ? 'Créer la mienne' : 'Create mine'}
                </Link>
              )}
            </div>
          </footer>
        </div>
      </div>

      {proprietaire && (
        <Link to={addLocale('/ma-vitrine', lang)}
              className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-5 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[13px] font-semibold rounded-card shadow-2xl hover:bg-brass-soft transition">
          <PenLine size={14} /> {fr ? 'Modifier ma vitrine' : 'Edit my showcase'}
        </Link>
      )}
    </main>
  );
};

const Titre: React.FC<{ eyebrow: string; titre: string }> = ({ eyebrow, titre }) => (
  <div className="mb-8">
    <p className="font-editorial text-brass uppercase tracking-[0.3em] text-[13px] md:text-sm mb-2">{eyebrow}</p>
    <h2 className="font-display title-medieval text-3xl md:text-4xl text-ivory">{titre}</h2>
    <div className="divider-brass w-24 mt-4" />
  </div>
);

const PistesEtBio: React.FC<{ v: Vitrine; fr: boolean }> = ({ v, fr }) => {
  const deux = v.pistes.length > 0 && !!v.bio;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
      {v.pistes.length > 0 && <div className={deux ? 'lg:col-span-5' : 'lg:col-span-12'}><SectionPistes v={v} fr={fr} /></div>}
      {v.bio && <div className={deux ? 'lg:col-span-7' : 'lg:col-span-12'}><SectionBio v={v} fr={fr} large={!deux} /></div>}
    </div>
  );
};

const SectionPistes: React.FC<{ v: Vitrine; fr: boolean }> = ({ v, fr }) => (
  <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, ease }}>
    <Titre eyebrow={fr ? 'Écouter' : 'Listen'} titre={fr ? 'Les pistes' : 'The tracks'} />
    <div className="glass-light rounded-lg-card p-4 md:p-6">
      <LecteurPistes pistes={v.pistes} fr={fr} />
    </div>
  </motion.section>
);

const SectionProduits: React.FC<{ v: Vitrine; fr: boolean; lienGeneral?: string }> = ({ v, fr, lienGeneral }) => (
  <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, ease }}>
    <Titre eyebrow={v.type === 'musique' ? (fr ? 'Albums et objets' : 'Albums and goods') : (fr ? 'L’atelier' : 'The workshop')}
           titre={fr ? 'Les créations' : 'The creations'} />
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4 md:gap-6">
      {v.produits.map((p, i) => <CarteProduit key={p.id} p={p} fr={fr} lien={sur(p.lien) || lienGeneral} i={i} />)}
    </ul>
  </motion.section>
);

const CarteProduit: React.FC<{ p: Produit; fr: boolean; lien?: string; i: number }> = ({ p, fr, lien, i }) => (
  <motion.li initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease, delay: (i % 4) * 0.08 }}
             className="glass-light rounded-lg-card overflow-hidden flex flex-col">
    {p.photo ? (
      <img src={p.photo.url} alt={p.nom} loading="lazy" className="w-full aspect-[4/3] object-cover" />
    ) : (
      <div className="w-full aspect-[4/3] bg-black/30 flex items-center justify-center"><Palette size={28} className="text-brass/60" /></div>
    )}
    <div className="p-5 flex flex-col flex-1">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-display text-lg text-ivory leading-snug">{p.nom}</h3>
        {typeof p.prix === 'number' && <span className="font-sans text-sm text-brass whitespace-nowrap">{p.prix.toLocaleString('fr-CA')} $</span>}
      </div>
      {p.description && <p className="font-editorial text-sm text-ivory-soft leading-relaxed flex-1">{p.description}</p>}
      {lien && (
        <a href={lien} target="_blank" rel="noopener noreferrer"
           className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-[13px] font-semibold transition rounded-card">
          {fr ? 'Commander' : 'Order'} <ExternalLink size={12} />
        </a>
      )}
    </div>
  </motion.li>
);

const SectionGalerie: React.FC<{ v: Vitrine; fr: boolean }> = ({ v, fr }) => (
  <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, ease }}>
    <Titre eyebrow={fr ? 'En images' : 'In pictures'} titre={fr ? 'La galerie' : 'The gallery'} />
    <ul className="columns-2 md:columns-3 lg:columns-4 gap-4 [&>li]:mb-4 [&>li]:break-inside-avoid">
      {v.photos.map((p) => (
        <li key={p.chemin} className="rounded-lg-card overflow-hidden border border-white/10">
          <img src={p.url} alt="" loading="lazy" className="w-full h-auto block" />
        </li>
      ))}
    </ul>
  </motion.section>
);

const SectionBio: React.FC<{ v: Vitrine; fr: boolean; large?: boolean }> = ({ v, fr, large }) => (
  <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, ease }}
                  className={large ? 'grid grid-cols-1 lg:grid-cols-12 gap-8' : ''}>
    <div className={large ? 'lg:col-span-4' : ''}>
      <Titre eyebrow={fr ? 'À propos' : 'About'} titre={v.nom} />
    </div>
    <div className={`glass-light rounded-lg-card p-6 md:p-10 ${large ? 'lg:col-span-8' : ''}`}>
      {v.bio!.split(/\n{2,}/).map((par, i) => (
        <p key={i} className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-5 last:mb-0 whitespace-pre-line">{par}</p>
      ))}
    </div>
  </motion.section>
);

const Introuvable: React.FC<{ fr: boolean; lang: 'FR' | 'EN' }> = ({ fr, lang }) => (
  <main className="min-h-screen text-ivory flex items-center justify-center px-4">
    <SEO title={fr ? 'Vitrine introuvable' : 'Showcase not found'} noindex />
    <div className="glass-light rounded-lg-card p-10 max-w-lg text-center">
      <p className="font-editorial text-brass uppercase tracking-[0.3em] text-[13px] mb-3">{fr ? 'Vitrine' : 'Showcase'}</p>
      <h1 className="font-display title-medieval text-3xl text-ivory mb-4">{fr ? 'Cette adresse ne mène nulle part' : 'This address leads nowhere'}</h1>
      <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-6">
        {fr
          ? 'La vitrine n’existe pas, ou elle n’est pas encore publiée par la personne qui la tient.'
          : 'The showcase does not exist, or its owner has not published it yet.'}
      </p>
      <Link to={addLocale('/', lang)} className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[13px] font-semibold hover:bg-brass-soft transition rounded-card">
        <ArrowLeft size={14} /> {fr ? 'Retour au festival' : 'Back to the festival'}
      </Link>
    </div>
  </main>
);

export default VitrinePage;
