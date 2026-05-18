import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldOff, UserPlus, Trash2, Mail } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  listAdminRoles, setAdminRole as fbSetAdminRole, type AdminRoleDoc,
} from '../../../firebase/adminRoles';
import {
  mockListAdminRoles, mockSetAdminRole,
} from '../../../firebase/mockAdminRoles';
import {
  type AdminRole, ALL_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS,
} from '../../../lib/adminPermissions';
import { Card, Input, Label, PrimaryButton, GhostButton, EmptyState } from '../primitives';

// ─── Rôles admin ─────────────────────────────────────────────────────
// Super-admin-only section. Lists every assigned admin (Firestore docs
// in `adminRoles/{email}`), lets the super-admin add a new admin by
// email, change someone's role, or revoke. The section itself is
// access-gated by AdminShell's NAV filter — only role === 'super' sees
// it — but we double-check `isSuperAdmin` here as defense-in-depth.

interface Props {
  devBypass?: boolean;
}

const RolesSection: React.FC<Props> = ({ devBypass = false }) => {
  const { user, adminRole, isSuperAdmin } = useAuth();
  const allowed = devBypass || isSuperAdmin || adminRole === 'super';

  const [rows, setRows] = useState<AdminRoleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add-admin form state.
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName]   = useState('');
  const [newRole, setNewRole]   = useState<AdminRole>('benevole');

  const fetch = async () => {
    setLoading(true);
    try {
      const data = devBypass ? await mockListAdminRoles() : await listAdminRoles();
      setRows(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetch(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [devBypass]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowed) return;
    const email = newEmail.trim().toLowerCase();
    if (!email || !/.+@.+\..+/.test(email)) { setError('Courriel invalide.'); return; }
    setBusy(email);
    setError(null);
    try {
      const meta = {
        displayName: newName.trim(),
        assignedBy: user?.uid ?? 'dev',
        assignedByEmail: user?.email ?? 'dev@local',
      };
      if (devBypass) await mockSetAdminRole(email, newRole, meta);
      else           await fbSetAdminRole(email, newRole, meta);
      setNewEmail(''); setNewName(''); setNewRole('benevole');
      await fetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onChangeRole = async (row: AdminRoleDoc, next: AdminRole) => {
    if (!allowed || next === row.role) return;
    setBusy(row.email);
    setError(null);
    try {
      const meta = {
        displayName: row.displayName,
        assignedBy: user?.uid ?? 'dev',
        assignedByEmail: user?.email ?? 'dev@local',
      };
      if (devBypass) await mockSetAdminRole(row.email, next, meta);
      else           await fbSetAdminRole(row.email, next, meta);
      await fetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onRevoke = async (row: AdminRoleDoc) => {
    if (!allowed) return;
    const ok = window.confirm(`Révoquer le rôle « ${ROLE_LABELS[row.role].FR} » pour ${row.email} ?`);
    if (!ok) return;
    setBusy(row.email);
    setError(null);
    try {
      const meta = {
        displayName: row.displayName,
        assignedBy: user?.uid ?? 'dev',
        assignedByEmail: user?.email ?? 'dev@local',
      };
      if (devBypass) await mockSetAdminRole(row.email, null, meta);
      else           await fbSetAdminRole(row.email, null, meta);
      await fetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  // Count assignments per role, for the legend card.
  const counts = useMemo(() => {
    const c: Partial<Record<AdminRole, number>> = {};
    for (const r of rows) c[r.role] = (c[r.role] || 0) + 1;
    return c;
  }, [rows]);

  if (!allowed) {
    return (
      <EmptyState icon={ShieldOff}>
        Accès refusé — seul un super-administrateur peut gérer les rôles.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend / role overview */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={14} className="text-brass" />
          <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">
            Légende des rôles
          </p>
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_ROLES.map((r) => (
            <li key={r} className="px-3 py-2.5 border border-ivory-soft/10 rounded-card">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-sans uppercase tracking-[0.25em] text-[10px] text-brass">
                  {ROLE_LABELS[r].FR}
                </span>
                <span className="font-display text-xs tabular-nums text-ivory-soft">
                  {counts[r] ?? 0}
                </span>
              </div>
              <p className="font-editorial italic text-[12px] text-ivory-soft/80 leading-snug">
                {ROLE_DESCRIPTIONS[r].FR}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      {/* Add admin */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus size={14} className="text-brass" />
          <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">
            Attribuer un rôle
          </p>
        </div>
        <form onSubmit={onAdd} className="grid sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <Label>Courriel</Label>
            <Input
              type="email"
              required
              placeholder="quelquun@exemple.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <Label>Nom affiché</Label>
            <Input
              type="text"
              placeholder="Optionnel"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Rôle</Label>
            <select
              className="admin-input"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AdminRole)}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r].FR}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <PrimaryButton type="submit" disabled={!!busy} className="w-full">
              {busy ? '…' : 'Ajouter'}
            </PrimaryButton>
          </div>
        </form>
        {error && (
          <p className="mt-3 font-editorial italic text-[12px]" style={{ color: '#FCA5B0' }}>
            {error}
          </p>
        )}
      </Card>

      {/* List */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-line)' }}>
          <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">
            Administrateurs ({rows.length})
          </p>
        </div>
        {loading ? (
          <div className="p-6 text-center font-editorial italic text-ivory-soft/70">Chargement…</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ShieldOff}>
            Aucun administrateur — attribuez un premier rôle à un courriel pour démarrer.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-ivory-soft/10">
            {rows.map((row) => (
              <li key={row.email} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail size={12} className="text-ivory-soft/70 shrink-0" />
                    <p className="truncate font-sans text-sm text-ivory">{row.email}</p>
                  </div>
                  {row.displayName && (
                    <p className="truncate font-editorial italic text-[12px] text-ivory-soft/70 mt-0.5">
                      {row.displayName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className="admin-input"
                    value={row.role}
                    disabled={busy === row.email}
                    onChange={(e) => onChangeRole(row, e.target.value as AdminRole)}
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r].FR}</option>
                    ))}
                  </select>
                  <GhostButton
                    type="button"
                    onClick={() => onRevoke(row)}
                    disabled={busy === row.email}
                    aria-label="Révoquer"
                    title="Révoquer"
                  >
                    <Trash2 size={13} />
                  </GhostButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default RolesSection;
