import React, { useEffect, useState } from 'react';
import { Bug, Trash2, Download, ChevronDown } from 'lucide-react';
import { Card, Badge, EmptyState, GhostButton, downloadCsv, fmtDate } from '../primitives';
import {
  listBugReports, setBugStatus, deleteBugReport,
  CATEGORY_LABELS, STATUS_LABELS,
  type BugReport, type BugStatus,
} from '../../../firebase/bugReports';

interface Props { devBypass: boolean }

const STATUS_TONE: Record<BugStatus, 'pending' | 'info' | 'accepted'> = {
  nouveau:  'pending',
  en_cours: 'info',
  resolu:   'accepted',
};

const BugsSection: React.FC<Props> = ({ devBypass }) => {
  const [bugs, setBugs]     = useState<BugReport[]>([]);
  const [filter, setFilter] = useState<BugStatus | 'all'>('all');
  const [open, setOpen]     = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const live = await listBugReports();
        if (!cancelled) setBugs(live);
      } catch (e) {
        console.warn('[bugs] list failed', e);
        if (!cancelled) setError(devBypass ? null : 'Impossible de charger les signalements.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [devBypass]);

  const counts = {
    total:    bugs.length,
    nouveau:  bugs.filter((b) => b.status === 'nouveau').length,
    en_cours: bugs.filter((b) => b.status === 'en_cours').length,
    resolu:   bugs.filter((b) => b.status === 'resolu').length,
  };

  const filtered = filter === 'all' ? bugs : bugs.filter((b) => b.status === filter);

  const changeStatus = async (id: string, status: BugStatus) => {
    const prev = bugs;
    setBugs((list) => list.map((b) => (b.id === id ? { ...b, status } : b)));
    try {
      await setBugStatus(id, status);
    } catch (e) {
      console.warn('[bugs] status update failed', e);
      setBugs(prev);
      setError('Échec de la mise à jour du statut.');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce signalement ?')) return;
    const prev = bugs;
    setBugs((list) => list.filter((b) => b.id !== id));
    try {
      await deleteBugReport(id);
    } catch (e) {
      console.warn('[bugs] delete failed', e);
      setBugs(prev);
      setError('Échec de la suppression — réessayez.');
    }
  };

  const exportCsv = () => downloadCsv('fmm-bugs.csv', bugs.map((b) => ({
    categorie:   CATEGORY_LABELS[b.category].FR,
    statut:      STATUS_LABELS[b.status].FR,
    page:        b.page,
    description: b.description,
    attendu:     b.expected ?? '',
    contact:     b.email ?? '',
    appareil:    b.viewport ?? '',
    url:         b.url ?? '',
    date:        fmtDate(b.createdAt),
  })));

  return (
    <div className="space-y-5">
      {error && (
        <Card className="p-4 border border-blush/40 bg-blush/10">
          <p className="font-sans text-sm text-blush">{error}</p>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-ivory">{counts.total}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">Total</p></Card>
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-brass">{counts.nouveau}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">Nouveaux</p></Card>
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-ivory">{counts.en_cours}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">En cours</p></Card>
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-ivory">{counts.resolu}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">Résolus</p></Card>
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <p className="font-editorial italic text-sm text-ivory-soft">
          {filtered.length} signalement{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {([
            ['all',      'Tous'],
            ['nouveau',  'Nouveaux'],
            ['en_cours', 'En cours'],
            ['resolu',   'Résolus'],
          ] as const).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition ${filter === k ? 'bg-brass text-midnight-deep' : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'}`}>
              {label}
            </button>
          ))}
          <GhostButton onClick={exportCsv}><Download size={12} /> CSV</GhostButton>
        </div>
      </div>

      {loading ? (
        <Card><EmptyState icon={Bug}>Chargement…</EmptyState></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Bug}>Aucun signalement{filter !== 'all' ? ' dans cette catégorie' : ''}.</EmptyState></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => {
            const isOpen = open === b.id;
            return (
              <Card key={b.id} className="overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <button
                    onClick={() => setOpen(isOpen ? null : b.id)}
                    className="mt-0.5 text-ivory-soft hover:text-brass transition shrink-0"
                    aria-label="Détails"
                  >
                    <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABELS[b.status].FR}</Badge>
                      <span className="font-sans text-[11px] uppercase tracking-widest text-brass">
                        {CATEGORY_LABELS[b.category].FR}
                      </span>
                      <span className="font-sans text-[11px] text-ivory-soft/60">· {fmtDate(b.createdAt)}</span>
                    </div>
                    <p className={`font-sans text-sm text-ivory ${isOpen ? '' : 'truncate'}`}>{b.description}</p>

                    {isOpen && (
                      <div className="mt-3 space-y-2 font-sans text-xs text-ivory-soft">
                        {b.expected && (
                          <p><span className="text-brass uppercase tracking-widest text-[10px]">Attendu : </span>{b.expected}</p>
                        )}
                        <p><span className="text-brass uppercase tracking-widest text-[10px]">Page : </span>{b.page || '—'}</p>
                        {b.url && (
                          <p className="break-all"><span className="text-brass uppercase tracking-widest text-[10px]">URL : </span>{b.url}</p>
                        )}
                        {b.email && (
                          <p><span className="text-brass uppercase tracking-widest text-[10px]">Contact : </span>
                            <a href={`mailto:${b.email}`} className="hover:text-brass underline">{b.email}</a>
                          </p>
                        )}
                        <p className="text-ivory-soft/50"><span className="uppercase tracking-widest text-[10px]">Appareil : </span>{b.viewport || '?'} · {b.userAgent || '?'}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={b.status}
                      onChange={(e) => changeStatus(b.id, e.target.value as BugStatus)}
                      className="px-2 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory text-xs font-sans focus:border-brass focus:outline-none"
                      aria-label="Statut"
                    >
                      {(Object.keys(STATUS_LABELS) as BugStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s].FR}</option>
                      ))}
                    </select>
                    <button onClick={() => remove(b.id)} className="text-ivory-soft hover:text-blush transition" aria-label="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BugsSection;
