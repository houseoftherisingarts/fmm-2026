// Boutiques William J. Walter au Québec.
// Relevé le 2026-08-25 à même https://williamjwalter.com/trouver-une-succursale
// (localisateur de boutiques, données lues directement dans les attributs
// data-title / data-address / data-phone / data-lat / data-lng du DOM rendu,
// donc les coordonnées viennent de la page elle-même, pas d'un géocodage).
// 35 boutiques trouvées sur cette page ; le site annonce « plus de 30 succursales ».
// Les 4 boutiques de contrôle (Gatineau, Hull, Aylmer, Buckingham) ont été
// retrouvées avec adresse et téléphone identiques à ceux fournis, à une
// exception près : la page (et OpenStreetMap, vérifié par géocodage inverse)
// donnent « boulevard de Carrefour » à Gatineau, et non « du Carrefour ».

export interface BoutiqueWJW {
  ville: string;      // « Buckingham (Gatineau) »
  adresse: string;    // « 746, avenue de Buckingham »
  codePostal: string;
  telephone?: string;
  lat: number;
  lon: number;
  region: string;     // « Outaouais », « Montréal », « Capitale-Nationale », …
}

export const BOUTIQUES_WJW: BoutiqueWJW[] = [
  // Abitibi-Témiscamingue
  {
    ville: 'Rouyn-Noranda',
    adresse: '17-A, rue Perreault Est',
    codePostal: 'J9X 3C1',
    lat: 48.2383122,
    lon: -79.0194815,
    region: 'Abitibi-Témiscamingue',
  },
  {
    ville: 'Val-d’Or',
    adresse: '678, 3e Avenue',
    codePostal: 'J9P 1S5',
    telephone: '819 824-2002',
    lat: 48.101731,
    lon: -77.7846551,
    region: 'Abitibi-Témiscamingue',
  },

  // Capitale-Nationale
  {
    ville: 'Saint-Roch (Québec)',
    adresse: '165, rue Saint-Joseph Est',
    codePostal: 'G1K 3A8',
    telephone: '581 981-2020',
    lat: 46.8126683,
    lon: -71.2289679,
    region: 'Capitale-Nationale',
  },

  // Centre-du-Québec
  {
    ville: 'Drummondville (Comptoir express)',
    adresse: '85, rue Notre-Dame',
    codePostal: 'J2C 2K7',
    telephone: '819 477-0337',
    lat: 45.8807624,
    lon: -72.5013971,
    region: 'Centre-du-Québec',
  },

  // Chaudière-Appalaches
  {
    ville: 'Thetford Mines',
    adresse: '1273, rue Turcotte Nord',
    codePostal: 'G6G 7P8',
    telephone: '418 755-0600',
    lat: 46.1175434,
    lon: -71.2966025,
    region: 'Chaudière-Appalaches',
  },

  // Estrie
  {
    ville: 'Magog',
    adresse: '1230, rue Sherbrooke',
    codePostal: 'J1X 5B5',
    telephone: '819 843-0707',
    lat: 45.2731324,
    lon: -72.1355753,
    region: 'Estrie',
  },
  {
    ville: 'Sherbrooke',
    adresse: '107, rue Minto',
    codePostal: 'J1H 0E9',
    telephone: '819 563-6294',
    lat: 45.3966494,
    lon: -71.8978035,
    region: 'Estrie',
  },

  // Lanaudière
  {
    ville: 'L’Assomption',
    adresse: '1111, boulevard de l’Ange-Gardien Nord, suite 112',
    codePostal: 'J5W 1N7',
    telephone: '450 938-1880',
    lat: 45.8463424,
    lon: -73.4244043,
    region: 'Lanaudière',
  },
  {
    ville: 'Terrebonne',
    adresse: '1685, chemin Gascon',
    codePostal: 'J6X 3Z6',
    telephone: '450 492-9767',
    lat: 45.7159609,
    lon: -73.6547789,
    region: 'Lanaudière',
  },

  // Laurentides
  {
    ville: 'Blainville',
    adresse: '947, boulevard du Curé-Labelle',
    codePostal: 'J7C 2L8',
    telephone: '450 420-4555',
    lat: 45.6739381,
    lon: -73.8809996,
    region: 'Laurentides',
  },
  {
    ville: 'Saint-Jérôme',
    adresse: '617, rue Saint-Georges',
    codePostal: 'J7Z 5C1',
    telephone: '450 432-4026',
    lat: 45.7844607,
    lon: -74.0014225,
    region: 'Laurentides',
  },
  {
    ville: 'Saint-Sauveur',
    adresse: '223, chemin du Lac-Millette',
    codePostal: 'J0R 1R6',
    telephone: '450 227-6162',
    lat: 45.891198,
    lon: -74.152717,
    region: 'Laurentides',
  },

  // Laval
  {
    ville: 'Marché Public 440 (Laval)',
    adresse: '3535, desserte Nord Laval Ouest (A-440)',
    codePostal: 'H7P 5G9',
    telephone: '450 681-9724',
    lat: 45.5685255,
    lon: -73.7686765,
    region: 'Laval',
  },
  {
    ville: 'Sainte-Dorothée (Laval)',
    adresse: '241-I, boulevard Samson',
    codePostal: 'H7X 3E4',
    telephone: '450 689-8436',
    lat: 45.5223039,
    lon: -73.7992188,
    region: 'Laval',
  },

  // Montréal
  {
    ville: 'Ahuntsic (Montréal)',
    adresse: '1314, rue Fleury Est',
    codePostal: 'H2C 1R3',
    telephone: '514 383-2999',
    lat: 45.5599059,
    lon: -73.6579605,
    region: 'Montréal',
  },
  {
    ville: 'Hochelaga (Montréal)',
    adresse: '5, place Simon-Valois',
    codePostal: 'H1W 0A6',
    telephone: '514 523-5444',
    lat: 45.5475593,
    lon: -73.5441203,
    region: 'Montréal',
  },
  {
    ville: 'Marché Atwater (Montréal)',
    adresse: '138, avenue Atwater',
    codePostal: 'H4C 2H6',
    telephone: '514 933-4070',
    lat: 45.4795951,
    lon: -73.5769951,
    region: 'Montréal',
  },
  {
    ville: 'Marché Jean-Talon (Montréal)',
    adresse: '244, place du Marché-du-Nord',
    codePostal: 'H2S 1A1',
    telephone: '514 279-0053',
    lat: 45.5357476,
    lon: -73.6141858,
    region: 'Montréal',
  },
  {
    ville: 'Les Halles d’Anjou (Montréal)',
    adresse: '7500, boulevard des Galeries-d’Anjou',
    codePostal: 'H1M 3M4',
    telephone: '514 351-6378',
    lat: 45.5974984,
    lon: -73.567366,
    region: 'Montréal',
  },
  {
    ville: 'Plateau Mont-Royal (Montréal)',
    adresse: '1957, avenue du Mont-Royal Est',
    codePostal: 'H2H 1J5',
    telephone: '514 528-1901',
    lat: 45.5342809,
    lon: -73.5734949,
    region: 'Montréal',
  },

  // Montérégie
  {
    ville: 'Boucherville',
    adresse: '450, boulevard de Mortagne',
    codePostal: 'J4B 1B8',
    telephone: '450 857-0601',
    lat: 45.5903833,
    lon: -73.4371045,
    region: 'Montérégie',
  },
  {
    ville: 'Delson',
    adresse: '67, boulevard Georges-Gagné Sud',
    codePostal: 'J5C 2E5',
    telephone: '450 845-6633',
    lat: 45.3796809,
    lon: -73.550621,
    region: 'Montérégie',
  },
  {
    ville: 'Granby',
    adresse: '165, rue Principale',
    codePostal: 'J2G 2V5',
    telephone: '450 372-7916',
    lat: 45.399789,
    lon: -72.7260214,
    region: 'Montérégie',
  },
  {
    ville: 'Greenfield Park (Longueuil)',
    adresse: '3840, boulevard Taschereau',
    codePostal: 'J4V 2H9',
    telephone: '450 923-8790',
    lat: 45.4873768,
    lon: -73.4710962,
    region: 'Montérégie',
  },
  {
    ville: 'Mont-Saint-Hilaire',
    adresse: '421, boulevard Sir-Wilfrid-Laurier',
    codePostal: 'J3H 3P2',
    telephone: '450 813-7323',
    lat: 45.5649803,
    lon: -73.1850976,
    region: 'Montérégie',
  },
  {
    ville: 'Saint-Bruno-de-Montarville',
    adresse: '1380, boulevard de Montarville',
    codePostal: 'J3V 3T6',
    telephone: '450 461-3033',
    lat: 45.5295235,
    lon: -73.3444154,
    region: 'Montérégie',
  },
  {
    ville: 'Saint-Hyacinthe',
    adresse: '1555, rue des Cascades',
    codePostal: 'J2S 3H7',
    telephone: '450 771-4331',
    lat: 45.6244787,
    lon: -72.9455853,
    region: 'Montérégie',
  },
  {
    ville: 'Saint-Jean-sur-Richelieu',
    adresse: '1055, boulevard du Séminaire Nord, local 105',
    codePostal: 'J3A 1R7',
    telephone: '450 741-4488',
    lat: 45.3383625,
    lon: -73.2677221,
    region: 'Montérégie',
  },
  {
    ville: 'Sorel-Tracy',
    adresse: '367, boulevard Fiset',
    codePostal: 'J3P 3R3',
    telephone: '450 780-7024',
    lat: 46.0363568,
    lon: -73.0938524,
    region: 'Montérégie',
  },
  {
    ville: 'Vieux-Longueuil (Longueuil)',
    adresse: '369, rue Saint-Jean',
    codePostal: 'J4H 1C7',
    telephone: '450 912-3873',
    lat: 45.5357577,
    lon: -73.5073006,
    region: 'Montérégie',
  },

  // Outaouais
  {
    ville: 'Aylmer (Gatineau)',
    adresse: '88, rue Principale',
    codePostal: 'J9H 3L8',
    telephone: '819 557-0626',
    lat: 45.394697,
    lon: -75.8458942,
    region: 'Outaouais',
  },
  {
    ville: 'Buckingham (Gatineau)',
    adresse: '746, avenue de Buckingham',
    codePostal: 'J8L 2H8',
    telephone: '819 617-6178',
    lat: 45.5788387,
    lon: -75.4121731,
    region: 'Outaouais',
  },
  {
    ville: 'Gatineau',
    adresse: '700, boulevard de Carrefour',
    codePostal: 'J8T 0H3',
    telephone: '819 205-0125',
    lat: 45.4854324,
    lon: -75.6796324,
    region: 'Outaouais',
  },
  {
    ville: 'Hull (Gatineau)',
    adresse: '320, boulevard Saint-Joseph',
    codePostal: 'J8Y 3Y8',
    telephone: '819 525-6555',
    lat: 45.4414628,
    lon: -75.7315059,
    region: 'Outaouais',
  },
];
