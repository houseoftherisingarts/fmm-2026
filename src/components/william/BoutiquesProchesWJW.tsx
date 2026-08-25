import React, { useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Eyebrow, DisplayTitle, GildedFrame, SectionFog, SectionTopRail } from '../marche/atmospherics';
import CarteBoutiquesWJW, { boutiquesParProximite } from './CarteBoutiquesWJW';

// ─── Les boutiques les plus proches ─────────────────────────────────
// Un registre plutôt qu'une grille de cartes : quatre lignes dans un
// seul écrin de verre, la même primitive que la taverne des élixirs
// juste au-dessus (GildedFrame ambre sur caravan-glass). Le classement
// se calcule au rendu à partir des vraies coordonnées, du plus près de
// Montpellier au plus loin, et personne n'a de liste à tenir à jour.
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
          index="08"
          name="Après le festival"
          meta="Boutiques"
          metaValue="35"
          className="mb-10 md:mb-14"
        />

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          <div className="lg:col-span-5">
            <Eyebrow tone="amber" className="mb-5 inline-flex items-center gap-3">
              <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-amber-glow)' }} />
              Les quatre comptoirs de l’Outaouais
            </Eyebrow>
            <DisplayTitle size="lg" glow className="mb-5">
              La saucisse rentre chez elle
            </DisplayTitle>
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed max-w-prose mb-8">
              Ce que vous avez goûté sur le site se retrouve au comptoir le mardi
              suivant. Voici les quatre boutiques les plus proches du village, du
              plus près au plus loin, et la carte de toutes les autres.
            </p>
            <button
              type="button"
              onClick={() => setCarteOuverte(true)}
              className="fmm-glass-btn px-7 py-4"
              style={{ display: 'inline-flex', flexDirection: 'row', gap: '.8rem', alignItems: 'center', width: 'auto' }}
            >
              <MapPin size={17} style={{ color: 'var(--color-amber-glow)' }} />
              <span className="fmm-glass-btn-label">Trouver les autres points de vente</span>
            </button>
          </div>

          <div className="lg:col-span-7">
            <GildedFrame tone="amber" active className="block">
              <div className="caravan-glass px-6 py-3 md:px-10 md:py-5">
                <ol>
                  {proches.map((b, i) => {
                    const ville = b.ville.replace(/\s*\(.*\)$/, '');
                    const requete = encodeURIComponent(
                      `William J. Walter, ${b.adresse}, ${ville}, Québec ${b.codePostal}`,
                    );
                    return (
                      <li
                        key={b.ville}
                        className="group/bout"
                        style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(244, 239, 227, 0.10)' }}
                      >
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${requete}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="grid grid-cols-[2.4rem_1fr_auto] md:grid-cols-[3rem_1fr_auto] items-baseline gap-x-4 py-5 md:py-6"
                        >
                          <span
                            aria-hidden
                            className="font-editorial italic text-sm md:text-base"
                            style={{ color: 'var(--color-copper)' }}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-0">
                            <span className="font-display title-medieval block text-xl md:text-2xl text-ivory leading-tight transition-colors duration-300 group-hover/bout:text-[var(--color-amber-glow)]">
                              {ville}
                            </span>
                            <span className="font-editorial block text-sm md:text-base text-ivory-soft leading-snug mt-1">
                              {b.adresse}, {b.codePostal}
                              {b.telephone && <span className="ml-3 whitespace-nowrap">· {b.telephone}</span>}
                            </span>
                          </span>
                          <span
                            className="font-display title-medieval text-lg md:text-xl whitespace-nowrap"
                            style={{ color: 'var(--color-amber-glow)' }}
                          >
                            {Math.round(b.km)}
                            <span className="font-sans uppercase tracking-[0.25em] text-[10px] ml-1.5 text-ivory-soft">km</span>
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </GildedFrame>
          </div>
        </div>
      </div>

      <CarteBoutiquesWJW ouverte={carteOuverte} onFermer={() => setCarteOuverte(false)} />
    </section>
  );
};

export default BoutiquesProchesWJW;
