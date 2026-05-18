import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
  type MotionValue,
} from 'framer-motion';

// ─── Caravan effects layer ───────────────────────────────────────────
// Premium interaction + visual primitives for /marche. Pattern lifted
// from le-salon-des-inconnus InnPage (WebGL liquid-glass shader, sticky
// layers, multi-stage scrims) and OrbHomePage (particle fire, caravan
// parallax, Ken Burns cross-fade, SFX hooks). Centralised here so each
// section composes from a shared palette of effects.

// ─── useMagnet ──────────────────────────────────────────────────────
// Magnetic hover for CTAs. Returns { ref, x, y } — apply x/y as the
// element's translate via motion.div / motion.button. Pull strength
// defaults to 0.35 of the cursor's offset from card centre. The ref is
// generic so callers can attach it to any HTMLElement subtype.
export function useMagnet<T extends HTMLElement = HTMLElement>(strength = 0.35) {
  const ref = useRef<T | null>(null);
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 250, damping: 22 });
  const y = useSpring(0, { stiffness: 250, damping: 22 });

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduce) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      x.set(cx * strength);
      y.set(cy * strength);
    },
    [reduce, strength, x, y],
  );
  const onLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return { ref, x, y, onMove, onLeave };
}

// ─── useTilt ────────────────────────────────────────────────────────
// 3D card tilt bound to mouse position. Pair with transformStyle:
// 'preserve-3d' on the parent. `intensity` is the max rotation in degrees.
export function useTilt(intensity = 7) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const rx = useSpring(0, { stiffness: 220, damping: 18 });
  const ry = useSpring(0, { stiffness: 220, damping: 18 });

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduce) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      ry.set(x * intensity);
      rx.set(-y * intensity);
    },
    [reduce, intensity, rx, ry],
  );
  const onLeave = useCallback(() => {
    rx.set(0);
    ry.set(0);
  }, [rx, ry]);

  return { ref, rx, ry, onMove, onLeave };
}

// ─── useSpotlight ───────────────────────────────────────────────────
// Mouse-tracking radial light overlay. Returns the wrapper props +
// background motion-template ready to apply on a child <motion.div>.
export function useSpotlight(color = 'rgba(232,177,74,0.18)', size = 280) {
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const reduce = useReducedMotion();

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduce) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      x.set(e.clientX - rect.left);
      y.set(e.clientY - rect.top);
    },
    [reduce, x, y],
  );
  const onLeave = useCallback(() => {
    x.set(-9999);
    y.set(-9999);
  }, [x, y]);

  const background = useMotionTemplate`radial-gradient(circle ${size}px at ${x}px ${y}px, ${color}, transparent 70%)`;
  return { onMove, onLeave, background };
}

// ─── FireVideo ──────────────────────────────────────────────────────
// Looped, muted fire video bed for hero / pact backgrounds. Real-photo
// alternative to CSS gradients. Caller controls aspect; we just stretch
// to fill. Reduced-motion = render the poster frame instead.
export const FireVideo: React.FC<{
  className?: string;
  /** Soften the top with a vertical gradient mask. */
  mask?: 'top' | 'top-bottom' | 'none';
  /** Filter rolled onto the video — color-grade. */
  filter?: string;
  poster?: string;
  src?: string;
}> = ({
  className = '',
  mask = 'top-bottom',
  filter,
  poster,
  src = '/orb/fire.mp4',
}) => {
  const reduce = useReducedMotion();
  const masks: Record<typeof mask, string | undefined> = {
    'top':        'linear-gradient(to top, black 78%, transparent 100%)',
    'top-bottom': 'linear-gradient(to bottom, transparent 0%, black 22%, black 80%, transparent 100%)',
    'none':       undefined,
  } as Record<'top' | 'top-bottom' | 'none', string | undefined>;
  const mImg = masks[mask];

  if (reduce && poster) {
    return (
      <img
        aria-hidden
        src={poster}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
        style={{
          filter,
          WebkitMaskImage: mImg,
          maskImage: mImg,
        }}
      />
    );
  }

  return (
    <video
      aria-hidden
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={poster}
      src={src}
      className={`absolute inset-0 w-full h-full object-cover ${className}`}
      style={{
        filter,
        mixBlendMode: 'screen',
        WebkitMaskImage: mImg,
        maskImage: mImg,
      }}
    />
  );
};

// ─── BubbleCanvas ───────────────────────────────────────────────────
// Animated rising bubbles — soft copper glass spheres drifting up from
// below the frame. Lifted-and-simplified from le-salon-des-inconnus's
// liquid-glass effect: 14–22 active bubbles, each with its own size,
// drift, and wobble. Canvas-based so it's GPU-cheap.
interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  phase: number;
  life: number;
  maxLife: number;
  hue: number;
}

export const BubbleCanvas: React.FC<{
  className?: string;
  count?: number;
}> = ({ className = '', count = 18 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let visible = true;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Pause the RAF loop when the canvas scrolls out of view. Prevents
    // 6+ canvases from competing for frames on a long page.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(tick);
      },
      { rootMargin: '120px' },
    );
    io.observe(canvas);

    const spawn = (b?: Bubble): Bubble => {
      const r = 8 + Math.random() * 28;
      return Object.assign(b || ({} as Bubble), {
        x: Math.random() * w,
        y: h + r + Math.random() * 80,
        r,
        vy: -(0.15 + Math.random() * 0.45),
        vx: (Math.random() - 0.5) * 0.18,
        phase: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: 8000 + Math.random() * 8000,
        hue: 24 + Math.random() * 20, // copper → amber
      });
    };

    const bubbles: Bubble[] = Array.from({ length: count }, () => spawn());

    let last = performance.now();
    const tick = (now: number) => {
      if (!visible) { raf = 0; return; }
      const dt = Math.min(48, now - last);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      for (const b of bubbles) {
        b.life += dt;
        if (b.life > b.maxLife || b.y < -b.r - 20) {
          spawn(b);
          continue;
        }
        b.phase += 0.02;
        b.x += b.vx + Math.sin(b.phase) * 0.4;
        b.y += b.vy * dt * 0.06;

        const t = b.life / b.maxLife;
        const alpha = t < 0.18 ? t / 0.18 : t > 0.8 ? (1 - t) / 0.2 : 1;

        // Halo
        const halo = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.6);
        halo.addColorStop(0, `hsla(${b.hue}, 92%, 62%, ${0.32 * alpha})`);
        halo.addColorStop(0.4, `hsla(${b.hue}, 78%, 50%, ${0.12 * alpha})`);
        halo.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 2.6, 0, Math.PI * 2);
        ctx.fill();

        // Glass sphere body
        const body = ctx.createRadialGradient(
          b.x - b.r * 0.35,
          b.y - b.r * 0.45,
          b.r * 0.1,
          b.x,
          b.y,
          b.r,
        );
        body.addColorStop(0, `hsla(${b.hue}, 100%, 88%, ${0.6 * alpha})`);
        body.addColorStop(0.4, `hsla(${b.hue + 8}, 85%, 55%, ${0.4 * alpha})`);
        body.addColorStop(1, `hsla(${b.hue - 10}, 70%, 30%, ${0.15 * alpha})`);
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight — top-left dot
        ctx.fillStyle = `hsla(40, 100%, 96%, ${0.7 * alpha})`;
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.45, b.y - b.r * 0.5, b.r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [count]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`absolute inset-0 pointer-events-none w-full h-full ${className}`}
    />
  );
};

// ─── Motes ──────────────────────────────────────────────────────────
// Slow gold dust drifting upward/inward around focal subjects. Lighter
// than BubbleCanvas — these are just small luminous points with halo,
// no glass body. Pattern lifted from Wild Rift champion-select where
// motes orbit and drift around the splash art.
interface Mote {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  life: number; maxLife: number;
  hue: number;
}

export const Motes: React.FC<{
  className?: string;
  count?: number;
}> = ({ className = '', count = 28 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    let raf = 0;
    let visible = true;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(tick);
      },
      { rootMargin: '120px' },
    );
    io.observe(canvas);

    // Keep motes well inside the canvas so their halos (~r*8 ≈ 12px
    // max) never touch the visible edge. Without this, a mote drifting
    // near the boundary shows a clipped halo as a hard rectangular
    // cut against the canvas border. Padded spawn + an extra-strong
    // edge-fade in the draw loop keep edges clean.
    const PAD = 22;
    const spawn = (m?: Mote): Mote => {
      const r = 0.6 + Math.random() * 1.5;
      return Object.assign(m || ({} as Mote), {
        x: PAD + Math.random() * Math.max(1, w - 2 * PAD),
        y: PAD + Math.random() * Math.max(1, h - 2 * PAD),
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(0.04 + Math.random() * 0.18),
        r,
        life: 0,
        maxLife: 6500 + Math.random() * 5500,
        hue: 36 + Math.random() * 14,
      });
    };

    const motes: Mote[] = Array.from({ length: count }, () => spawn());

    let last = performance.now();
    const tick = (now: number) => {
      if (!visible) { raf = 0; return; }
      const dt = Math.min(48, now - last); last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      for (const m of motes) {
        m.life += dt;
        // Respawn earlier when a mote crosses the inset boundary so
        // its halo never reaches the visible edge of the canvas.
        if (m.life > m.maxLife || m.y < PAD * 0.4 || m.x < PAD * 0.4 || m.x > w - PAD * 0.4) { spawn(m); continue; }
        m.x += m.vx * dt * 0.06;
        m.y += m.vy * dt * 0.06;

        const t = m.life / m.maxLife;
        const lifeAlpha = t < 0.18 ? t / 0.18 : t > 0.78 ? (1 - t) / 0.22 : 1;
        // Edge fade — motes within PAD of any canvas edge fade
        // proportionally to their distance. Stacks with life alpha so
        // boundary-clipping is invisible even if a mote slips through.
        const edgeDist = Math.min(m.x, w - m.x, m.y, h - m.y);
        const edgeAlpha = Math.min(1, Math.max(0, edgeDist / PAD));
        const alpha = lifeAlpha * edgeAlpha;

        const halo = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 8);
        halo.addColorStop(0, `hsla(${m.hue}, 92%, 78%, ${0.5 * alpha})`);
        halo.addColorStop(0.5, `hsla(${m.hue}, 80%, 55%, ${0.12 * alpha})`);
        halo.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 8, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `hsla(${m.hue + 6}, 100%, 90%, ${0.95 * alpha})`;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [count]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`absolute inset-0 pointer-events-none w-full h-full ${className}`}
    />
  );
};

// ─── KenBurnsLayer ──────────────────────────────────────────────────
// Cross-fade Ken Burns photo stack. Pass a list of image URLs; the
// component rotates them on `interval` ms with a slow scale-and-drift
// underneath. Two stacked layers so the swap is a clean opacity fade.
export const KenBurnsLayer: React.FC<{
  images: string[];
  interval?: number;
  className?: string;
  position?: string;
}> = ({ images, interval = 6500, className = '', position = 'center' }) => {
  const [idx, setIdx] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || images.length < 2) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % images.length);
    }, interval);
    return () => clearInterval(t);
  }, [reduce, interval, images.length]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {images.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt=""
          decoding="async"
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-out ${
            i === idx ? 'opacity-100' : 'opacity-0'
          } ${reduce ? '' : 'fmm-kenburns'}`}
          style={{ objectPosition: position }}
        />
      ))}
    </div>
  );
};

// ─── useSfx ─────────────────────────────────────────────────────────
// One-shot audio helper — pre-fetches the asset, spawns a fresh Audio
// node on each trigger so overlapping clicks don't restart playback.
export function useSfx(url: string, volume = 0.55) {
  const primed = useRef(false);
  useEffect(() => {
    if (primed.current) return;
    const a = new Audio(url);
    a.preload = 'auto';
    a.volume = 0;
    void a.load();
    primed.current = true;
  }, [url]);
  return useCallback(() => {
    const a = new Audio(url);
    a.volume = volume;
    a.play().catch(() => {
      /* autoplay blocked until first gesture */
    });
  }, [url, volume]);
}

// ─── useHoverSfx ────────────────────────────────────────────────────
// Hover-rustle: a single shared Audio node + restart-on-trigger so a
// fast mouse sweep across many tiles doesn't pile up overlapping copies,
// throttled so machine-gun firing doesn't happen either. Pattern lifted
// from OrbHomePage's plate-armor rustle.
export function useHoverSfx(url: string, volume = 0.32, throttleMs = 90) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastRef = useRef(0);
  useEffect(() => {
    const a = new Audio(url);
    a.preload = 'auto';
    a.volume = volume;
    audioRef.current = a;
  }, [url, volume]);
  return useCallback(() => {
    const now = performance.now();
    if (now - lastRef.current < throttleMs) return;
    lastRef.current = now;
    const a = audioRef.current;
    if (!a) return;
    try { a.currentTime = 0; } catch { /* may throw if not yet loaded */ }
    a.play().catch(() => { /* gesture not granted yet */ });
  }, [throttleMs]);
}

// Re-export MotionValue type alias for consumers that don't want to
// pull it from framer-motion directly.
export type { MotionValue };
