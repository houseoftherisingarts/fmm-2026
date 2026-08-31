import React, { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { PACKS_MONTPELLOIS, acheterMontpelloisLien, type PackMontpellois } from '../../firebase/montpellois';
import PieceMontpellois from './PieceMontpellois';

// ─── Recharger ma bourse ─────────────────────────────────────────────
// Alex, 2026-08-31 : les Montpellois se gagnent en explorant le
// festival, et ici ils s'achètent. Trois lots, payés par carte, en
// dollars canadiens. Le clic ouvre une caisse Stripe (Cloud Function
// acheterMontpelloisLien) et le webhook remplit la bourse; le solde de
// l'en-tête suit tout seul par suivreMaBourse.
//
// Les prix affichés viennent de PACKS_MONTPELLOIS
// (src/firebase/montpellois.ts), miroir de la table serveur.

/** La pile de pièces : une pour cent, deux pour trois cents, trois pour
 *  cinq cents. La monnaie se voit avant que le chiffre se lise. */
const PileDePieces: React.FC<{ nombre: number }> = ({ nombre }) => (
  <div className="flex items-center justify-center h-[62px]" aria-hidden>
    {Array.from({ length: nombre }).map((_, i) => (
      <span
        key={i}
        className="block"
        style={{
          marginLeft: i ? -16 : 0,
          transform: `rotate(${(i - (nombre - 1) / 2) * 9}deg) translateY(${Math.abs(i - (nombre - 1) / 2) * 3}px)`,
          filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.55))',
        }}
      >
        <PieceMontpellois size={i === Math.floor(nombre / 2) ? 56 : 46} image />
      </span>
    ))}
  </div>
);

const RechargerBourse: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [annulee, setAnnulee] = useState(false);

  // Retour de la caisse sans paiement : la boutique le dit une fois,
  // puis le paramètre quitte l'adresse pour qu'un rafraîchissement ne
  // le répète pas. Le retour réussi, lui, appartient à la boutique
  // (l'affiche de la prise s'y lève).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('recharge') !== 'annulee') return;
    setAnnulee(true);
    params.delete('recharge');
    const reste = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (reste ? `?${reste}` : '') + window.location.hash);
  }, []);

  async function acheter(pack: PackMontpellois) {
    setErreur(null); setAnnulee(false); setEnCours(pack.id);
    try {
      await acheterMontpelloisLien(pack.id);
      // La caisse s'ouvre : la page part, le bouton reste en attente.
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      setEnCours(null);
    }
  }

  const leplus = PACKS_MONTPELLOIS[1];

  return (
    <section aria-labelledby="recharger-bourse">
      <p id="recharger-bourse" className="witcher-stat-label mb-4">
        <PieceMontpellois size={13} className="inline mr-1.5 -mt-0.5 align-middle" />
        {fr ? 'Recharger ma bourse' : 'Top up my purse'}
      </p>

      <p className="font-editorial text-sm md:text-base text-ivory-soft/85 leading-relaxed mb-5 max-w-2xl">
        {fr
          ? 'Les Montpellois se gagnent en explorant le festival, et ils s’achètent aussi. Le lot payé tombe dans votre bourse dès que la caisse confirme, et le solde en haut de cette page monte tout seul.'
          : 'Montpellois are earned by exploring the festival, and they can also be bought. A paid batch lands in your purse as soon as the till confirms, and the balance at the top of this page rises on its own.'}
      </p>

      <div className="grid sm:grid-cols-3 gap-4">
        {PACKS_MONTPELLOIS.map((pack, i) => {
          const vedette = pack.id === leplus.id;
          return (
            <div
              key={pack.id}
              className="glass-light rounded-lg-card p-6 flex flex-col items-center text-center relative"
              style={vedette ? {
                border: '1px solid rgba(var(--sk-gilt-rgb),0.55)',
                boxShadow: '0 0 40px rgba(var(--sk-gilt-rgb),0.10) inset, 0 18px 44px rgba(0,0,0,0.35)',
              } : undefined}
            >
              {vedette && (
                <span
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-sans uppercase tracking-[0.2em] text-[9px] whitespace-nowrap"
                  style={{ background: 'rgba(12,7,5,0.95)', border: '1px solid rgba(var(--sk-gilt-rgb),0.55)', color: 'var(--sk-gilt-lit)' }}
                >
                  {fr ? 'Le plus choisi' : 'Most chosen'}
                </span>
              )}

              <PileDePieces nombre={i + 1} />

              <p className="font-display title-medieval text-xl text-ivory mt-4">
                {pack.montpellois} Montpellois
              </p>
              <div className="divider-brass w-10 my-3" />
              <p className="font-display text-4xl md:text-[2.6rem] leading-none" style={{ color: 'var(--sk-gilt-lit)' }}>
                {fr ? `${pack.prixCAD} $` : `$${pack.prixCAD}`}
              </p>
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] mt-1.5 text-ivory-soft/50">
                {fr ? 'Dollars canadiens' : 'Canadian dollars'}
              </p>

              <button
                type="button"
                onClick={() => acheter(pack)}
                disabled={enCours !== null}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[11px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-40"
              >
                {enCours === pack.id && <Loader2 size={13} className="animate-spin" />}
                {enCours === pack.id
                  ? (fr ? 'La caisse s’ouvre' : 'Opening the till')
                  : (fr ? 'Acheter' : 'Buy')}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 inline-flex items-center gap-1.5 font-sans text-[11px] text-ivory-soft/55">
        <Lock size={11} />
        {fr ? 'Paiement sécurisé par Stripe' : 'Secure payment by Stripe'}
      </p>

      {annulee && (
        <p className="mt-3 font-editorial text-sm text-ivory-soft/75">
          {fr
            ? 'Le paiement a été abandonné et rien n’a été prélevé. Votre bourse est intacte.'
            : 'The payment was abandoned and nothing was charged. Your purse is untouched.'}
        </p>
      )}

      {erreur && (
        <p className="mt-3 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>
      )}
    </section>
  );
};

export default RechargerBourse;
