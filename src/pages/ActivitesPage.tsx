import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { IconGoblet, IconScroll, IconLozenge } from '../components/icons/Medieval';
import { addLocale } from '../lib/locale';
import { watchSchedule, CURRENT_SCHEDULE_YEAR, type ScheduleDay } from '../firebase/schedule';
import { watchProgFlags, PROG_FLAGS_DEFAULTS, type ProgFlags } from '../firebase/programmationFlags';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { useSfx, useHoverSfx } from '../components/marche/effects';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import BehourdRegistrationForm from '../components/activites/BehourdRegistrationForm';
import {
  Eyebrow,
  DisplayTitle,
  HexPanel,
  HexMark,
  GildedFrame,
  SectionTopRail,
  SectionBottomRail,
} from '../components/marche/atmospherics';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ── L'horaire de l'ÉDITION 2025, montré comme souvenir en attendant
// celui de 2026 (décision d'Alex, 2026-08-03) : il donne une idée
// fidèle du rythme d'une journée sans rien promettre. Les journées ne
// portent plus de date : coller les dates 2026 sur des événements 2025
// aurait été un mensonge. Quand l'horaire 2026 arrivera (via l'admin ou
// ici), ce bloc reprendra des dates.
const SCHEDULE = [
  {
    dateFR: 'Vendredi',
    dateEN: 'Friday',
    items: [
      { time: '17h00', label: 'Ouverture des portes',                                 where: 'Site' },
      { time: '17h00', label: 'Ouverture de la Boustifaille : Village Bouffe',        where: 'Village gustatif' },
      { time: '18h00', label: 'Spectacle d’Arrünn',                                    where: 'Scène' },
      { time: '19h00', label: 'Danse des Völvas',                                      where: 'Autour du feu' },
      { time: '19h15', label: 'Spectacle de Trifolys',                                 where: 'Scène' },
    ],
  },
  {
    dateFR: 'Samedi',
    dateEN: 'Saturday',
    items: [
      { time: '10h00',       label: 'Ouverture des portes',                            where: 'Site' },
      { time: '11h00–11h30', label: 'Démonstration de tissage',                        where: 'Village paysan' },
      { time: '11h15–12h15', label: 'Clinique équestre',                               where: 'Arène' },
      { time: '11h30–12h00', label: 'Démonstration cotte de mailles',                  where: 'Village paysan' },
      { time: '12h00–12h30', label: 'Démonstration d’équarrissage',                    where: 'Village paysan' },
      { time: '13h00–14h00', label: 'Combat viking',                                   where: 'Arène' },
      { time: '14h00–14h30', label: 'Démonstration de forge',                          where: 'Village paysan' },
      { time: '14h45–15h00', label: 'Démonstration de gravure sur os',                 where: 'Village paysan' },
      { time: '14h45–15h45', label: 'Joute',                                           where: 'Arène' },
      { time: '15h45–16h15', label: 'Parcours d’herboristerie',                        where: 'Village paysan' },
      { time: '15h45–16h15', label: 'Démonstration de planage de bois ancestral',      where: 'Village paysan' },
      { time: '16h00–16h30', label: 'Conférence : Construction du Drakkar',            where: 'Village viking' },
      { time: '16h30–17h00', label: 'Concours culinaire',                              where: 'Campement viking' },
      { time: '18h00–18h30', label: 'Démonstration de fonderie de fer',                where: 'Village paysan' },
      { time: '18h30–19h30', label: 'Spectacle de Harfang',                            where: 'Scène' },
      { time: '19h00–19h30', label: 'Parade',                                          where: 'Village paysan' },
      { time: '19h30–19h45', label: 'Allumage du feu + Danse des Berserkirs',          where: 'Feu' },
      { time: '19h45–20h45', label: 'Spectacle de Mystic Projekt',                     where: 'Scène' },
      { time: '20h45–21h00', label: 'Spectacle de feu',                                where: 'Feu' },
      { time: '21h00',       label: 'Spectacle de Skarazula',                          where: 'Scène' },
    ],
  },
  {
    dateFR: 'Dimanche',
    dateEN: 'Sunday',
    items: [
      { time: '11h00–12h00', label: 'Jeu équestre',                                    where: 'Arène' },
      { time: '11h45–12h15', label: 'Parcours d’herboristerie',                        where: 'Village paysan' },
      { time: '11h45–12h15', label: 'Démonstration de forge',                          where: 'Village paysan' },
      { time: '12h00–13h00', label: 'Cérémonie de Freya : Célébration de l’équinoxe',  where: 'Camp viking' },
      { time: '13h00–14h00', label: 'Spectacle de Canteraine',                         where: 'Scène' },
      { time: '13h00–15h00', label: 'Banquet de l’Équinoxe',                            where: 'Scène' },
      { time: '13h30–15h00', label: 'Tournoi de bridge fight',                         where: 'Arène' },
      { time: '14h30–15h00', label: 'Démonstration de fonderie de fer',                where: 'Village paysan' },
    ],
  },
];

// ── Petit glossaire de l'horaire ────────────────────────────────────
// Cliquer un événement de l'horaire ouvre une petite fiche qui explique
// ce que c'est (demande d'Alex, 2026-08-20). Le premier libellé dont un
// mot-clé apparaît dans le nom de l'événement gagne; les événements sans
// fiche (spectacles d'artistes, ouverture des portes déjà claire) ne
// sont simplement pas cliquables. Textes = premier jet, à raffiner.
const strip = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const EVENT_INFO: Array<{ keys: string[]; FR: string; EN: string }> = [
  { keys: ['finale de joute', 'joute'],
    FR: 'La joute équestre : deux cavaliers en armure s’élancent l’un vers l’autre au galop, lance au poing, pour rompre leur bois sur l’écu de l’adversaire. Présentée par l’Association Médiévale du Québec (AMQ).',
    EN: 'The mounted joust: two armoured riders charge each other at full gallop, lance in hand, to break their lance on the opponent’s shield. Presented by the Association Médiévale du Québec (AMQ).' },
  { keys: ['jeu du peuple'],
    FR: 'Les chevaliers de l’AMQ invitent le public dans l’arène : jeux d’adresse et d’audace où petits et grands se mesurent aux cavaliers.',
    EN: 'The AMQ knights invite the public into the arena: games of skill and daring where young and old measure up to the riders.' },
  { keys: ['chevaliers'],
    FR: 'Les chevaliers de l’AMQ et leurs destriers : démonstrations de jeux équestres médiévaux, d’adresse à cheval et de maniement d’armes.',
    EN: 'The AMQ knights and their chargers: demonstrations of medieval mounted games, horseback skill and weapons handling.' },
  { keys: ['clinique equestre', 'jeu equestre'],
    FR: 'Jeux médiévaux à cheval, encadrés par l’AMQ : joutes légères, anneaux, adresse à la lance, dans une ambiance conviviale et sécuritaire.',
    EN: 'Medieval mounted games, hosted by the AMQ: light jousting, rings, lance skill, in a friendly and safe setting.' },
  { keys: ['combat viking', 'combats vikings'],
    FR: 'Les clans s’affrontent en mêlée, boucliers levés et acier émoussé : du combat viking mené par des combattants entraînés.',
    EN: 'The clans clash in melee, shields raised and blunted steel: Viking combat performed by trained fighters.' },
  { keys: ['demonstration de forge', 'forge'],
    FR: 'Le forgeron travaille le fer au feu et à l’enclume, sous vos yeux : chauffe, martelage, trempe, comme il y a mille ans.',
    EN: 'The blacksmith works iron at fire and anvil before your eyes: heating, hammering, quenching, as a thousand years ago.' },
  { keys: ['herboristerie'],
    FR: 'Un parcours guidé parmi les plantes : reconnaître, cueillir et préparer les remèdes et infusions d’autrefois.',
    EN: 'A guided walk among the plants: recognizing, gathering and preparing the remedies and infusions of old.' },
  { keys: ['tissage'],
    FR: 'Du fil à l’étoffe : démonstration de tissage et de filage sur les métiers d’époque du village paysan.',
    EN: 'From thread to cloth: weaving and spinning demonstrated on the peasant village’s period looms.' },
  { keys: ['cotte de mailles'],
    FR: 'Anneau par anneau, l’artisan assemble la cotte de mailles : l’armure souple qui a protégé les guerriers pendant des siècles.',
    EN: 'Ring by ring, the artisan assembles chainmail: the flexible armour that protected warriors for centuries.' },
  { keys: ['equarrissage'],
    FR: 'À la hache et au fil, la bille de bois devient poutre : l’équarrissage, geste fondateur de la charpente ancestrale.',
    EN: 'By axe and line, the log becomes a beam: squaring, the founding gesture of ancestral carpentry.' },
  { keys: ['gravure sur os'],
    FR: 'Motifs et runes gravés dans l’os, comme sur les artefacts retrouvés dans les campements nordiques.',
    EN: 'Patterns and runes engraved in bone, as on artifacts found in Norse camps.' },
  { keys: ['planage'],
    FR: 'Le planage de bois ancestral : lisser la planche au rabot et à la plane, sans machine, à la seule force du geste.',
    EN: 'Ancestral wood planing: smoothing the board with plane and drawknife, no machines, by strength of hand alone.' },
  { keys: ['fonderie'],
    FR: 'Le métal en fusion coulé au moule, sous vos yeux : la fonderie comme la pratiquaient les artisans d’autrefois.',
    EN: 'Molten metal poured into the mould before your eyes: foundry work as artisans practised it long ago.' },
  { keys: ['drakkar'],
    FR: 'Conférence sur la construction du drakkar : comment les charpentiers nordiques bâtissaient les navires qui ont traversé les mers.',
    EN: 'A talk on drakkar construction: how Norse shipwrights built the vessels that crossed the seas.' },
  { keys: ['concours culinaire'],
    FR: 'Les cuisiniers du campement s’affrontent au feu de bois : plats d’inspiration d’époque, jugés et goûtés au camp viking.',
    EN: 'The camp cooks face off over the wood fire: period-inspired dishes, judged and tasted at the Viking camp.' },
  { keys: ['ceremonie de freya'],
    FR: 'Cérémonie nordique de l’équinoxe : chants, feu et offrandes pour saluer le passage de la saison, dans la tradition de Freya.',
    EN: 'Norse equinox ceremony: songs, fire and offerings to greet the turning season, in the tradition of Freya.' },
  { keys: ['banquet'],
    FR: 'Le grand repas du festival : tablées, service d’époque et spectacles pendant que l’on festoie. Places limitées.',
    EN: 'The festival’s great feast: long tables, period service and shows while everyone feasts. Limited seats.' },
  { keys: ['bridge fight', 'boat fight'],
    FR: 'Deux équipes s’affrontent sur une passerelle étroite : le premier qui tombe a perdu. Simple, spectaculaire, et personne n’en sort sec.',
    EN: 'Two teams battle on a narrow walkway: first one down loses. Simple, spectacular, and nobody leaves dry.' },
  { keys: ['parade'],
    FR: 'Troupes, clans et artisans défilent à travers le village : la grande parade du festival.',
    EN: 'Troupes, clans and artisans march through the village: the festival’s great parade.' },
  { keys: ['allumage du feu'],
    FR: 'L’allumage solennel du grand feu, cœur des soirées du festival.',
    EN: 'The solemn lighting of the great fire, heart of the festival’s evenings.' },
  { keys: ['spectacle de feu'],
    FR: 'Cracheurs et jongleurs de feu embrasent la nuit : un spectacle incandescent à voir une fois le soleil couché.',
    EN: 'Fire breathers and jugglers set the night ablaze: an incandescent show once the sun is down.' },
  { keys: ['danse aerienne'],
    FR: 'Acrobaties aériennes sur tissus et agrès : la grâce du cirque suspendue au-dessus du festival.',
    EN: 'Aerial acrobatics on silks and rigging: circus grace suspended above the festival.' },
  { keys: ['marionnette geante'],
    FR: 'Une marionnette géante déambule parmi la foule, animée par ses marionnettistes : levez les yeux.',
    EN: 'A giant puppet roams the crowd, brought to life by its puppeteers: look up.' },
  { keys: ['cerfs-volants'],
    FR: 'Concours de cerfs-volants dans l’arène : fabriqués ou apportés, les plus beaux vols sont salués.',
    EN: 'Kite contest in the arena: built or brought, the finest flights take the honours.' },
  { keys: ['hobby horse'],
    FR: 'Le tournoi à cheval… de bois : parcours et épreuves à dos de hobby horse, aussi sérieux que désopilant.',
    EN: 'The tournament on… hobby horses: courses and trials astride wooden steeds, as serious as it is hilarious.' },
  { keys: ['conference boheme', 'conference gypsy'],
    FR: 'Conférence sur la culture bohème et la vie en caravane : l’histoire des peuples voyageurs qui inspire l’édition Caravanes et Saltimbanques.',
    EN: 'A talk on bohemian culture and caravan life: the history of travelling peoples that inspires the Caravans and Entertainers edition.' },
  { keys: ['vente aux encheres'],
    FR: 'Les pièces forgées pendant la fin de semaine passent aux enchères : repartez avec un objet né sous vos yeux.',
    EN: 'The pieces forged over the weekend go to auction: leave with an object born before your eyes.' },
  { keys: ['burlesque'],
    FR: 'Cabaret burlesque à la taverne, une fois la nuit tombée. Pour public averti.',
    EN: 'Burlesque cabaret at the tavern once night falls. Mature audiences.' },
  { keys: ['boustifaille', 'village bouffe'],
    FR: 'Le village gustatif ouvre ses cuisines : plats d’inspiration médiévale, becquetance et ripaille pour toute la fin de semaine.',
    EN: 'The food village opens its kitchens: medieval-inspired dishes, feasting and merrymaking all weekend long.' },
];
function infoFor(label: string, lang: 'FR' | 'EN'): string | null {
  const l = strip(label);
  const hit = EVENT_INFO.find((e) => e.keys.some((k) => l.includes(k)));
  return hit ? hit[lang] : null;
}

type Category = 'combat' | 'crafts' | 'shows' | 'ripaille' | 'family';

// ── Activity feature cards. Images sourced from public/wix/*: hashed
// Wix filenames mapped to the closest thematic match. Category drives
// the filter chips / arrow navigation. `descFR/descEN` are the long
// descriptions revealed when a tile is clicked (flip-expand modal).
const ACTIVITIES: Array<{
  titleFR: string;
  titleEN: string;
  bodyFR:  string;
  bodyEN:  string;
  descFR:  string;
  descEN:  string;
  image:   string;
  /** Cadrage de la photo quand le centre coupe le sujet (Alex, 2026-08-22). */
  imagePos?: string;
  category: Category;
  /** Activité en relâche : tuile grisée, mention « prochaine édition ». */
  retiree?: boolean;
}> = [
  { titleFR: 'Escrime',          titleEN: 'Fencing',           bodyFR: 'et autres combats',                                       bodyEN: 'and other combat arts',
    descFR: 'L’escrime artistique et le combat médiéval : sous l’œil du Chevalier Vert, des duels en armure complète, l’épée longue, le combat libre. Toute la gamme de la guerre courtoise et de la guerre brute, présentée par les fines lames du festival.',
    descEN: 'Artistic fencing and medieval combat under the Green Knight’s watch: full-armour duels, longsword fencing, free combat. The full range of courtly war and raw war, performed by the festival’s finest blades.',
    image: '/activites/webp/25880822.webp', category: 'combat' },
  { titleFR: 'Sorcières',        titleEN: 'Witches',           bodyFR: 'Herboristerie, tissage, artisanat',                       bodyEN: 'Herbalism, weaving, crafts',
    descFR: 'Herboristerie, tissage, cuisine ancestrale, sortilèges domestiques. Les sorcières du festival ouvrent leurs grimoires et partagent les savoirs qu’on a presque oubliés : entre racines, fils et chaudron.',
    descEN: 'Herbalism, weaving, ancestral cooking, household spellwork. The festival’s witches open their grimoires and share knowledge that’s almost forgotten: between roots, threads and cauldron.',
    image: '/activites/webp/volvas.webp', category: 'crafts' },
  { titleFR: 'Démonstrations',   titleEN: 'Demonstrations',    bodyFR: 'Forge, savoirs ancestraux',                               bodyEN: 'Forge, ancestral knowledge',
    descFR: 'Forge, fonderie, gravure sur os, planage de bois ancestral, tissage. Les artisans-démonstrateurs travaillent devant vous, expliquant chaque geste hérité d’une époque où la matière était travaillée à la main.',
    descEN: 'Forge, foundry, bone engraving, ancestral wood planing, weaving. The demonstrator-artisans work in front of you, explaining each gesture handed down from an age when matter was shaped by hand.',
    image: '/histoire/archives/lievre/thumb/2022-DSC00451.webp', category: 'crafts' },
  { titleFR: 'Joutes',           titleEN: 'Jousts',            bodyFR: 'Équestres',                                                bodyEN: 'On horseback',
    descFR: 'Joutes équestres à la lance et à l’épée. Chevaliers et destriers s’affrontent dans l’arène : une tradition millénaire remise au goût du jour.',
    descEN: 'Mounted joust with lance and sword. Knights and chargers face off in the arena: a thousand-year-old tradition brought up to date.',
    // Recadrée vers la droite : au centre, la tête du cheval et la main
    // gauche du chevalier de gauche tombaient hors cadre (Alex).
    image: '/activites/webp/04ba7d92.webp', imagePos: '62% 50%', category: 'combat' },
  { titleFR: 'Spectacles',       titleEN: 'Shows',             bodyFR: 'Et musique',                                               bodyEN: 'And music',
    descFR: 'Compagnies de scène, musiciens, conteurs, troupes itinérantes. Mystic Projekt, Skarazula, Harfang, Canteraine, Trifolys et plus : du tambour viking aux ballades médiévales.',
    descEN: 'Stage companies, musicians, storytellers, travelling troupes. Mystic Projekt, Skarazula, Harfang, Canteraine, Trifolys and more: from Viking drums to medieval ballads.',
    image: '/activites/webp/145157f8.webp', category: 'shows' },
  { titleFR: 'Marché',           titleEN: 'Market',            bodyFR: 'Artisans et foire locale',                                 bodyEN: 'Artisans and local fair',
    descFR: 'Une cinquantaine d’artisans et marchands d’époque. Forgerons, costumiers, bijoutiers, brasseurs, herboristes. Achetez local, en armure ou en bourgeois.',
    descEN: 'Some fifty period artisans and merchants. Smiths, costumers, jewellers, brewers, herbalists. Buy local, in armour or in burgher’s garb.',
    // marchand.jpg était une bande 1100×300 : recadrée en tuile, il ne
    // restait que la bouche du marchand. Remplacée par la marchande à
    // son étal (wix/marche/17069f62), convertie au format des tuiles.
    image: '/activites/webp/marche-etal.webp', category: 'crafts' },
  { titleFR: 'Vikings',          titleEN: 'Vikings',           bodyFR: 'Campement et combats',                                     bodyEN: 'Camp and combat',
    descFR: 'Le campement viking dresse ses tentes au cœur du festival. Combats vikings dans l’arène, concours culinaire au camp, parcours d’herboristerie : la vie nordique, grandeur nature.',
    descEN: 'The Viking camp pitches its tents at the heart of the festival. Viking combat in the arena, cooking contest at the camp, herbalism trail: Norse life, full scale.',
    image: '/histoire/archives/lena/thumb/2025-IMG_4659.webp', category: 'combat' },
  { titleFR: 'Espace Jeunesse',  titleEN: 'Youth Space',       bodyFR: 'Parc, jeux, animations, gardiennage',                     bodyEN: 'Park, games, activities, supervision',
    descFR: 'Un campement réservé aux jeunes seigneurs : ateliers d’écuyer, jeux d’adresse, contes, gardiennage encadré. L’enfance médiévale, mais sans la peste.',
    descEN: 'A camp reserved for young lords: squire workshops, skill games, tales, supervised babysitting. Medieval childhood, but without the plague.',
    image: '/wix/jeunesse/3893a56a.jpg', category: 'family' },
  { titleFR: 'À Boire !',        titleEN: 'Drink!',            bodyFR: 'Bières des Brasseurs Philosophales et autres rinces-gosier', bodyEN: 'Beers from Brasseurs Philosophales and other tipples',
    descFR: 'Bières des Brasseurs Philosophales, hydromels, vins épicés, infusions sans alcool. Plusieurs estaminets répartis sur le site pour étancher la soif des aventuriers.',
    descEN: 'Beers from Brasseurs Philosophales, meads, spiced wines, alcohol-free infusions. Several taverns across the site to quench adventurers’ thirst.',
    image: '/activites/webp/a-boire.webp', category: 'ripaille' },
  { titleFR: 'Soirée Dansante',  titleEN: 'Dance Party',       bodyFR: 'Ateliers éducatifs',                                       bodyEN: 'Educational workshops',
    descFR: 'La nuit venue, le feu prend, les tambours s’animent et le festival devient un grand bal médiéval. Ouvert à tous : gigue ou bourrée, on y danse autour des flammes jusqu’au matin.',
    descEN: 'Once night falls, the fire kindles, the drums come alive and the festival becomes a great medieval ball. Open to all: jig or bourrée, danced around the flames till morning.',
    image: '/activites/webp/danse-jupes.webp', category: 'shows' },
  { titleFR: 'Boustifaille',     titleEN: 'Feast',             bodyFR: 'La becquetance et la ripaille avec le nouveau village gustatif', bodyEN: 'Eating and feasting at the new food village',
    descFR: 'Le nouveau village gustatif : cuisines de clans, table d’hôte, banquet de l’équinoxe. Cochon de lait, pain plat, ragoûts, pâtisseries d’époque. La becquetance et la ripaille, comme nous les aimons.',
    descEN: 'The new food village: clan kitchens, table d’hôte, equinox banquet. Suckling pig, flatbread, stews, period pastries. Feasting and merrymaking as we love it.',
    image: '/activites/webp/1f021070.webp', category: 'ripaille' },
  { titleFR: 'Clinique Équestre',titleEN: 'Equestrian Clinic', bodyFR: 'Prochaine édition',                                        bodyEN: 'Next edition',
    descFR: 'La clinique équestre fait relâche cette année : elle reviendra à la prochaine édition. Pour les cavaliers expérimentés : cours intensifs sous les conseils des maîtres écuyers du festival.',
    descEN: 'The equestrian clinic is on hiatus this year: it returns next edition. For experienced riders: intensive courses under the festival’s master squires.',
    image: '/activites/webp/1c869c8b.webp', category: 'family', retiree: true },
  { titleFR: 'Village Paysan',   titleEN: 'Peasant Village',   bodyFR: 'Artisans au travail',                                      bodyEN: 'Artisans at work',
    descFR: 'Le campement des métiers : forge, tissage, équarrissage, gravure sur os. Les artisans y vivent la fin de semaine entière et travaillent sous vos yeux, entre les souches et les tentes de toile.',
    descEN: 'The camp of trades: forge, weaving, squaring, bone engraving. The artisans live there all weekend and work before your eyes, among stumps and canvas tents.',
    image: '/histoire/archives/lena/thumb/2025-IMG_8011.webp', category: 'crafts' },
  { titleFR: 'Tournois',         titleEN: 'Tournaments',       bodyFR: 'Avec l’AMQ',                                               bodyEN: 'With the AMQ',
    descFR: 'Les activités de l’Association Médiévale du Québec (AMQ), à l’horaire dans l’arène : les Chevaliers, la Joute AMQ, le Jeu du peuple et la Finale de joute du dimanche.',
    descEN: 'The activities of the Association Médiévale du Québec (AMQ), scheduled in the arena: the Knights, the AMQ Joust, the People’s Game and Sunday’s Joust Final.',
    image: '/activites/webp/4027b51a.webp', category: 'combat' },
];

const CATEGORIES = ['all', 'combat', 'crafts', 'shows', 'ripaille', 'family'] as const;
type FilterKey = typeof CATEGORIES[number];

const ROMAN = ['I', 'II', 'III'] as const;

// Four lit gold L-ticks pinned to a parent's corners: marks the
// active inventory cell. Pure CSS, no SVG, no hex clipping conflict.
const CornerTicks: React.FC = () => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: 'var(--color-amber-glow)',
    filter: 'drop-shadow(0 0 4px rgba(232, 177, 74, 0.7))',
    pointerEvents: 'none',
  };
  return (
    <>
      <span aria-hidden style={{ ...base, top: 4, left:  4, borderTop:    '1.5px solid', borderLeft:  '1.5px solid' }} />
      <span aria-hidden style={{ ...base, top: 4, right: 4, borderTop:    '1.5px solid', borderRight: '1.5px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 4, left:  4, borderBottom: '1.5px solid', borderLeft:  '1.5px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 4, right: 4, borderBottom: '1.5px solid', borderRight: '1.5px solid' }} />
    </>
  );
};

// ─── HUD primitives: inventory header/footer chrome ──────────────────
// Round arrow button used on either side of the filter chip rail. Drives
// the prev/next filter cycle so the menu is navigable without touching
// a chip directly.
const HudArrow: React.FC<{
  icon:      React.ReactNode;
  onClick:   () => void;
  ariaLabel: string;
}> = ({ icon, onClick, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className="inline-flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-full transition hover:scale-110"
    style={{
      background: 'linear-gradient(180deg, rgba(232, 177, 74, 0.10), rgba(232, 177, 74, 0.02))',
      color: 'var(--color-amber-glow)',
      border: '1px solid rgba(232, 177, 74, 0.35)',
      boxShadow: 'inset 0 1px 0 rgba(255, 241, 181, 0.18)',
    }}
  >
    {icon}
  </button>
);

const HudMeter: React.FC<{
  label:  string;
  value:  number;          // 0-100
  accent: 'amber' | 'copper';
  align?: 'left' | 'right';
}> = ({ label, value, accent, align = 'left' }) => {
  const color = accent === 'amber' ? 'var(--color-amber-glow)' : 'var(--color-copper)';
  return (
    <div className={`flex flex-col gap-1.5 ${align === 'right' ? 'md:items-end md:text-right' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-sans uppercase tracking-[0.3em] text-[10px]"
              style={{ color: 'rgba(244, 239, 227, 0.65)' }}>
          {label}
        </span>
        <span className="font-display title-medieval text-sm" style={{ color }}>
          {value}%
        </span>
      </div>
      <div
        className="relative h-1.5 w-full overflow-hidden"
        style={{
          background: 'rgba(244, 239, 227, 0.08)',
          border: '1px solid rgba(216, 155, 58, 0.15)',
        }}
      >
        <span
          aria-hidden
          className="acti-meter-fill absolute inset-y-0 left-0 transition-all"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}, ${color === 'var(--color-amber-glow)' ? 'rgba(232, 177, 74, 0.6)' : 'rgba(184, 106, 42, 0.6)'})`,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    </div>
  );
};

const ActivitesPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  // ─── Shared SFX (matches OrbHomePage so the orb → pillar transition
  // feels continuous). `loot` fires on every selection (day, category,
  // tile); `hover` is a throttled rustle for mouse-only pointer enters.
  const playSelect = useSfx('/orb/sfx/loot.mp3', 0.45);
  const playHover  = useHoverSfx('/orb/sfx/hover.mp3', 0.28);

  // Live schedule: subscribes to Firestore so a save in the admin
  // Horaire section shows up here immediately. Falls back to the
  // SCHEDULE constant baked in below when Firestore is empty (e.g.
  // first deploy before any admin save) or unconfigured (offline mode).
  const [liveSchedule, setLiveSchedule] = useState<ScheduleDay[]>(SCHEDULE as unknown as ScheduleDay[]);
  // true dès que le doc schedule/2026 existe dans Firestore : la section
  // passe alors du souvenir 2025 à l'horaire officiel 2026 (titres,
  // textes, carte verrouillée retirée).
  const [live2026, setLive2026] = useState(false);
  useEffect(() => {
    const unsub = watchSchedule(CURRENT_SCHEDULE_YEAR, (doc) => {
      if (doc?.days && doc.days.length > 0) { setLiveSchedule(doc.days); setLive2026(true); }
    });
    return () => unsub();
  }, []);

  // Programmation section visibility : admin-controlled via Firestore
  // (siteFlags/programmation). Behourd starts hidden (incidents à gérer
  // côté organisation, décision d'Alex 2026-08-04).
  const [progFlags, setProgFlags] = useState<ProgFlags>(PROG_FLAGS_DEFAULTS);
  useEffect(() => watchProgFlags(setProgFlags), []);

  // Horaire card, repliée par défaut : cliquer déplie l'horaire 2025
  const [horaireOpen, setHoraireOpen] = useState(false);
  // Programmation repliable aussi (Alex, 2026-08-22) : la page réunit
  // trois pages, on doit pouvoir refermer un chapitre pour atteindre le
  // suivant. Ouverte au départ : c'est le contenu principal.
  // Fiche-éclair d'un événement de l'horaire (glossaire cliquable).
  const [infoItem, setInfoItem] = useState<{ label: string; time: string; where: string; body: string } | null>(null);
  // Horaire 2026 officiel en ligne : la carte s'ouvre d'elle-même.
  useEffect(() => { if (live2026) setHoraireOpen(true); }, [live2026]);

  // Schedule day-tab state: index into liveSchedule. Default to
  // Saturday (idx 1), the marquee day with the densest line-up.
  const [activeDay, setActiveDay] = useState(1);
  const day = liveSchedule[activeDay] ?? liveSchedule[0];

  // Inventory filter state: drives both the chip rail and the arrow
  // controls. `all` shows every card; any other value filters by
  // category. Arrows cycle through CATEGORIES with wrap-around.
  const [filter, setFilter] = useState<FilterKey>('all');
  const filterIdx = CATEGORIES.indexOf(filter);
  const visible = filter === 'all' ? ACTIVITIES : ACTIVITIES.filter((a) => a.category === filter);
  const filterLabel = (k: FilterKey) => t.filters[k];

  // Click-to-flip-expand: tracks which activity is open in the modal.
  // null = no modal; otherwise an index into the ACTIVITIES array.
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const activeActivity = activeIdx !== null ? ACTIVITIES[activeIdx] : null;
  const openActivity = (idx: number) => { playSelect(); setActiveIdx(idx); };
  const closeActivity = () => { playSelect(); setActiveIdx(null); };

  // Wrap every selection in playSelect so the SFX is the single source
  // of "you chose something" feedback across the page.
  const selectDay = (idx: number) => {
    if (idx === activeDay) return;
    playSelect();
    setActiveDay(idx);
  };
  const selectFilter = (key: FilterKey) => {
    if (key === filter) return;
    playSelect();
    setFilter(key);
  };
  const prevFilter = () => {
    playSelect();
    setFilter(CATEGORIES[(filterIdx - 1 + CATEGORIES.length) % CATEGORIES.length]);
  };
  const nextFilter = () => {
    playSelect();
    setFilter(CATEGORIES[(filterIdx + 1) % CATEGORIES.length]);
  };

  // ─── GSAP scrollytelling. One context for the static, mount-time
  // reveals; separate effects below for filter/day changes so re-renders
  // get a fresh "shuffle" beat without fighting the scroll-tied timeline.
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !rootRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    // Pass the element (not the ref object) so gsap.context resolves
    // class selectors against it immediately.
    const root = rootRef.current;
    const ctx = gsap.context(() => {
      // ── Section header reveals (eyebrow + title block at the top of
      //    every section). Stagger the inner nodes so the eyebrow lands
      //    before the title: feels like the section is "introducing"
      //    itself rather than dropping all at once.
      gsap.utils.toArray<HTMLElement>('.sec-head').forEach((head) => {
        const kids = head.querySelectorAll(':scope > *');
        gsap.set(kids, { autoAlpha: 0, y: 36 });
        gsap.to(kids, {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: head, start: 'top 88%', once: true },
        });
      });

      // ── SectionTopRail strips: slide in from the side as the section
      //    enters view. SectionBottomRail mirrors it.
      gsap.utils.toArray<HTMLElement>('.sec-rail').forEach((rail) => {
        gsap.set(rail, { autoAlpha: 0, x: -40 });
        gsap.to(rail, {
          autoAlpha: 1,
          x: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: rail, start: 'top 90%', once: true },
        });
      });

      // ── HUD top bar: slides down + glints. Filter chips ride a wave
      //    so the menu "lights up" left-to-right.
      gsap.set('.acti-hud-top', { autoAlpha: 0, y: -28, scale: 0.98 });
      gsap.to('.acti-hud-top', {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.acti-hud-top', start: 'top 90%', once: true },
      });

      gsap.set('.acti-chip', { autoAlpha: 0, y: 18, rotationX: -45, transformPerspective: 600, transformOrigin: 'top center' });
      gsap.to('.acti-chip', {
        autoAlpha: 1,
        y: 0,
        rotationX: 0,
        duration: 0.7,
        stagger: 0.06,
        ease: 'back.out(1.7)',
        scrollTrigger: { trigger: '.acti-hud-top', start: 'top 82%', once: true },
        clearProps: 'transform',
      });

      // ── Green Knight: soft fade-and-up, scrub-tied so the rise
      //    is physically driven by scroll. Slightly bigger numbers than
      //    before so the entrance reads, but still calm enough that he
      //    doesn't compete with the tiles erupting around him.
      gsap.set('.acti-knight-img',  { autoAlpha: 0.25, y: 55 });
      gsap.to('.acti-knight-img', {
        autoAlpha: 1,
        y: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '.acti-grid',
          start: 'top 92%',
          end: 'top 30%',
          scrub: 1,
        },
      });

      gsap.set('.acti-knight-glow', { autoAlpha: 0.4, scale: 0.92 });
      gsap.to('.acti-knight-glow', {
        autoAlpha: 1,
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '.acti-grid',
          start: 'top 90%',
          end: 'center 55%',
          scrub: true,
        },
      });

      // ── Activity tiles: 3D flip-reveal entrance. Each tile starts
      //    edge-on (rotationY: 90deg) so it's effectively invisible,
      //    then flips down to 0deg as the section scrolls into view:
      //    the card face swings into the viewer like a playing card
      //    being turned over. transformPerspective gives the flip its
      //    depth; stagger from DOM start cascades the reveal top-left
      //    to bottom-right.
      gsap.fromTo('.acti-tile',
        {
          rotationY: 90,
          scale: 0.92,
          transformPerspective: 1200,
          transformOrigin: 'center center',
        },
        {
          rotationY: 0,
          scale: 1,
          ease: 'power2.out',
          stagger: { each: 0.06, from: 'start' },
          scrollTrigger: {
            trigger: '.acti-grid',
            start: 'top 85%',
            end:   'top 25%',
            scrub: 0.6,
          },
        }
      );

      // ── HUD bottom bar: slides up + meters "load" with scroll
      gsap.set('.acti-hud-bottom', { autoAlpha: 0, y: 28 });
      gsap.to('.acti-hud-bottom', {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.acti-hud-bottom', start: 'top 92%', once: true },
      });
      // Meter inner fills: width 0→target scrubbed to scroll position
      gsap.utils.toArray<HTMLElement>('.acti-meter-fill').forEach((el) => {
        const target = el.style.width || '0%';
        gsap.fromTo(el, { width: '0%' }, {
          width: target,
          ease: 'none',
          scrollTrigger: {
            trigger: '.acti-hud-bottom',
            start: 'top 92%',
            end: 'top 50%',
            scrub: 0.6,
          },
        });
      });
      // Controller-prompt row at the very bottom: glyph-by-glyph stagger
      gsap.utils.toArray<HTMLElement>('.acti-prompt-row > *').forEach((node) => {
        gsap.set(node, { autoAlpha: 0, y: 18, scale: 0.85 });
      });
      gsap.to('.acti-prompt-row > *', {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        stagger: 0.08,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: '.acti-hud-bottom', start: 'top 80%', once: true },
        clearProps: 'transform',
      });

      // ── Day plates: one-shot back-ease pop. Three plates rise +
      //    scale-up into view as the schedule section enters.
      gsap.fromTo('.sched-day-plate',
        { autoAlpha: 0, y: 28, scale: 0.94 },
        {
          autoAlpha: 1, y: 0, scale: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: 'back.out(1.4)',
          scrollTrigger: { trigger: '.sched-day-tabs', start: 'top 85%', once: true },
        }
      );

      // ── Cross-promo cards: slide in from opposite sides. Left
      //    card kicks in from the left, right card from the right,
      //    each with a small delay between them.
      gsap.fromTo('.cross-card-left',
        { autoAlpha: 0, x: -50 },
        {
          autoAlpha: 1, x: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.cross-section', start: 'top 82%', once: true },
        }
      );
      gsap.fromTo('.cross-card-right',
        { autoAlpha: 0, x: 50 },
        {
          autoAlpha: 1, x: 0,
          duration: 0.8,
          delay: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.cross-section', start: 'top 82%', once: true },
        }
      );
    }, root);

    // Refresh after the first paint so ScrollTrigger uses real layout
    // measurements (PageHeader image + tile images shift the page as
    // they load: without this, the cached start/end can be off-screen
    // and scrub triggers appear "dead").
    const refresh = () => ScrollTrigger.refresh();
    requestAnimationFrame(refresh);
    window.addEventListener('load', refresh);

    return () => {
      window.removeEventListener('load', refresh);
      ctx.revert();
    };
  }, []);

  // ─── Schedule rows: scrub-tied reveal of the timeline. Lives in its
  // own context that re-runs on day change so the new <li> set is the
  // one being animated (the .sched-panel wrapper remounts via key=day).
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !rootRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const root = rootRef.current;
    const ctx = gsap.context(() => {
      gsap.set('.sched-row',     { autoAlpha: 0.2, x: -14 });
      gsap.set('.sched-pip',     { scale: 0.45, autoAlpha: 0.35 });
      gsap.set('.sched-rail',    { scaleY: 0, transformOrigin: 'top center' });
      gsap.set('.sched-content', { autoAlpha: 0.45 });

      const trigger = {
        trigger: '.sched-panel',
        start: 'top 78%',
        end: 'bottom 65%',
        scrub: 0.6,
      } as const;

      gsap.to('.sched-rail',    { scaleY: 1,   ease: 'none', scrollTrigger: { ...trigger, scrub: 0.3 } });
      gsap.to('.sched-row',     { autoAlpha: 1, x: 0,        ease: 'none', stagger: 0.04, scrollTrigger: trigger });
      gsap.to('.sched-pip',     { scale: 1, autoAlpha: 1,    ease: 'back.out(2)', stagger: 0.04, scrollTrigger: trigger });
      gsap.to('.sched-content', { autoAlpha: 1,              ease: 'none', stagger: 0.04, scrollTrigger: trigger });

      // ScrollTrigger needs a refresh after the DOM swaps in fresh rows
      // (otherwise it caches the previous list's start/end positions).
      ScrollTrigger.refresh();
    }, root);

    return () => ctx.revert();
  }, [activeDay]);

  // ─── Filter shuffle animation intentionally removed alongside the
  //  activity-tile cascade rollback. Filter changes now swap the
  //  visible tile set with no entry animation; tiles render at rest.
  return (
    <div ref={rootRef}>
      {!embedded && <SEO title={t.title} description={t.intro} />}

      {/* En mode embarqué, le hero de Programmation porte déjà le titre.
          Répéter « Programmation 2026 / Activités » juste en dessous,
          puis « Le Grand Programme » deux fois, faisait quatre titres
          avant le premier contenu. La page ouvre maintenant sur
          « Nos activités ». Retiré 2026-08-22 (Alex). */}
      {embedded ? null : (
        <PageHeader
          eyebrow={t.eyebrow}
          titleA={t.title}
          intro={t.intro}
          orbImage="/wix/home/fire-night.jpg"
          orbImagePosition="center 35%"
        />
      )}

      {/* ── Activity grid: Bestiary register ── */}
      {progFlags.bestiaire && (
      <section id="bestiaire" className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="sec-head text-center mb-8 md:mb-10">
            <DisplayTitle size="lg" className="mb-4">{t.activitiesTitle}</DisplayTitle>
            <p className="font-editorial text-base md:text-lg max-w-2xl mx-auto"
               style={{ color: 'rgba(244, 239, 227, 0.78)' }}>
              {t.activitiesLead}
            </p>
          </div>

          <div id="activites-corps">

          {/* ── HUD top bar: inventory header. Two rows: title + stats,
              then arrow nav flanking the filter chips. Chips + arrows
              both drive the same `filter` state. */}
          <div
            className="acti-hud-top mb-4"
            style={{ borderTop: '1px solid rgba(216, 155, 58, 0.22)', borderBottom: '1px solid rgba(216, 155, 58, 0.22)' }}
          >
            {/* Row 1: title centered, stat readouts on the right. */}
            <div
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-2 py-2.5"
              style={{ borderBottom: '1px solid rgba(216, 155, 58, 0.10)' }}
            >
              <span aria-hidden />
              <span
                className="font-display title-medieval uppercase tracking-[0.5em] text-[11px] md:text-xs text-center whitespace-nowrap"
                style={{ color: 'var(--color-amber-glow)', textShadow: '0 0 12px rgba(232, 177, 74, 0.4)' }}
              >
                {t.activitiesTitle}
              </span>
              <div
                className="flex items-center justify-end gap-3 md:gap-4 font-sans uppercase tracking-[0.22em] text-[10px]"
                style={{ color: 'rgba(244, 239, 227, 0.7)' }}
              >
                <span className="inline-flex items-baseline gap-1.5">
                  <span aria-hidden className="w-1.5 h-1.5 rotate-45 self-center" style={{ background: 'var(--color-amber-glow)' }} />
                  <span style={{ color: 'var(--color-bone)' }}>{visible.length}</span>
                  <span className="opacity-50">/</span>
                  <span className="opacity-50">{ACTIVITIES.length}</span>
                </span>
                <span className="opacity-50 hidden md:inline">·</span>
                <span className="hidden md:inline" style={{ color: 'var(--color-amber-glow)' }}>2026</span>
              </div>
            </div>

            {/* Row 2: arrow nav flanking the filter chip rail. */}
            <div className="flex items-center justify-center gap-2 md:gap-3 px-2 py-2.5 overflow-x-auto">
              <HudArrow icon={<ChevronLeft size={14} />} onClick={prevFilter} ariaLabel={t.prevCategory} />
              {CATEGORIES.map((key) => {
                const isActive = key === filter;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectFilter(key)}
                    onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !isActive) playHover(); }}
                    className="acti-chip inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1 font-sans uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[10px] sm:text-[9px] md:text-[10px] transition whitespace-nowrap cursor-pointer hover:!opacity-100"
                    style={{
                      color: isActive ? 'var(--color-amber-glow)' : 'rgba(244, 239, 227, 0.55)',
                      borderBottom: isActive ? '1px solid var(--color-amber-glow)' : '1px solid transparent',
                    }}
                  >
                    {filterLabel(key)}
                  </button>
                );
              })}
              <HudArrow icon={<ChevronRight size={14} />} onClick={nextFilter} ariaLabel={t.nextCategory} />
            </div>
          </div>

          {/* Inventory-style grid: Witcher redesign register (Martin
              Coates inspo). The Green Knight occupies the centerpiece cell as the
              focal figure (transparent PNG, no frame, no slab, just the
              character standing inside the grid). Activity tiles pack
              around him via grid-flow-dense. */}
          <div className="acti-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 [grid-auto-flow:dense]">
            {/* ── Centerpiece figure ── */}
            <div
              aria-hidden
              className="relative col-span-2 row-span-1 md:col-start-2 md:col-span-1 md:row-span-2 lg:col-start-2 lg:col-span-3 lg:row-span-2 min-h-[260px] md:min-h-[420px] lg:min-h-[520px] flex items-end justify-center"
            >
              {/* Copper backdrop glow: places him in warm light. Sits
                  behind the figure, masked elliptically so it never
                  reads as a rectangle. */}
              <span
                className="acti-knight-glow absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 60% 65% at 50% 55%, rgba(184, 106, 42, 0.22), transparent 70%),' +
                    'radial-gradient(ellipse 45% 55% at 50% 60%, rgba(232, 177, 74, 0.12), transparent 75%)',
                }}
              />
              <img
                src="/characters/green-knight.webp"
                alt={t.championName}
                className="acti-knight-img fmm-no-grade relative w-full h-full object-contain"
                style={{
                  filter:
                    'drop-shadow(0 24px 40px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 24px rgba(184, 106, 42, 0.4))',
                  // Fade the bottom 30% gradually to transparent so the
                  // knight dissolves into the page rather than sitting
                  // on a hard edge. Gradient: opaque from the top down
                  // to 70% of the image, then linearly fades to 0 at
                  // the bottom.
                  WebkitMaskImage: 'linear-gradient(to bottom, #000 70%, transparent 100%)',
                  maskImage:       'linear-gradient(to bottom, #000 70%, transparent 100%)',
                }}
              />
              {/* Floor shadow: anchors him to the page so he doesn't
                  float in the void. */}
              <span
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 bottom-1 w-2/3 h-8 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(0,0,0,0.55), transparent 70%)',
                  filter: 'blur(4px)',
                }}
              />
            </div>

            {/* ── Activity inventory tiles: full-bleed image with the
                label overlaid at the bottom. Plain rectangular cells
                with 15px rounding. Active tile (first of the visible
                set) gets four lit corner ticks. */}
            {visible.map((a, i) => {
              const active = i === 0;
              const absoluteIdx = ACTIVITIES.indexOf(a);
              return (
                <div
                  key={a.titleFR}
                  onClick={() => openActivity(absoluteIdx)}
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse') playHover(); }}
                  className="acti-tile relative aspect-[4/5] group cursor-pointer"
                >
                  <div
                    className="relative h-full overflow-hidden"
                    style={{
                      borderRadius: 15,
                      border: `1px solid ${active ? 'rgba(232, 177, 74, 0.55)' : 'rgba(216, 155, 58, 0.20)'}`,
                      boxShadow: active
                        ? 'inset 0 0 0 1px rgba(232, 177, 74, 0.35), 0 0 24px -8px rgba(232, 177, 74, 0.45)'
                        : '0 12px 30px -18px rgba(0, 0, 0, 0.7)',
                    }}
                  >
                    {/* Full-bleed photo: caravan-graded so all photos
                        (different photographers, lighting, era) read
                        as a homogeneous set. */}
                    <img
                      src={a.image}
                      alt={lang === 'FR' ? a.titleFR : a.titleEN}
                      loading="lazy"
                      decoding="async"
                      className="fmm-grade-caravan absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      style={{
                        objectPosition: a.imagePos,
                        ...(a.retiree ? { filter: 'grayscale(0.85) brightness(0.6)' } : {}),
                      }}
                    />

                    {/* Sceau de relâche : l'activité reviendra. */}
                    {a.retiree && (
                      <span
                        className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] px-3 py-1.5 font-display title-medieval uppercase tracking-[0.28em] text-[10px] md:text-[11px] whitespace-nowrap"
                        style={{
                          color: 'rgba(244, 239, 227, 0.85)',
                          border: '1px solid rgba(244, 239, 227, 0.45)',
                          background: 'rgba(10, 2, 7, 0.55)',
                          borderRadius: 4,
                        }}
                      >
                        {lang === 'FR' ? 'Prochaine édition' : 'Next edition'}
                      </span>
                    )}

                    {/* Warm tint overlay: pushes residual hue cast
                        toward amber-copper, unifying photos that were
                        originally shot under cool / mixed light. */}
                    <span aria-hidden className="fmm-grade-caravan-tint absolute inset-0 pointer-events-none" />

                    {/* Glistening sweep: re-uses the orb's diagonal
                        shine. Staggered delay per card so the row
                        twinkles asynchronously instead of in unison. */}
                    <span
                      aria-hidden
                      className="fmm-card-shine"
                      style={{ animationDelay: `${(i * 0.85) % 8}s` }}
                    />

                    {/* Dark gradient at the bottom for label legibility */}
                    <span
                      aria-hidden
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(10, 2, 7, 0) 35%, rgba(10, 2, 7, 0.55) 65%, rgba(10, 2, 7, 0.92) 100%)',
                      }}
                    />

                    {/* Active-state corner brackets: overlaid above
                        the image so they're not clipped by it. */}
                    {active && <CornerTicks />}

                    {/* N° chip: top-left */}
                    <span
                      className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2 py-1 font-display title-medieval text-[10px] tracking-[0.3em]"
                      style={{
                        background: 'rgba(10, 2, 7, 0.7)',
                        color: 'var(--color-amber-glow)',
                        border: '1px solid rgba(232, 177, 74, 0.35)',
                        borderRadius: 6,
                      }}
                    >
                      N° {String(absoluteIdx + 1).padStart(2, '0')}
                    </span>

                    {/* Title + body: pinned to the bottom of the card */}
                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                      <h3
                        className="font-display title-medieval text-base md:text-lg mb-1 transition leading-tight"
                        style={{ color: 'var(--color-bone)' }}
                      >
                        {lang === 'FR' ? a.titleFR : a.titleEN}
                      </h3>
                      <p
                        className="font-editorial italic text-xs md:text-sm leading-snug"
                        style={{ color: 'rgba(244, 239, 227, 0.75)' }}
                      >
                        {lang === 'FR' ? a.bodyFR : a.bodyEN}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Jauge du compte à rebours ─────────────────────────
              Les anciens « Prêt pour le festival 68 % » et « Billets
              restants 32 % » étaient des chiffres inventés, et la
              rangée de touches manette (○ □ △ ✕) singait une console
              (retirés le 2026-08-03, demande d'Alex : « on n'est pas
              sur un PlayStation »). La jauge dit maintenant une chose
              VRAIE : la progression vers le jour d'ouverture, 100 % le
              25 septembre 2026. Point de départ : l'annonce de
              l'édition (1er mars 2026). */}
          <div
            className="acti-hud-bottom mt-6 px-2 py-4"
            style={{ borderTop: '1px solid rgba(216, 155, 58, 0.22)' }}
          >
            {(() => {
              const debut = new Date('2026-03-01T00:00:00-05:00').getTime();
              const ouverture = new Date('2026-09-25T10:00:00-04:00').getTime();
              const partEcoulee = Math.max(0, Math.min(1, (Date.now() - debut) / (ouverture - debut)));
              const joursRestants = Math.max(0, Math.ceil((ouverture - Date.now()) / 86400000));
              return (
                <HudMeter
                  label={joursRestants > 0 ? t.meterCountdown(joursRestants) : t.meterToday}
                  value={Math.round(partEcoulee * 100)}
                  accent="amber"
                />
              );
            })()}
          </div>

          </div>

          <SectionBottomRail
            hint={t.activitiesHint}
            meta={t.activitiesFootMeta}
            className="sec-rail mt-10"
          />
        </div>
      </section>
      )}

      {/* ── Schedule: Quest Log (3 day plates) ── */}
      {progFlags.horaire && (
      <section id="horaire" className="py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <SectionTopRail
            index="02"
            name={t.scheduleEyebrow}
            meta={t.scheduleMeta}
            metaValue={liveSchedule.reduce((n, d) => n + d.items.length, 0)}
            className="sec-rail mb-10 md:mb-14"
          />
          <div className="sec-head text-center mb-10 md:mb-14">
            <Eyebrow tone="amber" className="mb-3 inline-flex items-center gap-3 justify-center">
              <IconScroll size={13} className="opacity-80" />
              {t.scheduleEyebrow}
              <HexMark />
            </Eyebrow>
            <DisplayTitle size="lg" glow className="mb-2">{t.scheduleTitle}</DisplayTitle>
            {!live2026 && (
              <>
                <p className="font-editorial italic text-base md:text-lg mt-3"
                   style={{ color: 'var(--color-amber-glow)' }}>
                  {t.schedule2026Soon}
                </p>
                <p className="font-editorial italic text-sm md:text-base mt-2 max-w-2xl mx-auto"
                   style={{ color: 'rgba(244, 239, 227, 0.6)' }}>
                  {t.scheduleSouvenir}
                </p>
              </>
            )}
          </div>

          {/* ── Horaire replié en deux cartes ────────────────────
              Carte 1 (souvenir 2025) repliée par défaut; cliquer déplie
              le markup existant (onglets + chronologie) sans le
              modifier. Carte 2 (2026) verrouillée : le programme n'est
              pas scellé. Décision d'Alex, 2026-08-04. */}
          <div className="mb-4">
            <HexPanel size="md">
              <GildedFrame inset={12} tone="amber">
                <div className="caravan-glass relative">
                  <button
                    type="button"
                    onClick={() => setHoraireOpen((v) => !v)}
                    aria-expanded={horaireOpen}
                    aria-controls="horaire-2025-content"
                    className="w-full flex items-center justify-between gap-4 p-6 md:p-8 text-left cursor-pointer"
                  >
                    <div>
                      <Eyebrow tone="amber" className="mb-2">{live2026 ? t.scheduleVersion2026 : t.scheduleVersion}</Eyebrow>
                      <DisplayTitle size="lg" className="text-2xl md:text-3xl">{live2026 ? t.horaireCard2026LiveTitle : t.horaireCard2025Title}</DisplayTitle>
                    </div>
                    <ChevronDown
                      size={22}
                      className="shrink-0 transition-transform duration-400"
                      style={{
                        color: 'var(--color-amber-glow)',
                        transform: horaireOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {horaireOpen && (
                      <motion.div
                        key="horaire-2025-content"
                        id="horaire-2025-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="px-6 md:px-8 pb-6 md:pb-8">
          {/* Day tabs: three illuminated day plates. Click to switch.
              The active plate gets amber-lit border + corner ticks. */}
          <div className="sched-day-tabs grid grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
            {liveSchedule.map((d, idx) => {
              const isActive   = idx === activeDay;
              const dayName    = (lang === 'FR' ? d.dateFR : d.dateEN).split(' ')[0];
              const dayDate    = (lang === 'FR' ? d.dateFR : d.dateEN).split(' ').slice(1).join(' ');
              return (
                <button
                  key={d.dateFR}
                  type="button"
                  onClick={() => selectDay(idx)}
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !isActive) playHover(); }}
                  className="sched-day-plate relative text-left transition-transform hover:-translate-y-0.5"
                  aria-pressed={isActive}
                  aria-label={`${dayName} ${dayDate}`}
                >
                  <div
                    className="relative h-full px-2.5 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 overflow-hidden"
                    style={{
                      borderRadius: 12,
                      background: isActive
                        ? 'linear-gradient(180deg, rgba(232, 177, 74, 0.10), rgba(19, 8, 11, 0.78))'
                        : 'rgba(19, 8, 11, 0.55)',
                      border: `1px solid ${isActive ? 'rgba(232, 177, 74, 0.55)' : 'rgba(216, 155, 58, 0.18)'}`,
                      boxShadow: isActive
                        ? 'inset 0 1px 0 rgba(232, 177, 74, 0.18), 0 0 28px -10px rgba(232, 177, 74, 0.55)'
                        : 'inset 0 1px 0 rgba(232, 177, 74, 0.05)',
                    }}
                  >
                    {isActive && <CornerTicks />}

                    <div className="flex items-baseline justify-between mb-2">
                      <span
                        className="font-display title-medieval text-2xl md:text-3xl leading-none"
                        style={{
                          color: isActive ? 'var(--color-amber-glow)' : 'rgba(244, 239, 227, 0.45)',
                          textShadow: isActive ? '0 0 14px rgba(232, 177, 74, 0.45)' : undefined,
                        }}
                      >
                        {ROMAN[idx]}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 font-sans uppercase tracking-[0.25em] text-[10px]"
                        style={{ color: isActive ? 'var(--color-bone)' : 'rgba(244, 239, 227, 0.45)' }}
                      >
                        <span aria-hidden className="w-1.5 h-1.5 rotate-45"
                              style={{ background: isActive ? 'var(--color-amber-glow)' : 'var(--color-copper)' }} />
                        {d.items.length}
                      </span>
                    </div>

                    <p
                      className="font-display title-medieval uppercase tracking-[0.12em] sm:tracking-[0.18em] text-[11px] sm:text-sm md:text-base"
                      style={{ color: isActive ? 'var(--color-bone)' : 'rgba(244, 239, 227, 0.7)' }}
                    >
                      {dayName}
                    </p>
                    <p
                      className="font-editorial italic text-xs md:text-sm mt-0.5"
                      style={{ color: isActive ? 'rgba(244, 239, 227, 0.7)' : 'rgba(244, 239, 227, 0.45)' }}
                    >
                      {dayDate}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active day's timeline: single rich panel. Three-column
              layout: time anchor on the left, vertical hairline + pip
              in the middle, event title + location chip on the right.
              Events are grouped by hour so the time only paints once
              when consecutive items share an hour. */}
          <div key={`day-${activeDay}`} className="sched-panel">
            <GildedFrame inset={12} tone="amber" className="relative">
              <div className="caravan-glass relative p-5 md:p-8 lg:p-10">
                {/* Header strip: day title + meta */}
                <div className="flex items-baseline justify-between gap-4 flex-wrap pb-4 mb-6"
                     style={{ borderBottom: '1px solid rgba(216, 155, 58, 0.22)' }}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display title-medieval text-3xl md:text-4xl leading-none"
                          style={{ color: 'var(--color-amber-glow)', textShadow: '0 0 14px rgba(232, 177, 74, 0.45)' }}>
                      {ROMAN[activeDay]}
                    </span>
                    <h3 className="font-display title-medieval text-lg sm:text-xl md:text-2xl"
                        style={{ color: 'var(--color-bone)' }}>
                      {lang === 'FR' ? day.dateFR : day.dateEN}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 font-sans uppercase tracking-[0.25em] text-[10px]"
                       style={{ color: 'rgba(244, 239, 227, 0.6)' }}>
                    <span>{day.items.length} {t.scheduleMeta}</span>
                    <span className="opacity-50">·</span>
                    <span style={{ color: 'var(--color-amber-glow)' }}>{day.items[0].time}–{day.items[day.items.length - 1].time.split('–').pop()}</span>
                  </div>
                </div>

                {/* Timeline rows */}
                <ol className="relative">
                  {day.items.map((item, i) => {
                    const prev = i > 0 ? day.items[i - 1] : null;
                    const hourOf = (s: string) => s.split('–')[0].split('h')[0].slice(0, 2);
                    const showTime = !prev || hourOf(item.time) !== hourOf(prev.time);
                    return (
                      <li
                        key={i}
                        className="sched-row relative grid grid-cols-[48px_16px_1fr] sm:grid-cols-[60px_20px_1fr] md:grid-cols-[88px_28px_1fr] items-start gap-x-2 py-2.5 group/row transition"
                      >
                        {/* Time anchor */}
                        <span
                          className="font-display title-medieval text-right pt-1 tracking-[0.06em] text-[10px] sm:text-[12px] md:text-sm"
                          style={{
                            color: showTime ? 'var(--color-amber-glow)' : 'transparent',
                          }}
                        >
                          {showTime && (
                            <>
                              {/* Show start-time only on mobile (narrow
                                  column), full range on sm+. */}
                              <span className="sm:hidden">{item.time.split('–')[0]}</span>
                              <span className="hidden sm:inline">{item.time}</span>
                            </>
                          )}
                        </span>

                        {/* Vertical rail + pip */}
                        <span className="relative h-full flex justify-center">
                          {/* Continuous hairline behind the pips */}
                          <span aria-hidden className="sched-rail absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px"
                                style={{
                                  background: i === 0
                                    ? 'linear-gradient(180deg, transparent, var(--color-copper) 50%)'
                                    : i === day.items.length - 1
                                    ? 'linear-gradient(180deg, var(--color-copper) 0%, var(--color-copper) 50%, transparent 100%)'
                                    : 'var(--color-copper)',
                                  opacity: 0.55,
                                }} />
                          <span aria-hidden
                                className="sched-pip relative mt-2 w-2 h-2 rotate-45 transition group-hover/row:scale-125"
                                style={{
                                  background: 'var(--color-amber-glow)',
                                  boxShadow: '0 0 8px rgba(232, 177, 74, 0.55)',
                                }} />
                        </span>

                        {/* Event content. Si l'événement a une fiche au
                            glossaire, le nom devient cliquable et ouvre la
                            fiche-éclair (pop-up « c'est quoi, une joute ? »). */}
                        <div className="sched-content flex items-start justify-between gap-3 md:gap-5 flex-wrap pt-0.5 pb-1">
                          {(() => {
                            const body = infoFor(item.label, lang === 'FR' ? 'FR' : 'EN');
                            if (!body) {
                              return (
                                <p className="font-display title-medieval text-sm md:text-base leading-snug flex-1 transition"
                                   style={{ color: 'var(--color-bone)' }}>
                                  {item.label}
                                </p>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => { playSelect(); setInfoItem({ label: item.label, time: item.time, where: item.where, body }); }}
                                onPointerEnter={(e) => { if (e.pointerType === 'mouse') playHover(); }}
                                className="font-display title-medieval text-sm md:text-base leading-snug flex-1 text-left transition cursor-pointer group/info"
                                style={{ color: 'var(--color-bone)' }}
                                aria-haspopup="dialog"
                              >
                                <span className="border-b border-dotted transition group-hover/info:text-[var(--color-amber-glow)]"
                                      style={{ borderColor: 'rgba(216, 155, 58, 0.45)' }}>
                                  {item.label}
                                </span>
                                <span aria-hidden className="ml-1.5 font-sans text-[10px] align-top"
                                      style={{ color: 'var(--color-copper)' }}>?</span>
                              </button>
                            );
                          })()}
                          <span
                            className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 font-sans uppercase tracking-[0.2em] text-[9px] md:text-[10px]"
                            style={{
                              color: 'rgba(244, 239, 227, 0.65)',
                              background: 'rgba(232, 177, 74, 0.05)',
                              border: '1px solid rgba(216, 155, 58, 0.22)',
                              borderRadius: 4,
                            }}
                          >
                            <MapPin size={9} style={{ color: 'var(--color-copper)' }} />
                            {item.where}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </GildedFrame>
          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </GildedFrame>
            </HexPanel>

            {!live2026 && (
              <HexPanel size="md" className="mt-4">
                <GildedFrame inset={12} tone="copper">
                  <div
                    className="caravan-glass p-6 md:p-8 flex items-center justify-between gap-4"
                    style={{ cursor: 'default' }}
                    aria-disabled
                  >
                    <div>
                      <Eyebrow tone="copper" className="mb-2">{t.scheduleEyebrow}</Eyebrow>
                      <DisplayTitle size="lg" className="text-2xl md:text-3xl">{t.horaireCard2026Title}</DisplayTitle>
                    </div>
                    <IconLozenge size={22} className="shrink-0" style={{ color: 'var(--color-copper)' }} />
                  </div>
                </GildedFrame>
              </HexPanel>
            )}
          </div>

          <SectionBottomRail
            hint={live2026 ? t.scheduleNote2026 : t.scheduleNote}
            meta={live2026 ? t.scheduleVersion2026 : t.scheduleVersion}
            className="sec-rail mt-10"
          />
        </div>
      </section>
      )}

      {/* ── Banquet + Youth: Champion-select cross-promo ── */}
      {progFlags.banquet && (
      <section id="banquet" className="cross-section py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <SectionTopRail
            index="04"
            name={t.crossRailName}
            meta={t.crossMeta}
            metaValue="II"
            className="sec-rail mb-10 md:mb-14"
          />
          {/* Le banquet règne seul, pleine largeur : le carré Espace
              Jeunesse qui le flanquait est parti (demande d'Alex,
              2026-08-03 : la jeunesse a déjà sa section plus haut dans
              le bestiaire et sa page). Le menu n'étant pas scellé, le
              bouton est un CADENAS, pas un lien : promettre un menu
              qui n'existe pas ferait cliquer dans le vide.
              2026-08-22 : le menu 1.3 est arrêté et publié, le cadenas
              tombe. Le bouton mène à la section du banquet du Village
              Nourriture, menu et réservation Square compris. */}
          <HexPanel size="md" className="group cross-card-left">
            <GildedFrame inset={12} tone="amber">
              <div className="caravan-glass p-7 md:p-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-3">
                    <Eyebrow tone="amber">{t.banquetEyebrow}</Eyebrow>
                    <span
                      className="font-display title-medieval text-2xl leading-none opacity-80"
                      style={{ color: 'var(--color-amber-glow)' }}
                    >
                      I
                    </span>
                  </div>
                  <DisplayTitle size="lg" className="text-2xl md:text-4xl mb-4">
                    {t.banquetTitle}
                  </DisplayTitle>
                  <p className="font-editorial text-base md:text-lg leading-relaxed"
                     style={{ color: 'rgba(244, 239, 227, 0.75)' }}>
                    {t.banquetBody}
                  </p>
                </div>
                <Link
                  to={addLocale('/marche', lang) + '#banquet'}
                  className="prog-anchor shrink-0 self-start md:self-center inline-flex items-center gap-3 pl-3 pr-5 py-3 font-sans text-[11px] md:text-xs uppercase tracking-[0.2em] font-semibold"
                >
                  <span aria-hidden className="prog-anchor-glyph"><IconGoblet size={17} /></span>
                  {t.banquetCta}
                </Link>
              </div>
            </GildedFrame>
          </HexPanel>
        </div>
      </section>
      )}

      {/* ── Tournoi de Behourd 2027: early registration ──────────────
          Inscription anticipée (1 an d'avance). Form saves to Firestore
          (behourd/{autoId}) and then opens the Zeffy payment link. */}
      {progFlags.behourd && (
      <section className="behourd-section relative py-16 md:py-24 overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <SectionTopRail
            index="05"
            name={t.behourdRailName}
            meta={t.behourdMeta}
            metaValue="2027"
            className="sec-rail mb-10 md:mb-14"
          />
          <div className="relative max-w-3xl mx-auto">
            <GildedFrame inset={14} tone="copper" className="relative">
              <div className="caravan-glass p-8 md:p-12 text-center">
                <Eyebrow tone="copper" className="mb-3 inline-flex items-center gap-3 justify-center">
                  <HexMark />
                  {t.behourdEyebrow}
                  <HexMark />
                </Eyebrow>
                <DisplayTitle size="lg" glow className="mb-6">{t.behourdTitle}</DisplayTitle>
                <p className="font-editorial text-base md:text-lg leading-relaxed mb-8"
                   style={{ color: 'rgba(244, 239, 227, 0.85)' }}>
                  {t.behourdBody}
                </p>
                <BehourdRegistrationForm lang={lang} />
              </div>
            </GildedFrame>
          </div>
        </div>
      </section>
      )}

      {/* ── Activity flip-expand modal ──────────────────────────────
          Clicking a tile in the bestiary opens the activity in a
          centred overlay with a 3D flip-in entrance (rotateY -180 →
          0deg + scale + opacity). The "back" of the card carries the
          long description, the hero image, the category chip and a
          dismiss button. Backdrop click or X closes. */}
      {/* ── Fiche-éclair de l'horaire (glossaire) ── */}
      <AnimatePresence>
        {infoItem && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog" aria-modal="true" aria-label={infoItem.label}
            onClick={() => { playSelect(); setInfoItem(null); }}
            style={{ background: 'rgba(10, 4, 6, 0.72)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <GildedFrame inset={10} tone="amber">
                <div className="caravan-glass p-6 md:p-8 rounded-[15px]">
                  <button
                    type="button"
                    onClick={() => { playSelect(); setInfoItem(null); }}
                    aria-label={lang === 'FR' ? 'Fermer' : 'Close'}
                    className="absolute top-3 right-3 p-2 transition hover:scale-110"
                    style={{ color: 'var(--color-amber-glow)' }}
                  >
                    <X size={18} />
                  </button>
                  <div className="flex items-center gap-2.5 font-sans uppercase tracking-[0.25em] text-[10px] mb-3"
                       style={{ color: 'rgba(244, 239, 227, 0.6)' }}>
                    <span style={{ color: 'var(--color-amber-glow)' }}>{infoItem.time}</span>
                    <span className="opacity-50">·</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={9} style={{ color: 'var(--color-copper)' }} />{infoItem.where}</span>
                  </div>
                  <h3 className="font-display title-medieval text-xl md:text-2xl mb-3"
                      style={{ color: 'var(--color-bone)' }}>
                    {infoItem.label}
                  </h3>
                  <p className="font-editorial text-base leading-relaxed"
                     style={{ color: 'rgba(244, 239, 227, 0.8)' }}>
                    {infoItem.body}
                  </p>
                </div>
              </GildedFrame>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto"
            style={{
              background: 'rgba(10, 2, 7, 0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={closeActivity}
          >
            <motion.div
              initial={{ rotateY: -180, scale: 0.7, opacity: 0 }}
              animate={{ rotateY: 0,    scale: 1,   opacity: 1 }}
              exit={{    rotateY: 180,  scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl my-auto overflow-hidden"
              style={{
                transformStyle: 'preserve-3d',
                transformPerspective: 1400,
                background:
                  `linear-gradient(180deg, rgba(232, 177, 74, 0.04) 0%, transparent 30%, rgba(184, 106, 42, 0.05) 100%),` +
                  `linear-gradient(180deg, #1a0e10 0%, #0d0608 100%)`,
                border: '1px solid rgba(232, 177, 74, 0.45)',
                borderRadius: 15,
                boxShadow:
                  'inset 0 1px 0 rgba(232, 177, 74, 0.18), 0 30px 80px -20px rgba(232, 177, 74, 0.4), 0 0 60px -20px rgba(184, 106, 42, 0.45)',
              }}
            >
              {/* Hero image */}
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={activeActivity.image}
                  alt={lang === 'FR' ? activeActivity.titleFR : activeActivity.titleEN}
                  className="fmm-grade-caravan absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: activeActivity.imagePos }}
                />
                <span aria-hidden className="fmm-grade-caravan-tint absolute inset-0 pointer-events-none" />
                <span
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(10,2,7,0) 30%, rgba(10,2,7,0.55) 70%, rgba(10,2,7,0.95) 100%)',
                  }}
                />
                {/* N° chip: top-left */}
                <span
                  className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 font-display title-medieval text-[10px] tracking-[0.3em]"
                  style={{
                    background: 'rgba(10, 2, 7, 0.7)',
                    color: 'var(--color-amber-glow)',
                    border: '1px solid rgba(232, 177, 74, 0.45)',
                    borderRadius: 6,
                  }}
                >
                  N° {String(activeIdx! + 1).padStart(2, '0')}
                </span>
                {/* Category chip: top-right */}
                <span
                  className="absolute top-3 right-12 inline-flex items-center gap-1.5 px-2 py-1 font-sans uppercase tracking-[0.25em] text-[9px]"
                  style={{
                    background: 'rgba(10, 2, 7, 0.7)',
                    color: 'rgba(244, 239, 227, 0.75)',
                    border: '1px solid rgba(216, 155, 58, 0.30)',
                    borderRadius: 6,
                  }}
                >
                  {t.filters[activeActivity.category]}
                </span>
              </div>

              {/* Content */}
              <div className="relative px-6 md:px-8 py-6 md:py-7">
                <h2
                  className="font-display title-medieval text-3xl md:text-4xl tracking-[0.04em] uppercase leading-tight mb-2"
                  style={{ color: 'var(--color-bone)' }}
                >
                  {lang === 'FR' ? activeActivity.titleFR : activeActivity.titleEN}
                </h2>
                <p
                  className="font-editorial italic text-base mb-4"
                  style={{ color: 'rgba(244, 239, 227, 0.65)' }}
                >
                  {lang === 'FR' ? activeActivity.bodyFR : activeActivity.bodyEN}
                </p>
                <span
                  aria-hidden
                  className="block h-px w-24 mb-5"
                  style={{ background: 'linear-gradient(90deg, var(--color-amber-glow), transparent)' }}
                />
                <p
                  className="font-editorial text-base md:text-lg leading-relaxed mb-6"
                  style={{ color: 'rgba(244, 239, 227, 0.85)' }}
                >
                  {lang === 'FR' ? activeActivity.descFR : activeActivity.descEN}
                </p>
                <button
                  type="button"
                  onClick={closeActivity}
                  className="inline-flex items-center gap-2 px-6 py-2.5 font-sans uppercase tracking-[0.3em] text-[11px] transition-all hover:scale-[1.02]"
                  style={{
                    color: 'var(--color-velvet-deep)',
                    background:
                      'linear-gradient(180deg, var(--color-amber-glow) 0%, var(--color-mustard) 55%, var(--color-copper) 100%)',
                    borderRadius: 14,
                    boxShadow:
                      'inset 0 1px 0 rgba(255, 240, 200, 0.4), 0 8px 22px -8px rgba(216, 155, 58, 0.55)',
                  }}
                >
                  {lang === 'FR' ? 'Fermer' : 'Close'}
                </button>
              </div>

              {/* Close ×: top-right */}
              <button
                type="button"
                onClick={closeActivity}
                aria-label={lang === 'FR' ? 'Fermer' : 'Close'}
                className="absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 transition-colors"
                style={{
                  color: 'rgba(244, 239, 227, 0.85)',
                  background: 'rgba(10, 2, 7, 0.7)',
                  border: '1px solid rgba(232, 177, 74, 0.35)',
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-amber-glow)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(244, 239, 227, 0.85)'; }}
              >
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FR = {
  home: 'Accueil',
  eyebrow: 'Programmation 2026',
  title: 'Activités',
  intro: 'Une fin de semaine entière de tournois, démonstrations, ateliers, contes et spectacles. Voici l’horaire complet et l’éventail d’activités qui vous attendent au festival.',
  scheduleEyebrow: 'Horaire',
  scheduleTitle: 'Horaire et Programmation',
  scheduleMeta: 'Inscriptions',
  scheduleNote: 'L’horaire 2026 remplacera ce souvenir dès qu’il sera scellé.',
  scheduleVersion: 'Souvenir · édition 2025',
  schedule2026Soon: 'L’horaire 2026 sera dévoilé sous peu.',
  scheduleSouvenir: 'En attendant, revoici l’horaire de l’an dernier, en souvenir : il donne une bonne idée du rythme d’une journée de festival.',
  horaireCard2025Title: 'Horaire 2025 · Souvenir',
  horaireCard2026Title: 'Horaire 2026 · Dévoilé sous peu',
  horaireCard2026LiveTitle: 'Horaire 2026 · Officiel',
  scheduleVersion2026: 'Édition 2026',
  scheduleNote2026: 'Horaire sujet à des ajustements de dernière minute.',
  dayLabel: 'Journée',
  activitiesEyebrow: 'Le grand programme',
  activitiesMeta: 'Activités',
  activitiesTitle: 'Nos Activités',
  activitiesLead: 'Le FMM est fier de présenter une grande variété d’activités pour petits et grands, agréables autant pour les passionnés de médiéval que pour les gens qui ne font que passer.',
  activitiesHint: 'Cliquez sur une tuile pour ouvrir la fiche (bientôt)',
  activitiesFootMeta: 'Activités · 2026',
  filterLabel: 'Filtrer',
  filters: {
    all:      'Tout',
    combat:   'Combat',
    crafts:   'Métiers',
    shows:    'Spectacles',
    ripaille: 'Ripaille',
    family:   'Famille',
  },
  prevCategory: 'Catégorie précédente',
  nextCategory: 'Catégorie suivante',
  meterCountdown: (j: number) => `Le festival ouvre dans ${j} jours`,
  meterToday:     'Le festival est commencé',
  behourdRailName: 'Tournoi de Behourd',
  behourdMeta: 'Édition',
  behourdEyebrow: 'Inscription anticipée',
  behourdTitle: 'Tournoi de Behourd · 2027',
  behourdBody: 'Le Behourd revient au FMM en 2027 : combat médiéval à équipes, en armure complète, dans l’esprit des grands tournois historiques. Les places sont limitées et l’inscription se fait un an à l’avance afin de bien préparer les équipes, l’arène et la sécurité. Remplissez le formulaire ci-dessous puis finalisez votre inscription via Zeffy.',
  championRailName: 'Figure du clan',
  championMeta: 'Rang',
  championRank: 'Jarl',
  championEyebrow: 'Personnage en vedette',
  championName: 'Le Chevalier Vert',
  championEpithet: '« héhéhé comment ça va poto ! »',
  championBody: 'Co-chef du clan Viking Autonome avec Ariane Sigurdsdottir. Au fond des bois, loin de l’électricité, il tient forge et atelier : l’un des piliers vivants du festival. Retrouvez-le au marché ou autour du feu pour entendre les sagas.',
  championCta: 'Visiter son kiosque',
  statClan: 'Clan',
  statClanValue: 'Viking Autonome',
  statSkill: 'Métier',
  statSkillValue: 'Forge · Sagas',
  statSeen: 'Aperçu',
  statSeenValue: 'Marché · Feu · Scène',
  crossRailName: 'Quêtes secondaires',
  crossMeta: 'Disponibles',
  banquetEyebrow: 'Réservation requise',
  banquetTitle: 'Le Banquet de l’Équinoxe',
  banquetBody: 'Un grand banquet sera préparé par les chefs de clans du village gustatif. Le billet pour la grande tablée est vendu séparément des billets d’entrée.',
  banquetCta: 'Voir le menu et réserver',
  replier: 'Replier les activités',
  deplier: 'Voir les activités',
};

const EN: typeof FR = {
  home: 'Home',
  eyebrow: '2026 Programming',
  title: 'Activities',
  intro: 'A full weekend of tournaments, demonstrations, workshops, storytelling and shows. Below: the complete schedule and the spread of activities awaiting you at the festival.',
  scheduleEyebrow: 'Schedule',
  scheduleTitle: 'Schedule & Program',
  scheduleMeta: 'Entries',
  scheduleNote: 'The 2026 schedule will replace this keepsake once it is sealed.',
  scheduleVersion: 'Keepsake · 2025 edition',
  schedule2026Soon: 'The 2026 schedule will be unveiled shortly.',
  scheduleSouvenir: 'Meanwhile, here is last year’s schedule, as a keepsake: it gives a fair idea of the rhythm of a festival day.',
  horaireCard2025Title: '2025 Schedule · Keepsake',
  horaireCard2026Title: '2026 Schedule · Revealed soon',
  horaireCard2026LiveTitle: '2026 Schedule · Official',
  scheduleVersion2026: '2026 edition',
  scheduleNote2026: 'Schedule subject to last-minute adjustments.',
  dayLabel: 'Day',
  activitiesEyebrow: 'The grand program',
  activitiesMeta: 'Activities',
  activitiesTitle: 'Our Activities',
  activitiesLead: 'FMM is proud to present a wide variety of activities for kids and adults: equally enjoyable for medieval enthusiasts and casual visitors alike.',
  activitiesHint: 'Tap a tile to open the entry (soon)',
  activitiesFootMeta: 'Activities · 2026',
  filterLabel: 'Filter',
  filters: {
    all:      'All',
    combat:   'Combat',
    crafts:   'Crafts',
    shows:    'Shows',
    ripaille: 'Feasting',
    family:   'Family',
  },
  prevCategory: 'Previous category',
  nextCategory: 'Next category',
  meterCountdown: (j: number) => `The festival opens in ${j} days`,
  meterToday:     'The festival has begun',
  behourdRailName: 'Behourd Tournament',
  behourdMeta: 'Edition',
  behourdEyebrow: 'Early registration',
  behourdTitle: 'Behourd Tournament · 2027',
  behourdBody: 'Behourd returns to FMM in 2027: team-vs-team medieval combat in full armour, in the spirit of historical tournaments. Slots are limited and registration opens one year in advance to properly prepare teams, the arena and safety. Fill in the form below, then finalize your registration via Zeffy.',
  championRailName: 'Clan figure',
  championMeta: 'Rank',
  championRank: 'Jarl',
  championEyebrow: 'Featured character',
  championName: 'The Green Knight',
  championEpithet: '"Hey-hey, how’s it going buddy!"',
  championBody: 'Co-chief of the Autonomous Viking Clan with Ariane Sigurdsdottir. Deep in the northern woods, far from electricity, he tends a forge and a workshop: one of the living pillars of the festival. Find him at the market or around the fire for the sagas.',
  championCta: 'Visit his kiosk',
  statClan: 'Clan',
  statClanValue: 'Autonomous Viking',
  statSkill: 'Trade',
  statSkillValue: 'Forge · Sagas',
  statSeen: 'Seen at',
  statSeenValue: 'Market · Fire · Stage',
  crossRailName: 'Side quests',
  crossMeta: 'Available',
  banquetEyebrow: 'Reservation required',
  banquetTitle: 'The Equinox Banquet',
  banquetBody: 'A great banquet prepared by the clan chefs of the food village. The banquet seat is sold separately from regular entry tickets.',
  banquetCta: 'See the menu and book',
  replier: 'Collapse activities',
  deplier: 'Show activities',
};

export default ActivitesPage;
