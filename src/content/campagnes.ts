// ─── Les modèles d'infolettres ───────────────────────────────────────
// Alex, 2026-08-24 : dix lettres à envoyer aux gens des listes de
// clients, depuis l'espace admin. Le texte et le choix des images
// vivent ici. La mise en page, la signature et le lien de
// désabonnement se posent dans `src/lib/courrielCampagne.ts`.
//
// D'OÙ VIENT LE TEXTE. Cinq de ces lettres sont d'Alex, mot pour mot :
// le brouillon `~/Documents/Onyx/10_projects/fmm/courriels-communications-2026.md`
// du 24 août 2026 couvre l'espace membre, les chiens, le billet
// imprimé, le comptant et l'antenne. Ces cinq-là ne se réécrivent pas.
// Les cinq autres (l'invitation, le banquet, le menu, les jeux et la
// programmation) ont été écrites à partir de ce qui est vérifiable dans
// le dépôt : `menu2026.ts` pour les plats et les trois services,
// `NourriturePage.tsx` pour le prix et la date limite du banquet,
// `activitesDuCode.ts` pour les piliers, `MusiquePage.tsx` pour la
// fiche de L'Harfang, `annonces.ts` pour les avis du babillard.
// Aucun chiffre, aucune promesse et aucune anecdote n'a été inventé.
//
// LES BLOCS. Une lettre est une SUITE de blocs, jamais un pavé de
// texte. Quatre sortes, et une lettre les mélange à sa guise :
//
//   • `texte`  · un paragraphe;
//   • `photo`  · une image de Léna, pleine largeur, avec son crédit;
//   • `video`  · un aperçu cliquable qui mène à la vidéo (dans un
//                courriel, une vidéo ne se joue jamais sur place);
//   • `carte`  · le bloc réutilisable image plus texte plus lien.
//
// C'est la `carte` qui reçoit les publications Facebook reprises en
// infolettre. Une publication de plus s'ajoute en écrivant une carte de
// plus dans la liste des blocs, sans qu'une ligne de mise en page
// bouge. L'image d'une carte est facultative : sans elle, la carte
// s'affiche en texte et lien, et l'image apparaît le jour où le fichier
// est déposé (voir `AFFICHE_2026` plus bas).

export type IdCampagne =
  | 'invitation-2026'
  | 'programmation'
  | 'banquet'
  | 'menu'
  | 'jeux'
  | 'compte'
  | 'chiens'
  | 'billet-imprime'
  | 'comptant'
  | 'antenne';

export type LangueCampagne = 'FR' | 'EN';

/** Le dossier public des images d'infolettre. Les photos de Léna y
 *  vivent en JPEG et non en WebP : Outlook pour Windows rend le HTML
 *  avec le moteur de Word, qui ne connaît pas le WebP et n'afficherait
 *  que des cadres vides. Les originaux en WebP restent dans
 *  `public/histoire/archives/lena/` pour le site. */
export const DOSSIER_COURRIEL = '/courriel';
export const DOSSIER_PHOTOS = '/courriel/lena';

/** Le lien d'un bloc. Une seule adresse, jamais deux : une lettre
 *  annonce un geste et s'arrête. */
export interface LienBloc {
  url: string;
  labelFR: string;
  labelEN: string;
}

export type BlocCampagne =
  | { type: 'texte'; FR: string; EN: string }
  | {
      type: 'photo';
      /** Le nom du fichier dans `/courriel/lena/`, sans le chemin. */
      fichier: string;
      altFR: string;
      altEN: string;
    }
  | {
      type: 'video';
      /** L'aperçu, dans `/courriel/`. Le triangle de lecture y est
       *  DESSINÉ : aucun client de courriel ne superpose deux calques
       *  de façon fiable. */
      image: string;
      url: string;
      altFR: string;
      altEN: string;
      legendeFR: string;
      legendeEN: string;
    }
  | {
      type: 'carte';
      /** Facultative. Sans elle, la carte s'affiche sans image. */
      image?: string;
      altFR?: string;
      altEN?: string;
      titreFR: string;
      titreEN: string;
      texteFR: string;
      texteEN: string;
      lien?: LienBloc;
    };

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
  /** Le grand titre en tête de la lettre. Court par obligation : un
   *  titre ne dépasse jamais deux lignes, et la colonne fait 600 px. */
  titreFR: string;
  titreEN: string;
  blocs: BlocCampagne[];
  /** La formule de politesse, juste avant la signature. */
  salutFR: string;
  salutEN: string;
  cta?: LienBloc;
}

const SITE = 'https://festivalmedievaldemontpellier.org';

// La levée de fonds pour l'antenne. Même adresse que dans
// `annonces.ts` : une seule source, sinon les deux divergent.
const ZEFFY_ANTENNE =
  'https://www.zeffy.com/fr-CA/donation-form/apportez-le-reseau-a-montpellier';

// ⚠️ L'affiche 2026 d'Annick Giroux n'est pas encore dans le dépôt. La
// carte s'affiche donc sans image, et l'image apparaît d'elle-même le
// jour où le fichier est déposé à `public/courriel/affiche-2026.jpg` :
// il suffit alors de remplacer `undefined` par 'affiche-2026.jpg'.
const AFFICHE_2026: string | undefined = undefined;

export const MODELES_CAMPAGNE: ModeleCampagne[] = [
  // ── 1 · L'invitation au festival 2026 ─────────────────────────────
  // Pour les gens des années passées qui n'ont rien acheté cette année.
  // La vidéo « Caravanes et Saltimbanques » ouvre la lettre : c'est la
  // publication épinglée de la page Facebook, et elle donne le ton de
  // l'édition en une minute.
  {
    id: 'invitation-2026',
    nom: 'L’invitation au festival 2026',
    pourQui: 'Les gens des années passées qui n’ont rien acheté en 2026',
    sujetFR: 'Le village rouvre ses portes les 25, 26 et 27 septembre',
    sujetEN: 'The village opens its gates on September 25, 26 and 27',
    titreFR: 'Le village rouvre',
    titreEN: 'The village reopens',
    blocs: [
      {
        type: 'texte',
        FR: 'Vous avez déjà franchi la porte du village lors d’une édition passée, et c’est pour cette raison que cette lettre vous arrive avant les autres.',
        EN: 'You have walked through the village gate at a past edition, and that is why this letter reaches you ahead of the rest.',
      },
      {
        type: 'video',
        image: 'video-caravanes-2026.jpg',
        url: 'https://www.youtube.com/watch?v=jPw1ivtK26k',
        altFR: 'Des saltimbanques dansent devant une caravane peinte, sous le titre Caravanes et Saltimbanques',
        altEN: 'Travelling players dance in front of a painted caravan, under the title Caravanes et Saltimbanques',
        legendeFR: 'La sixième édition se place sous le signe des caravanes et des saltimbanques. Acrobates et danseuses rejoignent les chevaliers, les Vikings et les marchands. La caravane est l’œuvre de Jonathan Leduc, et nous l’en remercions.',
        legendeEN: 'The sixth edition falls under the sign of caravans and travelling players. Acrobats and dancers join the knights, the Vikings and the merchants. The caravan is the work of Jonathan Leduc, and we thank him for it.',
      },
      {
        type: 'texte',
        FR: 'Le festival se remonte les 25, 26 et 27 septembre. Les cuisines de clans rallument leurs feux et la taverne rouvre ses fûts. Le dimanche à treize heures, cinquante convives s’assoient au Banquet de l’Équinoxe pour un repas à trois services.',
        EN: 'The festival rises again on September 25, 26 and 27. The clan kitchens light their fires and the tavern rolls out its casks. On Sunday at one o’clock, fifty guests sit down to the Equinox Banquet for a meal in three courses.',
      },
      {
        type: 'photo',
        fichier: '2023-IMG_4338.jpg',
        altFR: 'Une femme en cape de lin claire marche entre les étals du marché médiéval',
        altEN: 'A woman in a pale linen cloak walks between the stalls of the medieval market',
      },
      {
        type: 'texte',
        FR: 'Votre billet se prend sur le site du festival, et le camping du village s’y réserve en même temps, pour celles et ceux qui préfèrent dormir sur place et voir le brouillard se lever sur les tentes au matin.',
        EN: 'Your ticket is waiting on the festival website, and the village campground is booked at the same time, for those who would rather sleep on the grounds and watch the morning fog lift off the tents.',
      },
      {
        type: 'photo',
        fichier: '2025-IMG_6039.jpg',
        altFR: 'Une foule en costume se presse entre les tentes blanches du village',
        altEN: 'A costumed crowd gathers between the white tents of the village',
      },
    ],
    salutFR: 'Nous vous gardons une place au feu,',
    salutEN: 'We are keeping a place for you by the fire,',
    cta: { url: SITE, labelFR: 'Prendre votre billet', labelEN: 'Get your ticket' },
  },

  // ── 2 · La programmation est sortie ───────────────────────────────
  // Les piliers viennent d'`activitesDuCode.ts`, la fiche de L'Harfang
  // de `MusiquePage.tsx`, et les deux dernières cartes reprennent des
  // publications de la page Facebook.
  {
    id: 'programmation',
    nom: 'La programmation est sortie',
    pourQui: 'Tout le monde, dès que la programmation est publiée',
    sujetFR: 'La programmation du festival est là',
    sujetEN: 'The festival programme is out',
    titreFR: 'La programmation est là',
    titreEN: 'The programme is out',
    blocs: [
      {
        type: 'texte',
        FR: 'La programmation de l’édition 2026 est en ligne. Treize piliers tiennent les trois jours, du premier feu du matin jusqu’à celui qui s’éteint au petit matin suivant.',
        EN: 'The programme for the 2026 edition is online. Thirteen pillars hold up the three days, from the first fire of the morning to the one that dies down at dawn.',
      },
      {
        type: 'photo',
        fichier: '2025-IMG_5536.jpg',
        altFR: 'Deux chevaliers en armure s’élancent à la lance dans l’arène, devant une foule et des fanions',
        altEN: 'Two armoured knights charge with lances in the arena, before a crowd and bunting',
      },
      {
        type: 'texte',
        FR: 'L’arène tient la joute équestre et les tournois de l’Association Médiévale du Québec. Les combats vikings y reprennent aussi, en armure complète et à l’épée longue. Le village paysan ouvre sa forge et ses métiers, le marché aligne une cinquantaine d’artisans, et l’espace jeunesse accueille les jeunes seigneurs pendant que leurs parents festoient.',
        EN: 'The arena holds the mounted joust and the tournaments of the Association Médiévale du Québec. Viking combat returns there too, in full armour and with the longsword. The peasant village opens its forge and its trades, the market lines up some fifty artisans, and the youth space takes in the young lords while their parents feast.',
      },
      {
        type: 'photo',
        fichier: '2025-IMG_4803.jpg',
        altFR: 'Un mur de boucliers jaune et noir avance sur le sable de l’arène',
        altEN: 'A yellow and black shield wall advances across the sand of the arena',
      },
      {
        type: 'texte',
        FR: 'Le dimanche midi, la cérémonie de Freya salue le passage de la saison au camp viking, et le Banquet de l’Équinoxe suit à treize heures. Six groupes montent sur la scène cette année : L’Harfang, Skarazula, Mystic Projekt, Arrünn, Trifolys et Canteraine. La musique porte le festival du tambour viking jusqu’aux ballades médiévales.',
        EN: 'On Sunday at midday, the ceremony of Freya greets the turning of the season at the Viking camp, and the Equinox Banquet follows at one o’clock. Six bands take the stage this year: L’Harfang, Skarazula, Mystic Projekt, Arrünn, Trifolys and Canteraine. The music carries the festival from Viking drums to medieval ballads.',
      },
      {
        type: 'carte',
        image: 'harfang.jpg',
        altFR: 'Le duo L’Harfang salue le public, la vielle à roue à la main',
        altEN: 'The duo L’Harfang takes a bow, hurdy-gurdy in hand',
        titreFR: 'L’Harfang revient, accompagné',
        titreEN: 'L’Harfang returns, with guests',
        texteFR: 'Le duo joue pour le festival depuis le tout début. Alison Gowan tient la vielle à roue et Éric Pichette la musette de seize pouces. Leur répertoire va du folklore à la musique médiévale, en passant par le baroque et le bal folk moderne. Cette année, ils reviennent accompagnés d’invités.',
        texteEN: 'The duo has played the festival since the very beginning. Alison Gowan is on hurdy-gurdy and Éric Pichette on the sixteen-inch musette. Their repertoire runs from folk to medieval music, by way of baroque and modern balfolk. This year, they return with guests alongside them.',
      },
      {
        type: 'carte',
        image: AFFICHE_2026,
        altFR: 'L’affiche 2026 du festival, signée Annick Giroux',
        altEN: 'The festival’s 2026 poster, by Annick Giroux',
        titreFR: 'L’affiche de l’édition, signée Annick Giroux',
        titreEN: 'The edition’s poster, by Annick Giroux',
        texteFR: 'L’affiche 2026 est l’œuvre d’Annick Giroux, une artiste de la Petite-Nation. Elle circule un peu partout en Outaouais, et c’est son trait qui donne son visage à l’édition. Merci à elle.',
        texteEN: 'The 2026 poster is the work of Annick Giroux, an artist from the Petite-Nation. It is travelling all over the Outaouais, and it is her hand that gives the edition its face. Our thanks to her.',
        lien: {
          url: 'https://annickgiroux.com',
          labelFR: 'Voir son travail',
          labelEN: 'See her work',
        },
      },
    ],
    salutFR: 'Au plaisir de vous y voir,',
    salutEN: 'We look forward to seeing you there,',
    cta: { url: `${SITE}/activites`, labelFR: 'Lire la programmation', labelEN: 'Read the programme' },
  },

  // ── 3 · Le banquet de l'Équinoxe ──────────────────────────────────
  // Les plats viennent de BANQUET_MENU dans `src/content/menu2026.ts`,
  // le prix et la date limite de la copie de NourriturePage.
  {
    id: 'banquet',
    nom: 'L’invitation au Banquet de l’Équinoxe',
    pourQui: 'Les billets et les mécènes, pour les cinquante places',
    sujetFR: 'Cinquante places à la table du seigneur',
    sujetEN: 'Fifty seats at the lord’s table',
    titreFR: 'Le Banquet de l’Équinoxe',
    titreEN: 'The Equinox Banquet',
    blocs: [
      {
        type: 'texte',
        FR: 'Le dimanche du festival, à treize heures, une longue tablée se dresse sur la scène et cinquante convives s’y assoient. C’est le Banquet de l’Équinoxe, et nous vous y invitons.',
        EN: 'On the Sunday of the festival, at one o’clock, a long table is raised on the stage and fifty guests sit down at it. This is the Equinox Banquet, and we are inviting you to it.',
      },
      {
        type: 'photo',
        fichier: '2025-IMG_8036.jpg',
        altFR: 'Un chaudron suspendu au-dessus d’un feu ouvert, sous une charpente de bois',
        altEN: 'A cauldron hangs over an open fire, under a wooden frame',
      },
      {
        type: 'texte',
        FR: 'Trois services sortent des cuisines. Le bouillon fumé aux racines et les brochettes de gibier ouvrent le repas, le poulet entier rôti à la flamme et le pain farci à la goulash le portent, et les poires pochées au vin blanc le referment. Des bardes jouent à la table pendant que vous mangez.',
        EN: 'Three courses come out of the kitchens. Smoked root broth and game skewers open the meal, whole chicken roasted over the flame and goulash-stuffed bread carry it, and pears poached in white wine close it. Bards play at the table while you eat.',
      },
      {
        type: 'photo',
        fichier: '2025-IMG_6361.jpg',
        altFR: 'Un cuisinier travaille sous un auvent, entre les paniers de légumes et la fumée',
        altEN: 'A cook works under an awning, among vegetable baskets and smoke',
      },
      {
        type: 'texte',
        FR: 'Cette tablée était historiquement réservée aux chefs de clans. Elle est aujourd’hui ouverte à tous les voyageurs, guerriers, marchands et skjaldmös qui veulent un vrai repas de fin de festival. La salle en compte cinquante places, jamais une de plus, et les réservations se ferment le 17 septembre.',
        EN: 'This table was historically reserved for clan chieftains. It is open today to every traveller, warrior, merchant and skjaldmö who wants a proper meal at the end of the festival. The hall holds fifty seats, never one more, and reservations close on September 17.',
      },
      {
        type: 'texte',
        FR: 'Votre place se réserve sur le site du festival, à soixante-cinq dollars par personne, plus taxes.',
        EN: 'Your seat is reserved on the festival website, at sixty-five dollars per person, plus tax.',
      },
    ],
    salutFR: 'Nous vous gardons un couvert,',
    salutEN: 'We are keeping a setting for you,',
    cta: { url: `${SITE}/nourriture`, labelFR: 'Réserver votre place', labelEN: 'Reserve your seat' },
  },

  // ── 4 · Venez lire le menu ────────────────────────────────────────
  // Les plats nommés ici existent tous dans MENU et ABREUVOIR
  // (`src/content/menu2026.ts`). Aucun prix : décision d'Alex du
  // 22 août, le menu public n'en porte pas.
  {
    id: 'menu',
    nom: 'Venez lire le menu',
    pourQui: 'Tout le monde, une fois le menu du chef arrêté',
    sujetFR: 'Le menu du village est affiché',
    sujetEN: 'The village menu is up',
    titreFR: 'Le menu du village',
    titreEN: 'The village menu',
    blocs: [
      {
        type: 'texte',
        FR: 'Le chef Marc-Alexis Pepin a fermé le menu de l’édition 2026, et il est maintenant affiché sur le site du festival.',
        EN: 'Chef Marc-Alexis Pepin has closed the menu for the 2026 edition, and it is now up on the festival website.',
      },
      {
        type: 'photo',
        fichier: '2024-IMG_5665.jpg',
        altFR: 'Deux cuisiniers du camp viking travaillent au-dessus d’un lit de braises',
        altEN: 'Two cooks from the Viking camp work over a bed of embers',
      },
      {
        type: 'texte',
        FR: 'Vous y trouverez la marmite du campement, avec son olla gitana aux pois chiches et sa goulash au paprika, servies dans le pain viking. Le grill donne les brochettes de poulet au cidre et le bœuf au cumin. La boulangerie sort quatre pains, dont le pain aux insectes et le lembas. L’abreuvoir verse l’hypocras, la cervoise et la bière au beurre.',
        EN: 'You will find the camp cauldron there, with its chickpea olla gitana and its paprika goulash, both served in viking bread. The grill gives you cider-marinated chicken skewers and cumin beef. The bakery turns out four breads, among them the insect bread and the lembas. The watering hole pours hypocras, cervoise and butterbeer.',
      },
      {
        type: 'photo',
        fichier: '2024-IMG_4722.jpg',
        altFR: 'Des pains et des galettes sur un présentoir, à côté de pots de conserves',
        altEN: 'Breads and flatcakes on a stand, beside jars of preserves',
      },
      {
        type: 'texte',
        FR: 'Pour celles et ceux que rien n’effraie, il y a les criquets épicés, les œufs de cent ans et la langue de porc. Ils figurent sous le titre « Pour les courageux », ce qui vous prévient.',
        EN: 'For those whom nothing frightens, there are spiced crickets, century eggs and pork tongue. They sit under the heading “For the brave”, which is fair warning.',
      },
    ],
    salutFR: 'Bon appétit d’avance,',
    salutEN: 'Enjoy the meal in advance,',
    cta: { url: `${SITE}/nourriture`, labelFR: 'Lire le menu', labelEN: 'Read the menu' },
  },

  // ── 5 · Venez jouer aux jeux sur le site ──────────────────────────
  // La description des trois jeux est celle d'Alex, reprise de sa
  // lettre sur l'espace membre. Les trois existent dans `src/games/`.
  {
    id: 'jeux',
    nom: 'Venez jouer aux jeux sur le site',
    pourQui: 'Les gens qui ont déjà un compte, et ceux qui hésitent encore',
    sujetFR: 'Trois jeux vous attendent dans votre espace membre',
    sujetEN: 'Three games are waiting in your member space',
    titreFR: 'Trois jeux vous attendent',
    titreEN: 'Three games await you',
    blocs: [
      {
        type: 'texte',
        FR: 'Le festival ne dort pas entre les éditions. Dans votre espace membre, trois jeux vous attendent, et ils se jouent depuis n’importe quel fauteuil.',
        EN: 'The festival does not sleep between editions. Three games are waiting in your member space, and they play from any armchair.',
      },
      {
        type: 'photo',
        fichier: 'jeu-des.jpg',
        altFR: 'Cinq dés rouges et un gobelet de cuir renversé sur une table de chêne, à la chandelle',
        altEN: 'Five red dice and an upturned leather cup on an oak table, by candlelight',
      },
      {
        type: 'photo',
        fichier: 'jeu-tafl.jpg',
        altFR: 'Un plateau de hnefatafl sculpté, ses pièces rouges et ivoire rangées sous une chandelle',
        altEN: 'A carved hnefatafl board, its red and ivory pieces set out under a candle',
      },
      {
        type: 'photo',
        fichier: 'jeu-tarot.jpg',
        altFR: 'Une croix celtique de cartes de tarot posée sur une table de bois, à la chandelle',
        altEN: 'A Celtic cross of tarot cards laid on a wooden table, by candlelight',
      },
      {
        type: 'texte',
        FR: 'Vous pouvez affronter la maison ou un ami aux dés du menteur, tenter le hnefatafl, le jeu des Vikings, ou tirer les cartes du tarot de Marseille. Chaque partie vous fait gagner des badges, et les collections complètes ouvrent des récompenses que vous viendrez chercher au festival.',
        EN: 'You can take on the house or a friend at liar’s dice, try hnefatafl, the game of the Vikings, or draw the cards of the Marseille tarot. Every round earns you badges, and completed collections unlock rewards you will come and claim at the festival.',
      },
      {
        type: 'photo',
        fichier: '2023-IMG_4319.jpg',
        altFR: 'Une femme coiffée de bois de cerf et le visage peint, au milieu des visiteurs',
        altEN: 'A woman crowned with antlers, her face painted, among the visitors',
      },
      {
        type: 'texte',
        FR: 'Il vous faut un compte pour y accéder. Il se crée en une minute, avec le courriel qui a servi à acheter votre billet.',
        EN: 'You need an account to reach them. It takes a minute to create, with the same email address that bought your ticket.',
      },
    ],
    salutFR: 'À vos dés,',
    salutEN: 'To your dice,',
    cta: { url: `${SITE}/jeux`, labelFR: 'Ouvrir la salle de jeux', labelEN: 'Open the game room' },
  },

  // ── 6 · Créez-vous un espace membre ───────────────────────────────
  // TEXTE D'ALEX, MOT POUR MOT (brouillon du 2026-08-24, lettre 1).
  {
    id: 'compte',
    nom: 'Créez-vous un espace membre',
    pourQui: 'Les billets 2026 qui n’ont pas encore de compte sur le site',
    motsDAlex: true,
    sujetFR: 'Votre place est réservée. Votre coffre vous attend.',
    sujetEN: 'Your seat is booked. Your vault is waiting.',
    titreFR: 'Votre coffre vous attend',
    titreEN: 'Your vault is waiting',
    blocs: [
      {
        type: 'texte',
        FR: 'Votre billet pour le Festival Médiéval de Montpellier est confirmé, et nous avons hâte de vous voir sur le terrain les 25, 26 et 27 septembre.',
        EN: 'Your ticket for the Festival Médiéval de Montpellier is confirmed, and we are looking forward to seeing you on the grounds on September 25, 26 and 27.',
      },
      {
        type: 'photo',
        fichier: '2025-IMG_4534.jpg',
        altFR: 'Le champ du festival, ses tentes de toile et ses visiteurs, sous un ciel bleu',
        altEN: 'The festival field, its canvas tents and its visitors, under a blue sky',
      },
      {
        type: 'texte',
        FR: 'En attendant, le festival vit déjà en ligne. Nous avons ouvert un espace membre où votre billet se range dans un coffre, où les nouvelles vous arrivent en premier, et où quelques jeux vous attendent. Vous pouvez y affronter la maison ou un ami aux dés du menteur, tenter le jeu des Vikings, ou tirer les cartes du tarot de Marseille. Chaque geste vous fait gagner des badges, et les collections complètes ouvrent des récompenses que vous viendrez chercher au festival.',
        EN: 'In the meantime, the festival is already alive online. We have opened a member space where your ticket is filed away in a vault, where the news reaches you first, and where a few games are waiting. You can take on the house or a friend at liar’s dice, try the game of the Vikings, or draw the cards of the Marseille tarot. Every move earns you badges, and completed collections unlock rewards you will come and claim at the festival.',
      },
      {
        type: 'photo',
        fichier: '2024-IMG_4719.jpg',
        altFR: 'Un marchand en tunique rit avec une visiteuse devant son étal',
        altEN: 'A merchant in a tunic laughs with a visitor in front of his stall',
      },
      {
        type: 'texte',
        FR: 'Votre compte se crée avec le courriel qui a servi à acheter votre billet, en une minute, à festivalmedievaldemontpellier.org.',
        EN: 'Your account is created with the same email address that bought your ticket, in one minute, at festivalmedievaldemontpellier.org.',
      },
    ],
    salutFR: 'À bientôt sur le terrain,',
    salutEN: 'See you on the grounds,',
    cta: { url: SITE, labelFR: 'Ouvrir votre compte', labelEN: 'Open your account' },
  },

  // ── 7 · Les chiens ────────────────────────────────────────────────
  // TEXTE D'ALEX, MOT POUR MOT (brouillon du 2026-08-24, lettre 2).
  // L'anglais suit l'avis `no-dogs-2026` de `src/content/annonces.ts`.
  // Les deux photos montrent les chevaux, qui sont la raison de la
  // consigne : l'image explique la règle mieux que la phrase.
  {
    id: 'chiens',
    nom: 'Les chiens ne sont pas admis sur le site',
    pourQui: 'Tous les billets et le camping, à envoyer tôt',
    motsDAlex: true,
    sujetFR: 'Une chose à régler avant de partir : les chiens',
    sujetEN: 'One thing to settle before you leave: dogs',
    titreFR: 'Les chiens et les chevaux',
    titreEN: 'Dogs and horses',
    blocs: [
      {
        type: 'texte',
        FR: 'Nous vous écrivons pour une raison bien précise, et il vaut mieux la connaître avant de faire vos bagages.',
        EN: 'We are writing for one very specific reason, and it is better to know it before you pack.',
      },
      {
        type: 'photo',
        fichier: '2024-IMG_5044.jpg',
        altFR: 'Une femme caresse deux chevaux appuyés contre la barrière de l’enclos',
        altEN: 'A woman strokes two horses leaning against the paddock fence',
      },
      {
        type: 'texte',
        FR: 'Des chevaux sont présents pendant tout le festival, et notre couverture d’assurance tombe dès qu’un chien s’en approche. C’est le festival au complet qui perdrait sa protection. Aucun chien n’est donc admis sur le terrain, même tenu en laisse.',
        EN: 'Horses are on site for the whole festival, and our insurance coverage lapses the moment a dog comes near them. The entire festival would lose its protection. No dog is admitted on the grounds, even on a leash.',
      },
      {
        type: 'photo',
        fichier: '2024-IMG_4707.jpg',
        altFR: 'Un cheval blanc et sa cavalière traversent l’arène bordée de fanions',
        altEN: 'A white horse and its rider cross the arena lined with bunting',
      },
      {
        type: 'texte',
        FR: 'Prévoyez une garde pour votre compagnon avant de prendre la route. Nous savons que la nouvelle déçoit, et nous préférons vous la dire maintenant plutôt qu’à la barrière.',
        EN: 'Please arrange care for your companion before you take the road. We know the news disappoints, and we would rather tell you now than at the gate.',
      },
    ],
    salutFR: 'Au plaisir de vous accueillir,',
    salutEN: 'We look forward to welcoming you,',
  },

  // ── 8 · Imprimez votre billet ─────────────────────────────────────
  // TEXTE D'ALEX, MOT POUR MOT (brouillon du 2026-08-24, lettre 3).
  {
    id: 'billet-imprime',
    nom: 'Imprimez votre billet avant de partir',
    pourQui: 'Tous les billets, dans la semaine avant le festival',
    motsDAlex: true,
    sujetFR: 'Imprimez votre billet pendant que vous avez du réseau',
    sujetEN: 'Print your ticket while you still have signal',
    titreFR: 'Imprimez votre billet',
    titreEN: 'Print your ticket',
    blocs: [
      {
        type: 'texte',
        FR: 'Le village de Montpellier est niché dans les montagnes, et le réseau cellulaire y est faible. Il n’y a pas non plus de sans-fil public à l’entrée. Chercher son billet sur son téléphone au moment d’arriver tourne souvent court, et la file s’allonge derrière.',
        EN: 'The village of Montpellier sits deep in the mountains, and cell coverage there is weak. There is no public Wi-Fi at the gate either. Hunting for your ticket on your phone as you arrive tends to fall flat, and the line grows behind you.',
      },
      {
        type: 'photo',
        fichier: '2024-IMG_4547.jpg',
        altFR: 'Des visiteurs entrent sous la grande tente du marché, à l’entrée du site',
        altEN: 'Visitors step under the big market tent at the entrance to the site',
      },
      {
        type: 'texte',
        FR: 'Imprimez votre confirmation Zeffy à la maison, ou téléchargez-la sur votre appareil pendant que le signal tient encore. Votre espace membre garde aussi une copie prête à télécharger, dans votre coffre à billets.',
        EN: 'Print your Zeffy confirmation at home, or download it to your device while the signal still holds. Your member space also keeps a copy ready to download, in your ticket vault.',
      },
      {
        type: 'photo',
        fichier: '2025-IMG_4533.jpg',
        altFR: 'Les tentes vikings et leurs boucliers dressés, sous un ciel dégagé',
        altEN: 'Viking tents and their standing shields, under a clear sky',
      },
    ],
    salutFR: 'Nous vous attendons les 25, 26 et 27 septembre,',
    salutEN: 'We will be waiting for you on September 25, 26 and 27,',
  },

  // ── 9 · Apportez du comptant ──────────────────────────────────────
  // TEXTE D'ALEX, MOT POUR MOT (brouillon du 2026-08-24, lettre 4).
  {
    id: 'comptant',
    nom: 'Apportez du comptant, et la Petite Monnaie',
    pourQui: 'Tous les billets, le camping et les kiosques',
    motsDAlex: true,
    sujetFR: 'Apportez du comptant, et repartez avec de la monnaie du village',
    sujetEN: 'Bring cash, and leave with the coin of the village',
    titreFR: 'Du comptant, et la Petite Monnaie',
    titreEN: 'Cash, and the Petite Monnaie',
    blocs: [
      {
        type: 'texte',
        FR: 'Encore une conséquence des montagnes : le réseau cellulaire est faible sur le site, et les terminaux de paiement deviennent capricieux aux heures de pointe. Prévoyez du comptant pour les kiosques, la nourriture et le bar.',
        EN: 'Another consequence of the mountains: cell coverage is weak on site, and card terminals get temperamental at peak hours. Bring cash for the kiosks, the food and the bar.',
      },
      {
        type: 'photo',
        fichier: '2025-IMG_4526.jpg',
        altFR: 'Des bols et des pots de terre cuite alignés sur une fourrure, à l’étal d’un artisan',
        altEN: 'Clay bowls and pots lined up on a fur, at an artisan’s stall',
      },
      {
        type: 'texte',
        FR: 'Un kiosque de la Petite Monnaie vous accueillera à l’entrée. Vous y échangerez votre comptant contre la monnaie du village, frappée pour le festival et acceptée partout sur le terrain. Elle se dépense aux étals comme aux tavernes, et ce qu’il vous en reste devient un souvenir.',
        EN: 'A Petite Monnaie kiosk will welcome you at the entrance. There you will trade your cash for the coin of the village, struck for the festival and accepted everywhere on the grounds. It spends at the stalls and at the taverns alike, and whatever you have left becomes a keepsake.',
      },
      {
        type: 'photo',
        fichier: '2024-IMG_4661.jpg',
        altFR: 'Un étal d’artisan chargé de casques, de boucliers et d’objets de bois',
        altEN: 'An artisan’s stall loaded with helmets, shields and wooden goods',
      },
    ],
    salutFR: 'À très bientôt,',
    salutEN: 'See you very soon,',
    cta: {
      url: 'https://www.lesalondesinconnus.com/petite-monnaie',
      labelFR: 'Voir la Petite Monnaie',
      labelEN: 'See the Petite Monnaie',
    },
  },

  // ── 10 · L'antenne ────────────────────────────────────────────────
  // TEXTE D'ALEX, MOT POUR MOT (brouillon du 2026-08-24, lettre 5),
  // lui-même tiré de l'avis `connexion-etoiles-2026` d'`annonces.ts`.
  {
    id: 'antenne',
    nom: 'Le village cherche le signal des étoiles',
    pourQui: 'Les mécènes et les gens des années passées',
    motsDAlex: true,
    sujetFR: 'Le village cherche le signal des étoiles',
    sujetEN: 'The village is looking for the signal of the stars',
    titreFR: 'Le signal des étoiles',
    titreEN: 'The signal of the stars',
    blocs: [
      {
        type: 'texte',
        FR: 'Comme tout village dans les montagnes, Montpellier est coupé des ondes du monde extérieur. Il nous faut donc nous tourner vers le ciel pour recevoir la fréquence du dieu de l’argent.',
        EN: 'Like every village in the mountains, Montpellier is cut off from the airwaves of the outside world. So we must turn to the sky to receive the frequency of the god of money.',
      },
      {
        type: 'photo',
        fichier: '2025-IMG_6361.jpg',
        altFR: 'La proue d’un drakkar sculptée en dragon brûle dans la nuit, devant la foule',
        altEN: 'The dragon-carved prow of a longship burns in the night, before the crowd',
      },
      {
        type: 'texte',
        FR: 'Afin de faciliter les transactions sur le site, il est impératif au festival de trouver une façon de procurer au village le signal des étoiles. En achetant une antenne massive, vous permettrez non seulement au Festival Médiéval de Montpellier, mais aussi à d’autres festivals, de voir le jour et de survivre sur le territoire montagneux de la Petite-Nation.',
        EN: 'To make transactions possible on the grounds, the festival must find a way to bring the village the signal of the stars. By buying one massive antenna, you will allow not only the Festival Médiéval de Montpellier, but other festivals too, to come to life and survive on the mountainous land of the Petite-Nation.',
      },
      {
        type: 'photo',
        fichier: '2025-IMG_6325.jpg',
        altFR: 'Une procession de torches traverse le site à la nuit tombée',
        altEN: 'A torch procession crosses the grounds after nightfall',
      },
      {
        type: 'texte',
        FR: 'La page du festival vous montre où en est la collecte.',
        EN: 'The festival page shows you where the collection stands.',
      },
    ],
    salutFR: 'Merci de porter le village avec nous,',
    salutEN: 'Thank you for carrying the village with us,',
    cta: { url: ZEFFY_ANTENNE, labelFR: 'Porter la lumière', labelEN: 'Carry the light' },
  },
];

export const MODELE_PAR_ID = new Map<IdCampagne, ModeleCampagne>(
  MODELES_CAMPAGNE.map((m) => [m.id, m]),
);
