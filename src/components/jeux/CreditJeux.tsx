// ─── La mention au pied des jeux ────────────────────────────────────
// Alex, 2026-08-23 : chaque jeu porte la même signature, tout en bas de
// sa page, avec le chemin vers l'atelier qui l'a bâti.
import React from 'react';

const CreditJeux: React.FC<{ lang?: 'fr' | 'en' }> = ({ lang = 'fr' }) => {
  const fr = lang !== 'en';
  return (
    <footer className="w-full px-6 py-5 text-center">
      <p className="text-[11px] leading-relaxed tracking-[0.14em] uppercase text-amber-200/40">
        {fr ? 'Jeux développés par ' : 'Games built by '}
        <a
          href="https://www.lesalondesinconnus.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-200/70 underline-offset-4 hover:text-amber-100 hover:underline transition-colors"
        >
          {fr ? 'le Salon des Inconnus' : 'Le Salon des Inconnus'}
        </a>
        {fr ? ', avec ' : ', with '}
        <a
          href="https://vexel-webstudio.web.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-200/70 underline-offset-4 hover:text-amber-100 hover:underline transition-colors"
        >
          Vexel Webstudio
        </a>
        .
      </p>
    </footer>
  );
};

export default CreditJeux;
