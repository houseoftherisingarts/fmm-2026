import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bug, X, Check } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { addBugReport, CATEGORY_LABELS, type BugCategory } from '../../firebase/bugReports';

// ─── Bug report modal ──────────────────────────────────────────────
// Opened from the footer "Signaler un bug" button. Asks for the
// specific nature of the bug, writes it to Firestore (bugReports) and
// best-effort emails a copy to the festival inbox. Bilingual.

const T = {
  FR: {
    title: 'Signaler un bug',
    intro: 'Aidez-nous à garder le site impeccable. Décrivez ce qui cloche.',
    category: 'Nature du problème',
    page: 'Où ça se passe',
    pagePh: 'Page ou section concernée',
    desc: "Qu'est-ce qui s'est passé ?",
    descPh: 'Décrivez le bug le plus précisément possible…',
    expected: 'À quoi vous attendiez-vous ? (optionnel)',
    expectedPh: 'Ce qui aurait dû se produire…',
    email: 'Votre courriel (optionnel)',
    emailPh: 'pour vous recontacter au besoin',
    send: 'Envoyer le signalement',
    sending: 'Envoi…',
    thanksTitle: 'Merci !',
    thanksBody: 'Votre signalement est bien reçu. Nous nous en occupons.',
    close: 'Fermer',
    errRequired: 'Décrivez le problème avant d’envoyer.',
    errSend: 'Échec de l’envoi. Réessayez dans un instant.',
  },
  EN: {
    title: 'Report a bug',
    intro: 'Help us keep the site flawless. Tell us what went wrong.',
    category: 'Type of issue',
    page: 'Where it happens',
    pagePh: 'Page or section involved',
    desc: 'What happened?',
    descPh: 'Describe the bug as precisely as you can…',
    expected: 'What did you expect? (optional)',
    expectedPh: 'What should have happened…',
    email: 'Your email (optional)',
    emailPh: 'so we can follow up if needed',
    send: 'Send report',
    sending: 'Sending…',
    thanksTitle: 'Thank you!',
    thanksBody: 'Your report came through. We’re on it.',
    close: 'Close',
    errRequired: 'Describe the problem before sending.',
    errSend: 'Could not send. Please try again in a moment.',
  },
} as const;

const CATEGORIES: BugCategory[] = ['affichage', 'lien', 'formulaire', 'performance', 'contenu', 'autre'];

interface Props {
  open: boolean;
  onClose: () => void;
}

const BugReportModal: React.FC<Props> = ({ open, onClose }) => {
  const { lang } = useUI();
  const t = T[lang];

  const [category, setCategory] = useState<BugCategory>('affichage');
  const [page, setPage] = useState('');
  const [description, setDescription] = useState('');
  const [expected, setExpected] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Prefill "where" with the current path each time the modal opens.
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      setPage(window.location.pathname + window.location.hash);
    }
  }, [open]);

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const reset = () => {
    setCategory('affichage'); setPage(''); setDescription('');
    setExpected(''); setEmail(''); setStatus('idle'); setError(null);
  };

  const handleClose = () => { onClose(); setTimeout(reset, 300); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (description.trim().length < 3) { setError(t.errRequired); return; }
    setStatus('sending');
    try {
      await addBugReport({
        category, page, description, lang,
        ...(expected.trim() ? { expected } : {}),
        ...(email.trim() ? { email } : {}),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        viewport: typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : undefined,
      });
      setStatus('done');
    } catch (err) {
      console.warn('[bugReport] submit failed', err);
      setStatus('idle');
      setError(t.errSend);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog" aria-modal="true" aria-label={t.title}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(8, 3, 6, 0.82)', backdropFilter: 'blur(4px)' }}
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: 'linear-gradient(160deg, #140a10 0%, #0c0509 100%)',
              border: '1px solid rgba(232, 177, 74, 0.32)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(232,177,74,0.06)',
              clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
            }}
          >
            <button
              type="button" onClick={handleClose} aria-label={t.close}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-bone)', opacity: 0.6 }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
            >
              <X size={18} />
            </button>

            <div className="px-6 md:px-8 py-7 md:py-8">
              {status === 'done' ? (
                <div className="text-center py-10">
                  <span
                    className="inline-flex items-center justify-center w-14 h-14 mb-5"
                    style={{ border: '1px solid rgba(232,177,74,0.4)', color: 'var(--color-amber-glow)' }}
                  >
                    <Check size={26} />
                  </span>
                  <h3 className="font-display title-medieval text-2xl mb-2" style={{ color: 'var(--color-bone)' }}>
                    {t.thanksTitle}
                  </h3>
                  <p className="font-editorial italic text-base mb-7" style={{ color: 'var(--color-bone)', opacity: 0.75 }}>
                    {t.thanksBody}
                  </p>
                  <button
                    type="button" onClick={handleClose}
                    className="font-sans uppercase tracking-[0.3em] text-xs px-6 py-3 transition-colors"
                    style={{ color: 'var(--color-amber-glow)', border: '1px solid rgba(232,177,74,0.4)' }}
                  >
                    {t.close}
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span style={{ color: 'var(--color-amber-glow)' }}><Bug size={18} /></span>
                    <h3 className="font-display title-medieval text-2xl" style={{ color: 'var(--color-bone)' }}>
                      {t.title}
                    </h3>
                  </div>
                  <p className="font-editorial italic text-sm mb-6" style={{ color: 'var(--color-bone)', opacity: 0.7 }}>
                    {t.intro}
                  </p>

                  {/* Category */}
                  <FieldLabel>{t.category}</FieldLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                    {CATEGORIES.map((c) => {
                      const active = category === c;
                      return (
                        <button
                          key={c} type="button" onClick={() => setCategory(c)}
                          className="px-3 py-2 text-left font-sans text-xs transition-colors"
                          style={{
                            color: active ? 'var(--color-amber-glow)' : 'var(--color-bone)',
                            background: active ? 'rgba(232,177,74,0.12)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${active ? 'rgba(232,177,74,0.55)' : 'rgba(232,177,74,0.18)'}`,
                          }}
                        >
                          {CATEGORY_LABELS[c][lang]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Where */}
                  <FieldLabel>{t.page}</FieldLabel>
                  <FieldInput value={page} onChange={setPage} placeholder={t.pagePh} className="mb-5" />

                  {/* Description (required) */}
                  <FieldLabel>{t.desc}</FieldLabel>
                  <textarea
                    value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.descPh} rows={4} required
                    className="w-full px-4 py-3 text-sm font-sans resize-y mb-5 focus:outline-none transition-colors"
                    style={inputStyle}
                    onFocus={focusBorder} onBlur={blurBorder}
                  />

                  {/* Expected (optional) */}
                  <FieldLabel>{t.expected}</FieldLabel>
                  <textarea
                    value={expected} onChange={(e) => setExpected(e.target.value)}
                    placeholder={t.expectedPh} rows={2}
                    className="w-full px-4 py-3 text-sm font-sans resize-y mb-5 focus:outline-none transition-colors"
                    style={inputStyle}
                    onFocus={focusBorder} onBlur={blurBorder}
                  />

                  {/* Email (optional) */}
                  <FieldLabel>{t.email}</FieldLabel>
                  <FieldInput value={email} onChange={setEmail} placeholder={t.emailPh} type="email" className="mb-5" />

                  {error && (
                    <p className="font-sans text-xs mb-4" style={{ color: '#FCA5B0' }}>{error}</p>
                  )}

                  <button
                    type="submit" disabled={status === 'sending'}
                    className="w-full font-sans uppercase tracking-[0.25em] text-xs py-3.5 transition-all disabled:opacity-60"
                    style={{
                      color: '#140a10', background: 'var(--color-amber-glow)',
                      borderRadius: 12,
                    }}
                  >
                    {status === 'sending' ? t.sending : t.send}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

const inputStyle: React.CSSProperties = {
  color: 'var(--color-bone)',
  background: 'rgba(10, 2, 7, 0.6)',
  border: '1px solid rgba(232, 177, 74, 0.3)',
};
const focusBorder = (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = 'var(--color-amber-glow)'; };
const blurBorder  = (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = 'rgba(232, 177, 74, 0.3)'; };

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label
    className="block font-sans uppercase tracking-[0.28em] text-[10px] mb-2"
    style={{ color: 'var(--color-amber-glow)', opacity: 0.85 }}
  >
    {children}
  </label>
);

const FieldInput: React.FC<{
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}> = ({ value, onChange, placeholder, type = 'text', className = '' }) => (
  <input
    type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className={`w-full px-4 py-3 text-sm font-sans focus:outline-none transition-colors ${className}`}
    style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
  />
);

export default BugReportModal;
