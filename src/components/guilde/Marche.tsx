import React from 'react';
import { Store } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import type { Guilde } from '../../firebase/guildes';

// ─── Le marché ────────────────────────────────────────────────────────
// Panneau en chantier. Un autre agent le remplit sans toucher aux
// fichiers voisins : la signature ci-dessous est celle des six onglets
// (contrat CLAN-MONNAIE-CONTRAT.md, 6 septembre 2026).

const Marche: React.FC<{ guilde: Guilde; uid: string | null; estChef: boolean }> = () => {
  const { lang } = useUI();
  const fr = lang === 'FR';

  return (
    <section className="glass-light rounded-lg-card p-8 text-center">
      <span
        aria-hidden
        className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
        style={{
          background: 'rgba(var(--sk-gilt-rgb),0.12)',
          border: '1px solid rgba(var(--sk-gilt-rgb),0.35)',
          color: 'var(--sk-gilt)',
        }}
      >
        <Store size={20} />
      </span>
      <p className="font-display text-xl text-ivory mb-2">{fr ? 'Le marché' : 'The market'}</p>
      <p className="font-editorial text-base text-ivory-soft leading-relaxed max-w-md mx-auto">
        {fr ? 'Les annonces réservées au groupe s’ouvrent ici sous peu.' : 'The group-only listings open here shortly.'}
      </p>
    </section>
  );
};

export default Marche;
