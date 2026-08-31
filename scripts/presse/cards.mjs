// ─── Le texte des six cartes du kit de presse ───────────────────────
// Une accroche de 3 à 7 mots, deux lignes maximum au rendu (le gabarit
// rétrécit la police tant que ça dépasse), puis une ou deux phrases.
// Les faits viennent de src/content.ts (SITE, HOME, PILLAR_COPY) et de
// src/content/activitesDuCode.ts. Rien n'est inventé ici.
//
// `side` dit de quel côté se pose le bandeau de verre : il se range
// toujours là où la photo est la plus calme, pour ne rien voiler
// d'important.
export const CARDS = [
  {
    n: '01', key: 'festival', photo: '01', side: 'left',
    fr: {
      kicker: 'Le festival',
      hook: 'Trois jours sur les routes du temps',
      body: 'Le Festival Médiéval de Montpellier plante ses caravanes au 4 rue du Bosquet, dans la Petite-Nation, en Outaouais.',
      meta: '25 · 26 · 27 septembre 2026 · Montpellier, Québec',
    },
    en: {
      kicker: 'The festival',
      hook: 'Three days on the roads of time',
      body: 'The Festival Médiéval de Montpellier pitches its caravans at 4 rue du Bosquet, in the Petite-Nation region of Outaouais, Quebec.',
      meta: 'September 25-27, 2026 · Montpellier, Quebec',
    },
  },
  {
    n: '02', key: 'billets', photo: '07', side: 'left',
    fr: {
      kicker: 'Billets',
      hook: 'Les billets se prennent en ligne',
      body: 'La passe journée va à 27 $ et la passe trois jours à 65 $. Le banquet médiéval s’annonce sous peu.',
      meta: 'Billetterie Zeffy · festivalmedieval.org',
    },
    en: {
      kicker: 'Tickets',
      hook: 'Tickets are sold online',
      body: 'A day pass costs $27 and the three-day pass $65. The medieval banquet will be announced shortly.',
      meta: 'Zeffy ticketing · festivalmedieval.org',
    },
  },
  {
    n: '03', key: 'combats', photo: '04', side: 'left',
    fr: {
      kicker: 'Combats et joutes',
      hook: 'L’arène ne désemplit pas',
      body: 'Escrime artistique, duels en armure complète, combats vikings et joutes équestres à la lance se succèdent du vendredi au dimanche.',
      meta: 'Arène · du 25 au 27 septembre 2026',
    },
    en: {
      kicker: 'Combat and jousts',
      hook: 'The arena never empties',
      body: 'Artistic fencing, full-armour duels, Viking combat and mounted jousting with the lance follow one another from Friday to Sunday.',
      meta: 'Arena · September 25 to 27, 2026',
    },
  },
  {
    n: '04', key: 'marche', photo: '02', side: 'right',
    fr: {
      kicker: 'Marché et démonstrations',
      hook: 'Le marché des artisans et la forge',
      body: 'Forgerons, costumiers, bijoutiers et herboristes tiennent boutique pendant que les démonstrateurs travaillent le fer et le bois devant vous.',
      meta: 'Marché médiéval · trois jours',
    },
    en: {
      kicker: 'Market and demos',
      hook: 'The artisans’ market and the forge',
      body: 'Smiths, costumers, jewellers and herbalists keep shop while the demonstrators work iron and wood in front of you.',
      meta: 'Medieval market · three days',
    },
  },
  {
    n: '05', key: 'musique', photo: '08', side: 'left',
    fr: {
      kicker: 'Musique et spectacles',
      hook: 'Du tambour viking aux ballades',
      body: 'Skarazula, L’Harfang, la Troupe Caravane, BicOasis, Trifolys et Svarica montent sur scène pendant les trois jours du festival.',
      meta: 'Scènes · du 25 au 27 septembre 2026',
    },
    en: {
      kicker: 'Music and shows',
      hook: 'From Viking drums to ballads',
      body: 'Skarazula, L’Harfang, Troupe Caravane, BicOasis, Trifolys and Svarica take the stage across the festival’s three days.',
      meta: 'Stages · September 25 to 27, 2026',
    },
  },
  {
    n: '06', key: 'banquet', photo: '05', side: 'right',
    fr: {
      kicker: 'Banquet, jeunesse, camping',
      hook: 'Le banquet se sert à la torche',
      body: 'L’hypocras coule au souper, le village jeunesse ouvre son combat de mousse, et vous plantez la tente sur le site même.',
      meta: 'Banquet · village jeunesse · camping',
    },
    en: {
      kicker: 'Banquet, youth, camping',
      hook: 'The banquet is served by torchlight',
      body: 'Hypocras flows at supper, the youth village opens its foam combat, and you pitch your tent on the grounds themselves.',
      meta: 'Banquet · youth village · camping',
    },
  },
];
