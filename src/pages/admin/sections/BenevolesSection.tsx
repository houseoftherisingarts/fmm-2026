import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Download, HandHeart, Calendar } from 'lucide-react';
import type { AppStatus, BenevoleApp } from '../../../firebase/applications';
import { Badge, Card, EmptyState, GhostButton, downloadCsv, fmtDate } from '../primitives';
import HoraireEditor from '../../../components/admin/HoraireEditor';
import { listTeams, type Team } from '../../../firebase/teams';
import { mockListTeams } from '../../../firebase/mockApplications';

type Tab = 'list' | 'horaire';

const SHOWCASE_IN_DEV = import.meta.env.DEV;
const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;

interface Props {
  fetchAll: () => Promise<BenevoleApp[]>;
  // Kept on the prop signature so AdminPage's wiring still type-checks;
  // status mutations now live on the dedicated profile page.
  updateOne: (uid: string, status: AppStatus, notes?: string) => Promise<void>;
}

const STATUS_LABEL: Record<AppStatus, string> = {
  pending:  'En attente',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

const BenevolesSection: React.FC<Props> = ({ fetchAll }) => {
  const [tab, setTab]         = useState<Tab>('list');
  const [items, setItems]     = useState<BenevoleApp[]>([]);
  const [teams, setTeams]     = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<AppStatus | 'all'>('all');
  const [search, setSearch]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setItems(await fetchAll());
      // Hydrate teams once for the horaire view (also refreshed on tab switch).
      let live: Team[] = [];
      try { live = await listTeams(); } catch { /* offline */ }
      const mocks = (DEV_BYPASS || SHOWCASE_IN_DEV) ? await mockListTeams() : [];
      const seen = new Set(live.map((t) => t.id));
      setTeams([...mocks.filter((t) => !seen.has(t.id)), ...live]);
    }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const accepted = useMemo(() => items.filter((b) => b.status === 'accepted'), [items]);

  const filtered = items.filter((b) =>
    (filter === 'all' || b.status === filter) &&
    (search === '' || `${b.prenom} ${b.nom} ${b.email}`.toLowerCase().includes(search.toLowerCase())),
  );

  const exportCsv = () => downloadCsv('fmm-benevoles.csv', items.map((b) => ({
    prenom: b.prenom, nom: b.nom, email: b.email, telephone: b.telephone || '',
    status: b.status, message: b.message || '', adminNotes: b.adminNotes || '',
    createdAt: fmtDate(b.createdAt), year: b.year,
  })));

  const counts = {
    total:    items.length,
    pending:  items.filter((b) => b.status === 'pending').length,
    accepted: items.filter((b) => b.status === 'accepted').length,
    rejected: items.filter((b) => b.status === 'rejected').length,
  };

  return (
    <div className="space-y-5">
      {/* ── Tabs: Candidatures · Horaire ── */}
      <div className="flex items-center gap-1 border-b border-ivory-soft/10">
        {([
          ['list',     'Candidatures', HandHeart],
          ['horaire',  'Horaire',      Calendar],
        ] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 font-sans uppercase tracking-wider text-xs font-semibold transition border-b-2 -mb-px ${
              tab === k ? 'border-brass text-brass' : 'border-transparent text-ivory-soft hover:text-ivory'
            }`}>
            <Icon size={12} /> {label}
            {k === 'horaire' && <span className="ml-1.5 px-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[9px] tabular-nums">{counts.accepted}</span>}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="font-editorial italic text-sm text-ivory-soft">
                <span className="text-brass tabular-nums font-medium">{counts.total}</span> candidatures ·
                <span className="text-brass tabular-nums font-medium ml-1">{counts.pending}</span> en attente ·
                <span className="text-emerald-400 tabular-nums font-medium ml-1">{counts.accepted}</span> acceptées
              </p>
              <p className="font-editorial italic text-xs text-ivory-soft/60 mt-0.5">
                Cliquez une carte pour ouvrir le profil complet du bénévole.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche…"
                className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-xs font-sans" />
              {(['all', 'pending', 'accepted', 'rejected'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition ${filter === f ? 'bg-brass text-midnight-deep' : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'}`}>
                  {f === 'all' ? 'Toutes' : STATUS_LABEL[f]}
                </button>
              ))}
              <GhostButton onClick={exportCsv}><Download size={12} /> CSV</GhostButton>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <Card><EmptyState icon={HandHeart}>Aucune candidature ne correspond aux filtres.</EmptyState></Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {filtered.map((b) => <BenevoleCard key={b.uid} b={b} />)}
            </div>
          )}
        </>
      )}

      {tab === 'horaire' && (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
          </div>
        ) : (
          <HoraireEditor
            benevoles={accepted}
            teams={teams}
            isDemo={DEV_BYPASS}
            onChanged={load}
          />
        )
      )}
    </div>
  );
};

// ─── Profile card — Witcher inventory plaque ────────────────────────
// Hex-cut clipped chrome (top-right + bottom-left notches), copper
// corner L-ticks, divider-brass hairlines top + above footer, a
// diamond-shaped avatar medallion holding the initials. Status badge
// pinned at the avatar's foot. Hover lifts the card slightly + ignites
// the accent glow. Chrome inherits `--admin-accent`, so when the
// dashboard is themed (CA blue / Super Bénévoles green / etc.), the
// card automatically picks up the active tone.
const BenevoleCard: React.FC<{ b: BenevoleApp }> = ({ b }) => {
  const fullName = `${b.prenom || ''} ${b.nom || ''}`.trim() || b.displayName;
  const init = initials(fullName);
  const isDemo = b.uid.startsWith('mock-');

  return (
    <Link
      to={`/admin/benevole/${b.uid}`}
      className="group relative flex flex-col text-left overflow-hidden transition-all hover:-translate-y-0.5"
      style={{
        background:
          `linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 40%, rgba(0,0,0,0.18) 100%),
           linear-gradient(180deg, var(--admin-bg-soft) 0%, var(--admin-bg-deep) 100%)`,
        border: '1px solid var(--admin-line)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.55), 0 14px 32px -18px rgba(0,0,0,0.85)',
        clipPath:
          'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      }}
    >
      {/* Top metallic hairline — divider-brass aesthetic */}
      <span
        aria-hidden
        className="pointer-events-none"
        style={{
          position: 'absolute', top: 0, left: 18, right: 18, height: 1,
          background: 'linear-gradient(90deg, transparent, var(--admin-accent), transparent)',
          opacity: 0.85,
        }}
      />

      {/* Corner L-ticks — pick up the role's accent */}
      <CardCorners />

      {/* Demo chip — top-right */}
      {isDemo && (
        <span
          className="absolute top-2.5 right-2.5 z-10 px-1.5 py-0.5 font-sans uppercase tracking-[0.25em] text-[9px]"
          style={{
            background: 'rgba(10, 2, 7, 0.7)',
            border: '1px solid var(--admin-line)',
            color: 'var(--admin-text-mute)',
          }}
        >
          Démo
        </span>
      )}

      {/* Avatar — hex medallion with metallic gradient */}
      <div className="pt-7 flex justify-center">
        <span
          className="relative inline-flex items-center justify-center w-16 h-16 font-display title-medieval text-lg tracking-[0.04em]"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, var(--admin-accent) 35%, var(--admin-accent-dim) 55%, var(--admin-accent) 75%, rgba(255,255,255,0.10) 100%)',
            color: 'var(--admin-bg-deep)',
            clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.4), 0 0 18px -2px var(--admin-accent)',
            textShadow: '0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          {init}
        </span>
      </div>

      {/* Status badge — sits just under the medallion */}
      <div className="mt-2.5 flex justify-center">
        <Badge tone={b.status}>{STATUS_LABEL[b.status]}</Badge>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-4 flex-1 flex flex-col text-center">
        <h3
          className="font-display title-medieval text-sm md:text-base tracking-[0.06em] uppercase leading-tight truncate"
          style={{ color: 'var(--admin-text)' }}
        >
          {fullName}
        </h3>
        <p
          className="font-mono text-[10px] truncate mt-0.5"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          {b.email}
        </p>

        <p
          className="font-editorial italic text-[11px] mt-2.5 line-clamp-2 min-h-[2.4em] text-left"
          style={{ color: 'var(--admin-text-soft)' }}
        >
          {b.city ? `${b.city} · ` : ''}
          {(b.message || '—').replace(/\s+/g, ' ').slice(0, 90)}
          {b.message && b.message.length > 90 ? '…' : ''}
        </p>
      </div>

      {/* Footer — hairline above + date + profile chevron */}
      <div
        className="relative px-4 py-2.5"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.025), transparent)' }}
      >
        <span
          aria-hidden
          className="pointer-events-none"
          style={{
            position: 'absolute', top: 0, left: 18, right: 18, height: 1,
            background: 'linear-gradient(90deg, transparent, var(--admin-accent), transparent)',
            opacity: 0.7,
          }}
        />
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1 font-sans uppercase tracking-[0.3em] text-[9px]"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <Calendar size={9} /> {fmtDate(b.createdAt, { day: 'numeric', month: 'short' })}
          </span>
          <span
            className="inline-flex items-center gap-0.5 font-sans uppercase tracking-[0.3em] text-[9px] transition-colors"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <span className="group-hover:text-[var(--admin-accent)]">Profil</span>
            <ChevronRight size={10} className="group-hover:text-[var(--admin-accent)]" />
          </span>
        </div>
      </div>

      {/* Hover glow — soft accent halo around the card */}
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: '0 18px 40px -18px var(--admin-accent)',
          // Clip the halo to the same hex shape so it doesn't bleed
          // outside the notched corners.
          clipPath:
            'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        }}
      />
    </Link>
  );
};

// Four amber L-ticks pinned to the card's corners — Witcher inventory
// chrome. Color inherits the role's `--admin-accent` token.
const CardCorners: React.FC = () => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10, height: 10,
    borderColor: 'var(--admin-accent)',
    pointerEvents: 'none',
    opacity: 0.55,
  };
  return (
    <>
      <span aria-hidden style={{ ...base, top: 8,    left:  8,  borderTop:    '1.5px solid', borderLeft:  '1.5px solid' }} />
      <span aria-hidden style={{ ...base, top: 8,    right: 8,  borderTop:    '1.5px solid', borderRight: '1.5px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 8, left:  8,  borderBottom: '1.5px solid', borderLeft:  '1.5px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 8, right: 8,  borderBottom: '1.5px solid', borderRight: '1.5px solid' }} />
    </>
  );
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default BenevolesSection;
