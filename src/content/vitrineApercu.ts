import type { Vitrine } from '../firebase/vitrines';

// ─── Une vitrine d'aperçu, pour le développement seulement ───────────
// Sert `?apercu=1` sur /ma-vitrine, /vitrine/apercu et /boutiques :
// le rendu se vérifie à l'écran sans compte ni Firestore, en dev comme
// en production, pour que l'équipe (Jesse) voie la chose avant que la
// bascule `pubVitrines` s'allume (Alex, 2026-09-29).

export const VITRINE_APERCU: Vitrine = {
  slug: 'apercu',
  uid: 'apercu',
  type: 'musique',
  nom: 'Les Ménestrels du Lac',
  accroche: 'Vielle à roue, cornemuse et tambour, pour les tavernes et les noces.',
  ville: 'Namur',
  bio: 'Nous jouons depuis onze ans les airs des foires et des marchés, ceux que l’on chantait entre deux tonneaux quand la nuit tombait sur la place. Le répertoire vient des manuscrits du XIIIe siècle autant que des veillées de la Petite-Nation, et il change à chaque saison selon ce que le public nous renvoie.\n\nNous nous déplaçons pour les fêtes de village, les mariages et les banquets, avec ou sans sonorisation.',
  banniere: { url: '/wix/home/scene-cinematic.jpg', chemin: '' },
  photos: [
    { url: '/wix/home/scene-cinematic.jpg', chemin: 'a' },
    { url: '/wix/home/scene-cinematic.jpg', chemin: 'b' },
    { url: '/wix/home/scene-cinematic.jpg', chemin: 'c' },
  ],
  pistes: [
    { id: 'p1', titre: 'Danse des tonneliers', url: '', chemin: '', duree: 214 },
    { id: 'p2', titre: 'La complainte du passeur', url: '', chemin: '', duree: 187 },
    { id: 'p3', titre: 'Branle de la Saint-Jean', url: '', chemin: '', duree: 156 },
  ],
  produits: [
    { id: 'a1', nom: 'Album « Veillées »', description: 'Douze pièces enregistrées à la grange du Lac, sur CD.', prix: 20, lien: 'https://square.link/u/exemple' },
    { id: 'a2', nom: 'Prestation de noces', description: 'Trois heures de musique pour la cérémonie et le banquet.', prix: 650 },
  ],
  liens: { instagram: 'https://instagram.com/menestrels', square: 'https://square.link/u/exemple', courriel: 'menestrels@exemple.com' },
  publie: true,
  boutique: { statut: 'active' },
};
