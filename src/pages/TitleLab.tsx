import { useState } from 'react';
import { motion } from 'framer-motion';

// Comparison lab for three research-backed title/logo treatments over the
// medieval scene. Live text (so the words can stagger in, which the metal PNG
// can't), one shared cinematic reveal, three compositions to judge side by side.

const LOGO = '/fmm-crest-chrome.webp?v=3';
const IDLE = '/hero/crystal-idle.mp4';
const FIRE = '/orb/fire.mp4';
const display = '"Marcellus", "Cinzel", "Cinzel Decorative", Georgia, serif';
const editorial = '"Cormorant Garamond", Georgia, serif';

const lineV = {
  hidden: { y: 36, opacity: 0, filter: 'blur(10px)' },
  show: (i: number) => ({ y: 0, opacity: 1, filter: 'blur(0px)', transition: { delay: 0.55 + i * 0.2, duration: 1.15, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }),
};
const crestV = {
  hidden: { scale: 1.28, opacity: 0, filter: 'blur(9px)' },
  show: { scale: 1, opacity: 0.95, filter: 'blur(0px)', transition: { delay: 0.25, duration: 1.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

function Lockup({ align = 'center', crestW = 120, scale = 1, sub = false, glow = 'cool' }:
  { align?: 'center' | 'left'; crestW?: number; scale?: number; sub?: boolean; glow?: 'cool' | 'warm' }) {
  const lines = ['Festival', 'Médiéval', 'de Montpellier'];
  const shadow = glow === 'warm'
    ? '0 2px 14px rgba(0,0,0,0.85), 0 0 34px rgba(240,170,90,0.3)'
    : '0 2px 14px rgba(0,0,0,0.85), 0 0 30px rgba(150,170,200,0.25)';
  return (
    <div className={`flex flex-col ${align === 'left' ? 'items-start text-left' : 'items-center text-center'}`}>
      <motion.img src={LOGO} alt="" aria-hidden draggable={false} variants={crestV} initial="hidden" animate="show"
        className="mb-3 select-none" style={{ width: crestW, filter: 'drop-shadow(0 3px 14px rgba(0,0,0,0.6))' }} />
      {lines.map((t, i) => (
        <motion.div key={t} custom={i} variants={lineV} initial="hidden" animate="show"
          style={{
            fontFamily: display, color: '#EAEFF6',
            fontSize: i < 2 ? `calc(${scale} * clamp(2.6rem, 7vw, 5.2rem))` : `calc(${scale} * clamp(1.25rem, 3vw, 2.1rem))`,
            lineHeight: 1.04, fontWeight: i < 2 ? 600 : 400,
            letterSpacing: i < 2 ? '0.03em' : '0.34em',
            textShadow: shadow, marginTop: i === 2 ? '0.45rem' : 0,
          }}>
          {t}
        </motion.div>
      ))}
      {sub && (
        <motion.div custom={3} variants={lineV} initial="hidden" animate="show"
          style={{ fontFamily: editorial, fontStyle: 'italic', color: 'rgba(234,239,246,0.72)', fontSize: 'clamp(0.95rem,1.8vw,1.2rem)', letterSpacing: '0.16em', marginTop: '1.1rem' }}>
          25 · 26 · 27 Septembre 2026
        </motion.div>
      )}
    </div>
  );
}

export default function TitleLab() {
  const [concept, setConcept] = useState(1);
  const [run, setRun] = useState(0); // replay key

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#04060b]">
      {/* shared scene background */}
      <video src={IDLE} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: concept === 3 ? '36% 32%' : '50% 32%', transform: concept === 3 ? 'scale(1.12)' : 'none' }} />
      <video src={FIRE} autoPlay muted loop playsInline className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] w-full object-cover" style={{ opacity: 0.6, mixBlendMode: 'screen', WebkitMaskImage: 'linear-gradient(to top, black 60%, transparent 100%)', maskImage: 'linear-gradient(to top, black 60%, transparent 100%)' }} />
      {/* base atmosphere vignette */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(125% 105% at 50% 46%, transparent 52%, rgba(3,5,10,0.5) 88%, rgba(2,3,7,0.8) 100%)' }} />

      <div key={`${concept}-${run}`} className="absolute inset-0">
        {/* CONCEPT 1: orb projection, centered floating lockup with a soft veil */}
        {concept === 1 && (
          <>
            <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(46% 38% at 50% 40%, rgba(3,5,11,0.78) 0%, rgba(3,5,11,0.45) 45%, transparent 72%)' }} />
            <motion.div className="absolute inset-x-0 top-[20vh] flex justify-center px-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
              <Lockup align="center" crestW={128} glow="warm" />
            </motion.div>
          </>
        )}

        {/* CONCEPT 2: lower-third title card carved by a vignette well */}
        {concept === 2 && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%]" style={{ background: 'linear-gradient(to top, rgba(3,4,9,0.94) 0%, rgba(3,4,9,0.72) 26%, rgba(3,4,9,0.2) 62%, transparent 100%)' }} />
            <div className="absolute inset-x-0 bottom-[7vh] flex justify-center px-6">
              <Lockup align="center" crestW={104} sub />
            </div>
          </>
        )}

        {/* CONCEPT 3: editorial left column, scene pushed center-right */}
        {concept === 3 && (
          <>
            <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(3,4,9,0.92) 0%, rgba(3,4,9,0.6) 32%, transparent 58%)' }} />
            <div className="absolute left-[6vw] top-1/2 -translate-y-1/2 max-w-[42vw]">
              <Lockup align="left" crestW={92} scale={0.9} sub />
            </div>
          </>
        )}
      </div>

      {/* lab controls */}
      <div className="absolute right-4 top-4 z-50 flex items-center gap-2 rounded-full bg-black/55 px-2 py-1.5 backdrop-blur-sm" style={{ fontFamily: editorial }}>
        {[1, 2, 3].map((n) => (
          <button key={n} onClick={() => { setConcept(n); setRun((r) => r + 1); }}
            className="h-8 w-8 rounded-full text-sm transition-colors"
            style={{ background: concept === n ? '#D7DEE8' : 'transparent', color: concept === n ? '#0a0d14' : '#cfd7e2', border: '1px solid rgba(215,222,232,0.35)' }}>
            {n}
          </button>
        ))}
        <button onClick={() => setRun((r) => r + 1)} className="ml-1 rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]" style={{ color: '#cfd7e2', border: '1px solid rgba(215,222,232,0.35)' }}>
          Rejouer
        </button>
      </div>
      <div className="absolute left-4 top-4 z-50 text-xs uppercase tracking-[0.25em]" style={{ fontFamily: editorial, color: 'rgba(207,215,226,0.6)' }}>
        {concept === 1 ? '1 · Orbe projette le titre' : concept === 2 ? '2 · Carton-titre (puits d\'ombre)' : '3 · Colonne éditoriale'}
      </div>
    </div>
  );
}
