import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

// ─── Le grimoire de l'année de la Peste ─────────────────────────────
// Le jeu se joue dans un registre. Le livre s'ouvre une fois à
// l'arrivée (cinq secondes générées chez Higgsfield, puis la dernière
// image reste à l'écran), et tout ce que le jeu demande s'inscrit
// ensuite sur le vélin, lettre par lettre, comme une main qui écrit à
// la plume (Alex, 2026-09-10). La page de gauche porte le registre des
// réponses déjà données, la page de droite porte la question.
//
// Sous prefers-reduced-motion, le livre est ouvert d'emblée et le texte
// s'affiche d'un coup : la scène tient, le mouvement disparaît.

const VIDEO = '/jeux/grimoire/ouverture.mp4';
const POSTER = '/jeux/grimoire/ferme.webp';
const OUVERT = '/jeux/grimoire/ouvert.webp';

/** L'encre du registre, telle qu'elle sèche sur le vélin. */
export const ENCRE = 'rgba(54, 32, 17, 0.94)';
export const ENCRE_PALE = 'rgba(96, 66, 40, 0.72)';

const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
export const romain = (n: number) => ROMAINS[n - 1] ?? String(n);

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
  onFini?: () => void;
}

/**
 * Le texte se dessine caractère par caractère. L'encre arrive pâle et
 * floue, s'étale, puis se fixe, comme la plume qui appuie et sèche.
 */
export const Encre: React.FC<EncreProps> = ({
  texte, className, style, delai = 0, vitesse = 0.022, cle, as = 'p', onFini,
}) => {
  const reduire = useReducedMotion();
  // Les lettres s'animent une à une, mais chaque mot reste d'un bloc :
  // sans ça, la ligne se coupe au milieu d'un mot (« d ira / otre »).
  const mots = useMemo(() => texte.split(' '), [texte]);
  const nbLettres = useMemo(() => Array.from(texte).length, [texte]);
  const Balise = motion[as] as typeof motion.p;

  useEffect(() => {
    if (!onFini) return;
    const duree = reduire ? 0 : (delai + nbLettres * vitesse + 0.45) * 1000;
    const t = window.setTimeout(onFini, duree);
    return () => window.clearTimeout(t);
  }, [onFini, reduire, delai, nbLettres, vitesse]);

  if (reduire) {
    return <Balise className={className} style={{ color: ENCRE, ...style }}>{texte}</Balise>;
  }

  const lettre: Variants = {
    seche: { opacity: 0, filter: 'blur(5px)', y: -1, color: ENCRE_PALE },
    ecrite: {
      opacity: 1, filter: 'blur(0px)', y: 0, color: ENCRE,
      transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <Balise
      key={cle}
      className={className}
      style={{ color: ENCRE, ...style }}
      aria-label={texte}
      initial="seche"
      animate="ecrite"
      variants={{ ecrite: { transition: { delayChildren: delai, staggerChildren: vitesse } } }}
    >
      {mots.map((mot, m) => (
        <React.Fragment key={`${m}-${mot}`}>
          <span aria-hidden style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {Array.from(mot).map((c, k) => (
              <motion.span key={`${k}-${c}`} style={{ display: 'inline-block' }} variants={lettre}>{c}</motion.span>
            ))}
          </span>
          {m < mots.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </Balise>
  );
};

interface GrimoireProps {
  /** La question du moment, écrite sur la page de droite. */
  texte: string;
  /** Change de valeur à chaque question pour relancer la plume. */
  cle: string | number;
  /** Le folio, écrit en romain au-dessus de la question. */
  folio?: string;
  /** Le registre de la page de gauche : une ligne par question déjà tranchée. */
  registre?: { romain: string; marque: boolean }[];
  /** Le verdict s'écrit plus gros que les questions, comme un sceau. */
  grand?: boolean;
  /** Appelé quand le livre a fini de s'ouvrir. */
  onOuvert?: () => void;
}

/**
 * La scène. Le livre s'ouvre, puis sert de page pour tout le reste du
 * jeu : la vidéo garde sa dernière image, donc rien ne saute à la fin.
 */
export const Grimoire: React.FC<GrimoireProps> = ({ texte, cle, folio, registre, grand, onOuvert }) => {
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
    <div
      className="relative w-full rounded-[15px] overflow-hidden aspect-[4/3] sm:aspect-video"
      style={{ background: 'rgb(11, 7, 5)', containerType: 'inline-size' }}
    >
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
          couper net, et le centre du vélin reste clair sous le texte. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 74% 60% at 50% 50%, rgba(0,0,0,0) 46%, rgba(10,5,7,0.5) 80%, rgba(10,5,7,0.9) 100%)',
      }} />

      {ouvert && (
        <>
          {/* Page de gauche : le registre des réponses déjà portées. Il
              demande de la place, donc il n'apparaît qu'à partir du
              format tablette. */}
          {registre && registre.length > 0 && (
            <div className="hidden sm:block absolute" style={{ left: '15%', top: '26%', width: '26%' }}>
              <p aria-hidden className="font-display text-center mb-[1.6cqw]"
                 style={{ color: ENCRE_PALE, fontSize: 'clamp(7px, 1.05cqw, 12px)', letterSpacing: '0.34em' }}>
                REGISTRE
              </p>
              <div className="grid grid-cols-3 gap-x-[1.4cqw] gap-y-[1.5cqw] justify-items-center"
                   style={{ fontSize: 'clamp(9px, 1.5cqw, 17px)' }}>
                {registre.map((l, i) => (
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
          )}

          {/* La question s'écrit sur la page de droite quand les deux
              pages tiennent à l'écran, et au milieu de la double page
              sur un téléphone, où découper en colonnes rendrait le
              texte illisible. */}
          <div aria-live="polite" className="contents">
            <div lang="fr" className="sm:hidden absolute inset-0 flex items-center justify-center px-[9%] text-center">
              {/* Sur un téléphone, les deux pages sont trop étroites pour
                  tenir la question chacune de leur côté : elle passe donc
                  au milieu, et un lavis de vélin efface la reliure sous
                  les lettres pour que rien ne se perde dans le pli. */}
              <div className="relative w-full px-[6%] py-[5%]">
                <div aria-hidden className="absolute inset-0 rounded-[10px]" style={{
                  background: 'radial-gradient(ellipse 62% 58% at 50% 50%, rgba(240, 226, 200, 0.9) 0%, rgba(238, 223, 195, 0.72) 55%, rgba(238, 223, 195, 0) 100%)',
                }} />
                <div className="relative">
                {folio && (
                  <Encre
                    as="span" texte={folio} cle={`fm-${cle}`} vitesse={0.05}
                    className="font-display block mb-[2.4cqw]"
                    style={{ color: ENCRE_PALE, fontSize: 'clamp(9px, 2.4cqw, 15px)', letterSpacing: '0.34em' }}
                  />
                )}
                <Encre
                  texte={texte} cle={`m-${cle}`} delai={folio ? 0.35 : 0}
                  className="font-editorial leading-snug"
                  style={{
                    fontSize: grand ? 'clamp(20px, 7cqw, 34px)' : 'clamp(12px, 3.9cqw, 20px)',
                    hyphens: 'auto', overflowWrap: 'break-word',
                  }}
                />
                </div>
              </div>
            </div>

            <div className="hidden sm:block absolute text-center" lang="fr" style={{ left: '50.5%', top: '23%', width: '30%' }}>
              {folio && (
                <Encre
                  as="span" texte={folio} cle={`fd-${cle}`} vitesse={0.05}
                  className="font-display block mb-[1.4cqw]"
                  style={{ color: ENCRE_PALE, fontSize: 'clamp(9px, 1.5cqw, 16px)', letterSpacing: '0.34em' }}
                />
              )}
              <Encre
                texte={texte} cle={`d-${cle}`} delai={folio ? 0.35 : 0}
                className="font-editorial leading-snug"
                style={{
                  fontSize: grand ? 'clamp(22px, 4.4cqw, 48px)' : 'clamp(12px, 2.2cqw, 24px)',
                  hyphens: 'auto', overflowWrap: 'break-word',
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Grimoire;
