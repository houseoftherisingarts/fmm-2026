import React, { useEffect, useRef } from 'react';

// Canvas-based ember field. Lighter than 30+ DOM divs animating box-shadow.
// Particles drift upward with mild horizontal sway, fade in/out, recycle.
// Skips render entirely when prefers-reduced-motion is set.

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

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    let raf = 0;
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

    const spawn = (e?: Ember): Ember => {
      const maxLife = 5500 + Math.random() * 4500;
      return Object.assign(e || ({} as Ember), {
        x: Math.random() * w,
        y: h + Math.random() * 80,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -0.25 - Math.random() * 0.55,
        r: 0.6 + Math.random() * 1.7,
        life: 0,
        maxLife,
        hue: 28 + Math.random() * 18,            // copper → amber range
      });
    };

    const embers: Ember[] = Array.from({ length: count }, () => spawn());

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last); last = now;
      ctx.clearRect(0, 0, w, h);
      // Additive glow — embers brighten where they overlap.
      ctx.globalCompositeOperation = 'lighter';

      for (const e of embers) {
        e.life += dt;
        if (e.life > e.maxLife || e.y < -20) { spawn(e); continue; }
        // Wind sway — lateral nudge tied to vertical position.
        e.vx += Math.sin((e.life / 700) + e.x * 0.01) * 0.0035;
        e.x += e.vx * dt * 0.06;
        e.y += e.vy * dt * 0.06;

        const t = e.life / e.maxLife;
        const alpha =
          t < 0.15 ? t / 0.15 :
          t > 0.85 ? (1 - t) / 0.15 :
          1;

        const rr = e.r * (1 + (1 - t) * 0.35);
        // Halo
        const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, rr * 6);
        grad.addColorStop(0,    `hsla(${e.hue}, 90%, 65%, ${0.55 * alpha})`);
        grad.addColorStop(0.45, `hsla(${e.hue}, 85%, 50%, ${0.18 * alpha})`);
        grad.addColorStop(1,    'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(e.x, e.y, rr * 6, 0, Math.PI * 2); ctx.fill();
        // Hot core
        ctx.fillStyle = `hsla(${e.hue + 12}, 100%, 78%, ${0.95 * alpha})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [count]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`absolute inset-0 pointer-events-none w-full h-full ${className}`}
    />
  );
};

export default EmberCanvas;
