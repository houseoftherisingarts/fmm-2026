import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, X, GripVertical, Pencil, Trash2, Crown, UserCog, Users, Download, Check,
  LayoutGrid, KanbanSquare, Link2, ChevronDown, ChevronRight, UsersRound, AlertTriangle,
} from 'lucide-react';
import { Card, EmptyState, GhostButton, downloadCsv } from '../primitives';
import {
  listMatriceRoles, listMatriceTasks,
  moveTask, addTask, deleteTask, renameTask,
  addRole, updateRoleHolder, deleteRole,
  computeDependencies, topDependenciesFor, listPeople,
  type MatriceRole, type MatriceTask, type RoleCategory, type PersonSummary,
} from '../../../firebase/matrice';
import {
  listMatriceRoles as listMatriceRolesMock,
  listMatriceTasks as listMatriceTasksMock,
} from '../../../firebase/mockMatrice';

interface Props { devBypass: boolean }

const CAT_ICON: Record<RoleCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  master: Crown, lead: UserCog, coord: Users,
};
const CAT_TONE: Record<RoleCategory, string> = {
  master: 'border-brass/40 bg-brass/8',
  lead:   'border-blue-300/30 bg-blue-300/5',
  coord:  'border-blush/30 bg-blush/5',
};
const CAT_TONE_RING: Record<RoleCategory, string> = {
  master: 'ring-brass/60',
  lead:   'ring-blue-300/60',
  coord:  'ring-blush/60',
};
const CAT_LABEL: Record<RoleCategory, string> = {
  master: 'Master', lead: 'Lead', coord: 'Coordo',
};

type ViewMode = 'overview' | 'kanban' | 'people';

const MatriceRolesSection: React.FC<Props> = ({ devBypass }) => {
  const [roles, setRoles] = useState<MatriceRole[]>([]);
  const [tasks, setTasks] = useState<MatriceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView]   = useState<ViewMode>('overview');
  const [filter, setFilter] = useState<'all' | RoleCategory>('all');
  const [search, setSearch] = useState('');
  const [showAddRole, setShowAddRole] = useState(false);

  // Holds the latest fetched roles so the drawer can look them up synchronously.
  const rolesRef = useRef<MatriceRole[]>([]);

  const reload = async () => {
    try {
      const [r, t] = await Promise.all([listMatriceRoles(), listMatriceTasks()]);
      if (r.length === 0 && t.length === 0 && devBypass) {
        // Empty Firestore + dev bypass: fall back to mock seed data.
        const [mr, mt] = await Promise.all([listMatriceRolesMock(), listMatriceTasksMock()]);
        rolesRef.current = mr;
        setRoles(mr); setTasks(mt);
      } else {
        rolesRef.current = r;
        setRoles(r); setTasks(t);
      }
      setError(null);
    } catch (err) {
      console.warn('[matrice] reload failed:', err);
      if (devBypass) {
        try {
          const [mr, mt] = await Promise.all([listMatriceRolesMock(), listMatriceTasksMock()]);
          rolesRef.current = mr;
          setRoles(mr); setTasks(mt);
          setError('Firebase indisponible — données mock utilisées.');
        } catch {
          setError('Impossible de charger la matrice.');
        }
      } else {
        setError('Impossible de charger la matrice. Vérifiez la configuration Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const visibleRoles = useMemo(
    () => roles.filter((r) => {
      const matchCat = filter === 'all' || r.category === filter;
      const matchSearch = search === '' || `${r.title} ${r.holder} ${r.code}`.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    }),
    [roles, filter, search],
  );

  const tasksByRole = useMemo(() => {
    const m = new Map<string, MatriceTask[]>();
    for (const r of roles) m.set(r.id, []);
    for (const t of tasks) {
      if (!m.has(t.roleId)) m.set(t.roleId, []);
      m.get(t.roleId)!.push(t);
    }
    for (const [, arr] of m) arr.sort((a, b) => a.order - b.order);
    return m;
  }, [roles, tasks]);

  // CRUD callbacks (shared across views)
  const onAddTask = (roleId: string) => async (label: string) => {
    if (!label.trim()) return;
    try { await addTask(roleId, label); } catch (err) { console.warn('[matrice] addTask:', err); setError("Échec de l'ajout de la tâche."); }
    reload();
  };
  const onRenameTask = async (taskId: string, label: string) => {
    try { await renameTask(taskId, label); } catch (err) { console.warn('[matrice] renameTask:', err); setError('Échec du renommage.'); }
    reload();
  };
  const onDeleteTask = async (taskId: string) => {
    try { await deleteTask(taskId); } catch (err) { console.warn('[matrice] deleteTask:', err); setError('Échec de la suppression de la tâche.'); }
    reload();
  };
  const onChangeHolder = async (roleId: string, holder: string) => {
    try { await updateRoleHolder(roleId, holder); } catch (err) { console.warn('[matrice] updateRoleHolder:', err); setError('Échec de la mise à jour du titulaire.'); }
    reload();
  };
  const onDeleteRole = async (roleId: string) => {
    if (!confirm('Supprimer ce rôle et toutes ses tâches ?')) return;
    try { await deleteRole(roleId); } catch (err) { console.warn('[matrice] deleteRole:', err); setError('Échec de la suppression du rôle.'); }
    reload();
  };
  const onAddRole = async (data: Omit<MatriceRole, 'id'>) => {
    try { await addRole(data); setShowAddRole(false); } catch (err) { console.warn('[matrice] addRole:', err); setError('Échec de la création du rôle.'); }
    reload();
  };
  const onMoveTask = async (taskId: string, toRoleId: string, toIndex?: number) => {
    try { await moveTask(taskId, toRoleId, toIndex); } catch (err) { console.warn('[matrice] moveTask:', err); setError('Échec du déplacement de la tâche.'); }
    reload();
  };

  const exportCsv = () => {
    const rows = tasks.map((t) => {
      const r = roles.find((x) => x.id === t.roleId);
      return { role: r?.title || '?', code: r?.code || '', holder: r?.holder || '', tache: t.label };
    });
    downloadCsv('fmm-matrice-roles.csv', rows);
  };

  const totals = {
    roles: roles.length,
    tasks: tasks.length,
    open: roles.filter((r) => r.holder === 'TBD').length,
    deps: computeDependencies().length,
  };

  return (
    <div className="space-y-5">
      {!devBypass && (
        <Card className="p-5 border border-blue-300/30 bg-blue-300/5">
          <p className="font-editorial italic text-sm text-ivory-soft">
            La matrice persiste dans <code className="text-brass">matriceRoles/</code> et <code className="text-brass">matriceTasks/</code>. Les liens de dépendance sont calculés depuis la grille RACI du briefing.
          </p>
        </Card>
      )}

      {error && (
        <Card className="p-4 border border-blush/40 bg-blush/8">
          <p className="font-sans text-xs text-blush">{error}</p>
        </Card>
      )}

      {/* Header — counts, view toggle, actions */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-editorial italic text-sm text-ivory-soft">
            <span className="text-brass tabular-nums font-medium">{totals.roles}</span> rôles ·
            <span className="text-brass tabular-nums font-medium ml-1">{totals.tasks}</span> tâches ·
            <span className="text-brass tabular-nums font-medium ml-1">{totals.deps}</span> dépendances ·
            {totals.open > 0
              ? <span className="text-blush ml-1"><span className="tabular-nums font-medium">{totals.open}</span> à pourvoir</span>
              : <span className="text-emerald-400 ml-1">tous pourvus</span>}
          </p>
          <p className="font-editorial italic text-xs text-ivory-soft/60 mt-0.5">
            Survolez une tuile pour voir ses dépendances · cliquez pour gérer ses tâches.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex gap-1 p-1 bg-midnight-deep/60 border border-ivory-soft/15 rounded-card">
            {([
              ['overview', "Vue d'ensemble", LayoutGrid],
              ['kanban',   'Kanban',         KanbanSquare],
              ['people',   'Personnes',      UsersRound],
            ] as const).map(([k, label, Icon]) => (
              <button key={k} onClick={() => setView(k)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-sans uppercase tracking-wider text-[11px] font-semibold rounded-card transition ${view === k ? 'bg-brass text-midnight-deep' : 'text-ivory-soft hover:text-ivory'}`}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche…"
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-xs font-sans" />
          {([
            ['all',    'Tous'],
            ['master', 'Masters'],
            ['lead',   'Leads'],
            ['coord',  'Coordo'],
          ] as const).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition ${filter === k ? 'bg-brass text-midnight-deep' : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'}`}>
              {label}
            </button>
          ))}
          <GhostButton onClick={() => setShowAddRole(true)}><Plus size={12} /> Rôle</GhostButton>
          <GhostButton onClick={exportCsv}><Download size={12} /> CSV</GhostButton>
        </div>
      </div>

      {showAddRole && (
        <AddRoleForm onSubmit={onAddRole} onCancel={() => setShowAddRole(false)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
        </div>
      ) : visibleRoles.length === 0 ? (
        <Card><EmptyState icon={Users}>Aucun rôle ne correspond.</EmptyState></Card>
      ) : view === 'overview' ? (
        <OverviewBoard
          roles={visibleRoles}
          tasksByRole={tasksByRole}
          allRoles={roles}
          onAddTask={onAddTask}
          onRenameTask={onRenameTask}
          onDeleteTask={onDeleteTask}
          onChangeHolder={onChangeHolder}
          onDeleteRole={onDeleteRole}
          onMoveTask={onMoveTask}
        />
      ) : view === 'kanban' ? (
        <KanbanBoard
          roles={visibleRoles}
          tasksByRole={tasksByRole}
          allRoles={roles}
          onAddTask={onAddTask}
          onRenameTask={onRenameTask}
          onDeleteTask={onDeleteTask}
          onChangeHolder={onChangeHolder}
          onDeleteRole={onDeleteRole}
          onMoveTask={onMoveTask}
        />
      ) : (
        <PeopleBoard roles={visibleRoles} tasksByRole={tasksByRole} />
      )}
    </div>
  );
};

// ─── OVERVIEW BOARD ─────────────────────────────────────────────────
// Dense grid of role tiles. Hover one → SVG curves drawn to its top-N
// dependencies + dependent tiles ring-glow. Click one → expands an
// inline editor strip beneath the tile's row.

interface BoardProps {
  roles: MatriceRole[];
  tasksByRole: Map<string, MatriceTask[]>;
  allRoles: MatriceRole[];
  onAddTask: (roleId: string) => (label: string) => Promise<void> | void;
  onRenameTask: (taskId: string, label: string) => void;
  onDeleteTask: (taskId: string) => void;
  onChangeHolder: (roleId: string, holder: string) => void;
  onDeleteRole: (roleId: string) => void;
  onMoveTask: (taskId: string, toRoleId: string, toIndex?: number) => void;
}

const OverviewBoard: React.FC<BoardProps> = ({
  roles, tasksByRole, allRoles, onAddTask, onRenameTask, onDeleteTask, onChangeHolder, onDeleteRole, onMoveTask,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());
  const [hovered, setHovered] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [edges, setEdges] = useState<Array<{ from: string; to: string; strength: number; d: string }>>([]);

  // Recompute edge SVG paths for the hovered role's top deps.
  const computeEdges = () => {
    const cont = containerRef.current;
    if (!cont || !hovered) { setEdges([]); return; }
    const deps = topDependenciesFor(hovered, 5);
    const fromEl = tileRefs.current.get(hovered);
    if (!fromEl) return;
    const cRect = cont.getBoundingClientRect();
    const fr = fromEl.getBoundingClientRect();
    const fx = fr.left + fr.width / 2 - cRect.left;
    const fy = fr.top  + fr.height / 2 - cRect.top;

    const next: typeof edges = [];
    for (const d of deps) {
      const toEl = tileRefs.current.get(d.otherId);
      if (!toEl) continue;
      const tr = toEl.getBoundingClientRect();
      const tx = tr.left + tr.width / 2 - cRect.left;
      const ty = tr.top  + tr.height / 2 - cRect.top;
      // Cubic bezier — control points biased toward the midpoint with a
      // soft outward arc so lines don't all pile up on direct lines.
      const mx = (fx + tx) / 2;
      const my = (fy + ty) / 2;
      const offsetX = (ty - fy) * 0.18;
      const offsetY = (fx - tx) * 0.18;
      const cp1x = (fx + mx) / 2 + offsetX;
      const cp1y = (fy + my) / 2 + offsetY;
      const cp2x = (mx + tx) / 2 + offsetX;
      const cp2y = (my + ty) / 2 + offsetY;
      const path = `M ${fx} ${fy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;
      next.push({ from: hovered, to: d.otherId, strength: d.weight, d: path });
    }
    setEdges(next);
  };

  useLayoutEffect(() => { computeEdges(); }, [hovered, roles, expanded]);
  useEffect(() => {
    const onResize = () => computeEdges();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);

  const depTargets = useMemo(() => new Set(edges.map((e) => e.to)), [edges]);

  return (
    <div ref={containerRef} className="relative">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {roles.map((r) => {
          const isHovered = hovered === r.id;
          const isDepOf  = depTargets.has(r.id);
          const isExpanded = expanded === r.id;
          const taskCount = (tasksByRole.get(r.id) || []).length;
          const Icon = CAT_ICON[r.category];
          const tbd = r.holder === 'TBD' || r.holder === '' || r.holder.toLowerCase() === 'tbd';
          const ringCls = isHovered ? `ring-2 ${CAT_TONE_RING[r.category]}` : isDepOf ? 'ring-2 ring-brass/40' : '';

          return (
            <React.Fragment key={r.id}>
              <button
                ref={(el) => { if (el) tileRefs.current.set(r.id, el); else tileRefs.current.delete(r.id); }}
                onMouseEnter={() => setHovered(r.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setExpanded(isExpanded ? null : r.id)}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData('text/plain');
                  if (taskId) onMoveTask(taskId, r.id);
                }}
                className={`group relative text-left rounded-card border ${CAT_TONE[r.category]} p-4 transition hover:bg-brass/10 hover:scale-[1.01] active:scale-[0.99] ${ringCls} ${isExpanded ? 'ring-2 ring-brass' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon size={12} className="text-brass shrink-0" />
                    <span className="font-display title-medieval text-[10px] tracking-widest text-brass uppercase truncate">
                      {CAT_LABEL[r.category]}{r.code !== 'Lead' ? ` · ${r.code}` : ''}
                    </span>
                  </div>
                  {isExpanded
                    ? <ChevronDown size={12} className="text-brass shrink-0" />
                    : <ChevronRight size={12} className="text-ivory-soft/40 shrink-0" />}
                </div>
                <h3 className="font-display title-medieval text-sm md:text-base text-ivory leading-tight mb-1.5 line-clamp-2 min-h-[2.4em]">
                  {r.title}
                </h3>
                <p className={`font-sans text-xs truncate ${tbd ? 'text-blush' : 'text-ivory-soft'}`}>
                  {r.holder}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-ivory-soft/10">
                  <span className="font-display title-medieval text-[10px] tracking-widest text-ivory-soft/70">
                    {taskCount} {taskCount === 1 ? 'tâche' : 'tâches'}
                  </span>
                  {isHovered && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-brass font-sans">
                      <Link2 size={10} /> {topDependenciesFor(r.id, 99).length}
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <RoleDetailDrawer
                  role={r}
                  tasks={tasksByRole.get(r.id) || []}
                  allRoles={allRoles}
                  onAddTask={onAddTask(r.id)}
                  onRenameTask={onRenameTask}
                  onDeleteTask={onDeleteTask}
                  onChangeHolder={(h) => onChangeHolder(r.id, h)}
                  onDeleteRole={() => onDeleteRole(r.id)}
                  onClose={() => setExpanded(null)}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* SVG dependency overlay — drawn ABOVE the grid (z-10) but with
          pointer-events:none so the tiles stay interactive. */}
      <svg
        className="pointer-events-none absolute inset-0 z-10"
        width="100%" height="100%"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker id="dep-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <circle cx="3" cy="3" r="2.2" fill="rgb(176 141 58)" />
          </marker>
        </defs>
        {edges.map((e) => {
          const opacity = Math.min(0.95, 0.35 + e.strength / 30);
          const width = 1 + Math.min(2.5, e.strength / 8);
          return (
            <path
              key={`${e.from}-${e.to}`}
              d={e.d}
              fill="none"
              stroke="rgb(176 141 58)"
              strokeWidth={width}
              strokeOpacity={opacity}
              strokeLinecap="round"
              markerEnd="url(#dep-arrow)"
              markerStart="url(#dep-arrow)"
            />
          );
        })}
      </svg>
    </div>
  );
};

// Role detail drawer — appears under a tile, full-row span.
const RoleDetailDrawer: React.FC<{
  role: MatriceRole;
  tasks: MatriceTask[];
  allRoles: MatriceRole[];
  onAddTask: (label: string) => Promise<void> | void;
  onRenameTask: (taskId: string, label: string) => void;
  onDeleteTask: (taskId: string) => void;
  onChangeHolder: (holder: string) => void;
  onDeleteRole: () => void;
  onClose: () => void;
}> = ({ role, tasks, allRoles, onAddTask, onRenameTask, onDeleteTask, onChangeHolder, onDeleteRole, onClose }) => {
  const [editingHolder, setEditingHolder] = useState(false);
  const [holderDraft, setHolderDraft] = useState(role.holder);
  const [showAddInput, setShowAddInput] = useState(false);
  const [taskDraft, setTaskDraft] = useState('');
  const deps = topDependenciesFor(role.id, 99);

  return (
    <div className="col-span-2 sm:col-span-3 lg:col-span-4 glass-light rounded-card p-5 md:p-6 -mt-1">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
            Détails du rôle
          </p>
          <h3 className="font-display title-medieval text-lg text-ivory">{role.title}</h3>
          {role.mission && (
            <p className="font-editorial italic text-sm text-ivory-soft mt-1.5 leading-snug">
              {role.mission}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onDeleteRole} title="Supprimer le rôle"
            className="text-ivory-soft/60 hover:text-blush transition"><Trash2 size={14} /></button>
          <button onClick={onClose} title="Fermer"
            className="text-ivory-soft/60 hover:text-ivory transition"><X size={14} /></button>
        </div>
      </div>

      {role.note && (
        <div className="mb-4 px-3 py-2 rounded-card border border-blush/30 bg-blush/8">
          <p className="font-sans text-xs text-blush leading-snug">{role.note}</p>
        </div>
      )}

      <div className="grid md:grid-cols-12 gap-4">
        {/* Holder + dependencies */}
        <div className="md:col-span-4">
          <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1.5">Titulaire</p>
          {editingHolder ? (
            <div className="flex items-center gap-1.5 mb-4">
              <input autoFocus value={holderDraft} onChange={(e) => setHolderDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { onChangeHolder(holderDraft); setEditingHolder(false); } if (e.key === 'Escape') setEditingHolder(false); }}
                onBlur={() => { onChangeHolder(holderDraft); setEditingHolder(false); }}
                className="flex-1 px-2 py-1 rounded-card border border-brass/40 bg-midnight-deep/60 text-ivory text-sm font-sans focus:outline-none" />
              <button onClick={() => { onChangeHolder(holderDraft); setEditingHolder(false); }}
                className="text-brass hover:text-brass-soft"><Check size={14} /></button>
            </div>
          ) : (
            <button onClick={() => { setHolderDraft(role.holder); setEditingHolder(true); }}
              className="group/h w-full text-left flex items-center gap-1.5 mb-4 font-sans text-base text-ivory hover:text-brass transition">
              <span className={role.holder === 'TBD' ? 'text-blush' : ''}>{role.holder}</span>
              <Pencil size={11} className="opacity-0 group-hover/h:opacity-100 transition" />
            </button>
          )}

          <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Link2 size={11} /> Dépendances ({deps.length})
          </p>
          {deps.length === 0 ? (
            <p className="font-editorial italic text-xs text-ivory-soft/60">Aucune dépendance calculée.</p>
          ) : (
            <ul className="space-y-1.5">
              {deps.slice(0, 6).map((d) => {
                const otherRole = allRoles.find((r) => r.id === d.otherId);
                if (!otherRole) return null;
                return (
                  <li key={d.otherId} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-sans text-ivory truncate">{otherRole.title}</span>
                    <span className="font-display title-medieval text-brass tabular-nums shrink-0" title={d.shared.join(', ')}>
                      {d.weight}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Tasks */}
        <div className="md:col-span-8">
          <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-2">
            Tâches ({tasks.length})
          </p>
          <ol className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {tasks.map((t) => (
              <DrawerTaskRow key={t.id} task={t} onRename={onRenameTask} onDelete={onDeleteTask} />
            ))}
            {tasks.length === 0 && (
              <li className="font-editorial italic text-xs text-ivory-soft/60">Aucune tâche pour ce rôle.</li>
            )}
          </ol>

          {showAddInput ? (
            <form onSubmit={(e) => { e.preventDefault(); onAddTask(taskDraft); setTaskDraft(''); setShowAddInput(false); }}
              className="flex gap-2 mt-3">
              <input autoFocus value={taskDraft} onChange={(e) => setTaskDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setShowAddInput(false); }}
                placeholder="Décrire la tâche…"
                className="flex-1 px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/60 text-ivory text-sm font-sans focus:border-brass focus:outline-none" />
              <button type="submit" disabled={!taskDraft.trim()}
                className="px-3 py-1.5 bg-brass text-midnight-deep font-sans text-xs uppercase tracking-wider font-semibold rounded-card hover:bg-brass-soft disabled:opacity-50 transition">
                Ajouter
              </button>
            </form>
          ) : (
            <button onClick={() => setShowAddInput(true)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-ivory-soft/20 hover:border-brass hover:text-brass text-ivory-soft text-xs font-sans uppercase tracking-wider rounded-card transition">
              <Plus size={11} /> Ajouter une tâche
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const DrawerTaskRow: React.FC<{
  task: MatriceTask;
  onRename: (taskId: string, label: string) => void;
  onDelete: (taskId: string) => void;
}> = ({ task, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.label);
  return (
    <li
      draggable={!editing}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', task.id); e.dataTransfer.effectAllowed = 'move'; }}
      className="group/row flex items-start gap-2 px-2 py-1.5 rounded-card hover:bg-brass/8 cursor-grab active:cursor-grabbing"
    >
      <GripVertical size={12} className="text-ivory-soft/40 shrink-0 mt-0.5" />
      {editing ? (
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { onRename(task.id, draft); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
          onBlur={() => { onRename(task.id, draft); setEditing(false); }}
          className="flex-1 bg-midnight-deep border border-brass/40 rounded-card px-2 py-0.5 text-sm font-sans text-ivory focus:outline-none" />
      ) : (
        <span className="flex-1 text-sm font-sans text-ivory leading-snug">{task.label}</span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition">
        <button onClick={() => setEditing(true)} title="Renommer"
          className="text-ivory-soft/60 hover:text-brass"><Pencil size={11} /></button>
        <button onClick={() => onDelete(task.id)} title="Supprimer"
          className="text-ivory-soft/60 hover:text-blush"><X size={11} /></button>
      </div>
    </li>
  );
};

// ─── KANBAN BOARD (existing view, now extracted) ───────────────────
const KanbanBoard: React.FC<BoardProps> = ({ roles, tasksByRole, onAddTask, onRenameTask, onDeleteTask, onChangeHolder, onDeleteRole, onMoveTask }) => {
  const [dragOverRoleId, setDragOverRoleId] = useState<string | null>(null);

  const onDragOverCol = (roleId: string) => (e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    if (dragOverRoleId !== roleId) setDragOverRoleId(roleId);
  };
  const onDropCol = (toRoleId: string) => async (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    setDragOverRoleId(null);
    if (!taskId) return;
    onMoveTask(taskId, toRoleId);
  };

  return (
    <div className="overflow-x-auto -mx-4 md:-mx-8 pb-4">
      <div className="flex gap-3 px-4 md:px-8 min-w-min">
        {roles.map((role) => (
          <RoleColumn
            key={role.id}
            role={role}
            tasks={tasksByRole.get(role.id) || []}
            isDragOver={dragOverRoleId === role.id}
            onDragOver={onDragOverCol(role.id)}
            onDrop={onDropCol(role.id)}
            onAddTask={onAddTask(role.id)}
            onRenameTask={onRenameTask}
            onDeleteTask={onDeleteTask}
            onChangeHolder={(h) => onChangeHolder(role.id, h)}
            onDeleteRole={() => onDeleteRole(role.id)}
          />
        ))}
      </div>
    </div>
  );
};

// ─── KANBAN COLUMN ──────────────────────────────────────────────────
// Drop targets only — task drag-start lives inside DrawerTaskRow.
interface ColumnProps {
  role: MatriceRole;
  tasks: MatriceTask[];
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onAddTask: (label: string) => Promise<void> | void;
  onRenameTask: (taskId: string, label: string) => void;
  onDeleteTask: (taskId: string) => void;
  onChangeHolder: (holder: string) => void;
  onDeleteRole: () => void;
}

const RoleColumn: React.FC<ColumnProps> = ({
  role, tasks, isDragOver, onDragOver, onDrop,
  onAddTask, onRenameTask, onDeleteTask, onChangeHolder, onDeleteRole,
}) => {
  const Icon = CAT_ICON[role.category];
  const [editingHolder, setEditingHolder] = useState(false);
  const [holderDraft, setHolderDraft]     = useState(role.holder);
  const [showAddInput, setShowAddInput]   = useState(false);
  const [taskDraft, setTaskDraft]         = useState('');
  const onHolderSave = () => { onChangeHolder(holderDraft); setEditingHolder(false); };
  const tbd = role.holder === 'TBD' || role.holder === '' || role.holder.toLowerCase() === 'tbd';

  return (
    <div onDragOver={onDragOver} onDrop={onDrop}
      className={`shrink-0 w-[320px] rounded-card border ${CAT_TONE[role.category]} flex flex-col transition ${isDragOver ? 'ring-2 ring-brass scale-[1.01]' : ''}`}>
      <header className="px-4 pt-4 pb-3 border-b border-ivory-soft/10">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={14} className="text-brass shrink-0" />
            <span className="font-display title-medieval text-[10px] tracking-widest text-brass uppercase">
              {CAT_LABEL[role.category]}{role.code !== 'Lead' ? ` · ${role.code}` : ''}
            </span>
          </div>
          <button onClick={onDeleteRole} title="Supprimer le rôle" className="text-ivory-soft/40 hover:text-blush transition">
            <Trash2 size={12} />
          </button>
        </div>
        <h3 className="font-display title-medieval text-base text-ivory leading-tight mb-2">{role.title}</h3>
        {editingHolder ? (
          <div className="flex items-center gap-1.5">
            <input autoFocus type="text" value={holderDraft} onChange={(e) => setHolderDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onHolderSave(); if (e.key === 'Escape') { setEditingHolder(false); setHolderDraft(role.holder); } }}
              onBlur={onHolderSave} placeholder="TBD"
              className="flex-1 px-2 py-1 rounded-card border border-brass/40 bg-midnight-deep/60 text-ivory text-sm font-sans focus:outline-none" />
            <button onClick={onHolderSave} className="text-brass hover:text-brass-soft"><Check size={14} /></button>
          </div>
        ) : (
          <button onClick={() => { setHolderDraft(role.holder); setEditingHolder(true); }}
            className={`group/holder w-full text-left flex items-center gap-1.5 font-sans text-sm transition ${tbd ? 'text-blush' : 'text-ivory'} hover:text-brass`}>
            <span className="truncate">{role.holder}</span>
            <Pencil size={11} className="opacity-0 group-hover/holder:opacity-100 transition shrink-0" />
          </button>
        )}
      </header>
      <ol className="flex-1 px-3 py-3 space-y-2 min-h-[120px]">
        {tasks.length === 0 ? (
          <li className="text-center font-editorial italic text-xs text-ivory-soft/40 py-6">Glissez une tâche ici</li>
        ) : tasks.map((t) => (
          <DrawerTaskRow key={t.id} task={t} onRename={onRenameTask} onDelete={onDeleteTask} />
        ))}
      </ol>
      <footer className="px-3 pb-3">
        {showAddInput ? (
          <form onSubmit={(e) => { e.preventDefault(); onAddTask(taskDraft); setTaskDraft(''); setShowAddInput(false); }} className="flex flex-col gap-2">
            <textarea autoFocus rows={2} value={taskDraft} onChange={(e) => setTaskDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setShowAddInput(false); setTaskDraft(''); } }}
              placeholder="Décrire la tâche…"
              className="w-full px-3 py-2 rounded-card border border-ivory-soft/20 bg-midnight-deep/60 text-ivory text-sm font-sans focus:border-brass focus:outline-none resize-y" />
            <div className="flex items-center gap-2">
              <button type="submit" disabled={!taskDraft.trim()}
                className="px-3 py-1.5 bg-brass text-midnight-deep font-sans text-xs uppercase tracking-wider font-semibold rounded-card hover:bg-brass-soft disabled:opacity-50 transition">
                Ajouter
              </button>
              <button type="button" onClick={() => { setShowAddInput(false); setTaskDraft(''); }}
                className="px-3 py-1.5 text-ivory-soft hover:text-ivory text-xs font-sans">Annuler</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddInput(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-ivory-soft/20 hover:border-brass hover:text-brass text-ivory-soft text-xs font-sans uppercase tracking-wider rounded-card transition">
            <Plus size={12} /> Ajouter une tâche
          </button>
        )}
      </footer>
    </div>
  );
};

// ─── PEOPLE BOARD ───────────────────────────────────────────────────
// Aggregates the (filtered) roles by holder. Each card links to a
// dedicated profile page at /admin/personne/:slug.
const PeopleBoard: React.FC<{
  roles: MatriceRole[];
  tasksByRole: Map<string, MatriceTask[]>;
}> = ({ roles, tasksByRole }) => {
  const people = useMemo(() => listPeople(roles), [roles]);
  const taskCount = (p: PersonSummary) =>
    p.roles.reduce((s, r) => s + (tasksByRole.get(r.id)?.length || 0), 0);

  if (people.length === 0) {
    return <Card><EmptyState icon={UsersRound}>Aucune personne ne correspond.</EmptyState></Card>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {people.map((p) => (
        <PersonCard key={p.slug} person={p} taskCount={taskCount(p)} />
      ))}
    </div>
  );
};

const PersonCard: React.FC<{ person: PersonSummary; taskCount: number }> = ({ person, taskCount }) => {
  const hue = hueFor(person.name);
  const initials = personInitials(person.name);
  const categories = Array.from(new Set(person.roles.map((r) => r.category)));
  const cardTone = person.isTBD ? 'border-blush/30 bg-blush/5' : 'border-ivory-soft/15 bg-ivory-soft/5';

  return (
    <Link to={`/admin/personne/${person.slug}`}
      className={`group relative flex flex-col rounded-card border ${cardTone} overflow-hidden hover:border-brass/50 hover:bg-brass/5 hover:scale-[1.01] active:scale-[0.99] transition`}>
      {/* Banner */}
      <div className="h-16 relative overflow-hidden"
        style={{
          background: person.isTBD
            ? 'linear-gradient(135deg, rgba(216,123,142,0.4), rgba(216,123,142,0.15))'
            : `linear-gradient(135deg, hsl(${hue} 40% 28%), hsl(${(hue + 30) % 360} 30% 18%))`,
        }}>
        <div className="absolute inset-0 grain pointer-events-none opacity-60" />
      </div>
      {/* Avatar */}
      <div className="px-4 pb-4 -mt-7">
        <div className={`w-14 h-14 rounded-full border-4 border-midnight-deep flex items-center justify-center font-display title-medieval text-lg shadow-lg ${person.isTBD ? 'bg-blush/30 text-blush' : ''}`}
          style={person.isTBD ? undefined : { backgroundColor: `hsl(${hue} 30% 22%)`, color: `hsl(${hue} 60% 70%)` }}>
          {person.isTBD ? <AlertTriangle size={20} /> : initials}
        </div>
        <h3 className={`font-display title-medieval text-base leading-tight mt-2.5 ${person.isTBD ? 'text-blush' : 'text-ivory'} truncate`}>
          {person.name}
        </h3>
        <p className="font-editorial italic text-[11px] text-ivory-soft/70 mt-0.5">
          {person.roles.length} rôle{person.roles.length > 1 ? 's' : ''} · {taskCount} tâche{taskCount > 1 ? 's' : ''}
        </p>

        <div className="flex flex-wrap gap-1 mt-2.5">
          {person.roles.slice(0, 4).map((r) => (
            <span key={r.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-card border ${CAT_TONE[r.category]} text-[10px] uppercase tracking-widest text-ivory-soft`}
              title={r.title}>
              <span className="text-brass">{CAT_LABEL[r.category][0]}</span>
              <span className="truncate max-w-[10rem]">{r.code === 'Lead' ? r.title.replace(/^Lead\s*/i, '') : r.code}</span>
            </span>
          ))}
          {person.roles.length > 4 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-card border border-ivory-soft/15 text-[10px] uppercase tracking-widest text-ivory-soft">
              +{person.roles.length - 4}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-ivory-soft/10">
          <span className="font-editorial italic text-[11px] text-ivory-soft/60">
            {categories.map((c) => CAT_LABEL[c]).join(' · ')}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[11px] uppercase tracking-widest text-ivory-soft/40 group-hover:text-brass transition">
            Profil <ChevronRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  );
};

function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}
function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Add Role inline form ───────────────────────────────────────────
const AddRoleForm: React.FC<{
  onSubmit: (data: Omit<MatriceRole, 'id'>) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [title, setTitle]       = useState('');
  const [code, setCode]         = useState('');
  const [holder, setHolder]     = useState('TBD');
  const [category, setCategory] = useState<RoleCategory>('master');

  return (
    <Card className="p-5">
      <p className="font-display title-medieval text-xs text-brass uppercase tracking-widest mb-3">Ajouter un rôle</p>
      <form onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; onSubmit({ title: title.trim(), code: code.trim() || 'Lead', holder: holder.trim() || 'TBD', category }); }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Titre du rôle"
          className="px-3 py-2 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory text-sm font-sans focus:border-brass focus:outline-none" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (ex. MN, Lead)"
          className="px-3 py-2 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory text-sm font-sans focus:border-brass focus:outline-none" />
        <input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Personne (ou TBD)"
          className="px-3 py-2 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory text-sm font-sans focus:border-brass focus:outline-none" />
        <select value={category} onChange={(e) => setCategory(e.target.value as RoleCategory)}
          className="px-3 py-2 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory text-sm font-sans focus:border-brass focus:outline-none">
          <option value="master">Master</option>
          <option value="lead">Lead</option>
          <option value="coord">Coordo</option>
        </select>
        <div className="sm:col-span-2 lg:col-span-4 flex gap-2 justify-end mt-1">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-ivory-soft hover:text-ivory text-xs font-sans uppercase tracking-wider">Annuler</button>
          <button type="submit"
            className="px-4 py-2 bg-brass text-midnight-deep font-sans text-xs uppercase tracking-wider font-semibold rounded-card hover:bg-brass-soft transition">
            Créer le rôle
          </button>
        </div>
      </form>
    </Card>
  );
};

export default MatriceRolesSection;
