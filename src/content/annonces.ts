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
