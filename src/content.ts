// ─── Festival Médiéval de Montpellier: content map ──────────────
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
  datesLabel: { FR: '25 · 26 · 27 septembre 2026', EN: 'September 25 · 26 · 27, 2026' },
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
  operatorUrl: 'https://www.lesalondesinconnus.com',
  logo: '/fmm-logo-embossed-silver.png',
  logoWhite: '/fmm-logo-embossed-silver.webp',
};

// Slugs match the live Wix site, normalized to ASCII (no diacritics).
export type PillarKey =
  | 'marche' | 'activites' | 'nourriture' | 'jeunesse' | 'musique'
  | 'chevaux' | 'apprendre' | 'hebergement' | 'partenaires'
  | 'benevole' | 'histoire' | 'mariages' | 'groupes' | 'petite-monnaie'
  | 'jeux' | 'boissons';

export interface Pillar {
  key: PillarKey;
  slug: { FR: string; EN: string };
  label: { FR: string; EN: string };
  short: { FR: string; EN: string };
}

// Édition 2026 "Caravanes & Saltimbanques": top-level pillars consolidated
// into merged pages. Programmation (= activités + musique + jeunesse),
// Histoire & Apprendre (= histoire + apprendre), Mariages & Groupes
// (= mariages + groupes). Chevaux removed. Commanditaires & Partenaires
// absorbs Petite Monnaie depuis le 2026-08-27 (une seule vitrine, demande
// d'Alex) : les deux se lisent l'une après l'autre sur /partenaires.
// Marché et Nourriture, fusionnés un temps dans « Le Village », sont
// redevenus deux piliers distincts le même jour (Alex : « on redéplace la
// nourriture à l'extérieur »), et Boissons est un tout nouveau pilier,
// placé juste après Nourriture, menu à venir.
// Primary slugs kept so existing links/SEO survive; absorbed slugs redirect
// (see App.tsx). The absorbed keys still exist in PillarKey + PILLAR_COPY and
// are rendered as chapters inside the merged page components.
export const PILLARS: Pillar[] = [
  { key: 'activites',   slug: { FR: '/activites',    EN: '/en/activities' }, label: { FR: 'Programmation',               EN: 'Program' },                 short: { FR: 'Programmation', EN: 'Program' } },
  { key: 'marche',      slug: { FR: '/marche',       EN: '/en/market' },     label: { FR: 'Marché',                      EN: 'Market' },                  short: { FR: 'Marché',       EN: 'Market' } },
  { key: 'nourriture',  slug: { FR: '/nourriture',   EN: '/en/food' },       label: { FR: 'Nourriture et boissons',      EN: 'Food and drinks' },         short: { FR: 'Nourriture et boissons', EN: 'Food and drinks' } },
  { key: 'histoire',    slug: { FR: '/histoire',     EN: '/en/history' },    label: { FR: 'Histoire & Apprendre',        EN: 'History & Learning' },      short: { FR: 'Histoire et apprendre', EN: 'History & Learning' } },
  { key: 'mariages',    slug: { FR: '/mariages',     EN: '/en/weddings' },   label: { FR: 'Mariages & Groupes',          EN: 'Weddings & Groups' },       short: { FR: 'Mariages & Groupes', EN: 'Weddings & Groups' } },
  { key: 'hebergement', slug: { FR: '/hebergement',  EN: '/en/lodging' },    label: { FR: 'Camping & Hébergement',       EN: 'Camping & Lodging' },       short: { FR: 'Camping & Hébergement', EN: 'Camping & Lodging' } },
  { key: 'partenaires', slug: { FR: '/partenaires',  EN: '/en/partners' },   label: { FR: 'Commanditaires & Partenaires', EN: 'Sponsors & Partners' },    short: { FR: 'Commanditaires', EN: 'Sponsors' } },
  { key: 'benevole',    slug: { FR: '/benevole',     EN: '/en/volunteer' },  label: { FR: 'Devenir Bénévole',            EN: 'Become a Volunteer' },      short: { FR: 'Devenir bénévole', EN: 'Become a volunteer' } },
  // Jeux médiévaux jouables en ligne, sortis de la section Jeunesse
  // (demande d'Alex, 2026-08-20) pour vivre dans leur propre onglet.
  { key: 'jeux', slug: { FR: '/jeux-en-ligne', EN: '/en/online-games' }, label: { FR: 'Jeux en ligne', EN: 'Online Games' }, short: { FR: 'Jeux en ligne', EN: 'Online games' } },
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
  hebergement: { FR: { eyebrow: 'Sur place et alentours', title: 'Camping & Hébergement', lead: 'Plantez votre tente ou votre roulotte sur le site du festival, ou découvrez nos hébergements partenaires dans la Petite-Nation.' }, EN: { eyebrow: 'On site and nearby',  title: 'Camping & Lodging',     lead: 'Pitch your tent or park your camper on the festival grounds, or discover our partner lodgings in Petite-Nation.' } },
  partenaires: { FR: { eyebrow: 'Avec nous',            title: 'Nos Partenaires',       lead: 'Un grand merci à nos partenaires publics, privés et communautaires.' }, EN: { eyebrow: 'With us',             title: 'Our Partners',          lead: 'Heartfelt thanks to our public, private and community partners.' } },
  benevole:    { FR: { eyebrow: 'Le cœur du festival',  title: 'Devenir Bénévole',      lead: 'Le FMM est opéré par une équipe de bénévoles. Joignez-vous à nous.' }, EN: { eyebrow: 'The heart of the festival', title: 'Become a Volunteer', lead: 'FMM runs on volunteer power. Join us.' } },
  histoire:    { FR: { eyebrow: 'Notre histoire',       title: '6 Ans d\'histoire',     lead: 'Six éditions ont fait passer des milliers de visiteurs, et il en reste des centaines de photos.' }, EN: { eyebrow: 'Our story',           title: '6 Years of History',    lead: 'Six editions have brought thousands of visitors, and hundreds of photos remain to show for it.' } },
  mariages:    { FR: { eyebrow: 'Cérémonie d\'époque',  title: 'Mariages',              lead: 'Le site du FMM accueille mariages médiévaux et celtiques sur réservation.' }, EN: { eyebrow: 'Period ceremony',     title: 'Weddings',              lead: 'The FMM site hosts medieval and Celtic weddings by reservation.' } },
  groupes:     { FR: { eyebrow: 'Sortie de groupe',     title: 'Groupes',               lead: 'Tarifs spéciaux pour les groupes scolaires, communautaires et corporatifs.' }, EN: { eyebrow: 'Group outing',        title: 'Groups',                lead: 'Special rates for school, community and corporate groups.' } },
  'petite-monnaie': { FR: { eyebrow: 'La monnaie du festival', title: 'Petite Monnaie', lead: 'Le réseau cellulaire est capricieux sur le site : passez au kiosque à l\'entrée, repartez avec votre Petite Monnaie et payez partout au festival.' }, EN: { eyebrow: 'The festival currency', title: 'Petite Monnaie', lead: 'Cell coverage is spotty on site: stop at the entrance kiosk, pick up your Petite Monnaie and pay everywhere at the festival.' } },
  jeux: { FR: { eyebrow: 'La table de jeux', title: 'Jeux en ligne', lead: 'Les jeux médiévaux du festival, jouables en ligne toute l\'année, sur mobile comme au bureau.' }, EN: { eyebrow: 'The games table', title: 'Online Games', lead: 'The festival\'s medieval games, playable online all year round, on mobile and desktop.' } },
  boissons: { FR: { eyebrow: 'Au comptoir', title: 'Boissons', lead: 'Le menu des boissons du festival se prépare et sera dévoilé bientôt.' }, EN: { eyebrow: 'At the bar', title: 'Drinks', lead: 'The festival\'s drinks menu is coming together and will be revealed soon.' } },
};

// ─── Home (real homepage, replaces Wix `/festival-medieval-de-montpellier`)
export const HOME = {
  FR: {
    hero: {
      eyebrow: 'Caravanes & Saltimbanques · Édition 2026',
      title: 'FMM 2026',
      dates: '25 · 26 · 27 septembre 2026',
      subtitle: 'Trois jours sur les routes du temps. Les caravanes et les saltimbanques s\'installent dans le village de Montpellier, Québec, avec le tarot, les tambours et les clans nordiques.',
      primaryCta: 'Acheter mes billets',
      secondaryCta: 'Découvrir le festival',
    },
    tickets: {
      eyebrow: 'Billetterie',
      title: 'Trois façons de festoyer',
      lead: 'Choisissez votre formule. Tous les billets se procurent en ligne via Zeffy.',
      cta: 'Acheter sur Zeffy',
      tiers: [
        { name: 'Adulte, une journée', price: '35 $',  perks: ['Enfant 20 $ · famille 90 $', 'Marché et démonstrations',     'Spectacles et tournois'] },
        { name: 'Adulte, trois jours', price: '55 $',  perks: ['Enfant 25 $ · famille 125 $', 'Du vendredi au dimanche',      'Bracelet officiel FMM'] },
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
      lead: 'Marché, banquet, scène musicale, manège équestre et village jeunesse, tous reliés par les sentiers de Montpellier.',
      download: 'Télécharger la carte',
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
      dates: 'September 25 · 26 · 27, 2026',
      subtitle: 'Three days on the roads of time. Caravans and travelling players settle into the village of Montpellier, Quebec, with tarot, drums and the Nordic clans.',
      primaryCta: 'Get my tickets',
      secondaryCta: 'Discover the festival',
    },
    tickets: {
      eyebrow: 'Ticketing',
      title: 'Three ways to feast',
      lead: 'Pick your pass. All tickets sold online via Zeffy.',
      cta: 'Buy on Zeffy',
      tiers: [
        { name: 'Adult, one day',   price: '$35',  perks: ['Child $20 · family $90',   'Market and demos',             'Shows and tournaments'] },
        { name: 'Adult, three days', price: '$55', perks: ['Child $25 · family $125',  'Friday to Sunday',             'Official FMM wristband'] },
        { name: 'Medieval Banquet', price: 'TBA', perks: ['Torchlit dinner',       'The innkeeper\'s hypocras',    'Live entertainment at table'] },
      ],
    },
    plank: { title: 'Tickets', lead: 'Get your tickets now.', cta: 'Buy' },
    map: {
      eyebrow: 'Site plan',
      title: 'The village stretches through the woods',
      lead: 'Market, banquet, music stage, equestrian ring and youth village, all linked by the Montpellier trails.',
      download: 'Download the map',
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
export const SPONSORS = [
  { src: '/sponsors/journal-les-2-vallees.png', name: 'Journal Les 2 Vallées' },
  { src: '/sponsors/info-petite-nation.png', name: 'L’Info Petite Nation' },
  { src: '/sponsors/info-de-la-vallee.png', name: 'L’Info de la Vallée' },
  { src: '/sponsors/radio-canada-ohdio.png', name: 'Radio-Canada OHdio' },
  { src: '/sponsors/le-droit.png', name: 'Le Droit' },
  { src: '/sponsors/radio-canada-tele.png', name: 'ICI Télé' },
];

// ─── Footer ─────────────────────────────────────────────────────────
export const FOOTER = {
  FR: {
    aboutTitle: 'Festival Médiéval de Montpellier',
    aboutBody: 'Le FMM est porté par une équipe de bénévoles et soutenu par les membres du Conseil. Trois jours de festival dans le village de Montpellier, Québec.',
    contactTitle: 'Contact',
    quickTitle: 'Menu Rapide',
    resourcesTitle: 'Ressources',
    // ── Infolettre du pied de page ──────────────────────────────
    // Alex, 2026-08-24 : l'inscription ouvre aussi le compte. La copie
    // doit donc dire les deux choses, sans faire peur à celle qui ne
    // voulait que les nouvelles.
    newsletterEyebrow: 'Infolettre',
    newsletterTitle: 'Restez à la cour',
    newsletterBody: 'Recevez la programmation et les nouvelles du festival. La même adresse vous ouvre un compte au registre de l\'Ordre, par un lien que nous vous envoyons tout de suite.',
    newsletterLabel: 'Votre adresse de courriel',
    newsletterPlaceholder: 'votre@courriel.ca',
    newsletterCta: 'M\'inscrire',
    newsletterBusy: 'Un instant…',
    newsletterConsent: 'Vous recevrez nos lettres jusqu\'à ce que vous nous disiez d\'arrêter, et chacune porte un lien pour vous retirer.',
    newsletterLinkSent: 'Un lien de connexion vient de partir vers votre boîte. Il ouvre votre compte et vous connecte du même geste.',
    newsletterDone: 'C\'est fait, votre adresse est inscrite. Nos prochaines lettres vous trouveront là.',
    newsletterAccountAside: 'Il reste à ouvrir votre compte, et cela se fait par la fenêtre de connexion.',
    newsletterAccountCta: 'Ouvrir mon compte',
    newsletterErrAddress: 'Cette adresse ne semble pas valide. Vérifiez-la et reprenez.',
    newsletterErrTooMany: 'Vous avez essayé plusieurs fois de suite. Laissez passer quelques minutes.',
    newsletterErrNetwork: 'Votre inscription n\'a pas abouti. Reprenez dans un moment.',
    rights: '© 2026 Festival Médiéval de Montpellier',
    privacy: 'Politique de confidentialité',
    sponsorsTitle: 'Ils en parlent',
  },
  EN: {
    aboutTitle: 'Festival Médiéval de Montpellier',
    aboutBody: 'FMM is carried by a volunteer team and supported by the festival Council. Three days of festival in the village of Montpellier, Quebec.',
    contactTitle: 'Contact',
    quickTitle: 'Quick links',
    resourcesTitle: 'Resources',
    newsletterEyebrow: 'Newsletter',
    newsletterTitle: 'Stay at court',
    newsletterBody: 'Get the festival programme and the news as it comes. The same address also opens your account in the Order\'s roll, through a link we send you right away.',
    newsletterLabel: 'Your email address',
    newsletterPlaceholder: 'your@email.com',
    newsletterCta: 'Sign me up',
    newsletterBusy: 'One moment…',
    newsletterConsent: 'You will receive our letters until you tell us to stop, and every one of them carries a link to take yourself off the list.',
    newsletterLinkSent: 'A sign-in link is on its way to your inbox. It opens your account and signs you in with the same click.',
    newsletterDone: 'Done, your address is on the list. Our next letters will find you there.',
    newsletterAccountAside: 'Your account still needs opening, and that happens in the sign-in window.',
    newsletterAccountCta: 'Open my account',
    newsletterErrAddress: 'That address does not look right. Check it and try again.',
    newsletterErrTooMany: 'You have tried several times in a row. Give it a few minutes.',
    newsletterErrNetwork: 'Your sign-up did not go through. Try again in a moment.',
    rights: '© 2026 Festival Médiéval de Montpellier',
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
    notFoundLead: 'Cette page n\'existe pas, ou plus.',
    signIn: 'Se connecter',
    cart: 'Ma bourse de Montpellois',
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
    notFoundLead: 'This page does not exist, or no longer does.',
    signIn: 'Sign in',
    cart: 'My Montpellois purse',
    play: 'Play',
    pause: 'Pause',
  },
};
