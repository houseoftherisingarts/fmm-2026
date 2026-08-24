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
import { interpretation, resume, type LameTiree } from './interpretation';

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
              <div className={`grid gap-4 md:gap-6 ${tirage.id === 'une' ? 'grid-cols-1 max-w-[260px] mx-auto' : 'grid-cols-3'}`}>
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

// ─── Le panneau qui dit le sens ─────────────────────────────────────
// Du verre sombre posé par-dessus la carte retournée : assez opaque
// pour se lire sans effort, assez transparent pour laisser deviner
// l'image dessous. Coins à 15 px, comme partout ailleurs sur le site.
const PanneauSens: React.FC<{
  tiree: LameTiree;
  titre: string;
  fr: boolean;
  reduce: boolean;
  className?: string;
  onFermer?: () => void;
}> = ({ tiree, titre, fr, reduce, className = '', onFermer }) => (
  <motion.div
    initial={reduce ? false : { opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    role="note"
    className={`z-30 rounded-card border border-brass/40 p-3 md:p-4 overflow-y-auto ${className}`}
    style={{
      background: 'rgba(9, 4, 6, 0.86)',
      backdropFilter: 'blur(14px)',
      boxShadow: '0 22px 54px -22px rgba(0,0,0,0.95)',
    }}
  >
    <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-ivory-soft/55 mb-1 leading-tight">
      {titre}
    </p>
    <p className="font-display title-medieval text-lg md:text-xl leading-tight mb-1" style={{ color: '#D8B05A' }}>
      {fr ? tiree.lame.nomFR : tiree.lame.nomEN}
    </p>
    <p className="font-sans text-[9px] uppercase tracking-[0.24em] mb-2"
       style={{ color: tiree.renversee ? 'var(--color-blush, #C97B84)' : 'var(--color-amber-glow)' }}>
      {tiree.renversee ? (fr ? 'Renversée' : 'Reversed') : (fr ? 'À l’endroit' : 'Upright')}
    </p>
    <p className="font-editorial text-[13px] md:text-sm leading-relaxed" style={{ color: 'rgba(244,239,227,0.93)' }}>
      {resume(tiree, fr)}
    </p>
    {onFermer && (
      <button
        type="button"
        onClick={onFermer}
        className="mt-3 font-sans text-[9px] uppercase tracking-[0.24em] text-brass/80 hover:text-brass"
      >
        {fr ? 'Fermer' : 'Close'}
      </button>
    )}
  </motion.div>
);

// ─── Une case du tapis ──────────────────────────────────────────────
// La case reste cliquable même sur son dos : c'est le clic qui
// retourne la carte. Sur un écran large, le panneau du sens se pose
// directement sur l'image; ailleurs, le tapis s'en charge.
const CarteSeule: React.FC<{
  tiree?: LameTiree;
  titre: string;
  active: boolean;
  /** Le panneau du sens se pose sur cette carte-ci. */
  panneau: boolean;
  /** La case est trop petite ou trop tournée pour porter le panneau. */
  sansPanneau?: boolean;
  onLire: () => void;
  onSurvol: () => void;
  onQuitter: () => void;
  fr: boolean;
  reduce: boolean;
}> = ({ tiree, titre, active, panneau, sansPanneau = false, onLire, onSurvol, onQuitter, fr, reduce }) => (
  <div className="relative" onMouseEnter={onSurvol} onMouseLeave={onQuitter}>
    <button
      type="button"
      onClick={onLire}
      onFocus={onSurvol}
      onBlur={onQuitter}
      aria-label={tiree
        ? `${fr ? tiree.lame.nomFR : tiree.lame.nomEN} · ${titre}`
        : `${fr ? 'Retourner la carte' : 'Turn the card'} · ${titre}`}
      className={`tarot-case relative w-full aspect-[813/1536] rounded-card overflow-hidden border transition-shadow cursor-pointer ${
        active ? 'border-brass shadow-[0_0_34px_-8px_rgba(232,177,74,0.75)]' : 'border-brass/25'
      }`}
      style={{ background: 'rgba(10,4,6,0.7)' }}
    >
      <AnimatePresence mode="wait">
        {tiree ? (
          <motion.div
            key={tiree.lame.code}
            initial={reduce ? false : { rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <img
              src={`/tarot/${tiree.lame.code}.webp`}
              alt={fr ? tiree.lame.nomFR : tiree.lame.nomEN}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ transform: tiree.renversee ? 'rotate(180deg)' : undefined }}
            />
          </motion.div>
        ) : (
          <motion.img
            key="dos"
            src="/tarot/dos.webp"
            alt=""
            aria-hidden
            loading="lazy"
            initial={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </AnimatePresence>
    </button>
    <AnimatePresence>
      {panneau && tiree && !sansPanneau && (
        <PanneauSens
          key={`carte-${tiree.lame.code}`}
          tiree={tiree}
          titre={titre}
          fr={fr}
          reduce={reduce}
          className="hidden lg:block absolute inset-0 pointer-events-none"
        />
      )}
    </AnimatePresence>
  </div>
);

const CaseTirage: React.FC<{
  titre: string;
  tiree?: LameTiree;
  active: boolean;
  panneau: boolean;
  sansPanneau?: boolean;
  onLire: () => void;
  onSurvol: () => void;
  onQuitter: () => void;
  fr: boolean;
  reduce: boolean;
}> = ({ titre, ...reste }) => (
  <div className="flex flex-col items-center gap-2">
    <CarteSeule titre={titre} {...reste} />
    {titre && (
      <span className="font-sans text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-ivory-soft/60 text-center leading-tight">
        {titre}
      </span>
    )}
  </div>
);

// ─── La croix celtique ──────────────────────────────────────────────
// Dix cartes, deux blocs. La croix occupe trois colonnes à gauche, avec
// la deuxième lame posée EN TRAVERS de la première, dans la même case.
// Les quatre dernières montent en colonne à droite, du bas vers le haut.
//
// Le piège corrigé le 2026-08-23 : les cartes 1 et 2 partageaient une
// case de grille, donc elles s'empilaient et leurs étiquettes se
// marchaient dessus. La paire vit maintenant dans son propre bloc, la
// carte couchée en position absolue, et les deux titres se lisent sous
// l'ensemble au lieu de passer derrière les images.
const CENTRE = { croisee: 1 };            // index de la lame en travers

const PLACES_CROIX: Array<{ col: number; row: number }> = [
  { col: 2, row: 2 },   // 1 · la situation, avec la 2 en travers
  { col: 2, row: 2 },   // 2 · ce qui barre (rendue dans la même case)
  { col: 2, row: 3 },   // 3 · la racine
  { col: 1, row: 2 },   // 4 · le passé récent
  { col: 2, row: 1 },   // 5 · ce qui couronne
  { col: 3, row: 2 },   // 6 · le proche avenir
  { col: 4, row: 4 },   // 7 · vous
  { col: 4, row: 3 },   // 8 · l'entourage
  { col: 4, row: 2 },   // 9 · espoir et crainte
  { col: 4, row: 1 },   // 10 · l'issue
];

const CroixCeltique: React.FC<{
  tirage: Tirage;
  tirees: Array<LameTiree | undefined>;
  lue: number | null;
  panneau: number | null;
  onLire: (i: number) => void;
  onSurvol: (i: number) => void;
  onQuitter: () => void;
  fr: boolean;
  reduce: boolean;
}> = ({ tirage, tirees, lue, panneau, onLire, onSurvol, onQuitter, fr, reduce }) => {
  const nom = (i: number) => `${i + 1} · ${fr ? tirage.positions[i].titreFR : tirage.positions[i].titreEN}`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6 md:[grid-template-rows:repeat(4,auto)] md:items-start">
      {tirage.positions.map((_p, i) => {
        // La lame en travers est dessinée avec la première : elle n'a
        // pas de case à elle.
        if (i === CENTRE.croisee) return null;
        const place = PLACES_CROIX[i];
        const centre = i === 0;

        return (
          <div
            key={i}
            className="md:[grid-column:var(--col)] md:[grid-row:var(--row)]"
            style={{ ['--col' as string]: String(place.col), ['--row' as string]: String(place.row) }}
          >
            {centre ? (
              <div className="flex flex-col items-center gap-2">
                {/* La paire : la situation, et ce qui la traverse. La
                    case garde la place de la carte couchée à droite et
                    à gauche pour que rien ne déborde sur les voisines. */}
                <div className="relative w-full px-[14%]">
                  <CarteSeule
                    tiree={tirees[0]}
                    titre={nom(0)}
                    active={lue === 0}
                    panneau={panneau === 0}
                    onLire={() => onLire(0)}
                    onSurvol={() => onSurvol(0)}
                    onQuitter={onQuitter}
                    fr={fr}
                    reduce={reduce}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[74%] rotate-90 pointer-events-auto">
                      <CarteSeule
                        tiree={tirees[1]}
                        titre={nom(1)}
                        active={lue === 1}
                        panneau={panneau === 1}
                        sansPanneau
                        onLire={() => onLire(1)}
                        onSurvol={() => onSurvol(1)}
                        onQuitter={onQuitter}
                        fr={fr}
                        reduce={reduce}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-sans text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-ivory-soft/60 text-center leading-tight">
                    {nom(0)}
                  </span>
                  <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-brass/80 text-center leading-tight">
                    {nom(1)}
                  </span>
                </div>
              </div>
            ) : (
              <CaseTirage
                titre={nom(i)}
                tiree={tirees[i]}
                active={lue === i}
                panneau={panneau === i}
                onLire={() => onLire(i)}
                onSurvol={() => onSurvol(i)}
                onQuitter={onQuitter}
                fr={fr}
                reduce={reduce}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TarotPage;
