import React, { useCallback, useMemo, useState } from 'react';
import CreditJeux from '../../components/jeux/CreditJeux';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, RotateCcw, Shuffle } from 'lucide-react';
import { useBadgeJeu, useGagnerBadge } from '../../contexts/BadgesContext';
import { useUI } from '../../contexts/AppContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import SEO from '../../components/SEO';
import PageHeader from '../../components/layout/PageHeader';
import { Reveal, ScrollProgress } from '../../components/scroll';
import { SectionFog } from '../../components/marche/atmospherics';
import { Motes } from '../../components/marche/effects';
import { JEU, TIRAGES, type Tirage } from '../../content/tarot';
import { interpretation, type LameTiree } from './interpretation';
import { CaseTirage, CroixCeltique, PanneauSens } from './tapis';

// ─── Le tarot de Marseille ──────────────────────────────────────────
// Deuxième jeu du festival (Alex, 2026-08-23). Trois tirages sont
// offerts : la lame seule, les trois lames et la croix celtique. Les
// 78 images viennent du jeu de Lequart (Paris), tombé dans le domaine
// public et versé sur Wikimedia Commons.
//
// Le tirage est honnête : le paquet est mélangé une seule fois par
// tirage (Fisher-Yates), une lame sur deux sort renversée, et rien ne
// se rejoue. Recommencer, c'est un nouveau paquet.
//
// Depuis le 2026-08-23, chaque place du tapis est liée d'avance à une
// carte du paquet mélangé : la place n° i reçoit paquet[i]. Cliquer
// une carte la retourne, dans n'importe quel ordre, sans avoir à
// remonter chercher un bouton. Le bouton reste là pour retourner la
// suivante dans l'ordre, et il n'est plus le seul chemin.

function melanger(): LameTiree[] {
  const paquet = JEU.map((lame) => ({ lame, renversee: Math.random() < 0.5 }));
  for (let i = paquet.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [paquet[i], paquet[j]] = [paquet[j], paquet[i]];
  }
  return paquet;
}


const TarotPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const reduce = useReducedMotion();

  const [tirage, setTirage] = useState<Tirage>(TIRAGES[1]);
  const [paquet, setPaquet] = useState<LameTiree[]>(() => melanger());
  const [revelees, setRevelees] = useState<number[]>([]);
  const [question, setQuestion] = useState('');
  const [lue, setLue] = useState<number | null>(null);
  const [panneau, setPanneau] = useState<number | null>(null);

  // Le tapis, place par place : une place vide reste sur son dos.
  const tirees = useMemo<Array<LameTiree | undefined>>(
    () => tirage.positions.map((_p, i) => (revelees.includes(i) ? paquet[i] : undefined)),
    [tirage, paquet, revelees],
  );

  const fini = revelees.length === tirage.positions.length;
  useBadgeJeu('tarot');
  // La croix celtique posée en entier vaut son badge.
  useGagnerBadge('tarot', fini && tirage.id === 'croix');

  const recommencer = useCallback((t: Tirage = tirage) => {
    setTirage(t);
    setPaquet(melanger());
    setRevelees([]);
    setLue(null);
    setPanneau(null);
  }, [tirage]);

  // Une carte encore sur son dos se retourne. Une carte déjà retournée
  // ouvre son panneau et devient la lecture courante.
  const retourner = (i: number) => {
    setLue(i);
    if (revelees.includes(i)) setPanneau(i);
    else setRevelees([...revelees, i]);
  };

  const survoler = (i: number) => { if (revelees.includes(i)) setPanneau(i); };
  const quitter = () => setPanneau(null);

  const piocher = () => {
    const suivante = tirage.positions.findIndex((_p, i) => !revelees.includes(i));
    if (suivante >= 0) retourner(suivante);
  };

  const paragraphes = useMemo(
    () => (fini ? interpretation(tirage, tirees, question, fr) : []),
    [fini, tirage, tirees, question, fr],
  );

  const t = useMemo(() => ({
    eyebrow: fr ? 'Le jeu de la voyante' : 'The fortune teller’s game',
    titre: fr ? 'Tarot de Marseille' : 'Marseille Tarot',
    intro: fr
      ? 'Le tarot de Marseille est un jeu de route qui a suivi les foires et les caravanes bien avant d’arriver jusqu’à nous. Posez votre question, choisissez un tirage et retournez les cartes une à une.'
      : 'The Marseille tarot is a road deck, one that followed the fairs and the caravans long before it reached us. Ask your question, pick a spread and turn the cards one at a time.',
    questionLabel: fr ? 'Votre question, si vous en avez une' : 'Your question, if you have one',
    questionPlaceholder: fr ? 'Ce que vous aimeriez éclaircir…' : 'What you would like light on…',
    indice: fr
      ? 'Cliquez une carte pour la retourner, puis posez le curseur dessus pour lire son sens. Sur un téléphone, un deuxième toucher fait la même chose.'
      : 'Click a card to turn it, then rest the cursor on it to read its meaning. On a phone, a second tap does the same.',
    piocher: fr ? 'Retourner une carte' : 'Turn a card',
    recommencer: fr ? 'Nouveau tirage' : 'New spread',
    restantes: (n: number) => fr ? `${n} carte${n > 1 ? 's' : ''} à retourner` : `${n} card${n > 1 ? 's' : ''} left`,
    droit: fr ? 'À l’endroit' : 'Upright',
    renverse: fr ? 'Renversée' : 'Reversed',
    lecture: fr ? 'La lecture' : 'The reading',
    ensemble: fr ? 'Le tirage entier' : 'The whole spread',
    ensembleTitre: fr ? 'Ce que le tirage raconte' : 'What the spread tells',
    domaine: fr
      ? 'Jeu de Lequart (Paris), domaine public · Wikimedia Commons'
      : 'Lequart deck (Paris), public domain · Wikimedia Commons',
  }), [fr]);

  const titrePosition = (i: number) => (fr ? tirage.positions[i].titreFR : tirage.positions[i].titreEN);

  return (
    <>
      <SEO title={`${t.titre} | FMM 2026`} description={t.intro} />
      <ScrollProgress />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.titre}
        titleB=""
        intro={t.intro}
        orbImage="/tarot/T17.webp"
        orbImagePosition="center 35%"
      />

      <section className="relative pb-16 md:pb-24 overflow-hidden">
        <SectionFog edges="top" />
        <Motes className="opacity-40" count={14} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">

          {/* ── Le choix du tirage ─────────────────────────────── */}
          <Reveal>
            <div className="grid sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
              {TIRAGES.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => recommencer(x)}
                  aria-pressed={tirage.id === x.id}
                  className={`fmm-glass-btn px-5 py-5 text-left ${tirage.id === x.id ? 'is-primary' : ''}`}
                  style={{ alignItems: 'flex-start' }}
                >
                  <span className="fmm-glass-btn-label">{fr ? x.nomFR : x.nomEN}</span>
                  <span className="fmm-glass-btn-note" style={{ letterSpacing: '0.08em', textTransform: 'none', textAlign: 'left' }}>
                    {fr ? x.texteFR : x.texteEN}
                  </span>
                </button>
              ))}
            </div>
          </Reveal>

          {/* ── La question ────────────────────────────────────── */}
          <Reveal>
            <label className="block mb-6 md:mb-8">
              <span className="witcher-stat-label block mb-2">{t.questionLabel}</span>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t.questionPlaceholder}
                className="w-full bg-midnight-deep/50 border border-ivory-soft/20 px-4 py-3 text-base font-editorial text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card"
              />
            </label>
          </Reveal>

          {/* ── Le tapis ───────────────────────────────────────── */}
          <div className="tarot-tapis relative rounded-lg-card border border-brass/20 p-5 md:p-8 mb-4"
               style={{ background: 'rgba(12, 5, 8, 0.6)', backdropFilter: 'blur(10px)' }}>
            {tirage.id === 'croix' ? (
              <CroixCeltique
                tirage={tirage}
                tirees={tirees}
                lue={lue}
                panneau={panneau}
                onLire={retourner}
                onSurvol={survoler}
                onQuitter={quitter}
                fr={fr}
                reduce={!!reduce}
              />
            ) : (
              <div className={`grid gap-4 md:gap-6 mx-auto ${tirage.id === 'une' ? 'grid-cols-1 max-w-[260px]' : 'grid-cols-3 max-w-[46rem]'}`}>
                {tirage.positions.map((p, i) => (
                  <CaseTirage
                    key={i}
                    titre={fr ? p.titreFR : p.titreEN}
                    tiree={tirees[i]}
                    active={lue === i}
                    panneau={panneau === i}
                    onLire={() => retourner(i)}
                    onSurvol={() => survoler(i)}
                    onQuitter={quitter}
                    fr={fr}
                    reduce={!!reduce}
                  />
                ))}
              </div>
            )}

            {/* Sur un écran étroit, le panneau se pose au bas du tapis
                plutôt que sur une carte trop petite pour le porter. La
                lame couchée de la croix passe par ici à toute taille,
                puisque sa case tourne d'un quart de tour. */}
            <AnimatePresence>
              {panneau !== null && tirees[panneau] && (
                <PanneauSens
                  key={`tapis-${panneau}-${tirees[panneau]!.lame.code}`}
                  tiree={tirees[panneau]!}
                  titre={titrePosition(panneau)}
                  fr={fr}
                  reduce={!!reduce}
                  onFermer={quitter}
                  className={`absolute left-4 right-4 bottom-4 mx-auto max-w-[26rem] max-h-[70%] ${
                    panneau === 1 && tirage.id === 'croix' ? '' : 'lg:hidden'
                  }`}
                />
              )}
            </AnimatePresence>
          </div>

          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-ivory-soft/45 mb-6">
            {t.indice}
          </p>

          {/* ── Les gestes ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <button
              type="button"
              onClick={piocher}
              disabled={fini}
              className="fmm-glass-btn is-primary px-6 py-4 disabled:opacity-45"
              style={{ flexDirection: 'row', gap: '0.6rem' }}
            >
              <Sparkles size={15} className="text-brass" />
              <span className="fmm-glass-btn-label">{t.piocher}</span>
            </button>
            <button
              type="button"
              onClick={() => recommencer()}
              className="fmm-glass-btn px-6 py-4"
              style={{ flexDirection: 'row', gap: '0.6rem' }}
            >
              <RotateCcw size={15} className="text-brass" />
              <span className="fmm-glass-btn-label">{t.recommencer}</span>
            </button>
            <span className="font-sans text-[10px] uppercase tracking-[0.24em] text-ivory-soft/55 inline-flex items-center gap-2">
              <Shuffle size={12} />
              {t.restantes(tirage.positions.length - revelees.length)}
            </span>
          </div>

          {/* ── La lecture d'une carte ─────────────────────────── */}
          <AnimatePresence mode="wait">
            {lue !== null && tirees[lue] && (
              <motion.div
                key={`${tirage.id}-${lue}-${tirees[lue]!.lame.code}`}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-lg-card border border-brass/25 p-6 md:p-8"
                style={{ background: 'rgba(19, 8, 11, 0.6)', backdropFilter: 'blur(12px)' }}
              >
                <p className="witcher-stat-label mb-2">
                  {t.lecture} · {titrePosition(lue)}
                </p>
                <h2 className="font-display title-medieval text-2xl md:text-4xl mb-2" style={{ color: '#D8B05A' }}>
                  {fr ? tirees[lue]!.lame.nomFR : tirees[lue]!.lame.nomEN}
                </h2>
                <p className="font-sans text-[10px] uppercase tracking-[0.28em] mb-4"
                   style={{ color: tirees[lue]!.renversee ? 'var(--color-blush, #C97B84)' : 'var(--color-amber-glow)' }}>
                  {tirees[lue]!.renversee ? t.renverse : t.droit}
                </p>
                <p className="font-editorial text-base md:text-lg leading-relaxed mb-4" style={{ color: 'rgba(244,239,227,0.86)' }}>
                  {tirees[lue]!.renversee
                    ? (fr ? tirees[lue]!.lame.renverseFR : tirees[lue]!.lame.renverseEN)
                    : (fr ? tirees[lue]!.lame.droitFR : tirees[lue]!.lame.droitEN)}
                </p>
                <p className="font-editorial text-sm" style={{ color: 'rgba(244,239,227,0.6)' }}>
                  {fr ? tirage.positions[lue].sensFR : tirage.positions[lue].sensEN}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── L'interprétation du tirage entier ──────────────── */}
          <AnimatePresence>
            {paragraphes.length > 0 && (
              <motion.div
                key={`ensemble-${tirage.id}-${revelees.length}-${tirees[0]?.lame.code ?? ''}`}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-lg-card border border-brass/30 p-6 md:p-10 mt-6"
                style={{ background: 'rgba(14, 6, 9, 0.7)', backdropFilter: 'blur(12px)' }}
              >
                <p className="witcher-stat-label mb-2">{t.ensemble}</p>
                <h2 className="font-display title-medieval text-2xl md:text-4xl mb-5" style={{ color: '#D8B05A' }}>
                  {t.ensembleTitre}
                </h2>
                {paragraphes.map((p, i) => (
                  <p
                    key={i}
                    className="font-editorial text-base md:text-lg leading-relaxed mb-4 last:mb-0"
                    style={{ color: 'rgba(244,239,227,0.86)' }}
                  >
                    {p}
                  </p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-ivory-soft/40 mt-8">
            {t.domaine}
          </p>
        </div>
      </section>
      <CreditJeux lang={fr ? 'fr' : 'en'} />
    </>
  );
};

export default TarotPage;
