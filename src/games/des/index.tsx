import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CreditJeux from '../../components/jeux/CreditJeux';
import BoutonMusique, { type BoutonMusiqueHandle } from '../../components/jeux/BoutonMusique';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Minus, Plus, Skull, RotateCcw, Users, Target, ScrollText } from 'lucide-react';
import { useBadgeJeu, useGagnerBadge } from '../../contexts/BadgesContext';
import { useUI } from '../../contexts/AppContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import SEO from '../../components/SEO';
import { creerTable, type TableDes } from './scene';
import {
  nouvellePartie, annoncer, douter, exact as appelExact, mancheSuivante, desEnJeu,
  miseValide, coupDeLaMachine, type Partie, type Face,
} from './regles';

// ─── Les dés du menteur ─────────────────────────────────────────────
// Troisième jeu du festival, celui de l'année de la Poudre (Alex,
// 2026-08-23). Table de taverne en 3D, gobelets de cuir, dés d'os, et
// le règlement de Perudo : l'as est joker, on monte ou on doute.
//
// Le clin d'œil demandé : l'Église interdisait ces jeux, la page le
// rappelle avec le sourire.

// Le règlement, tel qu'il se joue à la table du festival.
const REGLES_FR = [
  'Chacun secoue ses cinq dés sous son gobelet et regarde sa main sans la montrer.',
  'À tour de rôle, on annonce combien de dés d’une même face il y a sur TOUTE la table, la sienne comprise.',
  'Chaque annonce doit monter : plus de dés, ou la même quantité d’une face plus haute.',
  'L’as compte pour toutes les faces. Sauf quand l’annonce porte sur les as : là, il ne vaut que lui-même.',
  'Au lieu de monter, on peut crier « menteur ! ». On lève alors tous les gobelets et on compte.',
  'Si l’annonce tenait, le douteur perd un dé. Si elle était trop haute, c’est celui qui l’a faite qui en perd un.',
  'On peut aussi annoncer « c’est exactement ça ». Si le compte tombe pile, on récupère un dé perdu; sinon on en perd un.',
  'Le gobelet vidé de son dernier dé quitte la table. Le dernier joueur debout ramasse la mise.',
];
const REGLES_EN = [
  'Everyone shakes five dice under their cup and looks at their hand without showing it.',
  'In turn, you bid how many dice of one face are on the WHOLE table, your own included.',
  'Every bid must climb: more dice, or the same count of a higher face.',
  'The ace is wild. Except when the bid is on aces: then it only counts as itself.',
  'Instead of raising, you may call “liar!”. Every cup goes up and the dice are counted.',
  'If the bid held, the doubter loses a die. If it was too high, the bidder loses one.',
  'You may also call it exact. If the count lands on the nose, you win back a lost die; otherwise you lose one.',
  'A cup emptied of its last die leaves the table. The last player standing takes the pot.',
];

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
  useBadgeJeu('des');
  useGagnerBadge('des', partie?.gagnantId === 'j0');
  const [quantite, setQuantite] = useState(2);
  const [face, setFace] = useState<Face>(3);

  const sceneRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<TableDes | null>(null);

  // ── Les bulles de dialogue ──────────────────────────────────────
  // Ce qu'un joueur annonce s'écrit au-dessus de sa place, comme dans
  // une bande dessinée (Alex, 2026-08-23).
  const [ancres, setAncres] = useState<Array<{ x: number; y: number }>>([]);
  const [bulles, setBulles] = useState<Record<number, string>>({});
  const [reglesOuvertes, setReglesOuvertes] = useState(false);
  // La taverne chante dès que la table est dressée.
  const musiqueRef = useRef<BoutonMusiqueHandle>(null);

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
    tableRef.current?.mains(p.joueurs.map((j) => j.des.length));
    tableRef.current?.lancer(p.joueurs[0].des);
    tableRef.current?.remuer(p.joueurs.map((_, i) => i).filter((i) => i > 0));
    musiqueRef.current?.demarrer();
  }, [nbJoueurs, fr]);

  // Aperçu de développement seulement : `?apercu=1&auto=1` dresse la
  // table sans clic, pour vérifier le rendu des dés à l'écran.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('apercu') === '1' && q.get('auto') === '1' && !partie) {
      const t = window.setTimeout(() => commencer(), 400);
      return () => window.clearTimeout(t);
    }
  }, [commencer, partie]);

  // Les places se reprojettent tant que la table vit : la fenêtre
  // change, les bulles suivent.
  useEffect(() => {
    let vivant = true;
    const suivre = () => {
      if (!vivant) return;
      const a = tableRef.current?.ancres();
      if (a && a.length) setAncres(a);
      window.setTimeout(suivre, 400);
    };
    suivre();
    return () => { vivant = false; };
  }, []);

  // La dernière annonce de chacun devient sa bulle.
  useEffect(() => {
    if (!partie) { setBulles({}); return; }
    if (!partie.mise) { setBulles({}); return; }
    const i = partie.joueurs.findIndex((j) => j.id === partie.mise!.parId);
    if (i < 0) return;
    const texte = `${partie.mise.quantite} × ${partie.mise.face}`;
    setBulles({ [i]: texte });
  }, [partie?.mise?.parId, partie?.mise?.quantite, partie?.mise?.face, partie?.manche]);

  // Au dévoilement, celui qui a parlé le dernier crie.
  useEffect(() => {
    if (!partie || partie.phase !== 'devoilement' || !partie.devoilement) return;
    const d = partie.devoilement;
    const i = partie.joueurs.findIndex((j) => j.id === d.doutePar);
    if (i < 0) return;
    setBulles({ [i]: d.exact ? (fr ? 'Exactement ça !' : 'Spot on!') : (fr ? 'Menteur !' : 'Liar!') });
  }, [partie?.phase, partie?.devoilement?.doutePar, fr]);

  // La douche de lumière suit celui qui parle, moi compris.
  useEffect(() => {
    if (!partie || partie.phase !== 'annonces') return;
    tableRef.current?.designer(partie.tour);
  }, [partie?.tour, partie?.phase]);

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
          montrerLeDevoilement(apres);
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

  /** Le dévoilement se voit sur la table : gobelets levés, dé qui part
   *  en fumée, dé qui retombe pour un exact réussi. */
  const montrerLeDevoilement = (apres: Partie) => {
    const t3 = tableRef.current;
    if (!t3) return;
    t3.devoiler(apres.joueurs.slice(1).map((x) => x.des), true);
    const d = apres.devoilement;
    if (!d) return;
    if (d.perdantId) {
      const i = apres.joueurs.findIndex((j) => j.id === d.perdantId);
      // Trois secondes de répit : la table se regarde, le verdict se
      // lit, et seulement ensuite le dé s'en va.
      if (i >= 0) window.setTimeout(() => t3.perdreUnDe(i), 3000);
    }
    if (d.gagnantDeId) {
      const i = apres.joueurs.findIndex((j) => j.id === d.gagnantDeId);
      if (i >= 0) window.setTimeout(() => t3.reprendreUnDe(i), 3000);
    }
    window.setTimeout(() => t3.mains(apres.joueurs.map((j) => j.des.length)), 4200);
  };

  const jouerDoute = () => {
    if (!partie || !monTour || !partie.mise) return;
    const apres = douter(partie);
    montrerLeDevoilement(apres);
    setPartie(apres);
  };

  const jouerExact = () => {
    if (!partie || !monTour || !partie.mise) return;
    const apres = appelExact(partie);
    montrerLeDevoilement(apres);
    setPartie(apres);
  };

  const relancer = () => {
    if (!partie) return;
    const apres = mancheSuivante(partie);
    tableRef.current?.devoiler([], false);
    tableRef.current?.mains(apres.joueurs.map((j) => j.des.length));
    tableRef.current?.lancer(apres.joueurs[0].des);
    tableRef.current?.remuer(apres.joueurs.map((_, i) => i).filter((i) => i > 0 && !apres.joueurs[i].elimine));
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
    exact: fr ? 'Exactement ça' : 'Spot on',
    exactAide: fr
      ? 'Annoncer que la mise tombe pile : si vous avez raison, vous reprenez un dé perdu. Sinon vous en perdez un.'
      : 'Call the bid exact: if you are right, you win back a lost die. If not, you lose one.',
    gagne: fr ? 'Vous ramassez la mise.' : 'You take the pot.',
    perdu: fr ? 'La table vous a eu.' : 'The table got you.',
  }), [fr]);

  const faces: Face[] = [1, 2, 3, 4, 5, 6];

  return (
    <>
      <SEO title={`${t.titre} | FMM 2026`} description={t.intro} />

      {/* Une seule fenêtre : la table occupe l'écran, tout le reste se
          pose dessus (Alex, 2026-08-23 : « le jeu doit être
          self-contained dans une seule page, une seule fenêtre »). */}
      <section className="relative w-full" style={{ background: '#0a0506' }}>
        <div
          className="relative w-full overflow-hidden"
          style={{ height: 'calc(100vh - 5rem)', minHeight: '32rem', marginTop: '5rem' }}
        >
          <div ref={sceneRef} className="absolute inset-0" />

          {/* Le verdict : au centre de la table, en grand, le temps que
              tout le monde regarde les dés avant qu'un dé s'en aille
              (Alex, 2026-08-23). */}
          <AnimatePresence>
            {partie?.phase === 'devoilement' && partie.devoilement && (
              <motion.div
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 190, damping: 22 }}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 flex justify-center px-6 pointer-events-none"
              >
                <div className="max-w-2xl rounded-lg-card border border-brass/45 px-8 py-6 text-center"
                     style={{ background: 'rgba(8,3,5,0.86)', backdropFilter: 'blur(10px)',
                              boxShadow: '0 26px 70px rgba(0,0,0,0.6)' }}>
                  <p className="font-sans uppercase tracking-[0.3em] text-[10px] text-ivory-soft/60 mb-3">
                    {partie.devoilement.exact
                      ? (fr ? 'Exactement ça' : 'Spot on')
                      : (fr ? 'Menteur' : 'Liar')}
                  </p>
                  <p className="font-display title-medieval text-2xl md:text-3xl text-ivory leading-snug">
                    {partie.journal[partie.journal.length - 1]}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Les bulles : ce que chacun annonce, au-dessus de sa place */}
          <AnimatePresence>
            {partie && Object.entries(bulles).map(([idx, texte]) => {
              const i = Number(idx);
              const a = ancres[i];
              if (!a) return null;
              const j = partie.joueurs[i];
              return (
                <motion.div
                  key={`${i}-${texte}`}
                  initial={{ opacity: 0, scale: 0.7, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -6 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="absolute z-20 pointer-events-none"
                  style={{ left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%, -100%)' }}
                >
                  <div className="relative px-4 py-2.5 rounded-[14px] border text-center"
                       style={{
                         background: 'rgba(244,239,227,0.94)',
                         borderColor: 'rgba(120,70,30,0.55)',
                         boxShadow: '0 10px 26px rgba(0,0,0,0.5)',
                         minWidth: '5.5rem',
                       }}>
                    <span className="block font-sans uppercase tracking-[0.16em] text-[9px]"
                          style={{ color: 'rgba(80,45,15,0.7)' }}>
                      {j?.nom}
                    </span>
                    <span className="block font-display title-medieval text-lg leading-tight"
                          style={{ color: '#2a1505' }}>
                      {texte}
                    </span>
                    {/* La pointe de la bulle, vers le joueur */}
                    <span aria-hidden className="absolute left-1/2 -bottom-[9px] -translate-x-1/2"
                          style={{
                            width: 0, height: 0,
                            borderLeft: '9px solid transparent',
                            borderRight: '9px solid transparent',
                            borderTop: '10px solid rgba(244,239,227,0.94)',
                          }} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Bandeau du haut : le titre, ce qui se dit, les dés en jeu */}
          <div className="absolute top-0 inset-x-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 md:px-7 py-3"
               style={{ background: 'linear-gradient(180deg, rgba(8,3,5,0.92), rgba(8,3,5,0))' }}>
            <span className="font-display title-medieval text-lg md:text-xl text-ivory">
              {t.titre}
            </span>
            <span className="font-sans text-[11px] md:text-xs uppercase tracking-[0.18em] text-ivory-soft/85 order-3 md:order-2 w-full md:w-auto text-center">
              {!partie
                ? t.pretre
                : partie.phase === 'fini'
                  ? (partie.gagnantId === 'j0' ? t.gagne : t.perdu)
                  : partie.phase === 'devoilement'
                    ? partie.journal[partie.journal.length - 1]
                    : monTour ? t.aVous : t.attend}
            </span>
            <span className="font-sans text-[10px] uppercase tracking-[0.22em] order-2 md:order-3"
                  style={{ color: 'var(--color-amber-glow)' }}>
              {partie ? `${total} ${t.enJeu}` : ''}
            </span>
          </div>

          {/* À gauche : qui est encore là, et avec combien de dés */}
          {partie && (
            <div className="absolute left-3 md:left-6 top-16 md:top-20 z-10 w-40 md:w-52 rounded-lg-card border border-brass/25 px-3.5 py-3"
                 style={{ background: 'rgba(8,3,5,0.62)', backdropFilter: 'blur(6px)' }}>
              <p className="witcher-stat-label mb-2">{t.joueurs}</p>
              <ul className="space-y-1.5">
                {partie.joueurs.map((j, i) => (
                  <li key={j.id} className={`flex items-center justify-between gap-2 font-editorial text-[13px] ${j.elimine ? 'opacity-35 line-through' : ''}`}>
                    <span className={partie.tour === i && partie.phase === 'annonces' ? 'text-brass' : 'text-ivory-soft'}>
                      {j.nom}
                    </span>
                    <span className="font-sans text-[10px] tracking-[0.14em] text-ivory-soft/55 tabular-nums">
                      {'◆'.repeat(j.des.length) || '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* À droite : les trois dernières paroles */}
          {partie && partie.journal.length > 0 && (
            <div className="absolute right-3 md:right-6 top-16 md:top-20 z-10 w-44 md:w-64 text-right">
              <AnimatePresence initial={false}>
                {[...partie.journal].reverse().slice(0, 3).map((l, i) => (
                  <motion.p
                    key={`${l}-${i}`}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1 - i * 0.3, x: 0 }}
                    className="font-editorial text-[13px] text-ivory-soft leading-snug mb-1.5"
                  >
                    {l}
                  </motion.p>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* En bas à gauche : ma main */}
          {partie && (
            <div className="absolute left-3 md:left-6 bottom-28 md:bottom-32 z-10">
              <p className="witcher-stat-label mb-2">{t.votreMain}</p>
              <div className="flex flex-wrap gap-1.5 max-w-[11rem]">
                <AnimatePresence>
                  {moi?.des.map((d, i) => (
                    <motion.span
                      key={`${i}-${d}`}
                      initial={{ opacity: 0, scale: 0.6, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.4, y: -14 }}
                      transition={{ duration: 0.35 }}
                      className="w-10 h-10 rounded-[10px] border border-brass/40 flex items-center justify-center font-display title-medieval text-lg text-ivory"
                      style={{ background: 'rgba(8,3,5,0.7)' }}
                    >
                      {d}
                    </motion.span>
                  ))}
                </AnimatePresence>
                {moi && moi.des.length === 0 && (
                  <span className="font-editorial italic text-[13px] text-ivory-soft/60 max-w-[11rem] block">
                    {fr ? 'Plus un seul dé. La table vous regarde.' : 'Not one die left. The table watches you.'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* La musique de taverne, en haut à gauche de la table */}
          <div className="absolute left-3 md:left-6 top-16 z-20">
            <BoutonMusique
              ref={musiqueRef}
              cle="des"
              url="/audio/master-of-the-feast.mp3"
              titre="Master of the Feast · Kevin MacLeod"
              onLabel={fr ? 'Couper' : 'Mute'}
              offLabel={fr ? 'Musique' : 'Music'}
            />
          </div>

          {/* Les règles, à gauche de la table */}
          <button
            type="button"
            onClick={() => setReglesOuvertes((v) => !v)}
            className="absolute left-3 md:left-6 bottom-6 z-20 px-4 py-2.5 rounded-full border border-brass/45 font-sans uppercase tracking-[0.18em] text-[10px] text-ivory hover:bg-brass/15 transition-colors inline-flex items-center gap-2"
            style={{ background: 'rgba(8,3,5,0.72)', backdropFilter: 'blur(6px)' }}
          >
            <ScrollText size={13} className="text-brass" />
            {reglesOuvertes ? (fr ? 'Cacher les règles' : 'Hide the rules') : (fr ? 'Afficher les règles' : 'Show the rules')}
          </button>

          <AnimatePresence>
            {reglesOuvertes && (
              <motion.aside
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-3 md:left-6 bottom-20 z-20 w-[19rem] max-w-[85vw] rounded-lg-card border border-brass/30 p-5 max-h-[62vh] overflow-y-auto"
                style={{ background: 'rgba(8,3,5,0.9)', backdropFilter: 'blur(10px)' }}
              >
                <h2 className="font-display title-medieval text-lg text-ivory mb-3">
                  {fr ? 'Les règles' : 'The rules'}
                </h2>
                <div className="divider-brass w-12 mb-4" />
                <ol className="space-y-3 font-editorial text-[13px] text-ivory-soft leading-relaxed list-none">
                  {(fr ? REGLES_FR : REGLES_EN).map((r, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-display title-medieval text-brass/70 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ol>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Le pupitre : tout se joue ici */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-3 md:px-6 pb-4 pt-8"
               style={{ background: 'linear-gradient(0deg, rgba(8,3,5,0.94), rgba(8,3,5,0))' }}>
            {!partie ? (
              <div className="mx-auto w-full max-w-2xl rounded-lg-card border border-brass/30 px-5 py-5 flex flex-wrap items-center justify-center gap-4"
                   style={{ background: 'rgba(8,3,5,0.72)', backdropFilter: 'blur(8px)' }}>
                <span className="witcher-stat-label inline-flex items-center gap-2">
                  <Users size={12} /> {t.joueurs}
                </span>
                <div className="inline-flex items-center gap-1 rounded-card border border-brass/35 bg-black/40 p-1">
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n} type="button" onClick={() => setNbJoueurs(n)}
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
              <div className="flex justify-center">
                <button type="button" onClick={relancer} className="fmm-glass-btn is-primary px-6 py-4" style={{ flexDirection: 'row', gap: '0.6rem' }}>
                  <RotateCcw size={15} className="text-brass" />
                  <span className="fmm-glass-btn-label">{t.manche}</span>
                </button>
              </div>
            ) : partie.phase === 'fini' ? (
              <div className="flex justify-center">
                <button type="button" onClick={() => setPartie(null)} className="fmm-glass-btn is-primary px-6 py-4" style={{ flexDirection: 'row', gap: '0.6rem' }}>
                  <RotateCcw size={15} className="text-brass" />
                  <span className="fmm-glass-btn-label">{t.nouvelle}</span>
                </button>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-4xl rounded-lg-card border border-brass/25 px-4 md:px-5 py-4 flex flex-wrap items-end justify-center gap-3 md:gap-4"
                   style={{ background: 'rgba(8,3,5,0.66)', backdropFilter: 'blur(8px)' }}>
                <div>
                  <span className="witcher-stat-label block mb-1.5">{fr ? 'Combien' : 'How many'}</span>
                  <div className="inline-flex items-center gap-1 rounded-card border border-brass/35 bg-black/40 p-1">
                    <button type="button" disabled={!monTour} onClick={() => setQuantite((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-card text-brass hover:bg-brass/15 disabled:opacity-40">
                      <Minus size={15} className="mx-auto" />
                    </button>
                    <span className="min-w-[2.6rem] text-center font-display title-medieval text-xl text-ivory">{quantite}</span>
                    <button type="button" disabled={!monTour} onClick={() => setQuantite((q) => Math.min(total, q + 1))}
                      className="w-9 h-9 rounded-card text-brass hover:bg-brass/15 disabled:opacity-40">
                      <Plus size={15} className="mx-auto" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="witcher-stat-label block mb-1.5">{fr ? 'De quelle face' : 'Of which face'}</span>
                  <div className="inline-flex items-center gap-1.5">
                    {faces.map((f) => (
                      <button
                        key={f} type="button" disabled={!monTour} onClick={() => setFace(f)}
                        aria-pressed={face === f}
                        className={`w-9 h-9 rounded-card border font-display text-lg transition disabled:opacity-40 ${
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
                  className="fmm-glass-btn is-primary px-5 py-3.5 disabled:opacity-40"
                  style={{ flexDirection: 'row', gap: '0.5rem' }}
                >
                  <span className="fmm-glass-btn-label">{t.annoncer}</span>
                </button>
                <button
                  type="button"
                  disabled={!monTour || !partie.mise}
                  onClick={jouerDoute}
                  className="fmm-glass-btn px-5 py-3.5 disabled:opacity-40"
                  style={{ flexDirection: 'row', gap: '0.5rem' }}
                >
                  <Skull size={15} className="text-brass" />
                  <span className="fmm-glass-btn-label">{t.menteur}</span>
                </button>
                {/* Le pari du calzar : viser juste rend un dé perdu. */}
                <button
                  type="button"
                  disabled={!monTour || !partie.mise}
                  onClick={jouerExact}
                  title={t.exactAide}
                  className="fmm-glass-btn px-5 py-3.5 disabled:opacity-40"
                  style={{ flexDirection: 'row', gap: '0.5rem' }}
                >
                  <Target size={15} className="text-brass" />
                  <span className="fmm-glass-btn-label">{t.exact}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <CreditJeux lang={lang === 'FR' ? 'fr' : 'en'} />
      </section>
    </>
  );
};

export default DesPage;
