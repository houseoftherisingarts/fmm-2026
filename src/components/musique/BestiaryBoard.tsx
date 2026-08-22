import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

// ─── Le bestiaire des groupes ────────────────────────────────────────
// Grammaire empruntée au bestiaire de The Witcher (référence d'Alex,
// 2026-08-22) : le registre des créatures à gauche, la créature détourée
// au centre sur son décor, la notice à droite.
//
// Ici, les groupes remplacent les bêtes. Les portraits sont détourés
// (fond retiré) et posés dans la taverne générée pour le festival, la
// même image que celle du plateau d'hnefatafl : un seul décor payé,
// deux usages.

export interface BestiaryBand {
  name: string;
  /** Portrait détouré, fond transparent. Absent : on montre l'écusson. */
  cutout?: string;
  /** Vignette carrée du registre. */
  thumb?: string;
  /** Repli quand il n'y a pas encore de détourage (écusson, logotype). */
  image?: string;
  imageAlt?: string;
  spotify?: string;
  website?: string;
  bioFR: string;
  bioEN: string;
  jour?: 'vendredi' | 'samedi' | 'dimanche';
}

const JOURS: { key: 'vendredi' | 'samedi' | 'dimanche'; FR: string; EN: string }[] = [
  { key: 'vendredi', FR: 'Vendredi', EN: 'Friday' },
  { key: 'samedi', FR: 'Samedi', EN: 'Saturday' },
  { key: 'dimanche', FR: 'Dimanche', EN: 'Sunday' },
];

const SCENE = '/scenes/taverne-bestiaire.jpg';

interface Props {
  bands: BestiaryBand[];
  lang: 'FR' | 'EN';
  /** Libellé du registre, à gauche au-dessus de la liste. */
  registre?: string;
}

const BestiaryBoard: React.FC<Props> = ({ bands, lang, registre }) => {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const stage = useRef<HTMLDivElement | null>(null);

  // Le registre suit l'ordre des jours, comme les familles de créatures.
  const groupes = useMemo(() => {
    const out: { titre: string; items: { band: BestiaryBand; i: number }[] }[] = [];
    JOURS.forEach((j) => {
      const items = bands
        .map((band, i) => ({ band, i }))
        .filter(({ band }) => band.jour === j.key);
      if (items.length) out.push({ titre: j[lang], items });
    });
    const sansJour = bands.map((band, i) => ({ band, i })).filter(({ band }) => !band.jour);
    if (sansJour.length) out.push({ titre: lang === 'FR' ? 'Au programme' : 'On the bill', items: sansJour });
    return out;
  }, [bands, lang]);

  const b = bands[active];
  const jourLabel = JOURS.find((j) => j.key === b?.jour)?.[lang];

  // Sur mobile le registre est au-dessus : le choix d'un groupe ramène
  // l'œil sur la scène, sinon le changement se produit hors écran.
  const select = (i: number) => {
    setActive(i);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => {
        const el = stage.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      });
    }
  };

  if (!b) return null;

  return (
    <div className="grid gap-6 lg:gap-0 lg:grid-cols-[16rem_minmax(0,1fr)_20rem] xl:grid-cols-[18rem_minmax(0,1fr)_23rem]">

      {/* ── Le registre ─────────────────────────────────────────── */}
      <aside className="lg:pr-7 lg:border-r" style={{ borderColor: 'rgba(244,239,227,0.10)' }}>
        <p className="witcher-stat-label mb-4">{registre ?? (lang === 'FR' ? 'Le registre' : 'The register')}</p>
        <div className="flex lg:block gap-2.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
          {groupes.map((g) => (
            <div key={g.titre} className="shrink-0 lg:shrink lg:mb-5">
              <p
                className="hidden lg:block font-sans uppercase tracking-[0.3em] text-[9px] mb-2"
                style={{ color: 'rgba(244,239,227,0.4)' }}
              >
                {g.titre}
              </p>
              <ul className="flex lg:block gap-2.5 lg:gap-0">
                {g.items.map(({ band, i }) => {
                  const on = i === active;
                  return (
                    <li key={band.name}>
                      <button
                        type="button"
                        onClick={() => select(i)}
                        aria-current={on}
                        className="w-[9.5rem] lg:w-full flex items-center gap-2.5 px-2 py-2 text-left transition-colors duration-200"
                        style={{
                          background: on ? 'rgba(216,176,90,0.10)' : 'transparent',
                          border: `1px solid ${on ? 'rgba(216,176,90,0.75)' : 'transparent'}`,
                        }}
                      >
                        <span
                          aria-hidden
                          className="shrink-0 w-9 h-9 overflow-hidden"
                          style={{
                            border: '1px solid rgba(244,239,227,0.18)',
                            background: 'rgba(26,5,11,0.6)',
                          }}
                        >
                          {band.thumb
                            ? <img src={band.thumb} alt="" loading="lazy" className="w-full h-full object-contain" />
                            : <span className="block w-full h-full" style={{ background: 'rgba(216,176,90,0.10)' }} />}
                        </span>
                        <span
                          className="font-display title-medieval text-[13px] leading-tight truncate"
                          style={{ color: on ? '#D8B05A' : 'rgba(244,239,227,0.8)' }}
                        >
                          {band.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* ── La scène ────────────────────────────────────────────── */}
      <div ref={stage} className="relative lg:px-8 lg:sticky lg:top-24 lg:self-start">
        <div
          className="relative overflow-hidden aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:h-[34rem]"
          style={{ background: '#0d0906' }}
        >
          <img
            src={SCENE}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'blur(2px) saturate(0.9)', transform: 'scale(1.06)' }}
          />
          {/* Fondu vers le noir sur tout le pourtour : la salle ne doit
              jamais se terminer par une arête franche. */}
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 58%, transparent 26%, rgba(10,6,4,.72) 78%, #0d0906 100%)',
            }}
          />
          <AnimatePresence mode="wait">
            <motion.img
              key={b.name}
              src={b.cutout ?? b.image}
              alt={b.imageAlt ?? b.name}
              initial={reduce ? false : { opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-1/2 bottom-[7%] -translate-x-1/2 max-h-[86%] max-w-[90%] w-auto object-contain"
              style={{ filter: 'drop-shadow(0 26px 40px rgba(0,0,0,0.85))' }}
            />
          </AnimatePresence>
          {/* Braise au sol sous le groupe : l'ancre au plancher. */}
          <span
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 bottom-[5%] w-[52%] h-6 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(216,176,90,.2), transparent 70%)' }}
          />
        </div>
      </div>

      {/* ── La notice ───────────────────────────────────────────── */}
      <div className="lg:pl-7 lg:border-l" style={{ borderColor: 'rgba(244,239,227,0.10)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={b.name}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {jourLabel && <p className="witcher-stat-label mb-3">{jourLabel}</p>}
            <h3
              className="font-display title-medieval text-2xl md:text-3xl leading-tight mb-4"
              style={{ color: '#D8B05A', textShadow: '0 0 22px rgba(216,176,90,0.28)' }}
            >
              {b.name}
            </h3>
            <div
              aria-hidden
              className="mb-4 h-px w-16"
              style={{ background: 'linear-gradient(90deg,#D8B05A,transparent)' }}
            />
            <p
              className="font-editorial text-[15px] md:text-base leading-relaxed"
              style={{ color: 'rgba(244,239,227,0.82)' }}
            >
              {lang === 'FR' ? b.bioFR : b.bioEN}
            </p>
            {(b.website || b.spotify) && (
              <div className="mt-6 flex flex-col gap-2.5">
                {b.website && (
                  <a
                    href={b.website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-sans uppercase tracking-[0.22em] text-[10px] text-[var(--color-bone)]/70 hover:text-[#D8B05A] transition w-fit"
                  >
                    {lang === 'FR' ? 'Leur site' : 'Their site'} <ArrowUpRight size={12} />
                  </a>
                )}
                {b.spotify && (
                  <a
                    href={b.spotify} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-sans uppercase tracking-[0.22em] text-[10px] text-[var(--color-bone)]/70 hover:text-[#D8B05A] transition w-fit"
                  >
                    {lang === 'FR' ? 'Les écouter' : 'Listen' } <ArrowUpRight size={12} />
                  </a>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BestiaryBoard;
