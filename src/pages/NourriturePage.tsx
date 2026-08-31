import React, { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, ChevronDown, Clock, Lock, Users, Wine } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGagnerBadge, useBadgeAuBout } from '../contexts/BadgesContext';
import { useUI } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, ScrollProgress } from '../components/scroll';
import { BubbleCanvas, Motes } from '../components/marche/effects';
import { SectionFog, SectionTopRail, Eyebrow, DisplayTitle, GildedFrame } from '../components/marche/atmospherics';
import { MENU, ABREUVOIR, BANQUET_MENU, type Categorie, type Plat } from '../content/menu2026';
import { subscribeBanquetRestant } from '../firebase/banquetPlaces';
import {
  IconSunrise, IconCauldron, IconFlame, IconGreens, IconBread,
  IconHoney, IconScorpion, IconPitcher,
} from '../components/icons/Medieval';

// Les emoji de catégorie sont partis : ils cassaient la règle « aucune
// icône générique » (Alex, 2026-08-22). Chaque catégorie porte son
// glyphe médiéval, au trait, dans la couleur de la section.
const GLYPHES = {
  sunrise: IconSunrise, cauldron: IconCauldron, flame: IconFlame, greens: IconGreens,
  bread: IconBread, honey: IconHoney, scorpion: IconScorpion, pitcher: IconPitcher,
} as const;
const Glyphe: React.FC<{ name: keyof typeof GLYPHES; size?: number }> = ({ name, size = 22 }) => {
  const I = GLYPHES[name];
  return <I size={size} className="shrink-0" />;
};

// Liens de paiement Square (compte Le Salon des Inconnus), créés par
// l'API le 2026-08-22. Ce sont des URL publiques, pas des secrets.
// Ce lien Square fixe ne vend QU'UNE place et renvoie l'acheteur à
// l'accueil sans confirmation (retour d'une acheteuse, 23 août). Il ne
// sert plus que de filet si notre fonction tombe, et jamais autrement :
// le chemin normal crée un lien neuf avec le nombre de places choisi.
const SQUARE_BANQUET  = 'https://square.link/u/g0UOU5L3';  // 65 $ + taxes = 74,73 $
const SQUARE_GRIMOIRE = 'https://square.link/u/OLtFu9jY';  //  9 $ + taxes = 10,35 $

// 🔒 Le livre de recettes ne se vend pas encore : il se termine. Mettre
// à true rouvre la vente, rien d'autre à toucher (Alex, 2026-08-23).
const GRIMOIRE_EN_VENTE = false;

// Le titre porte le nom complet du livre, qui est long. Les tailles sont
// mesurées écran par écran pour qu'il tienne toujours sur deux lignes :
// la colonne du bloc se resserre à `lg` (sept douzièmes moins les
// gouttières), d'où le cran plus petit là et le retour à 48 px à `xl`.
const TITRE_LIVRE = 'text-[1.5rem]! sm:text-3xl! md:text-5xl! lg:text-4xl! xl:text-5xl! mb-5';

// ─── Village Nourriture · édition 2026 ───────────────────────────────
// Trois choses sur cette page (Alex, 2026-08-22) :
//   1. Le MENU DU VILLAGE : ce qui se commande aux étals les trois
//      jours. Sans prix, décision d'Alex. Source : menu 1.3 de
//      Marc-Alexis. Le menu 1.2 est retiré.
//   2. Le BANQUET : trois services servis à table, 50 places,
//      65 $ plus taxes, payé par Square. L'ancien banquet à cinq
//      services (85 $) est retiré : il est passé.
//   3. LE LIVRE DE RECETTES : le livre du festival, 9 $ plus
//      taxes, payé par Square lui aussi. Il s'appelait « le Grimoire »
//      jusqu'au 2026-08-23; les clés et les fichiers gardent l'ancien
//      nom, seul le texte affiché a changé (Alex).
// Les données de menu vivent dans src/content/menu2026.ts.

const ROMANS = ['I', 'II', 'III'];

// ── Rangée de plat : losange de laiton, nom, une ligne d'histoire ────
const PlatRow: React.FC<{ plat: Plat; lang: 'FR' | 'EN' }> = ({ plat, lang }) => (
  <li className="group/plat flex gap-3.5">
    <span
      aria-hidden
      className="mt-[0.6rem] shrink-0 w-[7px] h-[7px] rotate-45 transition-colors duration-300"
      style={{ border: '1px solid var(--color-copper)' }}
    />
    <div className="min-w-0">
      <span className="font-display title-medieval text-base md:text-lg text-ivory leading-snug transition-colors duration-300 group-hover/plat:text-[var(--color-amber-glow)]">
        {plat.name}
      </span>
      {plat.note && (
        <p className="font-editorial text-sm text-ivory-soft leading-snug mt-1 max-w-prose">
          {plat.note[lang]}
        </p>
      )}
    </div>
  </li>
);

const LIEN_BANQUET = 'https://us-central1-festivalmedieval.cloudfunctions.net/banquetLien';

// ─── Une guilde du menu, repliée par défaut ─────────────────────────
// Le tableau des trois jours arrivait tout ouvert et noyait l'œil (Alex,
// 2026-08-24). Chaque guilde n'annonce plus que son nom et sa ligne de
// service, et les plats se déroulent au clic.
const GuildeRepliable: React.FC<{ guilde: Categorie; lang: 'FR' | 'EN' }> = ({ guilde: g, lang }) => {
  const [ouverte, setOuverte] = useState(false);
  const id = `menu-${g.name.FR.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <article className="fmm-menu-card break-inside-avoid mb-8 md:mb-10">
      <button
        type="button"
        onClick={() => setOuverte((v) => !v)}
        aria-expanded={ouverte}
        aria-controls={id}
        className="w-full text-left mb-5 pb-3 group"
        style={{ borderBottom: '1px solid rgba(var(--sk-glow-rgb),0.22)' }}
      >
        <div className="flex items-baseline gap-3">
          <span aria-hidden style={{ color: 'var(--color-copper)' }}><Glyphe name={g.icon} size={22} /></span>
          {/* Le nom de la guilde doit écraser celui des plats, sinon
              Boustifaille et Cuirs du Seigneur se lisent au même
              niveau (Alex, 2026-08-24). */}
          <h3 className="font-display title-medieval text-2xl md:text-4xl text-ivory flex-1 leading-tight">{g.name[lang]}</h3>
          <ChevronDown
            size={18}
            aria-hidden
            className="shrink-0 self-center transition-transform duration-300 group-hover:text-ivory"
            style={{
              color: 'var(--color-copper)',
              transform: ouverte ? 'rotate(180deg)' : 'none',
            }}
          />
        </div>
        {g.sub && (
          <p className="font-editorial italic text-sm mt-2 pl-9" style={{ color: 'var(--color-copper)' }}>
            {g.sub[lang]}
          </p>
        )}
      </button>
      <AnimatePresence initial={false}>
        {ouverte && (
          <motion.ul
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3.5 overflow-hidden"
          >
            {g.dishes.map((p) => <PlatRow key={p.name} plat={p} lang={lang} />)}
          </motion.ul>
        )}
      </AnimatePresence>
    </article>
  );
};

// `sansEntete` : la page /william porte déjà « Village Nourriture » dans
// son héros, alors le chapitre embarqué ne répète pas le titre.
// Boissons vit sur la même page, sous la nourriture (Alex, 2026-08-27 :
// « un seul bouton Nourriture et boissons, la boisson juste en dessous »).

const NourriturePage: React.FC<{ embedded?: boolean; sansEntete?: boolean }> = ({ embedded = false, sansEntete = false }) => {
  // L'ancienne route /boissons arrive ici avec #boissons.
  React.useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#boissons') return;
    let precedent = -1; let essais = 10;
    const tic = window.setInterval(() => {
      const cible = document.getElementById('boissons');
      if (!cible) return;
      const haut = Math.round(cible.getBoundingClientRect().top + window.scrollY);
      cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (haut === precedent || --essais <= 0) window.clearInterval(tic);
      precedent = haut;
    }, 320);
    return () => window.clearInterval(tic);
  }, []);
  // Ce pilier portait le badge « Ami du village » quand Marché et
  // Nourriture vivaient sur une seule page (Le Village). Le Village
  // Nourriture en reste le foyer naturel depuis la scission du
  // 2026-08-27 : le déclencheur du badge vient donc ici.
  useBadgeAuBout('village');
  // Le banquet passe par un compte : Alex a vu quatre places vendues
  // sans une seule fiche dans le registre (2026-08-24).
  const { user, openSignIn } = useAuth();
  const [places, setPlaces] = useState(1);
  const [enRoute, setEnRoute] = useState(false);
  const [echec, setEchec] = useState(false);
  // Les places encore libres, comptées par le webhook Square. `null` tant
  // que rien de fiable n'est lu : la ligne du décompte reste alors muette.
  const [restant, setRestant] = useState<number | null>(null);
  useEffect(() => subscribeBanquetRestant(setRestant), []);
  // Retour de Square après paiement : ?banquet=merci
  const merci = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('banquet') === 'merci';
  // Une place réservée au banquet vaut le badge du convive, et le livre
  // de recettes acheté vaut celui du cuisinier de route.
  useGagnerBadge('banquet', merci);
  const livrePris = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('livre') === 'merci';
  useGagnerBadge('livre', livrePris);
  // `?banquet=1` ou `?banquet=merci` : la vue descend jusqu'au banquet
  // une fois le chapitre déplié, sinon le visiteur doit le chercher.
  //
  // Un seul minuteur de 700 ms tombait à côté une fois sur deux. Trois
  // choses bougent en même temps au chargement : le morceau de code de
  // cette page arrive quand il arrive, le repli du chapitre s'ouvre en
  // 450 ms, et les images qui se posent au-dessus repoussent le banquet
  // vers le bas. Nous visons donc à quelques reprises, jusqu'à ce que la
  // cible ne bouge plus (Alex, 2026-08-23).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('banquet');
    if (q !== '1' && q !== 'merci') return;
    let precedent = -1;
    let essais = 10;
    const tic = window.setInterval(() => {
      const cible = document.getElementById('banquet');
      if (!cible) return;             // le chapitre n'est pas encore monté
      const haut = Math.round(cible.getBoundingClientRect().top + window.scrollY);
      cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // La cible a cessé de bouger : le dernier tir était le bon.
      if (haut === precedent || --essais <= 0) window.clearInterval(tic);
      precedent = haut;
    }, 320);
    return () => window.clearInterval(tic);
  }, []);
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <>
      {!embedded && <SEO title={t.title} description={t.intro} />}
      {!embedded && <ScrollProgress />}
      {embedded && sansEntete ? null : embedded ? (
        <section className="relative pt-20 md:pt-28 pb-2">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">{t.eyebrow}</p>
            <h2 className="font-display title-medieval text-4xl md:text-6xl text-ivory leading-[1.04]">{t.title}</h2>
            <div className="divider-brass w-24 mt-5" />
          </div>
        </section>
      ) : (
        <PageHeader
          eyebrow={t.eyebrow}
          titleA={t.title}
          intro={t.intro}
          orbImage="/wix/nourriture/banquet-cercle.webp"
          orbImagePosition="center 46%"
        />
      )}

      {/* ══ 06 · Le banquet du Prince William ══════════════════════════════
          Le deuxième menu : cinq services servis à table le dimanche,
          50 places, payé par Square (85 $ + taxes). */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="both" />
        <BubbleCanvas className="opacity-30" count={14} />
        <div className="relative z-10 max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14">
          <SectionTopRail
            index="06"
            name={t.banquetRail}
            meta={t.banquetMeta}
            metaValue={t.banquetMetaValue}
            className="mb-10 md:mb-14"
          />

          {/* Le banquet flottait comme du texte posé sur le fond : il a
              maintenant son écrin sombre, comme un hero dans un hero
              (Alex, 2026-08-22). */}
          <Reveal amount={0.1}>
            <div id="banquet" className="fmm-banquet-shell grid lg:grid-cols-12 gap-10 lg:gap-16 items-start mb-14 md:mb-20 p-7 md:p-12 lg:p-14">
              <div className="lg:col-span-7 min-w-0">
                <Eyebrow tone="amber" className="mb-5 inline-flex items-center gap-3">
                  <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-amber-glow)' }} />
                  {t.banquetEyebrow}
                </Eyebrow>
                <DisplayTitle size="xl" glow className="mb-4">{t.banquetTitle}</DisplayTitle>
                <p className="font-editorial italic text-base md:text-lg text-ivory-soft mb-5">{t.banquetSub}</p>
                <p className="font-editorial text-base md:text-lg text-ivory leading-relaxed mb-8 max-w-2xl">{t.banquetBody}</p>
                {/* Paiement par Square, compte du traiteur Le Salon des
                    Inconnus, jamais par Zeffy. Lien créé par l'API le
                    2026-08-22 : 65 $ + TPS + TVQ = 74,73 $. L'ancien lien
                    fdkw4hH3 vendait le banquet à 85 $ (97,73 $) : il ne
                    doit plus servir. Une URL square.link est publique,
                    d'où la valeur en clair; la variable reste prioritaire. */}
                {/* Le nombre de places se choisit ICI, avant Square. Le
                    lien fixe ne portait qu'une place et renvoyait sur le
                    reçu de la première dès qu'on y revenait : personne
                    ne pouvait en acheter deux (Alex, 2026-08-23). Un
                    lien neuf se crée à chaque réservation. */}
                {/* Le décompte des places, juste au-dessus du choix : la
                    salle en compte cinquante et le chiffre vient des
                    ventes réelles. Rien ne s'affiche tant que la lecture
                    n'est pas fiable, plutôt qu'un chiffre inventé
                    (Alex, 2026-08-23). */}
                {restant !== null && (
                  <p className="inline-flex items-center gap-3 mb-5 px-4 py-2.5 rounded-card border border-brass/30 bg-black/30 font-editorial text-sm md:text-base text-ivory-soft">
                    <span
                      aria-hidden
                      className="shrink-0 w-[7px] h-[7px] rotate-45"
                      style={{ background: 'var(--color-amber-glow)' }}
                    />
                    {t.restant(restant)}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <div className="inline-flex items-center gap-1 rounded-card border border-brass/35 bg-black/30 p-1">
                    <button
                      type="button"
                      aria-label={t.moinsUne}
                      onClick={() => setPlaces((n: number) => Math.max(1, n - 1))}
                      className="w-10 h-10 rounded-card text-brass hover:bg-brass/15 transition font-display text-xl leading-none"
                    >
                      −
                    </button>
                    <span className="min-w-[3.5rem] text-center font-display title-medieval text-lg text-ivory">
                      {places}
                    </span>
                    <button
                      type="button"
                      aria-label={t.plusUne}
                      onClick={() => setPlaces((n: number) => Math.min(12, n + 1))}
                      className="w-10 h-10 rounded-card text-brass hover:bg-brass/15 transition font-display text-xl leading-none"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-sans uppercase tracking-[0.22em] text-[10px] text-ivory-soft/70">
                    {places > 1 ? t.placesPlur(places) : t.placesSing}
                    {' · '}
                    {(places * 74.73).toFixed(2).replace('.', ',')} $
                  </span>
                </div>
                <button
                  type="button"
                  disabled={enRoute}
                  onClick={async () => {
                    // Sans compte, la table du banquet reste fermée :
                    // c'est par le compte que la place, le menu et les
                    // nouvelles rejoignent la personne.
                    if (!user) { openSignIn(); return; }
                    setEnRoute(true);
                    setEchec(false);
                    try {
                      const r = await fetch(LIEN_BANQUET, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          places,
                          uid: user.uid,
                          courriel: user.email || '',
                          nom: user.displayName || '',
                          retour: window.location.origin + window.location.pathname,
                        }),
                      });
                      const d = await r.json();
                      if (!d.url) throw new Error('sans url');
                      window.location.href = d.url;
                    } catch {
                      // Filet : si la fonction tombe, on n'empêche pas
                      // quelqu'un d'acheter une place au lien d'origine.
                      setEchec(true);
                      setEnRoute(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-60"
                >
                  {enRoute ? t.enRoute : user ? t.reserve : t.reserveCompte}
                  <ArrowUpRight size={14} />
                </button>
                {echec && (
                  <p className="font-editorial text-sm text-blush mt-3">
                    {t.echecLien}{' '}
                    <a
                      href={import.meta.env.VITE_SQUARE_BANQUET_URL || SQUARE_BANQUET}
                      target="_blank" rel="noopener noreferrer"
                      className="underline text-brass"
                    >
                      {t.echecLienCta}
                    </a>
                  </p>
                )}
                {merci && (
                  <p className="font-editorial text-base text-brass mt-4">{t.merci}</p>
                )}
                <p className="font-editorial text-xs text-ivory-soft/70 mt-4">{t.banquetNote}</p>
              </div>
              <ul className="lg:col-span-5 space-y-5 font-sans text-sm text-ivory-soft lg:pt-10">
                <li className="flex items-start gap-3 pb-5" style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb),0.1)' }}>
                  <Clock size={16} className="text-brass mt-0.5 shrink-0" />
                  <div><span className="block font-display title-medieval text-xs text-brass mb-0.5">{t.when}</span>{t.banquetWhen}</div>
                </li>
                <li className="flex items-start gap-3 pb-5" style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb),0.1)' }}>
                  <Users size={16} className="text-brass mt-0.5 shrink-0" />
                  <div><span className="block font-display title-medieval text-xs text-brass mb-0.5">{t.seats}</span>{t.banquetSeats}</div>
                </li>
                <li className="flex items-start gap-3">
                  <Wine size={16} className="text-brass mt-0.5 shrink-0" />
                  <div><span className="block font-display title-medieval text-xs text-brass mb-0.5">{t.cost}</span>{t.banquetCost}</div>
                </li>

                {/* ── Les trois services, dans la colonne de droite ──
                    Alex, 2026-08-24 : la carte doit rester horizontale
                    et se lire d'un coup d'œil, donc les services se
                    rangent sous le coût plutôt qu'en pleine largeur.
                    Une barre plus épaisse que les autres, avec son
                    chaudron doré au milieu, ouvre la procession. */}
                <li className="pt-7">
                  <div aria-hidden className="flex items-center gap-3 mb-5">
                    <span className="h-[2px] flex-1" style={{ background: 'linear-gradient(90deg, rgba(var(--sk-glow-rgb),0) 0%, rgba(var(--sk-glow-rgb),0.5) 100%)' }} />
                    <Glyphe name="cauldron" size={22} />
                    <span className="h-[2px] flex-1" style={{ background: 'linear-gradient(90deg, rgba(var(--sk-glow-rgb),0.5) 0%, rgba(var(--sk-glow-rgb),0) 100%)' }} />
                  </div>
                  <p className="font-display title-medieval text-xs text-brass mb-4 text-center">
                    {t.banquetMenuTitle}
                  </p>
                  <div className="space-y-3.5">
                    {BANQUET_MENU.map((service, i) => (
                      <div key={service.name.FR} className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className="font-display text-base leading-tight w-6 shrink-0 text-right"
                          style={{ color: 'var(--color-copper)' }}
                        >
                          {ROMANS[i]}
                        </span>
                        <div className="min-w-0">
                          <span className="block font-display title-medieval text-xs text-brass mb-0.5">
                            {service.name[lang]}
                          </span>
                          <span className="block font-editorial text-[13px] leading-relaxed">
                            {service.items.map((item, j) => (
                              <React.Fragment key={item}>
                                {j > 0 && <span aria-hidden style={{ color: 'var(--color-amber-glow)' }}> · </span>}
                                {item}
                              </React.Fragment>
                            ))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </li>
              </ul>

            </div>
          </Reveal>

        </div>
      </section>

      {/* ══ 05 · Le menu des kiosques ══════════════════════════════════
          Le menu général du village : ce qui se commande aux étals
          pendant les trois jours. Tableau de taverne : nom, meneur
          pointillé, prix, une ligne d'histoire. */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="top" />
        <Motes className="opacity-40" count={16} />
        <div className="relative z-10 max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14">
          <SectionTopRail
            index="05"
            name={t.kioskRail}
            meta={t.kioskMeta}
            metaValue={t.kioskMetaValue}
            className="mb-10 md:mb-14"
          />
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mb-12 md:mb-16 items-end">
            <header className="lg:col-span-7 min-w-0">
              <Eyebrow className="mb-5 inline-flex items-center gap-3">
                <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-copper)' }} />
                {t.kioskEyebrow}
              </Eyebrow>
              <DisplayTitle size="lg" glow className="mb-6">{t.kioskTitle}</DisplayTitle>
              <p className="font-editorial text-base md:text-lg text-[var(--color-bone)]/80 leading-relaxed max-w-2xl">
                {t.kioskLead}
              </p>
            </header>
            {/* Le plateau de dégustation : la grillade WJW en pleine
                lumière au-dessus du menu (Alex, 29 août). Coins 15px,
                pas de cadre doré : la taverne reste la seule rupture. */}
            <div className="lg:col-span-5 min-w-0">
              <img
                src="/wix/nourriture/nourriture-table-p.webp"
                alt="Saucisses artisanales sur planche de bois, avec pain et cornichons"
                decoding="async"
                loading="lazy"
                className="w-full rounded-[15px] object-cover"
                style={{ aspectRatio: '4/3', boxShadow: '0 18px 44px rgba(0,0,0,.5)' }}
              />
              <p className="font-sans uppercase tracking-[0.3em] text-[10px] leading-loose text-right mt-3 hidden lg:block" style={{ color: 'rgba(var(--sk-parchment-rgb),0.45)' }}>
                {t.kioskAside}
              </p>
            </div>
          </div>

          {/* Le tableau : colonnes de journal, comme un menu papier qui se
              lit de haut en bas puis colonne suivante. break-inside-avoid
              garde chaque guilde entière. La taverne suit en pleine
              largeur, encadrée d'or : la seule rupture. */}
          <div className="columns-1 md:columns-2 gap-14">
            {/* Un contenant par guilde : sans lui, Déjeuner, Boustifaille
                et Marmite coulaient les uns dans les autres et l'œil ne
                trouvait plus la frontière (Alex, 2026-08-22). */}
            {MENU.map((g) => (
                <GuildeRepliable key={g.name.FR} guilde={g} lang={lang} />
            ))}
          </div>

          {/* La taverne des élixirs : pleine largeur, corners dorés. */}
          <Reveal className="mt-2">
            <GildedFrame tone="amber" active className="block">
              <div className="px-6 py-8 md:px-12 md:py-10" style={{ background: 'rgba(var(--sk-glow-rgb), 0.045)' }}>
                <header className="flex items-baseline gap-3 mb-6">
                  <span aria-hidden style={{ color: 'var(--color-amber-glow)' }}><Glyphe name={ABREUVOIR.icon} size={26} /></span>
                  <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory">{ABREUVOIR.name[lang]}</h3>
                  <span className="ml-auto font-sans uppercase tracking-[0.3em] text-[10px]" style={{ color: 'var(--color-amber-glow)' }}>
                    {t.tavernTag}
                  </span>
                </header>
                <ul className="grid md:grid-cols-2 gap-x-14 gap-y-4">
                  {ABREUVOIR.dishes.map((p) => <PlatRow key={p.name} plat={p} lang={lang} />)}
                </ul>
              </div>
            </GildedFrame>
          </Reveal>

          <p className="font-editorial text-xs md:text-sm text-ivory-soft/70 mt-10 md:mt-12 max-w-2xl">
            {t.kioskFootnote}
          </p>
        </div>
      </section>

      {/* ══ 07 · Le livre de recettes du festival ══════════════════════
          Le livre de recettes de Marc-Alexis, 9 $ plus taxes, payé par
          Square. Deux recettes se lisent en ligne, le reste s'achète.
          Chaque recette est écrite pour cinq personnes depuis le
          2026-08-24 : la colonne des cinquante portions a été retirée. */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="top" />
        <Motes className="opacity-30" count={12} />
        <div className="relative z-10 max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14">
          <SectionTopRail
            index="07"
            name={t.grimoireRail}
            meta={t.grimoireMeta}
            metaValue={t.grimoireMetaValue}
            className="mb-10 md:mb-14"
          />
          <Reveal amount={0.1}>
            <GildedFrame tone="amber" active className="block">
              <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center px-6 py-10 md:px-12 md:py-14" style={{ background: 'rgba(var(--sk-glow-rgb), 0.045)' }}>
                <div className="lg:col-span-7 min-w-0">
                  <Eyebrow tone="amber" className="mb-5 inline-flex items-center gap-3">
                    <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-amber-glow)' }} />
                    {t.grimoireEyebrow}
                  </Eyebrow>
                  <DisplayTitle size="lg" glow className={TITRE_LIVRE}>{t.grimoireTitle}</DisplayTitle>
                  <p className="font-editorial text-base md:text-lg text-ivory leading-relaxed mb-8 max-w-2xl">
                    {t.grimoireBody}
                  </p>
                  {/* 🔒 La vente est FERMÉE tant que le livre n'est pas
                      fini (Alex, 2026-08-23). Le lien Square existe et
                      fonctionne : il suffira de repasser ce drapeau à
                      true pour rouvrir la boutique. */}
                  <div className="flex flex-wrap items-center gap-5">
                    {GRIMOIRE_EN_VENTE ? (
                      <a
                        href={import.meta.env.VITE_SQUARE_GRIMOIRE_URL || SQUARE_GRIMOIRE}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card"
                      >
                        {t.grimoireCta}
                        <ArrowUpRight size={14} />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-8 py-4 rounded-card border border-brass/30 bg-black/30 font-sans uppercase tracking-wider text-xs font-semibold text-ivory-soft/70">
                        <Lock size={14} className="text-brass" />
                        {t.grimoireBientot}
                      </span>
                    )}
                    {/* 🔒 Le feuilletage est fermé lui aussi : le livre se
                        termine et ne se montre pas encore (Alex, 29 août).
                        Le PDF d'aperçu reste sur le serveur; il suffira de
                        remettre le lien pour rouvrir le feuilletage. */}
                    <span className="inline-flex items-center gap-2 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory-soft/60">
                      <BookOpen size={14} />
                      {t.grimoirePreview}
                    </span>
                  </div>
                  <p className="font-editorial text-xs text-ivory-soft/70 mt-5">{t.grimoireNote}</p>
                </div>
                <div className="lg:col-span-5">
                  {/* Nom neuf pour la couverture refaite : les images de
                      public/ sont servies avec un cache d'un an marqué
                      immuable, donc remplacer le fichier sans changer son
                      nom laisse tout le monde devant l'ancienne image. */}
                  <img
                    src="/grimoire/couverture-livre-recettes.webp"
                    alt={t.grimoireAlt}
                    loading="lazy"
                    className="w-full max-w-sm mx-auto rounded-card"
                    style={{ boxShadow: '0 30px 70px -20px rgba(0,0,0,0.85)' }}
                  />
                </div>
              </div>
            </GildedFrame>
          </Reveal>
        </div>
      </section>
      {/* Le Village Boissons a quitté ce fichier : il vit maintenant dans
          WilliamPage, APRÈS les boutiques WJW, parce qu'il est une entité
          hors de l'ensemble William (Alex, 29 août). */}
    </>
  );
};

const FR = {
  title: 'Village Nourriture',
  eyebrow: 'Le ventre du festival',
  intro: 'Le menu du village pour les trois jours, le grand banquet à la table du seigneur, et le livre de recettes à rapporter chez soi.',

  kioskRail: 'Village Nourriture',
  kioskMeta: 'Service',
  kioskMetaValue: 'Ven · Sam · Dim',
  kioskEyebrow: 'Le menu du village',
  kioskTitle: 'La table des trois jours',
  kioskLead: 'Ce qui se commande aux étals du village, du premier feu du vendredi au dernier tison du dimanche. Cuisine sur la braise, recettes des routes anciennes, édition 2026.',
  kioskAside: 'Sans réservation · Au gré du village',
  dishesWord: 'plats',
  tavernTag: 'Pour lever sa coupe',
  kioskFootnote: 'Les prix sont affichés aux étals. Le menu peut changer sans préavis selon la disponibilité locale des produits.',

  banquetRail: 'Le Banquet',
  banquetMeta: 'Places',
  banquetMetaValue: '50',
  banquetEyebrow: 'Dimanche, à la table du seigneur',
  banquetTitle: 'Banquet du Prince William',
  banquetSub: 'Une tablée foisonnante à trois services sur réservation, avec un spectacle musical de bardes à la table.',
  banquetBody: 'Historiquement réservé aux chefs de clans, ce banquet est maintenant ouvert à tous les voyageurs, guerriers, marchands et skjaldmös qui veulent profiter d’un repas de fin de festival bien mérité.',
  banquetNote: 'Pourboire non inclus · Menu sujet à changement sans préavis selon la disponibilité locale des produits.',
  reserve: 'Réserver',
  reserveCompte: 'Ouvrir un compte et réserver',
  placesSing: 'une place',
  placesPlur: (n: number) => `${n} places`,
  moinsUne: 'Une place de moins',
  plusUne: 'Une place de plus',
  enRoute: 'On prépare le paiement…',
  echecLien: 'Le paiement n’a pas voulu s’ouvrir.',
  echecLienCta: 'Réserver une place par l’ancien lien',
  merci: 'Merci, votre place au banquet est réservée. Le reçu part par courriel.',
  when: 'Quand',
  seats: 'Places',
  cost: 'Coût',
  banquetWhen: 'Dimanche · 13h00. Date limite d’inscription : 17 septembre 2026.',
  banquetSeats: '50 places limitées',
  banquetCost: '65 $ par personne, plus taxes',
  // Le décompte dit le vrai et rien de plus : pas de compte à rebours,
  // pas de « dépêchez-vous ». Le chiffre vient des ventes réelles.
  restant: (n: number) =>
    n === 0 ? 'Les cinquante places sont prises.'
      : n === 1 ? 'Il reste une place sur cinquante.'
        : `Il reste ${n} places sur cinquante.`,
  banquetMenuEyebrow: 'Le menu du banquet',
  banquetMenuTitle: 'Trois services',

  grimoireRail: 'Le livre de recettes',
  grimoireMeta: 'Recettes',
  grimoireMetaValue: '27',
  grimoireEyebrow: 'À rapporter chez soi',
  grimoireTitle: 'Le livre de recettes du festival',
  grimoireBody: 'Les recettes de la cuisine du festival, telles qu’elles sortent des marmites : le pain viking, l’olla gitana, l’hypocras, le gâteau du voyageur et vingt-trois autres, écrites de la main du chef Marc-Alexis Pepin. Elles ont été ramenées à cinq personnes pour que vous puissiez les refaire chez vous, un mardi soir, sans avoir à diviser quoi que ce soit.',
  grimoireBientot: 'Bientôt en vente',
  grimoireCta: 'Acheter le livre',
  grimoirePreview: 'Feuilleter deux recettes',
  grimoireNote: '9 $ plus taxes · Livre numérique en format PDF, envoyé par courriel après l’achat.',
  grimoireAlt: 'La couverture du livre de recettes du festival',
};

const EN: typeof FR = {
  title: 'Food Village',
  eyebrow: 'The belly of the festival',
  intro: 'The village menu for all three days, the great banquet at the lord’s table, and the festival cookbook to take home.',

  kioskRail: 'Food Village',
  kioskMeta: 'Serving',
  kioskMetaValue: 'Fri · Sat · Sun',
  kioskEyebrow: 'The village menu',
  kioskTitle: 'The three-day table',
  kioskLead: 'What you order at the village stalls, from Friday’s first fire to Sunday’s last ember. Cooking over coals, recipes of the old roads, 2026 edition.',
  kioskAside: 'No reservation · At the village’s pace',
  dishesWord: 'dishes',
  tavernTag: 'To raise your cup',
  kioskFootnote: 'Prices are posted at the stalls. Menu subject to change without notice based on local availability.',

  banquetRail: 'The Banquet',
  banquetMeta: 'Seats',
  banquetMetaValue: '50',
  banquetEyebrow: 'Sunday, at the lord’s table',
  banquetTitle: 'Prince William Banquet',
  banquetSub: 'A teeming three-course table by reservation, with bard musicians at the table.',
  banquetBody: 'Historically reserved for clan chiefs, this banquet is now open to all travellers, warriors, merchants and shieldmaidens who want a well-earned end-of-festival feast.',
  banquetNote: 'Tip not included · Menu subject to change without notice based on local availability.',
  reserve: 'Reserve',
  placesSing: 'one seat',
  reserveCompte: 'Open an account and reserve',
  placesPlur: (n: number) => `${n} seats`,
  moinsUne: 'One seat fewer',
  plusUne: 'One seat more',
  enRoute: 'Preparing checkout…',
  echecLien: 'Checkout would not open.',
  echecLienCta: 'Reserve one seat with the old link',
  merci: 'Thank you, your seat at the banquet is booked. The receipt is on its way by email.',
  when: 'When',
  seats: 'Seats',
  cost: 'Cost',
  banquetWhen: 'Sunday · 1:00 PM. Registration deadline: September 17, 2026.',
  banquetSeats: '50 seats, limited',
  banquetCost: '$65 per person, plus tax',
  restant: (n: number) =>
    n === 0 ? 'All fifty seats are taken.'
      : n === 1 ? 'One of the fifty seats is still free.'
        : `${n} of the fifty seats are still free.`,
  banquetMenuEyebrow: 'The banquet menu',
  banquetMenuTitle: 'Three courses',

  grimoireRail: 'The cookbook',
  grimoireMeta: 'Recipes',
  grimoireMetaValue: '27',
  grimoireEyebrow: 'To take home',
  grimoireTitle: 'The festival cookbook',
  grimoireBody: 'The festival kitchen’s recipes, straight out of the cauldrons: viking bread, olla gitana, hypocras, the traveller’s cake and twenty-three more, written in the hand of chef Marc-Alexis Pepin. Every one of them has been scaled down to five people, so you can cook it at home on a Tuesday night without dividing anything.',
  grimoireBientot: 'Coming soon',
  grimoireCta: 'Buy the cookbook',
  grimoirePreview: 'Read two recipes',
  grimoireNote: '$9 plus tax · Digital book in PDF, emailed after purchase.',
  grimoireAlt: 'The cover of the festival cookbook',
};

export default NourriturePage;
