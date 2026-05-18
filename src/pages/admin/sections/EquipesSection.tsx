import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, Pencil, Crown, Users, X, Save, Search, GripVertical,
} from 'lucide-react';
import {
  type BenevoleApp, type BenevoleTeamRole, CURRENT_YEAR,
} from '../../../firebase/applications';
import {
  listTeams, createTeam, updateTeam, deleteTeam,
  type Team,
} from '../../../firebase/teams';
import {
  mockListTeams, mockCreateTeam, mockUpdateTeam, mockDeleteTeam,
  mockSetBenevoleTeam, mockListBenevoles,
} from '../../../firebase/mockApplications';
import { setBenevoleTeam } from '../../../firebase/applications';
import { listBenevoles } from '../../../firebase/applications';
import { Card, EmptyState, GhostButton, PrimaryButton } from '../primitives';

// ─── Visual Teams board ────────────────────────────────────────────
// Maïté forms small crews ("Bar", "Accueil", "Sécurité"…) and assigns
// each accepted bénévole as Leader (one) or Member. Layout is a kanban-
// style board: one column per team plus an "Non assigné·es" column
// containing every bénévole not currently on a team. Each card can be
// dragged between columns; double-click toggles leader/member.

const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;
const SHOWCASE_IN_DEV = import.meta.env.DEV;

interface Props {
  devBypass?: boolean;
}

const EquipesSection: React.FC<Props> = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [benevoles, setBenevoles] = useState<BenevoleApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Team | null>(null);
  const [creating, setCreating] = useState(false);
  const [year] = useState<number>(CURRENT_YEAR);

  // Resolve live vs mock paths based on dev bypass + uid prefix.
  const fetchAll = async () => {
    setLoading(true);
    try {
      let liveTeams: Team[] = [];
      let liveBenevoles: BenevoleApp[] = [];
      if (!DEV_BYPASS) {
        try { liveTeams = await listTeams(year); } catch (e) { if (!SHOWCASE_IN_DEV) throw e; }
        try { liveBenevoles = await listBenevoles(); } catch (e) { if (!SHOWCASE_IN_DEV) throw e; }
      }
      const mockT = (DEV_BYPASS || SHOWCASE_IN_DEV) ? await mockListTeams(year) : [];
      const mockB = (DEV_BYPASS || SHOWCASE_IN_DEV) ? await mockListBenevoles() : [];
      // Merge — live wins on id collisions.
      const tIds = new Set(liveTeams.map((t) => t.id));
      const bIds = new Set(liveBenevoles.map((b) => b.uid));
      setTeams([...mockT.filter((t) => !tIds.has(t.id)), ...liveTeams]);
      setBenevoles([...mockB.filter((b) => !bIds.has(b.uid)), ...liveBenevoles]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); }, []);

  // ── Mutations ──
  const saveTeam = async (t: Omit<Team, 'createdAt' | 'updatedAt'>) => {
    if (DEV_BYPASS || t.id?.startsWith('team-')) {
      if (creating) await mockCreateTeam(t);
      else          await mockUpdateTeam(t.id, t);
    } else {
      if (creating) await createTeam(t);
      else          await updateTeam(t.id, t);
    }
    setEditing(null); setCreating(false);
    fetchAll();
  };
  const removeTeam = async (id: string) => {
    if (!confirm('Supprimer cette équipe ? Les bénévoles affectés seront non-assignés.')) return;
    if (DEV_BYPASS || id.startsWith('team-')) await mockDeleteTeam(id);
    else                                       await deleteTeam(id);
    fetchAll();
  };
  const assignTo = async (uid: string, teamId: string | null, role: BenevoleTeamRole | null) => {
    if (DEV_BYPASS || uid.startsWith('mock-')) await mockSetBenevoleTeam(uid, teamId, role);
    else                                        await setBenevoleTeam(uid, teamId, role);
    fetchAll();
  };

  // ── Filtering + grouping ──
  const accepted = useMemo(
    () => benevoles.filter((b) => b.status === 'accepted'),
    [benevoles],
  );
  const filtered = useMemo(() => {
    if (!search.trim()) return accepted;
    const q = search.toLowerCase();
    return accepted.filter((b) =>
      `${b.prenom} ${b.nom} ${b.email}`.toLowerCase().includes(q),
    );
  }, [accepted, search]);
  const unassigned = useMemo(() => filtered.filter((b) => !b.teamId), [filtered]);
  const byTeam: Record<string, BenevoleApp[]> = useMemo(() => {
    const m: Record<string, BenevoleApp[]> = {};
    for (const t of teams) m[t.id] = [];
    for (const b of filtered) if (b.teamId && m[b.teamId]) m[b.teamId].push(b);
    return m;
  }, [filtered, teams]);

  // ── Render ──
  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-editorial italic text-sm text-ivory-soft">
            <span className="text-brass tabular-nums font-medium">{teams.length}</span> équipes ·
            <span className="text-emerald-400 tabular-nums font-medium ml-1">{filtered.length - unassigned.length}</span> assigné·es ·
            <span className="text-amber-300 tabular-nums font-medium ml-1">{unassigned.length}</span> non assigné·es
          </p>
          <p className="font-editorial italic text-xs text-ivory-soft/60 mt-0.5">
            Glissez un·e bénévole d’une colonne à l’autre pour l’assigner. Cliquez la couronne pour basculer leader/membre.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche bénévole…"
              className="pl-8 pr-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-xs font-sans" />
          </div>
          <PrimaryButton onClick={() => { setCreating(true); setEditing(emptyTeam(year)); }}>
            <Plus size={12} /> Nouvelle équipe
          </PrimaryButton>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 md:-mx-8 px-4 md:px-8 pb-6">
          <div className="flex gap-4 min-w-max items-start">
            {/* Unassigned column — always first */}
            <Column
              tone="amber"
              title="Non assigné·es"
              icon={<Users size={14} />}
              count={unassigned.length}
              onDropTo={(uid) => assignTo(uid, null, null)}
            >
              {unassigned.length === 0 ? (
                <p className="font-editorial italic text-xs text-ivory-soft/40 px-3 py-4 text-center">
                  Tout le monde est dans une équipe.
                </p>
              ) : unassigned.map((b) => (
                <BenevoleCard key={b.uid} b={b} />
              ))}
            </Column>

            {/* Team columns */}
            {teams.length === 0 ? (
              <div className="min-w-[18rem]">
                <Card className="p-6">
                  <EmptyState icon={Users}>
                    Aucune équipe pour {year}. Créez la première — par ex. « Bar », « Accueil ».
                  </EmptyState>
                </Card>
              </div>
            ) : (
              teams.map((t) => {
                const roster = byTeam[t.id] || [];
                const leaders = roster.filter((b) => b.teamRole === 'leader');
                const members = roster.filter((b) => b.teamRole !== 'leader');
                return (
                  <Column
                    key={t.id}
                    title={t.name}
                    icon={<span className="text-base">{t.icon || '🏛️'}</span>}
                    color={t.color}
                    count={roster.length}
                    desc={t.description}
                    onDropTo={(uid) => assignTo(uid, t.id, 'member')}
                    onEdit={() => { setCreating(false); setEditing(t); }}
                    onDelete={() => removeTeam(t.id)}
                  >
                    {/* Leader strip */}
                    <div className="px-3 py-2 mb-2 rounded-card border border-brass/30 bg-brass/5">
                      <p className="font-display title-medieval text-[10px] uppercase tracking-widest text-brass mb-1.5 flex items-center gap-1.5">
                        <Crown size={10} /> Leader{leaders.length > 1 ? 's' : ''}
                      </p>
                      {leaders.length === 0 ? (
                        <p className="font-editorial italic text-[11px] text-ivory-soft/50">
                          Aucun leader désigné·e.
                        </p>
                      ) : leaders.map((b) => (
                        <BenevoleCard key={b.uid} b={b} leader
                          onToggleRole={() => assignTo(b.uid, t.id, 'member')}
                          onUnassign={() => assignTo(b.uid, null, null)}
                        />
                      ))}
                    </div>

                    {members.length === 0 ? (
                      <p className="font-editorial italic text-xs text-ivory-soft/40 px-3 py-4 text-center">
                        Aucun·e membre. Glissez un·e bénévole ici.
                      </p>
                    ) : members.map((b) => (
                      <BenevoleCard key={b.uid} b={b}
                        onToggleRole={() => assignTo(b.uid, t.id, 'leader')}
                        onUnassign={() => assignTo(b.uid, null, null)}
                      />
                    ))}
                  </Column>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {editing && (
        <TeamEditor
          initial={editing}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSave={saveTeam}
        />
      )}
    </div>
  );
};

// ─── Column ─────────────────────────────────────────────────────────
const Column: React.FC<{
  title: string;
  icon?: React.ReactNode;
  color?: string;
  count: number;
  desc?: string;
  tone?: 'amber' | 'default';
  onDropTo: (uid: string) => void;
  onEdit?:    () => void;
  onDelete?:  () => void;
  children: React.ReactNode;
}> = ({ title, icon, color, count, desc, tone, onDropTo, onEdit, onDelete, children }) => {
  const [over, setOver] = useState(false);
  const headerStyle = color ? { borderColor: `${color}66`, background: `${color}1a` } : undefined;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); const uid = e.dataTransfer.getData('text/uid'); if (uid) onDropTo(uid); }}
      className={`min-w-[18rem] w-72 rounded-card border bg-midnight-deep/40 transition flex flex-col ${
        over ? 'border-brass shadow-[0_0_0_2px_rgba(201,160,90,0.35)]' :
        tone === 'amber' ? 'border-amber-300/30' : 'border-ivory-soft/15'
      }`}
    >
      <header
        className="px-4 py-3 border-b border-ivory-soft/10 flex items-start gap-2.5"
        style={headerStyle}
      >
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-display title-medieval text-sm text-ivory truncate">{title}</p>
          <p className="font-editorial italic text-[11px] text-ivory-soft/60">
            {count} bénévole{count > 1 ? 's' : ''}{desc ? ` · ${desc}` : ''}
          </p>
        </div>
        {(onEdit || onDelete) && (
          <div className="shrink-0 flex items-center gap-1">
            {onEdit && (
              <button onClick={onEdit} title="Modifier"
                className="p-1.5 rounded-card text-ivory-soft hover:text-brass hover:bg-brass/10 transition">
                <Pencil size={11} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} title="Supprimer"
                className="p-1.5 rounded-card text-ivory-soft hover:text-blush hover:bg-blush/10 transition">
                <Trash2 size={11} />
              </button>
            )}
          </div>
        )}
      </header>
      <div className="p-2 space-y-1.5 flex-1 max-h-[60vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

// ─── Bénévole draggable card ────────────────────────────────────────
const BenevoleCard: React.FC<{
  b: BenevoleApp;
  leader?: boolean;
  onToggleRole?: () => void;
  onUnassign?:   () => void;
}> = ({ b, leader, onToggleRole, onUnassign }) => {
  const fullName = `${b.prenom || ''} ${b.nom || ''}`.trim() || b.displayName;
  const hue = hueFor(fullName);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/uid', b.uid)}
      className={`group relative rounded-card px-3 py-2 flex items-center gap-2.5 cursor-grab active:cursor-grabbing transition border ${
        leader
          ? 'bg-brass/10 border-brass/40 hover:bg-brass/15'
          : 'bg-ivory-soft/5 border-ivory-soft/15 hover:bg-ivory-soft/10'
      }`}
      title={`${fullName} — glisser pour réassigner`}
    >
      <GripVertical size={11} className="text-ivory-soft/30 shrink-0 group-hover:text-ivory-soft/60 transition" />
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center font-display title-medieval text-[11px] shrink-0"
        style={{ backgroundColor: `hsl(${hue} 30% 22%)`, color: `hsl(${hue} 60% 70%)` }}
      >
        {initials(fullName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-xs text-ivory truncate leading-tight">{fullName}</p>
        {leader && (
          <p className="font-editorial italic text-[10px] text-brass leading-tight">Leader</p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
        {onToggleRole && (
          <button onClick={onToggleRole} title={leader ? 'Démettre comme leader' : 'Promouvoir leader'}
            className="p-1 rounded-card text-ivory-soft hover:text-brass hover:bg-brass/10">
            <Crown size={11} className={leader ? 'text-brass' : ''} />
          </button>
        )}
        {onUnassign && (
          <button onClick={onUnassign} title="Retirer de l’équipe"
            className="p-1 rounded-card text-ivory-soft hover:text-blush hover:bg-blush/10">
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Team editor modal ──────────────────────────────────────────────
const PRESET_COLORS = ['#c9a05a', '#7aa6c9', '#d18a8a', '#8fb88f', '#a09080', '#9a7eb0', '#e0b873', '#76a0a0'];
const PRESET_ICONS  = ['🍺', '🎟️', '🛡️', '⛺', '🧹', '🅿️', '🏛️', '⚔️', '🎭', '🔥', '🐎', '🌿'];

const TeamEditor: React.FC<{
  initial: Team;
  onCancel: () => void;
  onSave: (t: Omit<Team, 'createdAt' | 'updatedAt'>) => Promise<void>;
}> = ({ initial, onCancel, onSave }) => {
  const [t, setT] = useState<Team>(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Team>(k: K, v: Team[K]) => setT((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!t.name.trim()) return;
    setBusy(true);
    try {
      await onSave({
        id: t.id, year: t.year,
        name: t.name.trim(),
        description: t.description?.trim() || undefined,
        color: t.color || undefined,
        icon:  t.icon  || undefined,
      });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-midnight-deep/70 backdrop-blur-sm flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md bg-midnight-deep border border-brass/30 rounded-lg-card p-6 md:p-7 space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
              {initial.id ? 'Modifier l’équipe' : 'Nouvelle équipe'}
            </p>
            <h3 className="font-display title-medieval text-lg text-ivory">
              {t.name || 'Sans nom'}
            </h3>
          </div>
          <button type="button" onClick={onCancel} className="text-ivory-soft hover:text-blush transition">
            <X size={16} />
          </button>
        </header>

        <label className="block">
          <span className="block font-display title-medieval text-xs text-brass mb-1.5">Nom</span>
          <input value={t.name} onChange={(e) => set('name', e.target.value)} required autoFocus
            className="w-full bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 rounded-card text-sm font-sans text-ivory focus:border-brass focus:outline-none" />
        </label>

        <label className="block">
          <span className="block font-display title-medieval text-xs text-brass mb-1.5">Description</span>
          <textarea rows={2} value={t.description || ''} onChange={(e) => set('description', e.target.value)}
            className="w-full bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 rounded-card text-sm font-sans text-ivory focus:border-brass focus:outline-none resize-y" />
        </label>

        <div>
          <span className="block font-display title-medieval text-xs text-brass mb-1.5">Couleur</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => set('color', c)}
                className={`w-7 h-7 rounded-full border-2 transition ${t.color === c ? 'border-brass scale-110' : 'border-ivory-soft/20'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div>
          <span className="block font-display title-medieval text-xs text-brass mb-1.5">Icône</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_ICONS.map((i) => (
              <button key={i} type="button" onClick={() => set('icon', i)}
                className={`w-9 h-9 rounded-card border text-base transition ${t.icon === i ? 'border-brass bg-brass/15' : 'border-ivory-soft/15 bg-midnight-deep/40 hover:border-brass/40'}`}>
                {i}
              </button>
            ))}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>Annuler</GhostButton>
          <PrimaryButton type="submit" disabled={busy || !t.name.trim()}>
            <Save size={12} /> {busy ? 'Enregistrement…' : 'Enregistrer'}
          </PrimaryButton>
        </footer>
      </form>
    </div>
  );
};

function emptyTeam(year: number): Team {
  return { id: '', name: '', description: '', color: '#c9a05a', icon: '🏛️', year };
}
function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default EquipesSection;
