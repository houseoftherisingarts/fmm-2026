// Annonces de l'espace client.
//
// Elles s'affichent EN PREMIER dans l'espace client : c'est la première
// chose qu'un marchand, un bénévole ou un festivalier voit en ouvrant
// son inventaire. Ordre d'affichage = ordre du tableau.
//
// Pour ajouter une annonce : une entrée ici, FR et EN, avec un ton.
// `alerte` = consigne à respecter (bordure rouge), `info` = bon à savoir
// (bordure ambre).
//
// ⚠️ Le fil Facebook n'est PAS branché : tirer les publications de la
// page demande un jeton de page Meta et une fonction serveur qui met en
// cache dans Firestore (le navigateur ne peut pas porter le secret).
// En attendant, le bloc Facebook de l'espace client renvoie à la page.

export type AnnonceTone = 'alerte' | 'info';

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
}

export const ANNONCES: Annonce[] = [
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
      'Le réseau cellulaire est faible sur le site et il n’y a pas de Wi-Fi public à l’entrée. Chercher son billet sur son téléphone au moment d’arriver peut tourner court. Imprimez votre confirmation Zeffy à la maison, ou téléchargez-la sur votre appareil pendant que vous avez encore du réseau. Votre coffre à billets, plus bas, garde une copie prête à télécharger.',
    bodyEN:
      'Cell coverage is weak on site and there is no public Wi-Fi at the gate. Hunting for your ticket on your phone as you arrive can fall flat. Print your Zeffy confirmation at home, or download it to your device while you still have signal. Your ticket vault below keeps a copy ready to download.',
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
];
