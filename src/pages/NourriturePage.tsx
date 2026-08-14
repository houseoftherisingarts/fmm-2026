import React from 'react';
import {ArrowUpRight, Clock, Users, Wine} from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem, ChapterIntro, ScrollProgress, Parallax } from '../components/scroll';
import { BubbleCanvas, Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';

// 5-service banquet menu cloned from the Wix /nourriture page.
const MENU = [
  {
    name: { FR: 'Premier service · Table d’accueil et mise en bouche', EN: 'First service · Welcome table & amuse-bouche' },
    items: [
      'Pain viking et beurre aux herbes & miel sauvage',
      'Fromages rustiques',
      'Pommes séchées',
      'Noix grillées',
      'Lactofermentations (sauerkraut, cornichons et autres)',
      'Bière blonde légère (+6$)',
    ],
  },
  {
    name: { FR: 'Deuxième service · Potages', EN: 'Second service · Soups & stews' },
    items: [
      'Ragoût de légumes du jardin',
      'Ragoût de bœuf à la bière',
      'Porridge d’orge concassée',
      'Chou braisé au vinaigre et gras',
      'Oignons caramélisés',
      'Bloodbraud',
    ],
  },
  {
    name: { FR: 'Troisième service · Rôtis et plats de viande', EN: 'Third service · Roasts & meats' },
    items: [
      'Agneau à la broche aux herbes',
      'Manchons au miel noir',
      'Poisson entier grillé, aneth et oignons',
      'Saucisses rustiques',
      'Légumes et racines du jardin au gras',
      '(suckling pig, asado, ribs, porchetta)',
    ],
  },
  {
    name: { FR: 'Quatrième service · Douceurs et confiseries', EN: 'Fourth service · Sweets & confections' },
    items: [
      'Dattes farcies aux noix',
      'Pommes rôties au miel et à la cannelle',
      'Babeurre sucré au miel et noisettes',
      'Noix caramélisées',
      'Pâte de fruits au miel',
    ],
  },
  {
    name: { FR: 'Cinquième service · Digestifs et fin de table', EN: 'Fifth service · Digestifs' },
    items: [
      'Hydromel fort (+6$)',
      'Infusion chaude d’ortie',
      'Noisettes grillées au feu',
      'Poires pochées aux herbes douces',
    ],
  },
];

// Menu officiel du village nourriture, tel que préparé par Marc-Alexis
// (courriel « fmm 2025 menu », 2025-05-12, pièce jointe final menu 2025.rtf,
// intégré le 2026-08-12 à la demande d'Alex). Prix publics seulement :
// les coûts et marges du document restent dans la cuisine.
const TENTS = [
  {
    name: { FR: 'Les Marmites du Campement', EN: 'The Camp Cauldrons' },
    icon: 'ᛟ',
    dishes: [
      { name: 'Bouillon de l’aubergiste', price: '12 $', note: 'Servi avec pain viking. Potage clair aux racines et herbes du jardin, recette des tables modestes telle qu’on la servait aux voyageurs et aux soldats.' },
      { name: 'Ragoût du Seigneur',       price: '16 $', note: 'Servi avec pain viking. Chair de bœuf longuement cuite avec légumes, herbes et bouillon riche.' },
      { name: 'Pain viking au beurre aux herbes', price: '6 $', note: 'Pain de blé cuit à la braise, beurre frais aux herbes sauvages.' },
      { name: 'Pain viking au sang (Víkingr Blóðbrauð)', price: '8 $', note: 'Pain sombre et riche, façonné avec du sang cuit et des farines rustiques.' },
      { name: 'Bouillon de bataille',     price: '12 $', note: 'Mélange de légumes et d’herbes séchés, le réconfort du campement.' },
      { name: 'Laridum',                  price: '5 $',  note: 'Morceaux de lard salé fondants, huile d’olive et aneth.' },
    ],
  },
  {
    name: { FR: 'Les Grillades du Vieux Namur', EN: 'The Old Namur Grill' },
    icon: 'ᛞ',
    dishes: [
      { name: 'Manchettes de chapon au miel noir', price: '12 $', note: 'Pilons rôtis et laqués de miel noir.' },
      { name: 'Poulet des vergers',       price: '16 $', note: 'Poulet mariné au cidre, grillé sur feu de bois.' },
      { name: 'Tako Tamago',              price: '8 $',  note: 'Œuf de caille sur poulpe mariné, douceur des mers.' },
      { name: 'Bâton du festin',          price: '12 $', note: 'Saucisse artisanale à griller soi-même sur la braise.' },
      { name: 'Kawaps d’agnel sur verdure', price: '22 $', note: 'Brochettes d’agneau grillé, marinées aux épices anciennes.' },
      { name: 'Côte de pourceau du fumoir', price: '14 $', note: 'Saisie sur flamme vive, sauce moutarde rustique et bière brune.' },
      { name: 'Brochette de feuillage',   price: '9 $',  note: 'Tofu grillé, légumes verts et herbes sauvages, vinaigre de cidre.' },
      { name: 'Patate chaude',            price: '6 $',  note: 'Miel doré, cannelle, paprika et touche de piment.' },
    ],
  },
  {
    name: { FR: 'Les Forgerons du Pain', EN: 'The Bread Smiths' },
    icon: 'ᚻ',
    dishes: [
      { name: 'Panini forgé sur mesure', price: '18 $ · 22 $ avec salade', note: 'Choix de pain (blanc, grain entier), de viande (jambon de campagne, saucisses aux herbes, tempeh, terrine), de légumes, de fromage (cheddar, suisse), de marinades (jalapeños, cornichons) et de sauces (ranch, mayo épicée, mayo). Salades du jour : mesclun vinaigrette maison ou salade de pâtes. Extras : viande +4 $, fromage +2,50 $, marinade ou sauce +1 $, salade +5 $.' },
    ],
  },
  {
    name: { FR: 'L’Échoppe des Douceurs', EN: 'The Hall of Sweets' },
    icon: 'ᚹ',
    dishes: [
      { name: 'Natas du royaume',    price: '5 $', note: 'Pâtisseries à pâte feuilletée, crème vanillée.' },
      { name: 'Le gâteau des moines', price: '7 $', note: 'Pain d’épices moelleux des abbayes.' },
      { name: 'La levée du roi',     price: '8 $', note: 'Brioche aux fruits confits, façon panettone.' },
      { name: 'Globi',               price: '7 $', note: 'Cinq petites boules sucrées et épicées, héritées des tables romaines.' },
      { name: 'Les joyaux confits',  price: '7 $', note: 'Assortiment de fruits confits, sucré et parfumé.' },
      { name: 'Fruits frais',        price: '3 $', note: 'Sélection de fruits mûrs et juteux, collation saine.' },
    ],
  },
  {
    name: { FR: 'Le Comptoir des Grignotes', EN: 'The Snack Counter' },
    icon: 'ᛒ',
    dishes: [
      { name: 'Les cuirs du seigneur',    price: '12 $', note: 'Bœuf séché du fumoir, à mâcher en arpentant le village.' },
      { name: 'Les pépites d’olivier',    price: '8 $',  note: 'Mélange d’olives choisies.' },
      { name: 'Les offrandes de l’oasis', price: '9 $',  note: 'Cinq dattes farcies, douceur du désert.' },
    ],
  },
  {
    name: { FR: 'La Taverne des Élixirs', EN: 'The Elixir Tavern' },
    icon: '⚱',
    dishes: [
      { name: 'Hypocras',           price: '28 $',   note: 'Vin rouge épicé et sucré des traditions médiévales : cannelle, gingembre.' },
      { name: 'Vin chaud',          price: '8 $',    note: 'Cannelle, clou de girofle, agrumes, pour les premiers frissons d’automne.' },
      { name: 'Conditum paradoxum', price: '8 $',    note: 'Vin épicé au miel, cannelle, poivre et gingembre, à la romaine.' },
      { name: 'Bochet',             price: '7 $',    note: 'Hydromel médiéval au miel caramélisé.' },
      { name: 'Bière sumérienne',   price: '6 $',    note: 'Orge et dattes fermentées, la doyenne des bières.' },
      { name: 'Bière au beurre',    price: '7 $',    note: 'Caramel, épices, vanille, servie chaude et onctueuse.' },
      { name: 'Posca',              price: '4,50 $', note: 'Vin aigre allongé de vinaigre, d’herbes et de miel, la gourde du légionnaire.' },
      { name: 'Limonade',           price: '4 $',    note: 'Élixir rafraîchissant, sucré et citronné, pour nobles et chevaliers.' },
    ],
  },
];

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

      {/* ── Banquet feature ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="top" />
        <BubbleCanvas className="opacity-30" count={14} />
        <Reveal className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="glass-light rounded-lg-card p-8 md:p-12 grid md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-7">
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.banquetEyebrow}</p>
              <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-3">{t.banquetTitle}</h2>
              <p className="font-editorial italic text-base md:text-lg text-ivory-soft mb-5">{t.banquetSub}</p>
              <p className="font-editorial text-sm md:text-base text-ivory-soft mb-6 leading-relaxed">{t.banquetNote}</p>
              <p className="font-editorial text-base md:text-lg text-ivory leading-relaxed mb-6">{t.banquetBody}</p>
              {/* Le banquet est un repas vendu, pas un billet d'entrée : il se
                  paie par Square (85 $ plus TPS et TVQ, soit 97,73 $), jamais
                  par la billetterie Zeffy du festival. Lien de paiement créé le
                  2026-08-14 sur le compte Square Le Salon des Inconnus (Namur),
                  référence de commande FMM2026-BANQUET. La variable
                  d'environnement permet d'en changer sans redéployer le code. */}
              <a href={import.meta.env.VITE_SQUARE_BANQUET_URL || 'https://square.link/u/fdkw4hH3'} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                {t.reserve}
                <ArrowUpRight size={14} />
              </a>
            </div>
            <ul className="md:col-span-5 space-y-3 font-sans text-sm text-ivory-soft">
              <li className="flex items-start gap-3"><Clock size={16} className="text-brass mt-0.5 shrink-0" /><div><span className="block font-display title-medieval text-xs text-brass mb-0.5">{t.when}</span>{t.banquetWhen}</div></li>
              <li className="flex items-start gap-3"><Users size={16} className="text-brass mt-0.5 shrink-0" /><div><span className="block font-display title-medieval text-xs text-brass mb-0.5">{t.seats}</span>{t.banquetSeats}</div></li>
              <li className="flex items-start gap-3"><Wine size={16} className="text-brass mt-0.5 shrink-0" /><div><span className="block font-display title-medieval text-xs text-brass mb-0.5">{t.cost}</span>{t.banquetCost}</div></li>
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ── Au Menu ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <Motes className="opacity-50" count={18} />
        <Parallax speed={0.12} className="absolute inset-0 -z-10">
          <div
            className="absolute inset-x-0 top-1/4 h-1/2"
            style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(184,106,42,0.10), transparent 70%)' }}
          />
        </Parallax>
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <ChapterIntro eyebrow={t.menuEyebrow} title={t.menuTitle} className="mb-10 md:mb-14" />
          <Stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6" stagger={0.07}>
            {MENU.map((service, i) => (
              <StaggerItem
                key={service.name.FR}
                as="article"
                className="glass-light rounded-card p-6 md:p-7 flex flex-col transition-transform duration-300 hover:-translate-y-1"
              >
                <p className="font-display title-medieval text-xs text-brass mb-2">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="font-display title-medieval text-base md:text-lg text-ivory mb-4 leading-snug">
                  {service.name[lang]}
                </h3>
                <ul className="space-y-1.5 font-editorial text-sm text-ivory-soft">
                  {service.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-brass mt-1">·</span> {item}
                    </li>
                  ))}
                </ul>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Food village tents ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="both" />
        <Motes className="opacity-40" count={14} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <ChapterIntro
            eyebrow={t.tentsEyebrow}
            title={t.tentsTitle}
            lead={t.tentsLead}
            className="mb-10 md:mb-14"
          />
          <Stagger className="space-y-6 md:space-y-8" stagger={0.1} amount={0.1}>
            {TENTS.map((tent) => (
              <StaggerItem
                key={tent.name.FR}
                as="article"
                className="glass-light rounded-lg-card p-6 md:p-10"
              >
                <header className="flex items-baseline gap-4 mb-6 pb-4">
                  <span className="font-display text-3xl md:text-4xl text-brass leading-none">{tent.icon}</span>
                  <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory">
                    {tent.name[lang]}
                  </h3>
                </header>
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {tent.dishes.map((d) => (
                    <li key={d.name}>
                      <p className="font-display title-medieval text-sm text-brass mb-1">
                        {d.name}
                        {d.price && <span className="text-ivory-soft font-editorial text-xs tracking-wide ml-2 whitespace-nowrap">{d.price}</span>}
                      </p>
                      <p className="font-editorial text-sm text-ivory-soft leading-snug">{d.note}</p>
                    </li>
                  ))}
                </ul>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
};

const FR = {
  home: 'Accueil',
  eyebrow: 'À la table du seigneur',
  title: 'Village Nourriture',
  intro: 'Cette année, nous avons plusieurs tentes avec une nourriture décorum d’inspiration médiévale autour du monde. En plus de ces tentes, il vous est possible de vous inscrire d’avance à la tablée du Valhalla, le banquet du dimanche.',
  intro2: 'Si vous êtes un fournisseur local et souhaitez commanditer une des tentes, n’hésitez pas à nous contacter ! Les commanditaires ont leurs liens sur ce site et une pancarte en face de leur tente respective.',
  banquetEyebrow: 'Réservation requise',
  banquetTitle: 'Banquet de l’Équinoxe',
  banquetSub: 'Une tablée foisonnante à 5 services sur réservation, avec un spectacle musical de bardes à la table.',
  banquetNote: 'Places limitées · Pourboire non inclus · Menu sujet à changement sans préavis selon la disponibilité locale des produits.',
  banquetBody: 'Historiquement réservé aux chefs de clans, ce banquet est maintenant ouvert à tous les voyageurs, guerriers, marchands et skjaldmös qui veulent profiter d’un repas de fin de festival bien mérité.',
  reserve: 'Réserver',
  when: 'Quand',
  seats: 'Places',
  cost: 'Coût',
  banquetWhen: 'Dimanche · 13h00. Date limite d’inscription : 17 septembre 2026.',
  banquetSeats: '50 places limitées',
  banquetCost: '85 $ par personne, plus taxes',
  menuEyebrow: 'Au menu',
  menuTitle: 'Cinq services à la torche',
  tentsEyebrow: 'Le village gustatif',
  tentsTitle: 'Six tentes, six seigneurs',
  tentsLead: 'Chaque tente a son propre seigneur des fourneaux. Du bouillon de l’aubergiste à la taverne des élixirs : voici le menu du festival.',
};

const EN = {
  home: 'Home',
  eyebrow: 'At the lord’s table',
  title: 'Food Village',
  intro: 'This year we host several tents serving medieval-inspired food from around the world. Beyond the tents, you can also reserve a seat at the Valhalla table, the Sunday banquet.',
  intro2: 'Local suppliers wishing to sponsor a tent, please reach out. Sponsors get their link on the site and a sign in front of their tent.',
  banquetEyebrow: 'Reservation required',
  banquetTitle: 'Equinox Banquet',
  banquetSub: 'A teeming 5-course table by reservation, with bard musicians at table.',
  banquetNote: 'Limited seats · Tip not included · Menu subject to change without notice based on local availability.',
  banquetBody: 'Historically reserved for clan chiefs, this banquet is now open to all travelers, warriors, merchants and shieldmaidens who want to enjoy a well-earned end-of-festival meal.',
  reserve: 'Reserve',
  when: 'When',
  seats: 'Seats',
  cost: 'Cost',
  banquetWhen: 'Sunday · 1:00 PM. Registration deadline: September 17, 2026.',
  banquetSeats: '50 seats limit',
  banquetCost: '$85 per person, plus tax',
  menuEyebrow: 'On the menu',
  menuTitle: 'Five torchlit services',
  tentsEyebrow: 'The food village',
  tentsTitle: 'Six tents, six masters',
  tentsLead: 'Each tent has its own master of the fires. From the innkeeper’s broth to the elixir tavern: here is the festival menu.',
};

export default NourriturePage;
