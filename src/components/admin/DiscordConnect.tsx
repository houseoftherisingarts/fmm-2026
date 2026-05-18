// DiscordConnect — "Connect your Discord" card for admin profiles.
//
// Two operating modes:
//   1. OAuth mode  — VITE_DISCORD_CLIENT_ID is set in .env.local.
//      A button redirects to Discord's OAuth2 implicit grant. On
//      callback the access_token arrives in the URL fragment and we
//      exchange it for the user profile, then save to Firestore.
//   2. Manual mode — no client ID configured. An input lets the
//      user type their Discord username directly (no auth).
//
// The component is self-contained: it reads / writes Firestore and
// handles the OAuth redirect callback on mount. Drop it anywhere.

import React, { useEffect, useState } from 'react';
import { MessageSquare, Link2, Unlink, ExternalLink, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import {
  buildDiscordOAuthUrl, parseOAuthFragment, fetchDiscordUser,
  saveDiscordLink, removeDiscordLink, getDiscordLink, discordAvatarUrl,
  discordDisplayName,
  type DiscordProfile,
} from '../../firebase/discord';
import { useAuth } from '../../contexts/AuthContext';

// ─── env ────────────────────────────────────────────────────────────
const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;
// The redirect URI must match exactly what's registered in the Discord
// Developer Portal → OAuth2 → Redirects.
const DISCORD_REDIRECT_URI =
  (import.meta.env.VITE_DISCORD_REDIRECT_URI as string | undefined) ??
  `${typeof window !== 'undefined' ? window.location.origin : ''}/admin`;

// ─── Types ──────────────────────────────────────────────────────────
type Status = 'idle' | 'loading' | 'success' | 'error';

// ─── Component ──────────────────────────────────────────────────────
const DiscordConnect: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [profile, setProfile]       = useState<DiscordProfile | null>(null);
  const [status, setStatus]         = useState<Status>('loading');
  const [error, setError]           = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [saving, setSaving]         = useState(false);

  // ── 1. Load existing link ──────────────────────────────────────
  useEffect(() => {
    if (!uid) { setStatus('idle'); return; }
    getDiscordLink(uid)
      .then((p) => { setProfile(p); setStatus('idle'); })
      .catch(() => { setStatus('idle'); });
  }, [uid]);

  // ── 2. Handle OAuth callback (implicit grant) ──────────────────
  // Discord returns the token in the URL fragment after redirect.
  // We process it once on mount, then clean the fragment from history.
  useEffect(() => {
    const token = parseOAuthFragment(window.location.hash);
    if (!token || !uid) return;

    // Strip the fragment so a page refresh doesn't re-process it.
    window.history.replaceState(null, '', window.location.pathname);

    setStatus('loading');
    fetchDiscordUser(token)
      .then(async (discordUser) => {
        const p: DiscordProfile = {
          discordId:       discordUser.id,
          discordUsername: discordDisplayName(discordUser),
          discordAvatar:   discordUser.avatar,
        };
        await saveDiscordLink(uid, p);
        setProfile(p);
        setStatus('success');
      })
      .catch((err) => {
        setError(String(err?.message ?? 'Erreur lors de la connexion Discord.'));
        setStatus('error');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // ── 3. Trigger OAuth redirect ──────────────────────────────────
  const handleOAuthConnect = () => {
    if (!DISCORD_CLIENT_ID) return;
    const url = buildDiscordOAuthUrl(DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI);
    window.location.href = url;
  };

  // ── 4. Manual save ─────────────────────────────────────────────
  const handleManualSave = async () => {
    if (!uid || !manualName.trim()) return;
    setSaving(true);
    try {
      const p: DiscordProfile = {
        discordId:       `manual_${uid}`,
        discordUsername: manualName.trim(),
        discordAvatar:   null,
      };
      await saveDiscordLink(uid, p);
      setProfile(p);
      setManualName('');
    } catch (err) {
      setError(String((err as Error)?.message ?? 'Erreur de sauvegarde.'));
    } finally {
      setSaving(false);
    }
  };

  // ── 5. Unlink ──────────────────────────────────────────────────
  const handleUnlink = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await removeDiscordLink(uid);
      setProfile(null);
    } catch (err) {
      setError(String((err as Error)?.message ?? 'Erreur.'));
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div
      className="rounded-card border p-5 md:p-6 space-y-4"
      style={{ borderColor: 'var(--admin-line)', background: 'rgba(88, 101, 242, 0.04)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-card flex items-center justify-center shrink-0"
          style={{ background: 'rgba(88, 101, 242, 0.12)', border: '1px solid rgba(88, 101, 242, 0.3)' }}
        >
          <MessageSquare size={16} style={{ color: '#5865F2' }} />
        </div>
        <div>
          <p className="font-sans text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Compte Discord
          </p>
          <p className="font-sans text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
            {profile ? 'Compte lié' : 'Non connecté'}
          </p>
        </div>
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <div className="flex items-center gap-2 py-2" style={{ color: 'var(--admin-text-mute)' }}>
          <Loader2 size={14} className="animate-spin" />
          <span className="font-sans text-xs">Chargement…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-card text-xs font-sans"
          style={{ background: 'rgba(252, 165, 176, 0.08)', border: '1px solid rgba(252, 165, 176, 0.3)', color: '#FCA5B0' }}
        >
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Linked state */}
      {status !== 'loading' && profile && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={discordAvatarUrl(profile.discordId, profile.discordAvatar, 64)}
              alt=""
              className="w-10 h-10 rounded-full"
              style={{ border: '2px solid rgba(88, 101, 242, 0.4)' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="min-w-0">
              <p className="font-sans text-sm truncate" style={{ color: 'var(--admin-text)' }}>
                {profile.discordUsername}
              </p>
              {!profile.discordId.startsWith('manual_') && (
                <p className="font-sans text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                  ID {profile.discordId}
                </p>
              )}
            </div>
            <CheckCircle2 size={15} className="shrink-0" style={{ color: '#5BA372' }} />
          </div>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card font-sans text-xs uppercase tracking-widest transition-colors"
            style={{
              border: '1px solid rgba(252, 165, 176, 0.3)',
              color: '#FCA5B0',
              background: 'transparent',
              opacity: saving ? 0.5 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            <Unlink size={11} />
            Délier
          </button>
        </div>
      )}

      {/* Unlinked state */}
      {status !== 'loading' && !profile && (
        <>
          {/* OAuth button — shown when Discord app is configured */}
          {DISCORD_CLIENT_ID ? (
            <button
              type="button"
              onClick={handleOAuthConnect}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-card font-sans text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-75"
              style={{ background: '#5865F2', color: '#fff', border: 'none' }}
            >
              <Link2 size={14} />
              Connecter avec Discord
            </button>
          ) : (
            <>
              {/* Manual input — shown when no OAuth app is configured */}
              <p className="font-sans text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                Entrez votre pseudo Discord pour apparaître dans l'annuaire de l'équipe.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleManualSave(); }}
                  placeholder="floki_fmm"
                  className="admin-input flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={handleManualSave}
                  disabled={saving || !manualName.trim()}
                  className="px-4 py-1.5 rounded-card font-sans text-xs uppercase tracking-widest transition-opacity"
                  style={{
                    background: '#5865F2',
                    color: '#fff',
                    border: 'none',
                    opacity: saving || !manualName.trim() ? 0.5 : 1,
                    cursor: saving || !manualName.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? '…' : 'Lier'}
                </button>
              </div>
              {/* Setup note */}
              <p className="font-sans text-[10px] flex items-start gap-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                <ExternalLink size={10} className="shrink-0 mt-0.5" />
                Pour activer la connexion OAuth (recommandé), ajoutez{' '}
                <code className="text-brass">VITE_DISCORD_CLIENT_ID</code> dans{' '}
                <code className="text-brass">.env.local</code>.
              </p>
            </>
          )}
        </>
      )}

      {/* Success flash */}
      {status === 'success' && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-card font-sans text-xs"
          style={{ background: 'rgba(91, 163, 114, 0.1)', border: '1px solid rgba(91, 163, 114, 0.3)', color: '#5BA372' }}
        >
          <CheckCircle2 size={12} />
          Discord connecté avec succès.
        </div>
      )}
    </div>
  );
};

export default DiscordConnect;
