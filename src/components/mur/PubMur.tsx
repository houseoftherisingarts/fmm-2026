import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { suivreSansPub } from '../../firebase/sansPub';
import { ouvrirBanniereConsentement, useConsentement } from '../../lib/consentement';

// ─── La bannière publicitaire du mur social ──────────────────────────
// Alex, 2026-08-27 : une pub AdSense sur le côté du mur. Le bloc ne se
// rend que si VITE_ADSENSE_SLOT_MUR est posé (compte en cours
// d'approbation), et jamais pour un compte marqué sans publicité.
//
// Loi 25, article 8.1 : le bloc ne se monte pas non plus tant que la
// finalité « publicité » n'a pas été acceptée dans la bannière de
// consentement. À la place, la même case porte une phrase et le chemin
// pour revenir sur ce choix, de sorte que la colonne garde sa forme.
declare global { interface Window { adsbygoogle?: unknown[] } }
const CLIENT_ADSENSE = 'ca-pub-7365982984401895';

const PubMur: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const slot = import.meta.env.VITE_ADSENSE_SLOT_MUR;
  const consentement = useConsentement();
  const pubAcceptee = consentement?.publicite === true;
  const [sansPub, setSansPub] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user?.uid) { setSansPub(false); return; }
    return suivreSansPub(user.uid, setSansPub);
  }, [user?.uid]);
  const place = Boolean(slot) && sansPub === false;
  const visible = place && pubAcceptee;
  useEffect(() => {
    if (!visible) return;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* bloqueur */ }
  }, [visible]);
  if (!place) return null;
  return (
    <aside className="rounded-lg-card p-3" style={{ background: 'rgba(var(--sk-deep-rgb),0.45)', border: '1px solid rgba(var(--sk-parchment-rgb),0.1)' }}>
      <span className="witcher-stat-label block mb-2">{fr ? 'Publicité' : 'Advertisement'}</span>
      {visible ? (
        <ins className="adsbygoogle" style={{ display: 'block', width: '100%', minHeight: 120 }}
             data-ad-client={CLIENT_ADSENSE} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
      ) : (
        <div style={{ minHeight: 120 }} className="flex flex-col justify-center gap-2">
          <p className="font-editorial text-[13px] leading-relaxed opacity-75">
            {fr
              ? 'Cette place reste vide tant que vous n\'avez pas accepté la publicité. C\'est elle qui paie une partie du festival.'
              : 'This spot stays empty until you accept advertising. It pays for part of the festival.'}
          </p>
          <button
            type="button"
            onClick={ouvrirBanniereConsentement}
            className="self-start font-sans text-[11px] uppercase tracking-wider underline underline-offset-4 opacity-80 hover:opacity-100 transition"
          >
            {fr ? 'Revoir mes choix' : 'Review my choices'}
          </button>
        </div>
      )}
    </aside>
  );
};

export default PubMur;
