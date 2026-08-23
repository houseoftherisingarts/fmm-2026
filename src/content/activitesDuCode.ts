// ─── Les activités écrites dans le code ─────────────────────────────
// Ce fichier n'est plus la source de vérité : depuis le 2026-08-23, les
// fiches vivent dans Firestore et se modifient depuis l'admin. Il sert
// de FILET (si la collection est vide, la page affiche ceci) et de
// semence (le bouton « Semer » de l'admin recopie ces fiches une fois).

import type { FicheInput } from '../firebase/activites';

const BRUT: Array<Omit<FicheInput, 'ordre'>> = [
  { titreFR: 'Escrime',          titreEN: 'Fencing',           sousTitreFR: 'et autres combats',                                       sousTitreEN: 'and other combat arts',
    descFR: 'L’escrime artistique et le combat médiéval : sous l’œil du Chevalier Vert, des duels en armure complète, l’épée longue, le combat libre. Toute la gamme de la guerre courtoise et de la guerre brute, présentée par les fines lames du festival.',
    descEN: 'Artistic fencing and medieval combat under the Green Knight’s watch: full-armour duels, longsword fencing, free combat. The full range of courtly war and raw war, performed by the festival’s finest blades.',
    image: '/activites/webp/25880822.webp', categorie: 'combat' },
  { titreFR: 'Sorcières',        titreEN: 'Witches',           sousTitreFR: 'Herboristerie, tissage, artisanat',                       sousTitreEN: 'Herbalism, weaving, crafts',
    descFR: 'Herboristerie, tissage, cuisine ancestrale, sortilèges domestiques. Les sorcières du festival ouvrent leurs grimoires et partagent les savoirs qu’on a presque oubliés : entre racines, fils et chaudron.',
    descEN: 'Herbalism, weaving, ancestral cooking, household spellwork. The festival’s witches open their grimoires and share knowledge that’s almost forgotten: between roots, threads and cauldron.',
    image: '/activites/webp/herboristerie.webp', categorie: 'crafts' },
  { titreFR: 'Démonstrations',   titreEN: 'Demonstrations',    sousTitreFR: 'Forge, savoirs ancestraux',                               sousTitreEN: 'Forge, ancestral knowledge',
    descFR: 'Forge, fonderie, gravure sur os, planage de bois ancestral, tissage. Les artisans-démonstrateurs travaillent devant vous, expliquant chaque geste hérité d’une époque où la matière était travaillée à la main.',
    descEN: 'Forge, foundry, bone engraving, ancestral wood planing, weaving. The demonstrator-artisans work in front of you, explaining each gesture handed down from an age when matter was shaped by hand.',
    image: '/histoire/archives/lievre/thumb/2022-DSC00451.webp', categorie: 'crafts' },
  { titreFR: 'Joutes',           titreEN: 'Jousts',            sousTitreFR: 'Équestres',                                                sousTitreEN: 'On horseback',
    descFR: 'Joutes équestres à la lance et à l’épée. Chevaliers et destriers s’affrontent dans l’arène : une tradition millénaire remise au goût du jour.',
    descEN: 'Mounted joust with lance and sword. Knights and chargers face off in the arena: a thousand-year-old tradition brought up to date.',
    // Recadrée vers la droite : au centre, la tête du cheval et la main
    // gauche du chevalier de gauche tombaient hors cadre (Alex).
    image: '/activites/webp/04ba7d92.webp', imagePos: '38% 50%', categorie: 'combat' },
  { titreFR: 'Spectacles',       titreEN: 'Shows',             sousTitreFR: 'Et musique',                                               sousTitreEN: 'And music',
    descFR: 'Compagnies de scène, musiciens, conteurs, troupes itinérantes. Mystic Projekt, Skarazula, Harfang, Canteraine, Trifolys et plus : du tambour viking aux ballades médiévales.',
    descEN: 'Stage companies, musicians, storytellers, travelling troupes. Mystic Projekt, Skarazula, Harfang, Canteraine, Trifolys and more: from Viking drums to medieval ballads.',
    image: '/activites/webp/145157f8.webp', categorie: 'shows' },
  { titreFR: 'Marché',           titreEN: 'Market',            sousTitreFR: 'Artisans et foire locale',                                 sousTitreEN: 'Artisans and local fair',
    descFR: 'Une cinquantaine d’artisans et marchands d’époque. Forgerons, costumiers, bijoutiers, brasseurs, herboristes. Achetez local, en armure ou en bourgeois.',
    descEN: 'Some fifty period artisans and merchants. Smiths, costumers, jewellers, brewers, herbalists. Buy local, in armour or in burgher’s garb.',
    // marchand.jpg était une bande 1100×300 : recadrée en tuile, il ne
    // restait que la bouche du marchand. Remplacée par la marchande à
    // son étal (wix/marche/17069f62), convertie au format des tuiles.
    image: '/activites/webp/marche-etal.webp', categorie: 'crafts' },
  { titreFR: 'Vikings',          titreEN: 'Vikings',           sousTitreFR: 'Campement et combats',                                     sousTitreEN: 'Camp and combat',
    descFR: 'Le campement viking dresse ses tentes au cœur du festival. Combats vikings dans l’arène, concours culinaire au camp, parcours d’herboristerie : la vie nordique, grandeur nature.',
    descEN: 'The Viking camp pitches its tents at the heart of the festival. Viking combat in the arena, cooking contest at the camp, herbalism trail: Norse life, full scale.',
    image: '/histoire/archives/lena/thumb/2025-IMG_4659.webp', categorie: 'combat' },
  { titreFR: 'Espace Jeunesse',  titreEN: 'Youth Space',       sousTitreFR: 'Parc, jeux, animations, gardiennage',                     sousTitreEN: 'Park, games, activities, supervision',
    descFR: 'Un campement réservé aux jeunes seigneurs : ateliers d’écuyer, jeux d’adresse, contes, gardiennage encadré. L’enfance médiévale, mais sans la peste.',
    descEN: 'A camp reserved for young lords: squire workshops, skill games, tales, supervised babysitting. Medieval childhood, but without the plague.',
    image: '/activites/webp/4027b51a.webp', categorie: 'family' },
  { titreFR: 'À Boire !',        titreEN: 'Drink!',            sousTitreFR: 'Bières des Brasseurs Philosophales et autres rinces-gosier', sousTitreEN: 'Beers from Brasseurs Philosophales and other tipples',
    descFR: 'Bières des Brasseurs Philosophales, hydromels, vins épicés, infusions sans alcool. Plusieurs estaminets répartis sur le site pour étancher la soif des aventuriers.',
    descEN: 'Beers from Brasseurs Philosophales, meads, spiced wines, alcohol-free infusions. Several taverns across the site to quench adventurers’ thirst.',
    image: '/activites/webp/a-boire.webp', categorie: 'ripaille' },
  { titreFR: 'Soirée Dansante',  titreEN: 'Dance Party',       sousTitreFR: 'Ateliers éducatifs',                                       sousTitreEN: 'Educational workshops',
    descFR: 'La nuit venue, le feu prend, les tambours s’animent et le festival devient un grand bal médiéval. Ouvert à tous : gigue ou bourrée, on y danse autour des flammes jusqu’au matin.',
    descEN: 'Once night falls, the fire kindles, the drums come alive and the festival becomes a great medieval ball. Open to all: jig or bourrée, danced around the flames till morning.',
    image: '/activites/webp/danse-jupe-mauve.webp', categorie: 'shows' },
  { titreFR: 'Boustifaille',     titreEN: 'Feast',             sousTitreFR: 'La becquetance et la ripaille avec le nouveau village gustatif', sousTitreEN: 'Eating and feasting at the new food village',
    descFR: 'Le nouveau village gustatif : cuisines de clans, table d’hôte, banquet de l’équinoxe. Cochon de lait, pain plat, ragoûts, pâtisseries d’époque. La becquetance et la ripaille, comme nous les aimons.',
    descEN: 'The new food village: clan kitchens, table d’hôte, equinox banquet. Suckling pig, flatbread, stews, period pastries. Feasting and merrymaking as we love it.',
    image: '/activites/webp/1f021070.webp', categorie: 'ripaille' },
  { titreFR: 'Clinique Équestre',titreEN: 'Equestrian Clinic', sousTitreFR: 'Prochaine édition',                                        sousTitreEN: 'Next edition',
    descFR: 'La clinique équestre fait relâche cette année : elle reviendra à la prochaine édition. Pour les cavaliers expérimentés : cours intensifs sous les conseils des maîtres écuyers du festival.',
    descEN: 'The equestrian clinic is on hiatus this year: it returns next edition. For experienced riders: intensive courses under the festival’s master squires.',
    image: '/activites/webp/1c869c8b.webp', categorie: 'family', retiree: true },
  { titreFR: 'Village Paysan',   titreEN: 'Peasant Village',   sousTitreFR: 'Artisans au travail',                                      sousTitreEN: 'Artisans at work',
    descFR: 'Le campement des métiers : forge, tissage, équarrissage, gravure sur os. Les artisans y vivent la fin de semaine entière et travaillent sous vos yeux, entre les souches et les tentes de toile.',
    descEN: 'The camp of trades: forge, weaving, squaring, bone engraving. The artisans live there all weekend and work before your eyes, among stumps and canvas tents.',
    image: '/histoire/archives/lena/thumb/2025-IMG_8011.webp', categorie: 'crafts' },
  { titreFR: 'Tournois',         titreEN: 'Tournaments',       sousTitreFR: 'Avec l’AMQ',                                               sousTitreEN: 'With the AMQ',
    descFR: 'Les activités de l’Association Médiévale du Québec (AMQ), à l’horaire dans l’arène : les Chevaliers, la Joute AMQ, le Jeu du peuple et la Finale de joute du dimanche.',
    descEN: 'The activities of the Association Médiévale du Québec (AMQ), scheduled in the arena: the Knights, the AMQ Joust, the People’s Game and Sunday’s Joust Final.',
    image: '/activites/webp/tournoi-epees.webp', categorie: 'combat' },
];

export const ACTIVITES_DU_CODE: FicheInput[] = BRUT.map((f, i) => ({ ...f, ordre: i }));
