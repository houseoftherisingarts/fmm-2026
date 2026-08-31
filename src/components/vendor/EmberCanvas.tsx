import React, { useEffect, useRef } from 'react';
import { useSkinActif } from '../../lib/useSkinActif';

// Les braises du festival : elles montent du bas avec un balancement de
// vent, cuivre vers ambre, halo additif. C'est l'effet des premières
// versions du site, celui qu'Alex voulait retrouver.
//
// 🚨 On n'écoute PAS prefers-reduced-motion ici (décision d'Alex,
// 2026-08-02). Avant, le composant sortait aussitôt si le réglage
// système était actif : personne avec « réduire les animations » ne
// voyait la moindre braise, sur aucune page. La dérive est lente et
// ambiante, sans parallaxe ni détournement de défilement, donc elle ne
// déclenche pas de gêne vestibulaire. La boucle se met quand même en
// pause hors écran, pour ne pas faire tourner six canevas à vide.

interface Props {
  count?: number;
  className?: string;
}

interface Ember {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  life: number; maxLife: number;
  hue: number;
}

const EmberCanvas: React.FC<Props> = ({ count = 28, className = '' }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  // La peau du compte décide de la teinte des braises : cuivre sous la
  // palette d'origine, bleu froid sous le bleu et argent, vert sous le
  // vert, or sous le doré et noir (Alex, 2026-08-31). Les deux nombres
  // vivent dans --sk-ember-hue / --sk-ember-sat, src/index.css.
  const skin = useSkinActif();

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    const jetons = getComputedStyle(document.documentElement);
    const nombre = (nom: string, repli: number) => {
      const v = parseFloat(jetons.getPropertyValue(nom));
      return Number.isFinite(v) ? v : repli;
    };
    const teinte = nombre('--sk-ember-hue', 28);
    const chroma = nombre('--sk-ember-sat', 88);

    let raf = 0;
    let visible = true;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Pause hors écran : une page longue peut porter six canevas.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      },
      { rootMargin: '160px' },
    );
    io.observe(canvas);

    // `seed` = première population. Sans elle, toutes les braises
    // naissaient SOUS le canevas et devaient le remonter en entier :
    // sur une section de 1300 px, à ~1,4 px par image, la traversée
    // demande une quinzaine de secondes alors que leur durée de vie
    // plafonne à 10 s. Elles mouraient donc avant d'entrer dans le
    // champ, et la section restait vide. Corrigé 2026-08-02.
    const spawn = (e?: Ember, seed = false): Ember => {
      const maxLife = 5500 + Math.random() * 4500;
      return Object.assign(e || ({} as Ember), {
        x: Math.random() * w,
        y: seed ? Math.random() * h : h + Math.random() * 80,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -0.25 - Math.random() * 0.55,
        r: 0.6 + Math.random() * 1.7,
        // Une braise semée démarre à un âge quelconque, sinon les
        // `count` braises apparaissent et s'éteignent en choeur.
        life: seed ? Math.random() * maxLife * 0.8 : 0,
        maxLife,
        hue: teinte + Math.random() * 18,        // la rampe de la peau
      });
    };

    // Densité proportionnelle à l'aire : `count` est calibré pour un
    // hero d'environ 1200x600. Sur une section deux fois plus haute, un
    // nombre fixe donnait trois braises perdues dans le noir. On garde
    // un plafond pour ne pas noyer une grande page en particules.
    const area = Math.max(1, w * h);
    const n = Math.min(140, Math.max(count, Math.round(area / 12500)));
    const embers: Ember[] = Array.from({ length: n }, () => spawn(undefined, true));

    let last = performance.now();
    const tick = (now: number) => {
      if (!visible) { raf = 0; return; }
      const dt = Math.min(48, now - last); last = now;
      ctx.clearRect(0, 0, w, h);
      // Additive glow: embers brighten where they overlap.
      ctx.globalCompositeOperation = 'lighter';

      for (const e of embers) {
        e.life += dt;
        if (e.life > e.maxLife || e.y < -20) { spawn(e); continue; }
        // Wind sway: lateral nudge tied to vertical position.
        e.vx += Math.sin((e.life / 700) + e.x * 0.01) * 0.0035;
        e.x += e.vx * dt * 0.06;
        // Facteur de hauteur : sur une section haute, les braises
        // montent plus vite pour couvrir la distance dans leur vie.
        e.y += e.vy * dt * 0.06 * Math.max(1, h / 520);

        const t = e.life / e.maxLife;
        const alpha =
          t < 0.15 ? t / 0.15 :
          t > 0.85 ? (1 - t) / 0.15 :
          1;

        const rr = e.r * (1 + (1 - t) * 0.35);
        // Halo
        const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, rr * 6);
        grad.addColorStop(0,    `hsla(${e.hue}, ${chroma}%, 65%, ${0.55 * alpha})`);
        grad.addColorStop(0.45, `hsla(${e.hue}, ${chroma * 0.94}%, 50%, ${0.18 * alpha})`);
        grad.addColorStop(1,    'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(e.x, e.y, rr * 6, 0, Math.PI * 2); ctx.fill();
        // Hot core
        ctx.fillStyle = `hsla(${e.hue + 12}, ${Math.min(100, chroma * 1.1)}%, 78%, ${0.95 * alpha})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [count, skin]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`fmm-fx-canvas absolute inset-0 pointer-events-none w-full h-full ${className}`}
    />
  );
};

export default EmberCanvas;
