// Discord section — admin dashboard panel.
//
// Three areas:
//   1. My connection — DiscordConnect card for the signed-in organizer.
//   2. Server widget — official Discord embeddable widget (read-only,
//      shows who's online in the FMM server). Requires the guild widget
//      to be enabled in Server Settings → Widget.
//   3. Linked members — list of all organizers who've linked their
//      Discord account, pulled from Firestore.
//
// Env vars used (all optional — section degrades gracefully):
//   VITE_DISCORD_CLIENT_ID   — enables OAuth connect button
//   VITE_DISCORD_GUILD_ID    — shows the server widget + join invite

import React, { useEffect, useState } from 'react';
import { MessageSquare, Users, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { Card, EmptyState } from '../primitives';
import DiscordConnect from '../../../components/admin/DiscordConnect';
import { listLinkedMembers, discordAvatarUrl, type LinkedMember } from '../../../firebase/discord';

// ─── env ────────────────────────────────────────────────────────────
const GUILD_ID    = import.meta.env.VITE_DISCORD_GUILD_ID    as string | undefined;
const INVITE_URL  = import.meta.env.VITE_DISCORD_INVITE_URL  as string | undefined;

// ─── Widget ─────────────────────────────────────────────────────────
const DiscordWidget: React.FC = () => {
  if (!GUILD_ID) {
    return (
      <div
        className="rounded-card border px-5 py-6 text-center space-y-2"
        style={{ borderColor: 'var(--admin-line)', background: 'rgba(88, 101, 242, 0.03)' }}
      >
        <MessageSquare size={24} style={{ color: 'rgba(88, 101, 242, 0.4)' }} className="mx-auto" />
        <p className="font-sans text-sm" style={{ color: 'var(--admin-text-mute)' }}>
          Widget non configuré
        </p>
        <p className="font-sans text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
          Ajoutez{' '}
          <code className="text-brass">VITE_DISCORD_GUILD_ID</code>
          {' '}dans <code className="text-brass">.env.local</code>
          {' '}puis activez le widget dans les paramètres du serveur Discord.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <iframe
        src={`https://discord.com/widget?id=${GUILD_ID}&theme=dark`}
        width="100%"
        height="380"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        title="FMM Discord"
        style={{
          border: 'none',
          borderRadius: 8,
          display: 'block',
        }}
      />
      {INVITE_URL && (
        <a
          href={INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-card font-sans text-xs uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ background: '#5865F2', color: '#fff' }}
        >
          <ExternalLink size={12} />
          Ouvrir le serveur FMM
        </a>
      )}
    </div>
  );
};

// ─── Members list ────────────────────────────────────────────────────
const LinkedMembersList: React.FC<{ devBypass: boolean }> = ({ devBypass }) => {
  const [members, setMembers]   = useState<LinkedMember[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);

    // Dev bypass — show a placeholder row so the UI is visible without Firebase.
    if (devBypass) {
      setMembers([
        {
          uid: 'dev',
          displayName: 'Admin (dev)',
          email: 'dev@local',
          discordId: '123456789012345678',
          discordUsername: 'floki_fmm',
          discordAvatar: null,
        },
      ]);
      setLoading(false);
      return;
    }

    listLinkedMembers()
      .then((m) => { setMembers(m); })
      .catch((e) => { setError(String(e?.message ?? 'Erreur de chargement.')); })
      .finally(() => { setLoading(false); });
  };

  useEffect(() => { load(); }, [devBypass]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4" style={{ color: 'var(--admin-text-mute)' }}>
        <Loader2 size={14} className="animate-spin" />
        <span className="font-sans text-xs">Chargement des membres…</span>
      </div>
    );
  }
  if (error) {
    return (
      <p className="font-sans text-xs" style={{ color: '#FCA5B0' }}>
        {error}
      </p>
    );
  }
  if (members.length === 0) {
    return (
      <EmptyState icon={Users}>
        Aucun membre n'a encore lié son compte Discord.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <p className="font-sans text-[11px] uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
          {members.length} membre{members.length > 1 ? 's' : ''} connecté{members.length > 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 font-sans text-[11px] transition-opacity hover:opacity-70"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <RefreshCw size={11} /> Actualiser
        </button>
      </div>

      {members.map((m) => (
        <div
          key={m.uid}
          className="flex items-center gap-3 px-3 py-2.5 rounded-card transition-colors"
          style={{ border: '1px solid var(--admin-line)' }}
        >
          <img
            src={discordAvatarUrl(m.discordId, m.discordAvatar, 64)}
            alt=""
            className="w-8 h-8 rounded-full shrink-0"
            style={{ border: '1px solid rgba(88, 101, 242, 0.3)' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="font-sans text-sm truncate" style={{ color: 'var(--admin-text)' }}>
              {m.displayName}
            </p>
            <p className="font-sans text-[11px] truncate" style={{ color: 'rgba(88, 101, 242, 0.8)' }}>
              @{m.discordUsername}
            </p>
          </div>
          <span
            className="shrink-0 px-2 py-0.5 rounded-card font-sans text-[10px] uppercase tracking-widest"
            style={{ background: 'rgba(88, 101, 242, 0.1)', color: 'rgba(88, 101, 242, 0.8)', border: '1px solid rgba(88, 101, 242, 0.2)' }}
          >
            Discord
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Main section ────────────────────────────────────────────────────
interface Props {
  devBypass: boolean;
}

const DiscordSection: React.FC<Props> = ({ devBypass }) => {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Intro */}
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-card flex items-center justify-center shrink-0"
          style={{ background: 'rgba(88, 101, 242, 0.12)', border: '1px solid rgba(88, 101, 242, 0.3)' }}
        >
          <MessageSquare size={20} style={{ color: '#5865F2' }} />
        </div>
        <div>
          <h2 className="font-display title-medieval text-xl text-brass uppercase tracking-widest">
            Discord FMM
          </h2>
          <p className="font-editorial italic text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Liez votre compte Discord, consultez qui est en ligne dans le serveur de l'équipe et accédez à l'annuaire des membres connectés.
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left — my profile + widget */}
        <div className="lg:col-span-5 space-y-5">
          {/* My Discord connection */}
          <Card className="p-5 md:p-6">
            <h3 className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-4 flex items-center gap-2">
              <MessageSquare size={11} /> Mon compte Discord
            </h3>
            <DiscordConnect />
          </Card>

          {/* Server widget */}
          <Card className="p-5 md:p-6">
            <h3 className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={11} /> Serveur FMM — En ligne
            </h3>
            <DiscordWidget />
          </Card>
        </div>

        {/* Right — linked members */}
        <div className="lg:col-span-7">
          <Card className="p-5 md:p-6">
            <h3 className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={11} /> Membres de l'équipe liés
            </h3>
            <LinkedMembersList devBypass={devBypass} />
          </Card>

          {/* Setup guide */}
          <div
            className="mt-4 rounded-card border px-5 py-4 space-y-2"
            style={{ borderColor: 'var(--admin-line)', background: 'rgba(88, 101, 242, 0.03)' }}
          >
            <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">
              Configuration Discord
            </p>
            <ol className="space-y-1.5 font-sans text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
              <li className="flex items-start gap-2">
                <span className="text-brass shrink-0">01</span>
                Créez une application sur{' '}
                <a
                  href="https://discord.com/developers/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brass hover:underline"
                >
                  discord.com/developers
                </a>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brass shrink-0">02</span>
                Copiez l'<strong style={{ color: 'var(--admin-text)' }}>Application ID</strong> → ajoutez{' '}
                <code className="text-brass">VITE_DISCORD_CLIENT_ID=votre_id</code> dans <code className="text-brass">.env.local</code>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brass shrink-0">03</span>
                Dans OAuth2 → Redirects, ajoutez{' '}
                <code className="text-brass">{window.location.origin}/admin</code>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brass shrink-0">04</span>
                Activez le widget du serveur Discord → Paramètres → Widget → Activer
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brass shrink-0">05</span>
                Ajoutez <code className="text-brass">VITE_DISCORD_GUILD_ID=id_du_serveur</code> et optionnellement{' '}
                <code className="text-brass">VITE_DISCORD_INVITE_URL=lien_invitation</code>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordSection;
