import React, { useEffect, useState } from 'react';
import { Store, Plus, X, Loader2, Coins } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { motDeLaForme, nomMonnaie, type Guilde } from '../../firebase/guildes';
import { suivreSoukDeGuilde, type ObjetSouk } from '../../firebase/souk';
import { suivreMaBourseGuilde, guildeAcheterAuSouk, type BourseGuilde } from '../../firebase/guildeMonnaie';
import { CarteSouk } from '../../pages/SoukPage';
import { FormulaireSouk } from '../souk/MesObjets';

// ─── Le marché ───────────────────────────────────────────────────────
// Les annonces du Souk réservées à ce groupe, payables en pièces. La
// carte est celle du Souk public; seul le bouton change, parce que
// l'argent qui bouge ici n'est pas le même (contrat
// CLAN-MONNAIE-CONTRAT.md, 6 septembre 2026).

function messageErreur(e: unknown, fr: boolean): string {
  const code = (e as { code?: string })?.code || '';
  if (/(not-found|internal|unavailable)$/.test(code)) {
    return fr
      ? 'Le service de la monnaie n’est pas encore en ligne. Réessayez un peu plus tard.'
      : 'The currency service is not online yet. Try again a little later.';
  }
  if (code.endsWith('failed-precondition') || code.endsWith('resource-exhausted')) {
    return fr ? 'Votre bourse ne contient pas assez de pièces.' : 'Your purse does not hold enough coins.';
  }
  return e instanceof Error ? e.message : String(e);
}

const Marche: React.FC<{ guilde: Guilde; uid: string | null; estChef: boolean }> = ({ guilde, uid }) => {
  const { lang } = useUI();
  const fr = lang === 'FR';
  const estMembre = Boolean(uid && guilde.membres.includes(uid));
  const glyphe = guilde.monnaie?.glyphe || '◎';

  const [objets, setObjets] = useState<ObjetSouk[]>([]);
  const [bourse, setBourse] = useState<BourseGuilde | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!estMembre) return;
    return suivreSoukDeGuilde(guilde.id, setObjets);
  }, [guilde.id, estMembre]);

  useEffect(() => {
    if (!uid || !estMembre) return;
    return suivreMaBourseGuilde(guilde.id, uid, setBourse);
  }, [guilde.id, uid, estMembre]);

  if (!estMembre) {
    return (
      <section className="glass-light rounded-lg-card p-6 md:p-8 text-center">
        <span aria-hidden className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
              style={{ background: 'rgba(var(--sk-gilt-rgb),0.12)', border: '1px solid rgba(var(--sk-gilt-rgb),0.35)', color: 'var(--sk-gilt)' }}>
          <Store size={20} />
        </span>
        <p className="font-display text-xl text-ivory mb-2">{fr ? 'Le marché' : 'The market'}</p>
        <p className="font-editorial text-base text-ivory-soft leading-relaxed max-w-md mx-auto">
          {fr
            ? `Ces annonces ne se vendent qu’entre membres. Entrez dans ${motDeLaForme(guilde.forme, lang).toLowerCase()} pour voir ce qui s’y échange.`
            : 'These listings are traded among members only. Join the group to see what changes hands here.'}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="glass-light rounded-lg-card p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="witcher-stat-label inline-flex items-center gap-2 mb-1.5">
            <Store size={12} /> {fr ? 'Le marché du groupe' : 'The group market'}
          </p>
          <p className="font-sans text-[11px]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>
            {fr
              ? `Vous avez ${bourse?.solde ?? 0} ${glyphe} en ${nomMonnaie(guilde, lang)}.`
              : `You hold ${bourse?.solde ?? 0} ${glyphe} in ${nomMonnaie(guilde, lang)}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setOuvert((v) => !v); setErreur(null); }}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card"
        >
          {ouvert ? <X size={13} /> : <Plus size={13} />}
          {ouvert ? (fr ? 'Fermer' : 'Close') : (fr ? 'Proposer un objet' : 'Offer an item')}
        </button>
      </section>

      {ouvert && uid && (
        <FormulaireSouk
          uid={uid} lang={lang}
          guildeFixe={{ id: guilde.id, nom: guilde.nom, monnaie: guilde.monnaie }}
          onDone={() => setOuvert(false)}
        />
      )}

      {erreur && <p role="alert" className="font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}

      {objets.length === 0 ? (
        <section className="glass-light rounded-lg-card p-5 md:p-6">
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
            {fr
              ? 'Aucun étal n’est encore monté. Le premier qui pose une annonce ouvre le marché pour tout le monde.'
              : 'No stall is set up yet. Whoever posts the first listing opens the market for everyone.'}
          </p>
        </section>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {objets.map((o) => (
            <CarteSouk
              key={o.id} objet={o} lang={lang}
              boutonAcheter={
                <BoutonAcheter
                  objet={o} guilde={guilde} uid={uid} lang={lang}
                  solde={bourse?.solde ?? 0} onErreur={setErreur}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Acheter en pièces ───────────────────────────────────────────────
// Le serveur refait tous les contrôles; ceux d'ici servent à ne pas
// proposer un geste qui sera refusé.
const BoutonAcheter: React.FC<{
  objet: ObjetSouk; guilde: Guilde; uid: string | null; lang: 'FR' | 'EN';
  solde: number;
  onErreur: (m: string | null) => void;
}> = ({ objet, guilde, uid, lang, solde, onErreur }) => {
  const fr = lang === 'FR';
  const [busy, setBusy] = useState(false);
  const sigle = guilde.monnaie?.sigle || 'PCE';
  const prix = objet.prixPieces || 0;

  if (!prix || objet.statut !== 'disponible') return null;

  const mien = objet.uid === uid;
  const pasAssez = solde < prix;

  const acheter = async () => {
    setBusy(true); onErreur(null);
    try { await guildeAcheterAuSouk({ objetId: objet.id }); }
    catch (e) { onErreur(messageErreur(e, fr)); }
    finally { setBusy(false); }
  };

  return (
    <button
      type="button" onClick={acheter} disabled={busy || mien || pasAssez}
      title={mien
        ? (fr ? 'Cette annonce est la vôtre.' : 'This listing is yours.')
        : pasAssez ? (fr ? 'Votre bourse ne suffit pas.' : 'Your purse falls short.') : undefined}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brass/50 text-brass hover:bg-brass/10 font-sans uppercase tracking-wider text-[10px] font-semibold transition rounded-card disabled:opacity-40"
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Coins size={12} />}
      {fr ? `Acheter pour ${prix} ${sigle}` : `Buy for ${prix} ${sigle}`}
    </button>
  );
};

export default Marche;
