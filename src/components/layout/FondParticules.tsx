import React, { useEffect, useRef } from 'react';
import { usePerfTier } from '../../lib/usePerfTier';

// ─── Le fond de particules des peaux ────────────────────────────────
// Alex, 2026-08-31 : sous la peau bleue, la vidéo de flammes cède la
// place à une neige d'hiver qui souffle vers la droite; sous la peau
// dorée, à des bulles qui montent comme dans un verre de bière. La
// peau d'origine et la verte gardent le feu filmé.
//
// Un seul canevas 2D, plein cadre, sous le contenu. Rendu à un
// devicePixelRatio plafonné à 1,5, boucle arrêtée quand l'onglet passe
// en arrière-plan, rien du tout sur une machine modeste ni sous
// « réduire les animations ». Les flocons et les bulles sont dessinés
// depuis des vignettes préparées une fois (drawImage plutôt qu'un
// dégradé radial par particule et par image) : c'est ce qui tient les
// 60 images par seconde sur un portable d'entrée de gamme.

export type VarianteFond = 'neige' | 'bulles';

interface Props {
  variante: VarianteFond;
  /** Par défaut le fond est fixe et couvre la fenêtre. L'accueil-orbe
   *  le pose en absolu dans son hero. */
  className?: string;
}

interface Particule {
  x: number; y: number;
  r: number;
  a: number;          // opacité propre
  vy: number;         // vitesse verticale, px par image de référence
  phase: number;      // décalage de l'oscillation
  amp: number;        // amplitude de l'oscillation
  sprite: number;     // index de la vignette
  fin?: number;       // bulles : hauteur où elle s'échappe
}

/** Trois vignettes de flocon : nette pour les petits, de plus en plus
 *  floue pour les gros, ce qui donne la profondeur sans filtre CSS. */
function vignettesNeige(dpr: number): HTMLCanvasElement[] {
  return [0.0, 0.45, 0.85].map((flou) => {
    const taille = Math.ceil(24 * dpr);
    const c = document.createElement('canvas');
    c.width = c.height = taille;
    const g = c.getContext('2d')!;
    const m = taille / 2;
    const grad = g.createRadialGradient(m, m, 0, m, m, m);
    // Blanc bleuté : jamais un blanc pur, qui ferait tache sur la nuit.
    grad.addColorStop(0, 'rgba(226, 236, 248, 1)');
    grad.addColorStop(Math.max(0.06, 0.62 - flou * 0.55), 'rgba(214, 228, 245, 0.92)');
    grad.addColorStop(1, 'rgba(190, 212, 238, 0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(m, m, m, 0, Math.PI * 2); g.fill();
    return c;
  });
}

/** Une bulle : cercle ambré translucide, liseré clair, et le petit arc
 *  de reflet en haut à gauche. Trois tailles de vignette suffisent, la
 *  mise à l'échelle fait le reste. */
function vignettesBulle(dpr: number): HTMLCanvasElement[] {
  return [1, 2, 3].map((n) => {
    const taille = Math.ceil(n * 22 * dpr);
    const c = document.createElement('canvas');
    c.width = c.height = taille;
    const g = c.getContext('2d')!;
    const m = taille / 2;
    const r = m * 0.82;

    const corps = g.createRadialGradient(m - r * 0.3, m - r * 0.35, r * 0.1, m, m, r);
    corps.addColorStop(0, 'rgba(255, 244, 205, 0.56)');
    corps.addColorStop(0.55, 'rgba(235, 190, 92, 0.22)');
    corps.addColorStop(1, 'rgba(160, 112, 34, 0.06)');   // canevas : jamais de var() ici
    g.fillStyle = corps;
    g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fill();

    g.strokeStyle = 'rgba(255, 232, 170, 0.68)';
    g.lineWidth = Math.max(1, r * 0.07);
    g.beginPath(); g.arc(m, m, r * 0.97, 0, Math.PI * 2); g.stroke();

    // Le reflet : un arc court, en haut à gauche, comme sur une bulle
    // vue de trois quarts.
    g.strokeStyle = 'rgba(255, 252, 236, 0.95)';
    g.lineWidth = Math.max(1, r * 0.12);
    g.lineCap = 'round';
    g.beginPath(); g.arc(m, m, r * 0.66, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
    return c;
  });
}

const FondParticules: React.FC<Props> = ({ variante, className }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { lite } = usePerfTier();
  const doux = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eteint = lite || doux;

  useEffect(() => {
    if (eteint) return;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, raf = 0;
    let particules: Particule[] = [];

    const neige = variante === 'neige';
    const sprites = neige ? vignettesNeige(dpr) : vignettesBulle(dpr);

    const naitre = (p: Particule, semis: boolean): Particule => {
      if (neige) {
        const prof = Math.random();                       // 0 = loin, 1 = près
        p.r = 1 + prof * 3;                               // 1 à 4 px
        p.a = 0.28 + prof * 0.55;
        p.vy = 0.22 + prof * 0.62;
        p.sprite = prof > 0.72 ? 2 : prof > 0.38 ? 1 : 0;
        p.amp = 0.25 + Math.random() * 0.85;
        p.x = Math.random() * (w + 220) - 180;
        p.y = semis ? Math.random() * h : -12 - Math.random() * 60;
      } else {
        const prof = Math.random();
        p.r = 2 + prof * 7;                               // 2 à 9 px
        p.a = 0.30 + prof * 0.5;
        p.vy = -(0.28 + prof * 1.15);
        p.sprite = prof > 0.7 ? 2 : prof > 0.35 ? 1 : 0;
        p.amp = 0.2 + Math.random() * 0.7;
        p.x = Math.random() * w;
        p.y = semis ? Math.random() * h : h + 10 + Math.random() * 90;
        p.fin = h * (0.05 + Math.random() * 0.14);        // où elle s'échappe
      }
      p.phase = Math.random() * Math.PI * 2;
      return p;
    };

    const peupler = () => {
      const mobile = w < 700;
      const base = neige
        ? (mobile ? 110 : 200)
        : (mobile ? 70  : 120);
      // Densité liée à l'aire : un écran très large ne doit pas se
      // retrouver avec la même poignée de particules qu'un portable.
      const n = Math.round(Math.min(neige ? 220 : 140, Math.max(base * 0.55, (w * h) / (neige ? 9000 : 15000))));
      particules = Array.from({ length: n }, () => naitre({} as Particule, true));
    };

    const redim = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width); h = Math.max(1, rect.height);
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      peupler();
    };
    redim();

    const ro = new ResizeObserver(redim);
    ro.observe(canvas);

    let last = performance.now();
    const tick = (now: number) => {
      // 16,7 ms = une image de référence. Le pas est plafonné pour
      // qu'un retour d'onglet ne projette pas tout d'un coup.
      const dt = Math.min(3, (now - last) / 16.7); last = now;
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);

      if (neige) {
        // Le vent : une dérive vers la droite qui respire lentement,
        // deux sinusoïdes de périodes différentes pour éviter le
        // balancement mécanique.
        const vent = 0.42 + Math.sin(t / 7.3) * 0.34 + Math.sin(t / 2.9) * 0.12;
        for (const p of particules) {
          p.y += p.vy * dt;
          p.x += (vent * (0.4 + p.r / 5) + Math.sin(t * 1.1 + p.phase) * p.amp * 0.4) * dt;
          if (p.y > h + 16 || p.x > w + 200) naitre(p, false);
          const d = p.r * 3.4;
          ctx.globalAlpha = p.a;
          ctx.drawImage(sprites[p.sprite], p.x - d / 2, p.y - d / 2, d, d);
        }
      } else {
        for (const p of particules) {
          // Près de la surface, la bulle accélère puis s'efface.
          const proche = p.fin !== undefined && p.y < p.fin * 2.4;
          if (proche) p.vy *= 1.006;
          p.y += p.vy * dt;
          p.x += Math.sin(t * 1.35 + p.phase) * p.amp * 0.55 * dt;
          if (p.fin !== undefined && p.y < p.fin) { naitre(p, false); continue; }
          const fondu = p.fin !== undefined
            ? Math.min(1, (p.y - p.fin) / Math.max(40, p.fin * 0.9))
            : 1;
          const d = p.r * 2.6;
          ctx.globalAlpha = p.a * fondu;
          ctx.drawImage(sprites[p.sprite], p.x - d / 2, p.y - d / 2, d, d);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    const relancer = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; return; }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    document.addEventListener('visibilitychange', relancer);
    relancer();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', relancer);
    };
  }, [variante, eteint]);

  if (eteint) return null;

  return (
    <div
      aria-hidden
      data-always
      data-variante={variante}
      className={className ?? 'fmm-fire-backdrop fmm-fond-particules'}
    >
      <canvas ref={ref} className="fmm-fond-particules-toile" />
    </div>
  );
};

export default FondParticules;
