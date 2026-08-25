import React, { useMemo, useState } from 'react';
import { MapPin, Phone } from 'lucide-react';
import CarteBoutiquesWJW, { boutiquesParProximite } from './CarteBoutiquesWJW';

// ─── Les boutiques les plus proches ─────────────────────────────────
// Quatre cartes, une par boutique, classées par distance réelle depuis
// Montpellier. Le classement se calcule au rendu à partir des vraies
// coordonnées : personne n'a à tenir une liste à jour à la main.
//
// L'adresse est cliquable et ouvre l'itinéraire dans l'application de
// cartes du visiteur, parce que c'est ce qu'on fait d'une adresse.

const BoutiquesProchesWJW: React.FC = () => {
  const [carteOuverte, setCarteOuverte] = useState(false);
  const proches = useMemo(() => boutiquesParProximite().slice(0, 4), []);

  return (
    <section
      id="boutiques-wjw"
      className="relative w-full py-16 md:py-24"
      style={{ background: 'linear-gradient(180deg, transparent, rgba(107,31,31,.10) 55%, transparent)' }}
    >
      <div className="max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14">
        <header className="text-center mb-10 md:mb-14">
          <p
            className="font-sans uppercase mb-3"
            style={{ color: 'var(--color-brass-soft)', letterSpacing: '.28em', fontSize: 10 }}
          >
            Après le festival
          </p>
          <h2
            className="font-display mb-4"
            style={{
              color: 'var(--color-ivory)',
              fontSize: 'clamp(26px, 4.4vw, 44px)',
              lineHeight: 1.1,
            }}
          >
            Les quatre boutiques les plus proches
          </h2>
          <p
            className="font-editorial mx-auto"
            style={{ color: 'var(--color-ivory-soft)', maxWidth: '40rem', fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.55 }}
          >
            La saucisse que vous avez mangée sur le site se rapporte à la maison. Voici
            les quatre comptoirs de l’Outaouais, du plus près du village au plus loin.
          </p>
        </header>

        <div className="grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {proches.map((b) => {
            const requete = encodeURIComponent(
              `William J. Walter, ${b.adresse}, ${b.ville.replace(/\s*\(.*\)$/, '')}, Québec ${b.codePostal}`,
            );
            return (
              <a
                key={b.ville}
                href={`https://www.google.com/maps/search/?api=1&query=${requete}`}
                target="_blank"
                rel="noreferrer noopener"
                className="group block p-6 md:p-7 transition"
                style={{
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid rgba(176,141,58,.34)',
                  background: 'rgba(14,31,51,.55)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <h3
                    className="font-display"
                    style={{ color: 'var(--color-amber-glow)', fontSize: 'clamp(18px, 2.2vw, 22px)', lineHeight: 1.2 }}
                  >
                    {b.ville.replace(/\s*\(.*\)$/, '')}
                  </h3>
                  <span
                    className="font-sans shrink-0"
                    style={{ color: 'var(--color-brass-soft)', fontSize: 11, letterSpacing: '.08em' }}
                  >
                    {Math.round(b.km)} km
                  </span>
                </div>
                <p
                  className="font-editorial flex items-start gap-2 mb-2"
                  style={{ color: 'var(--color-ivory)', fontSize: 16, lineHeight: 1.45 }}
                >
                  <MapPin size={15} className="mt-1 shrink-0" style={{ color: 'var(--color-brass)' }} />
                  <span>
                    {b.adresse}
                    <br />
                    {b.codePostal}
                  </span>
                </p>
                {b.telephone && (
                  <p
                    className="font-sans flex items-center gap-2"
                    style={{ color: 'var(--color-ivory-soft)', fontSize: 13 }}
                  >
                    <Phone size={13} style={{ color: 'var(--color-brass)' }} />
                    {b.telephone}
                  </p>
                )}
                <span
                  className="mt-4 block h-px w-0 group-hover:w-full transition-all duration-500"
                  style={{ background: 'var(--color-amber-glow)' }}
                />
              </a>
            );
          })}
        </div>

        <div className="mt-10 md:mt-14 text-center">
          <button
            type="button"
            onClick={() => setCarteOuverte(true)}
            className="fmm-glass-btn inline-flex px-8 py-5"
            style={{ flexDirection: 'row', gap: '.9rem', alignItems: 'center' }}
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
