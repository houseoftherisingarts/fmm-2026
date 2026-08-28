import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Store, Gift } from 'lucide-react';
import { addLocale } from '../../lib/locale';
import PieceMontpellois from '../boutique/PieceMontpellois';
import {
  suivreMaBourse, suivreBourseDe, basculerBoursePublique, reclamerQuotidien,
  rangFortune, type Bourse,
} from '../../firebase/montpellois';

// ─── La bourse, sur le profil ────────────────────────────────────────
// Alex, 2026-08-28 : « ça prend une petite bourse, et la personne peut
// choisir si elle la met publique ou privée. Quand elle la montre, elle
// gagne un badge rigolo. » Le badge s'appelle « Paon de la cour », et
// c'est le serveur qui le pose, en même temps que le drapeau.

const BoursePanel: React.FC<{ uid: string; lang: 'FR' | 'EN'; prive: boolean }> = ({ uid, lang, prive }) => {
  const fr = lang === 'FR';
  const [bourse, setBourse] = useState<Bourse | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [quotidien, setQuotidien] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => (prive ? suivreMaBourse(uid, setBourse) : suivreBourseDe(uid, setBourse as (b: unknown) => void)), [uid, prive]);

  // Sur la fiche de quelqu'un d'autre, une bourse fermée ne se montre pas.
  if (!prive && (!bourse || !bourse.publique)) return null;

  const rang = bourse ? rangFortune(bourse.gagne || 0).actuel : null;

  const basculer = async () => {
    setEnvoi(true); setMessage(null);
    try { await basculerBoursePublique(!bourse?.publique); }
    catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
    finally { setEnvoi(false); }
  };

  const reclamer = async () => {
    setQuotidien(true); setMessage(null);
    try {
      await reclamerQuotidien();
      setMessage(fr ? 'Votre pièce du jour est dans la bourse.' : 'Your coin of the day is in the purse.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally { setQuotidien(false); }
  };

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-5 pb-2" style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
        <span className="witcher-stat-label inline-flex items-center gap-2">
          <PieceMontpellois size={15} /> {prive ? (fr ? 'Ma bourse' : 'My purse') : (fr ? 'Sa bourse' : 'Their purse')}
        </span>
        {rang && (
          <span className="font-sans uppercase tracking-[0.18em] text-[10px]" style={{ color: '#D8B05A' }}>
            {fr ? rang.nomFR : rang.nomEN}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <PieceMontpellois size={54} image />
        <div className="min-w-0">
          <p className="font-display text-3xl md:text-4xl text-ivory leading-none">{bourse?.solde ?? 0}</p>
          <p className="font-sans uppercase tracking-[0.2em] text-[10px] mt-1" style={{ color: 'rgba(244,239,227,0.55)' }}>
            {fr ? 'Montpellois' : 'Montpellois'}
          </p>
        </div>
      </div>

      {prive && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" className="sr-only" checked={Boolean(bourse?.publique)}
                     onChange={basculer} disabled={envoi} />
              <span aria-hidden className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                    style={{
                      background: bourse?.publique ? 'rgba(216,176,90,0.45)' : 'rgba(244,239,227,0.14)',
                      border: `1px solid ${bourse?.publique ? '#D8B05A' : 'rgba(244,239,227,0.25)'}`,
                    }}>
                <span className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-all"
                      style={{
                        left: bourse?.publique ? 'calc(100% - 1.25rem)' : '0.25rem',
                        background: bourse?.publique ? '#F4EFE3' : 'rgba(244,239,227,0.6)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      }} />
              </span>
              <span className="font-sans text-sm" style={{ color: 'rgba(244,239,227,0.85)', fontWeight: 300 }}>
                {envoi
                  ? (fr ? 'Un instant…' : 'One moment…')
                  : bourse?.publique
                    ? (fr ? 'Ma bourse est publique' : 'My purse is public')
                    : (fr ? 'Ma bourse est privée' : 'My purse is private')}
              </span>
            </label>

            <button type="button" onClick={reclamer} disabled={quotidien}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-card font-sans uppercase tracking-[0.16em] text-[10px] text-ivory-soft/80 hover:text-brass transition-colors disabled:opacity-50"
                    style={{ border: '1px solid rgba(244,239,227,0.2)' }}>
              {quotidien ? <Loader2 size={12} className="animate-spin" /> : <Gift size={12} />}
              {fr ? 'Ma pièce du jour' : 'My coin of the day'}
            </button>

            <Link to={addLocale('/boutique', lang)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-card font-sans uppercase tracking-[0.16em] text-[10px] text-ivory-soft/80 hover:text-brass transition-colors"
                  style={{ border: '1px solid rgba(244,239,227,0.2)' }}>
              <Store size={12} /> {fr ? 'La boutique' : 'The shop'}
            </Link>
          </div>

          <p className="font-sans text-[11px]" style={{ color: 'rgba(244,239,227,0.5)' }}>
            {bourse?.publique
              ? (fr ? 'Les autres membres voient votre fortune sur votre profil.' : 'Other members see your fortune on your profile.')
              : (fr ? 'Personne ne voit votre bourse. Ouvrez-la pour gagner le badge du paon.' : 'Nobody sees your purse. Open it to earn the peacock badge.')}
          </p>
          {message && <p className="mt-3 font-sans text-xs" style={{ color: '#D8B05A' }}>{message}</p>}
        </>
      )}
    </section>
  );
};

export default BoursePanel;
