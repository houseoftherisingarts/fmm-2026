// ─── Festival Médiéval de Montpellier — content map ──────────────
// Single source of truth for FR/EN copy, nav structure, contact info,
// and pillar metadata. Mirrors the live Wix site at
// festivalmedievaldemontpellier.org.

export type Lang = 'FR' | 'EN';

export const SITE = {
  name: 'Festival Médiéval de Montpellier',
  shortName: 'FMM',
  edition2026: 'Caravanes & Saltimbanques',
  year: 2026,
  dates: { start: '2026-09-25', end: '2026-09-27' },
  datesLabel: { FR: '25 — 26 — 27 septembre 2026', EN: 'September 25 — 26 — 27, 2026' },
  contact: {
    email: 'admin@festivalmedievaldemontpellier.org',
    phone: '514-418-3450',
    address: '4 rue du Bosquet, Montpellier, Québec',
  },
  social: {
    facebook: 'https://www.facebook.com/FestivalMedievalMontpellier/',
    instagram: 'https://www.instagram.com/festivalmedievaldemontpellier/',
  },
  operator: 'Le Salon des Inconnus',
  operatorUrl: 'http://www.lesalondesinconnus.com',
  logo: '/fmm-logo-embossed-silver.png',
  logoWhite: '/fmm-logo-embossed-silver.png',
};

// Slugs match the live Wix site, normalized to ASCII (no diacritics).
export type PillarKey =
  | 'marche' | 'activites' | 'nourriture' | 'jeunesse' | 'musique'
  | 'chevaux' | 'apprendre' | 'hebergement' | 'partenaires'
  | 'benevole' | 'histoire' | 'mariages' | 'groupes';

export interface Pillar {
  key: PillarKey;
  slug: { FR: string; EN: string };
  label: { FR: string; EN: string };
  short: { FR: string; EN: string };
}

export const PILLARS: Pillar[] = [
  { key: 'marche',      slug: { FR: '/marche',       EN: '/en/market' },     label: { FR: 'Marché & Boutique',           EN: 'Market & Shop' },           short: { FR: 'Marché',       EN: 'Market' } },
  { key: 'activites',   slug: { FR: '/activites',    EN: '/en/activities' }, label: { FR: 'Activités',                   EN: 'Activities' },              short: { FR: 'Activités',    EN: 'Activities' } },
  { key: 'nourriture',  slug: { FR: '/nourriture',   EN: '/en/food' },       label: { FR: 'Village Nourriture',          EN: 'Food Village' },            short: { FR: 'Nourriture',   EN: 'Food' } },
  { key: 'jeunesse',    slug: { FR: '/jeunesse',     EN: '/en/youth' },      label: { FR: 'Village Jeunesse & Jeux',     EN: 'Youth & Games Village' },   short: { FR: 'Jeunesse & Jeux', EN: 'Youth & Games' } },
  { key: 'musique',     slug: { FR: '/musique',      EN: '/en/music' },      label: { FR: 'Musique',                     EN: 'Music' },                   short: { FR: 'Musique',      EN: 'Music' } },
  { key: 'chevaux',     slug: { FR: '/chevaux',      EN: '/en/horses' },     label: { FR: 'Clinique Équestre',           EN: 'Equestrian Clinic' },       short: { FR: 'Chevaux',      EN: 'Horses' } },
  { key: 'apprendre',   slug: { FR: '/apprendre',    EN: '/en/learn' },      label: { FR: 'Apprendre',                   EN: 'Learn' },                   short: { FR: 'Apprendre',    EN: 'Learn' } },
  { key: 'hebergement', slug: { FR: '/hebergement',  EN: '/en/lodging' },    label: { FR: 'Camping & Hébergement',       EN: 'Camping & Lodging' },       short: { FR: 'Camping',      EN: 'Camping' } },
  { key: 'partenaires', slug: { FR: '/partenaires',  EN: '/en/partners' },   label: { FR: 'Nos Partenaires',             EN: 'Our Partners' },            short: { FR: 'Partenaires',  EN: 'Partners' } },
  { key: 'benevole',    slug: { FR: '/benevole',     EN: '/en/volunteer' },  label: { FR: 'Devenir Bénévole',            EN: 'Become a Volunteer' },      short: { FR: 'Bénévole',     EN: 'Volunteer' } },
  { key: 'histoire',    slug: { FR: '/histoire',     EN: '/en/history' },    label: { FR: '4 Ans d\'histoire',           EN: '4 Years of History' },      short: { FR: 'Histoire',     EN: 'History' } },
  { key: 'mariages',    slug: { FR: '/mariages',     EN: '/en/weddings' },   label: { FR: 'Mariages',                    EN: 'Weddings' },                short: { FR: 'Mariages',     EN: 'Weddings' } },
  { key: 'groupes',     slug: { FR: '/groupes',      EN: '/en/groups' },     label: { FR: 'Groupes',                     EN: 'Groups' },                  short: { FR: 'Groupes',      EN: 'Groups' } },
];

export const PILLAR_BY_KEY: Record<PillarKey, Pillar> = Object.fromEntries(
  PILLARS.map((p) => [p.key, p]),
) as Record<PillarKey, Pillar>;

// ─── Per-pillar copy ─────────────────────────────────────────────────
export interface PillarCopy { eyebrow: string; title: string; lead: string }

export const PILLAR_COPY: Record<PillarKey, { FR: PillarCopy; EN: PillarCopy }> = {
  marche:      { FR: { eyebrow: 'Marché médiéval',      title: 'Marché & Boutique',     lead: 'Artisans, forgerons, costumiers et marchands d\'époque, plus la boutique officielle FMM.' }, EN: { eyebrow: 'Medieval market',     title: 'Market & Shop',         lead: 'Period artisans, blacksmiths, costumers and merchants, plus the official FMM shop.' } },
  activites:   { FR: { eyebrow: 'Programmation',        title: 'Activités',             lead: 'L\'horaire complet sur trois jours : tournois, démonstrations, ateliers, contes, spectacles.' }, EN: { eyebrow: 'Programming',          title: 'Activities',            lead: 'Three-day schedule: tournaments, demos, workshops, storytelling, shows.' } },
  nourriture:  { FR: { eyebrow: 'À la table du seigneur', title: 'Village Nourriture',  lead: 'Banquet médiéval servi à la torche, hypocras et un village de cuisines d\'époque.' }, EN: { eyebrow: 'At the lord\'s table', title: 'Food Village',         lead: 'Torchlit medieval banquet, hypocras and a village of period kitchens.' } },
  jeunesse:    { FR: { eyebrow: 'Pour les enfants',     title: 'Village Jeunesse',      lead: 'Espace dédié aux jeunes : ateliers, jeux, contes, initiation au combat de mousse.' }, EN: { eyebrow: 'For kids',            title: 'Youth Village',         lead: 'Dedicated kids space: workshops, games, storytelling, foam-combat intro.' } },
  musique:     { FR: { eyebrow: 'Sur scène',            title: 'Musique',               lead: 'Programmation 2026 mettant à l\'honneur la Troupe Hullsborg et nos invités vikings.' }, EN: { eyebrow: 'On stage',             title: 'Music',                 lead: '2026 lineup featuring Troupe Hullsborg and our Viking guests.' } },
  chevaux:     { FR: { eyebrow: 'Au manège',            title: 'Clinique Équestre',     lead: 'Démonstrations, joutes et clinique équestre médiévale ouverte aux cavaliers.' }, EN: { eyebrow: 'In the ring',         title: 'Equestrian Clinic',     lead: 'Demonstrations, jousting and a medieval equestrian clinic open to riders.' } },
  apprendre:   { FR: { eyebrow: 'Ateliers',             title: 'Apprendre',             lead: 'Forge, tissage, calligraphie, archerie, combat à l\'épée. Toute la fin de semaine.' }, EN: { eyebrow: 'Workshops',            title: 'Learn',                 lead: 'Blacksmithing, weaving, calligraphy, archery, swordfighting. All weekend.' } },
  hebergement: { FR: { eyebrow: 'Sur place et alentours', title: 'Camping & Hébergement', lead: 'Choisissez votre emplacement de camping sur la carte interactive, ou découvrez nos hébergements partenaires dans la Petite-Nation.' }, EN: { eyebrow: 'On site and nearby',  title: 'Camping & Lodging',     lead: 'Pick your camping spot on the interactive map, or discover our partner lodgings in Petite-Nation.' } },
  partenaires: { FR: { eyebrow: 'Avec nous',            title: 'Nos Partenaires',       lead: 'Un grand merci à nos partenaires publics, privés et communautaires.' }, EN: { eyebrow: 'With us',             title: 'Our Partners',          lead: 'Heartfelt thanks to our public, private and community partners.' } },
  benevole:    { FR: { eyebrow: 'Le cœur du festival',  title: 'Devenir Bénévole',      lead: 'Le FMM est opéré par une équipe de bénévoles. Joignez-vous à nous.' }, EN: { eyebrow: 'The heart of the festival', title: 'Become a Volunteer', lead: 'FMM runs on volunteer power. Join us.' } },
  histoire:    { FR: { eyebrow: 'Notre histoire',       title: '4 Ans d\'histoire',     lead: 'Quatre éditions, des milliers de visiteurs, des centaines de photos.' }, EN: { eyebrow: 'Our story',           title: '4 Years of History',    lead: 'Four editions, thousands of visitors, hundreds of photos.' } },
  mariages:    { FR: { eyebrow: 'Cérémonie d\'époque',  title: 'Mariages',              lead: 'Le site du FMM accueille mariages médiévaux et celtiques sur réservation.' }, EN: { eyebrow: 'Period ceremony',     title: 'Weddings',              lead: 'The FMM site hosts medieval and Celtic weddings by reservation.' } },
  groupes:     { FR: { eyebrow: 'Sortie de groupe',     title: 'Groupes',               lead: 'Tarifs spéciaux pour les groupes scolaires, communautaires et corporatifs.' }, EN: { eyebrow: 'Group outing',        title: 'Groups',                lead: 'Special rates for school, community and corporate groups.' } },
};

// ─── Home (real homepage, replaces Wix `/festival-medieval-de-montpellier`)
export const HOME = {
  FR: {
    hero: {
      eyebrow: 'Caravanes & Saltimbanques · Édition 2026',
      title: 'FMM 2026',
      dates: '25 — 26 — 27 septembre 2026',
      subtitle: 'Trois jours sur les routes du temps. Caravanes, fauves de scène, tarot, tambours, troupes nordiques — au cœur de Montpellier, Québec.',
      primaryCta: 'Acheter mes billets',
      secondaryCta: 'Découvrir le festival',
    },
    tickets: {
      eyebrow: 'Billetterie',
      title: 'Trois façons de festoyer',
      lead: 'Choisissez votre formule. Tous les billets se procurent en ligne via Zeffy.',
      cta: 'Acheter sur Zeffy',
      tiers: [
        { name: 'Passe Journée',    price: 'À venir',  perks: ['Accès complet au site',  'Marché et démonstrations',     'Spectacles et tournois'] },
        { name: 'Passe 3 Jours',    price: 'À venir',  perks: ['Tous les avantages',     'Économies vs journée',         'Bracelet officiel FMM'] },
        { name: 'Banquet Médiéval', price: 'À venir',  perks: ['Souper servi à la torche', 'Hypocras de l\'aubergiste', 'Animation pendant le repas'] },
      ],
    },
    plank: {
      title: 'Billets',
      lead: 'Procurez-vous vos billets dès maintenant.',
      cta: 'Acheter',
    },
    map: {
      eyebrow: 'Plan du site',
      title: 'Le village s\'étend dans le bois',
      lead: 'Marché, banquet, scène musicale, manège équestre et village jeunesse — tous reliés par les sentiers de Montpellier.',
    },
    pillarFeatures: [
      { key: 'marche'      as const, image: '/site/feature-marche.jpg' },
      { key: 'nourriture'  as const, image: '/site/feature-nourriture.jpg' },
      { key: 'musique'     as const, image: '/site/feature-musique.jpg' },
      { key: 'chevaux'     as const, image: '/site/feature-chevaux.jpg' },
      { key: 'apprendre'   as const, image: '/site/feature-apprendre.jpg' },
    ],
    sponsors: 'Ils soutiennent le festival',
  },
  EN: {
    hero: {
      eyebrow: 'Caravans & Players · 2026 Edition',
      title: 'FMM 2026',
      dates: 'September 25 — 26 — 27, 2026',
      subtitle: 'Three days on the roads of time. Caravans, troupe-fire, tarot, drums and Nordic clans — in the heart of Montpellier, Quebec.',
      primaryCta: 'Get my tickets',
      secondaryCta: 'Discover the festival',
    },
    tickets: {
      eyebrow: 'Ticketing',
      title: 'Three ways to feast',
      lead: 'Pick your pass. All tickets sold online via Zeffy.',
      cta: 'Buy on Zeffy',
      tiers: [
        { name: 'Day Pass',        price: 'TBA',  perks: ['Full site access',      'Market and demos',             'Shows and tournaments'] },
        { name: '3-Day Pass',      price: 'TBA',  perks: ['All day-pass perks',    'Savings vs day-by-day',        'Official FMM wristband'] },
        { name: 'Medieval Banquet', price: 'TBA', perks: ['Torchlit dinner',       'The innkeeper\'s hypocras',    'Live entertainment at table'] },
      ],
    },
    plank: { title: 'Tickets', lead: 'Get your tickets now.', cta: 'Buy' },
    map: {
      eyebrow: 'Site plan',
      title: 'The village stretches through the woods',
      lead: 'Market, banquet, music stage, equestrian ring and youth village — all linked by the Montpellier trails.',
    },
    pillarFeatures: [
      { key: 'marche'      as const, image: '/site/feature-marche.jpg' },
      { key: 'nourriture'  as const, image: '/site/feature-nourriture.jpg' },
      { key: 'musique'     as const, image: '/site/feature-musique.jpg' },
      { key: 'chevaux'     as const, image: '/site/feature-chevaux.jpg' },
      { key: 'apprendre'   as const, image: '/site/feature-apprendre.jpg' },
    ],
    sponsors: 'They support the festival',
  },
};

// ─── Sponsors / press logos ─────────────────────────────────────────
// Source files captured from the live Wix CDN into /public/sponsors/.
// Replace `name` with the actual partner name once confirmed.
export const SPONSORS = [
  { src: '/sponsors/sponsor-150c7c90.png', name: 'TODO Press partner 1' },
  { src: '/sponsors/sponsor-6d903a21.png', name: 'TODO Press partner 2' },
  { src: '/sponsors/sponsor-cb8622e8.png', name: 'TODO Press partner 3' },
  { src: '/sponsors/sponsor-a0e208f9.png', name: 'TODO Press partner 4' },
  { src: '/sponsors/sponsor-de2f95fa.png', name: 'TODO Press partner 5' },
  { src: '/sponsors/sponsor-b17fdda9.png', name: 'TODO Press partner 6' },
];

// ─── Footer ─────────────────────────────────────────────────────────
export const FOOTER = {
  FR: {
    aboutTitle: 'Festival Médiéval de Montpellier',
    aboutBody: 'Le FMM est porté par une équipe de bénévoles et soutenu par les membres du Conseil. Trois jours de festival au cœur de Montpellier, Québec.',
    contactTitle: 'Contact',
    quickTitle: 'Menu Rapide',
    resourcesTitle: 'Ressources',
    newsletterTitle: 'Restez à la cour',
    newsletterBody: 'Recevez l\'horaire complet et les nouvelles 2026 directement dans votre boîte.',
    newsletterCta: 'M\'inscrire',
    newsletterPlaceholder: 'votre@courriel.ca',
    newsletterThanks: 'Merci ! Nous vous écrirons bientôt.',
    rights: '© 2026 Le Salon des Inconnus · Festival Médiéval de Montpellier',
    privacy: 'Politique de confidentialité',
    sponsorsTitle: 'Ils en parlent',
  },
  EN: {
    aboutTitle: 'Festival Médiéval de Montpellier',
    aboutBody: 'FMM is carried by a volunteer team and supported by the festival Council. Three days of festival in the heart of Montpellier, Quebec.',
    contactTitle: 'Contact',
    quickTitle: 'Quick links',
    resourcesTitle: 'Resources',
    newsletterTitle: 'Stay at court',
    newsletterBody: 'Get the full schedule and 2026 news straight to your inbox.',
    newsletterCta: 'Sign me up',
    newsletterPlaceholder: 'your@email.com',
    newsletterThanks: 'Thank you! We\'ll be in touch.',
    rights: '© 2026 Le Salon des Inconnus · Festival Médiéval de Montpellier',
    privacy: 'Privacy policy',
    sponsorsTitle: 'They talk about us',
  },
};

// ─── Consent banner (LOI 25 Quebec) ──────────────────────────────────
export const CONSENT = {
  FR: {
    body: 'Le FMM utilise des témoins (cookies) pour mesurer l\'audience du site et améliorer votre expérience. Vous pouvez accepter ou refuser. Conforme à la Loi 25 du Québec.',
    accept: 'J\'accepte',
    decline: 'Refuser',
  },
  EN: {
    body: 'FMM uses cookies to measure site traffic and improve your experience. You can accept or decline. Quebec Law 25 compliant.',
    accept: 'Accept',
    decline: 'Decline',
  },
};

// ─── Common UI strings ──────────────────────────────────────────────
export const UI = {
  FR: {
    loading: 'Chargement…',
    skipToContent: 'Aller au contenu',
    languageToggle: 'EN',
    menu: 'Menu',
    close: 'Fermer',
    learnMore: 'En savoir plus',
    backHome: 'Retour à l\'accueil',
    notFoundTitle: 'Page introuvable',
    notFoundLead: 'Cette page n\'existe pas — ou plus.',
    signIn: 'Se connecter',
    cart: 'Panier',
    play: 'Lire',
    pause: 'Pause',
  },
  EN: {
    loading: 'Loading…',
    skipToContent: 'Skip to content',
    languageToggle: 'FR',
    menu: 'Menu',
    close: 'Close',
    learnMore: 'Learn more',
    backHome: 'Back to home',
    notFoundTitle: 'Page not found',
    notFoundLead: 'This page does not exist — or no longer does.',
    signIn: 'Sign in',
    cart: 'Cart',
    play: 'Play',
    pause: 'Pause',
  },
};
