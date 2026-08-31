// ─── Le texte des douze cartes du kit de presse ─────────────────────
// Une accroche de 3 à 7 mots, deux lignes maximum au rendu (le gabarit
// rétrécit la police tant que ça dépasse), puis une ou deux phrases.
//
// 🚨 Les faits viennent tous de src/content.ts (SITE, HOME,
// PILLAR_COPY) et de src/content/activitesDuCode.ts. Rien n'est
// inventé ici. Une version précédente annonçait « une cinquantaine
// d'étals » et un « bal autour du feu » : les deux ont été retirés.
//
// `side` dit de quel côté se pose le bandeau de verre : il se range
// toujours là où la photo est la plus calme, pour ne rien voiler
// d'important. Son dégradé s'éteint sur près de quarante pour cent de
// la largeur, en courbe douce, pour qu'aucune arête verticale ne se
// devine dans le ciel.
//
// `qr` porte le chemin de la page visée, en français et en anglais.
// Le script y accole https://www.festivalmedievaldemontpellier.org.

export const CARDS = [
  {
    n: '01', key: 'festival', orig: '2025-IMG_4534', focus: 0.5, side: 'right',
    qr: { fr: '/', en: '/en' },
    fr: {
      kicker: 'Le festival',
      hook: 'Trois jours sur les routes du temps',
      body: 'Le Festival Médiéval de Montpellier dresse son village au 4 rue du Bosquet, dans la Petite-Nation, en Outaouais. Les portes ouvrent le vendredi à 17 h.',
      meta: '25 · 26 · 27 septembre 2026 · Montpellier, Québec',
    },
    en: {
      kicker: 'The festival',
      hook: 'Three days on the roads of time',
      body: 'The Festival Médiéval de Montpellier raises its village at 4 rue du Bosquet, in the Petite-Nation region of Outaouais, Quebec. Gates open Friday at 5 p.m.',
      meta: 'September 25 · 26 · 27, 2026 · Montpellier, Quebec',
    },
  },
  {
    n: '02', key: 'billets', orig: '2025-IMG_6039', focus: 0.5, side: 'left',
    qr: { fr: '/billets', en: '/en/tickets' },
    fr: {
      kicker: 'Billets',
      hook: 'Vos billets se prennent en ligne',
      body: 'La passe journée va à 27 $ et la passe trois jours à 65 $, bracelet officiel compris. Le banquet médiéval s’annonce sous peu.',
      meta: 'Billetterie Zeffy · festivalmedievaldemontpellier.org',
    },
    en: {
      kicker: 'Tickets',
      hook: 'Tickets are taken online',
      body: 'A day pass runs $27 and the three-day pass $65, official wristband included. The medieval banquet will be announced shortly.',
      meta: 'Zeffy ticketing · festivalmedievaldemontpellier.org',
    },
  },
  {
    n: '03', key: 'chevaliers', orig: '2025-IMG_5743', focus: 0.40, side: 'right',
    qr: { fr: '/activites', en: '/en/activities' },
    fr: {
      kicker: 'Chevaliers',
      hook: 'Les chevaliers entrent dans la lice',
      body: 'Joutes équestres à la lance et à l’épée, avec l’Association Médiévale du Québec : la Joute AMQ, le Jeu du peuple et la finale du dimanche.',
      meta: 'Arène · du 25 au 27 septembre 2026',
    },
    en: {
      kicker: 'Knights',
      hook: 'The knights enter the lists',
      body: 'Mounted jousting with lance and sword, with the Association Médiévale du Québec: the AMQ Joust, the People’s Game and Sunday’s final.',
      meta: 'Arena · September 25 to 27, 2026',
    },
  },
  {
    n: '04', key: 'escrime', orig: '2024-IMG_4818', focus: 0.5, side: 'right',
    qr: { fr: '/activites', en: '/en/activities' },
    fr: {
      kicker: 'Escrime et combats',
      hook: 'L’épée longue et l’armure complète',
      body: 'L’escrime artistique se donne sous l’œil du Chevalier Vert : duels en armure complète, épée longue, combat libre. Les combats vikings occupent l’arène le reste du temps.',
      meta: 'Arène · trois jours',
    },
    en: {
      kicker: 'Fencing and combat',
      hook: 'Longsword and full armour',
      body: 'Artistic fencing runs under the Green Knight’s watch: full-armour duels, longsword, free combat. Viking combat holds the arena the rest of the time.',
      meta: 'Arena · three days',
    },
  },
  {
    n: '05', key: 'forge', orig: '2024-IMG_4531', focus: 0.32, side: 'right',
    qr: { fr: '/activites', en: '/en/activities' },
    fr: {
      kicker: 'La forge',
      hook: 'Le fer se travaille devant vous',
      body: 'Forge, fonderie, gravure sur os, planage de bois ancestral. Les artisans-démonstrateurs travaillent sous vos yeux et expliquent chaque geste.',
      meta: 'Village paysan · démonstrations',
    },
    en: {
      kicker: 'The forge',
      hook: 'Iron worked before your eyes',
      body: 'Forge, foundry, bone engraving, ancestral wood planing. The demonstrator-artisans work in front of you and explain every gesture.',
      meta: 'Peasant village · demonstrations',
    },
  },
  {
    n: '06', key: 'tissage', orig: '2025-IMG_8043', focus: 0.48, side: 'right',
    qr: { fr: '/histoire', en: '/en/history' },
    fr: {
      kicker: 'Tissage et herboristerie',
      hook: 'Les sorcières ouvrent leurs grimoires',
      body: 'Herboristerie, tissage, cuisine ancestrale, sortilèges domestiques. Entre racines, fils et chaudron, les artisanes partagent des savoirs presque oubliés.',
      meta: 'Ateliers · toute la fin de semaine',
    },
    en: {
      kicker: 'Weaving and herbalism',
      hook: 'The witches open their grimoires',
      body: 'Herbalism, weaving, ancestral cooking, household spellwork. Between roots, threads and cauldron, the craftswomen share knowledge that is almost forgotten.',
      meta: 'Workshops · all weekend long',
    },
  },
  {
    n: '07', key: 'marche', orig: '2024-IMG_4547', focus: 0.5, side: 'left',
    qr: { fr: '/marche', en: '/en/market' },
    fr: {
      kicker: 'Le marché',
      hook: 'Artisans et marchands d’époque',
      body: 'Forgerons, costumiers, bijoutiers, brasseurs et herboristes tiennent boutique pendant les trois jours, à côté de la boutique officielle du festival.',
      meta: 'Marché médiéval · trois jours',
    },
    en: {
      kicker: 'The market',
      hook: 'Period artisans and merchants',
      body: 'Smiths, costumers, jewellers, brewers and herbalists keep shop for all three days, next to the festival’s official shop.',
      meta: 'Medieval market · three days',
    },
  },
  {
    n: '08', key: 'musique', orig: '2025-IMG_6101-2', focus: 0.46, side: 'left',
    qr: { fr: '/activites', en: '/en/activities' },
    fr: {
      kicker: 'Musique et spectacles',
      hook: 'Du tambour viking aux ballades',
      body: 'Skarazula, L’Harfang, la Troupe Caravane, BicOasis, Trifolys et Svarica montent sur scène, avec les conteurs et les troupes itinérantes.',
      meta: 'Scènes · du 25 au 27 septembre 2026',
    },
    en: {
      kicker: 'Music and shows',
      hook: 'From Viking drums to ballads',
      body: 'Skarazula, L’Harfang, Troupe Caravane, BicOasis, Trifolys and Svarica take the stage, alongside storytellers and travelling troupes.',
      meta: 'Stages · September 25 to 27, 2026',
    },
  },
  {
    n: '09', key: 'banquet', orig: '2025-IMG_8571', focus: 0.45, side: 'left',
    qr: { fr: '/nourriture', en: '/en/food' },
    fr: {
      kicker: 'Le banquet',
      hook: 'Le souper se sert à la torche',
      body: 'Le banquet médiéval, l’hypocras de l’aubergiste, l’animation pendant le repas. Autour, le village gustatif ouvre ses cuisines de clans et sa table d’hôte.',
      meta: 'Banquet médiéval · prix à venir',
    },
    en: {
      kicker: 'The banquet',
      hook: 'Supper served by torchlight',
      body: 'The medieval banquet, the innkeeper’s hypocras, live entertainment at table. Around it, the food village opens its clan kitchens and its table d’hôte.',
      meta: 'Medieval banquet · price to be announced',
    },
  },
  {
    n: '10', key: 'jeunesse', orig: '2024-IMG_5480', focus: 0.5, side: 'right',
    qr: { fr: '/activites', en: '/en/activities' },
    fr: {
      kicker: 'Village jeunesse',
      hook: 'Un campement pour les jeunes seigneurs',
      body: 'Ateliers d’écuyer, jeux d’adresse, contes et initiation au combat de mousse. Le gardiennage y est encadré, les parents peuvent aller voir la joute.',
      meta: 'Village jeunesse · trois jours',
    },
    en: {
      kicker: 'Youth village',
      hook: 'A camp for young lords',
      body: 'Squire workshops, skill games, tales and a foam-combat introduction. Babysitting is supervised, so parents can go watch the joust.',
      meta: 'Youth village · three days',
    },
  },
  {
    n: '11', key: 'camping', orig: '2025-IMG_4533', focus: 0.5, side: 'left',
    qr: { fr: '/hebergement', en: '/en/lodging' },
    fr: {
      kicker: 'Camping',
      hook: 'Plantez la tente sur le site',
      body: 'Votre tente ou votre roulotte se posent sur le terrain du festival. Autour, les hébergements partenaires de la Petite-Nation prennent le relais.',
      meta: 'Camping sur place · Petite-Nation',
    },
    en: {
      kicker: 'Camping',
      hook: 'Pitch your tent on the grounds',
      body: 'Your tent or your camper goes up on the festival grounds. Around them, the partner lodgings of Petite-Nation take over.',
      meta: 'On-site camping · Petite-Nation',
    },
  },
  {
    n: '12', key: 'mariages', orig: '2025-IMG_6118', focus: 0.5, side: 'left',
    qr: { fr: '/mariages', en: '/en/weddings' },
    fr: {
      kicker: 'Mariages et groupes',
      hook: 'Se marier au milieu des festivités',
      body: 'Un mariage a été célébré sur le site en 2022, et le festival accueille les suivants sur réservation. Les groupes scolaires, communautaires et corporatifs ont leurs tarifs.',
      meta: 'Mariages sur réservation · groupes',
    },
    en: {
      kicker: 'Weddings and groups',
      hook: 'A wedding amid the festivities',
      body: 'A wedding was held on the grounds in 2022, and the festival welcomes the next ones by reservation. School, community and corporate groups have their own rates.',
      meta: 'Weddings by reservation · groups',
    },
  },
];
