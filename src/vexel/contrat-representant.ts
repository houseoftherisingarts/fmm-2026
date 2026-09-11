/**
 * L'entente de représentant Vexel, copie portable pour PartenaireVexelPanneau.
 *
 * CE FICHIER EST UNE COPIE de functions/src/contratPartenaire.ts dans
 * vexel-site : c'est le même contrat de référence, servi ici tel quel pour
 * que le panneau installé chez un site client puisse l'afficher sans
 * dépendre du dépôt vexel-site. L'empreinte SHA-256 qui compte pour de vrai
 * ne vient jamais de ce fichier ni du navigateur : la fonction
 * devenirPartenaireSite la recalcule elle-même sur sa propre copie
 * (contratPartenaire.ts) avant d'écrire quoi que ce soit. Ce fichier-ci sert
 * seulement à montrer le texte et à prévenir le représentant si sa page
 * affichait une version périmée (empreinte envoyée, comparée côté serveur).
 *
 * Toute nouvelle version du contrat se pose d'abord dans vexel-site, puis se
 * recopie ici mot pour mot, datée pareil des deux côtés.
 */

export const VERSION_CONTRAT = "2026-09-11";

interface ArticleContrat {
  numero: number;
  titre: string;
  paragraphes: string[];
}

const TITRE_CONTRAT = "Entente de représentant Vexel";

const PREAMBULE_CONTRAT: string[] = [
  "Cette entente relie Vexel Webstudio, une division du Salon des Inconnus inc. exploitée par Alex Turcot St-Laurent, dont l’adresse d’affaires est le 826, chemin de la Côte-à-Favier, à Namur, au Québec, ci-après « Vexel », et la personne qui l’accepte en la signant électroniquement au bas de ce document, sous le nom, le courriel et le code de parrainage qui y apparaissent, ci-après « le représentant ».",
  "L’entente prend effet à l’instant de cette signature et demeure telle qu’elle est écrite ici tant qu’une nouvelle version datée ne la remplace pas ou que l’une des parties n’y met pas fin selon l’article 6.",
];

const ARTICLES_CONTRAT: ArticleContrat[] = [
  {
    numero: 1,
    titre: "Les parties",
    paragraphes: [
      "Vexel Webstudio conçoit et héberge des sites web pour ses clients, moyennant un abonnement mensuel. Le représentant est la personne physique ou l’entreprise qui accepte cette entente pour recommander les services de Vexel et toucher une commission sur les clients qu’il amène.",
    ],
  },
  {
    numero: 2,
    titre: "L’objet",
    paragraphes: [
      "Vexel remet au représentant un code de parrainage personnel et une page publique à son nom, que le représentant fait connaître comme il l’entend. Rien dans cette entente ne fait du représentant un employé, un mandataire ou un associé de Vexel : il agit en son propre nom, et Vexel ne répond jamais des gestes qu’il pose en dehors de ce que cette entente prévoit.",
    ],
  },
  {
    numero: 3,
    titre: "La rémunération",
    paragraphes: [
      "Chaque client amené par le représentant, dont le site reste en ligne et payé, verse chaque mois une part égale à 20 % du montant de son abonnement. Cette part se partage entre un rabais offert au client et une commission versée au représentant, selon un curseur que le représentant règle lui-même dans son espace, par pas de 5 points : le client reçoit au minimum 5 % et au maximum 20 %, et le représentant garde le reste. Ce réglage vaut pour tous les clients du représentant à la fois, et un changement de curseur ne prend effet que le premier jour du mois qui suit celui où il est fait, jamais dans le mois courant.",
      "À mesure que le portefeuille du représentant grandit, sa commission grandit avec lui : chaque tranche complète de dix clients actifs ajoute cinq points à sa part, sans plafond, sans jamais réduire le rabais promis au client. Vexel verse la commission due par virement Stripe Connect vers le premier de chaque mois, sur les seuls abonnements que Vexel a réellement encaissés le mois précédent. Aucune commission n’est due sur un abonnement impayé, annulé ou remboursé, et aucune somme ne se verse avant que le représentant n’ait signé cette entente et ouvert son compte de versement chez Stripe.",
    ],
  },
  {
    numero: 4,
    titre: "Les obligations du représentant",
    paragraphes: [
      "Le représentant présente Vexel avec honnêteté et ne parle, au nom du studio, que de ce que Vexel a confirmé par écrit : jamais un prix ou un délai qu’il aurait inventé sur le coup pour conclure plus vite. Il sollicite ses contacts dans le respect de la Loi canadienne anti-pourriel, sans jamais envoyer de courriel commercial à une personne qui n’a pas donné son consentement à en recevoir, qu’il soit exprès ou tacite. Il utilise le badge, le nom et les couleurs de Vexel tels que le studio les lui fournit, sans les modifier et sans laisser croire qu’il parle au nom de Vexel au-delà de la recommandation de ses services.",
    ],
  },
  {
    numero: 5,
    titre: "L’indépendance",
    paragraphes: [
      "Cette entente ne crée aucun lien d’emploi entre Vexel et le représentant, et elle ne lui accorde aucune exclusivité territoriale ni aucune garantie de volume. Le représentant demeure libre de recommander d’autres produits ou services, y compris ceux d’un concurrent de Vexel, et Vexel demeure libre de travailler avec d’autres représentants dans le même secteur ou la même région. Chacun assume ses propres obligations fiscales sur les sommes qu’il touche ou qu’il verse en vertu de cette entente.",
    ],
  },
  {
    numero: 6,
    titre: "La durée et la fin",
    paragraphes: [
      "Cette entente demeure en vigueur tant qu’aucune des deux parties n’y met fin. L’une ou l’autre peut y mettre fin en tout temps, sans motif à donner, moyennant un avis écrit de trente jours transmis à l’autre par courriel. À la fin de l’entente, le badge de Vexel se retire du site du représentant et son code cesse de s’offrir à de nouveaux clients, mais les commissions déjà acquises sur les clients amenés avant la fin restent dues, aux mêmes conditions, tant que ces clients demeurent abonnés et payants.",
    ],
  },
  {
    numero: 7,
    titre: "Les renseignements personnels",
    paragraphes: [
      "Vexel recueille le nom, le courriel, le mode de paiement et les renseignements que le représentant choisit de publier sur sa page publique, dans le seul but de faire fonctionner le programme de représentants : verser les commissions, présenter la carte du représentant aux visiteurs et communiquer avec lui au sujet de son compte. Le représentant peut consulter, corriger ou faire retirer ces renseignements en tout temps en écrivant à Vexel, sous réserve des documents que la loi oblige Vexel à conserver. Cette collecte respecte la Loi sur la protection des renseignements personnels dans le secteur privé du Québec.",
    ],
  },
  {
    numero: 8,
    titre: "La loi applicable",
    paragraphes: [
      "Cette entente s’interprète selon les lois du Québec et les lois du Canada qui s’y appliquent. Tout différend qui n’aurait pas pu se régler à l’amiable relève des tribunaux du district judiciaire de Papineau.",
    ],
  },
  {
    numero: 9,
    titre: "La signature électronique",
    paragraphes: [
      "Le représentant signe cette entente en traçant sa signature à l’écran, au doigt ou à la souris, dans l’espace prévu à cette fin. Cette signature vaut consentement au sens de la Loi concernant le cadre juridique des technologies de l’information : le système de Vexel horodate la signature au moment où elle est posée, calcule et conserve une empreinte numérique du texte exact que le représentant a lu et accepté, et garde l’image de la signature elle-même. Toute modification apportée au texte de cette entente après coup change son empreinte et rend visible qu’elle diffère de la version signée.",
    ],
  },
];

const CLOTURE_CONTRAT: string[] = [
  "Cette entente sert de contrat de référence à l’ensemble des représentants de Vexel. Un conseiller juridique de votre choix peut la relire avant que vous ne signiez, et rien ne presse votre décision. Vexel la tient à jour par version datée à mesure que ses règles évoluent, et la version qui vous lie reste celle que vous signez ci-dessous, identifiée par sa date.",
];

export const ARTICLES: readonly ArticleContrat[] = ARTICLES_CONTRAT;
export const PREAMBULE: readonly string[] = PREAMBULE_CONTRAT;
export const CLOTURE: readonly string[] = CLOTURE_CONTRAT;
export const TITRE: string = TITRE_CONTRAT;

export const TEXTE_INTEGRAL_CONTRAT: string = [
  `${TITRE_CONTRAT}, version du ${VERSION_CONTRAT}`,
  "",
  ...PREAMBULE_CONTRAT,
  "",
  ...ARTICLES_CONTRAT.flatMap((a) => [`${a.numero}. ${a.titre}`, ...a.paragraphes, ""]),
  ...CLOTURE_CONTRAT,
]
  .join("\n")
  .trim();
