import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Gift, Swords, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { sonnerBadge } from '../../lib/fanfare';
import PieceMontpellois from '../boutique/PieceMontpellois';
import {
  RECOMPENSES_QUOTIDIEN, reclamerQuotidien, suivreMaBourse, type Bourse,
} from '../../firebase/montpellois';

// ─── La roue des sept jours (Alex, 2026-08-30, sur le modèle Gwent) ──
// À chaque visite quotidienne, le panneau se lève de lui-même, la
// récompense du jour tombe avec la fanfare de succès, et la roue
// avance. Sept colonnes comme l'écran de Gwent : le jour servi brille,
// les jours passés sont éteints, les jours à venir attendent dans la
// pénombre. Passé le septième jour, la roue recommence.
//
// Le serveur donne tout (reclamerQuotidien, functions/index.js); ce
// panneau ne fait qu'appeler et montrer. Le bouton « Ma récompense du
// jour » de la bourse rouvre le panneau par l'événement
// 'fmm:ouvrir-recompenses'.

const dateISO = (d: Date = new Date()) => d.toISOString().slice(0, 10);

/** Le temps qu'il reste avant la prochaine récompense (minuit UTC,
 *  la même horloge que le serveur). */
function resteAvantDemain(): string {
  const t = new Date();
  const demain = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1);
  const ms = demain - t.getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')} min`;
}

const IconeJour: React.FC<{ type: string; grande?: boolean }> = ({ type, grande }) => {
  const taille = grande ? 40 : 26;
  if (type === 'montpellois') return <PieceMontpellois size={taille} image />;
  if (type === 'taflPieces') return <Swords size={taille} style={{ color: '#D8B05A' }} />;
  if (type === 'chanceWJW') return <Gift size={taille} style={{ color: '#D8B05A' }} />;
  // Le dos de carte : une petite carte dorée dessinée, pas un glyphe.
  return (
    <span
      aria-hidden
      className="block rounded-[3px]"
      style={{
        width: taille * 0.68, height: taille,
        background: 'linear-gradient(160deg, #8a6a24 0%, #D8B05A 45%, #7a5a1e 100%)',
        border: '1px solid rgba(244,239,227,0.5)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}
    />
  );
};

const RecompensesQuotidiennes: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useUI();
  const fr = lang === 'FR';

  const [bourse, setBourse] = useState<Bourse | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [jourServi, setJourServi] = useState<number | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [compte, setCompte] = useState(resteAvantDemain());
  const dejaTente = useRef(false);

  useEffect(() => {
    if (!user?.uid) { setBourse(null); return; }
    return suivreMaBourse(user.uid, setBourse);
  }, [user?.uid]);

  const dernier = bourse?.dernierQuotidien?.toDate ? dateISO(bourse.dernierQuotidien.toDate()) : null;
  const reclameAujourdhui = dernier === dateISO();
  const suite = bourse?.quotidienSuite || 0;
  // Le jour affiché : celui servi à l'instant, sinon celui d'aujourd'hui
  // (déjà pris), sinon celui que la prochaine visite servira.
  const jourCourant = jourServi
    ?? (reclameAujourdhui ? ((suite - 1) % 7) + 1 : (dernier === dateISO(new Date(Date.now() - 86400000)) ? (suite % 7) + 1 : 1));

  const reclamer = useCallback(async () => {
    if (enCours) return;
    setEnCours(true); setErreur(null);
    try {
      const { jour } = await reclamerQuotidien();
      setJourServi(jour || 1);
      sonnerBadge();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnCours(false); }
  }, [enCours]);

  // Le panneau se lève tout seul, une fois par jour, dès que la bourse
  // dit que la récompense n'est pas encore prise.
  useEffect(() => {
    if (!user?.uid || !bourse || reclameAujourdhui || dejaTente.current) return;
    let vu = null;
    try { vu = sessionStorage.getItem('fmm.recompense.vue'); } catch { /* navigation privée */ }
    if (vu === dateISO()) return;
    dejaTente.current = true;
    setOuvert(true);
    void reclamer();
  }, [user?.uid, bourse, reclameAujourdhui, reclamer]);

  // Le bouton de la bourse rouvre le panneau (et réclame s'il reste à faire).
  useEffect(() => {
    const ouvrir = () => {
      setOuvert(true);
      if (!reclameAujourdhui && !enCours) void reclamer();
    };
    window.addEventListener('fmm:ouvrir-recompenses', ouvrir);
    return () => window.removeEventListener('fmm:ouvrir-recompenses', ouvrir);
  }, [reclameAujourdhui, enCours, reclamer]);

  useEffect(() => {
    if (!ouvert) return;
    const t = setInterval(() => setCompte(resteAvantDemain()), 30000);
    setCompte(resteAvantDemain());
    return () => clearInterval(t);
  }, [ouvert]);

  const fermer = () => {
    setOuvert(false);
    try { sessionStorage.setItem('fmm.recompense.vue', dateISO()); } catch { /* tant pis */ }
  };

  // Aperçu de développement sans compte : /?roue=3 ouvre le panneau au
  // jour 3, pour régler le visuel (jamais en production).
  const apercu = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('roue')) : 0;
  useEffect(() => {
    if (apercu >= 1 && apercu <= 7) { setJourServi(apercu); setOuvert(true); }
  }, [apercu]);

  if (!user?.uid && !apercu) return null;

  return (
    <AnimatePresence>
      {ouvert && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center p-4"
          style={{ background: 'rgba(6, 3, 4, 0.88)', backdropFilter: 'blur(6px)' }}
          onClick={fermer}
          role="dialog" aria-modal="true"
          aria-label={fr ? 'Votre récompense du jour' : 'Your daily reward'}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-4xl rounded-lg-card p-6 md:p-8"
            style={{
              background: 'linear-gradient(180deg, rgba(20,10,8,0.97), rgba(10,5,4,0.97))',
              border: '1px solid rgba(216,176,90,0.35)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(216,176,90,0.08) inset',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button" onClick={fermer} aria-label={fr ? 'Fermer' : 'Close'}
              className="absolute top-4 right-4 p-2 rounded-card text-ivory-soft/60 hover:text-brass transition-colors"
            >
              <X size={18} />
            </button>

            <p className="witcher-stat-label text-center mb-1">
              {fr ? 'La roue des sept jours' : 'The wheel of seven days'}
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-ivory text-center mb-6">
              {jourServi
                ? (fr ? 'Voici votre récompense du jour' : 'Here is your daily reward')
                : reclameAujourdhui
                  ? (fr ? 'Votre récompense du jour est prise' : 'Today’s reward is claimed')
                  : (fr ? 'Votre récompense du jour' : 'Your daily reward')}
            </h2>

            <div className="grid grid-cols-7 gap-1.5 md:gap-3">
              {RECOMPENSES_QUOTIDIEN.map((r) => {
                const courant = r.jour === jourCourant;
                const passe = r.jour < jourCourant;
                return (
                  <div
                    key={r.jour}
                    title={fr ? r.texteFR : r.texteEN}
                    className="flex flex-col items-center gap-2 rounded-card px-1 py-3 md:py-5 text-center transition-colors"
                    style={{
                      background: courant
                        ? 'linear-gradient(180deg, rgba(216,176,90,0.28), rgba(138,106,36,0.14))'
                        : 'rgba(244,239,227,0.03)',
                      border: courant ? '1px solid rgba(216,176,90,0.8)' : '1px solid rgba(244,239,227,0.08)',
                      boxShadow: courant ? '0 0 24px rgba(216,176,90,0.25)' : undefined,
                      opacity: passe ? 0.45 : 1,
                    }}
                  >
                    <span className="font-sans uppercase tracking-[0.14em] text-[9px] md:text-[10px]"
                          style={{ color: courant ? '#D8B05A' : 'rgba(244,239,227,0.55)' }}>
                      {fr ? 'Jour' : 'Day'} {r.jour}
                    </span>
                    <motion.span
                      animate={courant && jourServi ? { scale: [1, 1.25, 1] } : undefined}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
                      className="flex items-center justify-center h-10 md:h-12"
                    >
                      <IconeJour type={r.type} grande={courant} />
                    </motion.span>
                    <span className="font-sans text-[9px] md:text-[11px] leading-tight"
                          style={{ color: courant ? '#F4EFE3' : 'rgba(244,239,227,0.6)' }}>
                      {fr ? r.nomFR : r.nomEN}
                    </span>
                    {passe && <Crown size={10} style={{ color: 'rgba(216,176,90,0.5)' }} aria-hidden />}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 text-center">
              {jourServi ? (
                <p className="font-sans text-sm" style={{ color: '#D8B05A' }}>
                  {fr
                    ? RECOMPENSES_QUOTIDIEN[jourServi - 1].texteFR
                    : RECOMPENSES_QUOTIDIEN[jourServi - 1].texteEN}
                </p>
              ) : erreur ? (
                <p className="font-sans text-sm" style={{ color: '#D8B05A' }}>{erreur}</p>
              ) : enCours ? (
                <p className="font-sans text-sm text-ivory-soft/70">{fr ? 'Un instant…' : 'One moment…'}</p>
              ) : null}
              <p className="font-sans uppercase tracking-[0.18em] text-[10px] mt-3" style={{ color: 'rgba(244,239,227,0.45)' }}>
                {fr ? 'Nouvelle récompense dans' : 'New reward in'} {compte}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RecompensesQuotidiennes;
