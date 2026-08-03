import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, X, Trash2, Lock, Unlock, ChevronLeft, Star, CalendarCheck2, Users,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  listPolls, subscribePoll, createPoll, setVote, closePoll, deletePoll,
  type TeamPoll, type PollOption, type VoteChoice,
} from '../../../firebase/dispos';
import {
  Card, EmptyState, GhostButton, PrimaryButton, DangerButton, Input, Textarea, Label,
} from '../primitives';

// ─── Disponibilités — clone Doodle interne ─────────────────────────
// Maïté (ou tout admin) crée un sondage avec quelques options (dates
// ou créneaux libres). Chaque membre de l'équipe vote sur SA propre
// ligne — un clic fait cycler Oui → Peut-être → Non. Les votes des
// autres sont visibles mais non modifiables. La meilleure option (le
// plus de Oui, départagé par Peut-être) est mise en évidence.

const CHOICE_LABEL: Record<VoteChoice, string> = { oui: 'Oui', peutetre: 'Peut-être', non: 'Non' };

const CHOICE_TONE: Record<VoteChoice, string> = {
  oui:      'bg-emerald-400/15 border-emerald-400/40 text-emerald-300',
  peutetre: 'bg-amber-300/15 border-amber-300/40 text-amber-200',
  non:      'bg-blush/10 border-blush/40 text-blush',
};

function nextChoice(current?: VoteChoice): VoteChoice {
  if (current === 'oui') return 'peutetre';
  if (current === 'peutetre') return 'non';
  return 'oui';
}

function fmtOptionDate(dateISO?: string): string {
  if (!dateISO) return '';
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' });
}

const DisposSection: React.FC = () => {
  const { user } = useAuth();
  const myUid  = user?.uid ?? 'dev';
  const myName = user?.displayName ?? user?.email ?? 'Admin';

  const [polls, setPolls] = useState<TeamPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [poll, setPoll] = useState<TeamPoll | null>(null);

  const reload = async () => {
    try {
      setPolls(await listPolls());
      setError(null);
    } catch (e) {
      console.warn('[DisposSection] listPolls failed:', e);
      setPolls([]);
      setError('Impossible de charger les sondages. Vérifiez la configuration Firebase.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  // Live listener on the open sondage — updates the grid the instant
  // someone else votes.
  useEffect(() => {
    if (!selectedId) { setPoll(null); return; }
    const unsub = subscribePoll(selectedId, setPoll);
    return unsub;
  }, [selectedId]);

  const onCreate = async (data: { title: string; description?: string; options: PollOption[] }) => {
    try {
      await createPoll({ ...data, createdByUid: myUid, createdByName: myName });
      setError(null);
    } catch (e) {
      console.warn('[DisposSection] createPoll failed:', e);
      setError('Échec de la création du sondage.');
    }
    setCreating(false);
    reload();
  };

  const onDelete = async (p: TeamPoll) => {
    if (!confirm(`Supprimer le sondage « ${p.title} » ? Cette action est irréversible.`)) return;
    try {
      await deletePoll(p.id);
      setError(null);
    } catch (e) {
      console.warn('[DisposSection] deletePoll failed:', e);
      setError('Échec de la suppression.');
    }
    if (selectedId === p.id) setSelectedId(null);
    reload();
  };

  const onToggleClosed = async (p: TeamPoll) => {
    try {
      await closePoll(p.id, !p.closed);
      setError(null);
    } catch (e) {
      console.warn('[DisposSection] closePoll failed:', e);
      setError('Échec de la mise à jour.');
    }
    reload();
  };

  const onCellClick = async (optionId: string) => {
    if (!poll || poll.closed) return;
    const mine = poll.votes[myUid]?.choices || {};
    const choices = { ...mine, [optionId]: nextChoice(mine[optionId]) };
    try {
      await setVote(poll.id, myUid, myName, choices);
      setError(null);
    } catch (e) {
      console.warn('[DisposSection] setVote failed:', e);
      setError('Échec de l’enregistrement du vote.');
    }
  };

  // ── Detail view ──────────────────────────────────────────────────
  if (selectedId) {
    return (
      <div className="space-y-5">
        {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
        <button onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider text-ivory-soft hover:text-brass transition">
          <ChevronLeft size={13} /> Tous les sondages
        </button>

        {!poll ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
          </div>
        ) : (
          <PollDetail
            poll={poll}
            myUid={myUid}
            onCellClick={onCellClick}
            onToggleClosed={() => onToggleClosed(poll)}
            onDelete={() => onDelete(poll)}
          />
        )}
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────
  const openPolls = polls.filter((p) => !p.closed);
  const closedPolls = polls.filter((p) => p.closed);

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-editorial italic text-sm text-ivory-soft">
            <span className="text-brass tabular-nums font-medium">{openPolls.length}</span> ouvert{openPolls.length > 1 ? 's' : ''} ·
            <span className="text-ivory-soft/60 tabular-nums font-medium ml-1">{closedPolls.length}</span> fermé{closedPolls.length > 1 ? 's' : ''}
          </p>
          <p className="font-editorial italic text-xs text-ivory-soft/60 mt-0.5">
            Créez un sondage de disponibilités et laissez l’équipe voter Oui, Peut-être ou Non sur chaque option.
          </p>
        </div>
        <PrimaryButton onClick={() => setCreating(true)}>
          <Plus size={12} /> Nouveau sondage
        </PrimaryButton>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
        </div>
      ) : polls.length === 0 ? (
        <Card><EmptyState icon={CalendarCheck2}>Aucun sondage pour l’instant. Créez le premier.</EmptyState></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...openPolls, ...closedPolls].map((p) => (
            <PollCard key={p.id} poll={p}
              onOpen={() => setSelectedId(p.id)}
              onToggleClosed={() => onToggleClosed(p)}
              onDelete={() => onDelete(p)}
            />
          ))}
        </div>
      )}

      {creating && (
        <PollEditor onCancel={() => setCreating(false)} onSave={onCreate} />
      )}
    </div>
  );
};

// ─── Error banner ───────────────────────────────────────────────────
const ErrorBanner: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <Card className="p-4 border border-blush/40 bg-blush/8">
    <div className="flex items-center justify-between gap-3">
      <p className="font-sans text-sm text-blush">{message}</p>
      <button onClick={onClose} className="text-blush/60 hover:text-blush transition shrink-0">
        <X size={14} />
      </button>
    </div>
  </Card>
);

// ─── Poll card (list view) ──────────────────────────────────────────
const PollCard: React.FC<{
  poll: TeamPoll;
  onOpen: () => void;
  onToggleClosed: () => void;
  onDelete: () => void;
}> = ({ poll, onOpen, onToggleClosed, onDelete }) => {
  const responses = Object.keys(poll.votes).length;
  return (
    <Card className={`p-4 cursor-pointer transition hover:border-brass/40 ${poll.closed ? 'opacity-60' : ''}`}>
      <div onClick={onOpen}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-display title-medieval text-sm text-ivory">{poll.title}</p>
          <span className={`shrink-0 font-sans text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-card border ${
            poll.closed ? 'border-ivory-soft/20 text-ivory-soft/60' : 'border-emerald-400/40 text-emerald-300'
          }`}>
            {poll.closed ? 'Fermé' : 'Ouvert'}
          </span>
        </div>
        {poll.description && (
          <p className="font-editorial italic text-xs text-ivory-soft/70 mt-1.5 line-clamp-2">{poll.description}</p>
        )}
        <p className="font-sans text-[11px] text-ivory-soft/50 mt-2 flex items-center gap-1.5">
          <Users size={11} /> {responses} réponse{responses > 1 ? 's' : ''} · {poll.options.length} option{poll.options.length > 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-ivory-soft/10">
        <button onClick={(e) => { e.stopPropagation(); onToggleClosed(); }}
          title={poll.closed ? 'Rouvrir' : 'Fermer'}
          className="p-1.5 rounded-card text-ivory-soft hover:text-brass hover:bg-brass/10 transition">
          {poll.closed ? <Unlock size={12} /> : <Lock size={12} />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Supprimer"
          className="p-1.5 rounded-card text-ivory-soft hover:text-blush hover:bg-blush/10 transition">
          <Trash2 size={12} />
        </button>
      </div>
    </Card>
  );
};

// ─── Poll detail — membres × options grid ──────────────────────────
const PollDetail: React.FC<{
  poll: TeamPoll;
  myUid: string;
  onCellClick: (optionId: string) => void;
  onToggleClosed: () => void;
  onDelete: () => void;
}> = ({ poll, myUid, onCellClick, onToggleClosed, onDelete }) => {
  const totals = useMemo(() => {
    const t: Record<string, { oui: number; peutetre: number; non: number }> = {};
    for (const opt of poll.options) t[opt.id] = { oui: 0, peutetre: 0, non: 0 };
    for (const uid of Object.keys(poll.votes)) {
      const choices = poll.votes[uid].choices || {};
      for (const opt of poll.options) {
        const c = choices[opt.id];
        if (c) t[opt.id][c] += 1;
      }
    }
    return t;
  }, [poll]);

  const bestOptionId = useMemo(() => {
    let best: string | null = null;
    for (const opt of poll.options) {
      const tt = totals[opt.id];
      if (!tt || tt.oui === 0) continue;
      if (!best || tt.oui > totals[best].oui ||
          (tt.oui === totals[best].oui && tt.peutetre > totals[best].peutetre)) {
        best = opt.id;
      }
    }
    return best;
  }, [poll, totals]);

  const participantUids = useMemo(() => {
    const uids = new Set(Object.keys(poll.votes));
    uids.add(myUid);
    return Array.from(uids).sort((a, b) => {
      if (a === myUid) return -1;
      if (b === myUid) return 1;
      const an = poll.votes[a]?.name || '';
      const bn = poll.votes[b]?.name || '';
      return an.localeCompare(bn, 'fr');
    });
  }, [poll, myUid]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-display title-medieval text-lg text-ivory">{poll.title}</p>
          {poll.description && (
            <p className="font-editorial italic text-sm text-ivory-soft/70 mt-1">{poll.description}</p>
          )}
          <p className="font-sans text-[11px] text-ivory-soft/50 mt-1.5">
            Créé par {poll.createdByName || 'Admin'} · {poll.closed ? 'Fermé' : 'Ouvert'} au vote
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GhostButton onClick={onToggleClosed}>
            {poll.closed ? <><Unlock size={12} /> Rouvrir</> : <><Lock size={12} /> Fermer</>}
          </GhostButton>
          <DangerButton onClick={onDelete}><Trash2 size={12} /> Supprimer</DangerButton>
        </div>
      </div>

      {poll.options.length === 0 ? (
        <Card><EmptyState icon={CalendarCheck2}>Ce sondage n’a aucune option.</EmptyState></Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm font-sans border-collapse">
            <thead>
              <tr className="border-b border-ivory-soft/10">
                <Th>Membre</Th>
                {poll.options.map((opt) => (
                  <Th key={opt.id} className={`text-center ${bestOptionId === opt.id ? 'bg-brass/10' : ''}`}>
                    <div className="flex flex-col items-center gap-0.5">
                      {bestOptionId === opt.id && (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest text-brass">
                          <Star size={9} className="fill-brass" /> Meilleure
                        </span>
                      )}
                      <span className="text-ivory normal-case tracking-normal font-sans text-xs">{opt.label}</span>
                      {opt.dateISO && (
                        <span className="text-[10px] text-ivory-soft/50 normal-case tracking-normal">{fmtOptionDate(opt.dateISO)}</span>
                      )}
                    </div>
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participantUids.map((uid) => {
                const mine = uid === myUid;
                const name = mine ? 'Vous' : (poll.votes[uid]?.name || 'Anonyme');
                const choices = poll.votes[uid]?.choices || {};
                return (
                  <tr key={uid} className="border-b border-ivory-soft/5">
                    <td className="px-4 py-2.5 font-sans text-xs text-ivory whitespace-nowrap">{name}</td>
                    {poll.options.map((opt) => {
                      const c = choices[opt.id];
                      const cellBase = 'w-full text-center px-2.5 py-2 text-[11px] font-sans uppercase tracking-wider border transition';
                      if (mine && !poll.closed) {
                        return (
                          <td key={opt.id} className={bestOptionId === opt.id ? 'bg-brass/5' : ''}>
                            <button onClick={() => onCellClick(opt.id)}
                              className={`${cellBase} rounded-card cursor-pointer hover:brightness-110 ${
                                c ? CHOICE_TONE[c] : 'border-dashed border-ivory-soft/20 text-ivory-soft/30'
                              }`}>
                              {c ? CHOICE_LABEL[c] : '—'}
                            </button>
                          </td>
                        );
                      }
                      return (
                        <td key={opt.id} className={bestOptionId === opt.id ? 'bg-brass/5' : ''}>
                          <div className={`${cellBase} rounded-card ${
                            c ? CHOICE_TONE[c] : 'border-dashed border-ivory-soft/10 text-ivory-soft/20'
                          }`}>
                            {c ? CHOICE_LABEL[c] : '—'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr>
                <td className="px-4 py-2.5 font-display title-medieval text-[10px] uppercase tracking-widest text-brass">Totaux</td>
                {poll.options.map((opt) => {
                  const t = totals[opt.id];
                  return (
                    <td key={opt.id} className={`text-center px-2.5 py-2.5 ${bestOptionId === opt.id ? 'bg-brass/10' : ''}`}>
                      <span className="font-sans text-[11px] tabular-nums">
                        <span className="text-emerald-300">{t.oui}</span>
                        {' · '}
                        <span className="text-amber-200">{t.peutetre}</span>
                        {' · '}
                        <span className="text-blush">{t.non}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </Card>
      )}
      {poll.closed && (
        <p className="font-editorial italic text-xs text-ivory-soft/50">
          Sondage fermé — les votes ne peuvent plus être modifiés. Rouvrez-le pour continuer à voter.
        </p>
      )}
    </div>
  );
};

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`px-4 py-3 font-display title-medieval text-[10px] uppercase tracking-widest text-brass ${className}`}>
    {children}
  </th>
);

// ─── Poll editor (creation modal) ───────────────────────────────────
const emptyOption = (): PollOption => ({ id: `opt-${Math.random().toString(36).slice(2, 8)}`, label: '' });

const PollEditor: React.FC<{
  onCancel: () => void;
  onSave: (data: { title: string; description?: string; options: PollOption[] }) => Promise<void>;
}> = ({ onCancel, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<PollOption[]>([emptyOption(), emptyOption()]);
  const [busy, setBusy] = useState(false);

  const setOptionLabel = (id: string, label: string) =>
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));
  const setOptionDate = (id: string, dateISO: string) =>
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, dateISO: dateISO || undefined } : o)));
  const addOption = () => setOptions((prev) => [...prev, emptyOption()]);
  const removeOption = (id: string) => setOptions((prev) => prev.filter((o) => o.id !== id));

  const validOptions = options.filter((o) => o.label.trim());
  const canSave = title.trim() && validOptions.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        options: validOptions.map((o) => ({ ...o, label: o.label.trim() })),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-midnight-deep/70 backdrop-blur-sm flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-lg bg-midnight-deep border border-brass/30 rounded-lg-card p-6 md:p-7 space-y-4 max-h-[85vh] overflow-y-auto">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">Nouveau sondage</p>
            <h3 className="font-display title-medieval text-lg text-ivory">{title || 'Sans titre'}</h3>
          </div>
          <button type="button" onClick={onCancel} className="text-ivory-soft hover:text-blush transition">
            <X size={16} />
          </button>
        </header>

        <label className="block">
          <Label>Titre</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="Ex. : Réunion d’équipe — semaine du festival" />
        </label>

        <label className="block">
          <Label>Description (optionnel)</Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Précisions pour l’équipe" />
        </label>

        <div>
          <Label>Options</Label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2">
                <Input value={opt.label} onChange={(e) => setOptionLabel(opt.id, e.target.value)}
                  placeholder={`Option ${i + 1} — ex. « Jeudi soir »`} className="flex-1" />
                <Input type="date" value={opt.dateISO || ''} onChange={(e) => setOptionDate(opt.id, e.target.value)}
                  className="w-40" />
                <button type="button" onClick={() => removeOption(opt.id)}
                  disabled={options.length <= 1}
                  className="p-2 rounded-card text-ivory-soft hover:text-blush hover:bg-blush/10 transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <GhostButton type="button" onClick={addOption} className="mt-2">
            <Plus size={12} /> Ajouter une option
          </GhostButton>
        </div>

        <footer className="flex items-center justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>Annuler</GhostButton>
          <PrimaryButton type="submit" disabled={!canSave || busy}>
            {busy ? 'Création…' : 'Créer le sondage'}
          </PrimaryButton>
        </footer>
      </form>
    </div>
  );
};

export default DisposSection;
