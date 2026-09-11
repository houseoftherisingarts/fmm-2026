import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

/**
 * Le texte se découpe en mots, mais la ponctuation double du français
 * (le point d'interrogation, le point d'exclamation, les deux-points,
 * le point-virgule et le guillemet fermant) reste accrochée au mot qui
 * la précède par une espace fine insécable. Sans ça, un « ? » tombe
 * seul au début de la ligne suivante, ce qui se voit tout de suite sur
 * une page de vélin (Alex, 2026-09-10).
 */
function decouper(texte: string): string[] {
  const sortie: string[] = [];
  for (const mot of texte.split(' ')) {
    const dernier = sortie.length - 1;
    if (dernier >= 0 && /^[?!:;»][.,…]?$/.test(mot)) sortie[dernier] += `\u202F${mot}`;
    else if (dernier >= 0 && sortie[dernier] === '«') sortie[dernier] += `\u202F${mot}`;
    else sortie.push(mot);
  }
  return sortie;
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
  const mots = useMemo(() => decouper(texte), [texte]);
  const Balise = motion[as] as typeof motion.p;

  if (reduire) {
    return <Balise className={`grimoire-encre ${className ?? ''}`} style={{ color: ENCRE, ...style }}>{texte}</Balise>;
  }

  return (
    <Balise
      key={cle}
      className={`grimoire-encre ${className ?? ''}`}
      style={{ color: ENCRE, hyphens: 'auto', overflowWrap: 'break-word', ...style }}
      aria-label={texte}
      initial="seche"
      animate="ecrite"
      variants={{ ecrite: { transition: { delayChildren: delai, staggerChildren: vitesse } } }}
    >
      {mots.map((mot, m) => (
        <React.Fragment key={`${m}-${mot}`}>
          <span data-mot aria-hidden style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
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
  /** Une entrée seule se centre sur la page, sans colonne de marge. */
  centre?: boolean;
  /** Une ligne secondaire, écrite plus petit sous la première. */
  sous?: string;
}

/**
 * Une réponse écrite à l'encre sur la page. Le trait de plume se tire
 * sous la ligne au survol, et la croix de marge reste quand la réponse
 * est retenue.
 */
export const ChoixEncre: React.FC<ChoixProps> = ({
  texte, onClick, choisi, marge, delai = 0, cle, fort, sous, centre,
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
      <span className={centre ? 'flex items-baseline justify-center' : 'flex items-baseline gap-[1.2cqw]'}>
        {!centre && <motion.span
          aria-hidden
          className="grimoire-encre shrink-0 tabular-nums text-right"
          style={{
            color: choisi ? ENCRE_ROUGE : ENCRE_PALE,
            fontSize: 'var(--t-marge)',
            width: '2.2cqw',
          }}
          animate={{ opacity: actif ? 1 : 0.6 }}
          transition={{ duration: 0.25 }}
        >
          {choisi ? '✕' : marge ?? '·'}
        </motion.span>}
        <span className={centre ? 'block' : 'block flex-1'}>
          <Encre
            as="span"
            texte={texte}
            cle={cle}
            delai={delai}
            vitesse={0.013}
            className={`${fort ? 'font-display' : 'font-editorial'} leading-snug${centre ? ' text-center' : ''}`}
            style={{
              display: 'block',
              fontSize: fort ? 'var(--t-fort)' : 'var(--t-reponse)',
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
              style={{ display: 'block', marginTop: '0.1cqw', fontSize: 'var(--t-sous)', color: ENCRE_PALE }}
            />
          )}
        </span>
      </span>
      {/* Le trait de plume sous la ligne retenue ou survolée. */}
      <motion.span
        aria-hidden
        className="block origin-left"
        style={{
          height: 4, marginTop: '0.3cqw',
          marginLeft: centre ? '22%' : '3.4cqw', marginRight: centre ? '22%' : 0,
          borderBottom: `1px solid ${choisi ? ENCRE_ROUGE : ENCRE_PALE}`,
          borderRadius: '50% / 0 0 100% 100%',
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
    className="block text-center mb-[1.6cqw]"
    style={{ color: ENCRE_PALE, fontSize: 'var(--t-folio)', letterSpacing: '0.34em' }}
  />
);

export const RegistreFolios: React.FC<{ lignes: { romain: string; marque: boolean }[] }> = ({ lignes }) => (
  <div>
    <p aria-hidden className="grimoire-encre text-center mb-[1.4cqw]"
       style={{ color: ENCRE_PALE, fontSize: 'clamp(7px, 0.95cqw, 12px)', letterSpacing: '0.34em' }}>
      REGISTRE
    </p>
    <div className="grid grid-cols-3 gap-x-[1.2cqw] gap-y-[1.3cqw] justify-items-center"
         style={{ fontSize: 'clamp(9px, 1.4cqw, 17px)' }}>
      {lignes.map((l, i) => (
        <motion.span
          key={l.romain}
          className="grimoire-encre tabular-nums leading-none"
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


// ── Les deux pages, relevées sur la photo du livre ──────────────────
// Le livre est photographié de biais : ses pages ne sont pas des
// rectangles, elles s'élargissent vers le bas et leur filet penche. Une
// boîte de texte droite posée là-dessus se voit au premier coup d'œil,
// et c'est exactement ce qu'Alex a vu le 2026-09-10 : le texte sortait
// de la page. Les quatre coins du filet imprimé ont donc été relevés sur
// ouvert.webp (1276 × 720), en fraction du plan, dans l'ordre haut
// gauche, haut droite, bas droite, bas gauche; la zone d'écriture prend
// ensuite cette forme exacte par une matrice de perspective, si bien
// qu'elle ne peut plus déborder du vélin quelle que soit la fenêtre.
export type Quad = readonly (readonly [number, number])[];

const CADRE_GAUCHE: Quad = [[0.146, 0.203], [0.418, 0.150], [0.410, 0.725], [0.082, 0.746]];
const CADRE_DROITE: Quad = [[0.479, 0.167], [0.777, 0.185], [0.821, 0.733], [0.484, 0.722]];

/** Le cadre rentré vers son centre : l'encre ne touche jamais le filet.
 *  La marge est plus large en largeur qu'en hauteur, parce que le bord
 *  du papier s'assombrit sur les côtés et avale l'encre qui s'en
 *  approche. */
function retrecir(q: Quad, mx: number, my: number): Quad {
  const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4;
  const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
  return q.map(([x, y]) => [x + (cx - x) * mx, y + (cy - y) * my] as const);
}

const ZONE_GAUCHE = retrecir(CADRE_GAUCHE, 0.13, 0.10);
const ZONE_DROITE = retrecir(CADRE_DROITE, 0.10, 0.08);

/**
 * La matrice qui pose un rectangle de w sur h exactement sur les quatre
 * points donnés, en pixels et dans l'ordre des coins. C'est l'homographie
 * classique du carré unité vers un quadrilatère, mise à l'échelle du
 * rectangle et écrite dans l'ordre colonne par colonne de matrix3d.
 */
function matriceVersQuad(pts: readonly (readonly [number, number])[], w: number, h: number): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = pts;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  // Un quadrilatère qui serait un parallélogramme parfait annule le
  // dénominateur : la transformation est alors affine, sans fuite.
  const g = Math.abs(den) < 1e-9 ? 0 : (sx * dy2 - dx2 * sy) / den;
  const k = Math.abs(den) < 1e-9 ? 0 : (dx1 * sy - sx * dy1) / den;
  const m = [
    (x1 - x0 + g * x1) / w, (y1 - y0 + g * y1) / w, 0, g / w,
    (x3 - x0 + k * x3) / h, (y3 - y0 + k * y3) / h, 0, k / h,
    0, 0, 1, 0,
    x0, y0, 0, 1,
  ];
  return `matrix3d(${m.map((v) => Number(v.toFixed(6))).join(',')})`;
}

/** Pose la zone d'écriture sur sa page et la garde dessus quand la
 *  fenêtre change de taille. */
function usePageDuLivre(cadre: Quad, actif: boolean) {
  const zone = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = zone.current;
    if (!el || !actif) return;
    const plan = el.closest('.grimoire-plan') as HTMLElement | null;
    if (!plan) return;

    const poser = () => {
      const c = plan.getBoundingClientRect();
      if (!c.width) return;
      const pts = cadre.map(([fx, fy]) => [fx * c.width, fy * c.height] as const);
      // La boîte de départ prend la largeur et la hauteur moyennes du
      // cadre : le texte se compose à sa vraie taille, puis la matrice
      // l'incline. Les deux mesures sortent des quatre coins, donc elles
      // suivent la fenêtre sans qu'un seul chiffre soit écrit en dur.
      const w = ((pts[1][0] - pts[0][0]) + (pts[2][0] - pts[3][0])) / 2;
      const h = ((pts[3][1] - pts[0][1]) + (pts[2][1] - pts[1][1])) / 2;
      if (w <= 0 || h <= 0) return;
      el.style.left = `${(pts[0][0] / c.width * 100).toFixed(3)}%`;
      el.style.top = `${(pts[0][1] / c.height * 100).toFixed(3)}%`;
      el.style.width = `${w.toFixed(2)}px`;
      el.style.height = `${h.toFixed(2)}px`;
      el.style.transform = matriceVersQuad(
        pts.map(([x, y]) => [x - pts[0][0], y - pts[0][1]] as const), w, h,
      );
    };

    poser();
    const oeil = new ResizeObserver(poser);
    oeil.observe(plan);
    return () => oeil.disconnect();
  }, [cadre, actif]);

  return zone;
}

/**
 * Le corps du texte se resserre jusqu'à tenir entre les filets. Une
 * question courte s'écrit en grand, les six compagnies avec leur devise
 * se rangent plus serré, et rien ne dépasse jamais du vélin. La mesure
 * se prend sur la hauteur de mise en page, que la réduction ne touche
 * pas : une seule passe suffit et rien ne peut boucler.
 */
const PLANCHER = 0.62;

function useEncreQuiTient(zone: React.RefObject<HTMLDivElement | null>, actif: boolean) {
  const contenu = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = contenu.current;
    const page = zone.current;
    if (!el || !page || !actif) return;

    const ajuster = () => {
      const dispo = page.clientHeight;
      const pris = el.offsetHeight;
      if (!dispo || !pris) return;
      const k = Math.max(PLANCHER, Math.min(1, (dispo - 2) / pris));
      el.style.transform = k > 0.998 ? '' : `scale(${k.toFixed(4)})`;
    };

    ajuster();
    // La hauteur du contenu change quand la question change, et celle de
    // la page quand la fenêtre bouge; le scale, lui, ne touche pas à la
    // mise en page, donc l'oeil ne se réveille pas sur son propre geste.
    const oeil = new ResizeObserver(ajuster);
    oeil.observe(el);
    oeil.observe(page);
    return () => oeil.disconnect();
  }, [zone, actif]);

  return contenu;
}

// ── La courbure du papier ────────────────────────────────────────────
// La page ne penche pas seulement, elle se bombe : mesuré sur l'image du
// livre, le filet du haut se soulève de 13 px en son milieu et celui du
// bas descend de 32 px, sur une image large de 1276. Un bloc de texte
// plat posé là-dessus se voit au premier coup d'œil (Alex, 2026-09-10).
//
// Chaque MOT reçoit donc son propre décalage vertical et sa pente, selon
// une parabole qui interpole entre les deux filets. Le mot, et pas la
// lettre, parce que framer-motion tient déjà la lettre par la main.
const FLECHE_HAUT = -0.0102;  // fraction de la largeur du plan, le centre monte
const FLECHE_BAS = 0.0251;    // le centre descend

function useCourbureDuPapier(zone: React.RefObject<HTMLDivElement | null>, actif: boolean) {
  const reduire = useReducedMotion();

  useLayoutEffect(() => {
    const el = zone.current;
    if (!el || !actif || reduire) return;
    const plan = el.closest('.grimoire-plan') as HTMLElement | null;
    if (!plan) return;

    let attente = 0;
    const courber = () => {
      const cadre = plan.getBoundingClientRect();
      if (!cadre.width) return;
      // Les bornes du vélin, en fraction du plan : mesurées sur l'image.
      const hautVelin = cadre.top + cadre.height * 0.16;
      const basVelin = cadre.top + cadre.height * 0.729;
      const hauteurVelin = Math.max(1, basVelin - hautVelin);
      const zr = el.getBoundingClientRect();
      const centreX = zr.left + zr.width / 2;
      const demi = Math.max(1, zr.width / 2);
      // La page est posée en perspective et son texte peut être resserré,
      // donc un pixel écrit ici ne vaut plus un pixel à l'écran : la
      // flèche se convertit dans l'échelle de la page, sinon le bombé
      // grossit avec l'inclinaison et le texte remonte hors du filet.
      const echelle = el.offsetWidth > 0 ? zr.width / el.offsetWidth : 1;

      el.querySelectorAll<HTMLElement>('[data-mot]').forEach((mot) => {
        const r = mot.getBoundingClientRect();
        const u = ((r.left + r.width / 2) - centreX) / demi;   // -1 à 1
        const v = Math.min(1, Math.max(0, ((r.top + r.height / 2) - hautVelin) / hauteurVelin));
        const amplitude = (FLECHE_HAUT + (FLECHE_BAS - FLECHE_HAUT) * v) * cadre.width / Math.max(0.2, echelle);
        const dy = amplitude * (1 - u * u);          // parabole, nulle aux bords
        const pente = amplitude * (-2 * u) / demi;   // la tangente, pour l'inclinaison
        mot.style.transform = `translateY(${dy.toFixed(2)}px) rotate(${(Math.atan(pente) * 180 / Math.PI).toFixed(3)}deg)`;
        mot.style.transformOrigin = '50% 50%';
      });
    };

    // Le texte s'écrit lettre par lettre, donc la mise en page bouge :
    // on recourbe tant qu'elle n'est pas stable.
    const boucle = () => { courber(); attente = window.setTimeout(boucle, 120); };
    boucle();
    const arret = window.setTimeout(() => window.clearTimeout(attente), 6000);
    window.addEventListener('resize', courber);
    return () => {
      window.clearTimeout(attente); window.clearTimeout(arret);
      window.removeEventListener('resize', courber);
    };
  }, [zone, actif, reduire]);
}

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
  // Chaque page se pose sur son cadre relevé sur la photo, et son texte
  // se resserre jusqu'à tenir entre les filets.
  const pageGauche = usePageDuLivre(ZONE_GAUCHE, ouvert && !!gauche);
  const pageDroite = usePageDuLivre(ZONE_DROITE, ouvert);
  const encreGauche = useEncreQuiTient(pageGauche, ouvert && !!gauche);
  const encreDroite = useEncreQuiTient(pageDroite, ouvert);
  useCourbureDuPapier(encreDroite, ouvert);

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
              <div ref={pageGauche} className="grimoire-page grimoire-page-gauche absolute flex flex-col justify-center">
                <div ref={encreGauche} className="grimoire-contenu">{gauche}</div>
              </div>
            )}
            {/* La page centre son contenu plutôt que de le tasser en
                haut : le bas du vélin ne reste plus vide. */}
            <div ref={pageDroite} className="grimoire-page absolute flex flex-col justify-center">
              <div ref={encreDroite} className="grimoire-contenu">{droite}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Grimoire;
