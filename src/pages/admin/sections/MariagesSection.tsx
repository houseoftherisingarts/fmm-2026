import React, { useEffect, useMemo, useState } from 'react';
import {
  Heart, Plus, X, Pencil, Trash2, Download, Users as UsersIcon,
  MapPin, Clock, Sparkles, Check,
} from 'lucide-react';
import { Card, EmptyState, GhostButton, downloadCsv } from '../primitives';
import {
  listMariages, addMariage, updateMariage, deleteMariage, computeMariageTotals,
  STATUS_LABEL, STATUS_TONE, CEREMONY_LABEL,
  type MariageBooking, type MariageStatus, type MariageCeremony,
} from '../../../firebase/mariages';
import * as mockMariages from '../../../firebase/mockMariages';

interface Props { devBypass: boolean }

const fmtCAD = (n: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
const fmtDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' });

const MariagesSection: React.FC<Props> = ({ devBypass }) => {
  const [items, setItems] = useState<MariageBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | MariageStatus>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<MariageBooking | null>(null);

  const reload = async () => {
    setError(null);
    try {
      const rows = await listMariages();
      setItems(rows);
    } catch (err) {
      console.warn('[MariagesSection] listMariages failed:', err);
      if (devBypass) {
        const fallback = await mockMariages.listMariages();
        setItems(fallback);
      } else {
        setError('Impossible de charger les cérémonies. Réessayez.');
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const visible = useMemo(() => items
    .filter((b) => filter === 'all' || b.status === filter)
    .filter((b) => search === '' || `${b.partner1} ${b.partner2} ${b.contactEmail} ${b.officiant} ${b.location}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [items, filter, search]);

  const totals = useMemo(() => computeMariageTotals(items), [items]);

  const onSave = async (data: Omit<MariageBooking, 'id' | 'createdAt'>, id?: string) => {
    setError(null);
    try {
      if (id) await updateMariage(id, data);
      else    await addMariage(data);
      setShowAdd(false); setEditing(null); reload();
    } catch (err) {
      console.warn('[MariagesSection] save failed:', err);
      setError('Erreur lors de la sauvegarde. Réessayez.');
    }
  };
  const onDelete = async (b: MariageBooking) => {
    if (!confirm(`Supprimer la cérémonie de ${b.partner1} & ${b.partner2} ?`)) return;
    setError(null);
    try {
      await deleteMariage(b.id); reload();
    } catch (err) {
      console.warn('[MariagesSection] delete failed:', err);
      setError('Erreur lors de la suppression. Réessayez.');
    }
  };
  const onSetStatus = async (b: MariageBooking, status: MariageStatus) => {
    setError(null);
    try {
      await updateMariage(b.id, { status }); reload();
    } catch (err) {
      console.warn('[MariagesSection] status update failed:', err);
      setError('Erreur lors de la mise à jour du statut.');
    }
  };

  const exportCsv = () => downloadCsv('fmm-mariages.csv', items.map((b) => ({
    date: b.date, heure: b.startTime, duree_min: b.durationMin,
    partenaire_1: b.partner1, partenaire_2: b.partner2,
    type: CEREMONY_LABEL[b.ceremonyType], lieu: b.location, officiant: b.officiant,
    invites: b.guests, forfait: b.packageName, prix: b.packagePrice, depot: b.depositPaid,
    courriel: b.contactEmail, telephone: b.contactPhone, statut: STATUS_LABEL[b.status],
    notes: b.notes || '',
  })));

  return (
    <div className="space-y-5">
      {error && (
        <Card className="p-4 border border-blush/40 bg-blush/8">
          <p className="font-sans text-sm text-blush">{error}</p>
        </Card>
      )}

      {/* Totals strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Cérémonies"    value={String(totals.total)}      sub={`${totals.confirmed} confirmées · ${totals.pending} en attente`} />
        <Stat label="Invités cumulés" value={totals.guestsTotal.toLocaleString('fr-CA')} sub="hors annulées" />
        <Stat label="Revenu réservé" value={fmtCAD(totals.revenueBooked)} />
        <Stat label="Dépôts reçus"   value={fmtCAD(totals.depositReceived)} />
        <Stat label="Solde à percevoir" value={fmtCAD(totals.outstanding)} sub="balance d'ici J-30" />
      </div>

      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-editorial italic text-sm text-ivory-soft">
            Cérémonies médiévales sur site · supervisé par <span className="text-brass">Master Care & Cérémonies</span> (Océane)
          </p>
          <p className="font-editorial italic text-xs text-ivory-soft/60 mt-0.5">
            Cliquez une cérémonie pour éditer. Triées par date.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche…"
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-xs font-sans" />
          <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | MariageStatus)}
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory focus:border-brass focus:outline-none text-xs font-sans">
            <option value="all">Tous les statuts</option>
            {(Object.keys(STATUS_LABEL) as MariageStatus[]).map((k) => (
              <option key={k} value={k}>{STATUS_LABEL[k]}</option>
            ))}
          </select>
          <GhostButton onClick={() => { setEditing(null); setShowAdd(true); }}><Plus size={12} /> Cérémonie</GhostButton>
          <GhostButton onClick={exportCsv}><Download size={12} /> CSV</GhostButton>
        </div>
      </div>

      {(showAdd || editing) && (
        <MariageForm initial={editing} onCancel={() => { setShowAdd(false); setEditing(null); }} onSubmit={onSave} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <Card><EmptyState icon={Heart}>Aucune cérémonie ne correspond.</EmptyState></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {visible.map((b) => (
            <button key={b.id} onClick={() => { setShowAdd(false); setEditing(b); }}
              className="text-left rounded-card border border-ivory-soft/15 bg-ivory-soft/5 p-5 hover:border-brass/40 hover:bg-brass/5 transition group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
                    {fmtDate(b.date)} · {b.startTime}
                  </p>
                  <h3 className="font-display title-medieval text-lg text-ivory leading-tight">
                    {b.partner1} <span className="text-brass">&</span> {b.partner2}
                  </h3>
                </div>
                <span className={`inline-block px-2 py-0.5 border rounded-card text-[10px] uppercase tracking-widest ${STATUS_TONE[b.status]}`}>
                  {STATUS_LABEL[b.status]}
                </span>
              </div>

              <p className="font-editorial italic text-xs text-ivory-soft mb-3">
                {CEREMONY_LABEL[b.ceremonyType]} · forfait <span className="text-brass">{b.packageName}</span>
              </p>

              <ul className="space-y-1.5 text-xs text-ivory-soft font-sans mb-3">
                <Mini icon={MapPin}     >{b.location}</Mini>
                <Mini icon={Sparkles}   >{b.officiant}</Mini>
                <Mini icon={UsersIcon}  >{b.guests} invités</Mini>
                <Mini icon={Clock}      >{b.durationMin} min</Mini>
              </ul>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-ivory-soft/10">
                <span className="font-display title-medieval text-sm text-ivory tabular-nums">
                  {fmtCAD(b.packagePrice)}
                  {b.depositPaid > 0 && (
                    <span className="text-emerald-400 text-xs ml-1.5">
                      · {fmtCAD(b.depositPaid)} dépôt
                    </span>
                  )}
                </span>
                <div className="inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                  <span title="Éditer" className="text-ivory-soft/60 hover:text-brass"><Pencil size={12} /></span>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(b); }}
                    className="text-ivory-soft/60 hover:text-blush" title="Supprimer">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Quick status setter — only on hover */}
              <div className="hidden group-hover:flex flex-wrap items-center gap-1 mt-2.5">
                {(Object.keys(STATUS_LABEL) as MariageStatus[]).filter((s) => s !== b.status).map((s) => (
                  <button key={s} onClick={(e) => { e.stopPropagation(); onSetStatus(b, s); }}
                    className={`px-2 py-0.5 rounded-card border text-[10px] uppercase tracking-widest font-sans transition ${STATUS_TONE[s]} hover:opacity-80`}
                    title={`Marquer ${STATUS_LABEL[s]}`}>
                    → {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Mini: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <li className="flex items-center gap-1.5 truncate">
    <Icon size={11} className="text-stone shrink-0" /><span className="truncate">{children}</span>
  </li>
);

const Stat: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <Card className="p-4">
    <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">{label}</p>
    <p className="font-sans text-xl text-ivory tabular-nums mt-1.5">{value}</p>
    {sub && <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-0.5">{sub}</p>}
  </Card>
);

// ─── Add / edit form ────────────────────────────────────────────────
const MariageForm: React.FC<{
  initial: MariageBooking | null;
  onCancel: () => void;
  onSubmit: (data: Omit<MariageBooking, 'id' | 'createdAt'>, id?: string) => void;
}> = ({ initial, onCancel, onSubmit }) => {
  const [partner1, setP1]      = useState(initial?.partner1 ?? '');
  const [partner2, setP2]      = useState(initial?.partner2 ?? '');
  const [email, setEmail]      = useState(initial?.contactEmail ?? '');
  const [phone, setPhone]      = useState(initial?.contactPhone ?? '');
  const [ceremony, setCer]     = useState<MariageCeremony>(initial?.ceremonyType ?? 'handfasting');
  const [date, setDate]        = useState(initial?.date ?? '2026-09-26');
  const [start, setStart]      = useState(initial?.startTime ?? '14:00');
  const [duration, setDur]     = useState(initial?.durationMin ?? 45);
  const [guests, setGuests]    = useState(initial?.guests ?? 50);
  const [location, setLoc]     = useState(initial?.location ?? 'Bosquet sacré');
  const [officiant, setOff]    = useState(initial?.officiant ?? '');
  const [pkg, setPkg]          = useState(initial?.packageName ?? 'Couronne');
  const [price, setPrice]      = useState(initial?.packagePrice ?? 2400);
  const [deposit, setDep]      = useState(initial?.depositPaid ?? 0);
  const [status, setStatus]    = useState<MariageStatus>(initial?.status ?? 'demande');
  const [notes, setNotes]      = useState(initial?.notes ?? '');

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
            {initial ? 'Édition' : 'Nouvelle cérémonie'}
          </p>
          <h3 className="font-display title-medieval text-lg text-ivory">
            {initial ? `${initial.partner1} & ${initial.partner2}` : 'Réserver une cérémonie médiévale'}
          </h3>
        </div>
        <button onClick={onCancel} className="text-ivory-soft/60 hover:text-ivory transition">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={(e) => {
          e.preventDefault();
          if (!partner1.trim() || !partner2.trim()) return;
          onSubmit({
            partner1: partner1.trim(), partner2: partner2.trim(),
            contactEmail: email.trim(), contactPhone: phone.trim(),
            ceremonyType: ceremony, date, startTime: start,
            durationMin: Number(duration) || 45,
            guests: Number(guests) || 0,
            location: location.trim(), officiant: officiant.trim(),
            packageName: pkg.trim(),
            packagePrice: Number(price) || 0,
            depositPaid: Number(deposit) || 0,
            status,
            notes: notes.trim() || undefined,
          }, initial?.id);
        }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Partenaire 1" full><input value={partner1} onChange={(e) => setP1(e.target.value)} required className={inputCls} /></Field>
        <Field label="Partenaire 2" full><input value={partner2} onChange={(e) => setP2(e.target.value)} required className={inputCls} /></Field>
        <Field label="Courriel"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
        <Field label="Téléphone"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></Field>
        <Field label="Type de cérémonie">
          <select value={ceremony} onChange={(e) => setCer(e.target.value as MariageCeremony)} className={inputCls}>
            {(Object.keys(CEREMONY_LABEL) as MariageCeremony[]).map((k) => (
              <option key={k} value={k}>{CEREMONY_LABEL[k]}</option>
            ))}
          </select>
        </Field>
        <Field label="Statut">
          <select value={status} onChange={(e) => setStatus(e.target.value as MariageStatus)} className={inputCls}>
            {(Object.keys(STATUS_LABEL) as MariageStatus[]).map((k) => (
              <option key={k} value={k}>{STATUS_LABEL[k]}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Heure">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Durée (min)">
          <input type="number" min={15} step={15} value={duration} onChange={(e) => setDur(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Invités">
          <input type="number" min={0} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Lieu sur site">
          <input value={location} onChange={(e) => setLoc(e.target.value)} placeholder="Bosquet sacré, Chapiteau nordique…" className={inputCls} />
        </Field>
        <Field label="Officiant·e">
          <input value={officiant} onChange={(e) => setOff(e.target.value)} placeholder="Nom" className={inputCls} />
        </Field>
        <Field label="Forfait">
          <input value={pkg} onChange={(e) => setPkg(e.target.value)} placeholder="Couronne, Dragon, Sur mesure…" className={inputCls} />
        </Field>
        <Field label="Prix ($)">
          <input type="number" min={0} step={50} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Dépôt reçu ($)">
          <input type="number" min={0} step={50} value={deposit} onChange={(e) => setDep(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Notes" full>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Demandes spéciales, musique live, costumes, allergies, accessibilité…"
            className={`${inputCls} resize-y`} />
        </Field>

        <div className="sm:col-span-2 lg:col-span-4 flex gap-2 justify-end mt-2">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-ivory-soft hover:text-ivory text-xs font-sans uppercase tracking-wider">Annuler</button>
          <button type="submit"
            className="px-4 py-2 bg-brass text-midnight-deep font-sans text-xs uppercase tracking-wider font-semibold rounded-card hover:bg-brass-soft transition inline-flex items-center gap-1.5">
            <Check size={12} /> {initial ? 'Mettre à jour' : 'Créer la cérémonie'}
          </button>
        </div>
      </form>
    </Card>
  );
};

const inputCls =
  'w-full px-3 py-2 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-sm font-sans';

const Field: React.FC<{ label: string; children: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <div className={full ? 'sm:col-span-2 lg:col-span-2' : ''}>
    <label className="block font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

export default MariagesSection;
