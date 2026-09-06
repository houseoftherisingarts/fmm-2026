// Annonces de l'espace client.
//
// Elles s'affichent EN PREMIER dans l'espace client : c'est la première
// chose qu'un marchand, un bénévole ou un festivalier voit en ouvrant
// son inventaire. Ordre d'affichage = ordre du tableau.
//
// Pour ajouter une annonce : une entrée ici, FR et EN, avec un ton.
// ⚠️ Le fil Facebook n'est PAS branché : tirer les publications de la
// page demande un jeton de page Meta et une fonction serveur qui met en
// cache dans Firestore (le navigateur ne peut pas porter le secret).
// En attendant, le bloc Facebook de l'espace client renvoie à la page.

// `alerte` = consigne à respecter (clou de cire rouge), `info` = bon à
// savoir (clou de laiton), `appel` = demande de participation (clou d'or,
// avec un bouton).
export type AnnonceTone = 'alerte' | 'info' | 'appel';

export interface Annonce {
  id:      string;
  tone:    AnnonceTone;
  /** Date de publication, format ISO. Sert au tri et à l'affichage. */
  date:    string;
  titleFR: string;
  titleEN: string;
  bodyFR:  string;
  bodyEN:  string;
  /** Les points d'un règlement, numérotés sur le parchemin. Un avis qui
   *  en porte se lit comme une liste et non comme un paragraphe. */
  listeFR?: string[];
  listeEN?: string[];
  /** Un avis qui reste épinglé : un règlement ne se décroche pas, il
   *  s'applique. Ces avis-là n'entrent pas dans le compte des quatre
   *  avis à collectionner et n'offrent pas le bouton « Accepté ». */
  permanent?: boolean;
  /** Le parchemin occupe toute la largeur du panneau. Réservé aux avis
   *  longs, qu'une colonne étirerait en ruban. */
  pleineLargeur?: boolean;
  /** Affiche la pièce de la Petite Monnaie sous l'avis. */
  piece?:     boolean;
  lienPiece?: string;
  /** Bouton au pied de l'avis. Sans `url`, l'avis ne s'affiche pas. */
  cta?: { url: string; labelFR: string; labelEN: string };
}

// Levée de fonds Zeffy pour la connectivité du site (antenne satellite).
// Adresse fournie par Alex le 2026-08-03 et vérifiée (200).
const ZEFFY_LEVEE_URL = 'https://www.zeffy.com/fr-CA/donation-form/apportez-le-reseau-a-montpellier';

const TOUTES: Annonce[] = [
  // Le règlement des armes, adopté par le comité et affiché au babillard
  // (Alex, 2026-09-02). Il reste épinglé : un règlement ne se décroche
  // pas, et il ouvre le tableau parce que c'est ce qu'il faut avoir lu
  // avant de préparer son costume.
  {
    id:   'reglement-armes-2026',
    tone: 'alerte',
    date: '2026-09-02',
    permanent: true,
    pleineLargeur: true,
    titleFR: 'Règlement des épées et des armes médiévales',
    titleEN: 'Rules for swords and medieval weapons',
    bodyFR:
      'Le comité organisateur applique ce règlement à toute arme apportée sur le site du festival.',
    bodyEN:
      'The organizing committee applies these rules to every weapon brought onto the festival grounds.',
    listeFR: [
      'Les épées, dagues, haches, lances et autres armes doivent être présentées au comité organisateur lors de l’arrivée sur le site, sur demande.',
      'Les armes réelles, tranchantes ou pointues sont interdites dans les zones accessibles au public.',
      'Les armes décoratives doivent être émoussées, non tranchantes et sécuritaires.',
      'Les épées portées à la ceinture doivent être solidement fixées dans leur fourreau. Il est interdit de les dégainer dans les zones achalandées.',
      'Aucun combat, duel ou maniement d’arme n’est permis dans les zones du public, sauf dans le cadre d’une activité ou d’une prestation officiellement autorisée par l’organisation.',
      'Les démonstrations et combats doivent être réalisés dans une zone délimitée, avec une distance de sécurité suffisante entre les participants et les spectateurs.',
      'Les armes utilisées lors des combats doivent être spécifiquement conçues ou adaptées pour le combat scénarisé et inspectées avant leur utilisation.',
      'Le maniement d’une arme est interdit à toute personne sous l’influence de l’alcool ou de substances psychoactives.',
      'Il est interdit de brandir, pointer, lancer ou utiliser une arme de manière à menacer ou mettre en danger une autre personne.',
      'L’organisation se réserve le droit de refuser une arme ou d’en interdire l’utilisation si elle juge celle-ci dangereuse.',
      'Le non-respect de ces règles peut entraîner le retrait de l’arme ou l’expulsion du site.',
    ],
    listeEN: [
      'Swords, daggers, axes, spears and other weapons must be shown to the organizing committee on arrival, on request.',
      'Real weapons, edged or pointed, are forbidden in areas open to the public.',
      'Decorative weapons must be blunted, not sharp, and safe.',
      'Swords worn at the belt must be firmly secured in their scabbard. Drawing them in busy areas is forbidden.',
      'No combat, duel or handling of a weapon is allowed in public areas, except as part of an activity or a performance officially authorized by the organization.',
      'Demonstrations and combats must take place inside a marked area, with enough safety distance between the participants and the audience.',
      'Weapons used in combat must be specifically made or adapted for staged fighting, and inspected before use.',
      'Handling a weapon is forbidden to anyone under the influence of alcohol or psychoactive substances.',
      'Brandishing, pointing, throwing or using a weapon in a way that threatens or endangers another person is forbidden.',
      'The organization reserves the right to refuse a weapon or to forbid its use if it judges it dangerous.',
      'Breaking these rules may lead to the weapon being taken away or to expulsion from the site.',
    ],
  },
  // Le billet d'une journée porte la date d'ouverture du festival, et des
  // acheteurs la prennent pour la journée achetée (Alex, 2026-09-06).
  // Épinglé : l'avis doit rester lisible jusqu'au festival, et il ne
  // compte pas dans les quatre avis à collectionner. La même réponse vit
  // dans la FAQ de la page Billets (src/content/faq.json).
  {
    id:   'billet-un-jour-2026',
    tone: 'info',
    date: '2026-09-06',
    permanent: true,
    titleFR: 'Votre billet d’une journée vaut pour le jour de votre choix',
    titleEN: 'Your one-day ticket is good for the day you choose',
    bodyFR:
      'Sur les billets d’une journée, Zeffy imprime la date d’ouverture du festival, le vendredi 25 septembre. Cette date marque le début de l’événement et non la journée que vous avez achetée. Un billet d’une journée vous ouvre les portes le vendredi, le samedi ou le dimanche, selon ce qui vous arrange. Présentez-le à l’entrée le jour venu, tel quel.',
    bodyEN:
      'On one-day tickets, Zeffy prints the festival’s opening date, Friday 25 September. That date marks the start of the event, not the day you bought. A one-day ticket lets you in on Friday, Saturday or Sunday, whichever suits you. Show it at the gate on the day you come, as it is.',
  },
  {
    id:   'no-dogs-2026',
    tone: 'alerte',
    date: '2026-08-02',
    titleFR: 'Les chiens ne sont pas admis sur le site',
    titleEN: 'Dogs are not allowed on site',
    bodyFR:
      'Des chevaux sont présents pendant tout le festival, et notre couverture d’assurance tombe dès qu’un chien s’en approche. C’est le festival au complet qui perdrait sa protection. Aucun chien n’est donc admis sur le terrain, même tenu en laisse. Prévoyez une garde avant de partir.',
    bodyEN:
      'Horses are on site for the whole festival, and our insurance coverage lapses the moment a dog comes near them. The entire festival would lose its protection. No dog is admitted on the grounds, even on a leash. Please arrange pet care before you head out.',
  },
  {
    id:   'imprimez-billet-2026',
    tone: 'alerte',
    date: '2026-08-03',
    titleFR: 'Imprimez votre billet avant de partir',
    titleEN: 'Print your ticket before you leave home',
    bodyFR:
      'Le réseau cellulaire est faible sur le site et il n’y a pas de Wi‑Fi public à l’entrée. Chercher son billet sur son téléphone au moment d’arriver peut tourner court. Imprimez votre confirmation Zeffy à la maison, ou téléchargez-la sur votre appareil pendant que vous avez encore du réseau. Votre coffre à billets, plus bas, garde une copie prête à télécharger.',
    bodyEN:
      'Cell coverage is weak on site and there is no public Wi‑Fi at the gate. Hunting for your ticket on your phone as you arrive can fall flat. Print your Zeffy confirmation at home, or download it to your device while you still have signal. Your ticket vault below keeps a copy ready to download.',
  },
  {
    id:   'apportez-comptant-2026',
    tone: 'info',
    date: '2026-08-02',
    titleFR: 'Apportez du comptant',
    titleEN: 'Bring cash',
    bodyFR:
      'Le réseau cellulaire est faible sur le site. Les terminaux de paiement deviennent capricieux, surtout aux heures de pointe. Prévoyez du comptant pour les kiosques, la nourriture et le bar. Un kiosque de la Petite Monnaie sera présent à l’entrée : vous pourrez y échanger votre comptant contre la monnaie locale, acceptée partout sur le site.',
    bodyEN:
      'Cell coverage is weak on site. Card terminals get temperamental, especially at peak hours. Bring cash for the kiosks, the food and the bar. A Petite Monnaie kiosk will be at the entrance: you can trade your cash for the local currency, accepted everywhere on the grounds.',
    // La pièce de laiton (composant PetiteMonnaieCoin) remplace le logo
    // plat : c'est l'objet que les gens verront au kiosque. Le lien va
    // au Salon des Inconnus et non au pilier interne, pour ramener du
    // trafic chez nous. URL vérifiée (200).
    piece: true,
    lienPiece: 'https://www.lesalondesinconnus.com/petite-monnaie',
  },
  {
    id:   'connexion-etoiles-2026',
    tone: 'appel',
    date: '2026-08-03',
    // Texte d'Alex, mot pour mot (2026-08-03). Seul l'emoji du titre a
    // été retiré : une émoticône en couleur sur un parchemin gravé en
    // Cinzel jure avec tout le reste. À remettre s'il y tient.
    titleFR: 'Votre don aide à apporter le Réseau jusqu’à Montpellier',
    titleEN: 'Your gift helps bring the Network all the way to Montpellier',
    bodyFR:
      'Comme tout village dans les montagnes, le village de Montpellier est coupé des ondes du monde extérieur. Il nous faut donc nous tourner vers le ciel pour recevoir la fréquence du dieu de l’argent.\n\n'
      + 'Afin de faciliter les transactions sur le site, il est impératif au festival de trouver une façon de procurer au village le signal des étoiles.\n\n'
      + 'En achetant une antenne massive, vous permettrez au festival médiéval de Montpellier, et à d’autres festivals après lui, de voir le jour et de survivre sur le territoire montagneux de la Petite Nation.',
    bodyEN:
      'Like every village in the mountains, Montpellier is cut off from the airwaves of the outside world. So we must turn to the sky to receive the frequency of the god of money.\n\n'
      + 'To make transactions possible on the grounds, the festival must find a way to bring the village the signal of the stars.\n\n'
      + 'By buying one massive antenna, you will allow the Festival Médiéval de Montpellier, and other festivals after it, to come to life and survive on the mountainous land of the Petite Nation.',
    cta: {
      url:     ZEFFY_LEVEE_URL,
      labelFR: 'Porter la lumière',
      labelEN: 'Carry the light',
    },
  },
];

// Un bouton sans adresse est une impasse : nous le retirons. L'avis,
// lui, reste affiché, parce que le texte vaut par lui-même. Le bouton
// réapparaît tout seul le jour où ZEFFY_LEVEE_URL est remplie.
export const ANNONCES: Annonce[] = TOUTES.map((a) =>
  a.cta && !a.cta.url ? { ...a, cta: undefined } : a,
);
