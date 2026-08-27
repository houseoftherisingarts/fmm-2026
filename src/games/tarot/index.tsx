import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CadreJeu from '../../components/jeux/CadreJeu';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, RotateCcw, Shuffle, ScrollText, X, BookOpen } from 'lucide-react';
import { useBadgeJeu, useGagnerBadge } from '../../contexts/BadgesContext';
import { useUI } from '../../contexts/AppContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import SEO from '../../components/SEO';
import PubDebutPartie from '../../components/jeux/PubDebutPartie';
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
//
// La page a pris la forme des deux autres jeux le 2026-08-23 : le hero
// à orbe en haut, puis le tapis qui occupe tout l'écran, avec le choix
// du tirage, la question, les gestes, le mode d'emploi et la lecture
// posés dessus en verre sombre. Plus rien ne vit sous le jeu.

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
  // Le mode d'emploi et la lecture se posent sur le tapis. Ils ne le
  // rétrécissent jamais : ils passent par-dessus, et se referment.
  const [reglesOuvertes, setReglesOuvertes] = useState(false);
  const [lectureOuverte, setLectureOuverte] = useState(true);

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
    setLectureOuverte(true);
  }, [tirage]);

  // Une carte encore sur son dos se retourne. Une carte déjà retournée
  // ouvre son panneau et devient la lecture courante.
  const retourner = (i: number) => {
    setLue(i);
    setLectureOuverte(true);
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
    coteAttente: fr
      ? 'Posez le curseur sur une lame retournée et son sens viendra se lire ici.'
      : 'Rest the cursor on a turned card and its meaning will be read here.',
    questionPlaceholder: fr ? 'Ce que vous aimeriez éclaircir…' : 'What you would like light on…',
    piocher: fr ? 'Retourner une carte' : 'Turn a card',
    recommencer: fr ? 'Nouveau tirage' : 'New spread',
    restantes: (n: number) => fr ? `${n} carte${n > 1 ? 's' : ''} à retourner` : `${n} card${n > 1 ? 's' : ''} left`,
    droit: fr ? 'À l’endroit' : 'Upright',
    renverse: fr ? 'Renversée' : 'Reversed',
    lecture: fr ? 'La lecture' : 'The reading',
    ensemble: fr ? 'Le tirage entier' : 'The whole spread',
    ensembleTitre: fr ? 'Ce que le tirage raconte' : 'What the spread tells',
    ouvrirLecture: fr ? 'Voir la lecture' : 'See the reading',
    fermer: fr ? 'Fermer' : 'Close',
    afficherRegles: fr ? 'Afficher les règles' : 'Show the rules',
    cacherRegles: fr ? 'Cacher les règles' : 'Hide the rules',
    reglesEyebrow: fr ? 'Avant de poser les lames' : 'Before you lay the cards',
    reglesTitre: fr ? 'Comment lire un tirage' : 'How to read a spread',
    regles: fr
      ? [
        'Le paquet se mélange une seule fois par tirage, et une lame sur deux sort renversée. Rien ne se rejoue : recommencer, c’est un nouveau paquet.',
        'Cliquez une carte pour la retourner, dans l’ordre qui vous plaît. Posez ensuite le curseur dessus, ou touchez-la une seconde fois, et son sens se lit dans le panneau de verre.',
        'La croix celtique se lit en dix cartes qui se répondent : les deux premières donnent la situation et ce qui la traverse, les quatre suivantes racontent d’où vient la question, et la colonne de droite dit comment elle va se terminer.',
        'Quand toutes les places sont retournées, la lecture d’ensemble se compose à partir des lames sorties et de la question que vous avez posée.',
      ]
      : [
        'The deck is shuffled once per spread, and every other card comes out reversed. Nothing is replayed: starting over means a fresh deck.',
        'Click a card to turn it, in whatever order suits you. Then rest the cursor on it, or tap it a second time, and its meaning appears in the glass panel.',
        'The Celtic cross reads as ten cards answering one another: the first two give the situation and what crosses it, the next four tell where the question comes from, and the right-hand column says how it ends.',
        'Once every place is turned, the whole reading is composed from the cards that came out and from the question you asked.',
      ],
    domaine: fr
      ? 'Jeu de Lequart (Paris), domaine public · Wikimedia Commons'
      : 'Lequart deck (Paris), public domain · Wikimedia Commons',
  }), [fr]);

  const titrePosition = (i: number) => (fr ? tirage.positions[i].titreFR : tirage.positions[i].titreEN);
  const aLire = (lue !== null && !!tirees[lue]) || paragraphes.length > 0;

  return (
    <>
      <SEO title={`${t.titre} | FMM 2026`} description={t.intro} />

      <CadreJeu
        eyebrow={t.eyebrow}
        titre={t.titre}
        intro={t.intro}
        orbImage="/tarot/T17.webp"
        orbImagePosition="center 35%"
        lang={lang}
      >
        <Motes className="opacity-30" count={14} />

        {/* Le tapis prend toute l'aire. Le choix du tirage, la question,
            les gestes et la lecture se posent dessus. */}
        <div className="absolute inset-0 flex flex-col">

          {/* ── Le choix du tirage ──────────────────────────────── */}
          {/* Le côté droit garde sa place libre pour le X de fermeture. */}
          <div
            className="shrink-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 pl-4 md:pl-7 pr-16 md:pr-20 py-3"
            style={{ background: 'linear-gradient(180deg, rgba(8,3,5,0.92), rgba(8,3,5,0))' }}
          >
            <span className="hidden sm:inline font-display title-medieval text-lg md:text-xl text-ivory">
              {t.titre}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {TIRAGES.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => recommencer(x)}
                  aria-pressed={tirage.id === x.id}
                  title={fr ? x.texteFR : x.texteEN}
                  className={`px-3.5 py-2 rounded-[15px] border backdrop-blur-md font-sans text-[10px] uppercase tracking-[0.16em] transition-colors duration-200 ${
                    tirage.id === x.id
                      ? 'border-brass/70 bg-brass/15 text-ivory'
                      : 'border-white/15 bg-black/40 text-ivory-soft hover:text-ivory hover:border-brass/50'
                  }`}
                >
                  {fr ? x.nomFR : x.nomEN}
                </button>
              ))}
            </div>
          </div>

          {/* ── Le tapis, et la lecture dans sa propre colonne ────
              Le panneau du sens se posait par-dessus les cartes. Le
              tapis se décale à gauche et lui laisse sa place à droite
              (Alex, 2026-08-24). */}
          <div className="relative flex-1 min-h-0 overflow-y-auto px-3 md:px-8 py-4 flex flex-col lg:flex-row lg:items-center lg:gap-7">
            <div
              className={`tarot-tapis relative mx-auto my-auto lg:mx-0 rounded-[15px] border border-brass/20 p-3 md:p-7 w-full lg:flex-1 ${
                tirage.id === 'une' ? 'max-w-[19rem]' : tirage.id === 'trois' ? 'max-w-[46rem]' : 'max-w-[44rem]'
              }`}
              style={{ background: 'rgba(12, 5, 8, 0.55)', backdropFilter: 'blur(10px)' }}
            >
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
                <div className={`grid gap-3 md:gap-6 mx-auto w-full ${tirage.id === 'une' ? 'grid-cols-1' : 'grid-cols-3'}`}>
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
                    className="lg:hidden absolute left-4 right-4 bottom-4 mx-auto max-w-[26rem] max-h-[70%]" 
                  />
                )}
              </AnimatePresence>
            </div>

            {/* La colonne de lecture, à droite du tapis sur grand
                écran. Elle garde sa place même quand rien n'est
                survolé, pour que le tapis ne saute pas. */}
            <div className="hidden lg:flex w-[23rem] xl:w-[25rem] shrink-0 self-center min-h-[18rem] max-h-full overflow-y-auto items-center">
              <AnimatePresence mode="wait">
                {panneau !== null && tirees[panneau] ? (
                  <PanneauSens
                    key={`cote-${panneau}-${tirees[panneau]!.lame.code}`}
                    tiree={tirees[panneau]!}
                    titre={titrePosition(panneau)}
                    fr={fr}
                    reduce={!!reduce}
                    className="w-full"
                  />
                ) : (
                  <motion.p
                    key="attente"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full font-editorial text-[14px] leading-relaxed text-ivory-soft/45 px-2"
                  >
                    {t.coteAttente}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Le pupitre : la question et les gestes ───────────── */}
          <div
            className="shrink-0 z-20 px-3 md:px-6 pt-5 pb-3"
            style={{ background: 'linear-gradient(0deg, rgba(8,3,5,0.94), rgba(8,3,5,0))' }}
          >
          <div className="mx-auto w-full max-w-5xl flex flex-col sm:flex-row sm:flex-wrap sm:items-end justify-center gap-2.5 sm:gap-3">
            <label className="w-full sm:w-auto sm:flex-1 sm:min-w-[13rem] sm:max-w-sm">
              <span className="witcher-stat-label block mb-1.5">{t.questionLabel}</span>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t.questionPlaceholder}
                className="w-full bg-black/45 backdrop-blur-md border border-white/15 px-4 py-2.5 md:py-3 text-sm md:text-base font-editorial text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-[15px]"
              />
            </label>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={piocher}
              disabled={fini}
              className="fmm-glass-btn is-primary px-4 py-2.5 md:px-5 md:py-3.5 disabled:opacity-45"
              style={{ flexDirection: 'row', gap: '0.5rem' }}
            >
              <Sparkles size={15} className="text-brass" />
              <span className="fmm-glass-btn-label">{t.piocher}</span>
            </button>
            <button
              type="button"
              onClick={() => recommencer()}
              className="fmm-glass-btn px-4 py-2.5 md:px-5 md:py-3.5"
              style={{ flexDirection: 'row', gap: '0.5rem' }}
            >
              <RotateCcw size={15} className="text-brass" />
              <span className="fmm-glass-btn-label">{t.recommencer}</span>
            </button>

            <button
              type="button"
              onClick={() => setReglesOuvertes((v) => !v)}
              aria-expanded={reglesOuvertes}
              className="inline-flex items-center gap-2 px-4 py-2.5 md:py-3 rounded-full border border-brass/45 bg-black/50 backdrop-blur-md font-sans uppercase tracking-[0.18em] text-[10px] text-ivory hover:bg-brass/15 transition-colors duration-200"
            >
              <ScrollText size={13} className="text-brass" />
              {reglesOuvertes ? t.cacherRegles : t.afficherRegles}
            </button>

            {aLire && !lectureOuverte && (
              <button
                type="button"
                onClick={() => setLectureOuverte(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 md:py-3 rounded-full border border-brass/45 bg-black/50 backdrop-blur-md font-sans uppercase tracking-[0.18em] text-[10px] text-ivory hover:bg-brass/15 transition-colors duration-200"
              >
                <BookOpen size={13} className="text-brass" />
                {t.ouvrirLecture}
              </button>
            )}

            <span className="hidden sm:inline-flex font-sans text-[10px] uppercase tracking-[0.24em] text-ivory-soft/55 items-center gap-2">
              <Shuffle size={12} />
              {t.restantes(tirage.positions.length - revelees.length)}
            </span>
            </div>
          </div>
          </div>
        </div>

        {/* ── Le mode d'emploi, posé sur le tapis ──────────────────── */}
        <AnimatePresence>
          {reglesOuvertes && (
            <motion.aside
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-3 md:left-6 bottom-24 z-30 w-[22rem] max-w-[calc(100%-1.5rem)] max-h-[70%] overflow-y-auto rounded-[15px] border border-white/15 bg-black/60 backdrop-blur-xl p-5"
            >
              <button
                type="button"
                onClick={() => setReglesOuvertes(false)}
                aria-label={t.fermer}
                className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full text-ivory-soft/70 hover:text-ivory hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>
              <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-[var(--color-amber-glow)] mb-1.5">
                {t.reglesEyebrow}
              </p>
              <h2 className="font-display title-medieval text-xl text-ivory">
                {t.reglesTitre}
              </h2>
              <div className="divider-brass w-12 my-4" />
              <ol className="space-y-3.5 list-none">
                {t.regles.map((r, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-display title-medieval text-brass/70 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-editorial text-[13px] text-ivory-soft leading-relaxed">
                      {r}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 pt-4 border-t border-white/10 font-sans text-[9px] uppercase tracking-[0.2em] text-ivory-soft/45">
                {t.domaine}
              </p>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── La lecture : la lame courante, puis le tirage entier ─── */}
        <AnimatePresence>
          {aLire && lectureOuverte && (
            <motion.aside
              key="lecture"
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-3 md:right-6 top-[4.5rem] z-30 w-[min(24rem,calc(100%-1.5rem))] max-h-[calc(100%-11rem)] overflow-y-auto rounded-[15px] border border-white/15 bg-black/60 backdrop-blur-xl p-5"
            >
              <button
                type="button"
                onClick={() => setLectureOuverte(false)}
                aria-label={t.fermer}
                className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full text-ivory-soft/70 hover:text-ivory hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>

              {lue !== null && tirees[lue] && (
                <div className="pr-6">
                  <p className="witcher-stat-label mb-1.5">
                    {t.lecture} · {titrePosition(lue)}
                  </p>
                  <h2 className="font-display title-medieval text-2xl leading-tight mb-1.5" style={{ color: '#D8B05A' }}>
                    {fr ? tirees[lue]!.lame.nomFR : tirees[lue]!.lame.nomEN}
                  </h2>
                  <p className="font-sans text-[9px] uppercase tracking-[0.28em] mb-3"
                     style={{ color: tirees[lue]!.renversee ? 'var(--color-blush, #C97B84)' : 'var(--color-amber-glow)' }}>
                    {tirees[lue]!.renversee ? t.renverse : t.droit}
                  </p>
                  <p className="font-editorial text-sm leading-relaxed mb-3" style={{ color: 'rgba(244,239,227,0.9)' }}>
                    {tirees[lue]!.renversee
                      ? (fr ? tirees[lue]!.lame.renverseFR : tirees[lue]!.lame.renverseEN)
                      : (fr ? tirees[lue]!.lame.droitFR : tirees[lue]!.lame.droitEN)}
                  </p>
                  <p className="font-editorial text-[13px]" style={{ color: 'rgba(244,239,227,0.6)' }}>
                    {fr ? tirage.positions[lue].sensFR : tirage.positions[lue].sensEN}
                  </p>
                </div>
              )}

              {paragraphes.length > 0 && (
                <div className={lue !== null && tirees[lue] ? 'mt-5 pt-4 border-t border-white/10' : 'pr-6'}>
                  <p className="witcher-stat-label mb-1.5">{t.ensemble}</p>
                  <h2 className="font-display title-medieval text-xl leading-tight mb-3" style={{ color: '#D8B05A' }}>
                    {t.ensembleTitre}
                  </h2>
                  {paragraphes.map((p, i) => (
                    <p
                      key={i}
                      className="font-editorial text-sm leading-relaxed mb-3 last:mb-0"
                      style={{ color: 'rgba(244,239,227,0.88)' }}
                    >
                      {p}
                    </p>
                  ))}
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </CadreJeu>
    </>
  );
};

export default TarotPage;
