// ─── Les modèles de campagnes par courriel ───────────────────────────
// Alex, 2026-08-24 : neuf lettres à envoyer aux gens des listes de
// clients, depuis l'espace admin. Le texte vit ici, en français et en
// anglais, et rien d'autre. La mise en page, la signature et le lien de
// désabonnement se posent dans `src/lib/courrielCampagne.ts`.
//
// D'OÙ VIENT LE TEXTE. Cinq de ces lettres sont d'Alex, mot pour mot :
// le brouillon `~/Documents/Onyx/10_projects/fmm/courriels-communications-2026.md`
// du 24 août 2026 couvre l'espace membre, les chiens, le billet
// imprimé, le comptant et l'antenne. Ces cinq-là ne se réécrivent pas.
// Les quatre autres (l'invitation 2026, le banquet, le menu et les
// jeux) ont été écrites à partir de ce qui est vérifiable dans le
// dépôt : `menu2026.ts` pour les plats et les trois services,
// `NourriturePage.tsx` pour le prix et la date limite du banquet,
// `annonces.ts` pour les avis du babillard, `App.tsx` pour les jeux.
// Aucun chiffre, aucune promesse et aucune anecdote n'a été inventé.
//
// L'expéditeur est TOUJOURS le festival : `admin@festivalmedievaldemontpellier.org`,
// affiché « Festival Médiéval de Montpellier ». La signature au bas de
// la lettre est celle d'Alex comme directeur des communications, et
// c'est le seul endroit où son nom paraît.

export type IdCampagne =
  | 'invitation-2026'
  | 'banquet'
  | 'menu'
  | 'jeux'
  | 'compte'
  | 'chiens'
  | 'billet-imprime'
  | 'comptant'
  | 'antenne';

export type LangueCampagne = 'FR' | 'EN';

/** Le bouton au pied de la lettre. Une seule adresse, jamais deux :
 *  une lettre annonce un geste et s'arrête. */
export interface BoutonCampagne {
  url: string;
  labelFR: string;
  labelEN: string;
}

export interface ModeleCampagne {
  id: IdCampagne;
  /** Le nom du modèle dans la liste de l'admin. */
  nom: string;
  /** À qui elle s'adresse, en une ligne, pour l'écran d'admin. */
  pourQui: string;
  /** Vrai quand le texte est celui d'Alex, mot pour mot. L'écran le
   *  signale, pour que personne ne le retouche par distraction. */
  motsDAlex?: boolean;
  sujetFR: string;
  sujetEN: string;
  /** Un paragraphe par entrée. La même liste sert au rendu HTML et à
   *  la version texte seul, ce qui garde les deux identiques. */
  corpsFR: string[];
  corpsEN: string[];
  /** La formule de politesse, juste avant la signature. */
  salutFR: string;
  salutEN: string;
  cta?: BoutonCampagne;
}

const SITE = 'https://festivalmedievaldemontpellier.org';

// La levée de fonds pour l'antenne. Même adresse que dans
// `annonces.ts` : une seule source, sinon les deux divergent.
const ZEFFY_ANTENNE =
  'https://www.zeffy.com/fr-CA/donation-form/apportez-le-reseau-a-montpellier';

export const MODELES_CAMPAGNE: ModeleCampagne[] = [
  // ── 1 · L'invitation au festival 2026 ─────────────────────────────
  // Pour les gens des années passées qui n'ont rien acheté cette année.
  {
    id: 'invitation-2026',
    nom: 'L’invitation au festival 2026',
    pourQui: 'Les gens des années passées qui n’ont rien acheté en 2026',
    sujetFR: 'Le village rouvre ses portes les 25, 26 et 27 septembre',
    sujetEN: 'The village opens its gates on September 25, 26 and 27',
    corpsFR: [
      'Vous avez déjà franchi la porte du village lors d’une édition passée, et c’est pour cette raison que cette lettre vous arrive avant les autres.',
      'Le festival se remonte cette année sous le signe des caravanes et des saltimbanques, les 25, 26 et 27 septembre. Les cuisines de clans rallument leurs feux et la taverne rouvre ses fûts. Le dimanche à treize heures, cinquante convives s’assoient au Banquet de l’Équinoxe pour un repas à trois services.',
      'Votre billet se prend sur le site du festival, et le camping du village s’y réserve en même temps, pour celles et ceux qui préfèrent dormir sur place et voir le brouillard se lever sur les tentes au matin.',
    ],
    corpsEN: [
      'You have walked through the village gate at a past edition, and that is why this letter reaches you ahead of the rest.',
      'The festival rises again this year under the sign of caravans and travelling players, on September 25, 26 and 27. The clan kitchens light their fires and the tavern rolls out its casks. On Sunday at one o’clock, fifty guests sit down to the Equinox Banquet for a meal in three courses.',
      'Your ticket is waiting on the festival website, and the village campground is booked at the same time, for those who would rather sleep on the grounds and watch the morning fog lift off the tents.',
    ],
    salutFR: 'Nous vous gardons une place au feu,',
    salutEN: 'We are keeping a place for you by the fire,',
    cta: {
      url: SITE,
      labelFR: 'Prendre votre billet',
      labelEN: 'Get your ticket',
    },
  },

  // ── 2 · Le banquet de l'Équinoxe ──────────────────────────────────
  // Les plats viennent de BANQUET_MENU dans `src/content/menu2026.ts`,
  // le prix et la date limite de la copie de NourriturePage.
  {
    id: 'banquet',
    nom: 'L’invitation au Banquet de l’Équinoxe',
    pourQui: 'Les billets et les mécènes, pour les cinquante places',
    sujetFR: 'Cinquante places à la table du seigneur',
    sujetEN: 'Fifty seats at the lord’s table',
    corpsFR: [
      'Le dimanche du festival, à treize heures, une longue tablée se dresse sur la scène et cinquante convives s’y assoient. C’est le Banquet de l’Équinoxe, et nous vous y invitons.',
      'Trois services sortent des cuisines. Le bouillon fumé aux racines et les brochettes de gibier ouvrent le repas, le poulet entier rôti à la flamme et le pain farci à la goulash le portent, et les poires pochées au vin blanc le referment. Des bardes jouent à la table pendant que vous mangez.',
      'Cette tablée était historiquement réservée aux chefs de clans. Elle est aujourd’hui ouverte à tous les voyageurs, guerriers, marchands et skjaldmös qui veulent un vrai repas de fin de festival. La salle en compte cinquante places, jamais une de plus, et les réservations se ferment le 17 septembre.',
      'Votre place se réserve sur le site du festival, à soixante-cinq dollars par personne, plus taxes.',
    ],
    corpsEN: [
      'On the Sunday of the festival, at one o’clock, a long table is raised on the stage and fifty guests sit down at it. This is the Equinox Banquet, and we are inviting you to it.',
      'Three courses come out of the kitchens. Smoked root broth and game skewers open the meal, whole chicken roasted over the flame and goulash-stuffed bread carry it, and pears poached in white wine close it. Bards play at the table while you eat.',
      'This table was historically reserved for clan chieftains. It is open today to every traveller, warrior, merchant and skjaldmö who wants a proper meal at the end of the festival. The hall holds fifty seats, never one more, and reservations close on September 17.',
      'Your seat is reserved on the festival website, at sixty-five dollars per person, plus tax.',
    ],
    salutFR: 'Nous vous gardons un couvert,',
    salutEN: 'We are keeping a setting for you,',
    cta: {
      url: `${SITE}/nourriture`,
      labelFR: 'Réserver votre place',
      labelEN: 'Reserve your seat',
    },
  },

  // ── 3 · Venez lire le menu ────────────────────────────────────────
  // Les plats nommés ici existent tous dans MENU et ABREUVOIR
  // (`src/content/menu2026.ts`). Aucun prix : décision d'Alex du
  // 22 août, le menu public n'en porte pas.
  {
    id: 'menu',
    nom: 'Venez lire le menu',
    pourQui: 'Tout le monde, une fois le menu du chef arrêté',
    sujetFR: 'Le menu du village est affiché',
    sujetEN: 'The village menu is up',
    corpsFR: [
      'Le chef Marc-Alexis Pepin a fermé le menu de l’édition 2026, et il est maintenant affiché sur le site du festival.',
      'Vous y trouverez la marmite du campement, avec son olla gitana aux pois chiches et sa goulash au paprika, servies dans le pain viking. Le grill donne les brochettes de poulet au cidre et le bœuf au cumin. La boulangerie sort quatre pains, dont le pain aux insectes et le lembas, et l’abreuvoir verse l’hypocras, la cervoise et la bière au beurre.',
      'Pour celles et ceux que rien n’effraie, il y a les criquets épicés, les œufs de cent ans et la langue de porc. Ils figurent sous le titre « Pour les courageux », ce qui vous prévient.',
      'Le menu complet se lit sur la page de la nourriture, avec les trois services du banquet au bas.',
    ],
    corpsEN: [
      'Chef Marc-Alexis Pepin has closed the menu for the 2026 edition, and it is now up on the festival website.',
      'You will find the camp cauldron there, with its chickpea olla gitana and its paprika goulash, both served in viking bread. The grill gives you cider-marinated chicken skewers and cumin beef. The bakery turns out four breads, among them the insect bread and the lembas, and the watering hole pours hypocras, cervoise and butterbeer.',
      'For those whom nothing frightens, there are spiced crickets, century eggs and pork tongue. They sit under the heading “For the brave”, which is fair warning.',
      'The full menu is on the food page, with the three banquet courses at the bottom.',
    ],
    salutFR: 'Bon appétit d’avance,',
    salutEN: 'Enjoy the meal in advance,',
    cta: {
      url: `${SITE}/nourriture`,
      labelFR: 'Lire le menu',
      labelEN: 'Read the menu',
    },
  },

  // ── 4 · Venez jouer aux jeux sur le site ──────────────────────────
  // La description des trois jeux est celle d'Alex, reprise de sa
  // lettre sur l'espace membre. Les trois existent dans `src/games/`.
  {
    id: 'jeux',
    nom: 'Venez jouer aux jeux sur le site',
    pourQui: 'Les gens qui ont déjà un compte, et ceux qui hésitent encore',
    sujetFR: 'Trois jeux vous attendent dans votre espace membre',
    sujetEN: 'Three games are waiting in your member space',
    corpsFR: [
      'Le festival ne dort pas entre les éditions. Dans votre espace membre, trois jeux vous attendent, et ils se jouent depuis n’importe quel fauteuil.',
      'Vous pouvez affronter la maison ou un ami aux dés du menteur, tenter le hnefatafl, le jeu des Vikings, ou tirer les cartes du tarot de Marseille. Chaque partie vous fait gagner des badges, et les collections complètes ouvrent des récompenses que vous viendrez chercher au festival.',
      'Il vous faut un compte pour y accéder. Il se crée en une minute, avec le courriel qui a servi à acheter votre billet.',
    ],
    corpsEN: [
      'The festival does not sleep between editions. Three games are waiting in your member space, and they play from any armchair.',
      'You can take on the house or a friend at liar’s dice, try hnefatafl, the game of the Vikings, or draw the cards of the Marseille tarot. Every round earns you badges, and completed collections unlock rewards you will come and claim at the festival.',
      'You need an account to reach them. It takes a minute to create, with the same email address that bought your ticket.',
    ],
    salutFR: 'À vos dés,',
    salutEN: 'To your dice,',
    cta: {
      url: `${SITE}/jeux`,
      labelFR: 'Ouvrir la salle de jeux',
      labelEN: 'Open the game room',
    },
  },

  // ── 5 · Créez-vous un espace membre ───────────────────────────────
  // TEXTE D'ALEX, MOT POUR MOT (brouillon du 2026-08-24, lettre 1).
  {
    id: 'compte',
    nom: 'Créez-vous un espace membre',
    pourQui: 'Les billets 2026 qui n’ont pas encore de compte sur le site',
    motsDAlex: true,
    sujetFR: 'Votre place est réservée. Votre coffre vous attend.',
    sujetEN: 'Your seat is booked. Your vault is waiting.',
    corpsFR: [
      'Votre billet pour le Festival Médiéval de Montpellier est confirmé, et nous avons hâte de vous voir sur le terrain les 25, 26 et 27 septembre.',
      'En attendant, le festival vit déjà en ligne. Nous avons ouvert un espace membre où votre billet se range dans un coffre, où les nouvelles vous arrivent en premier, et où quelques jeux vous attendent. Vous pouvez y affronter la maison ou un ami aux dés du menteur, tenter le jeu des Vikings, ou tirer les cartes du tarot de Marseille. Chaque geste vous fait gagner des badges, et les collections complètes ouvrent des récompenses que vous viendrez chercher au festival.',
      'Votre compte se crée avec le courriel qui a servi à acheter votre billet, en une minute, à festivalmedievaldemontpellier.org.',
    ],
    corpsEN: [
      'Your ticket for the Festival Médiéval de Montpellier is confirmed, and we are looking forward to seeing you on the grounds on September 25, 26 and 27.',
      'In the meantime, the festival is already alive online. We have opened a member space where your ticket is filed away in a vault, where the news reaches you first, and where a few games are waiting. You can take on the house or a friend at liar’s dice, try the game of the Vikings, or draw the cards of the Marseille tarot. Every move earns you badges, and completed collections unlock rewards you will come and claim at the festival.',
      'Your account is created with the same email address that bought your ticket, in one minute, at festivalmedievaldemontpellier.org.',
    ],
    salutFR: 'À bientôt sur le terrain,',
    salutEN: 'See you on the grounds,',
    cta: {
      url: SITE,
      labelFR: 'Ouvrir votre compte',
      labelEN: 'Open your account',
    },
  },

  // ── 6 · Les chiens ────────────────────────────────────────────────
  // TEXTE D'ALEX, MOT POUR MOT (brouillon du 2026-08-24, lettre 2).
  // L'anglais suit l'avis `no-dogs-2026` de `src/content/annonces.ts`.
  {
    id: 'chiens',
    nom: 'Les chiens ne sont pas admis sur le site',
    pourQui: 'Tous les billets et le camping, à envoyer tôt',
    motsDAlex: true,
    sujetFR: 'Une chose à régler avant de partir : les chiens',
    sujetEN: 'One thing to settle before you leave: dogs',
    corpsFR: [
      'Nous vous écrivons pour une raison bien précise, et il vaut mieux la connaître avant de faire vos bagages.',
      'Des chevaux sont présents pendant tout le festival, et notre couverture d’assurance tombe dès qu’un chien s’en approche. C’est le festival au complet qui perdrait sa protection. Aucun chien n’est donc admis sur le terrain, même tenu en laisse.',
      'Prévoyez une garde pour votre compagnon avant de prendre la route. Nous savons que la nouvelle déçoit, et nous préférons vous la dire maintenant plutôt qu’à la barrière.',
    ],
    corpsEN: [
      'We are writing for one very specific reason, and it is better to know it before you pack.',
      'Horses are on site for the whole festival, and our insurance coverage lapses the moment a dog comes near them. The entire festival would lose its protection. No dog is admitted on the grounds, even on a leash.',
      'Please arrange care for your companion before you take the road. We know the news disappoints, and we would rather tell you now than at the gate.',
    ],
    salutFR: 'Au plaisir de vous accueillir,',
    salutEN: 'We look forward to welcoming you,',
  },

  // ── 7 · Imprimez votre billet ─────────────────────────────────────
  // TEXTE D'ALEX, MOT POUR MOT (brouillon du 2026-08-24, lettre 3).
  {
    id: 'billet-imprime',
    nom: 'Imprimez votre billet avant de partir',
    pourQui: 'Tous les billets, dans la semaine avant le festival',
    motsDAlex: true,
    sujetFR: 'Imprimez votre billet pendant que vous avez du réseau',
    sujetEN: 'Print your ticket while you still have signal',
    corpsFR: [
      'Le village de Montpellier est niché dans les montagnes, et le réseau cellulaire y est faible. Il n’y a pas non plus de sans-fil public à l’entrée. Chercher son billet sur son téléphone au moment d’arriver tourne souvent court, et la file s’allonge derrière.',
      'Imprimez votre confirmation Zeffy à la maison, ou téléchargez-la sur votre appareil pendant que le signal tient encore. Votre espace membre garde aussi une copie prête à télécharger, dans votre coffre à billets.',
    ],
    corpsEN: [
      'The village of Montpellier sits deep in the mountains, and cell coverage there is weak. There is no public Wi-Fi at the gate either. Hunting for your ticket on your phone as you arrive tends to fall flat, and the line grows behind you.',
      'Print your Zeffy confirmation at home, or download it to your device while the signal still holds. Your member space also keeps a copy ready to download, in your ticket vault.',
    ],
    salutFR: 'Nous vous attendons les 25, 26 et 27 septembre,',
    salutEN: 'We will be waiting for you on September 25, 26 and 27,',
  },

  // ── 8 · Apportez du comptant ──────────────────────────────────────
  // TEXTE D'ALEX, MOT POUR MOT (brouillon du 2026-08-24, lettre 4).
  {
    id: 'comptant',
    nom: 'Apportez du comptant, et la Petite Monnaie',
    pourQui: 'Tous les billets, le camping et les kiosques',
    motsDAlex: true,
    sujetFR: 'Apportez du comptant, et repartez avec de la monnaie du village',
    sujetEN: 'Bring cash, and leave with the coin of the village',
    corpsFR: [
      'Encore une conséquence des montagnes : le réseau cellulaire est faible sur le site, et les terminaux de paiement deviennent capricieux aux heures de pointe. Prévoyez du comptant pour les kiosques, la nourriture et le bar.',
      'Un kiosque de la Petite Monnaie vous accueillera à l’entrée. Vous y échangerez votre comptant contre la monnaie du village, frappée pour le festival et acceptée partout sur le terrain. Elle se dépense aux étals comme aux tavernes, et ce qu’il vous en reste devient un souvenir.',
    ],
    corpsEN: [
      'Another consequence of the mountains: cell coverage is weak on site, and card terminals get temperamental at peak hours. Bring cash for the kiosks, the food and the bar.',
      'A Petite Monnaie kiosk will welcome you at the entrance. There you will trade your cash for the coin of the village, struck for the festival and accepted everywhere on the grounds. It spends at the stalls and at the taverns alike, and whatever you have left becomes a keepsake.',
    ],
    salutFR: 'À très bientôt,',
    salutEN: 'See you very soon,',
    cta: {
      url: 'https://www.lesalondesinconnus.com/petite-monnaie',
      labelFR: 'Voir la Petite Monnaie',
      labelEN: 'See the Petite Monnaie',
    },
  },

  // ── 9 · L'antenne ─────────────────────────────────────────────────
  // TEXTE D'ALEX, MOT POUR MOT (brouillon du 2026-08-24, lettre 5),
  // lui-même tiré de l'avis `connexion-etoiles-2026` d'`annonces.ts`.
  {
    id: 'antenne',
    nom: 'Le village cherche le signal des étoiles',
    pourQui: 'Les mécènes et les gens des années passées',
    motsDAlex: true,
    sujetFR: 'Le village cherche le signal des étoiles',
    sujetEN: 'The village is looking for the signal of the stars',
    corpsFR: [
      'Comme tout village dans les montagnes, Montpellier est coupé des ondes du monde extérieur. Il nous faut donc nous tourner vers le ciel pour recevoir la fréquence du dieu de l’argent.',
      'Afin de faciliter les transactions sur le site, il est impératif au festival de trouver une façon de procurer au village le signal des étoiles. En achetant une antenne massive, vous permettrez non seulement au Festival Médiéval de Montpellier, mais aussi à d’autres festivals, de voir le jour et de survivre sur le territoire montagneux de la Petite-Nation.',
      'La page du festival vous montre où en est la collecte.',
    ],
    corpsEN: [
      'Like every village in the mountains, Montpellier is cut off from the airwaves of the outside world. So we must turn to the sky to receive the frequency of the god of money.',
      'To make transactions possible on the grounds, the festival must find a way to bring the village the signal of the stars. By buying one massive antenna, you will allow not only the Festival Médiéval de Montpellier, but other festivals too, to come to life and survive on the mountainous land of the Petite-Nation.',
      'The festival page shows you where the collection stands.',
    ],
    salutFR: 'Merci de porter le village avec nous,',
    salutEN: 'Thank you for carrying the village with us,',
    cta: {
      url: ZEFFY_ANTENNE,
      labelFR: 'Porter la lumière',
      labelEN: 'Carry the light',
    },
  },
];

export const MODELE_PAR_ID = new Map<IdCampagne, ModeleCampagne>(
  MODELES_CAMPAGNE.map((m) => [m.id, m]),
);
