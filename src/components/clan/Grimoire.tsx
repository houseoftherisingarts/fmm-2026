import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

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
  const lettres = useMemo(() => Array.from(texte), [texte]);
  const Balise = motion[as] as typeof motion.p;

  useEffect(() => {
    if (!onFini) return;
    const duree = reduire ? 0 : (delai + lettres.length * vitesse + 0.45) * 1000;
    const t = window.setTimeout(onFini, duree);
    return () => window.clearTimeout(t);
  }, [onFini, reduire, delai, lettres.length, vitesse]);

  if (reduire) {
    return <Balise className={className} style={{ color: ENCRE, ...style }}>{texte}</Balise>;
  }

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
      {lettres.map((c, i) => (
        <motion.span
          key={`${i}-${c}`}
          aria-hidden
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
          variants={{
            seche: { opacity: 0, filter: 'blur(5px)', y: -1, color: ENCRE_PALE },
            ecrite: {
              opacity: 1, filter: 'blur(0px)', y: 0, color: ENCRE,
              transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
            },
          }}
        >
          {c}
        </motion.span>
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
  /** Appelé quand le livre a fini de s'ouvrir. */
  onOuvert?: () => void;
}

/**
 * La scène. Le livre s'ouvre, puis sert de page pour tout le reste du
 * jeu : la vidéo garde sa dernière image, donc rien ne saute à la fin.
 */
export const Grimoire: React.FC<GrimoireProps> = ({ texte, cle, folio, registre, onOuvert }) => {
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
            <div className="hidden sm:block absolute" style={{ left: '11%', top: '17%', width: '28%', height: '58%' }}>
              <div className="grid grid-cols-5 gap-x-[6cqw] gap-y-[1.1cqw]" style={{ fontSize: 'clamp(7px, 1.05cqw, 13px)' }}>
                {registre.map((l, i) => (
                  <motion.span
                    key={l.romain}
                    className="font-display tabular-nums"
                    style={{ color: l.marque ? ENCRE : 'rgba(120, 96, 70, 0.32)' }}
                    initial={false}
                    animate={l.marque ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0.55, filter: 'blur(0.4px)' }}
                    transition={{ duration: 0.5, delay: l.marque ? 0.05 * (i % 5) : 0 }}
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
            <div className="sm:hidden absolute inset-0 flex items-center justify-center px-[11%] text-center">
              <div className="w-full">
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
                  style={{ fontSize: 'clamp(11px, 3.4cqw, 19px)' }}
                />
              </div>
            </div>

            <div className="hidden sm:block absolute text-center" style={{ left: '48%', top: '18%', width: '34%' }}>
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
                style={{ fontSize: 'clamp(12px, 2.3cqw, 25px)' }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Grimoire;
