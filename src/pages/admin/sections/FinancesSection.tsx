import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet, PiggyBank, Landmark, FileText, Plus, X, Trash2, Pencil, Check,
  Upload, Download, TrendingUp, ShieldCheck, Anchor, LayoutDashboard,
} from 'lucide-react';
import {
  Card, EmptyState, GhostButton, PrimaryButton, downloadCsv, fmtDate,
} from '../primitives';
import {
  listCategories, seedDefaultCategories, addCategory, updateCategory, deleteCategory,
  listAccounts, seedDefaultAccounts, addAccount, updateAccount, deleteAccount,
  getAllocation, setAllocation,
  listDocuments, uploadDocument, deleteDocument,
  ACCOUNT_TYPE_LABEL,
  type FinanceCategory, type FinanceAccount, type AccountType, type FinanceAllocation, type FinanceDocument,
} from '../../../firebase/finances';

// ─── Finances ────────────────────────────────────────────────────────
// Un tableau de bord (budget par catégories + comptes + répartition,
// lisibles d'un coup d'œil) et un onglet Documents à part. Admin
// seulement (super/CA/organisateurs) — voir adminPermissions.ts et
// firestore.rules.

const fmtCAD = (n: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);

// Traduit une erreur Firebase en phrase compréhensible sans jargon.
// L'appelant précise l'action en cours pour un message situé.
const humanizeError = (e: unknown, action: 'charger ces données' | 'enregistrer' | 'supprimer' | 'téléverser le fichier'): string => {
  const code = (e as { code?: string } | null)?.code ?? '';
  if (code === 'permission-denied') {
    return 'Accès refusé : votre compte n’a pas la permission nécessaire en ce moment. Demandez à qui gère le site de vérifier vos accès admin.';
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return 'Connexion instable, réessayez dans un instant.';
  }
  return `Impossible de ${action} pour l’instant. Réessayez, et si ça persiste, prévenez qui gère le site.`;
};

type Tab = 'dashboard' | 'documents';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'documents', label: 'Documents',       icon: FileText },
];

const inputCls =
  'w-full px-3 py-2 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-sm font-sans';

const Field: React.FC<{ label: string; children: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <div className={full ? 'sm:col-span-2' : ''}>
    <label className="block font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const ErrorBanner: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <Card className="p-4 border border-blush/40 bg-blush/8 !rounded-card">
    <div className="flex items-center justify-between gap-3">
      <p className="font-sans text-sm text-blush">{message}</p>
      <button onClick={onClose} className="text-blush/60 hover:text-blush transition shrink-0">
        <X size={14} />
      </button>
    </div>
  </Card>
);

const Spinner: React.FC = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
  </div>
);

const SectionTitle: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <h2 className="font-display title-medieval text-xl text-brass uppercase tracking-widest inline-flex items-center gap-2">
    <Icon size={16} /> {children}
  </h2>
);

const FinancesSection: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition ${
              tab === id
                ? 'bg-brass text-midnight-deep'
                : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'
            }`}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'documents' && <DocumentsTab />}
    </div>
  );
};

// ─── Tableau de bord : budget + comptes + répartition, ensemble ──────
// Les trois concepts se parlent (un dollar budgété vit dans un compte
// et se range dans une des trois enveloppes de répartition), donc ils
// vivent sur le même écran plutôt que dans des onglets séparés.

const DashboardTab: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [catError, setCatError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [accError, setAccError] = useState<string | null>(null);

  const [allocation, setAllocationState] = useState<FinanceAllocation>({ investir: 0, epargne: 0, essentiel: 0 });
  const [allocError, setAllocError] = useState<string | null>(null);
  const [allocSaving, setAllocSaving] = useState(false);

  const reloadCategories = async () => {
    try {
      const list = await listCategories();
      setCategories(list);
      setCatError(null);
      // Collection vide : on tente de précharger les catégories de
      // départ en tâche de fond. Un échec ici (ex. droits d'écriture
      // manquants) ne doit pas transformer un état vide en erreur.
      if (list.length === 0) {
        seedDefaultCategories()
          .then(() => listCategories())
          .then(setCategories)
          .catch((e) => console.warn('[FinancesSection] seedDefaultCategories failed (non bloquant):', e));
      }
    } catch (e) {
      console.warn('[FinancesSection] listCategories failed:', e);
      setCategories([]);
      setCatError(humanizeError(e, 'charger ces données'));
    }
  };

  const reloadAccounts = async () => {
    try {
      const list = await listAccounts();
      setAccounts(list);
      setAccError(null);
      if (list.length === 0) {
        seedDefaultAccounts()
          .then(() => listAccounts())
          .then(setAccounts)
          .catch((e) => console.warn('[FinancesSection] seedDefaultAccounts failed (non bloquant):', e));
      }
    } catch (e) {
      console.warn('[FinancesSection] listAccounts failed:', e);
      setAccounts([]);
      setAccError(humanizeError(e, 'charger ces données'));
    }
  };

  const reloadAllocation = async () => {
    try {
      setAllocationState(await getAllocation());
      setAllocError(null);
    } catch (e) {
      console.warn('[FinancesSection] getAllocation failed:', e);
      setAllocError(humanizeError(e, 'charger ces données'));
    }
  };

  useEffect(() => {
    Promise.allSettled([reloadCategories(), reloadAccounts(), reloadAllocation()]).finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => ({
    budgeted: categories.reduce((s, c) => s + c.budgeted, 0),
    actual: categories.reduce((s, c) => s + c.actual, 0),
  }), [categories]);
  const totalEcart = totals.budgeted - totals.actual;
  const soldeNet = accounts.reduce((s, a) => s + a.balance, 0);

  const onSaveAllocation = async () => {
    setAllocSaving(true);
    try {
      await setAllocation(allocation);
      setAllocError(null);
    } catch (e) {
      console.warn('[FinancesSection] setAllocation failed:', e);
      setAllocError(humanizeError(e, 'enregistrer'));
    }
    setAllocSaving(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* Vue d'ensemble — budget + comptes, un coup d'œil */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Budgété"           value={fmtCAD(totals.budgeted)} />
        <Stat label="Dépensé"           value={fmtCAD(totals.actual)} />
        <Stat label="Écart budget"      value={fmtCAD(totalEcart)} tone={totalEcart < 0 ? 'blush' : 'emerald'} />
        <Stat label="Solde net comptes" value={fmtCAD(soldeNet)} tone={soldeNet < 0 ? 'blush' : 'emerald'} />
      </div>

      {/* Répartition — bande compacte, sous les stats */}
      <RepartitionBand
        allocation={allocation}
        onChange={setAllocationState}
        onSave={onSaveAllocation}
        saving={allocSaving}
        error={allocError}
        onClearError={() => setAllocError(null)}
      />

      {/* Budget + Comptes côte à côte */}
      <div className="grid lg:grid-cols-2 gap-5">
        <BudgetColumn
          items={categories} error={catError} onClearError={() => setCatError(null)}
          reload={reloadCategories}
        />
        <ComptesColumn
          items={accounts} error={accError} onClearError={() => setAccError(null)}
          reload={reloadAccounts}
        />
      </div>
    </div>
  );
};

// ─── Colonne Budget ──────────────────────────────────────────────────

const BudgetColumn: React.FC<{
  items: FinanceCategory[];
  error: string | null;
  onClearError: () => void;
  reload: () => Promise<void>;
}> = ({ items, error, onClearError, reload }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const onSave = async (data: Omit<FinanceCategory, 'id'>, id?: string) => {
    try {
      if (id) await updateCategory(id, data);
      else await addCategory(data);
      setSaveError(null);
    } catch (e) {
      console.warn('[FinancesSection] save category failed:', e);
      setSaveError(humanizeError(e, 'enregistrer'));
    }
    setShowAdd(false); setEditing(null); reload();
  };

  const onDelete = async (c: FinanceCategory) => {
    if (!confirm(`Retirer la catégorie « ${c.name} » ?`)) return;
    try {
      await deleteCategory(c.id);
      setSaveError(null);
    } catch (e) {
      console.warn('[FinancesSection] delete category failed:', e);
      setSaveError(humanizeError(e, 'supprimer'));
    }
    reload();
  };

  const exportCsv = () => downloadCsv('fmm-budget.csv', items.map((c) => ({
    categorie: c.name, budgete: c.budgeted, reel: c.actual, ecart: c.budgeted - c.actual,
  })));

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <SectionTitle icon={Wallet}>Budget</SectionTitle>
        <div className="flex items-center gap-2">
          <GhostButton onClick={() => { setEditing(null); setShowAdd(true); }}><Plus size={12} /> Catégorie</GhostButton>
          {items.length > 0 && <GhostButton onClick={exportCsv}><Download size={12} /> CSV</GhostButton>}
        </div>
      </div>

      {(error || saveError) && <ErrorBanner message={(error || saveError)!} onClose={() => { onClearError(); setSaveError(null); }} />}

      {(showAdd || editing) && (
        <CategoryForm
          initial={editing}
          onCancel={() => { setShowAdd(false); setEditing(null); }}
          onSubmit={onSave}
        />
      )}

      {items.length === 0 ? (
        <Card className="!rounded-card">
          <EmptyState>
            <>
              Aucune catégorie de budget pour l’instant.
              <div className="mt-4">
                <GhostButton onClick={() => { setEditing(null); setShowAdd(true); }}>
                  <Plus size={12} /> Créer la première catégorie
                </GhostButton>
              </div>
            </>
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => {
            const ecart = c.budgeted - c.actual;
            const pct = c.budgeted > 0 ? Math.min(100, Math.round((c.actual / c.budgeted) * 100)) : (c.actual > 0 ? 100 : 0);
            const over = c.actual > c.budgeted && c.budgeted > 0;
            return (
              <Card key={c.id} className="p-4 !rounded-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-display title-medieval text-sm text-ivory truncate">{c.name}</p>
                    <p className="font-sans text-xs text-ivory-soft/70 tabular-nums mt-0.5">
                      {fmtCAD(c.actual)} / {fmtCAD(c.budgeted)}
                      <span className={`ml-2 ${ecart < 0 ? 'text-blush' : 'text-emerald-400'}`}>
                        ({ecart >= 0 ? 'reste ' : 'dépassé de '}{fmtCAD(Math.abs(ecart))})
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => { setShowAdd(false); setEditing(c); }}
                      className="text-ivory-soft/50 hover:text-brass transition" title="Éditer">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => onDelete(c)}
                      className="text-ivory-soft/50 hover:text-blush transition" title="Supprimer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="h-2 rounded-pill bg-midnight-deep/60 border border-ivory-soft/10 overflow-hidden">
                  <div className={`h-full rounded-pill transition-all ${over ? 'bg-blush' : 'bg-brass'}`}
                    style={{ width: `${pct}%` }} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CategoryForm: React.FC<{
  initial: FinanceCategory | null;
  onCancel: () => void;
  onSubmit: (data: Omit<FinanceCategory, 'id'>, id?: string) => void;
}> = ({ initial, onCancel, onSubmit }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [budgeted, setBudgeted] = useState(initial?.budgeted ?? 0);
  const [actual, setActual] = useState(initial?.actual ?? 0);

  return (
    <Card className="p-5 !rounded-card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-display title-medieval text-lg text-ivory">{initial ? 'Édition' : 'Nouvelle catégorie'}</h3>
        <button onClick={onCancel} className="text-ivory-soft/60 hover:text-ivory transition"><X size={16} /></button>
      </div>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name: name.trim(), budgeted: Number(budgeted) || 0, actual: Number(actual) || 0, order: initial?.order ?? Date.now() }, initial?.id);
      }} className="grid sm:grid-cols-3 gap-3">
        <Field label="Nom" full>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex. : Sécurité" className={inputCls} />
        </Field>
        <Field label="Montant budgété ($)">
          <input type="number" min={0} step="0.01" value={budgeted} onChange={(e) => setBudgeted(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Montant réel dépensé ($)">
          <input type="number" min={0} step="0.01" value={actual} onChange={(e) => setActual(Number(e.target.value))} className={inputCls} />
        </Field>
        <div className="sm:col-span-3 flex gap-2 justify-end mt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-ivory-soft hover:text-ivory text-xs font-sans uppercase tracking-wider">Annuler</button>
          <button type="submit" className="px-4 py-2 bg-brass text-midnight-deep font-sans text-xs uppercase tracking-wider font-semibold rounded-card hover:bg-brass-soft transition inline-flex items-center gap-1.5">
            <Check size={12} /> {initial ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </Card>
  );
};

// ─── Colonne Comptes ─────────────────────────────────────────────────

const ComptesColumn: React.FC<{
  items: FinanceAccount[];
  error: string | null;
  onClearError: () => void;
  reload: () => Promise<void>;
}> = ({ items, error, onClearError, reload }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FinanceAccount | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const onSave = async (data: Omit<FinanceAccount, 'id'>, id?: string) => {
    try {
      if (id) await updateAccount(id, data);
      else await addAccount(data);
      setSaveError(null);
    } catch (e) {
      console.warn('[FinancesSection] save account failed:', e);
      setSaveError(humanizeError(e, 'enregistrer'));
    }
    setShowAdd(false); setEditing(null); reload();
  };

  const onDelete = async (a: FinanceAccount) => {
    if (!confirm(`Retirer le compte « ${a.name} » ?`)) return;
    try {
      await deleteAccount(a.id);
      setSaveError(null);
    } catch (e) {
      console.warn('[FinancesSection] delete account failed:', e);
      setSaveError(humanizeError(e, 'supprimer'));
    }
    reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <SectionTitle icon={Landmark}>Comptes</SectionTitle>
        <GhostButton onClick={() => { setEditing(null); setShowAdd(true); }}><Plus size={12} /> Compte</GhostButton>
      </div>

      {(error || saveError) && <ErrorBanner message={(error || saveError)!} onClose={() => { onClearError(); setSaveError(null); }} />}

      {(showAdd || editing) && (
        <AccountForm initial={editing} onCancel={() => { setShowAdd(false); setEditing(null); }} onSubmit={onSave} />
      )}

      {items.length === 0 ? (
        <Card className="!rounded-card">
          <EmptyState>
            <>
              Aucun compte pour l’instant.
              <div className="mt-4">
                <GhostButton onClick={() => { setEditing(null); setShowAdd(true); }}>
                  <Plus size={12} /> Créer le premier compte
                </GhostButton>
              </div>
            </>
          </EmptyState>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4 !rounded-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display title-medieval text-sm text-ivory truncate">{a.name}</p>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft/60 mt-0.5">{ACCOUNT_TYPE_LABEL[a.type]}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => { setShowAdd(false); setEditing(a); }} className="text-ivory-soft/50 hover:text-brass transition" title="Éditer"><Pencil size={13} /></button>
                  <button onClick={() => onDelete(a)} className="text-ivory-soft/50 hover:text-blush transition" title="Supprimer"><Trash2 size={13} /></button>
                </div>
              </div>
              <p className={`font-sans text-xl tabular-nums mt-3 ${a.type === 'dette' ? 'text-blush' : 'text-ivory'}`}>
                {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: a.currency || 'CAD', maximumFractionDigits: 0 }).format(a.balance)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const AccountForm: React.FC<{
  initial: FinanceAccount | null;
  onCancel: () => void;
  onSubmit: (data: Omit<FinanceAccount, 'id'>, id?: string) => void;
}> = ({ initial, onCancel, onSubmit }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'banque');
  const [balance, setBalance] = useState(initial?.balance ?? 0);
  const [currency, setCurrency] = useState(initial?.currency ?? 'CAD');

  return (
    <Card className="p-5 !rounded-card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-display title-medieval text-lg text-ivory">{initial ? 'Édition' : 'Nouveau compte'}</h3>
        <button onClick={onCancel} className="text-ivory-soft/60 hover:text-ivory transition"><X size={16} /></button>
      </div>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name: name.trim(), type, balance: Number(balance) || 0, currency: currency.trim() || 'CAD', order: initial?.order ?? Date.now() }, initial?.id);
      }} className="grid sm:grid-cols-2 gap-3">
        <Field label="Nom" full>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex. : Desjardins" className={inputCls} />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className={inputCls}>
            {(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((k) => (
              <option key={k} value={k}>{ACCOUNT_TYPE_LABEL[k]}</option>
            ))}
          </select>
        </Field>
        <Field label="Solde">
          <input type="number" step="0.01" value={balance} onChange={(e) => setBalance(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Devise">
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="CAD" className={inputCls} />
        </Field>
        <div className="sm:col-span-2 flex gap-2 justify-end mt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-ivory-soft hover:text-ivory text-xs font-sans uppercase tracking-wider">Annuler</button>
          <button type="submit" className="px-4 py-2 bg-brass text-midnight-deep font-sans text-xs uppercase tracking-wider font-semibold rounded-card hover:bg-brass-soft transition inline-flex items-center gap-1.5">
            <Check size={12} /> {initial ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </Card>
  );
};

// ─── Bande Répartition (investir / épargner / essentiel) ─────────────

const PART_META = {
  investir:  { label: 'Investir',  icon: TrendingUp,  color: '#5A8FD6' },
  epargne:   { label: 'Épargner',  icon: PiggyBank,    color: '#5FD3A2' },
  essentiel: { label: 'Essentiel', icon: Anchor,       color: '#C9A85A' },
} as const;

const RepartitionBand: React.FC<{
  allocation: FinanceAllocation;
  onChange: (a: FinanceAllocation) => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  onClearError: () => void;
}> = ({ allocation, onChange, onSave, saving, error, onClearError }) => {
  const total = allocation.investir + allocation.epargne + allocation.essentiel;

  return (
    <div className="space-y-3">
      {error && <ErrorBanner message={error} onClose={onClearError} />}
      <Card className="p-4 !rounded-card">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <SectionTitle icon={PiggyBank}>Répartition</SectionTitle>
          <p className={`font-sans text-[11px] ${total === 100 ? 'text-ivory-soft/60' : 'text-blush'}`}>
            Total : {total}% {total !== 100 && '(vise 100%)'}
          </p>
        </div>

        <div className="h-3 rounded-pill overflow-hidden flex border border-ivory-soft/10 mb-4">
          {(Object.keys(PART_META) as (keyof FinanceAllocation)[]).map((k) => {
            const pct = total > 0 ? (allocation[k] / total) * 100 : 0;
            return <div key={k} style={{ width: `${pct}%`, background: PART_META[k].color }} />;
          })}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {(Object.keys(PART_META) as (keyof FinanceAllocation)[]).map((k) => {
            const { label, icon: Icon, color } = PART_META[k];
            return (
              <div key={k} className="flex items-center gap-2">
                <span className="w-7 h-7 shrink-0 rounded-card flex items-center justify-center" style={{ background: `${color}22`, color }}>
                  <Icon size={14} />
                </span>
                <label className="sr-only" htmlFor={`alloc-${k}`}>{label}</label>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    id={`alloc-${k}`}
                    type="number" min={0} max={100} value={allocation[k]}
                    onChange={(e) => onChange({ ...allocation, [k]: Number(e.target.value) || 0 })}
                    className={`${inputCls} tabular-nums`}
                  />
                  <span className="font-sans text-ivory-soft text-sm">%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-4">
          <PrimaryButton onClick={onSave} disabled={saving}>
            <ShieldCheck size={12} /> {saving ? 'Sauvegarde…' : 'Sauvegarder la répartition'}
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
};

// ─── Onglet Documents ────────────────────────────────────────────────

const DOC_CATEGORIES = ['États financiers', 'Factures', 'Rapports', 'Autre'];

const DocumentsTab: React.FC = () => {
  const [docs, setDocs] = useState<FinanceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      setDocs(await listDocuments());
      setError(null);
    } catch (e) {
      console.warn('[FinancesSection] listDocuments failed:', e);
      setDocs([]);
      setError(humanizeError(e, 'charger ces données'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const onUpload = async (file: File, meta: { name: string; category: string; year: number }) => {
    setBusy(true);
    try {
      await uploadDocument(file, meta);
      setError(null);
    } catch (e) {
      console.warn('[FinancesSection] uploadDocument failed:', e);
      setError(humanizeError(e, 'téléverser le fichier'));
    }
    setBusy(false);
    setShowUpload(false);
    reload();
  };

  const onDelete = async (d: FinanceDocument) => {
    if (!confirm(`Supprimer « ${d.name} » ?`)) return;
    try {
      await deleteDocument(d);
      setError(null);
    } catch (e) {
      console.warn('[FinancesSection] deleteDocument failed:', e);
      setError(humanizeError(e, 'supprimer'));
    }
    reload();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <p className="font-editorial italic text-xs text-ivory-soft/60">
          États financiers, factures, rapports : tous au même endroit.
        </p>
        <GhostButton onClick={() => setShowUpload(true)}><Upload size={12} /> Téléverser</GhostButton>
      </div>

      {showUpload && (
        <UploadForm busy={busy} onCancel={() => setShowUpload(false)} onSubmit={onUpload} />
      )}

      {docs.length === 0 ? (
        <Card className="!rounded-card">
          <EmptyState>
            <>
              Aucun document téléversé pour l’instant.
              <div className="mt-4">
                <GhostButton onClick={() => setShowUpload(true)}>
                  <Upload size={12} /> Téléverser le premier document
                </GhostButton>
              </div>
            </>
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-x-auto !rounded-card">
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="text-left border-b border-ivory-soft/10">
                <Th>Nom</Th>
                <Th>Catégorie</Th>
                <Th className="text-right">Année</Th>
                <Th className="text-right">Déposé le</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-ivory-soft/5 hover:bg-brass/5 transition">
                  <td className="px-4 py-3 text-ivory truncate max-w-[16rem]">{d.name}</td>
                  <td className="px-3 py-3 text-ivory-soft">{d.category}</td>
                  <td className="px-3 py-3 text-right text-ivory-soft tabular-nums">{d.year}</td>
                  <td className="px-3 py-3 text-right text-ivory-soft tabular-nums">{fmtDate(d.uploadedAt)}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <a href={d.url} target="_blank" rel="noopener noreferrer"
                        className="text-ivory-soft/50 hover:text-brass transition" title="Télécharger">
                        <Download size={13} />
                      </a>
                      <button onClick={() => onDelete(d)} className="text-ivory-soft/50 hover:text-blush transition" title="Supprimer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const UploadForm: React.FC<{
  busy: boolean;
  onCancel: () => void;
  onSubmit: (file: File, meta: { name: string; category: string; year: number }) => void;
}> = ({ busy, onCancel, onSubmit }) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(DOC_CATEGORIES[0]);
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <Card className="p-5 !rounded-card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-display title-medieval text-lg text-ivory">Téléverser un document</h3>
        <button onClick={onCancel} className="text-ivory-soft/60 hover:text-ivory transition"><X size={16} /></button>
      </div>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!file) return;
        onSubmit(file, { name: name.trim() || file.name, category, year: Number(year) || new Date().getFullYear() });
      }} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Fichier" full>
          <input type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm font-sans text-ivory-soft file:mr-3 file:px-3 file:py-1.5 file:rounded-card file:border file:border-brass/40 file:bg-brass/10 file:text-brass file:text-xs file:uppercase file:tracking-wider file:cursor-pointer" />
        </Field>
        <Field label="Nom" full>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : États financiers 2025" className={inputCls} />
        </Field>
        <Field label="Catégorie">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Année">
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-4 flex gap-2 justify-end mt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-ivory-soft hover:text-ivory text-xs font-sans uppercase tracking-wider">Annuler</button>
          <button type="submit" disabled={!file || busy}
            className="px-4 py-2 bg-brass text-midnight-deep font-sans text-xs uppercase tracking-wider font-semibold rounded-card hover:bg-brass-soft transition inline-flex items-center gap-1.5 disabled:opacity-50">
            <Upload size={12} /> {busy ? 'Envoi…' : 'Téléverser'}
          </button>
        </div>
      </form>
    </Card>
  );
};

// ─── Petits composants partagés ─────────────────────────────────────

const Th: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`px-3 py-2.5 font-display title-medieval text-[10px] tracking-widest text-brass uppercase ${className}`}>
    {children}
  </th>
);

const Stat: React.FC<{ label: string; value: string; sub?: string; tone?: 'emerald' | 'blush' }> = ({ label, value, sub, tone }) => (
  <Card className="p-4 !rounded-card">
    <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">{label}</p>
    <p className={`font-sans text-xl tabular-nums mt-1.5 ${tone === 'blush' ? 'text-blush' : tone === 'emerald' ? 'text-emerald-400' : 'text-ivory'}`}>{value}</p>
    {sub && <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-0.5">{sub}</p>}
  </Card>
);

export default FinancesSection;
