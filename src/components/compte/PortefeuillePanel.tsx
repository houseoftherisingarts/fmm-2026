import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { HandHeart, Music, Drama, Tent, UtensilsCrossed, Wifi, ExternalLink, Check, TrendingUp } from 'lucide-react';
import PieceMontpellois from '../boutique/PieceMontpellois';
import { useAuth } from '../../contexts/AuthContext';
import { suivreMaBourse } from '../../firebase/montpellois';
import { suivreTotauxBudget, suivreMesMises, voterBudget, type TotauxBudget } from '../../firebase/budgetVotes';
import {
  CATEGORIES_BUDGET, MISES_RAPIDES, ZEFFY_BUDGET,
  type CategorieBudget, type CategorieBudgetId,
} from '../../content/budgetVotes';

// ─── Votez avec votre portefeuille ───────────────────────────────────
// Alex, 2026-09-06. La question tient en une ligne : où voulez-vous
// voir votre argent travailler l'an prochain ? Six enveloppes, une
// bourse, et deux rails de paiement. Les Montpellois se misent ici même
// (le serveur débite, voir voterBudget dans functions/index.js), les
// dollars passent par Zeffy dans un autre onglet.
//
// La rupture visuelle, une seule pour toute la section (règle Von
// Restorff) : la case en tête porte sa barre pleine et son ruban doré.
// Les cinq autres gardent un filet mince. Deux ruptures s'annulent.

const ICONES: Record<CategorieBudget['icone'], React.ComponentType<{ size?: number }>> = {
  'hand-heart': HandHeart, music: Music, drama: Drama,
  tent: Tent, 'utensils-crossed': UtensilsCrossed, wifi: Wifi,
};

const PortefeuillePanel: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;
  const { user, openSignIn } = useAuth();

  const [solde, setSolde] = useState<number | null>(null);
  const [totaux, setTotaux] = useState<TotauxBudget>({ montpellois: {}, mises: {} });
  const [miennes, setMiennes] = useState<Partial<Record<CategorieBudgetId, number>>>({});

  useEffect(() => suivreTotauxBudget(setTotaux), []);
  useEffect(() => {
    if (!user?.uid) { setSolde(null); setMiennes({}); return; }
    const arreterBourse = suivreMaBourse(user.uid, (b) => setSolde(b.solde ?? 0));
    const arreterMises = suivreMesMises(user.uid, setMiennes);
    return () => { arreterBourse(); arreterMises(); };
  }, [user?.uid]);

  const [choisie, setChoisie] = useState<CategorieBudgetId | null>(null);
  const [montant, setMontant] = useState(MISES_RAPIDES[0]);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  const pot = useMemo(
    () => CATEGORIES_BUDGET.reduce((s, c) => s + (totaux.montpellois[c.id] || 0), 0),
    [totaux],
  );
  const misesTotal = useMemo(
    () => CATEGORIES_BUDGET.reduce((s, c) => s + (totaux.mises[c.id] || 0), 0),
    [totaux],
  );
  const tete = useMemo(() => {
    if (pot === 0) return null;
    return CATEGORIES_BUDGET.reduce((meilleure, c) =>
      (totaux.montpellois[c.id] || 0) > (totaux.montpellois[meilleure.id] || 0) ? c : meilleure,
    CATEGORIES_BUDGET[0]).id;
  }, [totaux, pot]);

  const categorie = CATEGORIES_BUDGET.find((c) => c.id === choisie) || null;
  const lienZeffy = categorie?.zeffy || ZEFFY_BUDGET;

  const miser = async () => {
    if (!categorie) return;
    setEnvoi(true); setMessage(null); setFait(false);
    try {
      await voterBudget(categorie.id, montant);
      setFait(true);
      setTimeout(() => setFait(false), 4000);
    } catch (e) {
      // Le serveur répond par un code Firebase. Sans traduction, le
      // membre lit « internal » en petit doré et ne sait rien.
      const code = (e as { code?: string })?.code || '';
      setMessage(
        /(not-found|internal|unavailable)$/.test(code) ? t.errService
        : code.endsWith('unauthenticated') ? t.errConnexion
        : code.endsWith('failed-precondition') ? t.errSolde
        : (e instanceof Error ? e.message : String(e)),
      );
    } finally { setEnvoi(false); }
  };

  return (
    <section className="glass-light rounded-lg-card p-6 md:p-9">
      {/* ── L'en-tête et la question ─────────────────────────────── */}
      {/* Le titre tient sur deux lignes au plus, à tous les écrans :
          il occupe donc toute la largeur, sans colonne d'icône à sa
          gauche pour l'étrangler (règle des deux lignes, Alex). */}
      <header className="mb-6">
        <p className="witcher-stat-label inline-flex items-center gap-2 mb-3">
          <PieceMontpellois size={14} /> {t.eyebrow}
        </p>
        <h2 className="font-display text-[26px] sm:text-4xl md:text-[2.8rem] leading-[1.1]"
            style={{ color: 'var(--color-bone)', fontWeight: 400 }}>
          {t.question}
        </h2>
      </header>

      <p className="font-editorial text-sm md:text-[15px] leading-[1.75] mb-7 max-w-2xl"
         style={{ color: 'rgba(var(--sk-parchment-rgb), 0.72)' }}>
        {t.lead}
      </p>

      {/* ── Le pot commun et la bourse du membre ─────────────────── */}
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4 mb-8 pb-6"
           style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb), 0.12)' }}>
        <div>
          <p className="witcher-stat-label mb-1.5">{t.pot}</p>
          <p className="font-display text-3xl md:text-4xl leading-none flex items-center gap-2.5"
             style={{ color: 'var(--color-bone)' }}>
            <PieceMontpellois size={26} /> {pot}
          </p>
        </div>
        {misesTotal > 0 && (
          <div>
            <p className="witcher-stat-label mb-1.5">{t.mises}</p>
            <p className="font-display text-2xl md:text-3xl leading-none" style={{ color: 'var(--color-bone)' }}>
              {misesTotal}
            </p>
          </div>
        )}
        {user && (
          <div>
            <p className="witcher-stat-label mb-1.5">{t.maBourse}</p>
            <p className="font-display text-2xl md:text-3xl leading-none" style={{ color: 'var(--sk-gilt)' }}>
              {solde ?? '0'}
            </p>
          </div>
        )}
      </div>

      {/* ── Les six enveloppes ───────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        {CATEGORIES_BUDGET.map((c, i) => {
          const Icone = ICONES[c.icone];
          const mise = totaux.montpellois[c.id] || 0;
          const part = pot > 0 ? Math.round((mise / pot) * 100) : 0;
          const enTete = tete === c.id && mise > 0;
          const active = choisie === c.id;
          const mienne = miennes[c.id] || 0;
          return (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => { setChoisie(c.id); setMessage(null); }}
              aria-pressed={active}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.995 }}
              className="text-left rounded-card p-5 transition-colors"
              style={{
                background: active ? 'rgba(var(--sk-gilt-rgb), 0.09)' : 'rgba(var(--sk-deep-rgb), 0.5)',
                border: `1px solid ${active ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb), 0.12)'}`,
              }}
            >
              <div className="flex items-start gap-3.5 mb-3">
                <span className="witcher-tile shrink-0" style={{ width: 38, height: 38 }}>
                  <span className="witcher-tile-inner" style={{ color: 'var(--sk-gilt)' }}><Icone size={15} /></span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[17px] md:text-lg leading-snug" style={{ color: 'var(--color-bone)' }}>
                    {fr ? c.nomFR : c.nomEN}
                  </p>
                  {enTete && (
                    <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full font-sans uppercase tracking-[0.16em] text-[9px]"
                          style={{ background: 'rgba(var(--sk-gilt-rgb),0.18)', border: '1px solid var(--sk-gilt)', color: 'var(--sk-gilt)' }}>
                      <TrendingUp size={10} /> {t.enTete}
                    </span>
                  )}
                </div>
              </div>

              <p className="font-editorial text-[13.5px] leading-[1.65] mb-4"
                 style={{ color: 'rgba(var(--sk-parchment-rgb), 0.66)' }}>
                {fr ? c.texteFR : c.texteEN}
              </p>

              {/* Le compte, puis la barre : filet mince partout, bande
                  pleine pour la case en tête. C'est la seule rupture
                  de la section, et elle ne se dédouble jamais. */}
              <div className="flex items-baseline justify-between gap-3 mb-2">
                {pot === 0 ? (
                  <span className="font-sans text-[11.5px]" style={{ color: 'rgba(var(--sk-parchment-rgb), 0.42)' }}>
                    {t.rienEncore}
                  </span>
                ) : (
                  <>
                    <span className="font-display text-xl leading-none flex items-baseline gap-1.5"
                          style={{ color: enTete ? 'var(--sk-gilt)' : 'var(--color-bone)' }}>
                      {mise}
                      <span className="font-sans text-[10px] uppercase tracking-[0.18em]"
                            style={{ color: 'rgba(var(--sk-parchment-rgb), 0.45)' }}>
                        {t.montpellois}
                      </span>
                    </span>
                    <span className="font-sans text-[11.5px] tabular-nums"
                          style={{ color: enTete ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb), 0.5)' }}>
                      {part} %
                    </span>
                  </>
                )}
              </div>
              <div className="h-[3px] w-full rounded-full overflow-hidden"
                   style={{ background: 'rgba(var(--sk-parchment-rgb), 0.10)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: enTete ? 'var(--sk-gilt)' : 'rgba(var(--sk-gilt-rgb), 0.42)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${part}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              {mienne > 0 && (
                <p className="font-sans text-[11px] mt-2" style={{ color: 'var(--sk-gilt)' }}>
                  {t.vousAvezMis} {mienne}
                </p>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Le banc de mise ──────────────────────────────────────── */}
      <div className="mt-7 pt-6" style={{ borderTop: '1px solid rgba(var(--sk-parchment-rgb), 0.12)' }}>
        {!categorie ? (
          <p className="font-sans text-sm" style={{ color: 'rgba(var(--sk-parchment-rgb), 0.5)' }}>
            {t.choisir}
          </p>
        ) : (
          <>
            <p className="witcher-stat-label mb-3">
              {t.votreMise} · {fr ? categorie.nomFR : categorie.nomEN}
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-5">
              {MISES_RAPIDES.map((m) => (
                <button key={m} type="button" onClick={() => setMontant(m)}
                        className="px-4 py-2 rounded-card font-sans text-[12px] transition-colors"
                        style={{
                          background: montant === m ? 'rgba(var(--sk-gilt-rgb), 0.16)' : 'transparent',
                          border: `1px solid ${montant === m ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb), 0.2)'}`,
                          color: montant === m ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb), 0.75)',
                        }}>
                  {m}
                </button>
              ))}
              <label className="inline-flex items-center gap-2">
                <span className="sr-only">{t.montantLibre}</span>
                <input type="number" min={1} max={1000} value={montant}
                       onChange={(e) => setMontant(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                       className="witcher-input font-sans" style={{ width: 96 }} />
              </label>
            </div>

            {user ? (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={miser} disabled={envoi}
                        className="witcher-prompt disabled:opacity-50" data-primary="true">
                  <span className="witcher-prompt-glyph"><span>A</span></span>
                  {envoi ? t.envoi : `${t.miser} ${montant}`}
                </button>
                <a href={lienZeffy} target="_blank" rel="noopener noreferrer" className="witcher-prompt">
                  <span className="witcher-prompt-glyph"><span>$</span></span>
                  {t.dollars} <ExternalLink size={12} />
                </a>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={openSignIn} className="witcher-prompt" data-primary="true">
                  <span className="witcher-prompt-glyph"><span>A</span></span>
                  {t.connexion}
                </button>
                <a href={lienZeffy} target="_blank" rel="noopener noreferrer" className="witcher-prompt">
                  <span className="witcher-prompt-glyph"><span>$</span></span>
                  {t.dollars} <ExternalLink size={12} />
                </a>
              </div>
            )}

            {fait && (
              <p role="status" className="mt-4 font-sans text-sm inline-flex items-center gap-2" style={{ color: 'var(--sk-gilt)' }}>
                <Check size={14} /> {t.merci}
              </p>
            )}
            {message && (
              <p role="alert" className="mt-4 font-sans text-sm" style={{ color: '#E08A6E' }}>{message}</p>
            )}
          </>
        )}

        <p className="font-sans text-[11px] mt-5" style={{ color: 'rgba(var(--sk-parchment-rgb), 0.42)' }}>
          {t.note}
        </p>
      </div>
    </section>
  );
};

const FR = {
  eyebrow: 'Votez avec votre portefeuille',
  question: 'Où doit aller votre argent ?',
  lead: 'Votre bourse décide de l’an prochain. Mettez vos Montpellois dans l’enveloppe où vous voulez voir le festival grandir, et le total se rajuste devant vous. Zeffy prend le relais pour qui préfère y mettre de l’argent réel.',
  pot: 'Misé jusqu’ici', mises: 'Mises', maBourse: 'Ma bourse', montpellois: 'Montpellois',
  rienEncore: 'Rien encore.',
  enTete: 'En tête', vousAvezMis: 'Vous y avez mis',
  choisir: 'Choisissez une enveloppe pour placer votre mise.',
  votreMise: 'Votre mise', montantLibre: 'Montant libre',
  miser: 'Miser', envoi: 'Un instant…', dollars: 'Mettre des dollars',
  connexion: 'Connectez-vous pour miser',
  merci: 'Votre mise est entrée. Merci.',
  note: 'Les mises servent à bâtir le budget de l’édition suivante. Rien n’est remboursable, et rien n’est promis avant que le conseil ait tranché.',
  errService: 'Le service des mises n’est pas encore en ligne. Réessayez un peu plus tard.',
  errConnexion: 'Connectez-vous d’abord.',
  errSolde: 'Votre bourse ne suit pas ce montant.',
};

const EN: typeof FR = {
  eyebrow: 'Vote with your wallet',
  question: 'Where should your money go?',
  lead: 'Your purse decides next year. Put your Montpellois in the envelope where you want the festival to grow, and the tally shifts in front of you. Zeffy takes over for anyone who would rather put in real money.',
  pot: 'Pledged so far', mises: 'Stakes', maBourse: 'My purse', montpellois: 'Montpellois',
  rienEncore: 'Nothing yet.',
  enTete: 'Leading', vousAvezMis: 'You put in',
  choisir: 'Pick an envelope to place your stake.',
  votreMise: 'Your stake', montantLibre: 'Free amount',
  miser: 'Stake', envoi: 'One moment…', dollars: 'Put in dollars',
  connexion: 'Sign in to stake',
  merci: 'Your stake is in. Thank you.',
  note: 'Stakes go toward building the next edition’s budget. Nothing is refundable, and nothing is promised until the board has decided.',
  errService: 'The staking service is not online yet. Try again a little later.',
  errConnexion: 'Sign in first.',
  errSolde: 'Your purse will not carry that amount.',
};

export default PortefeuillePanel;
