// ─── Le texte des cartes du kit de presse ───────────────────────────
// Une accroche de 3 à 7 mots, deux lignes maximum au rendu (le gabarit
// rétrécit la police tant que ça dépasse), puis une ou deux phrases.
//
// 🚨 Les faits viennent tous de src/content.ts (SITE, HOME,
// PILLAR_COPY), de src/content/activitesDuCode.ts et des pages du site
// (NourriturePage, JeunessePage, ApprendrePage, OrdrePage,
// BoutiquePage, JeuxEnLignePage). Rien n'est inventé ici. Une version
// précédente annonçait « une cinquantaine d'étals » et un « bal autour
// du feu » : les deux ont été retirés.
//
// Corrections d'Alex du 2026-08-31 :
//   · 04 escrime : plus de Chevalier Vert, plus d'épée longue. Ce sont
//     les troupes vikings, dont la Troupe Hullsborg, et les combats ne
//     sont pas scriptés.
//   · 05 forge : forger et fondre, rien d'autre.
//   · 06 tissage : la völva du site remplace la fileuse.
//   · 09 banquet : le vrai prix (65 $ plus taxes) et le feu de bois.
//   · 10 jeunesse : une photo du village jeunesse, animé par Les Camps
//     Légendaires.
//   · 13 Tresse et Tisse : la nouvelle carte, photo d'Alex T.
//     St-Laurent.
//
// `side` dit de quel côté se pose le bandeau de verre : il se range
// toujours là où la photo est la plus calme, pour ne rien voiler
// d'important. Son dégradé s'éteint sur près de quarante pour cent de
// la largeur, en courbe douce, pour qu'aucune arête verticale ne se
// devine dans le ciel.
//
// `qr` porte le chemin de la page visée, en français et en anglais. Le
// script y accole le domaine court, festivalmedieval.org, qui redirige
// en 301 vers le long en gardant le chemin.
//
// `src` dit d'où vient l'image :
//   { lena: 'AAAA-IMG_NNNN', focus }  un original de Léna, recadré 16:9
//   { fichier: 'public/...', focus }  un fichier du dépôt
//   { capture: 'nom' }                une capture de scripts/presse/captures/
//   { badges: n }                     un champ des n premiers badges du
//                                     site, posé sur le fond de nuit

/** La signature qui se pose en bas à gauche des visuels de Léna. */
export const CREDIT_LENA = 'Léna LeBozec, photographe';
export const CREDIT_ALEX = 'Alex T. St-Laurent, photographe';

// ─── Le festival sur place ──────────────────────────────────────────
export const CARTES_SITE = [
  {
    n: '01', key: 'festival', src: { lena: '2025-IMG_4534', focus: 0.5 }, side: 'right',
    credit: CREDIT_LENA,
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
    n: '02', key: 'billets', src: { lena: '2025-IMG_6045', focus: 0.5 }, side: 'left',
    credit: CREDIT_LENA,
    qr: { fr: '/billets', en: '/en/tickets' },
    fr: {
      kicker: 'Billets',
      hook: 'Vos billets se prennent en ligne',
      body: 'Une journée : 20 $ pour un enfant, 35 $ pour un adulte, 90 $ pour une famille de quatre. Les trois jours : 25 $, 55 $ et 125 $. Le banquet médiéval se réserve à part, à 65 $ plus taxes.',
      meta: 'Billetterie Zeffy · de 20 $ à 125 $',
    },
    en: {
      kicker: 'Tickets',
      hook: 'Tickets are taken online',
      body: 'One day: $20 per child, $35 per adult, $90 for a family of four. All three days: $25, $55 and $125. The medieval banquet is booked separately, at $65 plus tax.',
      meta: 'Zeffy ticketing · from $20 to $125',
    },
  },
  {
    n: '03', key: 'chevaliers', src: { lena: '2025-IMG_5743', focus: 0.45 }, side: 'right',
    credit: CREDIT_LENA,
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
    n: '04', key: 'escrime', src: { lena: '2024-IMG_4818', focus: 0.5 }, side: 'right',
    credit: CREDIT_LENA,
    qr: { fr: '/activites', en: '/en/activities' },
    fr: {
      kicker: 'Escrime et combats',
      hook: 'L’arène appartient aux troupes vikings',
      body: 'Plusieurs troupes vikings, dont la Troupe Hullsborg, s’affrontent dans l’arène en reconstitution. Les combats ne sont pas scriptés, et l’issue se décide devant vous.',
      meta: 'Arène · trois jours',
    },
    en: {
      kicker: 'Fencing and combat',
      hook: 'The arena belongs to the Viking troupes',
      body: 'Several Viking troupes, Troupe Hullsborg among them, meet in the arena for reenactment. The fights are unscripted, and the outcome is settled in front of you.',
      meta: 'Arena · three days',
    },
  },
  {
    n: '05', key: 'forge', src: { lena: '2024-IMG_5538', focus: 0.5 }, side: 'right',
    credit: CREDIT_LENA,
    qr: { fr: '/activites', en: '/en/activities' },
    fr: {
      kicker: 'La forge',
      hook: 'Le fer se travaille devant vous',
      body: 'Les artisans démonstrateurs forgent et fondent le métal devant vous, en expliquant chaque geste hérité d’une époque où la matière se travaillait à la main.',
      meta: 'Village paysan · démonstrations',
    },
    en: {
      kicker: 'The forge',
      hook: 'Iron worked before your eyes',
      body: 'The demonstrator artisans forge and cast metal in front of you, explaining every gesture handed down from an age when matter was shaped by hand.',
      meta: 'Peasant village · demonstrations',
    },
  },
  {
    // La völva du site, celle que le festival montre partout. Le
    // fichier ne fait que 1280 × 720 et aucun original plein format
    // n'existe dans le dépôt : le gabarit l'agrandit en Lanczos ×1,5,
    // sans filtre. Auteur inconnu, donc pas de signature.
    n: '06', key: 'tissage', src: { fichier: 'public/photos/volva-v2.webp', focus: 0.5 }, side: 'right',
    credit: null,
    qr: { fr: '/histoire', en: '/en/history' },
    fr: {
      kicker: 'Artisans',
      hook: 'Les artisans à l’œuvre',
      body: 'Plusieurs artisans font des démonstrations d’année en année.',
      meta: 'Ateliers · toute la fin de semaine',
    },
    en: {
      kicker: 'Artisans',
      hook: 'Artisans at work',
      body: 'Several artisans give demonstrations year after year.',
      meta: 'Workshops · all weekend long',
    },
  },
  {
    n: '07', key: 'marche', src: { lena: '2024-IMG_4547', focus: 0.5 }, side: 'left',
    credit: CREDIT_LENA,
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
    n: '08', key: 'musique', src: { lena: '2025-IMG_6101-2', focus: 0.46 }, side: 'left',
    credit: CREDIT_LENA,
    qr: { fr: '/activites', en: '/en/activities' },
    fr: {
      kicker: 'Musique et spectacles',
      hook: 'Du tambour viking aux ballades',
      body: 'La scène reçoit Skarazula, L’Harfang, la Troupe Caravane, L’Ensemble Klezmer de Sainte-Nigoune, BicOasis, Trifolys, Svarica, Las Noches Bohemias et Alhambra, puis laisse la place aux conteurs et aux troupes itinérantes.',
      meta: 'Scènes · du 25 au 27 septembre 2026',
    },
    en: {
      kicker: 'Music and shows',
      hook: 'From Viking drums to ballads',
      body: 'The stage takes in Skarazula, L’Harfang, Troupe Caravane, L’Ensemble Klezmer de Sainte-Nigoune, BicOasis, Trifolys, Svarica, Las Noches Bohemias and Alhambra, then hands over to the storytellers and the travelling troupes.',
      meta: 'Stages · September 25 to 27, 2026',
    },
  },
  {
    n: '09', key: 'banquet', src: { lena: '2025-IMG_4508', focus: 0.5 }, side: 'right',
    credit: CREDIT_LENA,
    qr: { fr: '/nourriture', en: '/en/food' },
    fr: {
      kicker: 'Le banquet',
      hook: 'Le souper se sert à la torche',
      body: 'Nous sommes le seul festival médiéval à offrir une expérience culinaire immersive sur un feu de bois véritable. Le service se fait à la table et les bardes jouent entre les plats.',
      meta: 'Banquet médiéval · 65 $ plus taxes',
    },
    en: {
      kicker: 'The banquet',
      hook: 'Supper served by torchlight',
      body: 'We are the only medieval festival offering an immersive culinary experience over a true wood fire. Service comes to the table and the bards play between the courses.',
      meta: 'Medieval banquet · $65 plus tax',
    },
  },
  {
    // Une vraie photo du village jeunesse, tirée du matériel du site
    // (public/wix/jeunesse). Aucun visage d'enfant reconnaissable en
    // gros plan. Auteur non documenté, donc pas de signature.
    n: '10', key: 'jeunesse', src: { fichier: 'public/wix/jeunesse/56d4bd09.jpg', focus: 0.5 }, side: 'right',
    credit: null,
    qr: { fr: '/activites', en: '/en/activities' },
    fr: {
      kicker: 'Village jeunesse',
      hook: 'Un campement pour les jeunes seigneurs',
      body: 'Les Camps Légendaires tiennent l’animation du village jeunesse : maniement de l’épée, tir à l’arc, grands jeux en équipe et quêtes immersives. Leur mission éducative les porte depuis 2005.',
      meta: 'Village jeunesse · présenté par Les Camps Légendaires',
    },
    en: {
      kicker: 'Youth village',
      hook: 'A camp for young lords',
      body: 'Les Camps Légendaires run the youth village: swordsmanship, archery, large team games and immersive quests. Their educational mission has carried them since 2005.',
      meta: 'Youth village · presented by Les Camps Légendaires',
    },
  },
  {
    n: '11', key: 'camping', src: { lena: '2025-IMG_4533', focus: 0.5 }, side: 'left',
    credit: CREDIT_LENA,
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
    n: '12', key: 'mariages', src: { lena: '2025-IMG_6118', focus: 0.5 }, side: 'left',
    credit: CREDIT_LENA,
    qr: { fr: '/mariages', en: '/en/weddings' },
    fr: {
      kicker: 'Mariages et groupes',
      hook: 'Se marier au milieu des festivités',
      body: 'Un mariage a été célébré sur le site en 2022, et le festival accueille les suivants sur réservation. Les groupes ont leurs propres tarifs, du milieu scolaire au corporatif.',
      meta: 'Mariages sur réservation · groupes',
    },
    en: {
      kicker: 'Weddings and groups',
      hook: 'A wedding amid the festivities',
      body: 'A wedding was held on the grounds in 2022, and the festival welcomes the next ones by reservation. Groups get their own rates, from schools to companies.',
      meta: 'Weddings by reservation · groups',
    },
  },
  {
    // La pancarte se lit sur la photo : « Tresse & Tisse ». Photo
    // d'Alex T. St-Laurent, archives du site.
    n: '13', key: 'tresse-et-tisse', src: { fichier: 'public/histoire/archives/alex/1_26_1_1_26_1.webp', focus: 0.5 }, side: 'right',
    credit: CREDIT_ALEX,
    qr: { fr: '/histoire', en: '/en/history' },
    fr: {
      kicker: 'Tresse et Tisse',
      hook: 'L’atelier des tresses et du tissage',
      body: 'La pancarte de Tresse et Tisse est peinte à la main, et tout ce qui se fait sous cet auvent l’est aussi. Le tissage compte parmi les ateliers ouverts toute la fin de semaine, à côté de la forge, de la calligraphie et de l’archerie.',
      meta: 'Ateliers · toute la fin de semaine',
    },
    en: {
      kicker: 'Tresse et Tisse',
      hook: 'The braiding and weaving stall',
      body: 'The Tresse et Tisse sign is hand-painted, and so is everything made under that awning. Weaving is one of the workshops open all weekend, alongside blacksmithing, calligraphy and archery.',
      meta: 'Workshops · all weekend long',
    },
  },
];

// ─── Le festival en ligne ───────────────────────────────────────────
// Ces quatre cartes ne portent aucune photo de Léna : leur image est
// une capture du site, prise par scripts/presse/capture-site.mjs sur le
// Vite local. Aucune signature de photographe, donc.
export const CARTES_LIGNE = [
  {
    n: '21', key: 'jeux', src: { capture: 'jeux' }, side: 'right', credit: null,
    qr: { fr: '/jeux-en-ligne', en: '/en/online-games' },
    fr: {
      kicker: 'Jeux en ligne',
      hook: 'La table de jeux ouverte toute l’année',
      body: 'Le hnefatafl, la mérelle, le renard et les oies, les dés du menteur et le tarot de Marseille se jouent sur le site, sur mobile comme au bureau. Chaque partie fait gagner des badges.',
      meta: 'Jeux médiévaux · toute l’année',
    },
    en: {
      kicker: 'Online games',
      hook: 'A games table open all year',
      body: 'Hnefatafl, nine men’s morris, fox and geese, liar’s dice and the Marseille tarot are all played on the site, on mobile and at the desk. Every round earns badges.',
      meta: 'Medieval games · all year round',
    },
  },
  {
    // Sans compte, /ordre ne montre qu'une invitation à se connecter.
    // La carte se bâtit donc sur les badges eux-mêmes, ceux que les
    // membres collectionnent, tirés de public/badges.
    n: '22', key: 'ordre', src: { badges: 40 }, side: 'right', credit: null,
    qr: { fr: '/ordre', en: '/en/order' },
    fr: {
      kicker: 'L’Ordre',
      hook: 'Le registre des membres du festival',
      body: 'Tous ceux qui ouvrent un compte au festival entrent au registre de l’Ordre. Vous cherchez quelqu’un par son nom, vous ouvrez sa fiche, vous l’ajoutez comme ami et vous le défiez quand vous voulez.',
      meta: 'Fiches de membres · badges à collectionner',
    },
    en: {
      kicker: 'The Order',
      hook: 'The festival’s roll of members',
      body: 'Everyone who opens a festival account joins the roll of the Order. You look someone up by name, open their card, add them as a friend and challenge them whenever you like.',
      meta: 'Member cards · badges to collect',
    },
  },
  {
    n: '23', key: 'montpellois', src: { capture: 'boutique' }, side: 'left', credit: null,
    qr: { fr: '/boutique', en: '/en/shop' },
    fr: {
      kicker: 'Le Montpellois',
      hook: 'La monnaie qui se gagne en explorant',
      body: 'Le Montpellois se gagne en explorant le festival sur le site, et il se dépense à la boutique de l’Ordre : des cosmétiques pour votre personnage, des habillages pour le site, et bientôt les albums des groupes.',
      meta: 'Boutique de l’Ordre · la monnaie du site',
    },
    en: {
      kicker: 'The Montpellois',
      hook: 'Currency earned by exploring',
      body: 'The Montpellois is earned while exploring the festival on the site, and it is spent at the shop of the Order: cosmetics for your character, skins for the site, and soon the bands’ albums.',
      meta: 'The Order’s shop · the site currency',
    },
  },
  {
    // Le bandeau se pose à gauche : la capture porte déjà ses grands
    // titres de ce côté, et deux blocs de titres se disputeraient l'œil.
    n: '24', key: 'apprendre', src: { capture: 'apprendre' }, side: 'left', credit: null,
    qr: { fr: '/histoire', en: '/en/history' },
    fr: {
      kicker: 'Apprendre',
      hook: 'Traverser les siècles depuis chez vous',
      body: 'L’éducation fait partie des missions du festival, parce qu’elle est la base de la promotion de la résilience. La section Apprendre instruit par les perspectives historiques et cherche à enrichir la culture générale.',
      meta: 'Histoire et Apprendre · en ligne',
    },
    en: {
      kicker: 'Learning',
      hook: 'Crossing the centuries from home',
      body: 'Education is one of the festival’s missions, because it is the ground on which resilience is built. The Learning section teaches through historical perspective and works to broaden general knowledge.',
      meta: 'History and Learning · online',
    },
  },
];

// ─── Cartes ajoutées le 2026-09-02 pour les publications de Léna ─────
// Une carte par section du site, dans le gabarit du kit. Les faits
// viennent de src/content.ts, des pages du site et du kit de presse.
export const CARTES_SECTIONS = [
  {
    n: '14', key: 'programmation', src: { lena: '2024-IMG_4828', focus: 0.45 }, side: 'right',
    credit: CREDIT_LENA,
    qr: { fr: '/activites', en: '/en/activities' },
    fr: {
      kicker: 'Programmation',
      hook: 'Tout ce qui se passe sur le site',
      body: 'La page des activités se parcourt comme un jeu de cartes, et chacune s’ouvre sur ce qui vous attend. Vous filtrez par le combat, les métiers, les spectacles, la ripaille ou les familles.',
      meta: 'Activités · 25 au 27 septembre 2026',
    },
    en: {
      kicker: 'Program',
      hook: 'Everything happening on the grounds',
      body: 'The activities page reads like a deck of cards, and each one opens on what awaits you. Filter by combat, crafts, shows, feasting or families.',
      meta: 'Activities · September 25 to 27, 2026',
    },
  },
  {
    n: '15', key: 'horaire', src: { lena: '2024-IMG_5330', focus: 0.45 }, side: 'left',
    credit: CREDIT_LENA,
    qr: { fr: '/horaire', en: '/en/activities' },
    fr: {
      kicker: 'Horaire',
      hook: 'L’horaire officiel des trois jours',
      body: 'Chaque activité est portée à l’horaire avec son heure et son lieu, de l’arène à la scène en passant par le village paysan. Les portes ouvrent le vendredi à 17 h.',
      meta: 'Horaire officiel · en ligne',
    },
    en: {
      kicker: 'Schedule',
      hook: 'The official three-day schedule',
      body: 'Every activity is listed with its time and its place, from the arena to the stage to the peasant village. Gates open Friday at 5 p.m.',
      meta: 'Official schedule · online',
    },
  },
  {
    n: '16', key: 'nourriture', src: { lena: '2024-IMG_4600', focus: 0.45 }, side: 'right',
    credit: CREDIT_LENA,
    qr: { fr: '/nourriture', en: '/en/food' },
    fr: {
      kicker: 'Nourriture et boissons',
      hook: 'Le village nourriture ouvre ses feux',
      body: 'Les cuisines d’époque servent tout le week-end, et l’abreuvoir verse l’hypocras, la cervoise, le vin chaud et le café turc. Le menu se dévoile sur le site à mesure qu’il se complète.',
      meta: 'Village nourriture · trois jours',
    },
    en: {
      kicker: 'Food and drinks',
      hook: 'The food village lights its fires',
      body: 'Period kitchens serve all weekend, and the tavern pours hypocras, ale, mulled wine and Turkish coffee. The menu is revealed on the site as it comes together.',
      meta: 'Food village · three days',
    },
  },
  {
    n: '17', key: 'benevoles', src: { lena: '2024-IMG_4693', focus: 0.45 }, side: 'left',
    credit: CREDIT_LENA,
    qr: { fr: '/benevole', en: '/en/volunteer' },
    fr: {
      kicker: 'Bénévoles',
      hook: 'Le festival tient debout grâce à vous',
      body: 'Le FMM est organisé par une équipe de bénévoles, et il manque des mains chaque année à l’accueil, au bar, au montage et au village jeunesse. Vous choisissez vos quarts et vos journées.',
      meta: 'Candidatures ouvertes · sur le site',
    },
    en: {
      kicker: 'Volunteers',
      hook: 'The festival stands on its volunteers',
      body: 'The FMM is run by a volunteer team, and every year hands are missing at the gate, the bar, the build and the youth village. You pick your shifts and your days.',
      meta: 'Applications open · on the site',
    },
  },
  {
    n: '18', key: 'histoire', src: { lena: '2025-IMG_5025', focus: 0.45 }, side: 'right',
    credit: CREDIT_LENA,
    qr: { fr: '/histoire', en: '/en/history' },
    fr: {
      kicker: 'Six ans d’histoire',
      hook: 'Six éditions gardées en archives',
      body: 'Fondé en 2022, le festival a traversé la pandémie et reçu trois mille cent personnes l’an dernier. La page Histoire garde les photos des six éditions et les films tournés sur place.',
      meta: 'Archives et films · en ligne',
    },
    en: {
      kicker: 'Six years of history',
      hook: 'Six editions kept in the archives',
      body: 'Founded in 2022, the festival came through the pandemic and welcomed three thousand one hundred people last year. The History page keeps the photos of all six editions and the films shot on site.',
      meta: 'Archives and films · online',
    },
  },
  {
    n: '19', key: 'theme', src: { lena: '2023-IMG_4341', focus: 0.45 }, side: 'left',
    credit: CREDIT_LENA,
    qr: { fr: '/histoire', en: '/en/history' },
    fr: {
      kicker: 'Le thème 2026',
      hook: 'Caravanes et Saltimbanques',
      body: 'Après les Vikings, la route continue. L’édition 2026 rend hommage aux peuples nomades, aux grandes salles de banquet et aux artistes itinérants qui ont donné naissance au cirque.',
      meta: 'Édition 2026 · Caravanes et Saltimbanques',
    },
    en: {
      kicker: 'The 2026 theme',
      hook: 'Caravans and Players',
      body: 'After the Vikings, the road goes on. The 2026 edition honours nomadic peoples, great banquet halls and the travelling performers who gave rise to the circus.',
      meta: '2026 edition · Caravans and Players',
    },
  },
  {
    n: '20', key: 'commanditaires', src: { lena: '2025-IMG_6039', focus: 0.45 }, side: 'right',
    credit: CREDIT_LENA,
    qr: { fr: '/partenaires', en: '/en/partners' },
    fr: {
      kicker: 'Commanditaires',
      hook: 'Prenez rang à la cour du festival',
      body: 'Trois mille cent visiteurs sont passés sur le site l’an dernier, portés par une équipe entièrement bénévole depuis 2022. Chaque commandite finance la scène, les troupes, les artisans et les cavaliers.',
      meta: 'Formules de commandite · sur le site',
    },
    en: {
      kicker: 'Sponsors',
      hook: 'Take your rank at the festival court',
      body: 'Three thousand one hundred visitors came through the grounds last year, carried by a fully volunteer team since 2022. Every sponsorship funds the stage, the troupes, the artisans and the riders.',
      meta: 'Sponsorship tiers · on the site',
    },
  },
  {
    n: '26', key: 'avant-de-venir', src: { lena: '2025-IMG_4459', focus: 0.45 }, side: 'left',
    credit: CREDIT_LENA,
    qr: { fr: '/ressources', en: '/en/resources' },
    fr: {
      kicker: 'Avant de venir',
      hook: 'Ce qu’il faut savoir avant la route',
      body: 'Les chiens ne sont pas admis sur le site, le billet se télécharge à la maison parce que le signal tombe à l’entrée, et le comptant vaut mieux que la carte. Les armes de costume se présentent au comité à l’arrivée.',
      meta: 'Infos pratiques · règlement complet en ligne',
    },
    en: {
      kicker: 'Before you come',
      hook: 'What to know before the drive',
      body: 'Dogs are not allowed on the grounds, tickets download best at home because the signal drops at the gate, and cash beats card. Costume weapons are shown to the committee on arrival.',
      meta: 'Practical info · full rules online',
    },
  },
  {
    // La pièce de laiton du site, capturée grande sur le fond de nuit.
    n: '25', key: 'monnaie', src: { capture: 'monnaie' }, side: 'left', credit: null,
    qr: { fr: '/petite-monnaie', en: '/en/petite-monnaie' },
    fr: {
      kicker: 'La Petite Monnaie',
      hook: 'La monnaie locale de la Petite-Nation',
      body: 'Une petite-monnaie vaut un dollar canadien. Le réseau cellulaire est capricieux dans la forêt de Montpellier, alors vous échangez votre comptant au kiosque de l’entrée et vous payez partout sur le site.',
      meta: 'Kiosque à l’entrée · remboursée au départ',
    },
    en: {
      kicker: 'The Petite Monnaie',
      hook: 'The local currency of Petite-Nation',
      body: 'One petite-monnaie is worth one Canadian dollar. Cell coverage is unreliable in the Montpellier woods, so you trade your cash at the gate kiosk and pay everywhere on the grounds.',
      meta: 'Kiosk at the gate · refunded on the way out',
    },
  },
];
