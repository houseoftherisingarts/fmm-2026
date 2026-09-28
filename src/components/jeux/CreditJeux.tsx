// ─── La mention au pied des jeux ────────────────────────────────────
// Alex, 2026-08-24 : les jeux sont développés par Vexel Webstudio, qui
// est lui-même un projet du Salon des Inconnus. Les deux maisons portent
// leur logo.
import React from 'react';

const CreditJeux: React.FC<{ lang?: 'fr' | 'en'; dense?: boolean }> = ({ lang = 'fr', dense = false }) => {
  const fr = lang !== 'en';
  return (
    <footer className={`w-full px-6 text-center ${dense ? 'py-3' : 'py-5'}`}>
      <p className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] leading-relaxed tracking-[0.12em] uppercase text-amber-200/40">
        <span>{fr ? 'Jeux développés par' : 'Games built by'}</span>
        <a
          href="https://vexel-webstudio.web.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-amber-200/70 underline-offset-4 hover:text-amber-100 hover:underline transition-colors"
        >
          <img src="/logos/vexel.webp" alt="" aria-hidden width={17} height={16}
               className="h-4 w-auto opacity-75" />
          Vexel Webstudio
        </a>
        <span>{fr ? ', un projet du' : ', a project of'}</span>
        <a
          href="https://www.lesalondesinconnus.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-amber-200/70 underline-offset-4 hover:text-amber-100 hover:underline transition-colors"
        >
          <img src="/logos/salon.webp" alt="" aria-hidden width={6} height={16}
               className="h-4 w-auto opacity-75" />
          {fr ? 'Salon des Inconnus' : 'Le Salon des Inconnus'}
        </a>
        <span>.</span>
      </p>
    </footer>
  );
};

export default CreditJeux;
