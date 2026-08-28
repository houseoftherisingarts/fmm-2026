import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { suivreSansPub } from '../../firebase/sansPub';

// ─── La bannière publicitaire du mur social ──────────────────────────
// Alex, 2026-08-27 : une pub AdSense sur le côté du mur. Le bloc ne se
// rend que si VITE_ADSENSE_SLOT_MUR est posé (compte en cours
// d'approbation), et jamais pour un compte marqué sans publicité.
declare global { interface Window { adsbygoogle?: unknown[] } }
const CLIENT_ADSENSE = 'ca-pub-7365982984401895';

const PubMur: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const slot = import.meta.env.VITE_ADSENSE_SLOT_MUR;
  const [sansPub, setSansPub] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user?.uid) { setSansPub(false); return; }
    return suivreSansPub(user.uid, setSansPub);
  }, [user?.uid]);
  const visible = Boolean(slot) && sansPub === false;
  useEffect(() => {
    if (!visible) return;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* bloqueur */ }
  }, [visible]);
  if (!visible) return null;
  return (
    <aside className="rounded-lg-card p-3" style={{ background: 'rgba(26,5,11,0.45)', border: '1px solid rgba(244,239,227,0.1)' }}>
      <span className="witcher-stat-label block mb-2">{fr ? 'Publicité' : 'Advertisement'}</span>
      <ins className="adsbygoogle" style={{ display: 'block', width: '100%', minHeight: 250 }}
           data-ad-client={CLIENT_ADSENSE} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
};

export default PubMur;
