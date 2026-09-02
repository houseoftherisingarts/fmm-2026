import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Reply, Forward, ChevronRight, X, Check } from 'lucide-react';
import { Card, Badge, fmtDate } from '../primitives';
import { DEPARTMENTS } from '../../../content/departments';
import type { MailMessage, MailRecipient } from '../../../firebase/mail';

// ─── Une ligne de courrier, dépliable ────────────────────────────────
// Sortie de MessagesSection pour garder les deux fichiers lisibles. La
// ligne montre l'essentiel, et le dépli donne le corps du message avec
// les trois gestes : répondre dans le fil, transférer vers une autre
// boîte, ou ouvrir son propre client de courriel.

/** Un createdAt Firestore, une chaîne ISO ou rien : toujours une Date. */
export function enDate(v: unknown): Date {
  if (v && typeof v === 'object' && 'toDate' in (v as object)) {
    return (v as { toDate: () => Date }).toDate();
  }
  return typeof v === 'string' ? new Date(v) : new Date(0);
}

const MessageRow: React.FC<{
  message: MailMessage;
  /** Nom de la boîte où le message est tombé. Affiché seulement dans la
   *  vue « Toutes les boîtes », où l'aiguillage doit se lire d'un œil. */
  boiteLabel?: string;
  isOpen: boolean;
  onToggle: () => void;
  onReply: (subject: string, body: string) => Promise<void>;
  onTransfer: (recipient: MailRecipient, note: string) => Promise<void>;
}> = ({ message: m, boiteLabel, isOpen, onToggle, onReply, onTransfer }) => {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replySubject, setReplySubject] = useState(`Re: ${m.subject}`);
  const [replyBusy, setReplyBusy] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string>(`dept:${DEPARTMENTS[0].id}`);
  const [transferNote, setTransferNote] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);

  const dt = enDate(m.createdAt);

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
          {boiteLabel && <Badge tone="neutral">{boiteLabel}</Badge>}
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
                      Transférer vers une boîte personnelle viendra ensuite, lié à la collection adminRoles.
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

export default MessageRow;
