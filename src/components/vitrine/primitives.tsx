import React from 'react';

// ─── Les briques de l'atelier des vitrines ───────────────────────────
// Le verre et les boutons du site, réunis ici pour que les trois
// fichiers de l'atelier partagent le même dessin.

export const classeChamp =
  'w-full bg-black/30 border border-white/15 rounded-card px-3 py-2 font-sans text-sm text-ivory placeholder:text-ivory-soft/50 outline-none focus:border-brass/70 transition';

export const Carte: React.FC<{
  icone: React.ComponentType<{ size?: number; className?: string }>;
  eyebrow: string; titre: string; aide?: string; children: React.ReactNode; id?: string;
}> = ({ icone: Icone, eyebrow, titre, aide, children, id }) => (
  <section id={id} className="glass-light rounded-lg-card p-6 md:p-8">
    <div className="flex items-start gap-4 mb-5">
      <div className="w-11 h-11 rounded-card bg-brass/15 border border-brass/40 flex items-center justify-center shrink-0">
        <Icone size={20} className="text-brass" />
      </div>
      <div className="min-w-0">
        <p className="font-editorial text-brass uppercase tracking-[0.3em] text-xs mb-1">{eyebrow}</p>
        <h2 className="font-display title-medieval text-xl md:text-2xl text-ivory">{titre}</h2>
        {aide && <p className="font-editorial text-sm text-ivory-soft leading-relaxed mt-2">{aide}</p>}
      </div>
    </div>
    {children}
  </section>
);

export const Champ: React.FC<{ label: string; aide?: string; children: React.ReactNode }> = ({ label, aide, children }) => (
  <label className="block">
    <span className="block font-sans text-xs uppercase tracking-wider text-ivory-soft mb-1.5">{label}</span>
    {children}
    {aide && <span className="block font-editorial text-xs text-ivory-soft/70 mt-1">{aide}</span>}
  </label>
);

type BoutonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const BoutonOr: React.FC<BoutonProps> = ({ className = '', children, ...rest }) => (
  <button type="button" {...rest}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);

export const BoutonSobre: React.FC<BoutonProps> = ({ className = '', children, ...rest }) => (
  <button type="button" {...rest}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);
