import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Mail, Reply, Forward, Inbox, ChevronRight, X, Check, AtSign,
} from 'lucide-react';
import { Card, EmptyState, Badge, fmtDate } from '../primitives';
import { useAuth } from '../../../contexts/AuthContext';
import { DEPARTMENTS, getDepartment } from '../../../content/departments';
import {
  watchInbox, replyToMessage, transferMessage, markRead,
  type MailMessage, type MailRecipient,
} from '../../../firebase/mail';
import {
  mockWatchInbox, mockReplyToMessage, mockTransferMessage, mockMarkRead,
} from '../../../firebase/mockMail';

// ─── Mail tab — medieval Gmail clone ─────────────────────────────────
// Two-pane mailbox UI: left rail lists every department box + the
// admin's personal box; right pane shows the selected mailbox's
// messages and the active reading view. Admin Mail is shared (every
// admin can read every department box) — that's by design, the inbox
// is the team's, not any one person's. The personal box receives
// transfers.
//
// Replies open a textarea AND a `mailto:` link so the admin can send
// the actual customer-facing email from their own client (no SMTP
// infra yet). The reply is also stored as a `mail/` doc with the same
// threadId so the thread history is intact.

interface Props {
  devBypass: boolean;
}

type SelectedBox = MailRecipient;

const MessagesSection: React.FC<Props> = ({ devBypass }) => {
  const { user } = useAuth();
  const myEmail = (user?.email ?? 'dev@local').toLowerCase();
  const myName  = user?.displayName ?? 'Admin';
  const myUid   = user?.uid ?? 'dev';

  // Default selection — first department box. Switching to "personnel"
  // is one click away in the rail.
  const [box, setBox] = useState<SelectedBox>({ type: 'department', departmentId: DEPARTMENTS[0].id });
  const [items, setItems] = useState<MailMessage[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  // Surfaces transient write failures (markRead/reply/transfer) so admins
  // notice when an action didn't actually land server-side.
  const [error, setError] = useState<string | null>(null);

  // Live subscription to the selected mailbox.
  useEffect(() => {
    setOpenId(null);
    const unsub = (devBypass ? mockWatchInbox : watchInbox)(box, setItems);
    return () => unsub();
  }, [box, devBypass]);

  // Counts per department for the rail badges. We watch each
  // department box separately so the counts stay fresh as new mail
  // arrives. Compact and efficient enough at this scale.
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    for (const d of DEPARTMENTS) {
      const recipient: MailRecipient = { type: 'department', departmentId: d.id };
      const handler = (msgs: MailMessage[]) => {
        setCounts((prev) => ({ ...prev, [d.id]: msgs.filter((m) => !m.read).length }));
      };
      unsubs.push((devBypass ? mockWatchInbox : watchInbox)(recipient, handler));
    }
    // Personal box unread count
    const personal: MailRecipient = { type: 'admin', adminEmail: myEmail };
    const personalHandler = (msgs: MailMessage[]) => {
      setCounts((prev) => ({ ...prev, __personal: msgs.filter((m) => !m.read).length }));
    };
    unsubs.push((devBypass ? mockWatchInbox : watchInbox)(personal, personalHandler));
    return () => { unsubs.forEach((fn) => fn()); };
  }, [devBypass, myEmail]);

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
        setError('Échec du marquage comme lu — le serveur n’a pas répondu.');
      }
    }
  };

  const boxLabel =
    box.type === 'department'
      ? `${getDepartment(box.departmentId)?.labelFR ?? box.departmentId}`
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
      {/* Sidebar — mailboxes */}
      <aside>
        <Card className="p-0 overflow-hidden">
          <header className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-line)' }}>
            <p className="font-display title-medieval text-[10px] uppercase tracking-widest"
               style={{ color: 'var(--admin-accent)' }}>
              Boîtes
            </p>
          </header>
          <ul>
            {/* Personnel */}
            <RailItem
              icon={AtSign}
              label="Personnel"
              count={counts.__personal ?? 0}
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
                count={counts[d.id] ?? 0}
                active={box.type === 'department' && box.departmentId === d.id}
                onClick={() => setBox({ type: 'department', departmentId: d.id })}
              />
            ))}
          </ul>
        </Card>
      </aside>

      {/* Right pane — list + reader */}
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
                    setError('Échec de l’envoi de la réponse — réessayez.');
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
                    setError('Échec du transfert — réessayez.');
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

// ─── Message row + reader ────────────────────────────────────────────
const MessageRow: React.FC<{
  message: MailMessage;
  isOpen: boolean;
  onToggle: () => void;
  onReply: (subject: string, body: string) => Promise<void>;
  onTransfer: (recipient: MailRecipient, note: string) => Promise<void>;
}> = ({ message: m, isOpen, onToggle, onReply, onTransfer }) => {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replySubject, setReplySubject] = useState(`Re: ${m.subject}`);
  const [replyBusy, setReplyBusy] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string>(`dept:${DEPARTMENTS[0].id}`);
  const [transferNote, setTransferNote] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);

  const dt = m.createdAt && typeof m.createdAt === 'object' && 'toDate' in (m.createdAt as object)
    ? (m.createdAt as { toDate: () => Date }).toDate()
    : (typeof m.createdAt === 'string' ? new Date(m.createdAt) : new Date());

  const kindTone =
    m.kind === 'reply'    ? 'info'    as const :
    m.kind === 'transfer' ? 'waitlist' as const :
    'neutral'             as const;

  const submitReply = async () => {
    if (!replyBody.trim()) return;
    setReplyBusy(true);
    try { await onReply(replySubject, replyBody); setReplyBody(''); setReplyOpen(false); }
    finally { setReplyBusy(false); }
  };

  const submitTransfer = async () => {
    let recipient: MailRecipient;
    if (transferTarget.startsWith('dept:')) {
      recipient = { type: 'department', departmentId: transferTarget.slice(5) };
    } else {
      recipient = { type: 'admin', adminEmail: transferTarget.slice(6) };
    }
    setTransferBusy(true);
    try { await onTransfer(recipient, transferNote); setTransferNote(''); setTransferOpen(false); }
    finally { setTransferBusy(false); }
  };

  return (
    <Card className="overflow-hidden">
      <header
        className="grid grid-cols-12 gap-3 items-center px-4 md:px-5 py-3.5 cursor-pointer"
        onClick={onToggle}
      >
        <button aria-label="Toggle" className="col-span-1">
          <ChevronRight
            size={16}
            style={{
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 200ms',
              color: isOpen ? 'var(--admin-accent)' : 'var(--admin-text-mute)',
            }}
          />
        </button>
        <div className="col-span-12 sm:col-span-4 min-w-0 flex items-center gap-2">
          {!m.read && (
            <span aria-hidden className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: 'var(--admin-accent)' }} />
          )}
          <p
            className="font-display title-medieval text-sm truncate"
            style={{ color: m.read ? 'var(--admin-text-soft)' : 'var(--admin-text)' }}
          >
            {m.subject}
          </p>
        </div>
        <p className="col-span-12 sm:col-span-4 font-sans text-xs truncate"
           style={{ color: 'var(--admin-text-soft)' }}>
          {m.fromName} · {m.fromEmail}
        </p>
        <div className="col-span-12 sm:col-span-3 flex justify-end gap-2 items-center">
          {m.kind !== 'incoming' && (
            <Badge tone={kindTone}>{m.kind === 'reply' ? 'Réponse' : 'Transféré'}</Badge>
          )}
          {!m.read && <Badge tone="pending">Nouveau</Badge>}
          <span className="font-editorial italic text-xs"
                style={{ color: 'var(--admin-text-mute)' }}>
            {fmtDate(dt)}
          </span>
        </div>
      </header>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 md:px-5 pb-5"
            style={{ borderTop: '1px solid var(--admin-line)' }}
          >
            <p
              className="font-editorial text-base whitespace-pre-line pt-4 mb-5 leading-relaxed"
              style={{ color: 'var(--admin-text-soft)' }}
            >
              {m.body}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setReplyOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-1.5 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card"
                style={{
                  background: 'var(--admin-accent)',
                  color: 'var(--admin-bg-deep)',
                }}
              >
                <Reply size={12} /> Répondre
              </button>
              <button
                type="button"
                onClick={() => setTransferOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-1.5 font-sans uppercase tracking-wider text-xs transition rounded-card"
                style={{
                  border: '1px solid var(--admin-line)',
                  color: 'var(--admin-text)',
                }}
              >
                <Forward size={12} /> Transférer
              </button>
              <a
                href={`mailto:${m.fromEmail}?subject=${encodeURIComponent('Re: ' + m.subject)}`}
                className="inline-flex items-center gap-2 px-4 py-1.5 font-sans uppercase tracking-wider text-xs transition rounded-card"
                style={{
                  border: '1px solid var(--admin-line)',
                  color: 'var(--admin-text-soft)',
                }}
              >
                <Mail size={12} /> Client mail
              </a>
            </div>

            {/* Reply composer */}
            {replyOpen && (
              <div className="mt-4 p-4 rounded-card"
                   style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--admin-line)' }}>
                <div className="grid gap-3">
                  <input
                    type="text"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    placeholder="Sujet"
                    className="admin-input"
                  />
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Votre réponse…"
                    rows={6}
                    className="admin-input resize-y"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-editorial italic text-[11px]"
                       style={{ color: 'var(--admin-text-mute)' }}>
                      La réponse est consignée dans ce fil. Pour l’envoi externe au client, utilisez « Client mail ».
                    </p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setReplyOpen(false)}
                              className="px-3 py-1.5 text-[11px] font-sans uppercase tracking-wider rounded-card"
                              style={{ color: 'var(--admin-text-mute)', border: '1px solid var(--admin-line)' }}>
                        <X size={11} className="inline mr-1" /> Annuler
                      </button>
                      <button type="button" onClick={submitReply} disabled={replyBusy}
                              className="px-3 py-1.5 text-[11px] font-sans uppercase tracking-wider rounded-card disabled:opacity-50"
                              style={{ background: 'var(--admin-accent)', color: 'var(--admin-bg-deep)' }}>
                        <Check size={11} className="inline mr-1" /> Envoyer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transfer composer */}
            {transferOpen && (
              <div className="mt-4 p-4 rounded-card"
                   style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--admin-line)' }}>
                <div className="grid gap-3">
                  <div>
                    <label className="block font-sans uppercase tracking-[0.3em] text-[10px] mb-1"
                           style={{ color: 'var(--admin-accent)' }}>
                      Vers
                    </label>
                    <select value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)}
                            className="admin-input">
                      <optgroup label="Départements">
                        {DEPARTMENTS.map((d) => (
                          <option key={d.id} value={`dept:${d.id}`}>{d.labelFR} ({d.responsibleFR})</option>
                        ))}
                      </optgroup>
                    </select>
                    <p className="mt-1.5 font-editorial italic text-[11px]"
                       style={{ color: 'var(--admin-text-mute)' }}>
                      Transférer vers une boîte personnelle viendra ensuite — lié à la collection adminRoles.
                    </p>
                  </div>
                  <textarea
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="Note pour le destinataire (optionnel)…"
                    rows={3}
                    className="admin-input resize-y"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setTransferOpen(false)}
                            className="px-3 py-1.5 text-[11px] font-sans uppercase tracking-wider rounded-card"
                            style={{ color: 'var(--admin-text-mute)', border: '1px solid var(--admin-line)' }}>
                      <X size={11} className="inline mr-1" /> Annuler
                    </button>
                    <button type="button" onClick={submitTransfer} disabled={transferBusy}
                            className="px-3 py-1.5 text-[11px] font-sans uppercase tracking-wider rounded-card disabled:opacity-50"
                            style={{ background: 'var(--admin-accent)', color: 'var(--admin-bg-deep)' }}>
                      <Forward size={11} className="inline mr-1" /> Transférer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default MessagesSection;
