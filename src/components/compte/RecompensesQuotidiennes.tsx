import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { sonnerBadge } from '../../lib/fanfare';
import DosCaravane from '../../games/tarot/DosCaravane';
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

const JOUR_MS = 24 * 3600000;

/** Le temps qu'il reste avant la prochaine récompense : 24 heures
 *  après la dernière réclamation, la même règle que le serveur. */
function resteAvantDemain(dernierMs: number): string {
  const ms = Math.max(0, dernierMs + JOUR_MS - Date.now());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')} min`;
}

// Les trésors se montrent avec les vrais objets du site : la pièce de
// Montpellois, le dos de carte du tarot relevé à l'or, les teintes du
// gens de la caravane, le blason de William J. Walter.
export const IconeJour: React.FC<{ type: string; grande?: boolean }> = ({ type, grande }) => {
  const taille = grande ? 68 : 48;
  if (type === 'montpellois') return <PieceMontpellois size={taille} image />;
  if (type === 'chanceWJW') {
    return <img src="/partenaires/wjw-logo-bone.svg" alt="" aria-hidden style={{ height: taille * 0.9, width: 'auto', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }} />;
  }
  if (type === 'taflPieces') {
    // La vignette du jeu lui-même, capturée sur le plateau (Alex, 2026-08-30).
    return (
      <img src="/games/hnefatafl/vignettes/caravane.webp" alt="" aria-hidden className="rounded-full object-cover"
           style={{ width: taille, height: taille, border: '1px solid rgba(244,239,227,0.45)', boxShadow: '0 4px 12px rgba(0,0,0,0.6)' }} />
    );
  }
  // Le tarot de la caravane : le dos dessiné, tel qu'il paraît sur le tapis.
  return (
    <span className="block rounded-[4px] overflow-hidden"
          style={{ height: taille, width: taille * 0.53, border: '1px solid rgba(244,239,227,0.45)', boxShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>
      <DosCaravane className="w-full h-full" />
    </span>
  );
};

/** L'aperçu d'un trésor dans son jeu : ce qu'on gagne et comment.
 *  Un clic ouvre le panneau complet des récompenses quotidiennes. */
export const ApercuRecompense: React.FC<{ jour: number; lang: 'FR' | 'EN'; className?: string }> = ({ jour, lang, className = '' }) => {
  const fr = lang === 'FR';
  const r = RECOMPENSES_QUOTIDIEN[jour - 1];
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('fmm:ouvrir-recompenses'))}
      className={`w-full text-left rounded-card p-4 md:p-5 flex items-center gap-4 transition-colors hover:border-brass ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(216,176,90,0.14), rgba(30,16,8,0.35))',
        border: '1px solid rgba(216,176,90,0.45)',
      }}
    >
      <span className="flex items-center justify-center shrink-0" style={{ width: 72, height: 72 }}>
        <IconeJour type={r.type} grande />
      </span>
      <span className="min-w-0">
        <span className="block font-sans uppercase tracking-[0.18em] text-[10px]" style={{ color: '#D8B05A' }}>
          {fr ? 'Récompense quotidienne · jour' : 'Daily reward · day'} {r.jour}
        </span>
        <span className="block font-display text-lg md:text-xl text-ivory leading-tight mt-0.5">
          {fr ? r.nomFR : r.nomEN}
        </span>
        <span className="block font-sans text-xs md:text-sm mt-1" style={{ color: 'rgba(244,239,227,0.7)' }}>
          {fr
            ? `Récompense pour vous être connecté ${r.jour} jours d’affilée. Un clic pour voir toutes les récompenses.`
            : `Reward for signing in ${r.jour} days in a row. Click to see every reward.`}
        </span>
      </span>
    </button>
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
  const [compte, setCompte] = useState('');
  const dejaTente = useRef(false);

  useEffect(() => {
    if (!user?.uid) { setBourse(null); return; }
    return suivreMaBourse(user.uid, setBourse);
  }, [user?.uid]);

  const dernierMs = bourse?.dernierQuotidien?.toMillis ? bourse.dernierQuotidien.toMillis() : 0;
  const ecoule = Date.now() - dernierMs;
  // « Déjà pris » veut dire : moins de 24 heures depuis la dernière
  // réclamation, comme le serveur. La suite tient jusqu'à 48 heures.
  const reclameAujourdhui = dernierMs > 0 && ecoule < JOUR_MS;
  const suite = bourse?.quotidienSuite || 0;
  // Le jour affiché : celui servi à l'instant, sinon celui déjà pris,
  // sinon celui que la prochaine visite servira.
  const jourCourant = jourServi
    ?? (reclameAujourdhui ? ((suite - 1) % 7) + 1 : (dernierMs > 0 && ecoule < 2 * JOUR_MS ? (suite % 7) + 1 : 1));

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
      if (user?.uid && !reclameAujourdhui && !enCours) void reclamer();
    };
    window.addEventListener('fmm:ouvrir-recompenses', ouvrir);
    return () => window.removeEventListener('fmm:ouvrir-recompenses', ouvrir);
  }, [user?.uid, reclameAujourdhui, enCours, reclamer]);

  useEffect(() => {
    if (!ouvert) return;
    // Après une réclamation à l'instant, le serveur n'a pas encore
    // renvoyé l'horodatage : on compte depuis maintenant.
    const depuis = jourServi && ecoule >= JOUR_MS ? Date.now() : dernierMs;
    const t = setInterval(() => setCompte(resteAvantDemain(depuis)), 30000);
    setCompte(resteAvantDemain(depuis));
    return () => clearInterval(t);
  }, [ouvert, dernierMs, jourServi, ecoule]);

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

  // Sans compte, le panneau s'ouvre quand même depuis les jeux (aperçu
  // des trésors) : il montre la roue et invite à se connecter.

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
            className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-lg-card p-6 md:p-8"
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
              {fr ? 'Récompenses quotidiennes' : 'Daily rewards'}
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-ivory text-center mb-6">
              {!user?.uid && !apercu
                ? (fr ? 'Une récompense par jour de visite' : 'One reward per day you visit')
                : jourServi
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
                      <span aria-hidden className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full p-1"
                            style={{ background: '#2a1c0c', border: '1px solid rgba(216,176,90,0.6)', color: '#D8B05A' }}>
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
              {user?.uid || apercu ? (
                <p className="font-sans uppercase tracking-[0.18em] text-[10px] mt-3" style={{ color: 'rgba(244,239,227,0.45)' }}>
                  {fr ? 'Nouvelle récompense dans' : 'New reward in'} {compte}
                </p>
              ) : (
                <p className="font-sans text-sm mt-1" style={{ color: '#D8B05A' }}>
                  {fr
                    ? 'Connectez-vous chaque jour : la récompense du jour tombe dans votre espace à la première visite. Un jour sauté ramène au jour 1.'
                    : 'Sign in every day: the day’s reward lands in your space on your first visit. A skipped day sends you back to day 1.'}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RecompensesQuotidiennes;
