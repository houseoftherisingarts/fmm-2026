import React, { useEffect, useRef } from 'react';
import { usePerfTier } from '../../lib/usePerfTier';
import { useAnimationsFond } from '../../lib/usePrefsFond';

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
  x0?: number;        // bulles d'un filet : le point de nucléation
  derive?: number;    // bulles d'un filet : décalage latéral à l'arrivée
  vivant?: boolean;   // bulles d'un filet : en montée ou en attente
}

/** Un filet : un point de nucléation fixe au bas du verre, qui émet une
 *  bulle à intervalle régulier. Les bulles d'un même filet se suivent en
 *  colonne et dérivent un peu plus de côté à mesure qu'elles montent. */
interface Filet { x: number; periode: number; prochain: number; r: number; vy: number; derive: number; amp: number }

/** Un amas de mousse : petites bulles blanc-crème agglutinées, floues,
 *  qui dérivent lentement près de la surface ou collées au bord. */
interface Mousse { sprite: HTMLCanvasElement; x: number; y: number; a: number; phase: number; w: number; h: number }

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
    // Ambre décalé de ~5 % vers l'orange (Alex, 2026-08-31), même
    // luminosité : 255,244,205 → 255,238,196 · 235,190,92 → 238,178,84.
    corps.addColorStop(0, 'rgba(255, 238, 196, 0.56)');
    corps.addColorStop(0.55, 'rgba(238, 178, 84, 0.22)');
    corps.addColorStop(1, 'rgba(162, 106, 30, 0.06)');   // canevas : jamais de var() ici
    g.fillStyle = corps;
    g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fill();

    g.strokeStyle = 'rgba(255, 226, 160, 0.68)';
    g.lineWidth = Math.max(1, r * 0.07);
    g.beginPath(); g.arc(m, m, r * 0.97, 0, Math.PI * 2); g.stroke();

    // Le reflet : un arc court, en haut à gauche, comme sur une bulle
    // vue de trois quarts.
    g.strokeStyle = 'rgba(255, 250, 232, 0.95)';
    g.lineWidth = Math.max(1, r * 0.12);
    g.lineCap = 'round';
    g.beginPath(); g.arc(m, m, r * 0.66, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
    return c;
  });
}

/** Trois amas de mousse pré-rendus : une vingtaine de petits cercles
 *  blanc-crème aux bords fondus, agglutinés en grappe plate. Dessinés une
 *  fois, posés ensuite par drawImage à faible opacité. */
function vignettesMousse(dpr: number): HTMLCanvasElement[] {
  return [0, 1, 2].map((i) => {
    const W = 220, H = 96;
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * dpr); c.height = Math.ceil(H * dpr);
    const g = c.getContext('2d')!;
    g.scale(dpr, dpr);
    // Graine fixe par amas : le même dessin à chaque montage.
    let seed = 7 + i * 131;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const n = 18 + i * 4;
    for (let k = 0; k < n; k++) {
      const r = 5 + rnd() * 11;
      const x = 20 + rnd() * (W - 40);
      const y = H * 0.5 + (rnd() - 0.5) * (H - r * 2) * 0.7;
      const grad = g.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
      grad.addColorStop(0, 'rgba(255, 246, 226, 0.95)');
      grad.addColorStop(0.55, 'rgba(255, 238, 206, 0.55)');
      grad.addColorStop(1, 'rgba(255, 232, 196, 0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    return c;
  });
}

const FondParticules: React.FC<Props> = ({ variante, className }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { lite } = usePerfTier();
  const doux = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Le réglage « Animations du fond » éteint aussi la boucle, pas
  // seulement l'affichage (la classe CSS cache le canevas, ce hook
  // arrête le dessin).
  const animations = useAnimationsFond();
  const eteint = lite || doux || !animations;

  useEffect(() => {
    if (eteint) return;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, raf = 0;
    let particules: Particule[] = [];
    let filets: Filet[] = [];
    let colonnes: Particule[] = [];       // les bulles des filets, en réserve ou en montée
    let mousses: Mousse[] = [];

    const neige = variante === 'neige';
    const sprites = neige ? vignettesNeige(dpr) : vignettesBulle(dpr);
    const spritesMousse = neige ? [] : vignettesMousse(dpr);

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
        // Les bulles isolées, petites comme dans une vraie bière
        // (Alex, 2026-08-31) : 1 à 5 px, une par-ci par-là.
        const prof = Math.random();
        p.r = 1 + prof * 4;                               // 1 à 5 px
        p.a = 0.32 + prof * 0.45;
        p.vy = -(0.35 + prof * 0.95);
        p.sprite = prof > 0.7 ? 2 : prof > 0.35 ? 1 : 0;
        p.amp = 0.15 + Math.random() * 0.5;
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
        : (mobile ? 18  : 30);
      // Densité liée à l'aire : un écran très large ne doit pas se
      // retrouver avec la même poignée de particules qu'un portable.
      const n = Math.round(Math.min(neige ? 220 : 40, Math.max(base * 0.55, (w * h) / (neige ? 9000 : 40000))));
      particules = Array.from({ length: n }, () => naitre({} as Particule, true));
      if (neige) return;

      // Les filets : 6 à 12 points de nucléation répartis sur la
      // largeur, jamais en grille (un léger hasard autour de chaque
      // case), chacun avec son rayon, sa cadence et sa dérive propres.
      const nf = Math.max(6, Math.min(12, Math.round(w / 140)));
      filets = Array.from({ length: nf }, (_, i) => {
        const r = 1 + Math.random() * 2.2;                // 1 à 3,2 px à la naissance
        return {
          x: ((i + 0.2 + Math.random() * 0.6) / nf) * w,
          periode: 260 + Math.random() * 420,             // ms entre deux bulles
          prochain: performance.now() + Math.random() * 700,
          r,
          vy: -(0.9 + r * 0.28 + Math.random() * 0.3),    // les grosses montent plus vite
          derive: (Math.random() - 0.5) * 36,             // décalage latéral à l'arrivée
          amp: 1.5 + Math.random() * 3,                   // ondulation, croît en montant
        };
      });
      // La réserve de bulles des filets : assez pour que chaque filet
      // tienne toute la hauteur à sa cadence la plus rapide.
      const parFilet = Math.ceil((h / 0.9 / 16.7) / 260) + 2;
      colonnes = Array.from({ length: nf * parFilet }, () => ({ vivant: false } as Particule));

      // La mousse : deux amas près de la surface qui dérivent, un
      // troisième collé au bord droit un peu plus bas (mobile : deux).
      const ms = spritesMousse;
      mousses = [
        { sprite: ms[0], x: w * 0.10, y: h * 0.13, a: 0.14, phase: 0.0, w: 220, h: 96 },
        { sprite: ms[1], x: w * 0.66, y: h * 0.11, a: 0.12, phase: 2.1, w: 260, h: 110 },
        ...(mobile ? [] : [{ sprite: ms[2], x: w - 130, y: h * 0.34, a: 0.10, phase: 4.2, w: 200, h: 88 }]),
      ];
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
        // 1. Les bulles isolées.
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

        // 2. Les filets : chaque point de nucléation lâche une bulle à
        //    sa cadence, prise dans la réserve.
        for (const f of filets) {
          if (now < f.prochain) continue;
          f.prochain = now + f.periode * (0.85 + Math.random() * 0.3);
          const b = colonnes.find((c) => !c.vivant);
          if (!b) continue;
          b.vivant = true;
          b.x0 = f.x; b.x = f.x; b.y = h + 4;
          b.r = f.r * (0.85 + Math.random() * 0.3);
          b.vy = f.vy; b.derive = f.derive; b.amp = f.amp;
          b.a = 0.5 + Math.random() * 0.3;
          b.phase = Math.random() * Math.PI * 2;
          b.sprite = b.r > 2.6 ? 1 : 0;
          b.fin = h * (0.06 + Math.random() * 0.06);
        }
        for (const b of colonnes) {
          if (!b.vivant) continue;
          const prog = Math.min(1, Math.max(0, (h - b.y) / h));     // 0 en bas, 1 en haut
          b.y += b.vy * (1 + prog * 0.35) * dt;                     // s'accélère en montant
          // La colonne reste droite au départ et s'écarte en montant :
          // l'ondulation et la dérive croissent avec la hauteur.
          b.x = (b.x0 ?? b.x) + (b.derive ?? 0) * prog * prog + Math.sin(t * 2.2 + b.phase) * b.amp * prog;
          if (b.fin !== undefined && b.y < b.fin) { b.vivant = false; continue; }
          const fondu = b.fin !== undefined ? Math.min(1, (b.y - b.fin) / Math.max(30, b.fin * 0.8)) : 1;
          const d = b.r * (1 + prog * 0.35) * 2.6;                  // grossit un peu en montant
          ctx.globalAlpha = b.a * fondu;
          ctx.drawImage(sprites[b.sprite], b.x - d / 2, b.y - d / 2, d, d);
        }

        // 3. La mousse : des amas lents, à peine visibles, qui respirent.
        for (const m of mousses) {
          const dx = Math.sin(t / 9 + m.phase) * 14;
          const dy = Math.sin(t / 5.5 + m.phase * 1.7) * 4;
          ctx.globalAlpha = m.a * (0.85 + Math.sin(t / 6 + m.phase) * 0.15);
          ctx.drawImage(m.sprite, m.x + dx - m.w / 2, m.y + dy - m.h / 2, m.w, m.h);
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
