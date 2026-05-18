// Role descriptions for the bénévole "aide-mémoire". Sourced verbatim
// from Maïté's recruitment guide ("Recrutement FMM 2026") so the public
// space and the printable aide-mémoire stay in sync.

export interface BenevoleRoleSpec {
  id:            string;        // matches a team id where applicable
  title:         string;
  icon:          string;
  description:   string;
  taches:        string[];
  competences:   string[];
  avantages:     string[];
  langues:       string;
  horaire:       string;
}

const COMMON_ADVANTAGES = [
  "Deux billets d'entrée pour la fin de semaine, pour toi et une personne de ton choix",
  'Repas et rafraîchissements offerts pendant ton quart de bénévolat',
  "Articles exclusifs de notre 6e édition",
  'Espace de camping disponible sur demande',
  "L'occasion de rencontrer une équipe passionnée et de vivre une expérience immersive médiévale !",
  "D'autres avantages possibles",
];

const COMMON_LANGUES = 'Français (obligatoire) et anglais (de base OK)';
const COMMON_HORAIRE = '1 à 3 jours · heures à confirmer';

export const BENEVOLE_ROLES: BenevoleRoleSpec[] = [
  {
    id: 'team-accueil',
    title: 'Accueil',
    icon: '🎟️',
    description:
      "À l'accueil, tu assures une réception chaleureuse du public du festival. Tu es responsable de la vente des billets à l'entrée ou de la validation de ceux achetés en ligne. Tu contribues ainsi à offrir une première expérience positive et fluide à chaque personne.",
    taches: [
      'Accueillir les personnes avec le sourire',
      "Encaisser les paiements des billets d'entrée (argent liquide, carte, etc.)",
      "Vérifier la validité des billets achetés à l'avance",
      'Fournir des informations générales sur le festival si besoin',
      "Maintenir un espace d'accueil ordonné et convivial",
    ],
    competences: [
      "Sens de l'accueil et courtoisie",
      'Rigueur pour gérer les entrées et paiements',
      'Bonne communication et patience',
      "Capacité à travailler en équipe",
    ],
    avantages: COMMON_ADVANTAGES,
    langues:   COMMON_LANGUES,
    horaire:   COMMON_HORAIRE,
  },
  {
    id: 'team-securite',
    title: 'Sécurité',
    icon: '🛡️',
    description:
      "En tant qu'agent·e de sécurité, tu patrouilles sur le site afin d'assurer le bon déroulement de l'événement, dans le respect des règles établies. Tu contribues à maintenir un environnement sûr et convivial pour l'ensemble du public. En cas de situation nécessitant une intervention particulière, tu fais rapidement appel aux personnes ressources désignées.",
    taches: [
      'Patrouiller régulièrement sur le site du festival',
      'Veiller au respect des consignes de sécurité et des règles du site',
      'Identifier et signaler toute situation anormale ou problématique',
      "Collaborer avec l'équipe organisatrice et les services concernés en cas d'incident (pompiers sur place) ou d'accident (équipe médicale sur place)",
    ],
    competences: [
      "Sens de l'observation et vigilance",
      'Calme, diplomatie et capacité à gérer les situations difficiles',
      'Sens des responsabilités et fiabilité',
      "Bon esprit d'équipe",
    ],
    avantages: COMMON_ADVANTAGES,
    langues:   COMMON_LANGUES,
    horaire:   COMMON_HORAIRE,
  },
  {
    id: 'team-bar',
    title: 'Bar / Taverne',
    icon: '🍺',
    description:
      "La taverne est l'un des lieux les plus animés et festifs du festival ! En tant que barmaid ou barman, tu seras responsable de servir des breuvages (avec ou sans alcool) à nos valeureux invités. Tu contribueras à créer une ambiance chaleureuse, conviviale et… peut-être un peu épique !",
    taches: [
      'Servir les consommations (boissons alcoolisées et non-alcoolisées)',
      'Gestion des paiements (liquide, comptant, etc)',
      'Maintenir ton espace propre et accueillant',
      "Faire vivre l'ambiance festive de la taverne !",
    ],
    competences: [
      "Sourire, enthousiasme et sens de l'accueil",
      'Capacité à travailler en équipe et à rythme soutenu',
      "Avoir l'âge légal pour servir de l'alcool (18 ans +)",
    ],
    avantages: COMMON_ADVANTAGES,
    langues:   COMMON_LANGUES,
    horaire:   COMMON_HORAIRE,
  },
  {
    id: 'team-stationnement',
    title: 'Stationnement',
    icon: '🅿️',
    description:
      "Le rôle au stationnement convient aux personnes à l'aise de rester debout et en mouvement. Il consiste à orienter les festivalier·ères vers les zones de stationnement appropriées.",
    taches: [
      'Accueillir et orienter les festivalier·ères',
      'Gérer les espaces de stationnement',
      'Assurer une présence active en position debout et en déplacement',
    ],
    competences: [
      "Attitude chaleureuse, énergie positive et sens de l'accueil",
      'Esprit de collaboration et aisance dans un environnement dynamique',
      "Excellente communication avec l'équipe",
      'Confort à rester debout et à être en mouvement continu',
    ],
    avantages: COMMON_ADVANTAGES,
    langues:   COMMON_LANGUES,
    horaire:   COMMON_HORAIRE,
  },
  {
    id: 'team-entretien',
    title: 'Entretien du site',
    icon: '🧹',
    description:
      "La personne à l'entretien veille à la propreté du site en ramassant les déchets, en vidant les poubelles et en maintenant les espaces communs propres et sécuritaires. Elle intervient rapidement en cas de besoin afin d'assurer un environnement agréable pour l'ensemble du public.",
    taches: [
      "Ramasser les déchets sur l'ensemble du site",
      'Vider et remplacer les poubelles',
      'Nettoyer les espaces communs et installations au besoin',
      'Intervenir rapidement en cas de déversement ou saleté importante',
      'Maintenir un environnement propre, sécuritaire et accueillant',
    ],
    competences: [
      'Autonomie et fiabilité',
      'Bonne condition physique (travail en mouvement et à l\'extérieur)',
      "Attitude positive et esprit d'équipe",
    ],
    avantages: COMMON_ADVANTAGES,
    langues:   COMMON_LANGUES,
    horaire:   COMMON_HORAIRE,
  },
  {
    id: 'team-camping',
    title: 'Camping',
    icon: '⛺',
    description:
      "La personne au camping assure l'accueil et l'orientation des campeur·euses vers les emplacements prévus, tout en veillant au respect des règles du site. Elle contribue à maintenir un environnement sécuritaire, calme et agréable pour l'ensemble des personnes sur le terrain.",
    taches: [
      'Accueillir et orienter les campeur·euses vers les emplacements',
      'Vérifier et appliquer les règles du site de camping',
      'Assurer une présence sur le terrain pour répondre aux besoins',
      'Veiller au bon déroulement et à la sécurité de la zone de camping',
    ],
    competences: [
      "Sens de l'accueil et attitude respectueuse",
      'Capacité à gérer des situations variées avec calme',
      "Esprit d'équipe et bonne communication",
    ],
    avantages: COMMON_ADVANTAGES,
    langues:   COMMON_LANGUES,
    horaire:   COMMON_HORAIRE,
  },
];

// Key admin contacts surfaced in the aide-mémoire. These are real
// numbers used during the festival weekend; clip from MEMORY pointers
// when we get full directory access.
export interface KeyContact {
  name:    string;
  role:    string;
  phone?:  string;
  email?:  string;
  tone?:   'brass' | 'blush' | 'ivory';
}
export const KEY_CONTACTS: KeyContact[] = [
  { name: 'Maïté Fournel',        role: 'Coordination bénévoles',  phone: '819-981-1007',  email: 'm.fournel11@gmail.com' },
  { name: 'Tristan Côté-Hotte',   role: 'Co-organisateur',         phone: '819-428-1280',  email: 'tristan_cote_hotte@hotmail.fr' },
  { name: 'Alex St-Laurent',      role: 'Co-organisateur · Web',    phone: '514-418-3450',  email: 'alex@lesalondesinconnus.com' },
  { name: 'Jesse Dippy',          role: 'Co-organisateur',         phone: '904-994-4072' },
  { name: 'Mikael Lamarche',      role: 'Co-organisateur',         phone: '819-983-1631',  email: 'lamarchemikael45@gmail.com' },
  { name: 'Léna Le Bozec',        role: 'Co-organisatrice',        phone: '819-983-8409',  email: 'lebozeclena@gmail.com' },
  { name: 'Urgences',             role: 'Sur place / 911',         phone: '911',           tone: 'blush' },
];
