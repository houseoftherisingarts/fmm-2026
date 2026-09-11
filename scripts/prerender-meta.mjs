// Passe GEO par route (recette Salon postbuild-routes.mjs, version musclée).
// Les robots IA et de partage n'exécutent pas le JS : ce script écrit, après
// chaque build, dist/<route>/index.html avec title/description/canonical/og/
// hreflang PROPRES À LA ROUTE, un JSON-LD spécifique quand pertinent, et le
// #root PRÉ-REMPLI d'un bloc de contenu citable (remplacé par React au mount :
// même HTML pour tous, aucun cloaking). Firebase Hosting sert le fichier réel
// avant la rewrite **, donc chaque route reçoit sa version.
// Branché dans `npm run deploy` via le build; exécuter après vite build.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = 'https://www.festivalmedievaldemontpellier.org';
const OG_IMG = `${ROOT_URL}/hero/fmm-poster-card.jpg`;

// Faits partagés (source : llms.txt + horaire officiel).
const FAITS_FR = `
  <p><strong>Festival Médiéval de Montpellier (FMM)</strong> · édition 2026 « Caravanes &amp; Saltimbanques », du vendredi 25 au dimanche 27 septembre 2026 au 4 rue du Bosquet, Montpellier (Québec) J0V 1M0, dans la Petite-Nation en Outaouais, à environ 75 minutes d'Ottawa-Gatineau. Billets : Passe Journée 27 $, Passe 3 Jours 65 $ (CAD), en ligne via Zeffy.</p>`;
const FAITS_EN = `
  <p><strong>Festival Médiéval de Montpellier (FMM)</strong> · 2026 "Caravanes &amp; Saltimbanques" edition, Friday September 25 to Sunday September 27, 2026 at 4 rue du Bosquet, Montpellier, Québec J0V 1M0, in the Petite-Nation (Outaouais), about 75 minutes from Ottawa-Gatineau. Tickets: Day Pass $27, 3-Day Pass $65 (CAD), online via Zeffy.</p>`;

// [frPath, enPath, {fr:{title,desc,h1,body}, en:{...}, jsonLd?}]
const PAIRS = [
  ['/', '/en', {
    fr: { title: 'Festival Médiéval de Montpellier — FMM 2026',
      desc: "Festival médiéval en Outaouais — 25, 26 et 27 septembre 2026. Édition Caravanes & Saltimbanques : joutes, combats vikings, marché artisanal, banquet, musique.",
      h1: 'Festival Médiéval de Montpellier · 2026',
      body: `${FAITS_FR}<p>Trois jours de festival : joutes équestres de l'AMQ, combats vikings, campement viking, village paysan (forge, herboristerie), marché artisanal, banquet du Prince William, marionnette géante, danse aérienne et neuf groupes sur scène : Skarazula, L'Harfang, Troupe Caravane, l'Ensemble Klezmer de Sainte-Nigoune, BicOasis, Trifolys, Svarica, Las Noches Bohemias et Alhambra.</p>` },
    en: { title: 'Festival Médiéval de Montpellier — Medieval Festival 2026 (Québec)',
      desc: 'Medieval festival in the Outaouais, Québec — September 25-27, 2026. Jousting, Viking combat, artisan market, feast and live music, 75 minutes from Ottawa.',
      h1: 'Montpellier Medieval Festival · 2026',
      body: `${FAITS_EN}<p>Three festival days: AMQ mounted jousting, Viking combat, Viking camp, peasant village (forge, herbalism), artisan market, Prince William banquet, giant puppet, aerial dance and nine bands on stage: Skarazula, L'Harfang, Troupe Caravane, the Sainte-Nigoune Klezmer Ensemble, BicOasis, Trifolys, Svarica, Las Noches Bohemias and Alhambra.</p>` },
  }],
  ['/activites', '/en/activities', {
    fr: { title: 'Programmation 2026 — Festival Médiéval de Montpellier',
      desc: "Horaire complet des trois jours : joutes AMQ, combats vikings, démonstrations du village paysan, spectacles, banquet du Prince William et section jeunesse.",
      h1: 'Programmation 2026',
      body: `${FAITS_FR}<p>Au programme : joutes équestres et Chevaliers de l'Association Médiévale du Québec (AMQ), combats vikings dans l'arène, démonstrations de forge et parcours d'herboristerie au village paysan, conférence bohème, marionnette géante, danse aérienne, hobby horse, concours culinaire au camp viking, allumage du feu, spectacles de Skarazula, Harfang, Trifolys et Svarica, banquet du Prince William et section jeunesse présentée par Les Camps Légendaires. Portes : vendredi 17 h, samedi et dimanche 10 h.</p>` },
    en: { title: 'Program 2026 — Montpellier Medieval Festival (Québec)',
      desc: 'Full three-day schedule: AMQ jousting, Viking combat, peasant-village demonstrations, shows, Prince William banquet and youth section.',
      h1: 'Program 2026',
      body: `${FAITS_EN}<p>On the program: mounted jousting and Knights by the Association Médiévale du Québec (AMQ), Viking combat in the arena, forge demonstrations and herbalism trail in the peasant village, bohemian talk, giant puppet, aerial dance, hobby horse tournament, Viking-camp cooking contest, fire lighting, shows by Skarazula, Harfang, Trifolys and Svarica, the Prince William banquet and a youth section presented by Les Camps Légendaires. Gates: Friday 5 p.m., Saturday and Sunday 10 a.m.</p>` },
  }],
  ['/billets', '/en/tickets', {
    fr: { title: 'Billets 2026 — Festival Médiéval de Montpellier',
      desc: 'Passe Journée 27 $ · Passe 3 Jours 65 $ (CAD). Billetterie officielle en ligne via Zeffy. Enfants et familles bienvenus.',
      h1: 'Billets 2026',
      body: `${FAITS_FR}<p>La billetterie officielle est en ligne via Zeffy. Passe Journée : 27 $. Passe 3 Jours : 65 $. L'achat en ligne évite la file à l'entrée; des billets sont aussi vendus sur place selon la disponibilité.</p>`,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Billets — Festival Médiéval de Montpellier 2026', url: `${ROOT_URL}/billets`,
        mainEntity: { '@type': 'Event', name: 'Festival Médiéval de Montpellier 2026', startDate: '2026-09-25T17:00:00-04:00', endDate: '2026-09-27T17:00:00-04:00',
          location: { '@type': 'Place', name: 'Site du Festival Médiéval de Montpellier', address: { '@type': 'PostalAddress', streetAddress: '4 rue du Bosquet', addressLocality: 'Montpellier', addressRegion: 'QC', postalCode: 'J0V 1M0', addressCountry: 'CA' } },
          offers: [
            { '@type': 'Offer', name: 'Passe Journée', price: '27.00', priceCurrency: 'CAD', availability: 'https://schema.org/InStock', url: `${ROOT_URL}/billets` },
            { '@type': 'Offer', name: 'Passe 3 Jours', price: '65.00', priceCurrency: 'CAD', availability: 'https://schema.org/InStock', url: `${ROOT_URL}/billets` },
          ] } } },
    en: { title: 'Tickets 2026 — Montpellier Medieval Festival (Québec)',
      desc: 'Day Pass $27 · 3-Day Pass $65 (CAD). Official online box office via Zeffy.',
      h1: 'Tickets 2026',
      body: `${FAITS_EN}<p>The official box office is online via Zeffy. Day Pass: $27. 3-Day Pass: $65. Buying online skips the line at the gate; tickets are also sold on site subject to availability.</p>` },
  }],
  ['/marche', '/en/market', {
    fr: { title: 'Marché & Village — Festival Médiéval de Montpellier 2026',
      desc: "Une cinquantaine d'artisans et marchands d'époque, village gustatif, banquet du Prince William et cuisines de clans.",
      h1: 'Le Village & le Marché',
      body: `${FAITS_FR}<p>Le marché réunit une cinquantaine d'artisans et marchands d'époque : forgerons, costumiers, bijoutiers, brasseurs et herboristes. Le village gustatif sert des plats d'inspiration médiévale toute la fin de semaine, et le banquet du Prince William se réserve séparément des billets d'entrée.</p>` },
    en: { title: 'Market & Village — Montpellier Medieval Festival 2026',
      desc: 'Some fifty period artisans and merchants, food village, Prince William banquet and clan kitchens.',
      h1: 'The Village & Market',
      body: `${FAITS_EN}<p>The market gathers some fifty period artisans and merchants: smiths, costumers, jewellers, brewers and herbalists. The food village serves medieval-inspired dishes all weekend, and the Prince William banquet is booked separately from entry tickets.</p>` },
  }],
  ['/hebergement', '/en/lodging', {
    fr: { title: 'Camping & Hébergement — Festival Médiéval de Montpellier 2026',
      desc: 'Camping festivalier sur le site même du festival, et hébergements partenaires dans la Petite-Nation (Outaouais).',
      h1: 'Camping & Hébergement',
      body: `${FAITS_FR}<p>Le camping festivalier se trouve sur le site même : plantez votre tente ou stationnez votre roulotte et restez après le spectacle de feu. Des auberges, campings et gîtes partenaires accueillent aussi les visiteurs dans la Petite-Nation.</p>` },
    en: { title: 'Camping & Lodging — Montpellier Medieval Festival 2026',
      desc: 'Festival camping on the festival grounds, plus partner lodgings across the Petite-Nation (Outaouais).',
      h1: 'Camping & Lodging',
      body: `${FAITS_EN}<p>Festival camping is on the grounds themselves: pitch your tent or park your camper and stay past the fire show. Partner inns, campgrounds and B&amp;Bs also welcome visitors across the Petite-Nation.</p>` },
  }],
  ['/partenaires', '/en/partners', {
    fr: { title: 'Partenaires & Commanditaires — Festival Médiéval de Montpellier',
      desc: 'Municipalité de Montpellier, MRC Papineau, Groupe Gagnon, Ferme Coopérative Agricola, PROSON et le Salon des Inconnus soutiennent le FMM.',
      h1: 'Nos Partenaires',
      body: `${FAITS_FR}<p>Le festival est soutenu par la Municipalité de Montpellier, la MRC de Papineau, le Groupe Gagnon, la Ferme Coopérative Agricola, PROSON (sonorisation, éclairage et vidéo, Saint-André-Avellin), la Municipalité de Duhamel, l'Académie Scrimicie, SABCO et Le Salon des Inconnus.</p>` },
    en: { title: 'Partners & Sponsors — Montpellier Medieval Festival',
      desc: 'The Municipality of Montpellier, MRC Papineau, Groupe Gagnon, Agricola co-op farm and PROSON support the FMM.',
      h1: 'Our Partners',
      body: `${FAITS_EN}<p>The festival is supported by the Municipality of Montpellier, the MRC de Papineau, Groupe Gagnon, the Agricola worker co-op farm, PROSON (sound, lighting and video, Saint-André-Avellin), the Municipality of Duhamel, Académie Scrimicie, SABCO and Le Salon des Inconnus.</p>` },
  }],
  ['/histoire', '/en/history', {
    fr: { title: 'Histoire & Apprendre — Festival Médiéval de Montpellier',
      desc: "L'histoire du festival depuis ses débuts, les archives photo, et le volet éducatif : forge, herboristerie, savoirs ancestraux.",
      h1: 'Histoire & Apprendre',
      body: `${FAITS_FR}<p>Né à Montpellier en Outaouais, le festival fait vivre les savoirs d'époque : démonstrations de forge, parcours d'herboristerie, conférences et archives photographiques des éditions passées. Le volet Apprendre présente les démonstrations réellement à l'horaire de l'édition en cours.</p>` },
    en: { title: 'History & Learning — Montpellier Medieval Festival',
      desc: 'The festival story, photo archives, and the learning track: forge, herbalism, ancestral knowledge.',
      h1: 'History & Learning',
      body: `${FAITS_EN}<p>Born in Montpellier (Outaouais), the festival keeps period knowledge alive: forge demonstrations, herbalism trail, talks and photo archives from past editions. The Learning track lists the demonstrations actually scheduled for the current edition.</p>` },
  }],
  ['/mariages', '/en/weddings', {
    fr: { title: 'Mariages & Groupes — Festival Médiéval de Montpellier',
      desc: 'Mariages médiévaux et réservations de groupe sur le site du festival, dans la Petite-Nation.',
      h1: 'Mariages & Groupes',
      body: `${FAITS_FR}<p>Le site accueille des mariages médiévaux et des groupes sur réservation. Pour un mariage, un événement corporatif ou une sortie de groupe, écrivez à l'équipe via la page contact.</p>` },
    en: { title: 'Weddings & Groups — Montpellier Medieval Festival',
      desc: 'Medieval weddings and group bookings on the festival grounds in the Petite-Nation.',
      h1: 'Weddings & Groups',
      body: `${FAITS_EN}<p>The grounds host medieval weddings and group outings by reservation. For a wedding, corporate event or group visit, write to the team via the contact page.</p>` },
  }],
  ['/benevole', '/en/volunteer', {
    fr: { title: 'Devenir Bénévole — Festival Médiéval de Montpellier 2026',
      desc: "Le FMM est porté par des bénévoles : accueil, billetterie, stationnement, scène, cuisine. Inscription en ligne.",
      h1: 'Devenir Bénévole',
      body: `${FAITS_FR}<p>Le festival est opéré par une équipe de bénévoles : accueil, billetterie, stationnement, entretien, scène et cuisine. L'inscription se fait en ligne sur cette page.</p>` },
    en: { title: 'Volunteer — Montpellier Medieval Festival 2026',
      desc: 'FMM runs on volunteer power: welcome, box office, parking, stage, kitchen. Online sign-up.',
      h1: 'Become a Volunteer',
      body: `${FAITS_EN}<p>The festival runs on volunteer power: welcome, box office, parking, upkeep, stage and kitchen. Sign-up is online on this page.</p>` },
  }],
  ['/petite-monnaie', '/en/petite-monnaie', {
    fr: { title: 'Petite Monnaie — la monnaie du Festival Médiéval de Montpellier',
      desc: "La monnaie du festival : achetez votre Petite Monnaie au kiosque à l'entrée et payez partout sur le site.",
      h1: 'Petite Monnaie',
      body: `${FAITS_FR}<p>Le réseau cellulaire est capricieux sur le site : passez au kiosque à l'entrée, repartez avec votre Petite Monnaie et payez partout au festival.</p>` },
    en: { title: 'Petite Monnaie — the Festival Currency',
      desc: "The festival's own currency: buy Petite Monnaie at the entrance kiosk and pay everywhere on site.",
      h1: 'Petite Monnaie',
      body: `${FAITS_EN}<p>Cell coverage is spotty on site: stop at the entrance kiosk, pick up your Petite Monnaie and pay everywhere at the festival.</p>` },
  }],
  ['/jeux-en-ligne', '/en/online-games', {
    fr: { title: 'Jeux en ligne — Festival Médiéval de Montpellier',
      desc: "Les jeux médiévaux du festival jouables en ligne toute l'année : Hnefatafl (échecs vikings) en 3D, sur mobile et bureau.",
      h1: 'Jeux en ligne',
      body: `${FAITS_FR}<p>Les jeux médiévaux du festival se jouent en ligne toute l'année. Premier de la table : le Hnefatafl, le jeu d'échecs viking, en 3D, plateau 11×11, règles complètes, jouable sur mobile et au bureau.</p>` },
    en: { title: 'Online Games — Montpellier Medieval Festival',
      desc: "The festival's medieval games playable online year-round: 3D Hnefatafl (Viking chess), mobile and desktop.",
      h1: 'Online Games',
      body: `${FAITS_EN}<p>The festival's medieval games are playable online all year. First at the table: Hnefatafl, the Viking chess game, in 3D, 11×11 board, full rules, on mobile and desktop.</p>` },
  }],
  ['/contact', '/en/contact', {
    fr: { title: 'Contact — Festival Médiéval de Montpellier',
      desc: 'Festival Médiéval de Montpellier · 4 rue du Bosquet, Montpellier (Québec) J0V 1M0 · admin@festivalmedievaldemontpellier.org · 514-418-3450.',
      h1: 'Nous joindre',
      body: `${FAITS_FR}<p>Adresse : 4 rue du Bosquet, Montpellier (Québec) J0V 1M0, Canada. Courriel : admin@festivalmedievaldemontpellier.org. Téléphone : 514-418-3450.</p>`,
      jsonLd: { '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Contact — Festival Médiéval de Montpellier', url: `${ROOT_URL}/contact`,
        mainEntity: { '@type': 'Organization', name: 'Festival Médiéval de Montpellier', url: ROOT_URL, email: 'admin@festivalmedievaldemontpellier.org', telephone: '+1-514-418-3450',
          address: { '@type': 'PostalAddress', streetAddress: '4 rue du Bosquet', addressLocality: 'Montpellier', addressRegion: 'QC', postalCode: 'J0V 1M0', addressCountry: 'CA' } } } },
    en: { title: 'Contact — Montpellier Medieval Festival',
      desc: 'Festival Médiéval de Montpellier · 4 rue du Bosquet, Montpellier, Québec J0V 1M0 · admin@festivalmedievaldemontpellier.org · 514-418-3450.',
      h1: 'Contact us',
      body: `${FAITS_EN}<p>Address: 4 rue du Bosquet, Montpellier, Québec J0V 1M0, Canada. Email: admin@festivalmedievaldemontpellier.org. Phone: 514-418-3450.</p>` },
  }],
  ['/accueil', '/en/accueil', {
    fr: { title: 'Accueil détaillé — Festival Médiéval de Montpellier 2026',
      desc: 'Tout le festival en une page : piliers, billets, camping, programmation 2026.',
      h1: 'Le Festival',
      body: FAITS_FR },
    en: { title: 'Festival Overview — Montpellier Medieval Festival 2026',
      desc: 'The whole festival on one page: pillars, tickets, camping, 2026 program.',
      h1: 'The Festival',
      body: FAITS_EN },
  }],
  ['/ressources', '/en/resources', {
    fr: { title: 'Ressources — Festival Médiéval de Montpellier',
      desc: 'Documents et ressources du festival.', h1: 'Ressources', body: FAITS_FR },
    en: { title: 'Resources — Montpellier Medieval Festival',
      desc: 'Festival documents and resources.', h1: 'Resources', body: FAITS_EN },
  }],
  ['/communaute', '/en/community', {
    fr: { title: 'Communauté — Festival Médiéval de Montpellier',
      desc: 'La communauté du festival : équipes et espaces internes.', h1: 'Communauté', body: FAITS_FR },
    en: { title: 'Community — Montpellier Medieval Festival',
      desc: 'The festival community: teams and internal spaces.', h1: 'Community', body: FAITS_EN },
  }],
  ['/jeunesse/hnefatafl', '/en/youth/hnefatafl', {
    fr: { title: "Hnefatafl en 3D — le jeu d'échecs viking du FMM",
      desc: "Jouez au Hnefatafl, le jeu d'échecs viking, en 3D et gratuitement : plateau 11×11, règles complètes, mobile et bureau.",
      h1: 'Hnefatafl',
      body: `${FAITS_FR}<p>Le Hnefatafl est le jeu de stratégie des Vikings : les Raiders encerclent, les Défenseurs protègent le Roi qui doit s'échapper vers un coin. Version 3D gratuite du festival, plateau 11×11, règles complètes.</p>` },
    en: { title: '3D Hnefatafl — the FMM Viking chess game',
      desc: 'Play Hnefatafl, the Viking chess game, free in 3D: 11×11 board, full rules, mobile and desktop.',
      h1: 'Hnefatafl',
      body: `${FAITS_EN}<p>Hnefatafl is the Vikings' strategy game: Raiders surround, Defenders protect the King who must escape to a corner. Free 3D version by the festival, 11×11 board, full rules.</p>` },
  }],
  ['/jeux/clan', '/en/games/clan', {
    img: '/partage/jeu-clan.jpg',
    imgAlt: 'Un grimoire ouvert sur la table, à la chandelle, où s’écrit le questionnaire du clan.',
    fr: { title: 'Ta place dans le clan — Jeu du FMM 2026',
      desc: 'Quinze questions décident de votre place dans une équipe de sept, puis du clan que vous fondez. Le jeu de l’année de la Peste se joue dans un grimoire, sans rien installer.',
      h1: 'Ta place dans le clan',
      body: `${FAITS_FR}<p>Le jeu s’ouvre sur un grimoire : vous choisissez votre groupe parmi les chevaliers, les vikings, les pirates, les artisans, le clergé et les saltimbanques, vous répondez à quinze questions, et le registre rend son verdict sur la fonction que vous tenez dans une équipe de sept. Un clan se fonde ensuite, avec les gens du même groupe.</p>` },
    en: { title: 'Your Place in the Clan — FMM 2026 game',
      desc: 'Fifteen questions decide your place in a team of seven, then the clan you found. The Year of the Plague game is played inside a grimoire, with nothing to install.',
      h1: 'Your Place in the Clan',
      body: `${FAITS_EN}<p>The game opens on a grimoire: you pick your group among knights, Vikings, pirates, artisans, clergy and travelling players, you answer fifteen questions, and the register gives its verdict on the role you hold in a team of seven. A clan is founded afterwards, with people from the same group.</p>` },
  }],
  ['/jeux/renard', '/en/games/fox-and-geese', {
    img: '/partage/jeu-renard.jpg',
    imgAlt: 'La planche en croix du Renard et les Oies, le renard roux cerné par les oies blanches.',
    fr: { title: 'Le Renard et les Oies — Jeu du FMM 2026',
      desc: 'Les oies montent en bloc vers la tanière pour y coincer le renard, qui n’a besoin que d’un saut par-dessus l’une d’elles. Treize ou dix-sept oies, contre l’ordinateur ou à deux.',
      h1: 'Le Renard et les Oies',
      body: `${FAITS_FR}<p>Sur une planche en croix, une basse-cour n’a que le nombre pour se défendre : les oies avancent ensemble vers la tanière et cherchent à immobiliser le renard, pendant que lui saute par-dessus les isolées pour éclaircir le troupeau. Les deux formes du jeu sont offertes, la plus ancienne à treize oies et la plus tardive à dix-sept.</p>` },
    en: { title: 'Fox and Geese — FMM 2026 game',
      desc: 'The geese climb together toward the den to pin the fox, while the fox needs a single leap over one of them. Thirteen or seventeen geese, against the computer or two players.',
      h1: 'Fox and Geese',
      body: `${FAITS_EN}<p>On a cross-shaped board, a farmyard has nothing but numbers on its side: the geese move together toward the den and try to pin the fox, while he leaps over the stragglers to thin the flock. Both forms are offered, the older one with thirteen geese and the later one with seventeen.</p>` },
  }],
  ['/jeux/merelle', '/en/games/merelle', {
    img: '/partage/jeu-merelle.jpg',
    imgAlt: 'Le madrier de la mérelle et ses trois carrés emboîtés, les pions bruns et noirs posés dessus.',
    fr: { title: 'La Mérelle — Jeu du FMM 2026',
      desc: 'Le jeu des moulins : neuf pions chacun, trois carrés emboîtés, et chaque alignement de trois enlève une pièce à l’autre. Contre l’ordinateur ou à deux sur le même écran.',
      h1: 'La Mérelle',
      body: `${FAITS_FR}<p>Trois carrés emboîtés, neuf pions par joueur, et un alignement de trois qui vous laisse retirer une pièce à l’autre : la mérelle se joue sur la table haute du seigneur, contre l’ordinateur ou à deux sur le même écran.</p>` },
    en: { title: 'Nine Men’s Morris — FMM 2026 game',
      desc: 'The mill game: nine pieces each, three nested squares, and every line of three takes a piece from the other side. Against the computer or two players on one screen.',
      h1: 'Nine Men’s Morris',
      body: `${FAITS_EN}<p>Three nested squares, nine pieces each, and a line of three that lets you take one of your opponent’s: morris is played on the lord’s high table, against the computer or with two players on one screen.</p>` },
  }],
  ['/jeux/des', '/en/games/dice', {
    img: '/partage/jeu-des.jpg',
    imgAlt: 'Un gobelet de cuir renversé et cinq dés rouges sur une table de taverne, à la chandelle.',
    fr: { title: 'Les dés du menteur — Jeu du FMM 2026',
      desc: 'Cinq dés sous chaque gobelet, une annonce qui monte jusqu’à ce que quelqu’un doute, et tous les gobelets se lèvent en même temps. Jusqu’à cinq joueurs.',
      h1: 'Les dés du menteur',
      body: `${FAITS_FR}<p>Chacun cache cinq dés sous son gobelet et annonce ce qu’il croit voir sur la table. L’annonce monte jusqu’au doute, et tous les gobelets se lèvent ensemble. Jusqu’à cinq joueurs s’y affrontent, contre la maison ou contre de vraies personnes.</p>` },
    en: { title: 'Liar’s Dice — FMM 2026 game',
      desc: 'Five dice under each cup, a bid that climbs until someone doubts, and every cup goes up at once. Up to five players, against the house or real people.',
      h1: 'Liar’s Dice',
      body: `${FAITS_EN}<p>Each player hides five dice under a cup and calls out what he believes is on the table. The bid climbs until someone doubts, and every cup goes up at once. Up to five players face each other, against the house or against real people.</p>` },
  }],
  ['/jeux/tarot', '/en/games/tarot', {
    img: '/partage/jeu-tarot.jpg',
    imgAlt: 'Les lames du tarot de Marseille étalées sur une étoffe, à la lueur d’une chandelle.',
    fr: { title: 'Tarot de Marseille — Jeu du FMM 2026',
      desc: 'Une carte, trois cartes ou la croix celtique en dix lames, et chaque lame reçoit sa lecture. Le jeu que les roulottes portaient de foire en foire.',
      h1: 'Tarot de Marseille',
      body: `${FAITS_FR}<p>Les roulottes portaient ce jeu de foire en foire, et il se lit encore de la même façon : vous tirez une seule carte, trois cartes ou la croix celtique en dix lames, et chaque lame reçoit sa lecture.</p>` },
    en: { title: 'Marseille Tarot — FMM 2026 game',
      desc: 'One card, three cards or the ten-card Celtic cross, and every card gets its reading. The deck the wagons carried from fair to fair.',
      h1: 'Marseille Tarot',
      body: `${FAITS_EN}<p>The wagons carried this deck from fair to fair, and it is still read the same way: you draw a single card, three cards or the ten of the Celtic cross, and every card gets its reading.</p>` },
  }],
  ['/politique-de-confidentialite', '/en/privacy', {
    fr: { title: 'Politique de confidentialité — Festival Médiéval de Montpellier',
      desc: 'Politique de confidentialité du site du Festival Médiéval de Montpellier.', h1: 'Politique de confidentialité', body: FAITS_FR },
    en: { title: 'Privacy Policy — Montpellier Medieval Festival',
      desc: 'Privacy policy of the Montpellier Medieval Festival website.', h1: 'Privacy Policy', body: FAITS_EN },
  }],
];

const esc = (t) => t.replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;').replace(/"/g, '&quot;');
const src = readFileSync(join(root, 'dist/index.html'), 'utf8');
let count = 0;

for (const [frPath, enPath, def] of PAIRS) {
  for (const [path, lang, d] of [[frPath, 'fr', def.fr], [enPath, 'en', def.en]]) {
    const url = `${ROOT_URL}${path === '/' ? '' : path}` || ROOT_URL;
    let html = src
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(d.title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(d.desc)}$2`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(d.title)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(d.desc)}$2`)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
      .replace(/(<html lang=")[^"]*(")/, `$1${lang === 'en' ? 'en' : 'fr'}$2`);
    // L'image de partage propre à la page, quand la route en déclare une :
    // sans elle, tout ce qui se partage montre la même joute, et le lien
    // d'un jeu ressemble au lien de la billetterie (Alex, 2026-09-10).
    if (def.img) {
      const img = `${ROOT_URL}${def.img}`;
      html = html
        .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${img}$2`)
        .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${img}$2`)
        .replace(/(<meta property="og:image:alt" content=")[^"]*(")/, `$1${esc(def.imgAlt ?? d.title)}$2`);
    }

    // hreflang par route
    const hreflang = `<link rel="alternate" hreflang="fr-CA" href="${ROOT_URL}${frPath === '/' ? '' : frPath}" />\n    <link rel="alternate" hreflang="en-CA" href="${ROOT_URL}${enPath}" />\n    <link rel="alternate" hreflang="x-default" href="${ROOT_URL}${frPath === '/' ? '' : frPath}" />\n    `;
    html = html.replace(/<link rel="canonical"/, hreflang + '<link rel="canonical"');
    // JSON-LD spécifique de page (en plus des blocs globaux)
    if (d.jsonLd) {
      html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(d.jsonLd)}</script>\n</head>`);
    }
    // Contenu citable, dans un <noscript> (Alex, 2026-08-28) : posé DANS
    // #root, il clignotait une fraction de seconde à chaque chargement,
    // le temps que React prenne la place. Les robots qui n'exécutent pas
    // le script le lisent toujours, et l'oeil humain ne le voit jamais.
    const citable = `<noscript><div style="max-width:720px;margin:0 auto;padding:48px 24px;font-family:Georgia,serif;color:#f4efe3;background:#0b0508"><h1 style="font-size:1.6rem;line-height:1.2">${d.h1}</h1>${d.body}<p><a href="${ROOT_URL}/billets" style="color:#e8b14a">Billets / Tickets</a> · <a href="${ROOT_URL}/activites" style="color:#e8b14a">Programmation / Program</a> · <a href="${ROOT_URL}/contact" style="color:#e8b14a">Contact</a></p></div></noscript>`;
    html = html.replace('<div id="root"></div>', `<div id="root"></div>${citable}`);

    if (path === '/') { writeFileSync(join(root, 'dist/index.html'), html); }
    else {
      const dir = join(root, 'dist', path.slice(1));
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.html'), html);
    }
    count++;
  }
}
console.log(`✓ prerender-meta : ${count} routes écrites (metas + hreflang + contenu citable)`);
