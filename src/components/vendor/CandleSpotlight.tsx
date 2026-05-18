import React, { useEffect, useRef } from 'react';

// Cursor-following soft light. A radial gradient div that lerps toward
// the pointer position. Uses requestAnimationFrame + transforms for
// 60fps; never reflows. No-op on touch / reduced-motion.

const CandleSpotlight: React.FC<{ className?: string }> = ({ className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (reduce || !finePointer) return;
    const el = ref.current; if (!el) return;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx, cy = ty;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      el.style.transform = `translate3d(${cx - 320}px, ${cy - 320}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`fixed top-0 left-0 w-[640px] h-[640px] pointer-events-none z-0 ${className}`}
      style={{
        background: 'radial-gradient(circle at center, rgba(232, 177, 74, 0.18) 0%, rgba(184, 106, 42, 0.08) 30%, transparent 65%)',
        mixBlendMode: 'screen',
        willChange: 'transform',
      }}
    />
  );
};

export default CandleSpotlight;
