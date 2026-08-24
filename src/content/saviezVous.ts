// ─── Saviez-vous que ────────────────────────────────────────────────
// Le carnet de faits du festival. Chaque fait porte sa source, et
// chaque source a été ouverte et lue avant d'être inscrite ici.
//
// Deux provenances cohabitent :
//   · 'recherche' → vérifié en dictionnaire, en archive ou en musée.
//     Au moins une source consultable, exigée par le type.
//   · 'festival'  → repris d'une publication de notre page. Ses mots
//     restent les siens : seule une faute évidente se corrige.
//
// Ajouter un fait consiste à ajouter un objet au tableau FAITS, rien
// de plus. Le composant ne connaît aucun fait par son nom.

export type CategorieFait = 'mots' | 'table' | 'taverne' | 'marche' | 'camp' | 'jeu';

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
];
