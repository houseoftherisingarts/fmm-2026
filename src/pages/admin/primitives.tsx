import React, { useRef, useState } from 'react';

// ─── FMM admin primitives ─────────────────────────────────────────
// Mirrors the architectural pattern from the Krystine admin (Card,
// Input, Buttons, ToggleSwitch, EmptyState, downloadCsv) re-themed in
// the midnight + brass design system.

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`admin-card ${className}`}>{children}</div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`admin-input ${props.className || ''}`}
  />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className={`admin-input resize-y ${props.className || ''}`}
  />
);

export const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <label
    className={`block font-sans uppercase tracking-[0.3em] text-[10px] font-semibold mb-1.5 ${className}`}
    style={{ color: 'var(--admin-accent)' }}
  >
    {children}
  </label>
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`admin-cta ${props.className || ''}`}
  />
);

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`admin-ghost ${props.className || ''}`}
  />
);

export const DangerButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`admin-danger ${props.className || ''}`}
  />
);

export const ToggleSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <label className="inline-flex items-center gap-3 cursor-pointer select-none">
    <span
      onClick={() => onChange(!checked)}
      className="w-10 h-6 relative transition-colors"
      style={{
        borderRadius: 999,
        background: checked
          ? 'linear-gradient(180deg, var(--admin-brass-hi) 0%, var(--admin-accent) 48%, var(--admin-brass-lo) 100%)'
          : 'rgba(4, 8, 12, 0.62)',
        border: checked ? '1px solid var(--admin-accent-line)' : '1px solid var(--admin-line)',
        boxShadow: checked
          ? 'inset 0 1px 0 var(--admin-lit), 0 0 14px -5px color-mix(in oklab, var(--admin-accent), transparent 45%)'
          : 'inset 0 1px 2px rgba(0,0,0,0.5)',
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 transition-transform"
        style={{
          borderRadius: 999,
          left: checked ? '1.1rem' : '2px',
          background: checked ? '#080D11' : 'var(--admin-text-soft)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}
      />
    </span>
    {label && (
      <span className="text-sm font-sans" style={{ color: 'var(--admin-text)' }}>
        {label}
      </span>
    )}
  </label>
);

// Empty state: the one place in the admin that is genuinely prose
// rather than chrome, so it gets the editorial face (Cormorant
// Garamond) instead of the tracked sans used everywhere else.
export const EmptyState: React.FC<{ icon?: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="py-16 flex flex-col items-center text-center" style={{ color: 'var(--admin-text-mute)' }}>
    {Icon && (
      <span
        aria-hidden
        className="mb-5 flex items-center justify-center"
        style={{
          width: 58, height: 58, borderRadius: 15,
          border: '1px solid var(--admin-line)',
          background: 'rgba(196, 214, 230, 0.03)',
          boxShadow: 'inset 0 1px 0 var(--admin-sheen)',
          color: 'var(--admin-text-mute)',
        }}
      >
        <Icon size={26} />
      </span>
    )}
    <p className="admin-prose">{children}</p>
  </div>
);

export const Badge: React.FC<{ tone?: 'pending' | 'accepted' | 'rejected' | 'waitlist' | 'neutral' | 'info'; children: React.ReactNode }> = ({ tone = 'neutral', children }) => {
  const styleByTone: Record<string, React.CSSProperties> = {
    pending:  { color: '#F4B95A', background: 'rgba(244, 185, 90, 0.08)',  borderColor: 'rgba(244, 185, 90, 0.45)' },
    accepted: { color: '#5FD3A2', background: 'rgba(95, 211, 162, 0.08)',  borderColor: 'rgba(95, 211, 162, 0.45)' },
    rejected: { color: '#FCA5B0', background: 'rgba(252, 165, 176, 0.08)', borderColor: 'rgba(252, 165, 176, 0.45)' },
    waitlist: { color: '#E0BE6A', background: 'rgba(224, 190, 106, 0.08)', borderColor: 'rgba(224, 190, 106, 0.45)' },
    info:     { color: 'var(--admin-accent)', background: 'rgba(127, 176, 232, 0.10)', borderColor: 'rgba(127, 176, 232, 0.45)' },
    neutral:  { color: 'var(--admin-text-soft)', background: 'rgba(143, 161, 188, 0.06)', borderColor: 'var(--admin-line)' },
  };
  return (
    <span className="admin-badge" style={styleByTone[tone]}>
      {children}
    </span>
  );
};

// CSV export: handy for bénévole/marchand exports.
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// fmtDate: handles Firestore Timestamp + plain Date.
export function fmtDate(ts: any, opts?: Intl.DateTimeFormatOptions): string {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-CA', opts || { year: 'numeric', month: 'short', day: 'numeric' });
}

// useFileUpload: staged for when /admin Médiathèque wires Firebase
// Storage. For now it's a placeholder that returns a data: URL.
export const ImageUpload: React.FC<{ value?: string; onChange: (url: string) => void }> = ({ value, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => { onChange(String(reader.result)); setBusy(false); };
    reader.readAsDataURL(f);
  };

  return (
    <div>
      <div onClick={() => fileRef.current?.click()}
        className="relative w-full aspect-[16/10] rounded-card border-2 border-dashed border-ivory-soft/20 bg-midnight-deep/40 cursor-pointer flex items-center justify-center overflow-hidden hover:border-brass transition">
        {value ? <img decoding="async" src={value} alt="" className="absolute inset-0 w-full h-full object-cover" /> : (
          <p className="text-[11px] uppercase tracking-widest text-ivory-soft/60">Cliquer pour téléverser</p>
        )}
        {busy && <div className="absolute inset-0 bg-midnight-deep/60 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent border-brass animate-spin" />
        </div>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-[11px] text-blush hover:underline mt-2">
          Retirer
        </button>
      )}
    </div>
  );
};
