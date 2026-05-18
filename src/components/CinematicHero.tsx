import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, ChevronDown } from 'lucide-react';

interface CtaProps { label: string; href: string; external?: boolean }

interface Countdown { days: number; hours: number; minutes: number; seconds: number; isPast: boolean }

interface Props {
  backgroundImageUrl: string;
  backgroundVideoUrl?: string;
  eyebrow: string;
  title: string;
  dates: string;
  subtitle: string;
  primaryCta: CtaProps;
  secondaryCta: CtaProps;
  countdown: Countdown;
  countdownLabels: { days: string; hours: string; minutes: string; seconds: string };
  scrollLabel?: string;
  scrollHref?: string;
}

// Cinematic torch-lit hero. Composes a parallaxed background image
// (optional video override) under layered atmospheric overlays, a
// pulsing dual-torch glow, framer-motion entrance stack, glass-dark
// countdown tiles and an animated scroll indicator. All card-shaped
// elements use the project 15px radius (`rounded-card`) and glass
// utilities defined in src/index.css.
const CinematicHero: React.FC<Props> = ({
  backgroundImageUrl,
  backgroundVideoUrl,
  eyebrow,
  title,
  dates,
  subtitle,
  primaryCta,
  secondaryCta,
  countdown,
  countdownLabels,
  scrollLabel = 'Scroll',
  scrollHref = '#pillars',
}) => {
  const { scrollY } = useScroll();
  const bgY      = useTransform(scrollY, [0, 800], [0, 200]);
  const bgScale  = useTransform(scrollY, [0, 800], [1.05, 1.15]);
  const contentY = useTransform(scrollY, [0, 600], [0, -60]);
  const contentO = useTransform(scrollY, [0, 400, 600], [1, 0.8, 0]);

  return (
    <section className="relative min-h-screen flex items-center bg-night text-parchment overflow-hidden">
      <motion.div style={{ y: bgY, scale: bgScale }} className="absolute inset-0 z-0">
        {backgroundVideoUrl && (
          <video autoPlay muted loop playsInline poster={backgroundImageUrl}
            className="absolute inset-0 w-full h-full object-cover">
            <source src={backgroundVideoUrl} type="video/mp4" />
          </video>
        )}
        <img
          src={backgroundImageUrl}
          alt=""
          aria-hidden
          className={`absolute inset-0 w-full h-full object-cover ${backgroundVideoUrl ? 'opacity-0' : ''}`}
        />
      </motion.div>

      {/* Atmospheric overlays — vignette + warm gradients */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-night/70 via-night/55 to-night/95" />
      <div className="absolute inset-0 z-10 bg-gradient-to-tr from-oxblood-deep/45 via-transparent to-transparent" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(176,141,58,0.18),transparent_55%)]" />

      {/* Twin pulsing torchlights — opposite phases, subtly different periods */}
      <motion.div
        className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_12%_78%,rgba(232,184,106,0.28),transparent_45%)]"
        animate={{ opacity: [0.55, 1, 0.7, 0.95, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_88%_28%,rgba(232,184,106,0.22),transparent_42%)]"
        animate={{ opacity: [0.85, 0.5, 1, 0.65, 0.85] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="grain absolute inset-0 z-10 opacity-25" aria-hidden />

      <motion.div
        style={{ y: contentY, opacity: contentO }}
        className="relative z-20 max-w-6xl mx-auto px-4 md:px-6 pt-32 pb-24 md:pt-40 md:pb-28 w-full"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          className="font-editorial italic text-brass uppercase tracking-[0.4em] text-xs md:text-sm mb-6"
        >
          {eyebrow} · {dates}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.15 }}
          className="font-display text-5xl md:text-7xl lg:text-[8rem] font-bold leading-[0.95] mb-8 whitespace-pre-line drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
        >
          {title}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 1, delay: 0.4 }}
          className="divider-brass w-32 mb-8 origin-left"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
          className="font-editorial text-lg md:text-2xl text-stone-light max-w-2xl leading-relaxed mb-10 [text-shadow:0_2px_12px_rgba(0,0,0,0.4)]"
        >
          {subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <CTA primary {...primaryCta} />
          <CTA {...secondaryCta} />
        </motion.div>

        {!countdown.isPast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1 }}
            className="grid grid-cols-4 gap-3 md:gap-4 max-w-md"
          >
            {[
              { label: countdownLabels.days,    value: countdown.days },
              { label: countdownLabels.hours,   value: countdown.hours },
              { label: countdownLabels.minutes, value: countdown.minutes },
              { label: countdownLabels.seconds, value: countdown.seconds },
            ].map((b) => (
              <div key={b.label} className="glass-dark text-center py-3 md:py-4 rounded-card">
                <div className="font-display text-2xl md:text-4xl text-brass tabular-nums">
                  {String(b.value).padStart(2, '0')}
                </div>
                <div className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-stone-light mt-1">
                  {b.label}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <motion.a
        href={scrollHref}
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 group"
      >
        <span className="font-editorial italic text-xs uppercase tracking-[0.3em] text-stone-light opacity-70 group-hover:text-brass transition">
          {scrollLabel}
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-brass"
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.a>
    </section>
  );
};

interface InternalCtaProps extends CtaProps { primary?: boolean }
const CTA: React.FC<InternalCtaProps> = ({ label, href, external, primary }) => {
  const cls = primary
    ? 'inline-flex items-center justify-center gap-2 px-7 py-4 bg-brass text-night font-sans uppercase tracking-wider text-sm font-semibold hover:bg-brass-soft transition group rounded-card shadow-[0_8px_32px_-8px_rgba(176,141,58,0.6)]'
    : 'inline-flex items-center justify-center px-7 py-4 glass-frost text-parchment hover:border-brass hover:text-brass font-sans uppercase tracking-wider text-sm transition rounded-card';
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={cls}>
      {label}
      {primary && <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />}
    </a>
  );
};

export default CinematicHero;
