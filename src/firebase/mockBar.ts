// Logiciel de gestion de bar — FMM 2026 (Master Bar / Arno Geoffroy)
// In-memory mock store for the bar inventory. Tracks SKUs (bières,
// cidres, vins, hydromels, spiritueux, sans-alcool), formats, prix,
// stock, dépôt (consigne) et marges. Wire to Firestore later.

export type BarCategory =
  | 'biere'
  | 'cidre'
  | 'vin'
  | 'hydromel'
  | 'spiritueux'
  | 'sans_alcool';

export type BarFormat =
  | 'canette'
  | 'bouteille'
  | 'fut'
  | 'verre'
  | 'demi'
  | 'pinte';

export interface BarItem {
  id: string;
  name: string;          // "Boréale Rousse"
  category: BarCategory;
  supplier: string;      // "Brasseurs RJ"
  format: BarFormat;
  volumeMl: number;      // 473
  abv: number | null;    // % alcool, null si sans-alcool
  costPerUnit: number;   // CAD — prix d'achat
  salePrice: number;     // CAD — prix de vente
  deposit: number;       // CAD — consigne (canettes, bouteilles)
  stock: number;         // unités en main
  reorderAt: number;     // seuil d'alerte
  active: boolean;       // si listé au menu
  notes?: string;
}

export const CATEGORY_LABEL: Record<BarCategory, string> = {
  biere:       'Bière',
  cidre:       'Cidre',
  vin:         'Vin',
  hydromel:    'Hydromel',
  spiritueux:  'Spiritueux',
  sans_alcool: 'Sans alcool',
};

export const FORMAT_LABEL: Record<BarFormat, string> = {
  canette:    'Canette',
  bouteille:  'Bouteille',
  fut:        'Fût',
  verre:      'Verre',
  demi:       'Demi',
  pinte:      'Pinte',
};

let _items: BarItem[] = [
  { id: 'b-1', name: 'Boréale Rousse',         category: 'biere',       supplier: 'Brasseurs RJ',        format: 'canette',   volumeMl: 473, abv: 5.0,  costPerUnit: 1.85, salePrice: 7,  deposit: 0.10, stock: 240, reorderAt: 60,  active: true,
    notes: 'Best-seller année passée — prévoir réappro mid-festival.' },
  { id: 'b-2', name: 'Boréale Blonde',         category: 'biere',       supplier: 'Brasseurs RJ',        format: 'canette',   volumeMl: 473, abv: 4.5,  costPerUnit: 1.80, salePrice: 7,  deposit: 0.10, stock: 192, reorderAt: 60,  active: true },
  { id: 'b-3', name: 'IPA du Lièvre',          category: 'biere',       supplier: 'Microbrasserie Lièvre',format: 'bouteille', volumeMl: 341, abv: 6.5,  costPerUnit: 2.40, salePrice: 8,  deposit: 0.10, stock: 96,  reorderAt: 24,  active: true },
  { id: 'b-4', name: 'Stout Médiéval',         category: 'biere',       supplier: 'Microbrasserie Lièvre',format: 'bouteille', volumeMl: 341, abv: 7.2,  costPerUnit: 2.55, salePrice: 9,  deposit: 0.10, stock: 48,  reorderAt: 24,  active: true,
    notes: 'Édition collab. — quantité limitée.' },
  { id: 'b-5', name: 'Cidre du Verger',        category: 'cidre',       supplier: 'Cidrerie Saint-Nicolas',format: 'bouteille',volumeMl: 750, abv: 7.0,  costPerUnit: 8.50, salePrice: 22, deposit: 0,    stock: 36,  reorderAt: 12,  active: true },
  { id: 'b-6', name: 'Hydromel Domaine Apicole', category: 'hydromel',  supplier: 'Domaine Apicole Outaouais', format: 'bouteille', volumeMl: 500, abv: 12.0, costPerUnit: 14, salePrice: 32, deposit: 0,    stock: 24,  reorderAt: 6,   active: true,
    notes: 'Spécialité festival — mettre en évidence.' },
  { id: 'b-7', name: 'Hydromel Saltimbanque',  category: 'hydromel',    supplier: 'Domaine Apicole Outaouais', format: 'verre', volumeMl: 150, abv: 12.0, costPerUnit: 4,    salePrice: 12, deposit: 0,    stock: 80,  reorderAt: 20,  active: true },
  { id: 'b-8', name: 'Vin rouge maison',       category: 'vin',         supplier: 'Importation locale', format: 'verre',     volumeMl: 150, abv: 13.0, costPerUnit: 3,    salePrice: 10, deposit: 0,    stock: 120, reorderAt: 30,  active: true },
  { id: 'b-9', name: 'Pastis du Caravanier',   category: 'spiritueux',  supplier: 'SAQ',                 format: 'verre',     volumeMl: 30,  abv: 45.0, costPerUnit: 1.50, salePrice: 7,  deposit: 0,    stock: 200, reorderAt: 50,  active: true },
  { id: 'b-10',name: 'Eau pétillante locale',  category: 'sans_alcool', supplier: 'Eau Saguenay',        format: 'canette',   volumeMl: 355, abv: null, costPerUnit: 1.10, salePrice: 4,  deposit: 0.10, stock: 144, reorderAt: 36,  active: true },
  { id: 'b-11',name: 'Limonade médiévale',     category: 'sans_alcool', supplier: 'Maison',              format: 'verre',     volumeMl: 350, abv: null, costPerUnit: 0.60, salePrice: 5,  deposit: 0,    stock: 0,   reorderAt: 0,   active: true,
    notes: 'Préparation maison sur place — stock = lots préparés/jour.' },
  { id: 'b-12',name: 'Fût Boréale Cuivrée',    category: 'biere',       supplier: 'Brasseurs RJ',        format: 'fut',       volumeMl: 30000,abv: 5.5, costPerUnit: 180,  salePrice: 8,  deposit: 75,   stock: 4,   reorderAt: 1,   active: true,
    notes: 'Dépôt 75$ par fût — récupérable au retour.' },
];

let _idSeq = 100;
const nextId = () => `b-${++_idSeq}`;

// ── Public API ──────────────────────────────────────────────────────
export function listBarItems(): Promise<BarItem[]> {
  return Promise.resolve([..._items]);
}

export function addBarItem(item: Omit<BarItem, 'id'>): Promise<BarItem> {
  const created: BarItem = { ...item, id: nextId() };
  _items = [..._items, created];
  return Promise.resolve(created);
}

export function updateBarItem(id: string, patch: Partial<Omit<BarItem, 'id'>>): Promise<void> {
  _items = _items.map((it) => (it.id === id ? { ...it, ...patch } : it));
  return Promise.resolve();
}

export function deleteBarItem(id: string): Promise<void> {
  _items = _items.filter((it) => it.id !== id);
  return Promise.resolve();
}

// Quick stock adjustment — positive to add, negative to remove.
export function adjustStock(id: string, delta: number): Promise<void> {
  _items = _items.map((it) => (it.id === id ? { ...it, stock: Math.max(0, it.stock + delta) } : it));
  return Promise.resolve();
}

// ── Derived helpers ─────────────────────────────────────────────────
export interface BarTotals {
  activeSkus: number;
  stockUnits: number;
  stockValueCost: number;     // CAD — somme cost * stock pour produits actifs
  potentialRevenue: number;   // CAD — somme salePrice * stock
  averageMargin: number;      // 0–1 (proportion)
  lowStock: BarItem[];        // produits actifs sous le seuil reorderAt
  depositOutstanding: number; // CAD — somme deposit * stock (consignes en circulation)
}

export function computeTotals(items: BarItem[]): BarTotals {
  const active = items.filter((i) => i.active);
  let stockValueCost = 0;
  let potentialRevenue = 0;
  let depositOutstanding = 0;
  let stockUnits = 0;
  const margins: number[] = [];
  const lowStock: BarItem[] = [];
  for (const it of active) {
    stockUnits        += it.stock;
    stockValueCost    += it.costPerUnit * it.stock;
    potentialRevenue  += it.salePrice   * it.stock;
    depositOutstanding+= it.deposit     * it.stock;
    if (it.salePrice > 0) margins.push((it.salePrice - it.costPerUnit) / it.salePrice);
    if (it.reorderAt > 0 && it.stock <= it.reorderAt) lowStock.push(it);
  }
  const averageMargin = margins.length
    ? margins.reduce((s, m) => s + m, 0) / margins.length
    : 0;
  return {
    activeSkus: active.length,
    stockUnits,
    stockValueCost,
    potentialRevenue,
    averageMargin,
    lowStock,
    depositOutstanding,
  };
}
