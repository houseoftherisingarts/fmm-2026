import React, { useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { Reveal, Stagger, StaggerItem } from '../scroll';
import { Eyebrow, GildedFrame } from '../marche/atmospherics';
import { Motes } from '../marche/effects';

// ─── Commanditaire d'honneur ─────────────────────────────────────────
// Section « commanditaire de l'année » en tête de /partenaires : un
// portrait en médaillon, le mot du commanditaire, et les rendez-vous où
// le FMM et le commanditaire tiennent kiosque ensemble.
//
// 🚨 Toute la section est gardée par le drapeau `showCommanditaire`
// (siteFlags, éteint par défaut) : publier la page /partenaires pour
// l'édition courante ne dévoile PAS le commanditaire de la suivante.
//
// Pour brancher un vrai commanditaire, il n'y a que l'objet ci-dessous
// à remplir. Tant que `quoteFR` est vide, le bloc citation affiche son
// état d'attente : jamais de mots inventés dans la bouche de quelqu'un.

interface SponsorEvent {
  nameFR:  string;  nameEN:  string;
  whenFR:  string;  whenEN:  string;
  placeFR: string;  placeEN: string;
  descFR:  string;  descEN:  string;
}

interface Sponsor {
  name:      string;
  /** Ligne de rôle sous le nom. */
  roleFR:    string;  roleEN: string;
  /** Photo carrée, déposée dans `public/sponsors/`. Repli automatique
   *  sur un monogramme gravé si le fichier n'est pas encore là. */
  portrait:  string;
  /** Les mots EXACTS du commanditaire. Vide = état d'attente. */
  quoteFR:   string;  quoteEN: string;
  events:    SponsorEvent[];
}

export const SPONSOR_OF_THE_YEAR: Sponsor = {
  name:     'Anne Robillard',
  roleFR:   'Autrice · Les Chevaliers d’Émeraude',
  roleEN:   'Author · Les Chevaliers d’Émeraude',
  portrait: '/sponsors/anne-robillard.webp',
  quoteFR:  '',
  quoteEN:  '',
  events: [
    {
      nameFR:  'Salon du livre de l’Outaouais',
      nameEN:  'Salon du livre de l’Outaouais',
      whenFR:  'Février 2027 · dates à confirmer',
      whenEN:  'February 2027 · dates to be confirmed',
      placeFR: 'Palais des congrès de Gatineau',
      placeEN: 'Palais des congrès, Gatineau',
      descFR:  'Un kiosque partagé : ses livres d’un côté, le festival de l’autre, et la même file de lecteurs entre les deux.',
      descEN:  'A shared booth: her books on one side, the festival on the other, and the same line of readers in between.',
    },
    {
      // #TODO nom exact de l'événement de la Petite-Nation à confirmer.
      nameFR:  'Rendez-vous de la Petite-Nation',
      nameEN:  'Petite-Nation gathering',
      whenFR:  'Date à confirmer',
      whenEN:  'Date to be confirmed',
      placeFR: 'MRC de Papineau',
      placeEN: 'MRC de Papineau',
      descFR:  'Chez nous, dans la vallée : un kiosque commun pour rencontrer les familles de la région avant le festival.',
      descEN:  'On home ground, in the valley: a joint booth to meet local families ahead of the festival.',
    },
  ],
};

const CommanditaireHonneur: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const s = SPONSOR_OF_THE_YEAR;
  const quote = lang === 'FR' ? s.quoteFR : s.quoteEN;

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <Motes className="opacity-40" count={14} />

      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-12 gap-10 md:gap-14 items-center">

          {/* ── Médaillon ─────────────────────────────────────────── */}
          <Reveal from="left" className="lg:col-span-4">
            <Portrait src={s.portrait} name={s.name} />
          </Reveal>

          {/* ── Identité + mot du commanditaire ───────────────────── */}
          <div className="lg:col-span-8">
            <Reveal from="right">
              <Eyebrow tone="amber" className="mb-3">{t.eyebrow}</Eyebrow>
              <h2 className="font-display title-medieval text-4xl md:text-6xl text-ivory leading-[0.95] mb-3">
                {s.name}
              </h2>
              <p className="font-editorial text-base md:text-lg text-brass mb-5">
                {lang === 'FR' ? s.roleFR : s.roleEN}
              </p>
              <div className="divider-brass w-24 mb-8" />
            </Reveal>

            <Reveal from="right" delay={0.12}>
              <GildedFrame inset={12} tone="amber">
                <figure className="caravan-glass rounded-lg-card p-7 md:p-10">
                  <span
                    aria-hidden
                    className="block font-display leading-none select-none mb-2"
                    style={{
                      fontSize: '4rem',
                      color: 'var(--color-amber-glow)',
                      opacity: 0.55,
                      textShadow: '0 0 22px rgba(var(--sk-glow-rgb), 0.35)',
                    }}
                  >
                    «
                  </span>
                  {quote ? (
                    <>
                      <blockquote className="font-display text-xl md:text-3xl text-ivory leading-snug">
                        {quote}
                      </blockquote>
                      <figcaption className="mt-5 font-editorial text-sm md:text-base text-ivory-soft">
                        {s.name} · {t.quoteCaption}
                      </figcaption>
                    </>
                  ) : (
                    <p className="font-display text-lg md:text-2xl leading-snug"
                       style={{ color: 'rgba(var(--sk-parchment-rgb), 0.42)' }}>
                      {t.quoteAwaiting}
                    </p>
                  )}
                </figure>
              </GildedFrame>
            </Reveal>
          </div>
        </div>

        {/* ── Rendez-vous communs ─────────────────────────────────── */}
        <div className="mt-14 md:mt-20">
          <Reveal>
            <Eyebrow tone="copper" className="mb-3">{t.togetherEyebrow}</Eyebrow>
            <h3 className="font-display title-medieval text-2xl md:text-4xl text-ivory mb-3">
              {t.togetherTitle}
            </h3>
            <p className="font-editorial text-base md:text-lg text-ivory-soft max-w-2xl mb-9">
              {t.togetherLead}
            </p>
          </Reveal>

          <Stagger className="grid md:grid-cols-2 gap-4 md:gap-6" stagger={0.1}>
            {s.events.map((ev, i) => (
              <StaggerItem key={ev.nameFR} as="article"
                className="group relative glass-light rounded-lg-card p-7 md:p-9 overflow-hidden transition-transform duration-300 hover:-translate-y-1">
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse 70% 90% at 15% 0%, rgba(var(--sk-glow-rgb), 0.14), transparent 70%)',
                  }}
                />
                <p className="relative font-editorial italic text-brass uppercase tracking-[0.3em] text-[11px] mb-4">
                  {String(i + 1).padStart(2, '0')} · {t.together}
                </p>
                <h4 className="relative font-display title-medieval text-xl md:text-2xl text-ivory leading-tight mb-4">
                  {lang === 'FR' ? ev.nameFR : ev.nameEN}
                </h4>
                <div className="relative flex flex-wrap gap-x-5 gap-y-2 mb-4">
                  <MetaChip icon={CalendarDays} label={lang === 'FR' ? ev.whenFR : ev.whenEN} />
                  <MetaChip icon={MapPin}       label={lang === 'FR' ? ev.placeFR : ev.placeEN} />
                </div>
                <p className="relative font-editorial text-base text-ivory-soft leading-relaxed">
                  {lang === 'FR' ? ev.descFR : ev.descEN}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
};

// ─── Portrait en médaillon ───────────────────────────────────────────
// Cercle serti de laiton, halo cuivré derrière, monogramme gravé en
// repli tant que la photo n'est pas déposée dans public/sponsors/.
const Portrait: React.FC<{ src: string; name: string }> = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="relative mx-auto lg:mx-0 w-[240px] sm:w-[300px] lg:w-full max-w-[360px] aspect-square">
      {/* Halo cuivré */}
      <span
        aria-hidden
        className="absolute -inset-[18%] pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(var(--sk-copper-rgb), 0.30), transparent 68%),' +
            'radial-gradient(circle at 50% 55%, rgba(var(--sk-glow-rgb), 0.16), transparent 72%)',
        }}
      />
      {/* Anneau extérieur */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          border: '1px solid rgba(var(--sk-mustard-rgb), 0.45)',
          boxShadow: '0 0 30px -6px rgba(var(--sk-mustard-rgb), 0.5)',
        }}
      />
      {/* Cercle photo, serti à l'intérieur de l'anneau */}
      <div
        className="absolute inset-[7px] rounded-full overflow-hidden"
        style={{
          border: '1px solid rgba(var(--sk-glow-rgb), 0.55)',
          boxShadow:
            'inset 0 2px 24px rgba(0, 0, 0, 0.65), inset 0 0 0 1px rgba(var(--sk-sheen-rgb), 0.10)',
          background:
            'radial-gradient(circle at 50% 35%, rgba(var(--sk-copper-rgb), 0.35), rgba(var(--sk-ink-rgb), 0.95) 70%)',
        }}
      >
        {failed ? (
          <span className="absolute inset-0 flex items-center justify-center font-display title-medieval text-5xl md:text-6xl"
                style={{ color: 'rgba(var(--sk-glow-rgb), 0.55)', letterSpacing: '0.08em' }}>
            {initials}
          </span>
        ) : (
          <img
            src={src}
            alt={name}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="fmm-no-grade absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Vignettage doux pour asseoir le portrait dans le noir de la page */}
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 40%, transparent 45%, rgba(var(--sk-ink-rgb), 0.55) 100%)' }}
        />
      </div>
    </div>
  );
};

const MetaChip: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}> = ({ icon: Icon, label }) => (
  <span className="inline-flex items-center gap-2 font-sans text-[12px] tracking-wide text-ivory-soft">
    <Icon size={13} className="text-brass" /> {label}
  </span>
);

const FR = {
  eyebrow:         'Commanditaire d’honneur · Édition 2027',
  quoteCaption:    'commanditaire d’honneur du FMM',
  quoteAwaiting:   'Le mot de notre commanditaire paraîtra ici, dans ses mots à elle.',
  together:        'Ensemble',
  togetherEyebrow: 'Sur la route',
  togetherTitle:   'Là où vous nous trouverez ensemble',
  togetherLead:    'Avant le festival, le FMM et son commanditaire d’honneur tiennent kiosque côte à côte. Deux rendez-vous pour venir jaser, feuilleter, et repartir avec vos billets.',
};

const EN: typeof FR = {
  eyebrow:         'Sponsor of honour · 2027 edition',
  quoteCaption:    'FMM sponsor of honour',
  quoteAwaiting:   'A word from our sponsor will appear here, in her own words.',
  together:        'Together',
  togetherEyebrow: 'On the road',
  togetherTitle:   'Where you’ll find us together',
  togetherLead:    'Ahead of the festival, FMM and its sponsor of honour hold a booth side by side. Two occasions to come talk, browse, and leave with your tickets.',
};

export default CommanditaireHonneur;
