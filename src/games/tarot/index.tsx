import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, RotateCcw, Shuffle } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import SEO from '../../components/SEO';
import PageHeader from '../../components/layout/PageHeader';
import { Reveal, ScrollProgress } from '../../components/scroll';
import { SectionFog } from '../../components/marche/atmospherics';
import { Motes } from '../../components/marche/effects';
import { JEU, TIRAGES, type Lame, type Tirage } from '../../content/tarot';

// ─── Le tarot de Marseille ──────────────────────────────────────────
// Deuxième jeu du festival (Alex, 2026-08-23). Trois tirages : une
// lame, trois lames, la croix celtique. Les 78 images sont le jeu de
// Lequart (Paris), domaine public, versé sur Wikimedia Commons.
//
// Le tirage est honnête : le paquet est mélangé une seule fois par
// tirage (Fisher-Yates), une lame sur deux sort renversée, et rien ne
// se rejoue. Recommencer, c'est un nouveau paquet.

interface LameTiree {
  lame: Lame;
  renversee: boolean;
}

function melanger(): LameTiree[] {
  const paquet = JEU.map((lame) => ({ lame, renversee: Math.random() < 0.5 }));
  for (let i = paquet.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [paquet[i], paquet[j]] = [paquet[j], paquet[i]];
  }
  return paquet;
}

// La croix celtique se lit en croix, pas en ligne : chaque position a
// sa place sur la grille (colonne, rangée) au-dessus de `md`.
const PLACES_CROIX: Array<{ col: number; row: number; couche?: boolean }> = [
  { col: 2, row: 2 },              // 1 · la situation
  { col: 2, row: 2, couche: true },// 2 · ce qui barre, posée en travers
  { col: 2, row: 3 },              // 3 · la racine
  { col: 1, row: 2 },              // 4 · le passé récent
  { col: 2, row: 1 },              // 5 · ce qui couronne
  { col: 3, row: 2 },              // 6 · le proche avenir
  { col: 4, row: 4 },              // 7 · vous
  { col: 4, row: 3 },              // 8 · l'entourage
  { col: 4, row: 2 },              // 9 · espoir et crainte
  { col: 4, row: 1 },              // 10 · l'issue
];

const TarotPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const reduce = useReducedMotion();

  const [tirage, setTirage] = useState<Tirage>(TIRAGES[1]);
  const [paquet, setPaquet] = useState<LameTiree[]>(() => melanger());
  const [tirees, setTirees] = useState<LameTiree[]>([]);
  const [question, setQuestion] = useState('');
  const [lue, setLue] = useState<number | null>(null);

  const fini = tirees.length === tirage.positions.length;

  const recommencer = useCallback((t: Tirage = tirage) => {
    setTirage(t);
    setPaquet(melanger());
    setTirees([]);
    setLue(null);
  }, [tirage]);

  const piocher = () => {
    if (fini) return;
    const suite = [...tirees, paquet[tirees.length]];
    setTirees(suite);
    setLue(suite.length - 1);
  };

  const t = useMemo(() => ({
    eyebrow: fr ? 'Le jeu de la voyante' : 'The fortune teller’s game',
    titre: fr ? 'Tarot de Marseille' : 'Marseille Tarot',
    intro: fr
      ? 'Le vieux jeu des routes, celui que les caravanes portaient d’une foire à l’autre. Posez votre question, choisissez un tirage, et retournez les cartes une à une.'
      : 'The old road deck, the one the caravans carried from fair to fair. Ask your question, pick a spread, and turn the cards one at a time.',
    questionLabel: fr ? 'Votre question (facultatif)' : 'Your question (optional)',
    questionPlaceholder: fr ? 'Ce que vous voulez éclaircir…' : 'What you want light on…',
    piocher: fr ? 'Retourner une carte' : 'Turn a card',
    recommencer: fr ? 'Nouveau tirage' : 'New spread',
    restantes: (n: number) => fr ? `${n} carte${n > 1 ? 's' : ''} à retourner` : `${n} card${n > 1 ? 's' : ''} left`,
    droit: fr ? 'À l’endroit' : 'Upright',
    renverse: fr ? 'Renversée' : 'Reversed',
    lecture: fr ? 'La lecture' : 'The reading',
    domaine: fr
      ? 'Jeu de Lequart (Paris), domaine public · Wikimedia Commons'
      : 'Lequart deck (Paris), public domain · Wikimedia Commons',
  }), [fr]);

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
          <div className="tarot-tapis relative rounded-lg-card border border-brass/20 p-5 md:p-8 mb-6"
               style={{ background: 'rgba(12, 5, 8, 0.6)', backdropFilter: 'blur(10px)' }}>
            {tirage.id === 'croix' ? (
              <CroixCeltique
                tirage={tirage}
                tirees={tirees}
                lue={lue}
                onLire={setLue}
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
                    onLire={() => tirees[i] && setLue(i)}
                    fr={fr}
                    reduce={!!reduce}
                  />
                ))}
              </div>
            )}
          </div>

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
              {t.restantes(tirage.positions.length - tirees.length)}
            </span>
          </div>

          {/* ── La lecture ─────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {lue !== null && tirees[lue] && (
              <motion.div
                key={`${tirage.id}-${lue}-${tirees[lue].lame.code}`}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-lg-card border border-brass/25 p-6 md:p-8"
                style={{ background: 'rgba(19, 8, 11, 0.6)', backdropFilter: 'blur(12px)' }}
              >
                <p className="witcher-stat-label mb-2">
                  {t.lecture} · {fr ? tirage.positions[lue].titreFR : tirage.positions[lue].titreEN}
                </p>
                <h2 className="font-display title-medieval text-2xl md:text-4xl mb-2" style={{ color: '#D8B05A' }}>
                  {fr ? tirees[lue].lame.nomFR : tirees[lue].lame.nomEN}
                </h2>
                <p className="font-sans text-[10px] uppercase tracking-[0.28em] mb-4"
                   style={{ color: tirees[lue].renversee ? 'var(--color-blush, #C97B84)' : 'var(--color-amber-glow)' }}>
                  {tirees[lue].renversee ? t.renverse : t.droit}
                </p>
                <p className="font-editorial text-base md:text-lg leading-relaxed mb-4" style={{ color: 'rgba(244,239,227,0.86)' }}>
                  {tirees[lue].renversee
                    ? (fr ? tirees[lue].lame.renverseFR : tirees[lue].lame.renverseEN)
                    : (fr ? tirees[lue].lame.droitFR : tirees[lue].lame.droitEN)}
                </p>
                <p className="font-editorial italic text-sm" style={{ color: 'rgba(244,239,227,0.6)' }}>
                  {fr ? tirage.positions[lue].sensFR : tirage.positions[lue].sensEN}
                </p>
                {question.trim() && (
                  <p className="font-sans text-[10px] uppercase tracking-[0.24em] mt-5 text-ivory-soft/45">
                    {fr ? 'Votre question' : 'Your question'} : {question}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-ivory-soft/40 mt-8">
            {t.domaine}
          </p>
        </div>
      </section>
    </>
  );
};

// ─── Une case du tapis ──────────────────────────────────────────────
const CaseTirage: React.FC<{
  titre: string;
  /** Étiquette de la carte posée en travers : elle se met de côté. */
  titreCouche?: string;
  tiree?: LameTiree;
  active: boolean;
  onLire: () => void;
  fr: boolean;
  reduce: boolean;
  couche?: boolean;
}> = ({ titre, titreCouche, tiree, active, onLire, fr, reduce, couche = false }) => (
  <div className="flex flex-col items-center gap-2">
    <button
      type="button"
      onClick={onLire}
      disabled={!tiree}
      aria-label={titre}
      className={`tarot-case relative w-full aspect-[813/1536] rounded-card overflow-hidden border transition-shadow ${
        active ? 'border-brass shadow-[0_0_34px_-8px_rgba(232,177,74,0.75)]' : 'border-brass/25'
      }`}
      style={{
        background: 'rgba(10,4,6,0.7)',
        transform: couche ? 'rotate(90deg) scale(0.66)' : undefined,
        cursor: tiree ? 'pointer' : 'default',
      }}
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
    {titre && (
      <span className="font-sans text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-ivory-soft/60 text-center leading-tight">
        {titre}
      </span>
    )}
    {titreCouche && (
      <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-brass/80 text-center leading-tight">
        {titreCouche}
      </span>
    )}
  </div>
);

// ─── La croix celtique ──────────────────────────────────────────────
const CroixCeltique: React.FC<{
  tirage: Tirage;
  tirees: LameTiree[];
  lue: number | null;
  onLire: (i: number) => void;
  fr: boolean;
  reduce: boolean;
}> = ({ tirage, tirees, lue, onLire, fr, reduce }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-5 md:[grid-template-rows:repeat(4,auto)] md:items-start">
    {tirage.positions.map((p, i) => {
      const place = PLACES_CROIX[i];
      return (
        <div
          key={i}
          className="md:[grid-column:var(--col)] md:[grid-row:var(--row)]"
          style={{ ['--col' as string]: String(place.col), ['--row' as string]: String(place.row) }}
        >
          <CaseTirage
            titre={place.couche ? '' : `${i + 1} · ${fr ? p.titreFR : p.titreEN}`}
            titreCouche={place.couche ? `${i + 1} · ${fr ? p.titreFR : p.titreEN}` : undefined}
            tiree={tirees[i]}
            active={lue === i}
            onLire={() => tirees[i] && onLire(i)}
            fr={fr}
            reduce={reduce}
            couche={place.couche}
          />
        </div>
      );
    })}
  </div>
);

export default TarotPage;
