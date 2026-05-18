import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, ArrowUpRight, Megaphone } from 'lucide-react';
import {
  subscribeMessages, sendMessage,
  type VendorMessage, type MessageRole, type ThreadKind,
} from '../../firebase/messages';

// Real-time messaging panel. Same component is mounted on both sides
// (admin row inside the CRM, and the person's own client space).
// Used for both vendor and bénévole threads — pass `threadKind`.

interface Props {
  /** UID of the person whose thread we're viewing (vendor or bénévole). */
  vendorUid:    string;
  currentUid:   string;
  currentName:  string;
  currentRole:  MessageRole;
  /** Which collection to namespace under. Defaults to 'vendor' for back-compat. */
  threadKind?:  ThreadKind;
  /** Optional surface tweaks. */
  height?: string;          // e.g. 'h-72'
  compact?: boolean;
  /** Title shown above the thread (defaults to FR/EN "Messages"). */
  title?: string;
  lang?: 'FR' | 'EN';
}

const MessageThread: React.FC<Props> = ({
  vendorUid, currentUid, currentName, currentRole,
  threadKind = 'vendor',
  height = 'h-80', compact = false, title, lang = 'FR',
}) => {
  const t = lang === 'FR' ? FR : EN;
  const [msgs, setMsgs]   = useState<VendorMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Realtime subscription
  useEffect(() => {
    const unsub = subscribeMessages(vendorUid, setMsgs, threadKind);
    return unsub;
  }, [vendorUid, threadKind]);

  // Auto-scroll to newest only if the user is already pinned to the bottom.
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true); setError(null);
    try {
      await sendMessage(vendorUid, {
        senderUid:  currentUid,
        senderRole: currentRole,
        senderName: currentName,
        body,
      }, threadKind);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const isMock = vendorUid.startsWith('mock-');

  return (
    <div className={`flex flex-col gap-3 ${compact ? '' : 'mt-2'}`}>
      <div className="flex items-center gap-2">
        <MessageCircle size={14} className="text-brass" />
        <p className="font-display title-medieval text-xs text-brass uppercase tracking-widest">
          {title || t.title}
        </p>
      </div>

      {/* Scrolling history */}
      <div
        ref={scrollRef}
        className={`relative ${height} overflow-y-auto px-3 py-3 bg-midnight-deep/50 border border-ivory-soft/15 rounded-card space-y-2.5`}
      >
        {isMock ? (
          <p className="font-editorial italic text-xs text-stone text-center py-6">
            {t.mockMode}
          </p>
        ) : msgs.length === 0 ? (
          <p className="font-editorial italic text-xs text-stone text-center py-6">
            {currentRole === 'admin' ? t.emptyAdmin : t.emptyVendor}
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {msgs.map((m) => {
              const mine = m.senderRole === currentRole;
              // Branded invitation: full-width card with eyebrow/title/CTA.
              if (m.kind === 'invitation' && m.meta) {
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-stretch"
                  >
                    <InvitationCard msg={m} fmtTs={fmtTs} />
                  </motion.div>
                );
              }
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] px-3.5 py-2 rounded-card text-sm font-sans whitespace-pre-wrap break-words ${
                    mine
                      ? 'bg-brass/20 border border-brass/40 text-ivory'
                      : 'bg-ivory/[0.04] border border-ivory-soft/15 text-ivory-soft'
                  }`}>
                    <p className="font-editorial italic text-[10px] uppercase tracking-widest mb-0.5 opacity-70">
                      {m.senderName}{m.senderRole === 'admin' ? ' · FMM' : ''}
                    </p>
                    {m.body}
                    <p className="font-editorial italic text-[10px] text-stone/70 mt-1">
                      {fmtTs(m.createdAt)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder={t.placeholder}
          disabled={isMock}
          rows={2}
          className="flex-1 /60 border px-3 py-2 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card resize-y min-h-[44px] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isMock || sending || !draft.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={12} /> {sending ? t.sending : t.send}
        </button>
      </form>

      {error && <p className="font-editorial italic text-xs text-blush">{error}</p>}
    </div>
  );
};

// ─── InvitationCard ─────────────────────────────────────────────────
// Branded full-width card that renders a `kind: 'invitation'` message
// from Jesse/FMM in the recipient's client space. Replaces the chat
// bubble for these messages so the recipient knows it's an official
// instruction broadcast.
const InvitationCard: React.FC<{
  msg: VendorMessage;
  fmtTs: (ts: VendorMessage['createdAt']) => string;
}> = ({ msg, fmtTs }) => {
  if (!msg.meta) return null;
  const isInternal = msg.meta.ctaHref?.startsWith('/');
  return (
    <article
      className="relative w-full rounded-card overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 60% 50% at 20% 0%, rgba(232,177,74,0.10), transparent 65%), linear-gradient(180deg, rgba(43,10,18,0.45) 0%, rgba(8,20,36,0.85) 100%)',
        border: '1px solid rgba(232, 177, 74, 0.35)',
        boxShadow:
          'inset 0 1px 0 rgba(232, 177, 74, 0.15), 0 12px 30px -12px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Brass hairline + small mark */}
      <div className="flex items-center gap-3 px-5 pt-4">
        <span className="w-7 h-7 rounded-full bg-brass/15 border border-brass/55 flex items-center justify-center text-brass shrink-0">
          <Megaphone size={12} />
        </span>
        <p className="font-editorial italic uppercase tracking-[0.35em] text-[10px] text-brass">
          {msg.meta.eyebrow || 'FMM · Communiqué'} · {msg.meta.year}
        </p>
      </div>

      <div className="px-5 md:px-6 pt-3 pb-5">
        <h4 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-3 leading-tight">
          {msg.meta.title}
        </h4>
        <p className="font-editorial text-[15px] text-ivory-soft leading-[1.7] whitespace-pre-wrap break-words mb-5">
          {msg.body}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {msg.meta.ctaLabel && msg.meta.ctaHref ? (
            <a
              href={msg.meta.ctaHref}
              target={isInternal ? undefined : '_blank'}
              rel={isInternal ? undefined : 'noopener noreferrer'}
              className="group inline-flex items-center gap-2 px-4 py-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[11px] font-semibold rounded-card hover:bg-brass-soft transition"
            >
              {msg.meta.ctaLabel}
              <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </a>
          ) : <span aria-hidden />}
          <p className="font-editorial italic text-[10px] uppercase tracking-[0.3em] text-ivory-soft/70">
            {msg.meta.signedBy || msg.senderName} · {fmtTs(msg.createdAt)}
          </p>
        </div>
      </div>
    </article>
  );
};

function fmtTs(ts: VendorMessage['createdAt']): string {
  if (!ts) return '…';
  const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as number);
  const today  = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const FR = {
  title: 'Messages avec FMM',
  emptyVendor: 'Aucun message pour l’instant. Écrivez à l’équipe FMM.',
  emptyAdmin:  'Aucun message échangé avec ce marchand.',
  placeholder: 'Écrire un message… (⌘/Ctrl+Entrée pour envoyer)',
  send:    'Envoyer',
  sending: 'Envoi…',
  mockMode: 'Mode démo — messagerie désactivée pour les profils factices.',
};
const EN: typeof FR = {
  title: 'Messages with FMM',
  emptyVendor: 'No messages yet. Drop a note to the FMM team.',
  emptyAdmin:  'No messages exchanged with this merchant.',
  placeholder: 'Write a message… (⌘/Ctrl+Enter to send)',
  send:    'Send',
  sending: 'Sending…',
  mockMode: 'Demo mode — messaging is disabled for mock profiles.',
};

export default MessageThread;
