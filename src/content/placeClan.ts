// ─── Ta place dans le clan · le jeu de l'année de la Peste ──────────
// Un questionnaire de quinze questions qui dit quelle place une
// personne tient naturellement dans une équipe. Le moteur ne connaît
// que SEPT fonctions, toujours les mêmes : celui qui décide, celui qui
// fonce, celui qui part devant, celui qui comprend, celui qui fabrique,
// celui qui soigne, celui qui relie. Le groupe choisi à la première
// question (chevaliers, vikings, pirates…) ne change que les titres :
// un souverain s'appelle Roi chez les chevaliers, Jarl chez les
// vikings, Capitaine chez les pirates. Même fonction, autre nom.
//
// Les quatre archétypes de « King, Warrior, Magician, Lover » (Moore et
// Gillette) se lisent par-dessus : chaque fonction appartient à un
// archétype, et l'archétype d'une personne est celui dont les
// fonctions ont reçu le plus de points. Une équipe complète compte une
// personne par fonction, donc sept.
//
// Tout le contenu vit ici, sans logique : l'admin (Jeux → Place dans le
// clan) lit ce fichier pour dessiner la carte des questions et des
// poids. Changer une question, c'est changer ce fichier.

export type Fonction =
  | 'souverain' | 'champion' | 'eclaireur' | 'sage' | 'batisseur' | 'soigneur' | 'heraut';

export type Archetype = 'roi' | 'guerrier' | 'magicien' | 'amant';

export const FONCTIONS: Fonction[] = [
  'souverain', 'champion', 'eclaireur', 'sage', 'batisseur', 'soigneur', 'heraut',
];

export const TAILLE_EQUIPE = FONCTIONS.length;

export interface FicheFonction {
  cle: Fonction;
  archetype: Archetype;
  /** Le nom neutre, celui du moteur, quand aucun groupe n'est choisi. */
  nom: string;
  /** Ce que cette personne fait vraiment dans une équipe. */
  role: string;
  /** Les signes qui ne trompent pas. */
  signes: string;
  /** La fonction dont l'équipe a le plus besoin à ses côtés. */
  complement: Fonction;
}

export const FICHES: Record<Fonction, FicheFonction> = {
  souverain: {
    cle: 'souverain', archetype: 'roi', nom: 'Le souverain',
    role: "Vous prenez la décision quand personne ne la prend, et vous la tenez. L'équipe sait où elle va parce que vous l'avez dit à voix haute.",
    signes: "Vous répartissez les tâches sans qu'on vous le demande. Une décision qui traîne vous use plus qu'une journée de travail.",
    complement: 'sage',
  },
  champion: {
    cle: 'champion', archetype: 'guerrier', nom: 'Le champion',
    role: "Vous êtes le premier dedans quand ça brasse. Le feu, la charge, la tente qui tombe : vous y allez pendant que les autres en parlent encore.",
    signes: "Vous voulez gagner. Rester assis à discuter quand il y a de l'ouvrage vous rend fou.",
    complement: 'soigneur',
  },
  eclaireur: {
    cle: 'eclaireur', archetype: 'guerrier', nom: "L'éclaireur",
    role: "Vous partez devant. Vous savez où passe l'eau et où dort le vent, vous savez qui connaît qui et par où sortir. L'équipe voit plus loin grâce à vous.",
    signes: "Vous avez déjà repéré la sortie. Vous préférez la tournée du terrain à la réunion.",
    complement: 'souverain',
  },
  sage: {
    cle: 'sage', archetype: 'magicien', nom: 'Le sage',
    role: "Vous comprenez avant les autres. Vous lisez les règles deux fois, vous voyez le coup dix tours à l'avance, et vous cherchez pourquoi ça a cassé avant de réparer.",
    signes: "Vous conseillez dans l'oreille, jamais devant tout le monde. Le bruit sans un moment pour penser vous épuise.",
    complement: 'champion',
  },
  batisseur: {
    cle: 'batisseur', archetype: 'magicien', nom: 'Le bâtisseur',
    role: "Vous fabriquez. Ce qui casse, vous le réparez avec ce qu'il y a sous la main, et ce que vous montez tient encore debout le lendemain.",
    signes: "Vous montrez le geste une fois et vous laissez faire. Votre fierté, c'est l'ouvrage qui reste.",
    complement: 'heraut',
  },
  soigneur: {
    cle: 'soigneur', archetype: 'amant', nom: 'Le soigneur',
    role: "Vous prenez soin. Tout le monde a mangé, dormi au sec et personne n'est resté blessé de la journée : c'est votre victoire à vous.",
    signes: "Vous offrez à manger avant de poser une question. Quelqu'un mis de côté sans que personne ne bouge, vous ne le supportez pas.",
    complement: 'champion',
  },
  heraut: {
    cle: 'heraut', archetype: 'amant', nom: 'Le héraut',
    role: "Vous reliez les gens. Vous trouvez les mots qui ramènent deux personnes à la même table, vous présentez la recrue à tout le monde, et le soir, c'est votre histoire dont on rit encore.",
    signes: "Vous faites le tour des tentes pour prendre des nouvelles. Une table où quelqu'un ne comprend pas le jeu, vous la réparez.",
    complement: 'batisseur',
  },
};

export const ARCHETYPES: Record<Archetype, { nom: string; phrase: string }> = {
  roi:      { nom: 'Le Roi',      phrase: "L'ordre, la décision et la responsabilité. Vous portez le poids pour que les autres avancent." },
  guerrier: { nom: 'Le Guerrier', phrase: "L'action, le courage et le terrain. Vous y allez, et vous y allez en premier." },
  magicien: { nom: 'Le Magicien', phrase: "Le savoir, la ruse et la main. Vous comprenez et vous transformez ce que vous touchez." },
  amant:    { nom: "L'Amant",     phrase: "Le lien, le soin et la parole. Vous tenez l'équipe ensemble sans que personne ne s'en rende compte." },
};

// ── Les groupes, et le nom que chaque fonction y porte ──────────────
export type Groupe =
  | 'chevaliers' | 'vikings' | 'pirates' | 'artisans' | 'clerge' | 'saltimbanques';

export interface FicheGroupe {
  cle: Groupe;
  nom: string;
  /** Le mot de bienvenue, sur la page de choix. */
  devise: string;
  /** Le nom de l'équipe complète chez ce groupe. */
  equipe: string;
  titres: Record<Fonction, string>;
}

export const GROUPES: Record<Groupe, FicheGroupe> = {
  chevaliers: {
    cle: 'chevaliers', nom: 'Les chevaliers',
    devise: "La cour, l'épée et le serment.",
    equipe: 'la table ronde',
    titres: {
      souverain: 'Roi', champion: 'Champion', eclaireur: 'Éclaireur', sage: 'Chancelier',
      batisseur: 'Forgeron', soigneur: 'Intendant', heraut: 'Héraut',
    },
  },
  vikings: {
    cle: 'vikings', nom: 'Les vikings',
    devise: 'Le drakkar, la mer et le feu.',
    equipe: "l'équipage du drakkar",
    titres: {
      souverain: 'Jarl', champion: 'Berserker', eclaireur: 'Vigie', sage: 'Völva',
      batisseur: 'Charpentier de drakkar', soigneur: 'Herboriste', heraut: 'Skald',
    },
  },
  pirates: {
    cle: 'pirates', nom: 'Les pirates',
    devise: 'Le pavillon, le large et le butin.',
    equipe: "l'équipage",
    titres: {
      souverain: 'Capitaine', champion: "Maître d'armes", eclaireur: 'Vigie', sage: 'Navigateur',
      batisseur: 'Charpentier de bord', soigneur: 'Chirurgien de bord', heraut: 'Quartier-maître',
    },
  },
  artisans: {
    cle: 'artisans', nom: 'Les artisans',
    devise: "L'équerre, le compas et l'ouvrage.",
    equipe: 'la loge',
    titres: {
      souverain: 'Vénérable Maître', champion: 'Couvreur', eclaireur: 'Expert', sage: 'Orateur',
      batisseur: 'Architecte', soigneur: 'Hospitalier', heraut: 'Maître des cérémonies',
    },
  },
  clerge: {
    cle: 'clerge', nom: 'Le clergé',
    devise: 'Le cloître, le livre et la cloche.',
    equipe: "l'abbaye",
    titres: {
      souverain: 'Évêque', champion: 'Croisé', eclaireur: 'Pèlerin', sage: 'Chanoine',
      batisseur: 'Frère bâtisseur', soigneur: 'Frère hospitalier', heraut: 'Diacre',
    },
  },
  saltimbanques: {
    cle: 'saltimbanques', nom: 'Les saltimbanques',
    devise: 'La roulotte, la corde et la foule.',
    equipe: 'la troupe',
    titres: {
      souverain: 'Maître de troupe', champion: 'Cracheur de feu', eclaireur: 'Funambule', sage: 'Conteur',
      batisseur: 'Machiniste', soigneur: 'Cuisinier de troupe', heraut: 'Bonimenteur',
    },
  },
};

export const LISTE_GROUPES: Groupe[] = [
  'chevaliers', 'vikings', 'pirates', 'artisans', 'clerge', 'saltimbanques',
];

// ── Les quinze questions ────────────────────────────────────────────
// Chaque réponse donne des points à une, deux ou trois fonctions. Les
// poids sont visibles dans l'admin : c'est là qu'on ajuste le tir.

export type Poids = Partial<Record<Fonction, number>>;

export interface Reponse { texte: string; poids: Poids }
export interface Question { id: string; texte: string; reponses: Reponse[] }

export const QUESTIONS: Question[] = [
  {
    id: 'q01',
    texte: "Le campement s'installe à la tombée du jour et personne ne sait par où commencer.",
    reponses: [
      { texte: 'Je répartis les tâches et je donne le signal.', poids: { souverain: 3 } },
      { texte: 'Je prends la hache et je monte la première tente.', poids: { champion: 2, batisseur: 1 } },
      { texte: "Je vais voir où passe l'eau et où dort le vent avant de planter quoi que ce soit.", poids: { eclaireur: 2, sage: 1 } },
      { texte: 'Je fais chauffer quelque chose pour que tout le monde tienne le coup.', poids: { soigneur: 3 } },
    ],
  },
  {
    id: 'q02',
    texte: 'Deux membres de la troupe se disputent devant tout le monde.',
    reponses: [
      { texte: 'Je tranche, et la décision tient.', poids: { souverain: 2, champion: 1 } },
      { texte: 'Je les prends à part et je trouve les mots qui les ramènent à la même table.', poids: { heraut: 3 } },
      { texte: "J'écoute sans rien dire, puis je pose la question que personne n'a posée.", poids: { sage: 3 } },
      { texte: 'Je veille à ce que personne ne reste blessé de la scène, et je sers un bol.', poids: { soigneur: 2, heraut: 1 } },
    ],
  },
  {
    id: 'q03',
    texte: "Une pièce de l'équipement casse la veille du grand jour.",
    reponses: [
      { texte: "Je la répare avec ce qu'il y a sous la main. Ça tiendra.", poids: { batisseur: 3 } },
      { texte: "Je trouve à qui l'emprunter avant l'aube.", poids: { eclaireur: 2, heraut: 1 } },
      { texte: "Je refais le plan pour que l'équipe s'en passe.", poids: { sage: 2, souverain: 1 } },
      { texte: 'Je réveille la bonne personne et je lui dis quoi faire.', poids: { souverain: 2, champion: 1 } },
    ],
  },
  {
    id: 'q04',
    texte: 'Ce qui vous fait le plus plaisir après une journée de festival :',
    reponses: [
      { texte: 'Tout le monde a mangé et dormi au sec.', poids: { soigneur: 3 } },
      { texte: 'Ce que nous avons bâti de nos mains est encore debout.', poids: { batisseur: 3 } },
      { texte: "Les gens rient encore de l'histoire que j'ai racontée.", poids: { heraut: 2, sage: 1 } },
      { texte: "Le plan a tenu, à l'heure, sans un accroc.", poids: { souverain: 2, champion: 1 } },
    ],
  },
  {
    id: 'q05',
    texte: "Un enfant perdu vous est confié.",
    reponses: [
      { texte: 'Je le fais parler, je le rassure, il me suit.', poids: { soigneur: 2, heraut: 1 } },
      { texte: "Je lance l'appel au micro et je poste des gens aux sorties.", poids: { souverain: 2, eclaireur: 1 } },
      { texte: "Je pars fouiller le terrain là où les enfants vont d'habitude.", poids: { eclaireur: 3 } },
      { texte: 'Je reste avec lui et je lui apprends un nœud en attendant.', poids: { batisseur: 1, soigneur: 1, sage: 1 } },
    ],
  },
  {
    id: 'q06',
    texte: 'Dans une partie de jeu de société :',
    reponses: [
      { texte: 'Je veux gagner et je fonce.', poids: { champion: 3 } },
      { texte: "Je lis les règles deux fois et je vois le coup dix tours à l'avance.", poids: { sage: 3 } },
      { texte: "Je m'assure que tout le monde comprend et s'amuse.", poids: { heraut: 2, soigneur: 1 } },
      { texte: 'Je forme des alliances et je mène la table.', poids: { souverain: 3 } },
    ],
  },
  {
    id: 'q07',
    texte: 'Devant un vrai danger, un feu, une blessure, un orage :',
    reponses: [
      { texte: 'Je suis le premier dedans.', poids: { champion: 3 } },
      { texte: 'Je soigne, je couvre, je calme.', poids: { soigneur: 3 } },
      { texte: 'Je donne des ordres clairs et je compte les têtes.', poids: { souverain: 3 } },
      { texte: "J'ai déjà repéré la sortie et le chemin le plus court.", poids: { eclaireur: 3 } },
    ],
  },
  {
    id: 'q08',
    texte: 'Votre place naturelle autour du feu :',
    reponses: [
      { texte: 'Je raconte, je chante, je fais rire.', poids: { heraut: 3 } },
      { texte: "J'entretiens le feu et je taille du bois.", poids: { batisseur: 2, champion: 1 } },
      { texte: "J'écoute et j'observe, un peu en retrait.", poids: { sage: 3 } },
      { texte: "Je fais passer les bols et je veille à ce que personne n'ait froid.", poids: { soigneur: 3 } },
    ],
  },
  {
    id: 'q09',
    texte: 'Un inconnu arrive au campement et demande à rester.',
    reponses: [
      { texte: "Je décide s'il reste, et à quelles conditions.", poids: { souverain: 3 } },
      { texte: 'Je lui offre à manger avant de poser une question.', poids: { soigneur: 3 } },
      { texte: "Je vais voir d'où il vient et qui le connaît.", poids: { eclaireur: 2, sage: 1 } },
      { texte: "Je le présente à tout le monde pour qu'il trouve sa place.", poids: { heraut: 3 } },
    ],
  },
  {
    id: 'q10',
    texte: "Vos amis, quand vous avez le dos tourné, disent :",
    reponses: [
      { texte: '« Rien ne se décide sans toi. »', poids: { souverain: 3 } },
      { texte: '« Tu as toujours une idée pour réparer. »', poids: { batisseur: 3 } },
      { texte: '« Tu vois venir les coups avant tout le monde. »', poids: { sage: 2, eclaireur: 1 } },
      { texte: '« Tu prends soin de tout le monde. »', poids: { soigneur: 3 } },
    ],
  },
  {
    id: 'q11',
    texte: 'Vous avez une heure libre pendant le festival.',
    reponses: [
      { texte: "Je vais au béhourd, ou je m'entraîne.", poids: { champion: 3 } },
      { texte: 'Je fouille le marché en cherchant de quoi fabriquer quelque chose.', poids: { batisseur: 2, eclaireur: 1 } },
      { texte: "Je m'assois à la conférence ou à l'atelier d'écriture.", poids: { sage: 3 } },
      { texte: 'Je fais le tour des tentes pour prendre des nouvelles.', poids: { heraut: 2, soigneur: 1 } },
    ],
  },
  {
    id: 'q12',
    texte: 'Quand le plan ne marche plus :',
    reponses: [
      { texte: "J'improvise sur place et je fonce.", poids: { champion: 2, eclaireur: 1 } },
      { texte: "Je remets tout le monde d'accord sur un nouveau plan.", poids: { souverain: 3 } },
      { texte: 'Je cherche pourquoi ça a cassé avant de réparer.', poids: { sage: 3 } },
      { texte: "Je bricole une solution qui tient jusqu'au soir.", poids: { batisseur: 3 } },
    ],
  },
  {
    id: 'q13',
    texte: "Votre rapport à l'autorité :",
    reponses: [
      { texte: 'Je la prends quand personne ne la prend.', poids: { souverain: 3 } },
      { texte: "Je la respecte tant qu'elle est juste. Sinon, je le dis en face.", poids: { champion: 2, heraut: 1 } },
      { texte: "Je la conseille, dans l'oreille, jamais devant tout le monde.", poids: { sage: 3 } },
      { texte: "Je m'en passe. Je sers les gens, pas les titres.", poids: { soigneur: 2, batisseur: 1 } },
    ],
  },
  {
    id: 'q14',
    texte: 'La nouvelle recrue ne connaît rien.',
    reponses: [
      { texte: 'Je lui montre le geste une fois et je la laisse faire.', poids: { batisseur: 3 } },
      { texte: "Je lui trouve une place où elle sera utile dès aujourd'hui.", poids: { souverain: 2, heraut: 1 } },
      { texte: "Je l'emmène avec moi faire le tour du terrain.", poids: { eclaireur: 3 } },
      { texte: "Je lui demande comment elle va avant de lui demander quoi que ce soit.", poids: { soigneur: 3 } },
    ],
  },
  {
    id: 'q15',
    texte: 'Ce qui vous épuise le plus :',
    reponses: [
      { texte: 'Les décisions qui traînent.', poids: { souverain: 2, champion: 1 } },
      { texte: "Rester assis à parler quand il y a de l'ouvrage.", poids: { batisseur: 2, champion: 1 } },
      { texte: 'Le bruit et la foule, sans un moment pour penser.', poids: { sage: 3 } },
      { texte: 'Voir quelqu\'un mis de côté sans que personne ne bouge.', poids: { soigneur: 2, heraut: 1 } },
    ],
  },
];
