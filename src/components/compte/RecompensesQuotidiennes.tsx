import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Crown, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { sonnerBadge } from '../../lib/fanfare';
import { FILTRE_DOS_ROYAL } from '../../games/tarot/dos';
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

// Les trésors se montrent avec les vrais objets du site : la pièce de
// Montpellois, le dos de carte du tarot relevé à l'or, les teintes du
// jeu de la Garde royale, le blason de William J. Walter.
const IconeJour: React.FC<{ type: string; grande?: boolean }> = ({ type, grande }) => {
  const taille = grande ? 68 : 48;
  if (type === 'montpellois') return <PieceMontpellois size={taille} image />;
  if (type === 'chanceWJW') {
    return <img src="/partenaires/wjw-logo-bone.svg" alt="" aria-hidden style={{ height: taille * 0.9, width: 'auto', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }} />;
  }
  if (type === 'taflPieces') {
    // Trois pièces tournées, comme sur le plateau : assaillant sombre,
    // défenseur d'ivoire, roi d'or couronné.
    const d = taille * 0.46;
    const piece = (fond: string, decal: number, roi = false) => (
      <span key={fond} aria-hidden className="absolute rounded-full flex items-center justify-center"
            style={{ width: d, height: d, left: decal, bottom: roi ? d * 0.35 : 0, background: fond,
                     boxShadow: '0 3px 8px rgba(0,0,0,0.65), inset 0 -3px 5px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.25)',
                     border: '1px solid rgba(244,239,227,0.25)' }}>
        {roi && <Crown size={d * 0.5} style={{ color: '#3a2c14' }} />}
      </span>
    );
    return (
      <span className="relative block" style={{ width: taille * 1.15, height: taille * 0.85 }}>
        {piece('linear-gradient(160deg,#5a4520,#3a2c14)', 0)}
        {piece('linear-gradient(160deg,#f4ecd8,#cfc1a0)', d * 1.45)}
        {piece('linear-gradient(160deg,#ecc978,#b8902f)', d * 0.72, true)}
      </span>
    );
  }
  // Le dos royal : le vrai dos du tarot, relevé à l'or.
  return (
    <img src="/tarot/dos-v2.webp" alt="" aria-hidden className="rounded-[4px] object-cover"
         style={{ height: taille, width: taille * 0.62, filter: FILTRE_DOS_ROYAL,
                  border: '1px solid rgba(244,239,227,0.45)', boxShadow: '0 4px 12px rgba(0,0,0,0.6)' }} />
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

            {/* Sept colonnes comme l'écran de Gwent; sur un téléphone,
                quatre puis trois, pour que les noms restent lisibles. */}
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2 md:gap-3">
              {RECOMPENSES_QUOTIDIEN.map((r) => {
                const courant = r.jour === jourCourant;
                const passe = r.jour < jourCourant;
                const nom = fr ? r.nomFR : r.nomEN;
                return (
                  <motion.div
                    key={r.jour}
                    title={fr ? r.texteFR : r.texteEN}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: passe ? 0.42 : 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 * r.jour, ease: [0.22, 1, 0.36, 1] }}
                    className={`relative flex flex-col items-center justify-between rounded-card px-1.5 pt-3 pb-4 md:pt-4 md:pb-5 text-center min-h-[168px] md:min-h-[220px] ${r.jour === 5 ? 'col-start-1 md:col-start-auto' : ''}`}
                    style={{
                      background: courant
                        ? 'linear-gradient(180deg, rgba(216,176,90,0.42) 0%, rgba(150,104,30,0.22) 55%, rgba(30,16,8,0.2) 100%)'
                        : 'linear-gradient(180deg, rgba(244,239,227,0.05), rgba(244,239,227,0.015))',
                      border: courant ? '1px solid rgba(232,196,110,0.9)' : '1px solid rgba(244,239,227,0.09)',
                      boxShadow: courant
                        ? '0 0 36px rgba(216,176,90,0.32), inset 0 1px 0 rgba(255,236,190,0.35)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    }}
                  >
                    <span className="font-display text-[11px] md:text-sm uppercase tracking-[0.18em]"
                          style={{ color: courant ? '#F4EFE3' : 'rgba(244,239,227,0.6)' }}>
                      {fr ? 'Jour' : 'Day'} {r.jour}
                    </span>
                    <motion.span
                      animate={courant && jourServi ? { scale: [1, 1.22, 1], rotate: [0, -4, 0] } : undefined}
                      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.35 }}
                      className="flex items-center justify-center flex-1 py-2"
                    >
                      <IconeJour type={r.type} grande={courant} />
                    </motion.span>
                    <span className="flex flex-col items-center gap-0.5">
                      {r.montant ? (
                        <span className="font-display text-lg md:text-2xl leading-none" style={{ color: courant ? '#F4EFE3' : 'rgba(244,239,227,0.75)' }}>
                          ×{r.montant}
                        </span>
                      ) : null}
                      <span className="font-sans text-[10px] md:text-[11px] leading-tight px-0.5"
                            style={{ color: courant ? '#F4EFE3' : 'rgba(244,239,227,0.6)' }}>
                        {r.montant ? 'Montpellois' : nom}
                      </span>
                    </span>
                    {passe && (
                      <span aria-hidden className="absolute top-2 right-2 rounded-full p-0.5"
                            style={{ background: 'rgba(216,176,90,0.25)', color: '#D8B05A' }}>
                        <Check size={10} />
                      </span>
                    )}
                  </motion.div>
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
