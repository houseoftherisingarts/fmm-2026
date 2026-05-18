import React, { useEffect, useMemo, useState } from 'react';
import {
  Beer, Plus, X, Pencil, Trash2, Download, AlertTriangle, Minus, Check,
  PackageX, Eye, EyeOff,
} from 'lucide-react';
import { Card, EmptyState, GhostButton, downloadCsv } from '../primitives';
import {
  listBarItems, addBarItem, updateBarItem, deleteBarItem, adjustStock, computeTotals,
  CATEGORY_LABEL, FORMAT_LABEL,
  type BarItem, type BarCategory, type BarFormat,
} from '../../../firebase/bar';
import { listBarItems as mockListBarItems } from '../../../firebase/mockBar';

interface Props { devBypass: boolean }

const CAT_TONE: Record<BarCategory, string> = {
  biere:       'border-brass/40 bg-brass/8',
  cidre:       'border-emerald-400/30 bg-emerald-400/5',
  vin:         'border-blush/30 bg-blush/5',
  hydromel:    'border-yellow-400/30 bg-yellow-400/5',
  spiritueux:  'border-blue-300/30 bg-blue-300/5',
  sans_alcool: 'border-ivory-soft/20 bg-ivory-soft/5',
};

const fmtCAD = (n: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(n);

const BarSection: React.FC<Props> = ({ devBypass }) => {
  const [items, setItems] = useState<BarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | BarCategory>('all');
  const [search, setSearch] = useState('');
  const [hideInactive, setHideInactive] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<BarItem | null>(null);

  const reload = async () => {
    try {
      setItems(await listBarItems());
      setError(null);
    } catch (e) {
      console.warn('[BarSection] listBarItems failed:', e);
      if (devBypass) {
        setItems(await mockListBarItems());
        setError(null);
      } else {
        setItems([]);
        setError('Impossible de charger le catalogue. Vérifiez la configuration Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const visible = useMemo(() => items.filter((it) => {
    if (filter !== 'all' && it.category !== filter) return false;
    if (hideInactive && !it.active) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${it.name} ${it.supplier} ${CATEGORY_LABEL[it.category]}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [items, filter, search, hideInactive]);

  const totals = useMemo(() => computeTotals(items), [items]);

  const onSave = async (data: Omit<BarItem, 'id'>, id?: string) => {
    try {
      if (id) await updateBarItem(id, data);
      else    await addBarItem(data);
      setError(null);
    } catch (e) {
      console.warn('[BarSection] save failed:', e);
      setError('Échec de la sauvegarde.');
    }
    setShowAdd(false); setEditing(null); reload();
  };
  const onDelete = async (it: BarItem) => {
    if (!confirm(`Retirer « ${it.name} » du catalogue ?`)) return;
    try {
      await deleteBarItem(it.id);
      setError(null);
    } catch (e) {
      console.warn('[BarSection] delete failed:', e);
      setError('Échec de la suppression.');
    }
    reload();
  };
  const onAdjust = async (id: string, delta: number) => {
    try {
      await adjustStock(id, delta);
      setError(null);
    } catch (e) {
      console.warn('[BarSection] adjustStock failed:', e);
      setError('Échec de l\'ajustement de stock.');
    }
    reload();
  };
  const onToggleActive = async (it: BarItem) => {
    try {
      await updateBarItem(it.id, { active: !it.active });
      setError(null);
    } catch (e) {
      console.warn('[BarSection] toggleActive failed:', e);
      setError('Échec de la mise à jour.');
    }
    reload();
  };

  const exportCsv = () => {
    const rows = items.map((it) => ({
      nom: it.name,
      categorie: CATEGORY_LABEL[it.category],
      fournisseur: it.supplier,
      format: FORMAT_LABEL[it.format],
      volume_ml: it.volumeMl,
      abv: it.abv ?? '',
      prix_achat: it.costPerUnit,
      prix_vente: it.salePrice,
      consigne: it.deposit,
      stock: it.stock,
      seuil_alerte: it.reorderAt,
      actif: it.active ? 'oui' : 'non',
      notes: it.notes || '',
    }));
    downloadCsv('fmm-bar-catalogue.csv', rows);
  };

  return (
    <div className="space-y-5">
      {error && (
        <Card className="p-4 border border-blush/40 bg-blush/8">
          <div className="flex items-center justify-between gap-3">
            <p className="font-sans text-sm text-blush">{error}</p>
            <button onClick={() => setError(null)} className="text-blush/60 hover:text-blush transition shrink-0">
              <X size={14} />
            </button>
          </div>
        </Card>
      )}

      {/* Totals strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Produits actifs"   value={String(totals.activeSkus)}      sub={`${items.length} au total`} />
        <Stat label="Unités en stock"   value={totals.stockUnits.toLocaleString('fr-CA')} />
        <Stat label="Valeur (achat)"    value={fmtCAD(totals.stockValueCost)} />
        <Stat label="Revenu potentiel"  value={fmtCAD(totals.potentialRevenue)} sub={`marge moy. ${(totals.averageMargin * 100).toFixed(0)}%`} />
        <Stat label="Consignes"         value={fmtCAD(totals.depositOutstanding)} sub="à récupérer" />
      </div>

      {/* Low-stock alert */}
      {totals.lowStock.length > 0 && (
        <Card className="p-4 border border-blush/30 bg-blush/8">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-blush mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-display title-medieval text-xs text-blush uppercase tracking-widest">
                Stock bas — {totals.lowStock.length} produit{totals.lowStock.length > 1 ? 's' : ''}
              </p>
              <p className="font-sans text-xs text-ivory-soft mt-1 leading-relaxed">
                {totals.lowStock.map((it) => (
                  <span key={it.id} className="inline-block mr-3">
                    <span className="text-ivory">{it.name}</span>
                    <span className="text-blush ml-1.5 tabular-nums">({it.stock} / {it.reorderAt})</span>
                  </span>
                ))}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Header — filters + actions */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-editorial italic text-sm text-ivory-soft">
            Catalogue géré par <span className="text-brass">Master Bar</span> · Arno Geoffroy
          </p>
          <p className="font-editorial italic text-xs text-ivory-soft/60 mt-0.5">
            Cliquez sur une ligne pour éditer · ajustez le stock avec − / +.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche…"
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-xs font-sans" />
          <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | BarCategory)}
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory focus:border-brass focus:outline-none text-xs font-sans">
            <option value="all">Toutes catégories</option>
            {(Object.keys(CATEGORY_LABEL) as BarCategory[]).map((k) => (
              <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
            ))}
          </select>
          <button onClick={() => setHideInactive((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition ${
              hideInactive
                ? 'bg-brass text-midnight-deep'
                : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'
            }`}>
            {hideInactive ? <EyeOff size={12} /> : <Eye size={12} />}
            {hideInactive ? 'Actifs uniquement' : 'Tous'}
          </button>
          <GhostButton onClick={() => { setEditing(null); setShowAdd(true); }}><Plus size={12} /> Produit</GhostButton>
          <GhostButton onClick={exportCsv}><Download size={12} /> CSV</GhostButton>
        </div>
      </div>

      {(showAdd || editing) && (
        <BarItemForm
          initial={editing}
          onCancel={() => { setShowAdd(false); setEditing(null); }}
          onSubmit={onSave}
        />
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <Card><EmptyState icon={PackageX}>Aucun produit ne correspond.</EmptyState></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="text-left border-b border-ivory-soft/10">
                <Th>Produit</Th>
                <Th>Catégorie</Th>
                <Th>Fournisseur</Th>
                <Th className="text-right">Format</Th>
                <Th className="text-right">Achat</Th>
                <Th className="text-right">Vente</Th>
                <Th className="text-right">Marge</Th>
                <Th className="text-right">Stock</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((it) => {
                const margin = it.salePrice > 0 ? (it.salePrice - it.costPerUnit) / it.salePrice : 0;
                const low = it.reorderAt > 0 && it.stock <= it.reorderAt;
                return (
                  <tr key={it.id}
                    className={`border-b border-ivory-soft/5 transition hover:bg-brass/5 ${!it.active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-8 rounded-full ${CAT_TONE[it.category].split(' ')[0].replace('border-', 'bg-')}`} />
                        <div className="min-w-0">
                          <p className="text-ivory font-medium truncate">{it.name}</p>
                          {it.notes && (
                            <p className="text-ivory-soft/60 text-[11px] italic font-editorial truncate max-w-[20rem]">
                              {it.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 border rounded-card text-[10px] uppercase tracking-widest ${CAT_TONE[it.category]} text-ivory-soft`}>
                        {CATEGORY_LABEL[it.category]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ivory-soft truncate max-w-[12rem]">{it.supplier}</td>
                    <td className="px-3 py-3 text-right text-ivory-soft tabular-nums">
                      {FORMAT_LABEL[it.format]} · {it.volumeMl >= 1000 ? `${(it.volumeMl / 1000).toFixed(it.volumeMl % 1000 ? 1 : 0)} L` : `${it.volumeMl} ml`}
                      {it.abv != null && <span className="ml-1 text-ivory-soft/50">· {it.abv}%</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-ivory-soft tabular-nums">{fmtCAD(it.costPerUnit)}</td>
                    <td className="px-3 py-3 text-right text-ivory tabular-nums">{fmtCAD(it.salePrice)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={margin >= 0.6 ? 'text-emerald-400' : margin >= 0.4 ? 'text-brass' : 'text-blush'}>
                        {(margin * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => onAdjust(it.id, -1)}
                          className="w-6 h-6 rounded-card border border-ivory-soft/20 text-ivory-soft hover:border-blush hover:text-blush transition flex items-center justify-center"
                          title="−1"><Minus size={11} /></button>
                        <span className={`min-w-[2.5rem] text-center tabular-nums font-medium ${low ? 'text-blush' : 'text-ivory'}`}>
                          {it.stock}
                        </span>
                        <button onClick={() => onAdjust(it.id, +1)}
                          className="w-6 h-6 rounded-card border border-ivory-soft/20 text-ivory-soft hover:border-emerald-400 hover:text-emerald-400 transition flex items-center justify-center"
                          title="+1"><Plus size={11} /></button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button onClick={() => onToggleActive(it)}
                          className="text-ivory-soft/50 hover:text-brass transition"
                          title={it.active ? 'Désactiver' : 'Activer'}>
                          {it.active ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                        <button onClick={() => { setShowAdd(false); setEditing(it); }}
                          className="text-ivory-soft/50 hover:text-brass transition" title="Éditer">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => onDelete(it)}
                          className="text-ivory-soft/50 hover:text-blush transition" title="Supprimer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const Th: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`px-3 py-2.5 font-display title-medieval text-[10px] tracking-widest text-brass uppercase ${className}`}>
    {children}
  </th>
);

const Stat: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <Card className="p-4">
    <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">{label}</p>
    <p className="font-sans text-xl text-ivory tabular-nums mt-1.5">{value}</p>
    {sub && <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-0.5">{sub}</p>}
  </Card>
);

// ─── Add / edit form ────────────────────────────────────────────────
const BarItemForm: React.FC<{
  initial: BarItem | null;
  onCancel: () => void;
  onSubmit: (data: Omit<BarItem, 'id'>, id?: string) => void;
}> = ({ initial, onCancel, onSubmit }) => {
  const [name, setName]               = useState(initial?.name ?? '');
  const [category, setCategory]       = useState<BarCategory>(initial?.category ?? 'biere');
  const [supplier, setSupplier]       = useState(initial?.supplier ?? '');
  const [format, setFormat]           = useState<BarFormat>(initial?.format ?? 'canette');
  const [volumeMl, setVolumeMl]       = useState(initial?.volumeMl ?? 473);
  const [abv, setAbv]                 = useState<string>(initial?.abv == null ? '' : String(initial.abv));
  const [costPerUnit, setCostPerUnit] = useState(initial?.costPerUnit ?? 0);
  const [salePrice, setSalePrice]     = useState(initial?.salePrice ?? 0);
  const [deposit, setDeposit]         = useState(initial?.deposit ?? 0);
  const [stock, setStock]             = useState(initial?.stock ?? 0);
  const [reorderAt, setReorderAt]     = useState(initial?.reorderAt ?? 0);
  const [active, setActive]           = useState(initial?.active ?? true);
  const [notes, setNotes]             = useState(initial?.notes ?? '');

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
            {initial ? 'Édition' : 'Nouveau produit'}
          </p>
          <h3 className="font-display title-medieval text-lg text-ivory">{initial?.name || 'Ajouter au catalogue'}</h3>
        </div>
        <button onClick={onCancel} className="text-ivory-soft/60 hover:text-ivory transition">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSubmit({
            name: name.trim(), category, supplier: supplier.trim(), format,
            volumeMl: Number(volumeMl) || 0,
            abv: abv === '' ? null : Number(abv),
            costPerUnit: Number(costPerUnit) || 0,
            salePrice:   Number(salePrice)   || 0,
            deposit:     Number(deposit)     || 0,
            stock:       Number(stock)       || 0,
            reorderAt:   Number(reorderAt)   || 0,
            active,
            notes: notes.trim() || undefined,
          }, initial?.id);
        }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Nom" full>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Boréale Rousse" className={inputCls} />
        </Field>
        <Field label="Catégorie">
          <select value={category} onChange={(e) => setCategory(e.target.value as BarCategory)} className={inputCls}>
            {(Object.keys(CATEGORY_LABEL) as BarCategory[]).map((k) => (
              <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
            ))}
          </select>
        </Field>
        <Field label="Fournisseur">
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Brasseurs RJ" className={inputCls} />
        </Field>
        <Field label="Format">
          <select value={format} onChange={(e) => setFormat(e.target.value as BarFormat)} className={inputCls}>
            {(Object.keys(FORMAT_LABEL) as BarFormat[]).map((k) => (
              <option key={k} value={k}>{FORMAT_LABEL[k]}</option>
            ))}
          </select>
        </Field>
        <Field label="Volume (ml)">
          <input type="number" min={0} value={volumeMl} onChange={(e) => setVolumeMl(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Alcool (%)">
          <input type="number" min={0} step="0.1" value={abv} onChange={(e) => setAbv(e.target.value)} placeholder="vide = sans alcool" className={inputCls} />
        </Field>
        <Field label="Prix achat ($)">
          <input type="number" min={0} step="0.01" value={costPerUnit} onChange={(e) => setCostPerUnit(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Prix vente ($)">
          <input type="number" min={0} step="0.01" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Consigne ($)">
          <input type="number" min={0} step="0.01" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Stock initial">
          <input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Seuil d'alerte">
          <input type="number" min={0} value={reorderAt} onChange={(e) => setReorderAt(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Actif au menu">
          <label className="inline-flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)}
              className="accent-brass w-4 h-4" />
            <span className="text-sm font-sans text-ivory-soft">{active ? 'Visible' : 'Caché'}</span>
          </label>
        </Field>
        <Field label="Notes" full>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Édition limitée, à mettre en évidence, dépôt récupérable…"
            className={`${inputCls} resize-y`} />
        </Field>

        <div className="sm:col-span-2 lg:col-span-4 flex gap-2 justify-end mt-2">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-ivory-soft hover:text-ivory text-xs font-sans uppercase tracking-wider">
            Annuler
          </button>
          <button type="submit"
            className="px-4 py-2 bg-brass text-midnight-deep font-sans text-xs uppercase tracking-wider font-semibold rounded-card hover:bg-brass-soft transition inline-flex items-center gap-1.5">
            <Check size={12} /> {initial ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </Card>
  );
};

const inputCls =
  'w-full px-3 py-2 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-sm font-sans';

const Field: React.FC<{ label: string; children: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <div className={full ? 'sm:col-span-2 lg:col-span-4' : ''}>
    <label className="block font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

// Re-export icon so AdminShell nav can pull it without bringing the
// entire section in. (Kept local for now — AdminShell uses its own
// import directly.)
export const BarSectionIcon = Beer;

export default BarSection;
