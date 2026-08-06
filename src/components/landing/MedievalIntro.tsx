import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { usePerfTier } from '../../lib/usePerfTier';
import IntroChant from './IntroChant';

/**
 * MedievalIntro: cinematic scroll prologue for the FMM site.
 * Scroll-scrubbed 1080p clip of the veilleur and the crystal ball, with a
 * forged-metal title sequence over it: (1) Festival Médiéval de Montpellier,
 * (2) the dates, (3) a fire burst that fades into the main page (the theme
 * title lives on the home page). Skipped for prefers-reduced-motion users.
 */

const SILVER = '#D7DEE8';
const POSTER = '/hero/crystal-poster.jpg';
// Scroll-scrubbed frame sequence drawn to a canvas, replacing video-seek
// scrubbing (which jank-stutters on modest machines). Frames cover the scrub
// range of the clip; drawImage is near-free compared to a video seek.
const SCRUB_FRAMES = Array.from({ length: 96 }, (_, i) => `/hero/scrub/f${String(i + 1).padStart(3, '0')}.jpg`);

const LOGO        = '/fmm-crest-chrome.webp?v=3';
// Live display type (Cinzel/Marcellus) so the words can stagger in cinematically
const TITLE_FONT = '"Marcellus", "Cinzel", "Cinzel Decorative", Georgia, serif';
const FIRE = '/hero/fireburst.mp4';
// Position 2 of the sequence: the "Caravanes et Saltimbanques" intro video
// (accordionist) the burst hands off to, played with sound. NOT the general
// festival film (that plays at position 5, inside the orb after the countdown).
const INTRO_CARAVANES = '/orb/intro-caravanes.mp4';
// Purpose-built VEO near-still of the opening frame: the scene is frozen
// except the torch flames, the orb's glow, and a faint breath on the knight.
// Looped seamlessly; we crossfade to the scrubbed clip the moment scrolling
// begins (its framing matches the scrub's first frame).
const CRYSTAL_IDLE = '/hero/crystal-idle.mp4';

const fontAlt = '"Cormorant SC", "Cormorant Garamond", Georgia, serif';

// cinematic entrance: each title line rises out of focus and settles; the crest
// materialises just before them
const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const lineRise = {
  hidden: { y: 34, opacity: 0, filter: 'blur(9px)' },
  show: (i: number) => ({ y: 0, opacity: 1, filter: 'blur(0px)', transition: { delay: 0.5 + i * 0.18, duration: 1.1, ease: EASE } }),
};
const crestRise = {
  hidden: { scale: 1.25, opacity: 0, filter: 'blur(8px)' },
  show: { scale: 1, opacity: 0.95, filter: 'blur(0px)', transition: { delay: 0.25, duration: 1.15, ease: EASE } },
};

// scoped styles for the rendered metal title plates + the date rules
const FORGE_CSS = `
.fmm-rule-silver{height:1px;background:linear-gradient(to right,transparent,#C7D2DE,transparent)}
/* Map the intro to the *visible* viewport so nothing hides behind the mobile
   browser toolbar (100vh counts the area behind it; svh is the safe height). */
.mi-overlay{height:100vh;height:100svh}
.mi-stage{height:100vh;height:100svh}
/* Short viewports (phones in landscape): shrink the crest + wordmark so the
   whole title, "de Montpellier" included, sits inside the screen. The scroll
   cue moves under the wordmark on the left (mi-cue-left); the centered bottom
   cue (mi-cue) is hidden there. */
.mi-cue-left{display:none}
@media (max-height:480px){
  .mi-title{max-width:66vw!important}
  .mi-crest{width:42px!important;margin-bottom:0.35rem!important}
  .mi-line{font-size:1.55rem!important}
  .mi-line-sub{font-size:0.72rem!important;margin-top:0.3rem!important}
  .mi-cue{display:none!important}
  .mi-cue-left{display:flex!important}
}
`;

// Scroll cue, Lord-of-the-Rings style: an engraved silver ring with a fire
// spark circling it (the One Ring heating up), a chevron bobbing at its heart.
// Original photoreal gold ring (Nano Banana, plain band, no inscription),
// face-on. A warm conic light sweeps around the band as the animated overlay,
// with a chevron bobbing in the centre to cue the scroll.
// Scroll cue: a slim label + a soft column of light with a chevron drifting
// down it, gently pulsing. Quietly invites the scroll without a heavy object.
function ScrollCue() {
  // Deliberately loud: visitors weren't realising the prologue advances on
  // scroll, so this pairs an explicit "Défiler" label with a cascading triple
  // chevron centered under it. Stays legible with motion disabled (the label +
  // chevrons carry it even if the animation is stilled). The block is shrink-to-
  // fit, so placing it in a left-aligned column keeps it left, chevron centered.
  return (
    <div className="flex flex-col items-center gap-2.5">
      <span
        style={{
          fontFamily: fontAlt,
          color: '#EAF0F7',
          fontSize: 'clamp(0.78rem, 1vw, 0.94rem)',
          letterSpacing: '0.5em',
          textIndent: '0.5em',
          textTransform: 'uppercase',
          textShadow: '0 2px 12px rgba(0,0,0,0.95)',
          whiteSpace: 'nowrap',
        }}
      >
        Défiler
      </span>
      <div className="relative" style={{ height: 40, width: 40 }}>
        {[0, 1, 2].map((i) => (
          <motion.svg
            key={i}
            width="40" height="22" viewBox="0 0 24 24" fill="none" stroke="#EAF0F7" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-0"
            style={{ top: i * 9, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9)) drop-shadow(0 0 9px rgba(215,222,232,0.35))' }}
            animate={{ opacity: [0.18, 1, 0.18], y: [-2, 3, -2] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut', delay: i * 0.18 }}
          >
            <path d="M6 9l6 6 6-6" />
          </motion.svg>
        ))}
      </div>
    </div>
  );
}

// Canvas frame-scrubber: draws the nearest preloaded frame for the current
// scroll progress (cover, object-position 50% 32%), lerping the frame index so
// it glides. drawImage is near-free vs a video seek. Its rAF runs only while
// active (scrolling); idle leaves the breathing video in charge.
function FrameScrubber({ progress, active }: { progress: MotionValue<number>; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const imgs = useRef<HTMLImageElement[]>([]);
  const cur = useRef(0);
  useEffect(() => {
    imgs.current = SCRUB_FRAMES.map((s) => { const im = new Image(); im.decoding = 'async'; im.src = s; return im; });
  }, []);
  useEffect(() => {
    if (!active) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const n = imgs.current.length;
    cur.current = progress.get() * (n - 1);
    let raf = 0;
    const draw = () => {
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const target = progress.get() * (n - 1);
      cur.current += (target - cur.current) * 0.55;
      const idx = Math.max(0, Math.min(n - 1, Math.round(cur.current)));
      const img = imgs.current[idx];
      if (img && img.complete && img.naturalWidth) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const ir = img.naturalWidth / img.naturalHeight, cr = w / h;
        let dw: number, dh: number;
        if (ir > cr) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
        ctx.drawImage(img, (w - dw) / 2, (h - dh) * 0.32, dw, dh);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, progress]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

export default function MedievalIntro({ onEnter }: { onEnter: () => void }) {
  const { lite } = usePerfTier();
  // Budget machines keep the scrubbed orb (now a lean, dense-keyframe clip)
  // but shed the screen-blended fire-burst video.
  const trackRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLVideoElement>(null);
  const fireRef = useRef<HTMLVideoElement>(null);
  const festivalRef = useRef<HTMLVideoElement>(null);
  // Witcher-menu-style ambience: a warm ethereal drone over a soft fire bed.
  const ambientRef = useRef<HTMLAudioElement>(null);
  const ambientRamp = useRef(0);
  const ambientStarted = useRef(false);
  const progress = useMotionValue(0);
  const fired = useRef(false);
  const [leaving, setLeaving] = useState(false);
  // 'scroll' = the cinematic prologue; 'video' = the festival film it hands to.
  const [phase, setPhase] = useState<'scroll' | 'video'>('scroll');
  // Start buffering the festival film once the burst is near, so the handoff
  // is seamless rather than a black gap.
  const [bufferFilm, setBufferFilm] = useState(false);
  // Set when the browser blocks autoplay-with-sound (no qualifying gesture);
  // we then play muted and surface a one-tap unmute.
  const [needsUnmute, setNeedsUnmute] = useState(false);
  // False at the very top (idle breathing loop), true once scrolling scrubs the
  // clip. Flips both ways, so scrolling back up returns to the idle loop.
  const [scrollStarted, setScrollStarted] = useState(false);

  useEffect(() => {
    // Idle plays the breathing loop; scrolling pauses it and the canvas
    // frame-scrubber (driven by `progress`) takes over the scene.
    if (scrollStarted) { idleRef.current?.pause(); fireRef.current?.pause(); }
    else { idleRef.current?.play().catch(() => { /* muted autoplay retry */ }); fireRef.current?.play().catch(() => {}); }
  }, [scrollStarted]);

  // Ease the ambience volume toward a target; pause once fully silent.
  const fadeAmbient = (to: number, ms: number) => {
    const a = ambientRef.current;
    if (!a) return;
    cancelAnimationFrame(ambientRamp.current);
    const from = a.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      a.volume = from + (to - from) * k;
      if (k < 1) ambientRamp.current = requestAnimationFrame(step);
      else if (to === 0) a.pause();
    };
    ambientRamp.current = requestAnimationFrame(step);
  };

  // Start the ambience (once) and fade it in. Safe to call from anywhere; a
  // safety net forces the level up if the ramp ever fails to apply, so a click
  // anywhere reliably brings the sound.
  const AMBIENT_VOL = 0.2;
  const kickAmbient = () => {
    const a = ambientRef.current;
    if (!a || ambientStarted.current) return;
    Promise.resolve(a.play()).then(() => {
      ambientStarted.current = true;
      fadeAmbient(AMBIENT_VOL, 2200);
      window.setTimeout(() => {
        const el = ambientRef.current;
        if (el && !el.paused && el.volume < 0.05) el.volume = AMBIENT_VOL;
      }, 2500);
    }).catch(() => { /* blocked; the next real gesture retries */ });
  };

  // The intro mounts with no entry gesture, so sound-on autoplay is usually
  // blocked. Start on the first real interaction (any click/key/touch), and
  // try once on mount in case activation already happened.
  useEffect(() => {
    const a = ambientRef.current;
    if (a) a.volume = 0;
    kickAmbient();
    const onGesture = () => kickAmbient();
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    window.addEventListener('touchstart', onGesture, { passive: true });
    window.addEventListener('click', onGesture);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
      window.removeEventListener('click', onGesture);
      cancelAnimationFrame(ambientRamp.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hand the soundstage to the festival film (or the site): fade the ambience
  // out so it never plays under the film's own audio.
  useEffect(() => {
    if (phase === 'video' || leaving) fadeAmbient(0, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, leaving]);

  useEffect(() => {
    const unsub = progress.on('change', (p) => {
      // Pre-buffer the intro film as the burst approaches.
      if (p >= 0.7) setBufferFilm(true);
      // At the climax, hand off to the intro film rather than the site.
      if (p >= 0.992 && !fired.current) { fired.current = true; setPhase('video'); }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once the film takes over, start it with sound. Mouse-wheel scrolling isn't
  // always a qualifying gesture for audio autoplay, so fall back to muted + a
  // one-tap unmute if the browser refuses.
  useEffect(() => {
    if (phase !== 'video') return;
    const v = festivalRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.muted = false;
    v.volume = 1;
    v.play().catch(() => {
      v.muted = true;
      setNeedsUnmute(true);
      v.play().catch(() => { /* give up silently */ });
    });
  }, [phase]);

  // If the browser blocked sound-on autoplay (scrolling isn't a qualifying
  // gesture), unmute the film the instant the visitor does anything real.
  useEffect(() => {
    if (phase !== 'video') return;
    const unlock = () => {
      const v = festivalRef.current;
      if (v && v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => { /* ignore */ }); }
      setNeedsUnmute(false);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [phase]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    const p = max > 0 ? el.scrollTop / max : 0;
    progress.set(p);
    // Hand off to the scrub on the way down; fall back to the idle breathing
    // once we're scrolled all the way back to the top. Hysteresis avoids a
    // flicker if the reader hovers right at the seam.
    if (p > 0.015) setScrollStarted(true);
    else if (p < 0.004) setScrollStarted(false);
  };

  // Skip / film-ended → fade into the main site.
  function enterSite() {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onEnter, 1500);
  }

  function unmuteFilm() {
    const v = festivalRef.current;
    if (!v) return;
    v.muted = false;
    setNeedsUnmute(false);
    v.play().catch(() => { /* ignore */ });
  }

  // Clicking the ring plays the whole prologue itself: a smooth eased scroll to
  // the end at a cinematic pace (which also drives the scrub + the burst hand-
  // off). The click is a real gesture, so the film's sound is then allowed.
  const autoRef = useRef(0);
  function playSequence() {
    kickAmbient();
    const el = trackRef.current;
    if (!el) return;
    cancelAnimationFrame(autoRef.current);
    const start = el.scrollTop;
    const dist = el.scrollHeight - el.clientHeight - start;
    if (dist <= 2) return;
    const dur = 8500;
    const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    let t0 = 0;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min(1, (ts - t0) / dur);
      el.scrollTop = start + dist * ease(p);
      if (p < 1) autoRef.current = requestAnimationFrame(step);
    };
    autoRef.current = requestAnimationFrame(step);
  }

  // beat 1: the name (present from the first frame, then disappears as you scroll)
  const b1 = useTransform(progress, [0, 0.22, 0.30], [1, 1, 0]);
  const b1y = useTransform(progress, [0, 0.30], ['0px', '-26px']);
  // left scrim that gives the editorial column its legibility; fades out by the
  // time the burst nears
  const leftScrim = useTransform(progress, [0, 0.5, 0.64], [1, 1, 0]);
  // beat 2: the dates
  const b2 = useTransform(progress, [0.36, 0.43, 0.5, 0.57], [0, 1, 1, 0]);
  const b2y = useTransform(progress, [0.36, 0.57], ['22px', '-22px']);
  // scene atmosphere
  const moody = useTransform(progress, [0, 0.12, 0.34], [1, 0.94, 0.18]);
  const textScrim = useTransform(progress, [0.3, 0.42, 0.5, 0.58], [0, 0.5, 0.5, 0]);
  const cue = useTransform(progress, [0, 0.08], [1, 0]);
  // the screen-blended ambient fire fades out as you scroll, so its expensive
  // full-screen composite isn't paid during the scrub
  const fireOp = useTransform(progress, [0, 0.05], [0.78, 0]);
  // beat 3: the fire burst, now the standalone finale (theme title dropped)
  const burst = useTransform(progress, [0.82, 0.95, 1], [0, 1, 1]);
  // Ken Burns push-in into the explosion: as the orb bursts, the scene scales
  // up past the 6% offset so its left edge clears the viewport. The expanding
  // frame swallows the seam exactly when the white flash would expose it.
  const sceneScale = useTransform(progress, [0.60, 0.74], [1, 1.16]);
  // the left seam mask doubles as the editorial-side vignette while the scene
  // is dark; it fades out just before the burst whites out so it never reads
  // as a black bar on the flash (the push-in has covered the seam by then).
  const seamOp = useTransform(progress, [0, 0.66, 0.72], [1, 1, 0]);

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          key="medieval-intro"
          className="mi-overlay fixed inset-x-0 top-0 z-[70]"
          style={{ background: '#04060b' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <style>{FORGE_CSS}</style>
          {/* ambient soundbed: crackling fire + ethereal drone, looping under
              the prologue (Witcher-menu feel); starts on first interaction */}
          <audio ref={ambientRef} src="/orb/sfx/ambient-forge.mp3" loop preload="auto" />


          {phase === 'scroll' && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[3px]" style={{ background: 'rgba(232,221,193,0.08)' }}>
            <motion.div className="h-full origin-left" style={{ scaleX: progress, background: 'linear-gradient(to right, #8C97A6, #D7DEE8)' }} />
          </div>
          )}

          {phase === 'scroll' && (
          <div ref={trackRef} onScroll={onScroll} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
            <div style={{ height: '480vh', position: 'relative' }}>
              <div className="mi-stage" style={{ position: 'sticky', top: 0, overflow: 'hidden' }}>
                {/* idle torch loop: seamless native loop, no scroll needed */}
                <motion.video
                  ref={idleRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: '50% 32%', transform: 'translateX(6%)' }}
                  src={CRYSTAL_IDLE}
                  poster={POSTER}
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                  initial={false}
                  animate={{ opacity: scrollStarted ? 0 : 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
                {/* scrubbed scene: a canvas frame-sequence (no video seek),
                    revealed and driven by scroll once scrolling starts */}
                <motion.div
                  className="absolute inset-0"
                  style={{ x: '6%', scale: sceneScale }}
                  initial={false}
                  animate={{ opacity: scrollStarted ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <FrameScrubber progress={progress} active={scrollStarted} />
                </motion.div>

                {/* seam seal: the 6% horizontal shift exposes the frame's left
                    edge; a permanent dark gradient pinned to that edge buries it
                    (and reads as the left vignette), so the shift stays seamless
                    at every scroll position, scrim faded or not */}
                <motion.div className="pointer-events-none absolute inset-y-0 left-0 w-[14%]" style={{ opacity: seamOp, background: 'linear-gradient(to right, #04060b 0%, #04060b 43%, rgba(4,6,11,0) 100%)' }} />

                {/* moody vignette over the early frames, also masks the plate seam */}
                {/* moody vignette, dialled back ~30% so the torches at the
                    edges read better */}
                <motion.div className="pointer-events-none absolute inset-0" style={{ opacity: moody, background: 'radial-gradient(116% 96% at 50% 47%, transparent 30%, rgba(3,5,9,0.42) 66%, rgba(1,2,5,0.68) 100%), linear-gradient(to right, rgba(1,2,5,0.66) 0%, transparent 24%, transparent 76%, rgba(1,2,5,0.66) 100%), linear-gradient(to bottom, rgba(1,2,5,0.56) 0%, transparent 22%, transparent 74%, rgba(1,2,5,0.6) 100%)' }} />
                <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(125% 105% at 50% 50%, transparent 56%, rgba(3,6,12,0.4) 86%, rgba(3,6,12,0.72) 100%)' }} />

                {/* atmospheric fire: home page's flame layer (/orb/fire.mp4),
                    held back in the centre so it doesn't crowd the knight: a
                    horizontal mask keeps the flames at the sides (the torches)
                    and fades them across the middle. */}
                {!lite && (
                  <motion.video
                    ref={fireRef}
                    aria-hidden
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    src="/orb/fire.mp4"
                    className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-[58%] object-cover"
                    style={{
                      opacity: fireOp,
                      mixBlendMode: 'screen',
                      WebkitMaskImage: 'linear-gradient(to top, black 70%, transparent 100%), linear-gradient(to right, black 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.18) 60%, black 100%)',
                      maskImage: 'linear-gradient(to top, black 70%, transparent 100%), linear-gradient(to right, black 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.18) 60%, black 100%)',
                      WebkitMaskComposite: 'source-in',
                      maskComposite: 'intersect',
                    }}
                  />
                )}

                {/* localized dark scrim so the metal reads while the stone brightens */}
                <motion.div className="pointer-events-none absolute inset-0" style={{ opacity: textScrim, background: 'radial-gradient(60% 42% at 50% 48%, rgba(3,5,10,0.85) 0%, rgba(3,5,10,0) 72%)' }} />

                {/* fire burst: only mounted (and decoded) as the burst nears,
                    not played invisibly from idle */}
                {!lite && bufferFilm && (
                  <motion.video
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    style={{ opacity: burst, mixBlendMode: 'screen' }}
                    src={FIRE}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                  />
                )}

                {/* left scrim: carves the editorial column's legibility well
                    without touching the scene's framing */}
                <motion.div className="pointer-events-none absolute inset-0" style={{ opacity: leftScrim, background: 'linear-gradient(to right, rgba(3,4,9,0.9) 0%, rgba(3,4,9,0.55) 30%, transparent 56%)' }} />

                {/* beat 1: editorial left column, live Cinzel wordmark with a
                    crest above; words rise into focus on load, recede on scroll */}
                <div className="mi-title pointer-events-none absolute left-[6vw] top-1/2 -translate-y-1/2 max-w-[48vw]">
                  <motion.div className="flex flex-col items-start text-left" style={{ opacity: b1, y: b1y }}>
                    <motion.img
                      src={LOGO} alt="" aria-hidden draggable={false} variants={crestRise} initial="hidden" animate="show"
                      className="mi-crest mb-4 w-[82px] sm:w-[98px] h-auto select-none"
                      style={{ filter: 'drop-shadow(0 3px 14px rgba(0,0,0,0.6))' }}
                    />
                    {['Festival', 'Médiéval', 'de Montpellier'].map((t, i) => (
                      <motion.div key={t} custom={i} variants={lineRise} initial="hidden" animate="show"
                        className={i < 2 ? 'mi-line' : 'mi-line-sub'}
                        style={{
                          fontFamily: TITLE_FONT, color: '#EAEFF6',
                          fontSize: i < 2 ? 'clamp(2.4rem, 5.6vw, 4.6rem)' : 'clamp(1.1rem, 2.6vw, 1.9rem)',
                          lineHeight: 1.05, fontWeight: i < 2 ? 600 : 400,
                          letterSpacing: i < 2 ? '0.03em' : '0.32em',
                          textShadow: '0 2px 14px rgba(0,0,0,0.85), 0 0 30px rgba(150,170,200,0.22)',
                          marginTop: i === 2 ? '0.45rem' : 0,
                        }}>
                        {t}
                      </motion.div>
                    ))}
                    {/* Mobile only: the scroll cue lives under the wordmark,
                        left-aligned. On a short landscape viewport the centered
                        bottom cue sat over the knight and got cut off. */}
                    <button
                      type="button"
                      onClick={playSequence}
                      aria-label="Lancer la séquence d'introduction"
                      className="mi-cue-left mt-5 rounded outline-none focus-visible:ring-2 focus-visible:ring-[#D7DEE8]"
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    >
                      <ScrollCue />
                    </button>
                  </motion.div>
                </div>

                {/* scroll cue: quiet invitation; click it to auto-play the
                    prologue at a cinematic pace */}
                <motion.div className="mi-cue pointer-events-none absolute inset-x-0 bottom-[5vh] flex justify-center" style={{ opacity: cue }}>
                  <button
                    type="button"
                    onClick={playSequence}
                    aria-label="Lancer la séquence d'introduction"
                    className="rounded outline-none transition-opacity duration-300 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#D7DEE8]"
                    style={{ pointerEvents: scrollStarted ? 'none' : 'auto', cursor: 'pointer' }}
                  >
                    <ScrollCue />
                  </button>
                </motion.div>

                {/* beat 2: the dates, same left column as the name */}
                <div className="pointer-events-none absolute left-[6vw] top-1/2 -translate-y-1/2 max-w-[48vw]">
                  <motion.div className="flex flex-col items-start text-left" style={{ opacity: b2, y: b2y }}>
                    <div className="fmm-rule-silver mb-5 w-28 sm:w-40" />
                    <div style={{ fontFamily: TITLE_FONT, color: '#EAEFF6', fontSize: 'clamp(2rem, 4.6vw, 3.6rem)', fontWeight: 600, letterSpacing: '0.06em', lineHeight: 1.1, textShadow: '0 2px 14px rgba(0,0,0,0.85)' }}>25 · 26 · 27</div>
                    <div style={{ fontFamily: TITLE_FONT, color: '#EAEFF6', fontSize: 'clamp(1.2rem, 3vw, 2.1rem)', letterSpacing: '0.2em', marginTop: '0.25rem', textShadow: '0 2px 14px rgba(0,0,0,0.85)' }}>Septembre 2026</div>
                    <div className="fmm-rule-silver mt-5 w-28 sm:w-40" />
                  </motion.div>
                </div>

                {/* the knight himself is the play control: clicking him auto-
                    plays the whole sequence (prologue scrub → festival film)
                    with no scrolling. The click is a real gesture, so the
                    film's sound is allowed. No visible affordance: the scene
                    invites the click, the "Défiler" cue carries the hint. */}
                <button
                  type="button"
                  onClick={playSequence}
                  aria-label="Lancer le film du festival"
                  className="absolute left-1/2 top-1/2 z-[55] rounded-3xl outline-none focus-visible:ring-1 focus-visible:ring-[#D7DEE8]"
                  style={{ width: '34vw', height: '78vh', transform: 'translate(calc(-50% + 6vw), -50%)', cursor: 'pointer' }}
                />

                {/* beat 3: the fire burst alone carries the finale; the
                    theme title lives on the home page, so it's dropped here. */}

              </div>
            </div>
          </div>
          )}

          {/* Festival film: buffered as the burst nears, then takes over with
              sound. On end (or skip) we fade into the main site. */}
          {(bufferFilm || phase === 'video') && (
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'video' ? 1 : 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ pointerEvents: phase === 'video' ? 'auto' : 'none' }}
            >
              <video
                ref={festivalRef}
                className="absolute inset-0 h-full w-full object-contain"
                src={INTRO_CARAVANES}
                playsInline
                preload="auto"
                onEnded={enterSite}
              />
              {phase === 'video' && needsUnmute && (
                <button
                  onClick={unmuteFilm}
                  className="absolute bottom-4 left-4 z-[80] inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] backdrop-blur-sm outline-none transition-colors hover:border-white/60 focus-visible:ring-2 focus-visible:ring-[#D7DEE8]"
                  style={{ border: `1px solid ${SILVER}88`, color: '#E6ECF3', background: 'rgba(8,10,16,0.45)', fontFamily: fontAlt }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SILVER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a9 9 0 0 1 0 14" /></svg>
                  Activer le son
                </button>
              )}
            </motion.div>
          )}

          {/* Le chant, en bas à gauche : le pendant du « Passer l'intro ».
              Masqué pendant le film, qui porte déjà son propre son. */}
          <IntroChant visible={phase !== 'video'} silver={SILVER} fontAlt={fontAlt} />

          {/* Skip intro: bottom-right, present through both the prologue and
              the film; always lands on the main site. */}
          <button
            onClick={enterSite}
            aria-label="Passer l'introduction et aller au site"
            className="absolute right-4 bottom-4 z-[90] inline-flex min-h-[44px] items-center rounded px-3 py-2 text-xs tracking-[0.25em] uppercase outline-none transition-colors hover:text-[#D7DEE8] focus-visible:ring-2 focus-visible:ring-[#D7DEE8]"
            style={{ color: 'rgba(232,236,243,0.62)', fontFamily: fontAlt, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
          >
            Passer l'intro →
          </button>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
