// ─── Menu du village · édition 2026 ──────────────────────────────────
// Source de vérité : le menu final dicté par Alex le 2026-09-15, après
// la dernière passe de cuisine avec Marc-Alexis. Il remplace le menu 1.3
// de Marc-Alexis (22 août), qui est périmé.
//
// Ce qui a changé le 15 septembre : le déjeuner sort du menu (les prix
// restent à voir avec Phil), la catégorie « Pour les courageux » est
// dissoute et les criquets rejoignent les boustifailles, les œufs de
// cent ans et la langue de porc sont retirés, l'assiette de dégustation
// William J. Walter entre aux grillages, le beurre aux herbes est inclus
// dans la boulangerie au lieu d'être en supplément, et chaque plat porte
// désormais sa description et son prix. Plus aucun poids en grammes :
// personne ne commande au gramme.

export interface Plat {
  name: string;
  /** Prix affiché, tel qu'il se lit à l'étal. */
  prix?: string;
  note?: { FR: string; EN: string };
}

export interface Categorie {
  key: string;
  name: { FR: string; EN: string };
  /** Précision de service affichée sous le titre de catégorie. */
  sub?: { FR: string; EN: string };
  /** Nom du glyphe médiéval (voir components/icons/Medieval). */
  icon: 'sunrise' | 'cauldron' | 'flame' | 'greens' | 'bread' | 'honey' | 'scorpion' | 'pitcher';
  dishes: Plat[];
}

export const MENU: Categorie[] = [
  {
    key: 'marmite',
    name: { FR: 'La marmite du campement', EN: 'The camp cauldron' },
    sub: { FR: 'Servie avec le pain viking', EN: 'Served with viking bread' },
    icon: 'cauldron',
    dishes: [
      { name: 'Olla gitana', prix: '12 $', note: {
        FR: 'Ragoût végétarien de pois chiches, de courge et de haricots.',
        EN: 'A vegetarian stew of chickpeas, squash and beans.' } },
      { name: 'Goulash', prix: '14 $', note: {
        FR: 'Ragoût de bœuf au paprika, mijoté tout l’après-midi.',
        EN: 'Beef stew with paprika, simmered all afternoon.' } },
    ],
  },
  {
    key: 'grillages',
    name: { FR: 'Les grillages', EN: 'The grill' },
    sub: { FR: 'Servis avec la salade verte', EN: 'Served with green salad' },
    icon: 'flame',
    dishes: [
      { name: 'Brochettes de poulet du verger', prix: '20 $', note: {
        FR: 'Poulet tendre, cidre, épices et légumes grillés.',
        EN: 'Tender chicken, cider, spices and grilled vegetables.' } },
      { name: 'Brochettes de bœuf façon kawaps', prix: '24 $', note: {
        FR: 'Bœuf mariné au paprika et au cumin, grillé sur brochette.',
        EN: 'Beef marinated in paprika and cumin, grilled on a skewer.' } },
      { name: 'Saucisses sur pain du voyageur', prix: '16 $', note: {
        FR: 'Saucisses William J. Walter au choix, sur pain et choucroute. Condiments au choix.',
        EN: 'Your choice of William J. Walter sausage, on bread with sauerkraut. Condiments of your choice.' } },
      // « Assiette de dégustation William J. Walter » cassait sur deux lignes
      // en colonne de menu et laissait « Walter · 20 $ » seul en bas. Le nom
      // court garde la marque en tête de ligne et tient sur une seule ligne.
      { name: 'Dégustation William J. Walter', prix: '20 $', note: {
        FR: 'Deux saucisses au choix, choucroute et moutarde forte.',
        EN: 'Two sausages of your choice, sauerkraut and strong mustard.' } },
      { name: 'Pomme de terre au miel épicé', prix: '7 $', note: {
        FR: 'Pommes de terre rôties, miel épicé et herbes fraîches.',
        EN: 'Roasted potatoes, spiced honey and fresh herbs.' } },
    ],
  },
  {
    key: 'boustifailles',
    name: { FR: 'Les boustifailles', EN: 'Grub & greens' },
    icon: 'greens',
    dishes: [
      { name: 'Cuirs du seigneur', prix: '14 $', note: {
        FR: 'Bœuf séché maison, mariné au miel et au paprika fumé.',
        EN: 'House-made beef jerky, marinated in honey and smoked paprika.' } },
      { name: 'Verdure du jardin', prix: '5 $', note: {
        FR: 'Mesclun, concombre et carottes râpées, vinaigrette à l’érable.',
        EN: 'Mixed greens, cucumber and grated carrot, maple vinaigrette.' } },
      { name: 'Salade de betteraves', prix: '6 $ · 11 $', note: {
        FR: 'Betteraves rôties, orge et noix, en accompagnement ou en repas.',
        EN: 'Roasted beets, barley and walnuts, as a side or as a meal.' } },
      { name: 'Trio levantin', prix: '14 $', note: {
        FR: 'Baba ganoush, hummus, pita et crudités.',
        EN: 'Baba ganoush, hummus, pita and raw vegetables.' } },
      { name: 'Criquets épicés', prix: '8 $', note: {
        FR: 'Criquets grillés, salés et relevés d’épices.',
        EN: 'Grilled crickets, salted and spiced.' } },
    ],
  },
  {
    key: 'boulangerie',
    name: { FR: 'La boulangerie', EN: 'The bakery' },
    sub: { FR: 'Beurre aux herbes inclus', EN: 'Herb butter included' },
    icon: 'bread',
    dishes: [
      { name: 'Pain viking', prix: '6 $', note: {
        FR: 'Pain de blé au miel, cuit sur place.',
        EN: 'Wheat bread with honey, baked on site.' } },
      { name: 'Pain aux insectes', prix: '8 $', note: {
        FR: 'Pain à la farine de criquet, aux vers de farine et aux fourmis.',
        EN: 'Bread made with cricket flour, mealworms and ants.' } },
      { name: 'Blodbröd', prix: '7 $', note: {
        FR: 'Le pain sombre des Vikings, au sang et aux herbes.',
        EN: 'The dark Viking bread, made with blood and herbs.' } },
      { name: 'Lembas', prix: '7 $', note: {
        FR: 'Pain elfique au miel.',
        EN: 'Elvish bread with honey.' } },
    ],
  },
  {
    key: 'desserts',
    name: { FR: 'Les desserts', EN: 'Sweet things' },
    icon: 'honey',
    dishes: [
      { name: 'Dattes farcies', prix: '11 $', note: {
        FR: 'Six dattes moelleuses, aux noix, au miel et aux fruits secs.',
        EN: 'Six soft dates with walnuts, honey and dried fruit.' } },
      { name: 'Loukoum', prix: '1,50 $', note: {
        FR: 'Délicates bouchées sucrées, parfumées à la rose. Douze pour 15 $.',
        EN: 'Delicate sweet bites, scented with rose. Twelve for 15 $.' } },
      { name: 'Gâteau du voyageur', prix: '8 $', note: {
        FR: 'Gâteau moelleux aux épices, au miel et aux fruits secs.',
        EN: 'A moist cake with spices, honey and dried fruit.' } },
    ],
  },
];

// L'abreuvoir se rend à part, pleine largeur et encadré d'or.
export const ABREUVOIR: Categorie = {
  key: 'abreuvoir',
  name: { FR: 'L’abreuvoir', EN: 'The watering hole' },
  icon: 'pitcher',
  dishes: [
    { name: 'Hypocras', prix: '7 $', note: {
      FR: 'Vin rouge épicé au miel, à la cannelle et au gingembre.',
      EN: 'Red wine spiced with honey, cinnamon and ginger.' } },
    { name: 'Vin chaud', prix: '7 $', note: {
      FR: 'Vin rouge chaud à l’orange et aux épices.',
      EN: 'Hot red wine with orange and spices.' } },
    { name: 'Bière au beurre', prix: '7 $', note: {
      FR: 'Crème soda, beurre et cassonade, coiffée de crème fouettée. Sans alcool.',
      EN: 'Cream soda, butter and brown sugar, topped with whipped cream. No alcohol.' } },
    { name: 'Cervoise', prix: '10 $', note: {
      FR: 'Bière blonde au sirop de miel et de genièvre.',
      EN: 'Blond ale with honey and juniper syrup.' } },
    { name: 'Café turc', prix: '5 $', note: {
      FR: 'Moulu très fin et monté dans le sable brûlant, à la cardamome.',
      EN: 'Ground very fine and brewed in hot sand, with cardamom.' } },
    { name: 'Café régulier', prix: '2 $', note: {
      FR: 'Café filtre, servi bien chaud.',
      EN: 'Filter coffee, served good and hot.' } },
    { name: 'Limonade', prix: '4 $', note: {
      FR: 'Citron pressé, sucre et eau glacée.',
      EN: 'Fresh-pressed lemon, sugar and iced water.' } },
  ],
};

// ── Le banquet · 2026 ────────────────────────────────────────────────
// Trois services, 50 places, 65 $ par personne plus taxes.
export const BANQUET_MENU = [
  {
    name: { FR: 'Premier service', EN: 'First course' },
    items: [
      'Bouillon fumé aux racines',
      'Brochettes de gibier et légumes',
      'Galettes de pois chiches et herbes',
    ],
  },
  {
    name: { FR: 'Deuxième service', EN: 'Second course' },
    items: [
      'Poulet entier rôti à la flamme, piqué sur le bord du feu',
      'Pain farci à la goulash',
      'Champignons et légumes de saison',
    ],
  },
  {
    name: { FR: 'Troisième service', EN: 'Third course' },
    items: [
      'Poires pochées au vin blanc',
      'Figues rôties au miel et au vin rouge',
      'Beignets aux pommes',
      'Corbeilles de fruits',
    ],
  },
];
