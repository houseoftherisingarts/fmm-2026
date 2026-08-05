import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useUI } from '../../contexts/AppContext';
import { useSiteFlags } from '../../contexts/SiteFlagsContext';
import { FRISE_HISTOIRE } from '../../content/histoireFrise';
import { IconHourglass } from '../icons/GameIcons';
import EmberCanvas from '../vendor/EmberCanvas';
import { Stagger, StaggerItem } from '../scroll';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ─── FriseHistoire ───────────────────────────────────────────────────
// Scroll-driven timeline of the festival's editions, adapted from the
// mechanic built for La Petite Monnaie's parcours on Le Salon des
// Inconnus (sticky viewport + GSAP ScrollTrigger scrub driving an rAF
// loop that positions "stops" by their distance from a virtual camera).
// Here the journey follows a single line of time instead of a map: each
// edition is a brass medallion that grows and centres as it becomes the
// focal year, then recedes as the next one arrives. A short SFX marks
// each step. Desktop + motion-enabled only; mobile and
// prefers-reduced-motion get a plain vertical list below (no pin, no
// scroll-jacking), same fallback pattern as CinematicOpening.tsx.
//
// 🚨 En préparation — gardée derrière le drapeau `showHistoireFrise`
// (éteint par défaut). Ne pas retirer le FlagGate qui l'entoure.

const N = FRISE_HISTOIRE.length;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Léger frottement de pas — réutilise le SFX déjà servi par l'orbe plutôt
// que d'ajouter un nouvel actif (Alex, 2026-08-05 : « le son synchronisé »).
const STEP_SFX = '/orb/sfx/hover.mp3';

// Local dev (VITE_SITE_MODE=live) previews every in-progress section;
// production respects the Firestore flag — same convention as NavBar,
// Footer and OrbHomePage.
const PREVIEW_ALL = (import.meta.env.VITE_SITE_MODE || 'live') === 'live';

const FriseHistoire: React.FC = () => {
  const { lang } = useUI();
  const fr = lang === 'FR';
  const { flags } = useSiteFlags();
  const revealed = PREVIEW_ALL || flags.showHistoireFrise;

  const sectionRef = useRef<HTMLDivElement>(null);
  const stopRefs = useRef<(HTMLDivElement | null)[]>([]);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineFillRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const renderRef = useRef(0);
  const activeRef = useRef(-1);
  const sfxRef = useRef<HTMLAudioElement | null>(null);

  const [isCompact, setIsCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const staticFallback = isCompact || reduceMotion;

  useEffect(() => {
    const mqWidth = window.matchMedia('(max-width: 767px)');
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onWidth = () => setIsCompact(mqWidth.matches);
    const onMotion = () => setReduceMotion(mqMotion.matches);
    mqWidth.addEventListener('change', onWidth);
    mqMotion.addEventListener('change', onMotion);
    return () => {
      mqWidth.removeEventListener('change', onWidth);
      mqMotion.removeEventListener('change', onMotion);
    };
  }, []);

  useEffect(() => {
    if (staticFallback) return; // pas de SFX sur la liste statique
    const a = new Audio(STEP_SFX);
    a.preload = 'auto';
    a.volume = 0.35;
    sfxRef.current = a;
  }, [staticFallback]);

  useLayoutEffect(() => {
    if (staticFallback) return;
    const section = sectionRef.current;
    if (!section) return;

    const trigger = ScrollTrigger.create({
      trigger: section, start: 'top top', end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => { progressRef.current = self.progress; },
    });

    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(
      ([e]) => { visible = e.isIntersecting; },
      { threshold: 0 },
    );
    io.observe(section);

    const SPACING = 268; // px entre deux jalons au repos

    const tick = () => {
      renderRef.current = lerp(renderRef.current, progressRef.current, 0.12);

      if (visible) {
        const camPos = renderRef.current * (N - 1);
        const active = Math.round(camPos);
        if (active !== activeRef.current) {
          activeRef.current = active;
          const sfx = sfxRef.current;
          if (sfx) {
            try { sfx.currentTime = 0; } catch { /* pas encore chargé */ }
            sfx.play().catch(() => { /* geste utilisateur pas encore accordé */ });
          }
        }

        for (let i = 0; i < N; i++) {
          const el = stopRefs.current[i];
          if (!el) continue;
          const d = i - camPos;
          const dist = Math.abs(d);
          const x = d * SPACING;
          const scale = Math.max(0.5, 1 - dist * 0.17);
          const opacity = Math.max(0.1, 1 - dist * 0.4);
          el.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), -50%, 0) scale(${scale.toFixed(3)})`;
          el.style.opacity = opacity.toFixed(3);
          el.style.zIndex = String(1000 - Math.round(dist * 10));
          el.style.pointerEvents = dist < 0.4 ? 'auto' : 'none';

          const panel = panelRefs.current[i];
          if (panel) {
            const focal = 1 - clamp01(dist / 0.5);
            panel.style.opacity = focal.toFixed(3);
            panel.style.transform = `translateY(${lerp(14, 0, focal).toFixed(1)}px)`;
          }
        }

        if (lineFillRef.current) {
          lineFillRef.current.style.transform = `scaleX(${renderRef.current.toFixed(4)})`;
        }
        if (hintRef.current) {
          hintRef.current.style.opacity = clamp01(1 - renderRef.current * 9).toFixed(3);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => ScrollTrigger.refresh());
    ro.observe(section);
    return () => { trigger.kill(); ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf); };
  }, [staticFallback]);

  const t = {
    eyebrow: fr ? 'Année après année' : 'Year after year',
    title:   fr ? 'La ligne du temps' : 'The line of time',
    hint:    fr ? 'Défilez pour traverser les éditions' : 'Scroll to travel through the editions',
    current: fr ? 'En cours' : 'Current',
  };

  if (!revealed) return null;

  if (staticFallback) {
    return (
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <p className="font-editorial uppercase tracking-[0.35em] text-[11px] md:text-xs text-brass mb-3 flex items-center gap-2.5">
            <IconHourglass size={15} />{t.eyebrow}
          </p>
          <h2 className="font-display title-medieval text-3xl md:text-4xl text-ivory leading-[1.05] mb-10">{t.title}</h2>
          <Stagger className="relative pl-8 space-y-8" stagger={0.08}>
            <span aria-hidden className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-brass/70 via-brass/25 to-transparent" />
            {FRISE_HISTOIRE.map((s) => (
              <StaggerItem key={s.id} as="div" className="relative">
                <span
                  aria-hidden
                  className="absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full"
                  style={{
                    background: s.current ? 'var(--color-amber-glow)' : 'var(--color-brass)',
                    boxShadow: `0 0 12px ${s.current ? 'rgba(232,177,74,0.6)' : 'rgba(176,141,58,0.4)'}`,
                  }}
                />
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-display title-medieval text-xl text-brass-soft tabular-nums">{s.year}</span>
                  <h3 className="font-display title-medieval text-lg md:text-xl text-ivory">{fr ? s.titleFR : s.titleEN}</h3>
                  {s.current && (
                    <span className="font-sans text-[10px] uppercase tracking-[0.25em] px-2 py-0.5 rounded-full border border-[var(--color-amber-glow)]/50 text-[var(--color-amber-glow)]">
                      {t.current}
                    </span>
                  )}
                </div>
                {(s.noteFR || s.noteEN) && (
                  <p className="mt-1 font-editorial italic text-sm text-ivory-soft">{fr ? s.noteFR : s.noteEN}</p>
                )}
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    );
  }

  const trackHeightVh = Math.max(N * 55, 420);

  return (
    <section ref={sectionRef} className="relative" style={{ height: `${trackHeightVh}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden" style={{ background: 'var(--color-midnight-deep)' }}>
        {/* Fond atmosphérique */}
        <div className="absolute inset-0 z-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(184,106,42,0.14), transparent 62%), radial-gradient(ellipse 70% 50% at 50% 90%, rgba(107,31,31,0.16), transparent 65%), var(--color-midnight-deep)',
        }} />
        <EmberCanvas className="opacity-50" count={24} />

        {/* En-tête, fixé en haut du cadre pendant tout le défilement */}
        <div className="absolute top-10 md:top-14 inset-x-0 z-20 text-center px-6">
          <p className="font-editorial uppercase tracking-[0.35em] text-[11px] md:text-xs text-brass mb-2 flex items-center justify-center gap-2.5">
            <IconHourglass size={15} />{t.eyebrow}
          </p>
          <h2 className="font-display title-medieval text-3xl md:text-4xl text-ivory">{t.title}</h2>
        </div>

        {/* Ligne du temps + jalons */}
        <div className="absolute left-1/2 top-[46%] -translate-x-1/2 w-[70vw] max-w-[900px] h-px z-10" aria-hidden>
          <div className="absolute inset-0 bg-ivory/10" />
          <div
            ref={lineFillRef}
            className="absolute inset-0 origin-left"
            style={{ background: 'linear-gradient(90deg, var(--color-brass), var(--color-amber-glow))', transform: 'scaleX(0)' }}
          />
        </div>
        <div className="absolute left-1/2 top-[46%]" style={{ transformStyle: 'preserve-3d' }}>
          {FRISE_HISTOIRE.map((s, i) => {
            const ring = s.current ? 'var(--color-amber-glow)' : 'var(--color-brass)';
            const size = s.current ? 128 : 104;
            return (
              <div
                key={s.id}
                ref={(el) => { stopRefs.current[i] = el; }}
                className="absolute left-0 top-0 will-change-transform"
                style={{ opacity: 0 }}
              >
                <div
                  className="rounded-full flex items-center justify-center font-display title-medieval tabular-nums"
                  style={{
                    width: size, height: size,
                    fontSize: s.current ? '1.4rem' : '1.15rem',
                    color: 'var(--color-ivory)',
                    background: 'radial-gradient(circle at 50% 34%, rgba(232,177,74,0.14), var(--color-midnight-deep) 74%)',
                    boxShadow: `0 0 0 2px ${ring}, 0 0 0 6px rgba(8,20,36,0.6), 0 0 30px 4px ${ring}55, 0 18px 40px rgba(0,0,0,0.55)`,
                  }}
                >
                  {s.year}
                </div>
              </div>
            );
          })}
        </div>

        {/* Panneau du jalon actif — libellé + note, sous la ligne */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[58%] w-[min(560px,88vw)] text-center z-20">
          {FRISE_HISTOIRE.map((s, i) => (
            <div
              key={s.id}
              ref={(el) => { panelRefs.current[i] = el; }}
              className="absolute inset-x-0 top-0 will-change-transform"
              style={{ opacity: 0 }}
            >
              <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-2">
                {fr ? s.titleFR : s.titleEN}
              </h3>
              {(s.noteFR || s.noteEN) && (
                <p className="font-editorial italic text-sm md:text-base text-ivory-soft">
                  {fr ? s.noteFR : s.noteEN}
                </p>
              )}
              {s.current && (
                <span className="inline-block mt-3 font-sans text-[10px] uppercase tracking-[0.3em] px-3 py-1 rounded-full border border-[var(--color-amber-glow)]/50 text-[var(--color-amber-glow)]">
                  {t.current}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Repère de défilement */}
        <div ref={hintRef} className="absolute left-1/2 -translate-x-1/2 bottom-10 z-20 flex flex-col items-center gap-2 pointer-events-none">
          <span className="font-display title-medieval uppercase text-[11px] tracking-[0.4em] text-ivory-soft">
            {t.hint}
          </span>
        </div>
      </div>
    </section>
  );
};

export default FriseHistoire;
