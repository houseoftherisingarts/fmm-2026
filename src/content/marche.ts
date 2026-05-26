// Marché kiosks — single source of truth.
// Consumed by:
//   • src/pages/MarchePage.tsx          (public 3-tier showcase)
//   • src/firebase/mockApplications.ts  (CRM dashboard mock seed)
//
// Adding a kiosk here makes it appear in both places automatically.
// `tier: 'premium'` puts the artisan in the gold-rim pavilion at the top.
// `tier: 'marche'`  goes into the interactive grid below.
// `tier: 'digital'` goes into the Boutique Digitale band.
// `tier: 'prep'`    is an in-house pre-order product (no contact, has price).

export type KioskTier = 'premium' | 'marche' | 'digital' | 'prep';

export interface MarcheKiosk {
  /** Stable id used as the mock vendor uid (e.g. `mock-v-artisans-azure`). */
  id: string;
  /** Public display name. */
  name: string;
  /** Where this kiosk shows up on the public page. */
  tier: KioskTier;
  /** Real contact name — used by the CRM "Contact" column. */
  contact: string;
  /** Real or placeholder email — only used by the CRM. */
  email: string;
  /** Free-text category badge (Cuir, Bijoux, Forge…). */
  category: string;
  /** Short tagline shown on the marché grid card (1 line). */
  tagFR: string;
  tagEN: string;
  /** Long bio shown when the card is featured or expanded. */
  bioFR?: string;
  bioEN?: string;
  /** Hero image path under /public/. */
  image?: string;
  /** Optional crop hint for object-position. */
  imagePosition?: string;
  /** Where their shop / IG / FB lives. */
  href?: string;
  /** Optional CTA label override for premium tier. */
  cta?: { FR: string; EN: string };
  /** Promo code applicable to this digital boutique. */
  promo?: string;
  /** Pre-order product fields (prep tier only). */
  prepPrice?: string;
  prepStrike?: string; // e.g. "C$29.00" before rebate
  prepNote?: { FR: string; EN: string };
}

/* ─── Premium pavilion ───────────────────────────────────────────────
   Featured artisans — gold-rim showcase cards at the top of /marche.
   These are the four flagship merchants that anchor the page. */
export const PREMIUM_VENDORS: MarcheKiosk[] = [
  {
    id: 'artisans-azure',
    name: 'Les Artisans d’Azure',
    tier: 'premium',
    contact: 'Camille Beaulieu',
    email: 'contact@artisansazure.example.ca',
    category: 'Cuir & Armures',
    tagFR: 'Armures et accessoires de cuir',
    tagEN: 'Leather armour & accessories',
    bioFR:
      'Fleuron de la confection québécoise, les produits Artisans d’Azure sont conçus par des GNistes, pour des GNistes. Une attention particulière à la durabilité et à la praticité — armures et accessoires de cuir, vêtements haut de gamme ou personnalisés, armures composites de métal et de cuir.',
    bioEN:
      'A jewel of Quebec craftsmanship, Artisans d’Azure products are designed by LARPers, for LARPers. Special attention to durability and practicality — leather armour and accessories, premium and custom garments, composite metal-and-leather armour.',
    image: '/wix/marche/2c7e6c33.jpg',
    href: 'https://artisansazure.example.ca',
    cta: { FR: 'Consulter la boutique', EN: 'Visit the shop' },
  },
  {
    id: 'chantelame-ariane',
    name: 'Forge Chantelame & Aux Fils d’Ariane',
    tier: 'premium',
    contact: 'Ariane Sigurdsdottir & Aslak Stormhammer',
    email: 'forge@chantelame.example.ca',
    category: 'Forge · Tissage',
    tagFR: 'Forge viking & atelier de tisserande',
    tagEN: 'Viking forge & weaver’s workshop',
    bioFR:
      'Au fond des bois, au nord, loin de l’électricité et de la technologie, se trouve une Ger (yourte) avec une forge et un atelier de tisserande. Tendez bien l’oreille — si vous entendez « héhéhé comment ça va poto ! », c’est que vous avez trouvé le clan Viking Autonome d’Ariane et Aslak.',
    bioEN:
      'Deep in the northern woods, far from electricity and tech, sits a yurt housing a forge and a weaving workshop. Listen for the friendly call — that’s how you’ll know you’ve found Ariane and Aslak’s Autonomous Viking Clan.',
    image: '/wix/marche/0b4c7ac8.jpg',
    href: 'https://chantelame.example.ca',
    cta: { FR: 'Découvrir le clan', EN: 'Meet the clan' },
  },
  {
    id: 'mandragores',
    name: 'L’Atelier des Mandragores',
    tier: 'premium',
    contact: 'Sève Lavigne',
    email: 'sve@mandragores.example.ca',
    category: 'Cosmétiques & Bijoux',
    tagFR: 'Soins & joaillerie inspirés des légendes',
    tagEN: 'Care & jewellery inspired by legend',
    bioFR:
      'Ateliers, artisanat, joaillerie, savons artisanaux et soins inspirés des légendes et de la poésie. 100 % aux huiles essentielles, produits naturels, faits à la main avec des ingrédients du Québec.',
    bioEN:
      'Workshops, crafts, jewellery, handmade soaps and care products inspired by legend and poetry. 100% essential oils, all natural, handmade with Quebec ingredients.',
    image: '/wix/marche/758c6f64.jpg',
    href: 'https://mandragores.example.ca',
    cta: { FR: 'Consulter le grimoire', EN: 'Open the grimoire' },
  },
  {
    id: 'forets-papilles',
    name: 'Forêts et Papilles',
    tier: 'premium',
    contact: 'Roxane Tessier',
    email: 'cueillette@foretspapilles.example.ca',
    category: 'Cueillette · Herboristerie',
    tagFR: 'Cueillette sauvage & savoirs ancestraux',
    tagEN: 'Wild foraging & ancestral wisdom',
    bioFR:
      'Le bonheur est bien meilleur quand il est partagé. Forêts & Papilles, c’est une histoire de partage et de passion — transmettre l’amour de la nature et perpétuer les savoirs ancestraux de la cueillette sauvage.',
    bioEN:
      'Happiness is better when shared. Forêts & Papilles is a story of sharing and passion — passing on a love of nature and the ancestral knowledge of wild foraging.',
    image: '/wix/marche/a2d1dca3.jpg',
    href: 'https://foretspapilles.example.ca',
    cta: { FR: 'Entrer dans la forêt', EN: 'Step into the forest' },
  },
];

/* ─── Marché — interactive kiosk grid ──────────────────────────────── */
export const MARCHE_VENDORS: MarcheKiosk[] = [
  { id: 'cuir-arcana',       name: 'Cuir Arcana',           tier: 'marche', contact: 'Anouk Beaufort',   email: 'arcana@cuir.example.ca',   category: 'Cuir',         tagFR: 'Accessoires de cuir',                   tagEN: 'Leather accessories',                bioFR: 'Bourses, ceintures et accessoires de cuir, finition artisanale.', bioEN: 'Pouches, belts and leather accessories — handcrafted finish.', image: '/wix/marche/b4c19724.png' },
  { id: 'rose-dragon',       name: 'La Rose et le Dragon',  tier: 'marche', contact: 'Iseult Marquis',   email: 'contact@roseetdragon.example.ca', category: 'Vêtements',    tagFR: 'Vêtements et créations',                tagEN: 'Clothing and creations',             bioFR: 'Vêtements d’inspiration médiévale et créations textiles uniques.', bioEN: 'Medieval-inspired garments and one-of-a-kind textile creations.', image: '/wix/marche/1ad4a4cb.jpg' },
  { id: 'mama-rose-quartz',  name: 'Mama Rose Quartz',      tier: 'marche', contact: 'Mama Rose',        email: 'mama@rosequartz.example.ca',category: 'Bijoux',        tagFR: 'Créations et bijoux de pierres',        tagEN: 'Crystal jewellery',                  bioFR: 'Bijoux en pierres semi-précieuses, montés à la main.', bioEN: 'Hand-set jewellery in semi-precious stones.', image: '/wix/marche/2de271eb.jpg' },
  { id: 'ferme-mouflon',     name: 'Ferme Mouflon',         tier: 'marche', contact: 'Famille Lavoie',   email: 'ferme@mouflon.example.ca',category: 'Élevage',      tagFR: 'Moutons Icelandic élevés au pâturage',  tagEN: 'Pasture-raised Icelandic sheep',     bioFR: 'Laine, peaux et produits issus d’un élevage Icelandic au pâturage.', bioEN: 'Wool, hides and products from pasture-raised Icelandic sheep.', image: '/wix/marche/33c53efb.jpg' },
  { id: 'kissisam',          name: 'Pâtisserie Kîssisam',   tier: 'marche', contact: 'Naomi Wapachee',   email: 'kissisam@example.ca',     category: 'Restauration', tagFR: 'Pâtisseries inspirées de racines autochtones', tagEN: 'Pastries from Indigenous roots', bioFR: 'Pâtisseries fines inspirées de saveurs et techniques autochtones.', bioEN: 'Fine pastries inspired by Indigenous flavours and techniques.', image: '/wix/marche/36bb3314.jpg' },
  { id: 'corpsage',          name: 'CorpSage',              tier: 'marche', contact: 'Salomé Brassard', email: 'corpsage@example.ca',     category: 'Soins corps',  tagFR: '« Tatouage » au henné',                 tagEN: 'Henna "tattooing"',                   bioFR: 'Henné naturel et motifs corporels éphémères.', bioEN: 'Natural henna and ephemeral body designs.', image: '/wix/marche/3ab269ab.jpg' },
  { id: 'artisans-monde',    name: 'Artisans du Monde',     tier: 'marche', contact: 'Collectif AdM',    email: 'mtl@artisansdumonde.example.ca', category: 'Commerce équitable', tagFR: 'Commerce équitable',           tagEN: 'Fair trade',                          bioFR: 'Objets et tissus issus du commerce équitable mondial.', bioEN: 'Objects and textiles from worldwide fair trade.', image: '/wix/marche/3dbc2b58.jpg' },
  { id: 'argile-papier',     name: 'Argile de Papier',      tier: 'marche', contact: 'Clarisse Hébert', email: 'argile@papier.example.ca',category: 'Sculpture',    tagFR: 'Créations d’argile de papier',          tagEN: 'Paper-clay creations',               bioFR: 'Sculptures et objets décoratifs en argile de papier.', bioEN: 'Sculptures and decorative objects in paper clay.', image: '/wix/marche/3efa78c8.jpg' },
  { id: 'editions-mondes',   name: 'Les Éditions Mondes Imaginaires', tier: 'marche', contact: 'Olivier Couture', email: 'editeur@mondesimaginaires.example.ca', category: 'Édition', tagFR: 'Maison d’édition',    tagEN: 'Indie publisher',                    bioFR: 'Romans, recueils et jeux de rôle d’univers imaginaires.', bioEN: 'Novels, anthologies and tabletop RPGs from imaginary worlds.', image: '/wix/marche/43b943d1.jpg' },
  { id: 'ciriers-allumes',   name: 'Les Ciriers Allumés',   tier: 'marche', contact: 'Marie-Élise Cyr',  email: 'cire@ciriersallumes.example.ca', category: 'Bougies',   tagFR: 'Cires et chandelles',                   tagEN: 'Wax and candles',                     bioFR: 'Bougies coulées à la main, cires d’abeille et de soya.', bioEN: 'Hand-poured candles in beeswax and soy.', image: '/wix/marche/45169ca1.jpg' },
  { id: 'sol-art',           name: 'Sol Art',               tier: 'marche', contact: 'Solène Tanguay',   email: 'sol@solart.example.ca',   category: 'Art',          tagFR: 'Atelier & galerie d’art',               tagEN: 'Studio & gallery',                    bioFR: 'Atelier itinérant — peintures, dessins, illustrations.', bioEN: 'Travelling studio — paintings, drawings, illustrations.', image: '/wix/marche/5660e1a5.jpg' },
  { id: 'frek-atelier',      name: 'Frek Atelier',          tier: 'marche', contact: 'Mikaela Frank',    email: 'frek@atelier.example.ca', category: 'Fourrures',    tagFR: 'Fourrures recyclées',                   tagEN: 'Upcycled furs',                       bioFR: 'Manteaux et accessoires en fourrures recyclées.', bioEN: 'Coats and accessories from upcycled furs.', image: '/wix/marche/f7025e55.jpg' },
  { id: 'mont-vezeau',       name: 'Domaine Mont Vezeau',   tier: 'marche', contact: 'Jeanne Pellerin',  email: 'vignes@montvezeau.example.ca', category: 'Vinification', tagFR: 'Vins de fraises et spécialités',  tagEN: 'Strawberry wines & specialties',     bioFR: 'Vins de fruits, hypocras et mistelles du Domaine Mont Vezeau.', bioEN: 'Fruit wines, hypocras and mistelles from Domaine Mont Vezeau.', image: '/wix/marche/58de2681.jpg' },
  { id: 'isabelle-jewelry',  name: 'Isabelle Jewelery',     tier: 'marche', contact: 'Isabelle Vachon',  email: 'isabelle@jewelry.example.ca', category: 'Bijoux',     tagFR: 'Bijoux faits main',                     tagEN: 'Handmade jewellery',                  bioFR: 'Bijoux en argent, cuivre et laiton — pièces uniques.', bioEN: 'Silver, copper and brass jewellery — one-off pieces.', image: '/wix/marche/5a033682.jpg' },
  { id: 'confections-zad',   name: 'Confections ZAD',       tier: 'marche', contact: 'Zoé Asselin',      email: 'zad@confections.example.ca', category: 'Costumes',    tagFR: 'Confections d’époque',                  tagEN: 'Period costuming',                    bioFR: 'Costumes d’époque sur mesure pour reconstitution et scène.', bioEN: 'Period costumes made to measure for reenactment and stage.', image: '/wix/marche/ea1c6a9a.jpg' },
];

/* ─── Boutique Digitale ───────────────────────────────────────────────
   Online-only partners. Get a promo code reveal animation on the page. */
export const DIGITAL_VENDORS: MarcheKiosk[] = [
  {
    id: 'julie-chantal',
    name: 'Julie-Chantal — Patrons de costumes médiévaux',
    tier: 'digital',
    contact: 'Julie-Chantal Dubreuil',
    email: 'julie.chantal@example.ca',
    category: 'Patrons numériques',
    tagFR: 'Patrons de couture & outils numériques',
    tagEN: 'Sewing patterns & digital tools',
    bioFR:
      'Pour une immersion complète, prépare toi-même ton costume médiéval. Julie-Chantal te propose une variété de patrons de couture et autres outils numériques pour t’aider à confectionner les costumes de toute la famille.',
    bioEN:
      'For full immersion, sew your own medieval garb. Julie-Chantal offers a variety of sewing patterns and digital tools to help you costume the whole family.',
    image: '/wix/marche/c8a35365.jpg',
    href: 'https://juliechantal.example.ca',
    promo: 'FMM20',
    cta: { FR: 'Voir les patrons', EN: 'See the patterns' },
  },
];

/* ─── Boutique Préparatoire — in-house pre-order with rebate ─────────
   Items sold directly by FMM. `prepPrice` is the festival-rebate price;
   `prepStrike` is the regular retail price shown struck-through. */
export const PREP_PRODUCTS: MarcheKiosk[] = [
  {
    id: 'prep-tunique-base',
    name: 'Tunique de base',
    tier: 'prep',
    contact: 'FMM Boutique',
    email: 'boutique@festivalmedievaldemontpellier.org',
    category: 'Vêtement de base',
    tagFR: 'Beige, vert ou noir — coton',
    tagEN: 'Beige, green or black — cotton',
    prepPrice: 'C$23.25',
    prepStrike: 'C$32.00',
    prepNote: { FR: 'Livraison 2–4 semaines', EN: 'Delivery in 2–4 weeks' },
    image: '/wix/marche/73932437.jpg',
  },
  {
    id: 'prep-choppe-viking',
    name: 'Choppe viking',
    tier: 'prep',
    contact: 'FMM Boutique',
    email: 'boutique@festivalmedievaldemontpellier.org',
    category: 'Accessoire',
    tagFR: 'Avec ouvre-bière intégré',
    tagEN: 'With integrated bottle opener',
    prepPrice: 'C$45.50',
    prepStrike: 'C$62.00',
    prepNote: { FR: 'Édition Caravanes 2026', EN: '2026 Caravans edition' },
    image: '/wix/marche/1d8aca4a.jpg',
  },
  {
    id: 'prep-wooden-mugs',
    name: 'Chopes en bois',
    tier: 'prep',
    contact: 'FMM Boutique',
    email: 'boutique@festivalmedievaldemontpellier.org',
    category: 'Vaisselle',
    tagFR: 'On manque toujours de chopes — précommandez la vôtre cette année.',
    tagEN: 'We are always short on mugs. Pre-order yours this year.',
    prepPrice: 'C$18.00',
    prepStrike: 'C$26.00',
    prepNote: { FR: 'Tournée à la main, traitée à la cire', EN: 'Hand-turned, wax-treated' },
    image: '/wix/marche/0b69be84.jpg',
  },
  {
    id: 'prep-base-coton',
    name: 'Base médiévale coton',
    tier: 'prep',
    contact: 'FMM Boutique',
    email: 'boutique@festivalmedievaldemontpellier.org',
    category: 'Ensemble',
    tagFR: 'Duo pantalon + chandail',
    tagEN: 'Pants + shirt set',
    prepPrice: 'C$19.25',
    prepStrike: 'C$28.50',
    prepNote: { FR: 'Tailles XS à XXL', EN: 'Sizes XS through XXL' },
    image: '/wix/marche/89000880.jpg',
  },
];

/** All non-prep kiosks flattened — handy for CRM seed + counts. */
export const ALL_VENDORS: MarcheKiosk[] = [
  ...PREMIUM_VENDORS,
  ...MARCHE_VENDORS,
  ...DIGITAL_VENDORS,
];
