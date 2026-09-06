import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import PortefeuillePanel from '../components/compte/PortefeuillePanel';

// ─── /propositionCAtest ──────────────────────────────────────────────
// Alex, 2026-09-06 : la section « Votez avec votre portefeuille » se
// montre au conseil avant d'entrer dans l'espace membre. Elle vit donc
// ici, derrière un mot de passe partagé, et la page reste hors des
// menus et hors des moteurs de recherche (SEO noindex).
//
// Le mot de passe ne protège rien de sensible : il évite qu'un visiteur
// tombe dessus par hasard, rien de plus. La vraie garde est ailleurs :
// les mises passent par une Cloud Function qui vérifie le compte et la
// bourse, donc franchir cette porte-ci ne donne aucun pouvoir.
const MOT_DE_PASSE = '12345';
const CLE = 'fmm.propositionCA';

const PropositionCATestPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';

  const [ouvert, setOuvert] = useState(() => {
    try { return sessionStorage.getItem(CLE) === '1'; } catch { return false; }
  });
  const [saisie, setSaisie] = useState('');
  const [refus, setRefus] = useState(false);

  const ouvrir = (e: React.FormEvent) => {
    e.preventDefault();
    if (saisie.trim() !== MOT_DE_PASSE) { setRefus(true); return; }
    try { sessionStorage.setItem(CLE, '1'); } catch { /* navigation privée */ }
    setOuvert(true);
  };

  if (!ouvert) {
    return (
      <main className="min-h-screen text-ivory flex items-center justify-center px-4">
        <SEO title={fr ? 'Proposition' : 'Proposal'} noindex />
        <Brume />
        <form onSubmit={ouvrir} className="glass-light rounded-lg-card p-9 w-full max-w-sm text-center">
          <span className="witcher-tile mx-auto mb-6 block" style={{ width: 46, height: 46 }}>
            <span className="witcher-tile-inner" style={{ color: 'var(--sk-gilt)' }}><KeyRound size={16} /></span>
          </span>
          <p className="font-display text-xl mb-6" style={{ color: 'var(--color-bone)', fontWeight: 400 }}>
            {fr ? 'Cette page attend un mot de passe.' : 'This page is waiting for a password.'}
          </p>
          <input
            type="password" value={saisie} autoFocus
            onChange={(e) => { setSaisie(e.target.value); setRefus(false); }}
            className="witcher-input font-sans text-center"
            aria-label={fr ? 'Mot de passe' : 'Password'}
          />
          {refus && (
            <p role="alert" className="font-sans text-xs mt-3" style={{ color: '#E08A6E' }}>
              {fr ? 'Ce mot de passe ne va pas.' : 'That password does not work.'}
            </p>
          )}
          <button type="submit" className="witcher-prompt mt-6 mx-auto" data-primary="true">
            <span className="witcher-prompt-glyph"><span>A</span></span>
            {fr ? 'Entrer' : 'Enter'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-ivory pt-28 pb-20 md:pt-36 px-4">
      <SEO title={fr ? 'Votez avec votre portefeuille' : 'Vote with your wallet'} noindex />
      <Brume />
      <div className="relative max-w-5xl mx-auto">
        <PortefeuillePanel lang={lang} />
      </div>
    </main>
  );
};

export default PropositionCATestPage;
