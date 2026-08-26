import React, { useMemo, useState } from 'react';
import { MapPin, Phone } from 'lucide-react';
import { Eyebrow, DisplayTitle, SectionFog, SectionTopRail } from '../marche/atmospherics';
import CarteBoutiquesWJW, { boutiquesParProximite } from './CarteBoutiquesWJW';

// ─── Les boutiques les plus proches ─────────────────────────────────
// Quatre cartes côte à côte, une par boutique, classées par distance
// réelle depuis Montpellier. Chaque carte est en verre vin du site,
// sans coins dorés : les fioritures restent aux grands contenants. Le classement se calcule au rendu
// à partir des vraies coordonnées, personne n'a de liste à tenir.
//
// L'adresse est cliquable et ouvre l'itinéraire dans l'application de
// cartes du visiteur, parce que c'est ce qu'on fait d'une adresse.

const BoutiquesProchesWJW: React.FC = () => {
  // `?carte=1` ouvre la carte dès l'arrivée : ça sert au lien direct
  // qu'Alex envoie au commanditaire, et à la vérification visuelle
  // automatisée, qui ne sait pas cliquer.
  const [carteOuverte, setCarteOuverte] = useState(
    () => typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('carte') === '1',
  );
  const proches = useMemo(() => boutiquesParProximite().slice(0, 4), []);

  return (
    <section id="boutiques-wjw" className="relative py-16 md:py-24 overflow-hidden">
      <SectionFog edges="top" />
      <div className="relative z-10 max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14">
        <SectionTopRail
          index="09"
          name="Après le festival"
          meta="Boutiques"
          metaValue="35"
          className="mb-10 md:mb-14"
        />

        <header className="text-center mb-10 md:mb-14">
          <div className="flex justify-center mb-4">
            <Eyebrow tone="amber" className="inline-flex items-center gap-3">
              <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-amber-glow)' }} />
              Après le festival
              <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-amber-glow)' }} />
            </Eyebrow>
          </div>
          <DisplayTitle size="lg" glow className="mb-4">
            Quatre boutiques tout près
          </DisplayTitle>
          <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mx-auto" style={{ maxWidth: '38rem' }}>
            Les quatre comptoirs de l’Outaouais, du plus près du village au plus
            loin. Le nom ouvre l’itinéraire.
          </p>
        </header>

        <div className="grid gap-6 md:gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {proches.map((b, i) => {
            const ville = b.ville.replace(/\s*\(.*\)$/, '');
            const requete = encodeURIComponent(
              `William J. Walter, ${b.adresse}, ${ville}, Québec ${b.codePostal}`,
            );
            return (
              <a
                  key={b.ville}
                  href={`https://www.google.com/maps/search/?api=1&query=${requete}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="caravan-glass group/bout block h-full px-7 py-8 md:px-8 md:py-9 rounded-[15px]"
                >
                  <span
                    aria-hidden
                    className="font-editorial italic block text-sm mb-3"
                    style={{ color: 'var(--color-copper)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex items-baseline justify-between gap-3 mb-4">
                    <span className="font-display title-medieval text-2xl md:text-[1.7rem] text-ivory leading-tight transition-colors duration-300 group-hover/bout:text-[var(--color-amber-glow)]">
                      {ville}
                    </span>
                    <span
                      className="font-display title-medieval text-lg md:text-xl whitespace-nowrap shrink-0"
                      style={{ color: 'var(--color-amber-glow)' }}
                    >
                      {Math.round(b.km)}
                      <span className="font-sans uppercase tracking-[0.2em] text-[13px] ml-1.5 text-ivory-soft">km</span>
                    </span>
                  </span>
                  <span className="font-editorial flex items-start gap-2.5 text-base text-ivory leading-snug">
                    <MapPin size={15} className="mt-1 shrink-0" style={{ color: 'var(--color-copper)' }} />
                    <span>
                      {b.adresse}
                      <br />
                      {b.codePostal}
                    </span>
                  </span>
                  {b.telephone && (
                    <span className="font-sans flex items-center gap-2.5 text-[13px] text-ivory-soft mt-3">
                      <Phone size={13} style={{ color: 'var(--color-copper)' }} />
                      {b.telephone}
                    </span>
                  )}
                </a>
            );
          })}
        </div>

        {/* `.fmm-glass-btn` est un flex de niveau bloc : sans ce conteneur
            centré et sans `display` remis en ligne, le bouton s'étirait
            sur toute la largeur et se collait à gauche. */}
        <div className="mt-10 md:mt-14 flex justify-center">
          <button
            type="button"
            onClick={() => setCarteOuverte(true)}
            className="fmm-glass-btn px-8 py-5"
            style={{ display: 'inline-flex', flexDirection: 'row', gap: '.9rem', alignItems: 'center', width: 'auto' }}
          >
            <MapPin size={18} style={{ color: 'var(--color-amber-glow)' }} />
            <span className="fmm-glass-btn-label">Trouver les autres points de vente</span>
          </button>
        </div>
      </div>

      <CarteBoutiquesWJW ouverte={carteOuverte} onFermer={() => setCarteOuverte(false)} />
    </section>
  );
};

export default BoutiquesProchesWJW;
