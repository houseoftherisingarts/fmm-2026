import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

// ─── Le bestiaire des groupes ────────────────────────────────────────
// Grammaire du bestiaire de The Witcher (référence d'Alex, 2026-08-22) :
// registre des créatures à gauche, sujet au centre, notice à droite.
//
// 2e passe, même jour : le détourage et le fond de taverne sont retirés.
// Alex veut la VRAIE photo du groupe au centre, en portrait, et des
// rangées de registre qui se lisent comme de vrais boutons (plaque,
// arête, cartouche de vignette), pas du texte sur un voile.

export interface BestiaryBand {
  name: string;
  /** La photo officielle du groupe, telle quelle. */
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

interface Props {
  bands: BestiaryBand[];
  lang: 'FR' | 'EN';
  /** Libellé du registre, au-dessus de la liste. */
  registre?: string;
  /** Titre du groupe pour les fiches sans journée (archives). */
  sansJourTitre?: string;
  /** Archives : registre à droite, notice à gauche (demande d'Alex). */
  mirror?: boolean;
}

const BestiaryBoard: React.FC<Props> = ({ bands, lang, registre, sansJourTitre, mirror = false }) => {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  // Le cadre épouse la photo : une photo debout reste debout, une photo
  // couchée reste couchée (Alex, 2026-08-23). Mesuré au chargement,
  // borné pour qu'aucune photo extrême ne casse la mise en page.
  const [ratio, setRatio] = useState('16 / 10');
  const mesurer = (img: HTMLImageElement) => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const r = img.naturalWidth / img.naturalHeight;
    const borne = Math.min(1.85, Math.max(0.66, r));
    setRatio(`${borne.toFixed(3)} / 1`);
  };
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
    if (sansJour.length) {
      out.push({
        titre: sansJourTitre ?? (lang === 'FR' ? 'Au programme' : 'On the bill'),
        items: sansJour,
      });
    }
    return out;
  }, [bands, lang, sansJourTitre]);

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
    <div
      className={
        mirror
          ? 'grid gap-6 lg:gap-0 lg:grid-cols-[20rem_minmax(0,1fr)_16rem] xl:grid-cols-[23rem_minmax(0,1fr)_18rem]'
          : 'grid gap-6 lg:gap-0 lg:grid-cols-[16rem_minmax(0,1fr)_20rem] xl:grid-cols-[18rem_minmax(0,1fr)_23rem]'
      }
    >

      {/* ── Le registre ─────────────────────────────────────────── */}
      <aside className={mirror ? 'lg:pl-7 lg:order-3' : 'lg:pr-7 lg:order-1'}>
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
                        data-on={on}
                        className="bestiary-row w-[11rem] lg:w-full"
                      >
                        <span aria-hidden className="bestiary-row-thumb">
                          {band.image
                            ? <img src={band.image} alt="" loading="lazy" />
                            : <span className="bestiary-row-thumb-empty" />}
                        </span>
                        <span className="bestiary-row-name">{band.name}</span>
                        <span aria-hidden className="bestiary-row-mark" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Le portrait ─────────────────────────────────────────
          Cadre paysage : la plupart des formations sont à plusieurs et
          un cadre portrait leur coupait la moitié du groupe (Alex,
          2026-08-22). Aucun filtre sur la photo, jamais. */}
      <div ref={stage} className="relative lg:px-8 lg:order-2 lg:sticky lg:top-24 lg:self-start">
        <div className="bestiary-portrait mx-auto w-full max-w-[34rem] lg:max-w-none" style={{ aspectRatio: b.image ? ratio : '16 / 10' }}>
          <AnimatePresence mode="wait">
            {b.image ? (
              <motion.img
                key={b.name}
                src={b.image}
                alt={b.imageAlt ?? b.name}
                initial={reduce ? false : { opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.995 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 w-full h-full object-cover"
                onLoad={(e) => mesurer(e.currentTarget)}
              />
            ) : (
              // Portrait pas encore fourni : le panneau orné reste seul,
              // au cadre par défaut. Même repli que la vignette du registre.
              <motion.span
                key={b.name}
                aria-hidden
                className="bestiary-row-thumb-empty absolute inset-0"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </AnimatePresence>
          <span aria-hidden className="bestiary-portrait-veil" />
          <span aria-hidden className="bestiary-portrait-corner tl" />
          <span aria-hidden className="bestiary-portrait-corner tr" />
          <span aria-hidden className="bestiary-portrait-corner bl" />
          <span aria-hidden className="bestiary-portrait-corner br" />
        </div>
      </div>

      {/* ── La notice ───────────────────────────────────────────── */}
      <div className={mirror ? 'lg:pr-7 lg:order-1' : 'lg:pl-7 lg:order-3'}>
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
