import React, { useEffect, useState } from 'react';
import { ShieldOff, Heart, Loader2, Check, Coins } from 'lucide-react';
import { ouvrirLienSansPub, suivreSansPub, DONS_PROPOSES } from '../../firebase/sansPub';

// ─── « Retirer les publicités, paiement unique » ─────────────────────
// Alex, 2026-08-27 : un paiement unique de 10 à 100 $ au festival, et
// le compte ne voit plus jamais de publicité. Le paiement passe par
// Square (lien créé par la fonction sansPubLien), le webhook marque le
// compte. Alex, 2026-08-28 : plus un seul mot « don » dans ce panneau,
// à sa demande.
const SansPubPanel: React.FC<{ uid: string; courriel?: string; lang: 'FR' | 'EN' }> = ({ uid, courriel, lang }) => {
  const fr = lang === 'FR';
  const [sansPub, setSansPub] = useState<boolean | null>(null);
  const [montant, setMontant] = useState(25);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const merci = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('sansPub') === 'merci';
  useEffect(() => suivreSansPub(uid, setSansPub), [uid]);

  const payer = async () => {
    setEnvoi(true); setErreur(null);
    try { window.location.href = await ouvrirLienSansPub({ uid, montant, courriel }); }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)); setEnvoi(false); }
  };

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-5 pb-2" style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
        <span className="witcher-stat-label inline-flex items-center gap-2">
          <ShieldOff size={13} /> {fr ? 'Retirer les publicités, paiement unique' : 'Remove the ads, one-time payment'}
        </span>
        {sansPub && (
          <span className="inline-flex items-center gap-1.5 font-sans uppercase tracking-[0.18em] text-[10px]" style={{ color: 'var(--color-amber-glow)' }}>
            <Check size={12} /> {fr ? 'Compte sans publicité, à vie' : 'Ad-free account, for life'}
          </span>
        )}
      </div>
      {sansPub ? (
        <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
          {fr
            ? 'Merci. Ce paiement soutient le festival, et ce compte ne verra plus jamais de publicité.'
            : 'Thank you. This payment supports the festival, and this account will never see an ad again.'}
        </p>
      ) : (
        <>
          {merci && sansPub === false && (
            <p className="font-sans text-xs mb-3" style={{ color: 'var(--color-amber-glow)' }}>
              {fr ? 'Paiement reçu : le compte se marque dans la minute.' : 'Payment received: the account is flagged within the minute.'}
            </p>
          )}
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-5">
            {fr
              ? 'Enlevez les publicités pour toujours en soutenant le festival médiéval d’un don unique. Vous choisissez le montant, de 10 à 100 dollars, et ce compte n’en verra plus jamais.'
              : 'Remove ads forever by supporting the medieval festival with a one-time gift. You choose the amount, from 10 to 100 dollars, and this account will never see one again.'}
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {DONS_PROPOSES.map((d) => (
              <button key={d} type="button" onClick={() => setMontant(d)} aria-pressed={montant === d}
                      className="px-4 py-2 rounded-full font-sans text-sm transition-colors"
                      style={{ border: `1px solid ${montant === d ? '#D8B05A' : 'rgba(244,239,227,0.2)'}`, background: montant === d ? 'rgba(216,176,90,0.16)' : 'transparent', color: montant === d ? '#F4EFE3' : 'rgba(244,239,227,0.6)' }}>
                {d} $
              </button>
            ))}
            <label className="inline-flex items-center gap-2 font-sans text-xs text-ivory-soft/70">
              {fr ? 'ou' : 'or'}
              <input type="number" min={10} max={100} value={montant}
                     onChange={(e) => setMontant(Math.min(100, Math.max(10, Number(e.target.value) || 10)))}
                     className="w-20 px-3 py-2 rounded-card font-sans text-sm text-ivory"
                     style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(232,177,74,0.22)' }} />
              $
            </label>
          </div>
          <button type="button" onClick={payer} disabled={envoi}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
            {envoi ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} />}
            {fr ? `Soutenir le festival · ${montant} $` : `Support the festival · $${montant}`}
          </button>
          {/* La monnaie locale de la Petite Nation (Alex, 2026-08-28) :
              le chemin est annoncé, le paiement ouvrira plus tard. */}
          <div className="mt-4">
            <button type="button" disabled
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-card font-sans uppercase tracking-wider text-xs cursor-not-allowed"
                    style={{ border: '1px dashed rgba(216,176,90,0.45)', color: 'rgba(244,239,227,0.6)', background: 'rgba(216,176,90,0.06)' }}>
              <Coins size={14} style={{ color: '#D8B05A' }} />
              {fr ? 'Payer mon espace VIP en petite monnaie' : 'Pay for my VIP space in local currency'}
            </button>
            <p className="font-sans text-[10px] mt-1.5 uppercase tracking-[0.2em]" style={{ color: '#D8B05A' }}>
              {fr ? 'À venir bientôt' : 'Coming soon'}
            </p>
          </div>

          {erreur && <p className="mt-3 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
        </>
      )}
    </section>
  );
};

export default SansPubPanel;
