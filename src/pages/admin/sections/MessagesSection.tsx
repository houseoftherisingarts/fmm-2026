import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Inbox, X, AtSign, Layers } from 'lucide-react';
import { Card, EmptyState } from '../primitives';
import { useAuth } from '../../../contexts/AuthContext';
import { DEPARTMENTS, getDepartment } from '../../../content/departments';
import {
  watchInbox, replyToMessage, transferMessage, markRead,
  type MailMessage, type MailRecipient,
} from '../../../firebase/mail';
import {
  mockWatchInbox, mockReplyToMessage, mockTransferMessage, mockMarkRead,
} from '../../../firebase/mockMail';
import MessageRow, { enDate } from './MessageRow';

// ─── Mail tab: medieval Gmail clone ─────────────────────────────────
// Two-pane mailbox UI: left rail lists every department box + the
// admin's personal box; right pane shows the selected mailbox's
// messages and the active reading view. Admin Mail is shared (every
// admin can read every department box). That's by design, the inbox
// is the team's, not any one person's. The personal box receives
// transfers.
//
// Replies open a textarea AND a `mailto:` link so the admin can send
// the actual customer-facing email from their own client (no SMTP
// infra yet). The reply is also stored as a `mail/` doc with the same
// threadId so the thread history is intact.
//
// Le rail est le filtre par boîte. « Toutes les boîtes » ouvre le tri en
// entier et chaque message y porte le nom de la boîte où il est tombé,
// pour qu'un courriel mal aiguillé se voie tout de suite. Une seule
// grappe d'abonnements alimente le compteur du rail et la liste
// affichée : ce que la régie montre est ce qu'elle a déjà en main.

interface Props {
  devBypass: boolean;
}

/** Boîte affichée : une boîte précise, ou tout le courrier d'un coup. */
type SelectedBox = MailRecipient | { type: 'all' };

/** Clé de la boîte personnelle dans la table des messages par boîte. */
const CLE_PERSO = '__personal';

/** Sous quelle clé un abonnement range ses messages. */
function cleDeBoite(box: SelectedBox): string | null {
  if (box.type === 'all')        return null;
  if (box.type === 'department') return box.departmentId;
  return CLE_PERSO;
}

/** Le nom lisible d'une boîte destinataire, pour l'étiquette d'un message. */
function nomDeBoite(r: MailRecipient | undefined): string {
  if (!r) return 'Boîte inconnue';
  return r.type === 'department'
    ? (getDepartment(r.departmentId)?.labelFR ?? r.departmentId)
    : r.adminEmail;
}


const MessagesSection: React.FC<Props> = ({ devBypass }) => {
  const { user } = useAuth();
  const myEmail = (user?.email ?? 'dev@local').toLowerCase();
  const myName  = user?.displayName ?? 'Admin';
  const myUid   = user?.uid ?? 'dev';

  // La vue par défaut montre tout le courrier : le rail sert ensuite à
  // le filtrer boîte par boîte.
  const [box, setBox] = useState<SelectedBox>({ type: 'all' });
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  // Surfaces transient write failures (markRead/reply/transfer) so admins
  // notice when an action didn't actually land server-side.
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setOpenId(null); }, [box]);

  // Un abonnement par boîte, rangé sous sa clé. Le rail y prend ses
  // compteurs et le panneau de droite y prend sa liste, sans jamais
  // écouter deux fois la même boîte.
  const [parBoite, setParBoite] = useState<Record<string, MailMessage[]>>({});
  useEffect(() => {
    const surveiller = devBypass ? mockWatchInbox : watchInbox;
    const ranger = (cle: string) => (msgs: MailMessage[]) =>
      setParBoite((prev) => ({ ...prev, [cle]: msgs }));
    const unsubs = DEPARTMENTS.map((d) =>
      surveiller({ type: 'department', departmentId: d.id }, ranger(d.id)),
    );
    unsubs.push(surveiller({ type: 'admin', adminEmail: myEmail }, ranger(CLE_PERSO)));
    return () => { unsubs.forEach((fn) => fn()); setParBoite({}); };
  }, [devBypass, myEmail]);

  const nonLus = (cle: string) => (parBoite[cle] ?? []).filter((m) => !m.read).length;

  // Le courrier de la boîte choisie, ou tout le courrier remis en ordre
  // de date quand le rail est sur « Toutes les boîtes ».
  const items = useMemo<MailMessage[]>(() => {
    const cle = cleDeBoite(box);
    if (cle) return parBoite[cle] ?? [];
    return Object.values(parBoite).flat()
      .sort((a, b) => enDate(b.createdAt).getTime() - enDate(a.createdAt).getTime());
  }, [box, parBoite]);

  const filtered = useMemo(
    () => items.filter((m) =>
      filter === 'all' || (filter === 'unread' && !m.read) || (filter === 'read' && m.read),
    ),
    [items, filter],
  );

  const onToggle = async (m: MailMessage) => {
    if (!m.id) return;
    if (openId === m.id) { setOpenId(null); return; }
    setOpenId(m.id);
    if (!m.read) {
      try { await (devBypass ? mockMarkRead : markRead)(m.id, true); }
      catch (e) {
        console.warn('[mail] markRead failed', e);
        setError('Échec du marquage comme lu. Le serveur n’a pas répondu.');
      }
    }
  };

  const boxLabel =
    box.type === 'all'        ? 'Toutes les boîtes'
    : box.type === 'department' ? (getDepartment(box.departmentId)?.labelFR ?? box.departmentId)
    : 'Personnel';

  return (
    <div className="space-y-3">
      {error && (
        <Card className="p-3 border border-blush/40 bg-blush/10 flex items-center justify-between gap-3">
          <p className="font-sans text-sm text-blush">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-blush/80 hover:text-blush transition"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </Card>
      )}
      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
      {/* Sidebar: mailboxes */}
      <aside>
        <Card className="p-0 overflow-hidden">
          <header className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-line)' }}>
            <p className="font-display title-medieval text-[10px] uppercase tracking-widest"
               style={{ color: 'var(--admin-accent)' }}>
              Boîtes
            </p>
          </header>
          <ul>
            {/* Tout le courrier d'un coup : le point de départ du tri. */}
            <RailItem
              icon={Layers}
              label="Toutes les boîtes"
              count={Object.keys(parBoite).reduce((n, cle) => n + nonLus(cle), 0)}
              active={box.type === 'all'}
              onClick={() => setBox({ type: 'all' })}
            />
            <li style={{ borderTop: '1px solid var(--admin-line)' }} />
            <RailItem
              icon={AtSign}
              label="Personnel"
              count={nonLus(CLE_PERSO)}
              active={box.type === 'admin' && box.adminEmail === myEmail}
              onClick={() => setBox({ type: 'admin', adminEmail: myEmail })}
            />
            <li style={{ borderTop: '1px solid var(--admin-line)' }} />
            {DEPARTMENTS.map((d) => (
              <RailItem
                key={d.id}
                icon={Inbox}
                label={d.labelFR}
                sub={`(${d.responsibleFR})`}
                count={nonLus(d.id)}
                active={box.type === 'department' && box.departmentId === d.id}
                onClick={() => setBox({ type: 'department', departmentId: d.id })}
              />
            ))}
          </ul>
        </Card>
      </aside>

      {/* Right pane: list + reader */}
      <main className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display title-medieval text-[10px] uppercase tracking-widest"
               style={{ color: 'var(--admin-accent)' }}>
              Boîte courante
            </p>
            <h2 className="font-display title-medieval text-xl tracking-wide mt-0.5"
                style={{ color: 'var(--admin-text)' }}>
              {boxLabel}
            </h2>
            <p className="font-editorial italic text-xs mt-1"
               style={{ color: 'var(--admin-text-mute)' }}>
              {items.filter((m) => !m.read).length} non lus · {items.length} au total
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'unread', 'read'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition"
                style={{
                  background: filter === f ? 'var(--admin-accent)' : 'transparent',
                  color: filter === f ? 'var(--admin-bg-deep)' : 'var(--admin-text-soft)',
                  border: `1px solid ${filter === f ? 'var(--admin-accent)' : 'var(--admin-line)'}`,
                }}
              >
                {f === 'all' ? 'Tous' : f === 'unread' ? 'Non lus' : 'Lus'}
              </button>
            ))}
          </div>
        </header>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState icon={MessageSquare}>Aucun message dans cette boîte.</EmptyState>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                boiteLabel={box.type === 'all' ? nomDeBoite(m.recipient) : undefined}
                isOpen={openId === m.id}
                onToggle={() => onToggle(m)}
                onReply={async (subject, body) => {
                  if (!m.id) return;
                  const reply = {
                    threadId: m.threadId,
                    recipient: { type: 'admin' as const, adminEmail: m.fromEmail.toLowerCase() },
                    fromEmail: myEmail,
                    fromName: myName,
                    fromAdminUid: myUid,
                    subject, body,
                  };
                  try { await (devBypass ? mockReplyToMessage : replyToMessage)(reply); }
                  catch (e) {
                    console.warn('[mail] reply failed', e);
                    setError('Échec de l’envoi de la réponse. Réessayez.');
                  }
                }}
                onTransfer={async (recipient, note) => {
                  if (!m.id) return;
                  const payload = {
                    threadId: m.threadId,
                    recipient,
                    fromEmail: myEmail,
                    fromName: myName,
                    fromAdminUid: myUid,
                    subject: m.subject,
                    body: note || `Transféré depuis « ${boxLabel} ».`,
                  };
                  try { await (devBypass ? mockTransferMessage : transferMessage)(payload); }
                  catch (e) {
                    console.warn('[mail] transfer failed', e);
                    setError('Échec du transfert. Réessayez.');
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>
      </div>
    </div>
  );
};

// ─── Rail item ───────────────────────────────────────────────────────
const RailItem: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  sub?: string;
  count: number;
  active: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, sub, count, active, onClick }) => (
  <li>
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors"
      style={{
        background: active ? 'var(--admin-accent)' : 'transparent',
        color: active ? 'var(--admin-bg-deep)' : 'var(--admin-text)',
        borderLeft: active ? '2px solid var(--admin-accent)' : '2px solid transparent',
      }}
    >
      <Icon size={12} className="shrink-0" />
      <span className="flex-1 min-w-0 font-sans text-[13px] truncate">
        {label}
        {sub && (
          <span className="ml-1 font-editorial italic text-[11px]"
                style={{ color: active ? 'rgba(10,16,26,0.7)' : 'var(--admin-text-mute)' }}>
            {sub}
          </span>
        )}
      </span>
      {count > 0 && (
        <span
          className="inline-flex items-center justify-center font-sans text-[10px] font-semibold px-1.5 min-w-[18px] h-[18px] rounded-full"
          style={{
            background: active ? 'var(--admin-bg-deep)' : 'var(--admin-accent)',
            color: active ? 'var(--admin-accent)' : 'var(--admin-bg-deep)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  </li>
);

export default MessagesSection;
