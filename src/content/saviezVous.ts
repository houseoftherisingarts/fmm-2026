// ─── Estage de Culture ──────────────────────────────────────────────
// La rubrique du festival, née sur notre page Facebook en août 2023 et
// reprise ici sous son nom d'origine. Chaque fait porte sa provenance,
// et chaque source a été ouverte et lue avant d'être inscrite ici.
//
// Deux provenances cohabitent :
//   · 'recherche' → vérifié en dictionnaire, en archive ou en musée.
//     Au moins une source consultable, exigée par le type.
//   · 'festival'  → repris d'une publication de notre page. Ses mots
//     restent les siens : seule une faute évidente se corrige.
//
// Ajouter un fait consiste à ajouter un objet au tableau FAITS, rien
// de plus. Le composant ne connaît aucun fait par son nom.

export type CategorieFait =
  | 'mots' | 'table' | 'taverne' | 'marche' | 'camp' | 'jeu'
  | 'roi' | 'festival';

export type SourceFait = {
  /** Nom lisible, affiché sous le fait. */
  nom: string;
  url: string;
};

export type PublicationFait = {
  /** Date de la publication d'origine, au format AAAA-MM-JJ. */
  date: string;
  url: string;
};

type FaitBase = {
  id: string;
  categorie: CategorieFait;
  titreFR: string;
  titreEN: string;
  texteFR: string;
  texteEN: string;
};

/**
 * Un fait de recherche doit porter au moins une source : le tuple non
 * vide le rend impossible à oublier. Un fait venu du festival porte sa
 * publication d'origine, et peut porter en plus une source si nous
 * avons vérifié ce qu'il avance.
 */
export type Fait = FaitBase &
  (
    | { origine: 'recherche'; sources: readonly [SourceFait, ...SourceFait[]] }
    | { origine: 'festival'; publication: PublicationFait; sources?: readonly SourceFait[] }
  );

export const CATEGORIES: Record<CategorieFait, { FR: string; EN: string }> = {
  mots:    { FR: 'Les mots',       EN: 'Words' },
  table:   { FR: 'À table',        EN: 'At table' },
  taverne: { FR: 'La taverne',     EN: 'The tavern' },
  marche:  { FR: 'Le marché',      EN: 'The market' },
  camp:    { FR: 'Le camp viking', EN: 'The Viking camp' },
  jeu:     { FR: 'Les jeux',       EN: 'Games' },
  roi:     { FR: 'Le roi',         EN: 'The king' },
  festival:{ FR: 'Notre festival', EN: 'Our festival' },
};

export const FAITS: readonly Fait[] = [
  // ── Les mots ──────────────────────────────────────────────────────
  {
    id: 'mete-medu',
    categorie: 'mots',
    origine: 'recherche',
    titreFR: 'Toute la nourriture s’appelait « meat »',
    titreEN: 'All food was once called meat',
    texteFR:
      'En vieil anglais, le mot « mete » nommait la nourriture entière, le pain comme le poisson et les herbes du potager. Il a rétréci vers l’an 1300 pour ne plus désigner que la chair des bêtes. L’hydromel porte un tout autre nom, « medu », et celui-là ne parle que de la boisson au miel. Les deux se ressemblent à l’oreille et descendent de racines séparées. La vraie paire ancienne était « mete and drinc », la nourriture et la boisson. Le français a vécu la même histoire : vers 1050, « viande » désignait tout ce qui fait vivre, et le mot ne s’est refermé sur la chair qu’à la fin du XIVe siècle.',
    texteEN:
      'In Old English the word “mete” named food of every kind, the bread as much as the fish and the herbs from the garden. It narrowed around the year 1300 until it meant only the flesh of animals. Mead carries a different name, “medu”, and that one speaks of the honey drink alone. The two sound alike and come down from separate roots. The old pairing was “mete and drinc”, food and drink. French lived the same story: around 1050 “viande” meant everything that keeps a person alive, and the word closed onto flesh only at the end of the fourteenth century.',
    sources: [
      { nom: 'Bosworth-Toller, dictionnaire d’anglo-saxon', url: 'https://bosworthtoller.com/22712' },
      { nom: 'Bosworth-Toller, entrée « medu »', url: 'https://bosworthtoller.com/22557' },
      { nom: 'CNRTL, étymologie de « viande »', url: 'https://www.cnrtl.fr/etymologie/viande' },
    ],
  },
  {
    id: 'compagnon',
    categorie: 'mots',
    origine: 'recherche',
    titreFR: 'Un compagnon partage votre pain',
    titreEN: 'A companion shares your bread',
    texteFR:
      'Le mot descend du latin tardif companio, formé de cum qui veut dire avec et de panis qui veut dire le pain. Un compagnon était donc celui qui rompait la même miche que vous. Les savants pensent que ce latin traduisait déjà un mot germanique, le gotique gahlaiba, formé sur hlaifs, la miche. La même image revient d’une langue à l’autre : deux personnes deviennent proches parce qu’elles mangent ensemble.',
    texteEN:
      'The word comes down from Late Latin companio, formed from cum meaning with and panis meaning bread. A companion was the one who broke the same loaf as you. Scholars believe that Latin was already translating a Germanic word. The Gothic gahlaiba says the same thing and is built on hlaifs, the loaf. The same image returns from one language to the next: two people grow close because they eat together.',
    sources: [
      { nom: 'Online Etymology Dictionary', url: 'https://www.etymonline.com/word/companion' },
    ],
  },
  {
    id: 'seigneur-miche',
    categorie: 'mots',
    origine: 'recherche',
    titreFR: 'Le seigneur gardait la miche',
    titreEN: 'The lord guarded the loaf',
    texteFR:
      'En vieil anglais, le seigneur se disait hlafweard, ce qui veut dire le gardien du pain. Sa dame se disait hlæfdige, celle qui pétrit le pain. Le rang d’une maison se mesurait au pain qu’elle pouvait donner, et les mots anglais lord et lady sont ces deux titres usés par les siècles.',
    texteEN:
      'In Old English the lord was hlafweard, which means the keeper of the loaf. His lady was hlæfdige, the one who kneads the loaf. The standing of a household was measured by the bread it could give away, and the English words lord and lady are those two titles worn down by the centuries.',
    sources: [
      { nom: 'Online Etymology Dictionary, « lord »', url: 'https://www.etymonline.com/word/lord' },
      { nom: 'Online Etymology Dictionary, « lady »', url: 'https://www.etymonline.com/word/lady' },
    ],
  },
  {
    id: 'saltimbanque',
    categorie: 'mots',
    origine: 'recherche',
    titreFR: 'Le saltimbanque saute sur le banc',
    titreEN: 'The saltimbanque jumps on the bench',
    texteFR:
      'Notre thème porte un mot italien dans ses bagages. Saltimbanco se défait en salta in banco, saute sur le banc. Le banc était l’estrade de fortune que le bateleur dressait sur la place du marché pour dominer la foule, vendre son remède et faire son tour. Le français a pris le mot en 1615, et il sent encore la planche et la poussière.',
    texteEN:
      'Our theme carries an Italian word in its baggage. Saltimbanco comes apart into salta in banco, jump on the bench. The bench was the makeshift stage the showman raised in the market square to stand above the crowd, sell his remedy and turn his trick. French took the word in 1615, and it still smells of plank and dust.',
    sources: [
      { nom: 'CNRTL, étymologie de « saltimbanque »', url: 'https://www.cnrtl.fr/etymologie/saltimbanque' },
    ],
  },
  {
    id: 'caravane',
    categorie: 'mots',
    origine: 'recherche',
    titreFR: 'La caravane est venue de Perse',
    titreEN: 'The caravan came from Persia',
    texteFR:
      'Le mot vient du persan kārwān, qui nommait une file de chameaux ou une troupe de voyageurs. Il entre en français à la faveur des croisades : vers 1195, le chroniqueur Ambroise l’écrit « carvane » dans sa Guerre sainte. Notre thème réunit donc deux mots venus de très loin, l’un de la route et l’autre de la place publique.',
    texteEN:
      'The word comes from Persian kārwān, which named a file of camels or a company of travellers. It entered French with the crusades: around 1195 the chronicler Ambroise writes it “carvane” in his Guerre sainte. Our theme therefore joins two words that travelled far, one from the road and one from the market square.',
    sources: [
      { nom: 'CNRTL, étymologie de « caravane »', url: 'https://www.cnrtl.fr/etymologie/caravane' },
    ],
  },
  {
    id: 'dejeuner',
    categorie: 'mots',
    origine: 'recherche',
    titreFR: 'Déjeuner veut dire rompre le jeûne',
    titreEN: 'Breakfast means breaking the fast',
    texteFR:
      'Le français « déjeuner » vient du latin médiéval disjejunare, rompre le jeûne, et Wace l’emploie déjà vers 1155 sous la forme « sei desgeüner ». L’anglais dit la même chose avec breakfast, mais le mot n’apparaît qu’au milieu du XVe siècle. Avant lui, le vieil anglais avait undernmete, qui nommait le repas de la troisième heure du jour. Cette heure-là tombait vers neuf heures du matin.',
    texteEN:
      'The French word “déjeuner” comes from medieval Latin disjejunare, to break the fast, and Wace already uses it around 1155 as “sei desgeüner”. English says the same thing with breakfast, but the word appears only in the middle of the fifteenth century. Before it, Old English had undernmete, which named the meal of the third hour of the day. That hour fell around nine in the morning.',
    sources: [
      { nom: 'CNRTL, étymologie de « déjeuner »', url: 'https://www.cnrtl.fr/etymologie/d%C3%A9jeuner' },
      { nom: 'Online Etymology Dictionary, « breakfast »', url: 'https://www.etymonline.com/word/breakfast' },
    ],
  },
  {
    id: 'garbage',
    categorie: 'mots',
    origine: 'recherche',
    titreFR: 'Garbage désignait les abats',
    titreEN: 'Garbage once meant giblets',
    texteFR:
      'Au début du XVe siècle, l’anglais garbage nommait les abats de volaille, la tête et les pattes que la cuisine gardait pour en tirer un plat. Le mot n’a glissé vers les ordures que bien plus tard, quand ces morceaux ont cessé de compter comme de la nourriture. L’origine exacte reste discutée, et le dictionnaire suppose un passage par l’anglo-normand, comme beaucoup de termes des vieux livres de cuisine.',
    texteEN:
      'At the start of the fifteenth century the English word garbage named the giblets of a fowl, the head and feet the kitchen kept to make a dish. The word slid toward refuse only much later, once those parts stopped counting as food. The exact origin is still debated, and the dictionary supposes a passage through Anglo-French, like many terms from the old cookery books.',
    sources: [
      { nom: 'Online Etymology Dictionary', url: 'https://www.etymonline.com/word/garbage' },
    ],
  },
  {
    id: 'couvre-feu',
    categorie: 'mots',
    origine: 'recherche',
    titreFR: 'Le couvre-feu couvrait le feu',
    titreEN: 'The curfew covered the fire',
    texteFR:
      'Le mot est attesté dès la première moitié du XIIIe siècle, dans le Roman de Renart, sous la forme « covrefeu ». Chaque soir, une cloche donnait l’ordre de couvrir ou d’éteindre les feux domestiques pour épargner la ville d’un incendie. L’anglais a emprunté le mot au XIVe siècle et en a fait curfew, qui a gardé l’heure sans garder le feu.',
    texteEN:
      'The word appears in the first half of the thirteenth century, in the Roman de Renart, spelled “covrefeu”. Every evening a bell gave the order to cover or damp the household fires so the town would be spared a blaze. English borrowed the word in the fourteenth century and made it curfew, which kept the hour and lost the fire.',
    sources: [
      { nom: 'CNRTL, étymologie de « couvre-feu »', url: 'https://www.cnrtl.fr/etymologie/couvre-feu' },
      { nom: 'Online Etymology Dictionary, « curfew »', url: 'https://www.etymonline.com/word/curfew' },
    ],
  },

  {
    id: 'hospitaux',
    categorie: 'mots',
    origine: 'festival',
    titreFR: 'Les hospitaux',
    titreEN: 'The hospitals',
    texteFR:
      'Saviez-vous que comme rares étaient les villes assez riches pour avoir une auberge, la plupart des gens demandaient l’hospitalité chez les particuliers.\n\nPuisque les gens avaient peur d’accepter les passants malades, les religieux ont établi un lieu où les malades pourraient recevoir l’hospitalité. D’où le mot « Hospital »\n\nLes soins sont venus par la suite.',
    texteEN:
      'Did you know that since few towns were rich enough to have an inn, most people asked for hospitality in private homes.\n\nBecause people were afraid to take in sick travellers, the religious orders set up a place where the sick could receive hospitality. Hence the word “Hospital”\n\nThe care came afterwards.',
    publication: { date: '2023-08-15', url: 'https://www.facebook.com/photo/?fbid=318000133938874&set=a.198354179236804' },
    sources: [
      { nom: 'CNRTL, étymologie de « hôpital »', url: 'https://www.cnrtl.fr/etymologie/h%C3%B4pital' },
      { nom: 'Medievalists.net, l’hôpital du haut Moyen Âge', url: 'https://www.medievalists.net/2022/06/the-early-medieval-hospital/' },
    ],
  },

  // ── À table ───────────────────────────────────────────────────────
  {
    id: 'tranchoir',
    categorie: 'table',
    origine: 'recherche',
    titreFR: 'Votre assiette était une tranche de pain',
    titreEN: 'Your plate was a slice of bread',
    texteFR:
      'Le tranchoir était une miche de trois jours, coupée en deux et posée à plat devant le convive. Le pain buvait la sauce pendant tout le repas. À la fin, l’aumônier de la maison ramassait les tranchoirs et les morceaux de pain dans le plat d’aumône, et les portait aux pauvres qui attendaient à la porte. Vous entendrez souvent qu’on les donnait aux chiens : cette version circule partout et ne s’appuie sur aucun texte d’époque.',
    texteEN:
      'The trencher was a three-day-old loaf, cut in half and laid flat before the diner. The bread drank the sauce for the length of the meal. At the end, the almoner of the house gathered the trenchers and broken bread into the alms dish and carried them to the poor waiting at the gate. You will often hear that they went to the dogs: that version travels everywhere and rests on no source from the period.',
    sources: [
      { nom: 'Medieval Cookery, notes sur les tranchoirs', url: 'http://www.medievalcookery.com/notes/trenchers.html' },
    ],
  },
  {
    id: 'contenance-table',
    categorie: 'table',
    origine: 'recherche',
    titreFR: 'Un poème enseignait les manières',
    titreEN: 'A poem taught table manners',
    texteFR:
      'La Contenance de la table est un petit poème français que les enfants apprenaient par cœur. Il ouvre sur les ongles : « Assès souvent tes ongles roingne » demande de les tailler souvent. Il enchaîne sur les mains avec « Lave tes mains devant disner, et aussy quant vouldras soupper ». Le reste garde le même ton, direct et sans détour, et il défend de parler la bouche pleine comme de cracher par-dessus la table.',
    texteEN:
      'La Contenance de la table is a short French poem children learned by heart. It opens with the fingernails: “Assès souvent tes ongles roingne” asks you to trim them often. It turns next to the hands with “Lave tes mains devant disner, et aussy quant vouldras soupper”, which tells you to wash before dinner and before supper alike. The rest keeps the same plain tone, and it forbids talking with your mouth full as firmly as spitting across the table.',
    sources: [
      { nom: 'Wikisource, d’après Romania, t. 47 (1921)', url: 'https://fr.wikisource.org/wiki/La_Contenance_de_la_table' },
    ],
  },
  {
    id: 'paon',
    categorie: 'table',
    origine: 'recherche',
    titreFR: 'Le paon revenait dans ses plumes',
    titreEN: 'The peacock came back in its feathers',
    texteFR:
      'Le cuisinier retirait la peau du paon avec toutes ses plumes et la mettait de côté. La carcasse rôtissait embrochée, le cou maintenu droit pour garder l’allure de l’oiseau vivant. Au moment de servir, la peau et les plumes reprenaient leur place. Le goût comptait peu dans l’affaire : les textes anglais anciens jugeaient cette viande médiocre, et c’est le spectacle que la table venait chercher.',
    texteEN:
      'The cook lifted the peacock’s skin away with all its feathers and set it aside. The carcass roasted on a spit, its neck held upright to keep the bearing of the living bird. At the moment of serving, skin and feathers went back on. Taste counted for little here: Old English sources thought the meat poor, and it was the spectacle the table had come for.',
    sources: [
      { nom: 'English Heritage', url: 'https://www.english-heritage.org.uk/christmas/medieval-christmas-food/' },
    ],
  },
  {
    id: 'epices',
    categorie: 'table',
    origine: 'recherche',
    titreFR: 'Les épices ne cachaient rien',
    titreEN: 'Spices hid nothing',
    texteFR:
      'Vous entendrez souvent que les épices servaient à masquer la viande avariée. Paul Freedman, professeur d’histoire à Yale, défait l’affaire en deux arguments : les épices coûtaient plus cher que la viande, et la viande fraîche se trouvait sans peine. Les registres municipaux gardent d’ailleurs des règlements sévères contre les bouchers négligents. Ce que les épices apportaient vraiment tenait au goût, à la médecine des humeurs et au rang de celui qui pouvait s’en offrir.',
    texteEN:
      'You will often hear that spices were there to cover the taste of spoiled meat. Paul Freedman, professor of history at Yale, undoes the claim in two strokes: spices cost more than meat, and fresh meat was easy to come by. Municipal records even preserve strict rules against careless butchers. What spices really brought was flavour, the medicine of the humours, and the standing of whoever could afford them.',
    sources: [
      { nom: 'Paul Freedman, Yale University', url: 'https://archive-yaleglobal.yale.edu/node/25511' },
    ],
  },

  {
    id: 'pain-a-lenvers',
    categorie: 'table',
    origine: 'festival',
    titreFR: 'Le pain à l’envers',
    titreEN: 'The upside-down bread',
    texteFR:
      'Saviez-vous que la superstition du « on ne met pas le pain à l’envers sur la table » vient d’une entente d’horaire entre le bourreau et le boulanger ?\n\nComme le bourreau se levait souvent très tôt et n’avait pas le temps de s’éterniser à la boulangerie le matin (car attendu par le Roi), le boulanger réservait son pain en le mettant à l’envers à côté des autres afin de bien l’identifier et de servir le bourreau en priorité dès son irruption dans la boulangerie.\n\nPuisque le bourreau était un homme maudit, personne n’osait toucher son pain.\n\nLa superstition a fini au travers des âges par oublier le bourreau et ne garder que la portion « à l’envers » de l’histoire.\n\nCette explication par le bourreau appartient à la tradition rapportée : la Bibliothèque municipale de Lyon note qu’aucune archive n’en garde la trace. La superstition elle-même reste bien réelle et bien documentée.',
    texteEN:
      'Did you know that the superstition behind “never place bread upside down on the table” comes from a scheduling arrangement between the executioner and the baker?\n\nSince the executioner often rose very early and had no time to linger at the bakery in the morning (the King being the one waiting on him), the baker set his loaf aside by turning it upside down next to the others, so it could be spotted and handed to the executioner first the moment he walked in.\n\nSince the executioner was a cursed man, nobody dared touch his bread.\n\nOver the centuries the superstition forgot the executioner and kept only the “upside down” part of the story.\n\nThe executioner explanation belongs to reported tradition: the Bibliothèque municipale de Lyon notes that no archive keeps a trace of it. The superstition itself remains very real and well documented.',
    publication: { date: '2023-08-22', url: 'https://www.facebook.com/photo/?fbid=321295056942715&set=a.198354179236804' },
    sources: [
      { nom: 'Nota Bene, « Pourquoi retourner le pain porte malheur ? »', url: 'https://shows.acast.com/notabenemovies/episodes/pourquoi-retourner-le-pain-porte-malheur' },
      { nom: 'Guichet du Savoir, Bibliothèque municipale de Lyon', url: 'https://www.guichetdusavoir.org/viewtopic.php?f=2&t=55660' },
    ],
  },

  // ── La taverne ────────────────────────────────────────────────────
  {
    id: 'eau-potable',
    categorie: 'taverne',
    origine: 'recherche',
    titreFR: 'L’eau se buvait sans crainte',
    titreEN: 'Water was drunk without fear',
    texteFR:
      'La légende raconte que la bière remplaçait l’eau parce que l’eau rendait malade. Aucun médecin médiéval connu ne conseille rien de tel. Grégoire de Tours décrit au VIe siècle un voyageur qui entre dans une maison pour demander de l’eau. Arnaud de Villeneuve, médecin du XIIIe siècle, écrit que l’eau étanche mieux la soif que le vin. Un témoin parisien raconte en 1389 des fontaines de carrefour qui versaient de l’eau, du vin et du lait.',
    texteEN:
      'The legend says beer replaced water because water made people ill. No known medieval physician advises anything of the sort. Gregory of Tours describes a traveller in the sixth century walking into a house to ask for water. Arnaud de Villeneuve, a thirteenth-century physician, writes that water quenches thirst better than wine. A Parisian witness in 1389 describes crossroad fountains pouring water, wine and milk.',
    sources: [
      { nom: 'Jim Chevallier, historien de l’alimentation', url: 'https://leslefts.blogspot.com/2013/11/the-great-medieval-water-myth.html' },
    ],
  },
  {
    id: 'brasseuses',
    categorie: 'taverne',
    origine: 'recherche',
    titreFR: 'La bière était un métier de femmes',
    titreEN: 'Brewing was women’s work',
    texteFR:
      'Avant la peste noire, l’ale anglaise sortait surtout des mains des femmes, brassée à la maison et vendue au voisinage. Judith Bennett a suivi le renversement dans les archives : à Londres, au début du XVe siècle, un tiers des membres de la guilde des brasseurs étaient encore des femmes. Le capital, les grandes brasseries et l’octroi des licences ont fait le reste, et les femmes ont été poussées vers des métiers plus pauvres.',
    texteEN:
      'Before the Black Death, English ale came mostly from the hands of women, brewed at home and sold to the neighbours. Judith Bennett followed the reversal through the archives: in early fifteenth-century London, a third of the brewers’ guild were still women. Capital, larger breweries and the granting of licences did the rest, and women were pushed toward poorer trades.',
    sources: [
      { nom: 'The Medieval Review, sur Judith Bennett (Oxford, 1996)', url: 'https://scholarworks.iu.edu/journals/index.php/tmr/article/view/14611' },
    ],
  },
  {
    id: 'houblon',
    categorie: 'taverne',
    origine: 'recherche',
    titreFR: 'La bière houblonnée est venue par bateau',
    titreEN: 'Hopped beer arrived by ship',
    texteFR:
      'L’Angleterre buvait de l’ale, brassée sans houblon. La bière houblonnée est arrivée des Pays-Bas avec les immigrants qui s’installaient dans les ports du sud-est, et un envoi de 432 barils part d’Arnemuiden vers Newcastle en 1380. Les Anglais s’en méfient longtemps. En 1398, un brasseur hollandais est encore condamné à l’amende pour avoir acheté du blé au marché afin d’en faire de la bière.',
    texteEN:
      'England drank ale, brewed without hops. Hopped beer came from the Low Countries with the immigrants settling in the south-eastern ports, and a consignment of 432 barrels sailed from Arnemuiden to Newcastle in 1380. The English distrusted it for a long while. In 1398 a Dutch brewer was still fined for buying wheat at market in order to make beer from it.',
    sources: [
      { nom: 'Milan Pajic, Journal of Medieval History (2019)', url: 'https://www.medievalists.net/2019/10/how-beer-came-to-medieval-england/' },
    ],
  },
  {
    id: 'wassail',
    categorie: 'taverne',
    origine: 'recherche',
    titreFR: 'Wassail veut dire portez-vous bien',
    titreEN: 'Wassail means be in good health',
    texteFR:
      'La formule vient du vieux norrois ves heill, sois en bonne santé, et le vieil anglais avait sa jumelle avec wes hál. Les Danois installés en Angleterre en ont fait un toast que les buveurs portaient le verre à la main. Les Anglais l’ont adopté à leur tour vers le milieu du XIIe siècle. Vers 1300, le mot désigne aussi la boisson elle-même, une ale épicée servie aux fêtes de l’hiver.',
    texteEN:
      'The phrase comes from Old Norse ves heill, be healthy, and Old English had its twin in wes hál. Danes settled in England turned it into a toast raised with the cup in hand around the middle of the twelfth century, and the English took it up in turn. By about 1300 the word also named the drink itself, a spiced ale served at the winter feasts.',
    sources: [
      { nom: 'Online Etymology Dictionary', url: 'https://www.etymonline.com/word/wassail' },
    ],
  },

  {
    id: 'auberges',
    categorie: 'taverne',
    origine: 'festival',
    titreFR: 'Les auberges',
    titreEN: 'The inns',
    texteFR:
      'Saviez-vous que les Auberges médiévales étaient rarement dans le même édifice que la taverne ?\n\nRares étaient les villes assez riches pour avoir une auberge et la plupart des gens demandaient l’hospitalité chez les particuliers, même le Roy !',
    texteEN:
      'Did you know that medieval inns were rarely in the same building as the tavern?\n\nFew towns were rich enough to have an inn, and most people asked for hospitality in private homes, the King included!',
    publication: { date: '2023-08-13', url: 'https://www.facebook.com/photo/?fbid=317029457369275&set=a.198354179236804' },
    sources: [
      { nom: 'Medievalists.net, l’auberge médiévale', url: 'https://www.medievalists.net/2015/02/ye-ol-bed-breakfast-look-medieval-inn/' },
    ],
  },

  {
    id: 'lits',
    categorie: 'taverne',
    origine: 'festival',
    titreFR: 'Les lits',
    titreEN: 'The beds',
    texteFR:
      'Saviez-vous que les lits des auberges médiévales étaient énormes, plus grands que les « kings » d’aujourd’hui, car les gens payaient pour une place dans un lit et non une chambre (c’était plus rentable). Les places en bordure de lit étaient donc plus chères.\n\nCe tarif plus élevé en bordure de lit est une tradition rapportée par Nota Bene, plutôt qu’un prix retrouvé dans un registre d’auberge.',
    texteEN:
      'Did you know that the beds in medieval inns were enormous, bigger than today’s “kings”, since people paid for a spot in a bed rather than a room (it was more profitable). The spots along the edge of the bed cost more.\n\nThat higher price for the edge of the bed is a tradition reported by Nota Bene, rather than a rate found in an inn’s ledger.',
    publication: { date: '2023-08-12', url: 'https://www.facebook.com/photo/?fbid=316683647403856&set=a.198354179236804' },
    sources: [
      { nom: 'Nota Bene, « Comment on dormait au Moyen Âge ? »', url: 'https://www.youtube.com/watch?v=QtGhbfrhP2k' },
    ],
  },

  // ── Le marché ─────────────────────────────────────────────────────
  {
    id: 'assise-pain-biere',
    categorie: 'marche',
    origine: 'recherche',
    titreFR: 'Le prix de la bière était dans la loi',
    titreEN: 'The price of ale was written into law',
    texteFR:
      'L’assise anglaise du pain et de la bière fixait le prix au gallon selon le cours du blé, deux gallons pour un penny dans les villes et trois ou quatre au dehors. Le brasseur pris en faute payait l’amende, puis passait au pilori sans pouvoir racheter sa peine. Le texte prévoit une punition à part pour la brasseuse récidiviste, le tombereau ou la chaise à plonger, et il ne prend aucun gant pour le dire.',
    texteEN:
      'The English assize of bread and ale set the price by the gallon against the price of wheat, two gallons for a penny in the towns and three or four outside them. A brewer caught short paid the fine, then went to the pillory with no chance of buying his way out. The text lays down a separate punishment for the woman brewer who offended again, the tumbrel or the ducking stool, and it uses no soft words about it.',
    sources: [
      { nom: 'Fordham University, Medieval Sourcebook', url: 'https://sourcebooks.fordham.edu/source/breadbeer.asp' },
    ],
  },
  {
    id: 'loughborough',
    categorie: 'marche',
    origine: 'recherche',
    titreFR: 'Une charte de 1227 a fermé un marché en 2020',
    titreEN: 'A charter from 1227 closed a market in 2020',
    texteFR:
      'Henri III accorde en 1227 au marché de Loughborough une charte qui interdit tout marché rival à moins de six milles et deux tiers, la distance qu’une famille pouvait faire à pied dans la journée pour aller vendre et revenir. En 2020, le village voisin de Sileby monte un marché de fortune. Le conseil de Charnwood ressort la charte, vieille de sept cent quatre-vingt-treize ans, et fait fermer le marché.',
    texteEN:
      'In 1227 Henry III granted Loughborough market a charter forbidding any rival market within six and two-thirds miles, the distance a household could walk in a day to sell and come home. In 2020 the neighbouring village of Sileby set up a pop-up market. Charnwood council brought out the charter, seven hundred and ninety-three years old, and had the market closed.',
    sources: [
      { nom: 'Medievalists.net', url: 'https://www.medievalists.net/2020/08/pop-up-market/' },
    ],
  },

  {
    id: 'gutenberg',
    categorie: 'marche',
    origine: 'festival',
    titreFR: 'Gutenberg et le pressoir à vin',
    titreEN: 'Gutenberg and the wine press',
    texteFR:
      'Point Culture : Gutenberg, inventeur de la presse à imprimer, n’aurait pas trouvé son idée dans le vide. Au XVe siècle, il habitait Mayence, une région viticole au cœur d’un carrefour de commerce. Les habitants y utilisaient déjà de puissantes presses à vis... mais pour le raisin !\n\nC’est en observant ces énormes presses à vin que Gutenberg aurait imaginé le système de pression qui allait révolutionner le monde du livre. La mécanique du vin a permis l’aventure du papier. La convergence des marchands de vin a permis son expansion. Comme quoi : pas de picole, pas de lecture !',
    texteEN:
      'Culture note: Gutenberg, the inventor of the printing press, did not find his idea out of thin air. In the fifteenth century he lived in Mainz, a wine region at the heart of a trading crossroads. The people there were already using powerful screw presses... but for grapes!\n\nIt is by watching those huge wine presses that Gutenberg is said to have imagined the pressure system that would turn the world of books upside down. The mechanics of wine made the adventure of paper possible. The gathering of wine merchants made it spread. Which goes to show: no drink, no reading!',
    publication: { date: '2025-09-02', url: 'https://www.facebook.com/104412411953069/posts/791732419898974' },
    sources: [
      { nom: 'Gutenberg-Gesellschaft, Mayence', url: 'https://www.gutenberg-gesellschaft.de/en/johannes-gutenberg/gutenberg-in-strasbourg/' },
    ],
  },

  // ── Le camp viking ────────────────────────────────────────────────
  {
    id: 'meduseld',
    categorie: 'camp',
    origine: 'recherche',
    titreFR: 'Tolkien a pris son mot dans Beowulf',
    titreEN: 'Tolkien took his word from Beowulf',
    texteFR:
      'Le vieil anglais « meduseld » veut dire la maison de l’hydromel. Le mot ne paraît qu’une seule fois dans tout Beowulf, au vers 3065, et comme un nom commun : un homme qui habite une salle d’hydromel avec les siens. Tolkien, qui enseignait l’anglo-saxon à Oxford, en a fait le nom propre du palais d’or du Rohan, et c’est par lui que le mot nous est revenu.',
    texteEN:
      'The Old English word “meduseld” means the mead house. It appears only once in all of Beowulf, at line 3065, and as a common noun: a man dwelling in a mead hall with his kinsmen. Tolkien, who taught Anglo-Saxon at Oxford, made it the proper name of the golden hall of Rohan, and it is through him that the word came back to us.',
    sources: [
      { nom: 'A Concordance to Beowulf', url: 'https://www.scholarsonline.org/~drmcm/beoconc/index.php?ltr=m' },
      { nom: 'Tolkien Gateway, « Meduseld »', url: 'https://tolkiengateway.net/wiki/Meduseld' },
    ],
  },
  {
    id: 'ballinderry',
    categorie: 'camp',
    origine: 'recherche',
    titreFR: 'Un plateau d’if dormait au fond d’un lac',
    titreEN: 'A yew game board slept in a lake',
    texteFR:
      'En 1932, les fouilles du crannóg de Ballinderry, en Irlande, ont dégagé un plateau de jeu taillé dans l’if, percé de quarante-neuf trous, avec une tête sculptée à chaque bout qui servait sans doute de poignée. Le site était habité de la fin du IXe siècle au XIe. Le Musée national d’Irlande y voit un plateau de hnefatafl, et le tient pour l’un des plus ornés jamais trouvés dans le pays.',
    texteEN:
      'In 1932 the excavation of the Ballinderry crannóg in Ireland uncovered a gaming board cut from yew, pierced with forty-nine holes, a carved head at either end that likely served as a handle. The site was lived in from the late ninth century to the eleventh. The National Museum of Ireland reads it as a hnefatafl board, and holds it to be one of the most ornate found in the country.',
    sources: [
      { nom: 'National Museum of Ireland', url: 'https://sketchfab.com/3d-models/ballinderry-gaming-board-nmi-19326583-37b904e684594a0caddb2d2da2865616' },
    ],
  },

  {
    id: 'casques-a-cornes',
    categorie: 'camp',
    origine: 'festival',
    titreFR: 'Casques à cornes',
    titreEN: 'Horned helmets',
    texteFR:
      'Saviez-vous que les Vikings ne portaient pas de casques à cornes ? Aucun casque viking retrouvé n’en porte. Le casque de Gjermundbu, le seul casque viking complet connu, n’en garde ni trace ni fixation. L’image vient du dix-neuvième siècle : ce sont les costumes de la Tétralogie de Wagner, en 1876, qui l’ont ancrée pour de bon.',
    texteEN:
      'Did you know that the Vikings did not wear horned helmets? No Viking helmet ever found carries horns. The Gjermundbu helmet, the only complete Viking helmet known, shows no trace or fitting for any. The image comes from the nineteenth century: the costumes of Wagner’s Ring cycle, in 1876, are what fixed it in place for good.',
    publication: { date: '2023-08-21', url: 'https://www.facebook.com/photo/?fbid=320799303658957&set=a.198354179236804' },
    sources: [
      { nom: 'Wikipedia, « Horned helmet »', url: 'https://en.wikipedia.org/wiki/Horned_helmet' },
      { nom: 'Store norske leksikon, « Gjermundbufunnet »', url: 'https://snl.no/Gjermundbufunnet' },
    ],
  },

  {
    id: 'gui',
    categorie: 'camp',
    origine: 'festival',
    titreFR: 'Le gui',
    titreEN: 'The mistletoe',
    texteFR:
      'Saviez-vous que le gui est un parasite ? Lâché par un oiseau après la digestion, il s’incruste lentement de façon invisible dans l’arbre et peut mettre des mois à apparaître. Il pousse lentement au début, mais double à chaque année son nombre de branches. Comme il fleurit au printemps et garde ses baies bien visibles tout l’hiver, quand les autres plantes « meurent », les Druides l’ont associé à la vitalité, à la renaissance et à la fécondité. S’embrasser sous le gui était donc un moyen de se placer sous la protection de l’énergie du gui.\n\nCette lecture druidique du baiser appartient à la légende plutôt qu’à l’archive : sa première trace écrite remonte à l’Angleterre de 1784, bien après l’époque des Druides.',
    texteEN:
      'Did you know that mistletoe is a parasite? Dropped by a bird after digestion, it slowly and invisibly settles into the tree and can take months to appear. It grows slowly at first, but doubles its number of branches every year. Since it flowers in spring and keeps its berries clearly visible through the whole winter, when other plants “die”, the Druids linked it to vitality, rebirth and fertility. Kissing under the mistletoe was therefore a way of placing yourself under the protection of the mistletoe’s energy.\n\nThat druidic reading of the kiss belongs to legend rather than to the archive: its first written trace goes back to England in 1784, long after the age of the Druids.',
    publication: { date: '2023-08-30', url: 'https://www.facebook.com/photo/?fbid=325053303233557&set=a.198354179236804' },
    sources: [
      { nom: 'Wikipédia, « Viscum album »', url: 'https://fr.wikipedia.org/wiki/Viscum_album' },
      { nom: 'Wikipedia, « Mistletoe », la coutume du baiser', url: 'https://en.wikipedia.org/wiki/Mistletoe' },
    ],
  },

  // ── Les jeux ──────────────────────────────────────────────────────
  {
    id: 'tablut-linne',
    categorie: 'jeu',
    origine: 'recherche',
    titreFR: 'Les règles du hnefatafl étaient perdues',
    titreEN: 'The rules of hnefatafl were lost',
    texteFR:
      'Personne n’a jamais écrit les règles du hnefatafl à l’époque où il se jouait. Nous les tenons d’un botaniste : en 1732, Carl von Linné, âgé de vingt-cinq ans, voyage en Laponie, voit des Samis jouer au tablut et note les règles en latin dans son carnet. Le carnet mélange le latin et le suédois, les traductions anciennes se sont trompées, et le jeu que vous prendrez en main sur le site du festival reste une reconstitution.',
    texteEN:
      'Nobody wrote down the rules of hnefatafl while it was still being played. We hold them from a botanist: in 1732 Carl von Linné, twenty-five years old, travelled through Lapland, watched the Sámi play tablut and set the rules down in Latin in his notebook. The notebook mixes Latin with Swedish, the early translations went wrong, and the game you will pick up at the festival remains a reconstruction.',
    sources: [
      { nom: 'Aage Nielsen, jeux de tafl', url: 'https://aagenielsen.dk/tablut_summary.php' },
      { nom: 'Wikipedia, « Tafl games »', url: 'https://en.wikipedia.org/wiki/Tafl_games' },
    ],
  },
  {
    id: 'tafl-asymetrie',
    categorie: 'jeu',
    origine: 'recherche',
    titreFR: 'Le hnefatafl se joue à forces inégales',
    titreEN: 'Hnefatafl is played with uneven sides',
    texteFR:
      'Les deux camps du hnefatafl n’ont ni le même nombre de pièces ni le même but. Un roi et ses défenseurs tiennent le centre et cherchent la sortie. Les assaillants les cernent, environ deux fois plus nombreux selon la taille du plateau. Le nom du jeu réunit deux mots de vieux norrois : hnefi veut dire le poing, et tafl nomme la table de jeu.',
    texteEN:
      'The two sides of hnefatafl hold neither the same number of pieces nor the same goal. A king and his defenders hold the centre and look for a way out. The attackers ring them in, roughly twice as many depending on the size of the board. The name joins two Old Norse words: hnefi means the fist, and tafl names the gaming table.',
    sources: [
      { nom: 'Wikipedia, « Tafl games »', url: 'https://en.wikipedia.org/wiki/Tafl_games' },
      { nom: 'Cleasby-Vigfusson, dictionnaire de vieux norrois', url: 'https://cleasby-vigfusson-dictionary.vercel.app/word/hnefi-2' },
    ],
  },
  {
    id: 'lewis',
    categorie: 'jeu',
    origine: 'recherche',
    titreFR: 'Les pièces de Lewis sont en ivoire de morse',
    titreEN: 'The Lewis chessmen are walrus ivory',
    texteFR:
      'Quatre-vingt-treize pièces de jeu ont refait surface près de la baie d’Uig, sur l’île de Lewis, et furent exposées à Édimbourg en 1831. La plupart sont taillées dans l’ivoire de morse, quelques-unes dans la dent de cachalot. Elles ont sans doute été sculptées en Norvège à la fin du XIIe siècle ou au début du XIIIe. Elles vivent aujourd’hui séparées, entre Édimbourg, Londres et l’île elle-même.',
    texteEN:
      'Ninety-three gaming pieces came back to the surface near Uig bay on the Isle of Lewis, and were shown in Edinburgh in 1831. Most are cut from walrus ivory, a few from sperm-whale teeth. They were probably carved in Norway in the late twelfth or early thirteenth century. They live apart today, between Edinburgh, London and the island itself.',
    sources: [
      { nom: 'National Museums Scotland', url: 'https://www.nms.ac.uk/explore-our-collections/stories/scottish-history-and-archaeology/lewis-chess-pieces/' },
    ],
  },
  {
    id: 'jeux-de-cartes',
    categorie: 'jeu',
    origine: 'festival',
    titreFR: 'Jeux de cartes',
    titreEN: 'Playing cards',
    texteFR:
      'Saviez-vous que les cartes à jouer sont inventées en Chine durant la dynastie Tang, puis atteignent le sultanat Mamelouk du Caire au XIIIe siècle ? Les cartes mameloukes comportent trois figures, dont le malik (roi).\n\nLes cartes à jouer apparaissent en Europe en Catalogne en 1371. Pendant la Révolution française, les figures sont brièvement modifiées pour éviter les références monarchiques. Elles sont remplacées par des forces primaires ou des génies : le Roi de cœur devient le génie de la guerre, celui de carreau le génie du commerce, le trèfle le génie de la paix, et le pique le génie des arts.\n\nEn Allemagne, seul le roi de cœur reste. Pique est remplacé par feuille, carreau par grelot, et le roi de trèfle devient le roi de gland, un nom plus représentatif de notre politique moderne.',
    texteEN:
      'Did you know that playing cards were invented in China during the Tang dynasty, then reached the Mamluk Sultanate of Cairo in the thirteenth century? Mamluk cards carry three court figures, including the malik (king).\n\nPlaying cards appeared in Europe, in Catalonia, in 1371. During the French Revolution the court cards were briefly changed to avoid monarchist references. They were replaced with primal forces or geniuses: the King of Hearts became the genius of war, the King of Diamonds the genius of commerce, the King of Clubs the genius of peace, and the King of Spades the genius of the arts.\n\nIn Germany only the King of Hearts survives. Spades is replaced by leaves, diamonds by bells, and the King of Clubs becomes the king of acorns, a name rather fitting for our modern politics.',
    publication: { date: '2023-08-19', url: 'https://www.facebook.com/photo/?fbid=320139413724946&set=a.198354179236804' },
    sources: [
      { nom: 'Wikipedia, « Mamluk Sultanate (Cairo) »', url: 'https://en.wikipedia.org/wiki/Mamluk_Sultanate_(Cairo)' },
      { nom: 'Wikipedia, « Mamluk playing cards », le paquet de Topkapı', url: 'https://en.wikipedia.org/wiki/Mamluk_playing_cards' },
      { nom: 'Wikipedia, « German-suited playing cards »', url: 'https://en.wikipedia.org/wiki/German-suited_playing_cards' },
    ],
  },
  {
    id: 'cartes-royales',
    categorie: 'jeu',
    origine: 'festival',
    titreFR: 'Cartes royales',
    titreEN: 'The card kings',
    texteFR:
      'Saviez-vous que les rois des jeux de cartes français (le jeu de carte dit « classique ») ont des noms ?\n\nLe Roi de Cœur s’appelle « Charles » ; référence possible à Charlemagne\n\nLe Roi de Carreau s’appelle « César » ; probablement Jules\n\nLe Roi de Trèfle s’appelle « Alexandre », sûrement Alexandre le Grand\n\nLe Roi de Pique : « David », éventuelle référence au David qui a triomphé de Goliath.',
    texteEN:
      'Did you know that the kings of the French pack (the deck we call “classic”) have names?\n\nThe King of Hearts is called “Charles”, a possible reference to Charlemagne\n\nThe King of Diamonds is called “Caesar”, most likely Julius\n\nThe King of Clubs is called “Alexander”, surely Alexander the Great\n\nThe King of Spades: “David”, a possible reference to the David who overcame Goliath.',
    publication: { date: '2023-08-17', url: 'https://www.facebook.com/photo/?fbid=318984917173729&set=a.198354179236804' },
    sources: [
      { nom: 'Wikipédia, « Jeu de cartes français »', url: 'https://fr.wikipedia.org/wiki/Jeu_de_cartes_fran%C3%A7ais' },
      { nom: 'Wikipedia, « Nine Worthies »', url: 'https://en.wikipedia.org/wiki/Nine_Worthies' },
    ],
  },
  {
    id: 'cartes-regines',
    categorie: 'jeu',
    origine: 'festival',
    titreFR: 'Cartes régines',
    titreEN: 'The card queens',
    texteFR:
      'Saviez-vous que les reines des jeux de cartes français (le jeu de cartes dit « classique ») ont des noms ?\n\nDame de cœur : « Judith » ; référence possible à Judith, héroïne biblique qui sauva Béthulie en décapitant Holopherne, le général assyrien de Nabuchodonosor.\n\nDame de carreau : « Rachel » ; peut-être Rachel, autre figure biblique (qui sert de fondement théologique à l’utilisation de servantes à but procréatif dans la dystopie La servante écarlate de Margaret Atwood).\n\nDame de trèfle : « Argine » ; il pourrait s’agir d’une anagramme de regina, « reine » en latin.\n\nDame de pique : « Pallas » ; sûrement Pallas, épiclèse d’Athéna.',
    texteEN:
      'Did you know that the queens of the French pack (the deck we call “classic”) have names?\n\nQueen of Hearts: “Judith”, a possible reference to Judith, the biblical heroine who saved Bethulia by beheading Holofernes, the Assyrian general of Nebuchadnezzar.\n\nQueen of Diamonds: “Rachel”, perhaps another biblical figure (who serves as the theological basis for the use of handmaids for procreative ends in Margaret Atwood’s dystopia The Handmaid’s Tale).\n\nQueen of Clubs: “Argine”, possibly an anagram of regina, Latin for queen.\n\nQueen of Spades: “Pallas”, most likely Pallas, an epithet of Athena.',
    publication: { date: '2023-08-18', url: 'https://www.facebook.com/photo/?fbid=319482463790641&set=a.198354179236804' },
    sources: [
      { nom: 'Wikipedia, « Book of Judith »', url: 'https://en.wikipedia.org/wiki/Book_of_Judith' },
      { nom: 'Wikipédia, « Jeu de cartes français »', url: 'https://fr.wikipedia.org/wiki/Jeu_de_cartes_fran%C3%A7ais' },
    ],
  },

  // ── Le roi ────────────────────────────────────────────────────────
  {
    id: 'magna-carta',
    categorie: 'roi',
    origine: 'festival',
    titreFR: 'La Magna Carta',
    titreEN: 'The Magna Carta',
    texteFR:
      'Saviez-vous que La Magna Carta, signée en 1215 en Angleterre, a établi pour la première fois des principes de gouvernement limité et de droits individuels, jetant les bases du droit constitutionnel moderne ?\n\nElle a contribué à établir le principe selon lequel personne, même le souverain, n’est au-dessus de la loi. Le concept de l’État de droit, dans lequel les gouvernements sont tenus de respecter les droits et les procédures légales, découle en partie de ce document.',
    texteEN:
      'Did you know that the Magna Carta, signed in 1215 in England, set out for the first time the principles of limited government and individual rights, laying the foundations of modern constitutional law?\n\nIt helped establish the principle that nobody, not even the sovereign, stands above the law. The idea of the rule of law, under which governments are held to respect rights and legal procedure, comes in part from this document.',
    publication: { date: '2023-08-16', url: 'https://www.facebook.com/photo/?fbid=318747223864165&set=a.198354179236804' },
    sources: [
      { nom: 'The National Archives, la Magna Carta de 1215', url: 'https://www.nationalarchives.gov.uk/education/resources/magna-carta/british-library-magna-carta-1215-runnymede/' },
      { nom: 'Parlement britannique, ce qu’il en reste aujourd’hui', url: 'https://www.parliament.uk/about/living-heritage/evolutionofparliament/originsofparliament/birthofparliament/overview/magnacarta/magnacartalegacy/' },
    ],
  },
  {
    id: 'roys-cochons',
    categorie: 'roi',
    origine: 'festival',
    titreFR: 'Les bons roys, c’est comme les cochons',
    titreEN: 'Good kings are like pigs',
    texteFR:
      'Et quand le Roy passait, tout le village nettoyait les maisons. Faut comprendre : si le Roy choisit ta piaule, il ne faut pas qu’elle empeste le cochon ! Comme certains paysans vivaient dans leur maison avec leur bétail (pour des raisons de sécurité), le ménage était de mise.',
    texteEN:
      'And when the King came through, the whole village scrubbed the houses. You have to understand: if the King picks your place, it had better not reek of pig! Since some peasants lived in their house alongside their livestock (for safety), a good cleaning was in order.',
    publication: { date: '2023-08-14', url: 'https://www.facebook.com/photo/?fbid=317490513989836&set=a.198354179236804' },
    sources: [
      { nom: 'English Heritage, le village déserté de Wharram Percy', url: 'https://www.english-heritage.org.uk/visit/places/wharram-percy-deserted-medieval-village/history/description/' },
      { nom: 'Dictionnaire historique de la Suisse, le droit de gîte', url: 'https://hls-dhs-dss.ch/fr/articles/013736/' },
    ],
  },

  // ── Notre festival ────────────────────────────────────────────────
  {
    id: 'troupes-nouvelle-france',
    categorie: 'festival',
    origine: 'festival',
    titreFR: 'Les troupes de la Nouvelle-France',
    titreEN: 'The New France troupes',
    texteFR:
      'Saviez-vous qu’au Québec nous avons plus de 10 troupes de reconstitution de la Nouvelle-France ? Cette année au Festival Médiéval de Montpellier, les Habitants de la Nouvelle-France vont vous instruire sur les différents métiers de nos ancêtres. De plus, La Garde du Lys vous contera la merveilleuse histoire des mousquetaires en Nouvelle-France.',
    texteEN:
      'Did you know that here in Quebec we have more than 10 New France reenactment troupes? This year at the Festival Médiéval de Montpellier, les Habitants de la Nouvelle-France will teach you about the various trades of our ancestors. La Garde du Lys will also tell you the marvellous story of the musketeers in New France.',
    publication: { date: '2024-08-07', url: 'https://www.facebook.com/104412411953069/posts/515871394151746' },
    sources: [
      { nom: 'Commission de la mémoire franco-québécoise, seize groupes', url: 'https://cfqlmc.org/seize-groupes-de-reconstitution-historique-du-quebec-rappellent-notre-aventure-commune-avec-les-francais/' },
      { nom: 'Le Soleil, La Garde du Lys', url: 'https://www.lesoleil.com/2016/08/05/les-mysterieux-mousquetaires-de-la-nouvelle-france-e4b3a3b4e07953c2bfc7dbc8b08acd3f/' },
    ],
  },
  {
    id: 'vendredi-dimanche',
    categorie: 'festival',
    origine: 'festival',
    titreFR: 'Du vendredi au dimanche',
    titreEN: 'Friday to Sunday',
    texteFR: 'Saviez-vous que le FMM se déroule du vendredi au dimanche ?',
    texteEN: 'Did you know that the FMM runs from Friday to Sunday?',
    publication: { date: '2024-07-26', url: 'https://www.facebook.com/104412411953069/posts/508667278205491' },
    sources: [
      { nom: 'Festival Médiéval de Montpellier, les dates de 2026', url: 'https://www.festivalmedievaldemontpellier.org/' },
    ],
  },
];
