import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { usePerfTier } from '../../lib/usePerfTier';
import IntroChant from './IntroChant';

/**
 * MedievalIntroMobile: portrait sibling of MedievalIntro.
 *
 * The source scene (veilleur + crystal ball) is horizontal, so we never crop it
 * to fill a vertical frame (that always looks squished). Instead we COMPOSE the
 * portrait screen in three stacked zones:
 *   • top    : warm-black card: crest + "Festival Médiéval de Montpellier" +
 *              the dates. Present from the first frame, rises and dissolves on
 *              scroll to reveal the scene.
 *   • middle : a full-width 16:9 cinematic BAND holding the scrubbed knight/orb
 *              clip at its true ratio (no crop). Fades in as the title leaves.
 *   • bottom : warm-black + mist: the "Défiler" scroll cue.
 * The orb rises, the fire bursts, and the sequence hands off to the (horizontal,
 * letterboxed) festival film exactly like the desktop intro. Shares all assets.
 */

const SILVER = '#D7DEE8';
const POSTER = '/hero/crystal-poster.jpg';
const SCRUB_FRAMES = Array.from({ length: 96 }, (_, i) => `/hero/scrub/f${String(i + 1).padStart(3, '0')}.jpg`);

const LOGO = '/fmm-crest-chrome.webp?v=3';
const TITLE_FONT = '"Marcellus", "Cinzel", "Cinzel Decorative", Georgia, serif';
const FIRE = '/hero/fireburst.mp4';
// 720p variant: indistinguishable on phone-sized viewports, half the bytes.
const INTRO_CARAVANES = '/orb/intro-caravanes-720.mp4';
const CRYSTAL_IDLE = '/hero/crystal-idle.mp4';
const fontAlt = '"Cormorant SC", "Cormorant Garamond", Georgia, serif';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const lineRise = {
  hidden: { y: 30, opacity: 0, filter: 'blur(9px)' },
  show: (i: number) => ({ y: 0, opacity: 1, filter: 'blur(0px)', transition: { delay: 0.45 + i * 0.16, duration: 1.05, ease: EASE } }),
};
const crestRise = {
  hidden: { scale: 1.25, opacity: 0, filter: 'blur(8px)' },
  show: { scale: 1, opacity: 0.95, filter: 'blur(0px)', transition: { delay: 0.2, duration: 1.1, ease: EASE } },
};

const MI_CSS = `
.mim-rule{height:1px;background:linear-gradient(to right,transparent,#C7D2DE,transparent)}
.mim-overlay{height:100vh;height:100svh}
.mim-stage{height:100vh;height:100svh}
`;

// Scroll cue: explicit "Défiler" label + a cascading triple chevron.
function ScrollCue() {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <span
        style={{
          fontFamily: fontAlt, color: '#EAF0F7',
          fontSize: 'clamp(0.74rem, 3.4vw, 0.9rem)', letterSpacing: '0.5em',
          textIndent: '0.5em', textTransform: 'uppercase',
          textShadow: '0 2px 12px rgba(0,0,0,0.95)', whiteSpace: 'nowrap',
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

// Canvas frame-scrubber. The canvas fills a 16:9 band, and the source frames
// are 16:9, so "cover" is an exact fit here: no crop, no squish.
function BandScrubber({ progress, active, superSample = 1 }: { progress: MotionValue<number>; active: boolean; superSample?: number }) {
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
    // The band is CSS-scaled up to `superSample`× to fill the screen (Ken
    // Burns). Rendering the canvas at only clientWidth×dpr would then be
    // upscaled by CSS and look pixelated. So we render the backing store at
    // clientWidth × dpr × superSample: the raster stays sharp at full zoom.
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * Math.min(Math.max(superSample, 1), 3);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
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
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, progress, superSample]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

export default function MedievalIntroMobile({ onEnter }: { onEnter: () => void }) {
  const { lite } = usePerfTier();
  const trackRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLVideoElement>(null);
  const fireRef = useRef<HTMLVideoElement>(null);
  const festivalRef = useRef<HTMLVideoElement>(null);
  const ambientRef = useRef<HTMLAudioElement>(null);
  const ambientRamp = useRef(0);
  const ambientStarted = useRef(false);
  const progress = useMotionValue(0);
  const fired = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [phase, setPhase] = useState<'scroll' | 'video'>('scroll');
  const [bufferFilm, setBufferFilm] = useState(false);
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [scrollStarted, setScrollStarted] = useState(false);
  // Scale needed for the 16:9 band to grow past the letterbox and cover the
  // whole portrait screen (Ken Burns push-in once the title is gone). Derived
  // from the real viewport so it fills any phone; a hair of overscan (1.04).
  const [fillScale, setFillScale] = useState(4);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const bandH = (w * 9) / 16;
      setFillScale(Math.max(1, (h / bandH) * 1.04));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useEffect(() => {
    if (scrollStarted) { idleRef.current?.pause(); fireRef.current?.pause(); }
    else { idleRef.current?.play().catch(() => {}); fireRef.current?.play().catch(() => {}); }
  }, [scrollStarted]);

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
    }).catch(() => {});
  };

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

  useEffect(() => {
    if (phase === 'video' || leaving) fadeAmbient(0, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, leaving]);

  useEffect(() => {
    const unsub = progress.on('change', (p) => {
      if (p >= 0.7) setBufferFilm(true);
      if (p >= 0.992 && !fired.current) { fired.current = true; setPhase('video'); }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      v.play().catch(() => {});
    });
  }, [phase]);

  useEffect(() => {
    if (phase !== 'video') return;
    const unlock = () => {
      const v = festivalRef.current;
      if (v && v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => {}); }
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
    if (p > 0.015) setScrollStarted(true);
    else if (p < 0.004) setScrollStarted(false);
  };

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
    v.play().catch(() => {});
  }

  // Tap anywhere / the cue plays the whole prologue at a cinematic pace.
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

  // Opening card (crest + wordmark + dates): full at the top, then dissolves
  // FAST on scroll (title clears before the video reaches full).
  const cardOp = useTransform(progress, [0, 0.05, 0.13], [1, 1, 0]);
  const cardY = useTransform(progress, [0, 0.16], ['0px', '-30px']);
  // The scene video is ALREADY rolling behind the title at 25% (a "semi-fade"),
  // then fades up to full as the title leaves.
  const bandOp = useTransform(progress, [0, 0.18], [0.25, 1]);
  // Once the title has cleared, the band pushes in (Ken Burns) from the
  // letterboxed strip to full-screen cover, zooming into the knight + orb.
  const bandScale = useTransform(progress, [0.16, 0.55], [1, fillScale]);
  // Scroll cue fades the instant scrolling begins.
  const cueOp = useTransform(progress, [0, 0.06], [1, 0]);
  // Fire burst: the finale over the band.
  const burst = useTransform(progress, [0.82, 0.95, 1], [0, 1, 1]);
  // Ambient torch fire under the band, fades out during the scrub.
  const fireOp = useTransform(progress, [0, 0.05], [0.7, 0]);

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          key="medieval-intro-mobile"
          className="mim-overlay fixed inset-x-0 top-0 z-[70]"
          style={{ background: '#0a0808' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <style>{MI_CSS}</style>
          <audio ref={ambientRef} src="/orb/sfx/ambient-forge.mp3" loop preload="auto" />

          {phase === 'scroll' && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[3px]" style={{ background: 'rgba(232,221,193,0.08)' }}>
              <motion.div className="h-full origin-left" style={{ scaleX: progress, background: 'linear-gradient(to right, #8C97A6, #D7DEE8)' }} />
            </div>
          )}

          {phase === 'scroll' && (
            <div ref={trackRef} onScroll={onScroll} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
              <div style={{ height: '480vh', position: 'relative' }}>
                <div className="mim-stage" style={{ position: 'sticky', top: 0, overflow: 'hidden' }}>
                  {/* warm-black backdrop with a soft mist + grain, top and bottom */}
                  <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 50% 42%, rgba(28,20,14,0.55) 0%, rgba(10,8,8,0) 60%), #0a0808' }} />

                  {/* ── MIDDLE: cinematic 16:9 band, centred; pushes in to
                      full-screen cover once the title clears ── */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ opacity: bandOp }}
                  >
                    <motion.div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9', scale: bandScale }}>
                      {/* idle breathing loop */}
                      <motion.video
                        ref={idleRef}
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ objectPosition: '50% 40%' }}
                        src={CRYSTAL_IDLE}
                        poster={POSTER}
                        muted autoPlay loop playsInline preload="auto"
                        initial={false}
                        animate={{ opacity: scrollStarted ? 0 : 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                      {/* scrubbed scene */}
                      <motion.div
                        className="absolute inset-0"
                        initial={false}
                        animate={{ opacity: scrollStarted ? 1 : 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      >
                        <BandScrubber progress={progress} active={scrollStarted} superSample={fillScale} />
                      </motion.div>

                      {/* ambient torch fire, held to the sides */}
                      {!lite && (
                        <motion.video
                          ref={fireRef}
                          aria-hidden autoPlay muted loop playsInline preload="auto"
                          src="/orb/fire.mp4"
                          className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-[62%] object-cover"
                          style={{
                            opacity: fireOp, mixBlendMode: 'screen',
                            WebkitMaskImage: 'linear-gradient(to top, black 70%, transparent 100%), linear-gradient(to right, black 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.18) 60%, black 100%)',
                            maskImage: 'linear-gradient(to top, black 70%, transparent 100%), linear-gradient(to right, black 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.18) 60%, black 100%)',
                            WebkitMaskComposite: 'source-in', maskComposite: 'intersect',
                          }}
                        />
                      )}

                      {/* fade the band edges into the warm black so it reads as a
                          floating cinematic strip, never a hard rectangle */}
                      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 60px 24px #0a0808' }} />

                      {/* fire burst finale */}
                      {!lite && bufferFilm && (
                        <motion.video
                          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                          style={{ opacity: burst, mixBlendMode: 'screen' }}
                          src={FIRE}
                          autoPlay muted loop playsInline preload="auto"
                        />
                      )}
                    </motion.div>
                  </motion.div>

                  {/* ── TOP: opening card (crest + wordmark + dates) ── */}
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 top-[12vh] flex flex-col items-center px-8 text-center"
                    style={{ opacity: cardOp, y: cardY }}
                  >
                    <motion.img
                      src={LOGO} alt="" aria-hidden draggable={false}
                      variants={crestRise} initial="hidden" animate="show"
                      className="mb-4 w-[74px] h-auto select-none"
                      style={{ filter: 'drop-shadow(0 3px 14px rgba(0,0,0,0.6))' }}
                    />
                    {['Festival', 'Médiéval', 'de Montpellier'].map((t, i) => (
                      <motion.div
                        key={t} custom={i} variants={lineRise} initial="hidden" animate="show"
                        style={{
                          fontFamily: TITLE_FONT, color: '#EAEFF6',
                          fontSize: i < 2 ? 'clamp(2rem, 11vw, 3.4rem)' : 'clamp(1rem, 5vw, 1.6rem)',
                          lineHeight: 1.06, fontWeight: i < 2 ? 600 : 400,
                          letterSpacing: i < 2 ? '0.03em' : '0.28em',
                          textShadow: '0 2px 14px rgba(0,0,0,0.85), 0 0 30px rgba(150,170,200,0.22)',
                          marginTop: i === 2 ? '0.5rem' : 0,
                        }}
                      >
                        {t}
                      </motion.div>
                    ))}
                    <motion.div
                      className="mt-6 flex flex-col items-center"
                      variants={lineRise} custom={3} initial="hidden" animate="show"
                    >
                      <div className="mim-rule mb-3 w-28" />
                      <div style={{ fontFamily: TITLE_FONT, color: '#EAEFF6', fontSize: 'clamp(1.5rem, 7vw, 2.2rem)', fontWeight: 600, letterSpacing: '0.08em', textShadow: '0 2px 14px rgba(0,0,0,0.85)' }}>25 · 26 · 27</div>
                      <div style={{ fontFamily: TITLE_FONT, color: '#EAEFF6', fontSize: 'clamp(0.95rem, 4.4vw, 1.3rem)', letterSpacing: '0.2em', marginTop: '0.25rem', textShadow: '0 2px 14px rgba(0,0,0,0.85)' }}>Septembre 2026</div>
                      <div className="mim-rule mt-3 w-28" />
                    </motion.div>
                  </motion.div>

                  {/* ── BOTTOM: scroll cue ── */}
                  <motion.div className="absolute inset-x-0 bottom-[6vh] flex justify-center" style={{ opacity: cueOp }}>
                    <button
                      type="button"
                      onClick={playSequence}
                      aria-label="Lancer la séquence d'introduction"
                      className="rounded outline-none focus-visible:ring-2 focus-visible:ring-[#D7DEE8]"
                      style={{ pointerEvents: scrollStarted ? 'none' : 'auto', cursor: 'pointer' }}
                    >
                      <ScrollCue />
                    </button>
                  </motion.div>

                  {/* full-stage tap target: plays the whole sequence */}
                  <button
                    type="button"
                    onClick={playSequence}
                    aria-label="Lancer le film du festival"
                    className="absolute left-1/2 top-1/2 z-[55] h-[40vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-3xl outline-none focus-visible:ring-1 focus-visible:ring-[#D7DEE8]"
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Festival film: horizontal, letterboxed at centre. Stays 16:9. */}
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
                playsInline preload="auto"
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

          {/* Skip intro */}
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
