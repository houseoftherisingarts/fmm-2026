// ─── Menu du village · édition 2026 ──────────────────────────────────
// Source de vérité : « menu-final-1.3-fmm-2026.pdf » de Marc-Alexis,
// reçu le 2026-08-22. Le menu 1.2 et le banquet à cinq services de
// l'édition précédente sont retirés : ils sont périmés.
//
// RÈGLE : aucun prix sur le menu général (décision d'Alex, 22 août).
// Les coûts, marges et prix de vente vivent dans la feuille de cuisine,
// jamais sur la page publique. Seul le banquet porte un prix, parce
// qu'il se réserve et se paie d'avance.

export interface Plat {
  name: string;
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
    key: 'dejeuner',
    name: { FR: 'Le déjeuner', EN: 'Breakfast' },
    sub: { FR: 'Pour partir la journée du bon pied', EN: 'To start the day right' },
    icon: 'sunrise',
    dishes: [
      { name: 'Pizza déjeuner' },
      { name: 'Sandwich déjeuner JLT' },
    ],
  },
  {
    key: 'marmite',
    name: { FR: 'La marmite du campement', EN: 'The camp cauldron' },
    sub: { FR: 'Servie avec le pain viking', EN: 'Served with viking bread' },
    icon: 'cauldron',
    dishes: [
      { name: 'Olla gitana', note: {
        FR: 'Ragoût végétarien de pois chiches, haricots et courges.',
        EN: 'A vegetarian stew of chickpeas, beans and squash.' } },
      { name: 'Goulash', note: {
        FR: 'Ragoût épicé à la viande et au paprika.',
        EN: 'A spiced stew of meat and paprika.' } },
    ],
  },
  {
    key: 'grillages',
    name: { FR: 'Les grillages', EN: 'The grill' },
    sub: { FR: 'Servis avec la salade verte', EN: 'Served with green salad' },
    icon: 'flame',
    dishes: [
      { name: 'Deux brochettes de poulet du verger', note: {
        FR: '300 g de poulet au cidre.',
        EN: '300 g of cider-marinated chicken.' } },
      { name: 'Deux brochettes de bœuf façon kawaps', note: {
        FR: 'Bœuf au cumin et au poivre de Sichuan.',
        EN: 'Beef with cumin and Sichuan pepper.' } },
      { name: 'Saucisse grillée sur pain du voyageur', note: {
        FR: 'Hot-dog de luxe au bacon, condiment au choix et choucroute.',
        EN: 'Deluxe bacon hot dog, condiment of your choice and sauerkraut.' } },
      { name: 'Pomme de terre au miel épicé' },
    ],
  },
  {
    key: 'boustifailles',
    name: { FR: 'Les boustifailles', EN: 'Grub & greens' },
    icon: 'greens',
    dishes: [
      { name: 'Cuirs du seigneur', note: {
        FR: '100 g de bœuf séché maison.',
        EN: '100 g of house-made beef jerky.' } },
      { name: 'Verdure du jardin' },
      { name: 'Salade de betteraves', note: {
        FR: 'Avec légumes de saison et céréales.',
        EN: 'With seasonal vegetables and grains.' } },
      { name: 'Trio levantin', note: {
        FR: 'Baba ganoush, hummus, pita et crudités.',
        EN: 'Baba ganoush, hummus, pita and raw vegetables.' } },
    ],
  },
  {
    key: 'boulangerie',
    name: { FR: 'La boulangerie', EN: 'The bakery' },
    sub: { FR: 'Beurre aux herbes en supplément', EN: 'Herb butter available on the side' },
    icon: 'bread',
    dishes: [
      { name: 'Pain viking' },
      { name: 'Pain aux insectes' },
      { name: 'Blodbröd' },
      { name: 'Lembas', note: { FR: 'Sucré.', EN: 'Sweet.' } },
    ],
  },
  {
    key: 'desserts',
    name: { FR: 'Les desserts', EN: 'Sweet things' },
    icon: 'honey',
    dishes: [
      { name: 'Dattes farcies' },
      { name: 'Loukoum' },
      { name: 'Gâteau du voyageur' },
    ],
  },
  {
    key: 'courageux',
    name: { FR: 'Pour les courageux', EN: 'For the brave' },
    sub: { FR: 'À vos risques et périls', EN: 'At your own peril' },
    icon: 'scorpion',
    dishes: [
      { name: 'Criquets épicés' },
      { name: 'Œufs de cent ans' },
      { name: 'Langue de porc' },
    ],
  },
];

// L'abreuvoir se rend à part, pleine largeur et encadré d'or.
export const ABREUVOIR: Categorie = {
  key: 'abreuvoir',
  name: { FR: 'L’abreuvoir', EN: 'The watering hole' },
  icon: 'pitcher',
  dishes: [
    { name: 'Hypocras', note: {
      FR: 'Vin rouge épicé au miel, à la cannelle et au gingembre.',
      EN: 'Red wine spiced with honey, cinnamon and ginger.' } },
    { name: 'Vin chaud' },
    { name: 'Bière au beurre' },
    { name: 'Cervoise' },
    { name: 'Café turc' },
    { name: 'Café régulier' },
    { name: 'Limonade' },
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
