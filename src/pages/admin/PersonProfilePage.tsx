import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Crown, UserCog, Users, Link2, ChevronRight, Sparkles, AlertTriangle, ListChecks,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isFirebaseReady } from '../../firebase';
import SEO from '../../components/SEO';
import AdminShell from './AdminShell';
import { Card, EmptyState } from './primitives';
import {
  listMatriceRoles, listMatriceTasks, findPersonBySlug, topDependenciesFor, slugify,
  type MatriceRole, type MatriceTask, type RoleCategory, type PersonSummary,
} from '../../firebase/matrice';

const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;
const BYPASS_USER = { email: 'dev@local', displayName: 'Dev (bypass)', photoURL: null };

const CAT_ICON: Record<RoleCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  master: Crown, lead: UserCog, coord: Users,
};
const CAT_LABEL: Record<RoleCategory, string> = {
  master: 'Master', lead: 'Lead', coord: 'Coordo',
};
const CAT_TONE: Record<RoleCategory, string> = {
  master: 'border-brass/40 bg-brass/8',
  lead:   'border-blue-300/30 bg-blue-300/5',
  coord:  'border-blush/30 bg-blush/5',
};

// Deterministic hue per name → banner gradient color.
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

const PersonProfilePage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, loading, openSignIn, signOut } = useAuth();

  const [roles, setRoles] = useState<MatriceRole[]>([]);
  const [tasks, setTasks] = useState<MatriceTask[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([listMatriceRoles(), listMatriceTasks()]).then(([r, t]) => {
      setRoles(r); setTasks(t); setDataLoading(false);
    });
  }, []);

  const allRolesById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const person: PersonSummary | null = useMemo(() => findPersonBySlug(roles, slug), [roles, slug]);
  const personTasks = useMemo(() => {
    if (!person) return new Map<string, MatriceTask[]>();
    const m = new Map<string, MatriceTask[]>();
    for (const r of person.roles) m.set(r.id, []);
    for (const t of tasks) {
      if (m.has(t.roleId)) m.get(t.roleId)!.push(t);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.order - b.order);
    return m;
  }, [person, tasks]);

  // Dependencies across all roles held → unique other-role weights summed.
  const aggregatedDeps = useMemo(() => {
    if (!person) return [] as Array<{ otherId: string; weight: number; sharedAreas: string[]; viaRoles: string[] }>;
    const merged = new Map<string, { otherId: string; weight: number; sharedAreas: Set<string>; viaRoles: Set<string> }>();
    const ownIds = new Set(person.roles.map((r) => r.id));
    for (const r of person.roles) {
      const deps = topDependenciesFor(r.id, 99);
      for (const d of deps) {
        if (ownIds.has(d.otherId)) continue; // skip self-loops between own roles
        const ex = merged.get(d.otherId);
        if (ex) {
          ex.weight += d.weight;
          d.shared.forEach((s) => ex.sharedAreas.add(s));
          ex.viaRoles.add(r.id);
        } else {
          merged.set(d.otherId, {
            otherId: d.otherId,
            weight: d.weight,
            sharedAreas: new Set(d.shared),
            viaRoles: new Set([r.id]),
          });
        }
      }
    }
    return Array.from(merged.values())
      .map((m) => ({
        otherId: m.otherId,
        weight: m.weight,
        sharedAreas: Array.from(m.sharedAreas),
        viaRoles: Array.from(m.viaRoles),
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [person]);

  // ─── Auth gate (mirrors AdminPage) ─────────────────────────────
  if (DEV_BYPASS) {
    return (
      <>
        <SEO title={`Profil · ${person?.name || 'Personne'}`} />
        <AdminShell user={BYPASS_USER} section="matrice"
          onSectionChange={(s) => navigate('/admin', { state: { section: s } })}
          onSignOut={signOut} devBanner>
          <Body person={person} loading={dataLoading} personTasks={personTasks}
            allRolesById={allRolesById} aggregatedDeps={aggregatedDeps}
            onOpenPerson={(s) => navigate(`/admin/personne/${s}`)} />
        </AdminShell>
      </>
    );
  }
  if (!isFirebaseReady) return <NotConfigured />;
  if (loading) return <PageSpinner />;
  if (!user) return <SignInPrompt onSignIn={openSignIn} />;
  if (!isAdmin) return <Forbidden onSignOut={signOut} />;

  return (
    <>
      <SEO title={`Profil · ${person?.name || 'Personne'}`} />
      <AdminShell user={user} section="matrice"
        onSectionChange={(s) => navigate('/admin', { state: { section: s } })}
        onSignOut={signOut}>
        <Body person={person} loading={dataLoading} personTasks={personTasks}
          allRolesById={allRolesById} aggregatedDeps={aggregatedDeps}
          onOpenPerson={(s) => navigate(`/admin/personne/${s}`)} />
      </AdminShell>
    </>
  );
};

// ─── Body ──────────────────────────────────────────────────────────
const Body: React.FC<{
  person: PersonSummary | null;
  loading: boolean;
  personTasks: Map<string, MatriceTask[]>;
  allRolesById: Map<string, MatriceRole>;
  aggregatedDeps: Array<{ otherId: string; weight: number; sharedAreas: string[]; viaRoles: string[] }>;
  onOpenPerson: (slug: string) => void;
}> = ({ person, loading, personTasks, allRolesById, aggregatedDeps, onOpenPerson }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </div>
    );
  }
  if (!person) {
    return (
      <Card>
        <EmptyState icon={Users}>
          Personne introuvable. <Link to="/admin" className="text-brass underline">Retour au tableau de bord</Link>.
        </EmptyState>
      </Card>
    );
  }

  const hue = hueFor(person.name);
  const totalTasks = Array.from(personTasks.values()).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="-m-4 md:-m-8">
      {/* Banner */}
      <div className="relative h-44 md:h-56 overflow-hidden"
        style={{
          background:
            `linear-gradient(135deg, hsl(${hue} 35% 22%), hsl(${(hue + 40) % 360} 28% 14%) 70%, var(--color-midnight-deep))`,
        }}>
        <div className="absolute inset-0 brume opacity-30 mix-blend-screen pointer-events-none" />
        <div className="absolute inset-0 grain pointer-events-none" />
        <Link to="/admin"
          className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-midnight-deep/50 backdrop-blur border border-ivory-soft/15 text-ivory-soft hover:text-brass hover:border-brass transition font-sans text-xs uppercase tracking-widest">
          <ArrowLeft size={12} /> Tableau de bord
        </Link>
      </div>

      {/* Header card */}
      <div className="px-4 md:px-8 -mt-16 md:-mt-20 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-5 md:gap-7 items-start">
          {/* Avatar */}
          <div className={`w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-midnight-deep shadow-2xl flex items-center justify-center font-display title-medieval text-3xl md:text-4xl ${person.isTBD ? 'bg-blush/20 text-blush' : 'bg-brass/15 text-brass'}`}
            style={person.isTBD ? undefined : { backgroundColor: `hsl(${hue} 30% 18%)`, color: `hsl(${hue} 60% 70%)` }}>
            {person.isTBD ? <AlertTriangle size={36} /> : initials(person.name)}
          </div>

          <div className="flex-1 min-w-0 pt-2 md:pt-12">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
              {person.isTBD ? 'Vacance' : 'Profil de l’équipe'}
            </p>
            <h1 className="font-display title-medieval text-3xl md:text-4xl text-ivory leading-tight">
              {person.name}
            </h1>
            <p className="font-editorial italic text-ivory-soft mt-2 leading-relaxed">
              {person.roles.length === 1
                ? `${describeRole(person.roles[0])}.`
                : `Porte ${person.roles.length} rôles · ${totalTasks} tâche${totalTasks > 1 ? 's' : ''} actives`}
            </p>

            <div className="flex items-center flex-wrap gap-2 mt-4">
              {person.roles.map((r) => {
                const Icon = CAT_ICON[r.category];
                return (
                  <span key={r.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card border ${CAT_TONE[r.category]} text-ivory-soft font-sans text-xs uppercase tracking-widest`}>
                    <Icon size={11} className="text-brass" />
                    <span className="text-ivory">{r.title}</span>
                    {r.code !== 'Lead' && <span className="text-brass/70">· {r.code}</span>}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="px-4 md:px-8 mt-8 md:mt-10 pb-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6">
          {/* Left — roles + tasks */}
          <div className="lg:col-span-8 space-y-5">
            {person.roles.map((r) => {
              const Icon = CAT_ICON[r.category];
              const ts = personTasks.get(r.id) || [];
              return (
                <Card key={r.id} className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-display title-medieval text-[10px] tracking-widest text-brass uppercase flex items-center gap-1.5">
                        <Icon size={11} /> {CAT_LABEL[r.category]}{r.code !== 'Lead' ? ` · ${r.code}` : ''}
                      </p>
                      <h2 className="font-display title-medieval text-xl text-ivory leading-tight mt-0.5">{r.title}</h2>
                      {r.mission && (
                        <p className="font-editorial italic text-sm text-ivory-soft mt-2 leading-snug">
                          {r.mission}
                        </p>
                      )}
                    </div>
                    <Link to="/admin"
                      state={{ section: 'matrice', focusRole: r.id }}
                      className="shrink-0 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ivory-soft hover:text-brass transition font-sans">
                      Voir la fiche <ChevronRight size={11} />
                    </Link>
                  </div>

                  {r.note && (
                    <div className="mb-3 px-3 py-2 rounded-card border border-blush/30 bg-blush/8">
                      <p className="font-sans text-xs text-blush leading-snug">{r.note}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <ListChecks size={12} className="text-brass" />
                    <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">
                      Tâches ({ts.length})
                    </p>
                  </div>
                  {ts.length === 0 ? (
                    <p className="font-editorial italic text-xs text-ivory-soft/60">Aucune tâche définie pour ce rôle.</p>
                  ) : (
                    <ol className="space-y-1.5">
                      {ts.map((t) => (
                        <li key={t.id} className="flex items-start gap-2 px-3 py-1.5 rounded-card hover:bg-brass/5">
                          <span className="text-brass/40 font-display title-medieval text-[10px] tabular-nums shrink-0 mt-1">
                            {String(t.order + 1).padStart(2, '0')}
                          </span>
                          <span className="text-sm font-sans text-ivory leading-snug">{t.label}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Right — dependencies + meta */}
          <aside className="lg:col-span-4 space-y-5">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-brass" />
                <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">À propos</p>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ivory-soft font-sans">Rôles assumés</dt>
                  <dd className="text-ivory tabular-nums font-medium">{person.roles.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ivory-soft font-sans">Tâches assignées</dt>
                  <dd className="text-ivory tabular-nums font-medium">{totalTasks}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ivory-soft font-sans">Réseau</dt>
                  <dd className="text-ivory tabular-nums font-medium">{aggregatedDeps.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ivory-soft font-sans">Catégories</dt>
                  <dd className="text-ivory font-medium">
                    {Array.from(new Set(person.roles.map((r) => CAT_LABEL[r.category]))).join(' · ')}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Link2 size={13} className="text-brass" />
                <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">
                  Réseau de dépendances
                </p>
              </div>
              {aggregatedDeps.length === 0 ? (
                <p className="font-editorial italic text-xs text-ivory-soft/60">
                  Aucune dépendance calculée à partir des rôles assumés.
                </p>
              ) : (
                <ul className="space-y-2">
                  {aggregatedDeps.slice(0, 12).map((d) => {
                    const other = allRolesById.get(d.otherId);
                    if (!other) return null;
                    const otherSlug = other.holder && other.holder.toLowerCase() !== 'tbd'
                      ? slugify(other.holder)
                      : '__tbd__';
                    return (
                      <li key={d.otherId}>
                        <button onClick={() => onOpenPerson(otherSlug)}
                          className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-card border border-ivory-soft/10 hover:border-brass/40 hover:bg-brass/5 transition group">
                          <div className="min-w-0">
                            <p className="font-sans text-sm text-ivory truncate">{other.title}</p>
                            <p className="font-editorial italic text-[11px] text-ivory-soft/60 truncate">
                              {other.holder} · partagé via {d.sharedAreas.slice(0, 2).join(', ')}{d.sharedAreas.length > 2 ? '…' : ''}
                            </p>
                          </div>
                          <span className="font-display title-medieval text-brass tabular-nums shrink-0 group-hover:text-brass-soft" title={d.sharedAreas.join(', ')}>
                            {d.weight}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
};

function describeRole(r: MatriceRole): string {
  return `${CAT_LABEL[r.category]} · ${r.title}`;
}

// ─── Auth gates (mirror AdminPage) ─────────────────────────────────
const NotConfigured: React.FC = () => (
  <main className="min-h-screen bg-midnight-deep text-ivory flex items-center justify-center px-6">
    <div className="max-w-md text-center glass-light rounded-lg-card p-8">
      <h1 className="font-display title-medieval text-3xl text-brass mb-4">Admin</h1>
      <p className="font-editorial text-ivory-soft mb-4">
        Firebase n’est pas configuré. Ajoutez les valeurs <code className="text-brass">VITE_FIREBASE_*</code> dans <code className="text-brass">.env.local</code> puis redémarrez.
      </p>
    </div>
  </main>
);
const PageSpinner: React.FC = () => (
  <main className="min-h-screen bg-midnight-deep flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
  </main>
);
const SignInPrompt: React.FC<{ onSignIn: () => void }> = ({ onSignIn }) => (
  <main className="min-h-screen bg-midnight-deep text-ivory flex items-center justify-center px-6">
    <div className="w-full max-w-sm glass-light rounded-lg-card p-8 text-center">
      <h1 className="font-display title-medieval text-2xl text-ivory mb-2">Admin</h1>
      <p className="font-editorial italic text-stone text-sm mb-6">Connectez-vous pour accéder au profil.</p>
      <button onClick={onSignIn}
        className="w-full px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
        Se connecter
      </button>
    </div>
  </main>
);
const Forbidden: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => (
  <main className="min-h-screen bg-midnight-deep text-ivory flex items-center justify-center px-6">
    <div className="max-w-md text-center glass-light rounded-lg-card p-10">
      <h1 className="font-display title-medieval text-2xl text-ivory mb-3">Accès refusé</h1>
      <p className="font-editorial text-ivory-soft mb-6">Cette adresse n’est pas autorisée.</p>
      <button onClick={onSignOut}
        className="px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
        Se déconnecter
      </button>
    </div>
  </main>
);

export default PersonProfilePage;
