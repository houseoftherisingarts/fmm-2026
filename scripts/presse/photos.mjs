// ─── Les douze photographies du kit de presse ────────────────────────
// Choisies le 2026-08-31 dans les 656 originaux de Léna LeBozec qui
// vivent dans public/histoire/archives/lena/, par planches-contact de
// quarante regardées une à une. Critères : netteté, exposition, aucun
// visage d'enfant reconnaissable en gros plan, et de la VARIÉTÉ, parce
// que la première série était vikings de bout en bout.
//
// 🚨 Aucun filtre, aucun dégradé, aucune retouche de couleur sur ces
// photos : Léna travaille déjà sa couleur (ordre d'Alex). Le recadrage
// 16:9 est la seule opération permise.
//
// `focus` dit où tombe le CENTRE du recadrage, en fraction de la
// hauteur de l'original. Les portraits (1280 × 1920) perdent près des
// deux tiers de leur hauteur en 16:9 : sans ce repère, le chevalier
// sort du cadre par le haut et il ne reste que le sable.
//
// `side` a été calculé, pas deviné : le bandeau se pose du côté où
// l'image porte le moins d'arêtes (énergie de gradient mesurée sur les
// 45 % de chaque bord du recadrage 16:9).
//
// Depuis le 2026-08-31, chaque carte postale porte aussi un texte : une
// accroche et une ou deux phrases, soit un fait général exact sur ce que
// montre la photo, soit une information tirée du site. Elle se rend
// donc en deux versions, avec texte et photo seule.
//
// Retirée le 2026-08-31 sur ordre d'Alex : 2025-IMG_6481, « le camp la
// nuit », éclairée aux DEL.

/** Le domaine court. Il redirige en 301 vers le long, chemin conservé. */
export const BASE_URL = 'https://festivalmedieval.org';

/** Ce que porte la ligne de lien, en bas à gauche de chaque visuel. */
export const LIEN_COURT = 'festivalmedieval.org';

export const PHOTOS = [
  {
    id: '01', slug: 'chevalier-plumet', orig: '2025-IMG_5743', focus: 0.40, side: 'right',
    fr: {
      kicker: 'Joute équestre',
      hook: 'Le chevalier au plumet',
      body: 'Le panache se porte au sommet du heaume et sert à reconnaître un cavalier de loin, quand l’armure cache tout le reste. Les joutes du festival se tiennent avec l’Association Médiévale du Québec.',
      meta: 'Arène · du 25 au 27 septembre 2026',
    },
    en: {
      kicker: 'Mounted joust',
      hook: 'The plumed knight',
      body: 'The plume rides on top of the helm and lets a rider be recognised from a distance, when the armour hides everything else. The festival’s jousts are held with the Association Médiévale du Québec.',
      meta: 'Arena · September 25 to 27, 2026',
    },
  },
  {
    id: '02', slug: 'chevalier-lice', orig: '2025-IMG_5321', focus: 0.44, side: 'left',
    fr: {
      kicker: 'Joute équestre',
      hook: 'Le chevalier en lice',
      body: 'La lice est la barrière de bois qui sépare les deux cavaliers pendant la charge, et elle a été dressée pour empêcher les chevaux de se heurter. Le mot a fini par désigner le champ tout entier.',
      meta: 'Arène · trois jours',
    },
    en: {
      kicker: 'Mounted joust',
      hook: 'The knight in the lists',
      body: 'The tilt is the wooden barrier that keeps two riders apart during the charge, raised so the horses would not collide. The word ended up naming the whole field.',
      meta: 'Arena · three days',
    },
  },
  {
    id: '03', slug: 'joute', orig: '2025-IMG_5526', focus: 0.50, side: 'right',
    fr: {
      kicker: 'Joute équestre',
      hook: 'La lance et le point',
      body: 'Une lance de joute est taillée pour se rompre à l’impact, ce qui protège les deux cavaliers et donne le point. La finale se court le dimanche.',
      meta: 'Arène · finale du dimanche',
    },
    en: {
      kicker: 'Mounted joust',
      hook: 'The lance and the point',
      body: 'A jousting lance is made to break on impact, which protects both riders and scores the point. The final is run on Sunday.',
      meta: 'Arena · Sunday final',
    },
  },
  {
    id: '04', slug: 'forge', orig: '2024-IMG_5649', focus: 0.50, side: 'right',
    fr: {
      kicker: 'La forge',
      hook: 'Le fer se lit à la couleur',
      body: 'Le forgeron juge la température de son fer à la couleur qu’il prend dans le feu, et il frappe pendant que le métal reste orange. Les artisans démonstrateurs forgent les trois jours.',
      meta: 'Village paysan · démonstrations',
    },
    en: {
      kicker: 'The forge',
      hook: 'Iron read by its colour',
      body: 'A smith judges the temperature of his iron by the colour it takes in the fire, and strikes while the metal stays orange. The demonstrator artisans forge all three days.',
      meta: 'Peasant village · demonstrations',
    },
  },
  {
    id: '05', slug: 'rouet', orig: '2024-IMG_5475', focus: 0.40, side: 'right',
    fr: {
      kicker: 'Tissage',
      hook: 'Le rouet',
      body: 'Le rouet arrive en Europe vers le treizième siècle et remplace le fuseau tenu à la main, en filant plusieurs fois plus vite. Le tissage compte parmi les ateliers ouverts toute la fin de semaine.',
      meta: 'Ateliers · toute la fin de semaine',
    },
    en: {
      kicker: 'Weaving',
      hook: 'The spinning wheel',
      body: 'The spinning wheel reaches Europe around the thirteenth century and replaces the hand-held spindle, spinning several times faster. Weaving is one of the workshops open all weekend.',
      meta: 'Workshops · all weekend long',
    },
  },
  {
    id: '06', slug: 'poteries', orig: '2025-IMG_4526', focus: 0.50, side: 'right',
    fr: {
      kicker: 'Le marché',
      hook: 'Les poteries',
      body: 'Une terre cuite sort d’un four à bois, et sa couleur doit autant à l’argile qu’à la place que le pot occupait dans le four. Les artisans tiennent boutique au marché pendant les trois jours.',
      meta: 'Marché médiéval · trois jours',
    },
    en: {
      kicker: 'The market',
      hook: 'The pottery',
      body: 'Earthenware comes out of a wood-fired kiln, and its colour owes as much to the clay as to where the pot stood in the kiln. The artisans keep shop at the market for all three days.',
      meta: 'Medieval market · three days',
    },
  },
  {
    id: '07', slug: 'vielle-a-roue', orig: '2025-IMG_6090', focus: 0.45, side: 'left',
    fr: {
      kicker: 'Musique',
      hook: 'La vielle à roue',
      body: 'La vielle à roue est un instrument à cordes frottées par une roue de bois enduite de colophane, que la main droite fait tourner à la manivelle pendant que la gauche joue sur un petit clavier. Elle tient un bourdon continu, comme la cornemuse.',
      meta: 'Scènes · du 25 au 27 septembre 2026',
    },
    en: {
      kicker: 'Music',
      hook: 'The hurdy-gurdy',
      body: 'The hurdy-gurdy is a string instrument whose strings are rubbed by a rosined wooden wheel, cranked by the right hand while the left plays a small keyboard. It holds a continuous drone, like the bagpipe.',
      meta: 'Stages · September 25 to 27, 2026',
    },
  },
  {
    id: '08', slug: 'convives', orig: '2025-IMG_8568', focus: 0.50, side: 'left',
    fr: {
      kicker: 'Le banquet',
      hook: 'Les convives à la table',
      body: 'Au banquet, le service se fait à la table et les bardes jouent entre les plats. Cinquante places sont mises à 65 $ plus taxes, et la date limite d’inscription tombe le 17 septembre 2026.',
      meta: 'Banquet médiéval · 65 $ plus taxes',
    },
    en: {
      kicker: 'The banquet',
      hook: 'The guests at table',
      body: 'At the banquet, service comes to the table and the bards play between the courses. Fifty seats are set at $65 plus tax, and registration closes on September 17, 2026.',
      meta: 'Medieval banquet · $65 plus tax',
    },
  },
  {
    id: '09', slug: 'paniers-herbes', orig: '2025-IMG_8121', focus: 0.55, side: 'right',
    fr: {
      kicker: 'Herboristerie',
      hook: 'Les paniers d’herbes',
      body: 'Les plantes se séchaient en bottes suspendues la tête en bas, à l’ombre et au sec, pour garder l’huile dans la feuille. Les sorcières du festival tiennent la table d’herbes.',
      meta: 'Ateliers · toute la fin de semaine',
    },
    en: {
      kicker: 'Herbalism',
      hook: 'The herb baskets',
      body: 'Plants were dried in bunches hung upside down, in shade and dry air, to keep the oil in the leaf. The festival’s witches keep the herb table.',
      meta: 'Workshops · all weekend long',
    },
  },
  {
    id: '10', slug: 'mur-de-boucliers', orig: '2025-IMG_5050', focus: 0.50, side: 'left',
    fr: {
      kicker: 'Combats vikings',
      hook: 'Le mur de boucliers',
      body: 'Le mur de boucliers tient tant que personne ne recule : chaque bouclier couvre le flanc du voisin, et la ligne cède dès qu’un homme tombe. Les troupes vikings le remontent dans l’arène.',
      meta: 'Arène · trois jours',
    },
    en: {
      kicker: 'Viking combat',
      hook: 'The shield wall',
      body: 'The shield wall holds as long as nobody steps back: each shield covers the neighbour’s flank, and the line gives way the moment a man falls. The Viking troupes re-form it in the arena.',
      meta: 'Arena · three days',
    },
  },
  {
    id: '11', slug: 'guerrier-epee', orig: '2025-IMG_5107', focus: 0.50, side: 'right',
    fr: {
      kicker: 'Combats vikings',
      hook: 'Le guerrier à l’épée',
      body: 'Le bouclier rond viking se tient par une poignée centrale, derrière une bosse de fer, ce qui permet de dévier un coup au lieu de l’encaisser. Les combats de l’arène ne sont pas scriptés.',
      meta: 'Arène · trois jours',
    },
    en: {
      kicker: 'Viking combat',
      hook: 'The warrior with the sword',
      body: 'The Viking round shield is held by a central grip behind an iron boss, which lets a blow be turned aside instead of absorbed. The fights in the arena are unscripted.',
      meta: 'Arena · three days',
    },
  },
  {
    id: '12', slug: 'feu-dragon', orig: '2025-IMG_6377', focus: 0.50, side: 'left',
    fr: {
      kicker: 'Le campement nordique',
      hook: 'La tête sculptée, au feu',
      body: 'Une tête de bête taillée dans le bois veille sur le camp, et le feu la découpe sur le ciel de fin de journée. Le campement viking dresse ses tentes au cœur du festival.',
      meta: 'Campement viking · trois jours',
    },
    en: {
      kicker: 'The Nordic camp',
      hook: 'The carved head by firelight',
      body: 'A beast’s head cut from wood keeps watch over the camp, and the fire draws it against the evening sky. The Viking camp pitches its tents at the heart of the festival.',
      meta: 'Viking camp · three days',
    },
  },
];
