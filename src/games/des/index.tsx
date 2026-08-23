import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Minus, Plus, Skull, RotateCcw, Users } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import SEO from '../../components/SEO';
import PageHeader from '../../components/layout/PageHeader';
import { Reveal, ScrollProgress } from '../../components/scroll';
import { creerTable, type TableDes } from './scene';
import {
  nouvellePartie, annoncer, douter, mancheSuivante, desEnJeu, miseValide,
  coupDeLaMachine, type Partie, type Face,
} from './regles';

// ─── Les dés du menteur ─────────────────────────────────────────────
// Troisième jeu du festival, celui de l'année de la Poudre (Alex,
// 2026-08-23). Table de taverne en 3D, gobelets de cuir, dés d'os, et
// le règlement de Perudo : l'as est joker, on monte ou on doute.
//
// Le clin d'œil demandé : l'Église interdisait ces jeux, la page le
// rappelle avec le sourire.

const NOMS_MACHINE = [
  'Le Bourreau', 'Dame Ysabeau', 'Le Meunier', 'Frère Anselme', 'La Rouquine',
  'Le Colporteur', 'Guillaume le Borgne',
];

const DesPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';

  const [nbJoueurs, setNbJoueurs] = useState(3);
  const [partie, setPartie] = useState<Partie | null>(null);
  const [quantite, setQuantite] = useState(2);
  const [face, setFace] = useState<Face>(3);

  const sceneRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<TableDes | null>(null);

  // ── La table 3D vit tant que la page vit ────────────────────────
  useEffect(() => {
    if (!sceneRef.current) return;
    const t = creerTable();
    t.monter(sceneRef.current);
    tableRef.current = t;
    return () => { t.demonter(); tableRef.current = null; };
  }, []);

  const moi = partie?.joueurs[0];
  const monTour = !!partie && partie.phase === 'annonces' && partie.tour === 0 && !partie.joueurs[0].elimine;
  const total = partie ? desEnJeu(partie) : 0;

  const commencer = useCallback(() => {
    const noms = [
      { nom: fr ? 'Vous' : 'You', machine: false },
      ...NOMS_MACHINE.slice(0, nbJoueurs - 1).map((n) => ({ nom: n, machine: true })),
    ];
    const p = nouvellePartie(noms);
    setPartie(p);
    setQuantite(Math.max(1, Math.round(desEnJeu(p) / 3)));
    setFace(3);
    tableRef.current?.disposer(nbJoueurs);
    tableRef.current?.devoiler([], false);
    tableRef.current?.lancer(p.joueurs[0].des);
  }, [nbJoueurs, fr]);

  // ── Les adversaires jouent tout seuls ───────────────────────────
  useEffect(() => {
    if (!partie || partie.phase !== 'annonces') return;
    const j = partie.joueurs[partie.tour];
    if (!j || !j.machine || j.elimine) return;
    tableRef.current?.designer(partie.tour);
    const minuteur = window.setTimeout(() => {
      setPartie((p) => {
        if (!p || p.phase !== 'annonces') return p;
        const coup = coupDeLaMachine(p);
        if (coup.action === 'doute') {
          const apres = douter(p);
          tableRef.current?.devoiler(apres.joueurs.slice(1).map((x) => x.des), true);
          return apres;
        }
        return annoncer(p, coup.quantite!, coup.face!);
      });
    }, 1100 + Math.random() * 900);
    return () => window.clearTimeout(minuteur);
  }, [partie]);

  // Quand c'est à moi, la mise proposée doit rester légale.
  useEffect(() => {
    if (!partie || !monTour) return;
    if (!miseValide(partie.mise, quantite, face, total)) {
      const q = partie.mise ? partie.mise.quantite : Math.max(1, Math.round(total / 3));
      const f = partie.mise ? (partie.mise.face < 6 ? ((partie.mise.face + 1) as Face) : 6) : 3;
      if (miseValide(partie.mise, q, f, total)) { setQuantite(q); setFace(f); }
      else { setQuantite(Math.min(total, (partie.mise?.quantite ?? 0) + 1)); setFace(2); }
    }
  }, [partie, monTour, quantite, face, total]);

  const jouerAnnonce = () => {
    if (!partie || !monTour) return;
    setPartie(annoncer(partie, quantite, face));
  };

  const jouerDoute = () => {
    if (!partie || !monTour || !partie.mise) return;
    const apres = douter(partie);
    tableRef.current?.devoiler(apres.joueurs.slice(1).map((x) => x.des), true);
    setPartie(apres);
  };

  const relancer = () => {
    if (!partie) return;
    const apres = mancheSuivante(partie);
    tableRef.current?.devoiler([], false);
    tableRef.current?.lancer(apres.joueurs[0].des);
    setPartie(apres);
    setQuantite(Math.max(1, Math.round(desEnJeu(apres) / 3)));
    setFace(3);
  };

  const t = useMemo(() => ({
    eyebrow: fr ? 'L’année de la Poudre' : 'The Year of the Powder',
    titre: fr ? 'Les dés du menteur' : 'Liar’s Dice',
    intro: fr
      ? 'Cinq dés sous un gobelet de cuir, une annonce qui monte, et le premier qui doute retourne les gobelets. L’as compte pour toutes les faces, sauf quand on annonce des as.'
      : 'Five dice under a leather cup, a bid that climbs, and the first to doubt turns the cups over. The ace counts as every face, except when aces are called.',
    pretre: fr
      ? 'Le curé rappelle que les jeux de hasard sont défendus. Jouez discrètement, et ne dites pas qui vous a appris.'
      : 'The priest reminds you that games of chance are forbidden. Play quietly, and do not say who taught you.',
    joueurs: fr ? 'Autour de la table' : 'Around the table',
    commencer: fr ? 'Dresser la table' : 'Set the table',
    annoncer: fr ? 'Annoncer' : 'Bid',
    menteur: fr ? 'Menteur !' : 'Liar!',
    manche: fr ? 'Manche suivante' : 'Next round',
    nouvelle: fr ? 'Nouvelle partie' : 'New game',
    votreMain: fr ? 'Votre main' : 'Your hand',
    enJeu: fr ? 'dés en jeu' : 'dice in play',
    aVous: fr ? 'À vous de parler' : 'Your call',
    attend: fr ? 'La table réfléchit…' : 'The table is thinking…',
    gagne: fr ? 'Vous ramassez la mise.' : 'You take the pot.',
    perdu: fr ? 'La table vous a eu.' : 'The table got you.',
  }), [fr]);

  const faces: Face[] = [1, 2, 3, 4, 5, 6];

  return (
    <>
      <SEO title={`${t.titre} | FMM 2026`} description={t.intro} />
      <ScrollProgress />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.titre}
        titleB=""
        intro={t.intro}
        orbImage="/tarot/T16.webp"
        orbImagePosition="center 40%"
      />

      <section className="relative pb-16 md:pb-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal>
            <div className="rounded-lg-card overflow-hidden border border-brass/25"
                 style={{ background: 'rgba(10,4,6,0.6)', boxShadow: '0 30px 90px rgba(0,0,0,0.55)' }}>

              {/* Bandeau : qui parle, combien de dés restent */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-brass/20 bg-black/30">
                <span className="font-sans text-[11px] md:text-xs uppercase tracking-[0.18em] text-ivory-soft">
                  {!partie
                    ? t.pretre
                    : partie.phase === 'fini'
                      ? (partie.gagnantId === 'j0' ? t.gagne : t.perdu)
                      : partie.phase === 'devoilement'
                        ? partie.journal[partie.journal.length - 1]
                        : monTour ? t.aVous : t.attend}
                </span>
                <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-brass">
                  {partie ? `${total} ${t.enJeu}` : ''}
                </span>
              </div>

              {/* La table */}
              <div ref={sceneRef} className="relative w-full h-[clamp(340px,58vh,520px)] bg-[#0a0506]" />

              {/* Les commandes */}
              <div className="px-4 md:px-6 py-5 border-t border-brass/20 bg-black/25">
                {!partie ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="witcher-stat-label inline-flex items-center gap-2">
                      <Users size={12} /> {t.joueurs}
                    </span>
                    <div className="inline-flex items-center gap-1 rounded-card border border-brass/35 bg-black/40 p-1">
                      {[2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setNbJoueurs(n)}
                          aria-pressed={nbJoueurs === n}
                          className={`w-11 h-10 rounded-card font-display text-lg transition ${
                            nbJoueurs === n ? 'bg-brass text-midnight-deep' : 'text-ivory-soft hover:bg-brass/15'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={commencer} className="fmm-glass-btn is-primary px-6 py-4" style={{ flexDirection: 'row', gap: '0.6rem' }}>
                      <Dices size={16} className="text-brass" />
                      <span className="fmm-glass-btn-label">{t.commencer}</span>
                    </button>
                  </div>
                ) : partie.phase === 'devoilement' ? (
                  <button type="button" onClick={relancer} className="fmm-glass-btn is-primary px-6 py-4" style={{ flexDirection: 'row', gap: '0.6rem' }}>
                    <RotateCcw size={15} className="text-brass" />
                    <span className="fmm-glass-btn-label">{t.manche}</span>
                  </button>
                ) : partie.phase === 'fini' ? (
                  <button type="button" onClick={() => setPartie(null)} className="fmm-glass-btn is-primary px-6 py-4" style={{ flexDirection: 'row', gap: '0.6rem' }}>
                    <RotateCcw size={15} className="text-brass" />
                    <span className="fmm-glass-btn-label">{t.nouvelle}</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-end gap-4">
                    {/* Quantité */}
                    <div>
                      <span className="witcher-stat-label block mb-2">{fr ? 'Combien' : 'How many'}</span>
                      <div className="inline-flex items-center gap-1 rounded-card border border-brass/35 bg-black/40 p-1">
                        <button type="button" disabled={!monTour} onClick={() => setQuantite((q) => Math.max(1, q - 1))}
                          className="w-10 h-10 rounded-card text-brass hover:bg-brass/15 disabled:opacity-40 font-display text-xl">
                          <Minus size={15} className="mx-auto" />
                        </button>
                        <span className="min-w-[3rem] text-center font-display title-medieval text-xl text-ivory">{quantite}</span>
                        <button type="button" disabled={!monTour} onClick={() => setQuantite((q) => Math.min(total, q + 1))}
                          className="w-10 h-10 rounded-card text-brass hover:bg-brass/15 disabled:opacity-40">
                          <Plus size={15} className="mx-auto" />
                        </button>
                      </div>
                    </div>

                    {/* Face */}
                    <div>
                      <span className="witcher-stat-label block mb-2">{fr ? 'De quelle face' : 'Of which face'}</span>
                      <div className="inline-flex items-center gap-1.5">
                        {faces.map((f) => (
                          <button
                            key={f}
                            type="button"
                            disabled={!monTour}
                            onClick={() => setFace(f)}
                            aria-pressed={face === f}
                            className={`w-10 h-10 rounded-card border font-display text-lg transition disabled:opacity-40 ${
                              face === f ? 'bg-brass text-midnight-deep border-brass' : 'bg-black/40 text-ivory-soft border-brass/30 hover:border-brass/70'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!monTour || !miseValide(partie.mise, quantite, face, total)}
                      onClick={jouerAnnonce}
                      className="fmm-glass-btn is-primary px-6 py-4 disabled:opacity-40"
                      style={{ flexDirection: 'row', gap: '0.6rem' }}
                    >
                      <span className="fmm-glass-btn-label">{t.annoncer}</span>
                    </button>
                    <button
                      type="button"
                      disabled={!monTour || !partie.mise}
                      onClick={jouerDoute}
                      className="fmm-glass-btn px-6 py-4 disabled:opacity-40"
                      style={{ flexDirection: 'row', gap: '0.6rem' }}
                    >
                      <Skull size={15} className="text-brass" />
                      <span className="fmm-glass-btn-label">{t.menteur}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* Main, joueurs, journal */}
          {partie && (
            <div className="grid lg:grid-cols-[1fr_1fr] gap-5 md:gap-6 mt-6">
              <div className="rounded-lg-card border border-brass/20 p-5 md:p-6" style={{ background: 'rgba(19,8,11,0.55)' }}>
                <p className="witcher-stat-label mb-3">{t.votreMain}</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {moi?.des.map((d, i) => (
                    <span key={i} className="w-11 h-11 rounded-card border border-brass/40 bg-black/40 flex items-center justify-center font-display title-medieval text-xl text-ivory">
                      {d}
                    </span>
                  ))}
                  {moi?.des.length === 0 && (
                    <span className="font-editorial italic text-sm text-ivory-soft/60">
                      {fr ? 'Plus un seul dé. La table vous regarde.' : 'Not one die left. The table watches you.'}
                    </span>
                  )}
                </div>
                <p className="witcher-stat-label mb-2">{t.joueurs}</p>
                <ul className="space-y-1.5">
                  {partie.joueurs.map((j, i) => (
                    <li key={j.id} className={`flex items-center justify-between gap-3 font-editorial text-sm ${j.elimine ? 'opacity-40' : ''}`}>
                      <span className={partie.tour === i && partie.phase === 'annonces' ? 'text-brass' : 'text-ivory-soft'}>
                        {j.nom}{partie.tour === i && partie.phase === 'annonces' ? ' ·' : ''}
                      </span>
                      <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-ivory-soft/60">
                        {j.des.length} {fr ? 'dés' : 'dice'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg-card border border-brass/20 p-5 md:p-6" style={{ background: 'rgba(19,8,11,0.55)' }}>
                <p className="witcher-stat-label mb-3">{fr ? 'Ce qui s’est dit' : 'What was said'}</p>
                <AnimatePresence initial={false}>
                  <ul className="space-y-1.5 max-h-[15rem] overflow-y-auto">
                    {[...partie.journal].reverse().slice(0, 12).map((l, i) => (
                      <motion.li
                        key={`${l}-${i}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="font-editorial text-sm text-ivory-soft/85"
                      >
                        {l}
                      </motion.li>
                    ))}
                  </ul>
                </AnimatePresence>
              </div>
            </div>
          )}

          <p className="font-editorial italic text-sm text-ivory-soft/60 mt-6 max-w-2xl">
            {t.pretre}
          </p>
        </div>
      </section>
    </>
  );
};

export default DesPage;
