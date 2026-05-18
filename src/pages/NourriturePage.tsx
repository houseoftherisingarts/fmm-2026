import React from 'react';
import { motion } from 'framer-motion';
import {ArrowUpRight, Clock, Users, Wine} from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';

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

// 4 food-village tents, cloned from the Wix /nourriture page. Each tent
// gets its own card on the page; copy is the user's own from the live site.
const TENTS = [
  {
    name: { FR: 'La Tente des Marmites', EN: 'The Cauldron Tent' },
    icon: 'ᛟ',
    dishes: [
      { name: 'Bouillon de l’aubergiste',   note: 'Servi avec pain viking. Potage clair aux racines et herbes du jardin.' },
      { name: 'Ragoût du Seigneur',         note: 'Chair de bœuf longuement cuite avec légumes, herbes et bouillon riche.' },
      { name: 'Pain viking au beurre',      note: 'Pain de blé cuit à la braise, beurre frais aux herbes sauvages.' },
      { name: 'Pain viking au sang (Víkingr Blóðbrauð)', note: 'Pain sombre et riche, façonné avec du sang cuit et des farines rustiques.' },
      { name: 'Laridum',                    note: 'Morceaux de lard salé fondants, huile d’olive et aneth.' },
    ],
  },
  {
    name: { FR: 'Les Braises du Jarl', EN: 'The Jarl’s Embers' },
    icon: 'ᛞ',
    dishes: [
      { name: 'Au miel noir',               note: 'Morceaux nobles de chapon rôtis et laqués de miel noir.' },
      { name: 'Tako Tamago',                note: 'Œuf de caille sur poulpe mariné — douceur des mers.' },
      { name: 'Kawaps d’agneau sur verdure',note: 'Tendres morceaux d’agneau grillés à la braise, marinés aux épices anciennes.' },
      { name: 'Côte de pourceau du fumoir', note: 'Saisie sur flamme vive, sauce moutarde rustique et bière brune.' },
      { name: 'Brochette de feuillage',     note: 'Tofu grillé, légumes verts et herbes sauvages, vinaigre de cidre.' },
      { name: 'Patate chaude en quart',     note: 'Pommes de terre tendres, miel doré, cannelle, paprika et touche de piment.' },
    ],
  },
  {
    name: { FR: 'Les Forgerons du Pain', EN: 'The Bread Smiths' },
    icon: 'ᚻ',
    dishes: [
      { name: 'Sandwich forgé sur mesure', note: 'Viandes fines, légumes frais, fromages exquis, dans un pain doré et croustillant. Choix de pain, viande (jambon de campagne, saucisses aux herbes, terrine), légumes, fromages (cheddar, suisse), marinades (jalapeños, cornichons), sauces (ranch, mayo épicé, mayo) et salades.' },
    ],
  },
  {
    name: { FR: 'La Halle des Douceurs', EN: 'The Hall of Sweets' },
    icon: 'ᚹ',
    dishes: [
      { name: 'Fruits confits',  note: 'Assortiment de fruits confits, sucré et parfumé.' },
      { name: 'Fruits frais',    note: 'Sélection de fruits mûrs, juteux — collation saine.' },
    ],
  },
  {
    name: { FR: 'Les Élixirs de l’Alchimiste', EN: 'The Alchemist’s Elixirs' },
    icon: '⚱',
    dishes: [
      { name: 'Hypocras',       note: 'Vin rouge épicé et sucré inspiré des traditions médiévales — cannelle, gingembre.' },
      { name: 'Vin chaud',      note: 'Cannelle, clou de girofle, agrumes — pour les premiers frissons d’automne.' },
      { name: 'Limonade',       note: 'Élixir rafraîchissant, sucré et citronné, pour nobles et chevaliers.' },
      { name: 'Bière au beurre',note: 'Caramel, épices, vanille — servie chaude et onctueuse.' },
    ],
  },
];

const NourriturePage: React.FC = () => {
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
        orbImage="/wix/nourriture/41d286c9.jpg"
        orbImagePosition="center 40%"
      />

      {/* ── Banquet feature ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="glass-light rounded-lg-card p-8 md:p-12 grid md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-7">
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.banquetEyebrow}</p>
              <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-3">{t.banquetTitle}</h2>
              <p className="font-editorial italic text-base md:text-lg text-ivory-soft mb-5">{t.banquetSub}</p>
              <p className="font-editorial text-sm md:text-base text-ivory-soft mb-6 leading-relaxed">{t.banquetNote}</p>
              <p className="font-editorial text-base md:text-lg text-ivory leading-relaxed mb-6">{t.banquetBody}</p>
              <a href={import.meta.env.VITE_ZEFFY_TICKET_URL || '#'} target="_blank" rel="noopener noreferrer"
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
        </div>
      </section>

      {/* ── Au Menu ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.menuEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-2">{t.menuTitle}</h2>
            <div className="divider-brass w-20 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {MENU.map((service, i) => (
              <motion.article
                key={service.name.FR}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="glass-light rounded-card p-6 md:p-7 flex flex-col"
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
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Food village tents ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.tentsEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-3">{t.tentsTitle}</h2>
            <div className="divider-brass w-20 mx-auto mb-4" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft max-w-2xl mx-auto">
              {t.tentsLead}
            </p>
          </div>
          <div className="space-y-6 md:space-y-8">
            {TENTS.map((tent) => (
              <motion.article
                key={tent.name.FR}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5 }}
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
                      <p className="font-display title-medieval text-sm text-brass mb-1">{d.name}</p>
                      <p className="font-editorial text-sm text-ivory-soft leading-snug">{d.note}</p>
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

const FR = {
  home: 'Accueil',
  eyebrow: 'À la table du seigneur',
  title: 'Village Nourriture',
  intro: 'Cette année, nous avons plusieurs tentes avec une nourriture décorum d’inspiration médiévale autour du monde. En plus de ces tentes, il vous est possible de vous inscrire d’avance à la tablée du Valhalla — le banquet du dimanche.',
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
  banquetCost: '100 $ par personne',
  menuEyebrow: 'Au menu',
  menuTitle: 'Cinq services à la torche',
  tentsEyebrow: 'Le village gustatif',
  tentsTitle: 'Cinq tentes, cinq seigneurs',
  tentsLead: 'Chaque tente a son propre seigneur des fourneaux. Du bouillon de l’aubergiste à la halle des douceurs — voici ce qu’on y sert.',
};

const EN = {
  home: 'Home',
  eyebrow: 'At the lord’s table',
  title: 'Food Village',
  intro: 'This year we host several tents serving medieval-inspired food from around the world. Beyond the tents, you can also reserve a seat at the Valhalla table — the Sunday banquet.',
  intro2: 'Local suppliers wishing to sponsor a tent — please reach out. Sponsors get their link on the site and a sign in front of their tent.',
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
  banquetCost: '$100 per person',
  menuEyebrow: 'On the menu',
  menuTitle: 'Five torchlit services',
  tentsEyebrow: 'The food village',
  tentsTitle: 'Five tents, five masters',
  tentsLead: 'Each tent has its own master of the fires. From the innkeeper’s broth to the hall of sweets — here is what they serve.',
};

export default NourriturePage;
