import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Copy, Check, Crown, Ticket, ShieldOff, Loader2 } from 'lucide-react';
import { addLocale } from '../../lib/locale';
import {
  monCodeParrain, suivreMesFilleuls, filleulsDeMesFilleuls, monParrain,
  PALIERS_PARRAINAGE, type Parrainage,
} from '../../firebase/parrainage';

// ─── Le parrainage ───────────────────────────────────────────────────
// Alex, 2026-08-28 : chacun porte son code. Une personne qui crée son
// compte avec ce code devient un filleul, et l'arbre se dessine. Les
// paliers viennent de sa dictée : le badge au premier, « Le Parrain » à
// cinq, le compte VIP à dix, un billet du festival à vingt.

const ParrainagePanel: React.FC<{ uid: string; lang: 'FR' | 'EN' }> = ({ uid, lang }) => {
  const fr = lang === 'FR';
  const [code, setCode] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [filleuls, setFilleuls] = useState<Parrainage[]>([]);
  const [petitsFilleuls, setPetitsFilleuls] = useState<Record<string, Parrainage[]>>({});
  const [parrain, setParrain] = useState<Parrainage | null>(null);

  useEffect(() => {
    monCodeParrain(uid).then(setCode).catch((e) => setErreur(e instanceof Error ? e.message : String(e)));
    void monParrain(uid).then(setParrain).catch(() => setParrain(null));
    return suivreMesFilleuls(uid, setFilleuls);
  }, [uid]);

  useEffect(() => {
    if (filleuls.length === 0) { setPetitsFilleuls({}); return; }
    void filleulsDeMesFilleuls(filleuls.map((f) => f.filleulUid)).then(setPetitsFilleuls).catch(() => {});
  }, [filleuls]);

  const lien = useMemo(
    () => (code ? `${window.location.origin}${addLocale('/compte', lang)}?parrain=${code}` : ''),
    [code, lang],
  );
  const copier = async () => {
    if (!lien) return;
    try { await navigator.clipboard.writeText(lien); setCopie(true); window.setTimeout(() => setCopie(false), 2200); }
    catch { setErreur(fr ? 'La copie a échoué. Sélectionnez le lien à la main.' : 'Copying failed. Select the link by hand.'); }
  };

  const n = filleuls.length;
  const prochain = PALIERS_PARRAINAGE.find((p) => p.filleuls > n);

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-5 pb-2" style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}>
        <span className="witcher-stat-label inline-flex items-center gap-2"><Users size={13} /> {fr ? 'Mon parrainage' : 'My sponsorship'}</span>
        <span className="font-sans text-sm tracking-[0.2em]" style={{ color: 'var(--sk-gilt)', fontWeight: 300 }}>{n}</span>
      </div>

      <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-5">
        {fr
          ? 'Donnez votre code à qui vous voulez amener à la cour. La personne l’inscrit en créant son compte, et elle entre dans votre lignée.'
          : 'Give your code to anyone you want to bring to the court. They enter it when creating their account, and they join your line.'}
      </p>

      {/* Le code et le lien */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="px-5 py-3 rounded-card font-display text-2xl tracking-[0.3em]"
              style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(var(--sk-glow-rgb),0.35)', color: 'var(--sk-parchment)' }}>
          {code || '······'}
        </span>
        <button type="button" onClick={copier} disabled={!code}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-brass/40 text-brass hover:bg-brass/10 font-sans text-xs uppercase tracking-wider transition rounded-card disabled:opacity-50">
          {copie ? <Check size={13} /> : <Copy size={13} />} {copie ? (fr ? 'Lien copié' : 'Link copied') : (fr ? 'Copier le lien' : 'Copy the link')}
        </button>
      </div>

      {/* Les paliers */}
      <ul className="space-y-2 mb-6">
        {PALIERS_PARRAINAGE.map((p) => {
          const atteint = n >= p.filleuls;
          const Icone = p.filleuls >= 20 ? Ticket : p.filleuls >= 10 ? ShieldOff : Crown;
          return (
            <li key={p.filleuls} className="flex items-center gap-3 px-4 py-2.5 rounded-card"
                style={{ background: atteint ? 'rgba(var(--sk-gilt-rgb),0.10)' : 'rgba(var(--sk-deep-rgb),0.4)', border: `1px solid ${atteint ? 'rgba(var(--sk-gilt-rgb),0.45)' : 'rgba(var(--sk-parchment-rgb),0.10)'}` }}>
              <Icone size={13} style={{ color: atteint ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.4)' }} />
              <span className="font-sans text-xs uppercase tracking-[0.16em] w-32 shrink-0"
                    style={{ color: atteint ? 'var(--sk-parchment)' : 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                {fr ? p.cleFR : p.cleEN}
              </span>
              <span className="font-editorial text-sm flex-1" style={{ color: atteint ? 'var(--color-amber-glow)' : 'rgba(var(--sk-parchment-rgb),0.55)' }}>
                {fr ? p.recompenseFR : p.recompenseEN}
              </span>
              {atteint && <Check size={13} style={{ color: 'var(--sk-gilt)' }} />}
            </li>
          );
        })}
      </ul>
      {prochain && (
        <p className="font-sans text-xs mb-6" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>
          {fr
            ? `Encore ${prochain.filleuls - n} pour ${prochain.recompenseFR.toLowerCase()}.`
            : `${prochain.filleuls - n} more for ${prochain.recompenseEN.toLowerCase()}.`}
        </p>
      )}

      {/* L'arbre */}
      <p className="witcher-stat-label mb-3">{fr ? 'Ma lignée' : 'My line'}</p>
      {parrain && (
        <p className="font-sans text-xs mb-3" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>
          {fr ? 'Vous êtes entré grâce au code ' : 'You joined with the code '}<span style={{ color: 'var(--sk-gilt)' }}>{parrain.code}</span>.
        </p>
      )}
      {filleuls.length === 0 ? (
        <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
          {fr ? 'Personne encore. Le premier filleul vous vaut un badge.' : 'Nobody yet. Your first godchild earns you a badge.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {filleuls.map((f) => (
            <li key={f.filleulUid}>
              <Link to={`${addLocale('/profil', lang)}/${f.filleulUid}`}
                    className="flex items-center gap-2 font-sans text-sm text-ivory hover:text-brass transition-colors">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--sk-gilt)' }} />
                {f.filleulNom || (fr ? 'Un inconnu' : 'A stranger')}
              </Link>
              {(petitsFilleuls[f.filleulUid] || []).length > 0 && (
                <ul className="ml-5 mt-1 space-y-1" style={{ borderLeft: '1px solid rgba(var(--sk-parchment-rgb),0.14)' }}>
                  {petitsFilleuls[f.filleulUid].map((pf) => (
                    <li key={pf.filleulUid} className="pl-3">
                      <Link to={`${addLocale('/profil', lang)}/${pf.filleulUid}`}
                            className="font-sans text-xs text-ivory-soft/75 hover:text-brass transition-colors">
                        {pf.filleulNom || (fr ? 'Un inconnu' : 'A stranger')}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {!code && !erreur && <p className="mt-4 font-sans text-xs text-ivory-soft/50 inline-flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> {fr ? 'Votre code arrive…' : 'Your code is coming…'}</p>}
      {erreur && <p className="mt-4 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
    </section>
  );
};

export default ParrainagePanel;
