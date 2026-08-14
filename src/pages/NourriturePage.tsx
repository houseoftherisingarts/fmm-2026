import React from 'react';
import { ArrowUpRight, Clock, Users, Wine } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem, ScrollProgress } from '../components/scroll';
import { BubbleCanvas, Motes } from '../components/marche/effects';
import { SectionFog, SectionTopRail, Eyebrow, DisplayTitle, GildedFrame } from '../components/marche/atmospherics';

// ─── Village Nourriture · édition 2026 ───────────────────────────────
// Deux menus, deux choses différentes (Alex, 2026-08-14) :
//   1. Le menu du BANQUET : cinq services servis à table le dimanche,
//      payés par Square. Contenu hérité de la page Wix /nourriture.
//   2. Le menu des KIOSQUES : ce qui se commande au village pendant les
//      trois jours. Source de vérité : la feuille vivante « Fiches
//      Cuisine FMM » de Marc-Alexis (onglet par plat, colonne Prix de
//      Vente), relevée le 2026-08-14. Prix publics seulement : les
//      coûts et marges de la feuille restent dans la cuisine.

// ── Menu du banquet · cinq services ──────────────────────────────────
const BANQUET_MENU = [
  {
    name: { FR: 'Table d’accueil et mise en bouche', EN: 'Welcome table & amuse-bouche' },
    items: [
      'Pain viking et beurre aux herbes & miel sauvage',
      'Fromages rustiques',
      'Pommes séchées',
      'Noix grillées',
      'Lactofermentations (choucroute, cornichons et autres)',
      'Bière blonde légère (+6 $)',
    ],
  },
  {
    name: { FR: 'Potages', EN: 'Soups & stews' },
    items: [
      'Ragoût de légumes du jardin',
      'Ragoût de bœuf à la bière',
      'Porridge d’orge concassée',
      'Chou braisé au vinaigre et gras',
      'Oignons caramélisés',
      'Blóðbrauð, le pain au sang',
    ],
  },
  {
    name: { FR: 'Rôtis et plats de viande', EN: 'Roasts & meats' },
    items: [
      'Agneau à la broche aux herbes',
      'Manchons au miel noir',
      'Poisson entier grillé, aneth et oignons',
      'Saucisses rustiques',
      'Légumes et racines du jardin au gras',
      'Cochon de lait, asado, côtes levées, porchetta',
    ],
  },
  {
    name: { FR: 'Douceurs et confiseries', EN: 'Sweets & confections' },
    items: [
      'Dattes farcies aux noix',
      'Pommes rôties au miel et à la cannelle',
      'Babeurre sucré au miel et noisettes',
      'Noix caramélisées',
      'Pâte de fruits au miel',
    ],
  },
  {
    name: { FR: 'Digestifs et fin de table', EN: 'Digestifs' },
    items: [
      'Hydromel fort (+6 $)',
      'Infusion chaude d’ortie',
      'Noisettes grillées au feu',
      'Poires pochées aux herbes douces',
    ],
  },
];

// ── Menu des kiosques · 2026 ─────────────────────────────────────────
// Prix relevés dans la feuille « Fiches Cuisine FMM » le 2026-08-14.
interface Plat { name: string; price: string; note: { FR: string; EN: string } }
interface Guilde { name: { FR: string; EN: string }; icon: string; dishes: Plat[] }

const GUILDES: Guilde[] = [
  {
    name: { FR: 'Le four et la marmite', EN: 'Hearth & cauldron' },
    icon: '🍲',
    dishes: [
      { name: 'Bouillon de l’aubergiste', price: '14 $', note: {
        FR: 'Servi avec pain viking. Potage clair aux racines et herbes du jardin, recette des tables modestes telle qu’on la servait aux voyageurs et aux soldats.',
        EN: 'Served with viking bread. A clear broth of roots and garden herbs, the way modest tables fed travellers and soldiers.' } },
      { name: 'Ragoût du Seigneur', price: '17 $', note: {
        FR: 'Servi avec pain viking. Chair de bœuf longuement cuite avec légumes, herbes et bouillon riche.',
        EN: 'Served with viking bread. Beef slow-cooked with vegetables, herbs and a rich broth.' } },
      { name: 'Pain viking au beurre aux herbes', price: '6 $', note: {
        FR: 'Pain de blé cuit à la braise, beurre frais aux herbes sauvages.',
        EN: 'Wheat bread baked over embers, fresh butter with wild herbs.' } },
      { name: 'Víkingr Blóðbrauð, pain au sang', price: '8 $', note: {
        FR: 'Pain sombre et riche, façonné avec du sang cuit et des farines rustiques.',
        EN: 'A dark, rich bread shaped with cooked blood and rustic flours.' } },
      { name: 'Laridum', price: '7 $', note: {
        FR: 'Morceaux de lard salé fondants, huile d’olive et aneth.',
        EN: 'Melting salted lard, olive oil and dill.' } },
    ],
  },
  {
    name: { FR: 'Les grillades', EN: 'The grills' },
    icon: '🔥',
    dishes: [
      { name: 'Manchettes de chapon au miel noir', price: '16 $', note: {
        FR: 'Pilons rôtis et laqués de miel noir.',
        EN: 'Roasted drumsticks lacquered with dark honey.' } },
      { name: 'Kawaps d’agnel sur verdure', price: '22 $', note: {
        FR: 'Brochettes d’agneau grillé, marinées aux épices anciennes.',
        EN: 'Grilled lamb skewers marinated in ancient spices.' } },
      { name: 'Côte de pourceau du fumoir', price: '15 $', note: {
        FR: 'Saisie sur flamme vive, sauce moutarde rustique et bière brune.',
        EN: 'Seared over open flame, rustic mustard and brown ale sauce.' } },
      { name: 'Tako Tamago', price: '11 $', note: {
        FR: 'Œuf de caille sur poulpe mariné, douceur des mers.',
        EN: 'Quail egg over marinated octopus, a sweetness from the sea.' } },
      { name: 'Brochette de feuillage', price: '14 $', note: {
        FR: 'Tofu grillé, légumes verts et herbes sauvages, vinaigre de cidre.',
        EN: 'Grilled tofu, greens and wild herbs, cider vinegar.' } },
      { name: 'Patate chaude', price: '7 $', note: {
        FR: 'Miel doré, cannelle, paprika et touche de piment.',
        EN: 'Golden honey, cinnamon, paprika and a touch of chili.' } },
    ],
  },
  {
    name: { FR: 'Les sandwichs de la route', EN: 'Sandwiches of the road' },
    icon: '🥖',
    dishes: [
      { name: 'Saumon boucané', price: '22 $', note: {
        FR: 'Gravlax de saumon passé au fumoir, crème fraîche maison, sur pain frais.',
        EN: 'Smokehouse salmon gravlax, house crème fraîche, on fresh bread.' } },
      { name: 'Porchetta', price: '20 $', note: {
        FR: 'Porc roulé aux herbes, rôti lentement, tranché sur le pain du jour.',
        EN: 'Herb-rolled pork, slow roasted, carved onto the day’s bread.' } },
      { name: 'Maraîcher', price: '18 $', note: {
        FR: 'Légumes du jardin, marinades et fromage, l’offrande du potager.',
        EN: 'Garden vegetables, pickles and cheese, the market garden’s offering.' } },
    ],
  },
  {
    name: { FR: 'Les douceurs', EN: 'Sweet things' },
    icon: '🍯',
    dishes: [
      { name: 'Le gâteau des moines', price: '9 $', note: {
        FR: 'Pain d’épices moelleux des abbayes.',
        EN: 'Soft abbey gingerbread.' } },
      { name: 'La levée du roi', price: '11 $', note: {
        FR: 'Brioche aux fruits confits, façon panettone.',
        EN: 'Candied-fruit brioche, panettone style.' } },
      { name: 'Globi', price: '9 $', note: {
        FR: 'Cinq petites boules sucrées et épicées, héritées des tables romaines.',
        EN: 'Five small sweet and spiced fritters from Roman tables.' } },
      { name: 'Les joyaux confits', price: '8 $', note: {
        FR: 'Assortiment de fruits confits, sucré et parfumé.',
        EN: 'An assortment of candied fruit, sweet and fragrant.' } },
    ],
  },
  {
    name: { FR: 'Les grignotines du chemin', EN: 'Snacks for the road' },
    icon: '🎒',
    dishes: [
      { name: 'Les cuirs du seigneur', price: '12 $', note: {
        FR: 'Bœuf séché du fumoir, à mâcher en arpentant le village.',
        EN: 'Smokehouse beef jerky, to chew while roaming the village.' } },
      { name: 'Les pépites d’olivier', price: '8 $', note: {
        FR: 'Mélange d’olives choisies.',
        EN: 'A mix of chosen olives.' } },
      { name: 'Les offrandes de l’oasis', price: '9 $', note: {
        FR: 'Trois dattes farcies, douceur du désert.',
        EN: 'Three stuffed dates, sweetness of the desert.' } },
    ],
  },
  {
    name: { FR: 'La taverne des élixirs', EN: 'The elixir tavern' },
    icon: '🍷',
    dishes: [
      { name: 'Hypocras', price: '28 $', note: {
        FR: 'Vin rouge épicé et sucré des traditions médiévales : cannelle, gingembre. La bouteille.',
        EN: 'Spiced, sweetened red wine of medieval tradition: cinnamon, ginger. The bottle.' } },
      { name: 'Vin chaud', price: '11 $', note: {
        FR: 'Cannelle, clou de girofle, agrumes, pour les premiers frissons d’automne.',
        EN: 'Cinnamon, clove, citrus, for the first shivers of autumn.' } },
      { name: 'Bière au beurre', price: '12 $', note: {
        FR: 'Caramel, épices, vanille, servie chaude et onctueuse.',
        EN: 'Caramel, spices, vanilla, served warm and creamy.' } },
      { name: 'Limonade', price: '4 $', note: {
        FR: 'Élixir rafraîchissant, sucré et citronné, pour nobles et chevaliers.',
        EN: 'A refreshing elixir, sweet and lemony, for nobles and knights.' } },
    ],
  },
];

const ROMANS = ['I', 'II', 'III', 'IV', 'V'];

// ── Rangée de plat : nom · meneur pointillé · prix ───────────────────
const PlatRow: React.FC<{ plat: Plat; lang: 'FR' | 'EN' }> = ({ plat, lang }) => (
  <li className="group/plat">
    <div className="flex items-baseline gap-3">
      <span className="font-display title-medieval text-base md:text-lg text-ivory leading-snug transition-colors duration-300 group-hover/plat:text-[var(--color-amber-glow)]">
        {plat.name}
      </span>
      <span
        aria-hidden
        className="flex-1 translate-y-[-3px]"
        style={{ borderBottom: '1px dotted rgba(232, 177, 74, 0.28)' }}
      />
      <span className="font-sans text-sm md:text-base tracking-[0.1em] whitespace-nowrap" style={{ color: 'var(--color-amber-glow)', fontWeight: 300 }}>
        {plat.price}
      </span>
    </div>
    <p className="font-editorial text-sm text-ivory-soft leading-snug mt-1 pr-10 max-w-prose">
      {plat.note[lang]}
    </p>
  </li>
);

const NourriturePage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <>
      {!embedded && <SEO title={t.title} description={t.intro} />}
      {!embedded && <ScrollProgress />}
      {embedded ? (
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
          orbImage="/wix/nourriture/41d286c9.jpg"
          orbImagePosition="center 40%"
        />
      )}

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
            <p className="lg:col-span-5 font-sans uppercase tracking-[0.3em] text-[10px] leading-loose text-right hidden lg:block" style={{ color: 'rgba(244,239,227,0.45)' }}>
              {t.kioskAside}
            </p>
          </div>

          {/* Le tableau : deux colonnes de guildes, la taverne en pleine
              largeur à la fin, encadrée d'or : la seule rupture. */}
          <Stagger className="grid md:grid-cols-2 gap-x-14 gap-y-12 md:gap-y-14" stagger={0.08} amount={0.08}>
            {GUILDES.slice(0, 5).map((g) => (
              <StaggerItem key={g.name.FR} as="article" className="min-w-0">
                <header className="flex items-baseline gap-3 mb-5 pb-3" style={{ borderBottom: '1px solid rgba(244,239,227,0.12)' }}>
                  <span aria-hidden className="text-xl md:text-2xl leading-none">{g.icon}</span>
                  <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory">{g.name[lang]}</h3>
                  <span className="ml-auto font-sans text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--color-copper)' }}>
                    {g.dishes.length} {t.dishesWord}
                  </span>
                </header>
                <ul className="space-y-4">
                  {g.dishes.map((p) => <PlatRow key={p.name} plat={p} lang={lang} />)}
                </ul>
              </StaggerItem>
            ))}

            {/* La taverne des élixirs : pleine largeur, corners dorés. */}
            <StaggerItem as="article" className="md:col-span-2 mt-2">
              <GildedFrame tone="amber" active className="block">
                <div className="px-6 py-8 md:px-12 md:py-10" style={{ background: 'rgba(232, 177, 74, 0.045)' }}>
                  <header className="flex items-baseline gap-3 mb-6">
                    <span aria-hidden className="text-2xl leading-none">{GUILDES[5].icon}</span>
                    <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory">{GUILDES[5].name[lang]}</h3>
                    <span className="ml-auto font-editorial italic text-xs md:text-sm" style={{ color: 'var(--color-amber-glow)' }}>
                      {t.tavernTag}
                    </span>
                  </header>
                  <ul className="grid md:grid-cols-2 gap-x-14 gap-y-4">
                    {GUILDES[5].dishes.map((p) => <PlatRow key={p.name} plat={p} lang={lang} />)}
                  </ul>
                </div>
              </GildedFrame>
            </StaggerItem>
          </Stagger>

          <p className="font-editorial text-xs md:text-sm text-ivory-soft/70 mt-10 md:mt-12 max-w-2xl">
            {t.kioskFootnote}
          </p>
        </div>
      </section>

      {/* ══ 06 · Le banquet de l'Équinoxe ══════════════════════════════
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

          <Reveal>
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start mb-14 md:mb-20">
              <div className="lg:col-span-7 min-w-0">
                <Eyebrow tone="amber" className="mb-5 inline-flex items-center gap-3">
                  <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-amber-glow)' }} />
                  {t.banquetEyebrow}
                </Eyebrow>
                <DisplayTitle size="xl" glow className="mb-4">{t.banquetTitle}</DisplayTitle>
                <p className="font-editorial italic text-base md:text-lg text-ivory-soft mb-5">{t.banquetSub}</p>
                <p className="font-editorial text-base md:text-lg text-ivory leading-relaxed mb-8 max-w-2xl">{t.banquetBody}</p>
                {/* Le paiement du banquet passe par Square (85 $ + TPS/TVQ =
                    97,73 $), commande FMM2026-BANQUET sur le compte du
                    traiteur Le Salon des Inconnus. Jamais par Zeffy. */}
                <a
                  href={import.meta.env.VITE_SQUARE_BANQUET_URL || 'https://square.link/u/fdkw4hH3'}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card"
                >
                  {t.reserve}
                  <ArrowUpRight size={14} />
                </a>
                <p className="font-editorial text-xs text-ivory-soft/70 mt-4">{t.banquetNote}</p>
              </div>
              <ul className="lg:col-span-5 space-y-5 font-sans text-sm text-ivory-soft lg:pt-10">
                <li className="flex items-start gap-3 pb-5" style={{ borderBottom: '1px solid rgba(244,239,227,0.1)' }}>
                  <Clock size={16} className="text-brass mt-0.5 shrink-0" />
                  <div><span className="block font-display title-medieval text-xs text-brass mb-0.5">{t.when}</span>{t.banquetWhen}</div>
                </li>
                <li className="flex items-start gap-3 pb-5" style={{ borderBottom: '1px solid rgba(244,239,227,0.1)' }}>
                  <Users size={16} className="text-brass mt-0.5 shrink-0" />
                  <div><span className="block font-display title-medieval text-xs text-brass mb-0.5">{t.seats}</span>{t.banquetSeats}</div>
                </li>
                <li className="flex items-start gap-3">
                  <Wine size={16} className="text-brass mt-0.5 shrink-0" />
                  <div><span className="block font-display title-medieval text-xs text-brass mb-0.5">{t.cost}</span>{t.banquetCost}</div>
                </li>
              </ul>
            </div>
          </Reveal>

          {/* Le menu du banquet : la procession des cinq services. */}
          <Reveal>
            <header className="mb-8 md:mb-10">
              <Eyebrow className="mb-3">{t.banquetMenuEyebrow}</Eyebrow>
              <h3 className="font-display title-medieval text-2xl md:text-4xl text-ivory">{t.banquetMenuTitle}</h3>
            </header>
          </Reveal>
          <Stagger className="max-w-4xl" stagger={0.09} amount={0.12}>
            {BANQUET_MENU.map((service, i) => (
              <StaggerItem
                key={service.name.FR}
                as="article"
                className="grid grid-cols-[3.5rem_1fr] md:grid-cols-[5rem_1fr] gap-4 md:gap-8 py-6 md:py-8"
                style={i < BANQUET_MENU.length - 1 ? { borderBottom: '1px solid rgba(244,239,227,0.08)' } : undefined}
              >
                <span
                  aria-hidden
                  className="font-display text-3xl md:text-5xl leading-none text-right"
                  style={{ color: 'var(--color-copper)', fontWeight: 400 }}
                >
                  {ROMANS[i]}
                </span>
                <div className="min-w-0">
                  <h4 className="font-display title-medieval text-lg md:text-xl text-ivory mb-2">
                    {service.name[lang]}
                  </h4>
                  <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed">
                    {service.items.map((item, j) => (
                      <React.Fragment key={item}>
                        {j > 0 && <span aria-hidden style={{ color: 'var(--color-amber-glow)' }}> · </span>}
                        {item}
                      </React.Fragment>
                    ))}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
};

const FR = {
  title: 'Village Nourriture',
  eyebrow: 'Le ventre du festival',
  intro: 'Les kiosques du village pour les trois jours, et le grand banquet du dimanche : deux menus, une même cuisine sur les braises.',

  kioskRail: 'Village Nourriture',
  kioskMeta: 'Service',
  kioskMetaValue: 'Ven · Sam · Dim',
  kioskEyebrow: 'Le menu des kiosques',
  kioskTitle: 'La table des trois jours',
  kioskLead: 'Ce qui se commande aux étals du village, du premier feu du vendredi au dernier tison du dimanche. Cuisine sur la braise, recettes des routes anciennes, édition 2026.',
  kioskAside: 'Sans réservation · Au gré du village',
  dishesWord: 'plats',
  tavernTag: 'Pour lever sa coupe',
  kioskFootnote: 'Prix en dollars canadiens, taxes incluses. Le menu peut changer sans préavis selon la disponibilité locale des produits. Options sans viande à chaque étal.',

  banquetRail: 'Le Banquet',
  banquetMeta: 'Places',
  banquetMetaValue: '50',
  banquetEyebrow: 'Dimanche, à la table du seigneur',
  banquetTitle: 'Banquet de l’Équinoxe',
  banquetSub: 'Une tablée foisonnante à cinq services sur réservation, avec un spectacle musical de bardes à la table.',
  banquetBody: 'Historiquement réservé aux chefs de clans, ce banquet est maintenant ouvert à tous les voyageurs, guerriers, marchands et skjaldmös qui veulent profiter d’un repas de fin de festival bien mérité.',
  banquetNote: 'Pourboire non inclus · Menu sujet à changement sans préavis selon la disponibilité locale des produits.',
  reserve: 'Réserver ma place',
  when: 'Quand',
  seats: 'Places',
  cost: 'Coût',
  banquetWhen: 'Dimanche · 13h00. Date limite d’inscription : 17 septembre 2026.',
  banquetSeats: '50 places limitées',
  banquetCost: '85 $ par personne, plus taxes',
  banquetMenuEyebrow: 'Le menu du banquet',
  banquetMenuTitle: 'Cinq services',
};

const EN: typeof FR = {
  title: 'Food Village',
  eyebrow: 'The belly of the festival',
  intro: 'The village kiosks for all three days, and the great Sunday banquet: two menus, one kitchen over the embers.',

  kioskRail: 'Food Village',
  kioskMeta: 'Serving',
  kioskMetaValue: 'Fri · Sat · Sun',
  kioskEyebrow: 'The kiosk menu',
  kioskTitle: 'The three-day table',
  kioskLead: 'What you order at the village stalls, from Friday’s first fire to Sunday’s last ember. Cooking over coals, recipes of the old roads, 2026 edition.',
  kioskAside: 'No reservation · At the village’s pace',
  dishesWord: 'dishes',
  tavernTag: 'To raise your cup',
  kioskFootnote: 'Prices in Canadian dollars, taxes included. Menu subject to change without notice based on local availability. Meat-free options at every stall.',

  banquetRail: 'The Banquet',
  banquetMeta: 'Seats',
  banquetMetaValue: '50',
  banquetEyebrow: 'Sunday, at the lord’s table',
  banquetTitle: 'Equinox Banquet',
  banquetSub: 'A teeming five-course table by reservation, with bard musicians at the table.',
  banquetBody: 'Historically reserved for clan chiefs, this banquet is now open to all travellers, warriors, merchants and shieldmaidens who want a well-earned end-of-festival feast.',
  banquetNote: 'Tip not included · Menu subject to change without notice based on local availability.',
  reserve: 'Reserve my seat',
  when: 'When',
  seats: 'Seats',
  cost: 'Cost',
  banquetWhen: 'Sunday · 1:00 PM. Registration deadline: September 17, 2026.',
  banquetSeats: '50 seats, limited',
  banquetCost: '$85 per person, plus tax',
  banquetMenuEyebrow: 'The banquet menu',
  banquetMenuTitle: 'Five courses',
};

export default NourriturePage;
