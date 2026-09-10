import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

// ─── Le grimoire de l'année de la Peste ─────────────────────────────
// Le jeu se joue dans un registre, en plein écran. Le livre s'ouvre une
// fois à l'arrivée (cinq secondes générées chez Higgsfield, puis la
// dernière image reste), et tout ce que le jeu demande s'écrit ensuite
// sur le vélin à l'encre, les réponses comprises : plus un seul bouton
// de verre posé par-dessus la scène (Alex, 2026-09-10).
//
// Le plan garde le rapport de l'image pendant qu'il couvre l'écran (voir
// .grimoire-plan dans index.css), donc les zones de texte se posent en
// pourcentage du plan plutôt que de la fenêtre, et elles restent collées
// aux pages du livre quelle que soit la taille de l'écran.
//
// Sous prefers-reduced-motion, le livre est ouvert d'emblée et le texte
// s'affiche d'un coup : la scène tient, le mouvement disparaît.

const VIDEO = '/jeux/grimoire/ouverture.mp4';
const POSTER = '/jeux/grimoire/ferme.webp';
const OUVERT = '/jeux/grimoire/ouvert.webp';

/** L'encre du registre, telle qu'elle sèche sur le vélin. */
export const ENCRE = 'rgba(50, 29, 15, 0.95)';
export const ENCRE_PALE = 'rgba(96, 66, 40, 0.72)';
export const ENCRE_ROUGE = 'rgba(126, 44, 30, 0.92)';

const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
export const romain = (n: number) => ROMAINS[n - 1] ?? String(n);

// ── L'encre qui s'écrit ─────────────────────────────────────────────

interface EncreProps {
  texte: string;
  className?: string;
  style?: React.CSSProperties;
  /** Secondes avant la première lettre. */
  delai?: number;
  /** Secondes entre deux lettres. Plus c'est bas, plus la main court. */
  vitesse?: number;
  /** Change de valeur pour relancer l'écriture : une question chasse l'autre. */
  cle?: string | number;
  as?: 'p' | 'h2' | 'span' | 'div';
}

const LETTRE: Variants = {
  seche: { opacity: 0, filter: 'blur(5px)', y: -1, color: ENCRE_PALE },
  ecrite: {
    opacity: 1, filter: 'blur(0px)', y: 0, color: ENCRE,
    transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
  },
};

/**
 * Le texte se dessine caractère par caractère. L'encre arrive pâle et
 * floue, s'étale, puis se fixe, comme la plume qui appuie et sèche. Les
 * mots restent d'un bloc, sinon la ligne se couperait au milieu d'un mot.
 */
export const Encre: React.FC<EncreProps> = ({
  texte, className, style, delai = 0, vitesse = 0.02, cle, as = 'p',
}) => {
  const reduire = useReducedMotion();
  const mots = useMemo(() => texte.split(' '), [texte]);
  const Balise = motion[as] as typeof motion.p;

  if (reduire) {
    return <Balise className={className} style={{ color: ENCRE, ...style }}>{texte}</Balise>;
  }

  return (
    <Balise
      key={cle}
      className={className}
      style={{ color: ENCRE, hyphens: 'auto', overflowWrap: 'break-word', ...style }}
      aria-label={texte}
      initial="seche"
      animate="ecrite"
      variants={{ ecrite: { transition: { delayChildren: delai, staggerChildren: vitesse } } }}
    >
      {mots.map((mot, m) => (
        <React.Fragment key={`${m}-${mot}`}>
          <span aria-hidden style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {Array.from(mot).map((c, k) => (
              <motion.span key={`${k}-${c}`} style={{ display: 'inline-block' }} variants={LETTRE}>{c}</motion.span>
            ))}
          </span>
          {m < mots.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </Balise>
  );
};

// ── Une ligne de la page sur laquelle on peut appuyer ───────────────

interface ChoixProps {
  texte: string;
  onClick: () => void;
  /** La ligne retenue porte sa marque de plume. */
  choisi?: boolean;
  /** Le repère de marge : un chiffre romain, une lettre, un point. */
  marge?: string;
  delai?: number;
  cle?: string | number;
  /** Un choix mis en avant s'écrit plus gros, comme une entrée de titre. */
  fort?: boolean;
  /** Une ligne secondaire, écrite plus petit sous la première. */
  sous?: string;
}

/**
 * Une réponse écrite à l'encre sur la page. Le trait de plume se tire
 * sous la ligne au survol, et la croix de marge reste quand la réponse
 * est retenue.
 */
export const ChoixEncre: React.FC<ChoixProps> = ({
  texte, onClick, choisi, marge, delai = 0, cle, fort, sous,
}) => {
  const reduire = useReducedMotion();
  const [survol, setSurvol] = useState(false);
  const actif = survol || !!choisi;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      onFocus={() => setSurvol(true)}
      onBlur={() => setSurvol(false)}
      className="grimoire-choix block w-full text-left"
      style={{ padding: '0.55cqw 0' }}
    >
      <span className="flex items-baseline gap-[1.2cqw]">
        <motion.span
          aria-hidden
          className="font-display shrink-0 tabular-nums text-right"
          style={{
            color: choisi ? ENCRE_ROUGE : ENCRE_PALE,
            fontSize: fort ? 'clamp(9px, 1.3cqw, 16px)' : 'clamp(8px, 1.1cqw, 14px)',
            width: '2.2cqw',
          }}
          animate={{ opacity: actif ? 1 : 0.6 }}
          transition={{ duration: 0.25 }}
        >
          {choisi ? '✕' : marge ?? '·'}
        </motion.span>
        <span className="block flex-1">
          <Encre
            as="span"
            texte={texte}
            cle={cle}
            delai={delai}
            vitesse={0.013}
            className={fort ? 'font-display leading-snug' : 'font-editorial leading-snug'}
            style={{
              display: 'block',
              fontSize: fort ? 'clamp(13px, 1.9cqw, 23px)' : 'clamp(11px, 1.42cqw, 18px)',
            }}
          />
          {sous && (
            <Encre
              as="span"
              texte={sous}
              cle={`s-${cle}`}
              delai={delai + 0.18}
              vitesse={0.01}
              className="font-editorial leading-snug"
              style={{ display: 'block', marginTop: '0.2cqw', fontSize: 'clamp(9px, 1.15cqw, 14px)', color: ENCRE_PALE }}
            />
          )}
        </span>
      </span>
      {/* Le trait de plume sous la ligne retenue ou survolée. */}
      <motion.span
        aria-hidden
        className="block origin-left"
        style={{
          height: 1, marginTop: '0.3cqw', marginLeft: '3.4cqw',
          background: choisi ? ENCRE_ROUGE : ENCRE_PALE,
        }}
        initial={false}
        animate={{ scaleX: actif ? 1 : 0, opacity: actif ? (choisi ? 0.85 : 0.5) : 0 }}
        transition={reduire ? { duration: 0 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      />
    </button>
  );
};

// ── Le folio, le titre de page et le registre de la marge ───────────

export const Folio: React.FC<{ texte: string; cle?: string | number }> = ({ texte, cle }) => (
  <Encre
    as="span" texte={texte} cle={`folio-${cle ?? texte}`} vitesse={0.045}
    className="font-display block text-center mb-[1.6cqw]"
    style={{ color: ENCRE_PALE, fontSize: 'clamp(8px, 1.15cqw, 14px)', letterSpacing: '0.34em' }}
  />
);

export const RegistreFolios: React.FC<{ lignes: { romain: string; marque: boolean }[] }> = ({ lignes }) => (
  <div>
    <p aria-hidden className="font-display text-center mb-[1.4cqw]"
       style={{ color: ENCRE_PALE, fontSize: 'clamp(7px, 0.95cqw, 12px)', letterSpacing: '0.34em' }}>
      REGISTRE
    </p>
    <div className="grid grid-cols-3 gap-x-[1.2cqw] gap-y-[1.3cqw] justify-items-center"
         style={{ fontSize: 'clamp(9px, 1.4cqw, 17px)' }}>
      {lignes.map((l, i) => (
        <motion.span
          key={l.romain}
          className="font-display tabular-nums leading-none"
          style={{ color: l.marque ? ENCRE : 'rgba(126, 102, 74, 0.3)' }}
          initial={false}
          animate={l.marque
            ? { opacity: 1, filter: 'blur(0px)', scale: 1 }
            : { opacity: 0.5, filter: 'blur(0.5px)', scale: 0.94 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: l.marque ? 0.03 * (i % 3) : 0 }}
        >
          {l.romain}
        </motion.span>
      ))}
    </div>
  </div>
);

// ── La scène ────────────────────────────────────────────────────────

interface GrimoireProps {
  /** Ce qui s'écrit sur la page de gauche. Elle sort du cadre quand
   *  l'écran est plus haut que large, donc rien d'indispensable ici. */
  gauche?: React.ReactNode;
  /** Ce qui s'écrit sur la page de droite : le cœur du jeu. */
  droite: React.ReactNode;
  /** Appelé quand le livre a fini de s'ouvrir. */
  onOuvert?: () => void;
}

export const Grimoire: React.FC<GrimoireProps> = ({ gauche, droite, onOuvert }) => {
  const reduire = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);

  // Une seule ouverture par visite : revenir sur la page ne rejoue pas
  // la scène, la session s'en souvient.
  const dejaVu = useMemo(() => {
    try { return sessionStorage.getItem('fmm.grimoire.ouvert') === '1'; } catch { return false; }
  }, []);
  const [ouvert, setOuvert] = useState(!!reduire || dejaVu);
  const [videoMorte, setVideoMorte] = useState(false);

  const marquerOuvert = useCallback(() => {
    setOuvert(true);
    try { sessionStorage.setItem('fmm.grimoire.ouvert', '1'); } catch { /* navigation privée */ }
    onOuvert?.();
  }, [onOuvert]);

  useEffect(() => {
    if (ouvert) { onOuvert?.(); return; }
    const v = video.current;
    if (!v) return;
    v.addEventListener('ended', marquerOuvert);
    // Filet : si la lecture automatique est refusée, la scène s'ouvre quand même.
    const secours = window.setTimeout(marquerOuvert, 7500);
    void v.play().catch(() => setVideoMorte(true));
    return () => { v.removeEventListener('ended', marquerOuvert); window.clearTimeout(secours); };
  }, [ouvert, marquerOuvert, onOuvert]);

  const statique = reduire || dejaVu || videoMorte;

  return (
    <div className="grimoire-scene" lang="fr">
      {/* Le livre ne remplit pas un écran de téléphone sans se faire
          couper, donc la même scène passe derrière, floue et sombre :
          on voit la table plutôt qu'un aplat noir. */}
      <img src={OUVERT} alt="" aria-hidden className="grimoire-fond" />
      <div className="grimoire-plan">
        {statique ? (
          <img src={OUVERT} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <video
            ref={video} aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
            src={VIDEO} poster={POSTER}
            muted playsInline preload="auto"
          />
        )}

        {/* Les bords se fondent dans le noir chaud du site plutôt que de
            couper net, et le centre du vélin reste clair sous l'encre. */}
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 76% 66% at 50% 50%, rgba(0,0,0,0) 50%, rgba(10,5,7,0.4) 84%, rgba(10,5,7,0.88) 100%)',
        }} />

        {ouvert && (
          <>
            {gauche && (
              <div className="grimoire-page-gauche absolute" style={{ left: '11.5%', top: 'calc(var(--page-haut) + 2%)', width: '27%' }}>
                {gauche}
              </div>
            )}
            {/* La page centre son contenu plutôt que de le tasser en
                haut : le bas du vélin ne reste plus vide. */}
            <div
              className="absolute flex flex-col justify-center"
              style={{
                left: 'var(--page-droite-x)', top: 'var(--page-haut)',
                width: 'var(--page-droite-w)', height: 'var(--page-hauteur)',
              }}
            >
              {droite}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Grimoire;
