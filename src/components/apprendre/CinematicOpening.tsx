import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, Flame } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ─── CinematicOpening ────────────────────────────────────────────────
// Draftly-grade pinned opening for the Apprendre page. A sticky stage
// locks the viewport while scroll scrubs:
//   · a real forge-fire video (currentTime mapped to scroll progress)
//   · three parallax depth layers (ember glow / drifting sparks / fore
//     vignette) gliding at different rates → camera-push feel
//   · a title sequence that dissolves up with blur, then a manifesto
//     panel rises in from depth, then the whole stage releases into the
//     page content below.
//
// Desktop (>=768px): full pin + scrub. Mobile (<768px): the fire loops
// gently and every layer is shown static: no long pin, no scrub.
// prefers-reduced-motion: everything visible, video paused on frame one.

interface Props {
  eyebrow: string;
  title: string;
  lead: string;
  hint: string;
  videoSrc?: string;
}

const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 67) % 100}%`,
  top: `${(i * 41 + 12) % 92}%`,
  size: 2 + (i % 3),
  delay: (i % 7) * 0.6,
}));

const CinematicOpening: React.FC<Props> = ({
  eyebrow,
  title,
  lead,
  hint,
  videoSrc = '/orb/fire.mp4',
}) => {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );

  // Track the breakpoint so the pin distance + timeline rebuild when the
  // visitor crosses 768px (rotation, devtools, etc).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setIsMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vid = video.current;

    if (reduce) {
      vid?.pause();
      gsap.set('#ap-hint', { autoAlpha: 0 });
      return;
    }

    if (isMobile) {
      // Gentle ambient loop, no pin/scrub. Everything stays visible.
      if (vid) {
        vid.muted = true;
        vid.loop = true;
        vid.play?.().catch(() => {});
      }
      gsap.set('#ap-hint', { autoAlpha: 1 });
      return;
    }

    let ctx: ReturnType<typeof gsap.context> | undefined;
    const build = () => {
      const dur = vid && isFinite(vid.duration) && vid.duration ? vid.duration : 6;
      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: track.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5,
          },
        });

        // Scrub the forge fire frame-by-frame with the scroll.
        if (vid) tl.to(vid, { currentTime: Math.max(0, dur - 0.05), duration: 100 }, 0);

        // Parallax depth: each layer climbs at its own rate.
        tl.to('[data-ap="glow"]', { yPercent: -24, scale: 1.18, duration: 100 }, 0)
          .to('[data-ap="motes"]', { yPercent: -65, duration: 100 }, 0)
          .to('[data-ap="fore"]', { yPercent: -14, scale: 1.16, duration: 100 }, 0)
          // Scroll hint fades the instant you move.
          .to('#ap-hint', { autoAlpha: 0, duration: 8 }, 0)
          // Title holds, then dissolves upward through blur.
          .to('#ap-title', { autoAlpha: 0, yPercent: -30, filter: 'blur(10px)', duration: 22 }, 30)
          // Manifesto rises from depth, holds, then clears.
          .fromTo(
            '#ap-manifesto',
            { autoAlpha: 0, yPercent: 30, filter: 'blur(12px)', scale: 0.96 },
            { autoAlpha: 1, yPercent: 0, filter: 'blur(0px)', scale: 1, duration: 20 },
            42,
          )
          .to('#ap-manifesto', { autoAlpha: 0, yPercent: -18, filter: 'blur(6px)', duration: 16 }, 78);

        ScrollTrigger.refresh();
      }, root);
    };

    vid?.pause();
    if (vid && (vid.readyState < 1 || !vid.duration)) {
      const onMeta = () => {
        build();
        ScrollTrigger.refresh();
      };
      vid.addEventListener('loadedmetadata', onMeta, { once: true });
      return () => {
        vid.removeEventListener('loadedmetadata', onMeta);
        ctx?.revert();
      };
    }
    build();
    return () => ctx?.revert();
  }, [isMobile]);

  return (
    <section ref={root} aria-label={title} className="relative isolate">
      <div ref={track} style={{ height: isMobile ? '100vh' : '300vh', position: 'relative' }}>
        <div
          className="grain"
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
            background: 'var(--color-velvet-deep)',
          }}
        >
          {/* Forge-fire bed, scrubbed on desktop, looped on mobile */}
          <video
            ref={video}
            src={videoSrc}
            muted
            playsInline
            preload="auto"
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scale(1.08)',
              opacity: 0.85,
            }}
          />

          {/* Velvet/amber colour grade keeps the fire on-brand */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(120% 90% at 50% 18%, rgba(184,106,42,0.35), rgba(26,5,11,0.35) 55%, rgba(10,2,7,0.85) 100%)',
              mixBlendMode: 'multiply',
            }}
          />

          {/* Back layer: broad ember glow */}
          <div
            data-ap="glow"
            aria-hidden
            style={{
              position: 'absolute',
              top: '8%',
              left: '50%',
              width: 'min(70vw, 720px)',
              height: 'min(70vw, 720px)',
              transform: 'translateX(-50%)',
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 50% 45%, rgba(232,177,74,0.35) 0%, rgba(184,106,42,0.20) 38%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />

          {/* Mid layer: drifting sparks */}
          <div data-ap="motes" aria-hidden style={{ position: 'absolute', inset: 0 }}>
            {SPARKS.map((s, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: s.left,
                  top: s.top,
                  width: s.size,
                  height: s.size,
                  borderRadius: '50%',
                  background: '#FFF6D5',
                  boxShadow: '0 0 8px 2px rgba(232,177,74,0.65)',
                  opacity: 0.7,
                  animation: `apSparkPulse 3.4s ease-in-out ${s.delay}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Foreground vignette for legibility + depth */}
          <div
            data-ap="fore"
            aria-hidden
            style={{
              position: 'absolute',
              inset: '-10% 0 0 0',
              background:
                'linear-gradient(to bottom, rgba(10,2,7,0.55) 0%, transparent 28%, transparent 52%, rgba(10,2,7,0.80) 100%)',
            }}
          />

          {/* ── Title sequence ── */}
          <div
            id="ap-title"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '0 1.5rem',
            }}
          >
            <p
              className="font-editorial italic uppercase"
              style={{
                letterSpacing: '0.4em',
                fontSize: 'clamp(0.7rem, 2vw, 0.9rem)',
                color: 'var(--color-amber-glow)',
                marginBottom: '1.1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.8rem',
              }}
            >
              <span aria-hidden style={{ height: 1, width: 36, background: 'var(--color-amber-glow)' }} />
              {eyebrow}
              <span aria-hidden style={{ height: 1, width: 36, background: 'var(--color-amber-glow)' }} />
            </p>
            <h1
              className="font-display uppercase"
              style={{
                fontSize: 'clamp(3rem, 11vw, 8.5rem)',
                lineHeight: 0.95,
                letterSpacing: '0.02em',
                margin: 0,
                background: 'linear-gradient(180deg, #F4EFE3 0%, #E8B14A 70%, #B86A2A 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 6px 30px rgba(184,106,42,0.45))',
              }}
            >
              {title}
            </h1>
          </div>

          {/* ── Manifesto panel (rises from depth) ── */}
          <div
            id="ap-manifesto"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 1.5rem',
            }}
          >
            <div style={{ maxWidth: 760, textAlign: 'center' }}>
              <Flame
                size={30}
                aria-hidden
                style={{ color: 'var(--color-amber-glow)', margin: '0 auto 1.2rem' }}
              />
              <p
                className="font-editorial"
                style={{
                  fontSize: 'clamp(1.3rem, 3.4vw, 2.4rem)',
                  lineHeight: 1.4,
                  color: 'var(--color-ivory)',
                  textShadow: '0 2px 24px rgba(10,2,7,0.7)',
                }}
              >
                {lead}
              </p>
            </div>
          </div>

          {/* ── Scroll hint ── */}
          <div
            id="ap-hint"
            style={{
              position: 'absolute',
              bottom: '5%',
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              color: 'var(--color-brass-soft)',
            }}
          >
            <span
              className="font-display title-medieval uppercase"
              style={{ fontSize: '0.7rem', letterSpacing: '0.3em' }}
            >
              {hint}
            </span>
            <ChevronDown size={20} className="animate-bounce" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes apSparkPulse {
          0%, 100% { opacity: 0.25; transform: translateY(0) scale(0.9); }
          50%      { opacity: 0.9;  transform: translateY(-6px) scale(1.15); }
        }
      `}</style>
    </section>
  );
};

export default CinematicOpening;
