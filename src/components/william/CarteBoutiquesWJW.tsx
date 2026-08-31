import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { BOUTIQUES_WJW, type BoutiqueWJW } from '../../content/boutiquesWJW';

// ─── La carte des boutiques ─────────────────────────────────────────
// Une vraie carte, avec de vraies tuiles et les trente-cinq boutiques
// à leurs vraies coordonnées, mais habillée aux couleurs du festival.
// Les tuiles sombres de CARTO servent de fond, un filtre chaud les
// ramène vers l'ambre et le laiton, et chaque punaise est dessinée en
// CSS plutôt qu'importée : aucune image à charger, et la couleur suit
// les jetons du site.
//
// Leaflet est piloté à la main (pas de react-leaflet) : la carte ne
// vit que le temps de la fenêtre, alors une seule référence et un
// nettoyage à la fermeture suffisent.

export const FESTIVAL = { lat: 45.855586, lon: -75.163651, nom: 'Festival Médiéval de Montpellier' };

/** Distance à vol d'oiseau, en kilomètres (formule de haversine). */
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Les boutiques triées de la plus proche du festival à la plus lointaine. */
export function boutiquesParProximite(): Array<BoutiqueWJW & { km: number }> {
  return BOUTIQUES_WJW.map((b) => ({
    ...b,
    km: distanceKm(FESTIVAL.lat, FESTIVAL.lon, b.lat, b.lon),
  })).sort((a, b) => a.km - b.km);
}

const CarteBoutiquesWJW: React.FC<{ ouverte: boolean; onFermer: () => void }> = ({
  ouverte,
  onFermer,
}) => {
  const hote = useRef<HTMLDivElement | null>(null);
  const carte = useRef<{ remove: () => void; invalidateSize: () => void } | null>(null);

  // Échap ferme la fenêtre, comme partout ailleurs sur le site.
  useEffect(() => {
    if (!ouverte) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ouverte, onFermer]);

  useEffect(() => {
    if (!ouverte) return;
    let vivante = true;

    (async () => {
      // Leaflet et sa feuille de style arrivent à la demande : la carte
      // ne pèse rien tant que personne n'ouvre la fenêtre.
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (!vivante || !hote.current || carte.current) return;

      const map = L.map(hote.current, {
        center: [46.6, -73.4],
        zoom: 6,
        zoomSnap: 0.25,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 18,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
      ).addTo(map);

      const punaise = (couleur: string, taille: number, halo: string) =>
        L.divIcon({
          className: 'wjw-pin',
          html: `<span style="
            display:block;width:${taille}px;height:${taille}px;border-radius:50%;
            background:${couleur};border:2px solid rgba(var(--sk-parchment-rgb),.9);
            box-shadow:0 0 0 4px ${halo}, 0 4px 10px rgba(0,0,0,.55);"></span>`,
          iconSize: [taille, taille],
          iconAnchor: [taille / 2, taille / 2],
        });

      for (const b of BOUTIQUES_WJW) {
        const km = distanceKm(FESTIVAL.lat, FESTIVAL.lon, b.lat, b.lon);
        const proche = b.region === 'Outaouais';
        L.marker([b.lat, b.lon], {
          icon: punaise(
            proche ? 'var(--color-amber-glow)' : 'var(--sk-brass)',
            proche ? 15 : 11,
            proche ? 'rgba(var(--sk-glow-rgb),.28)' : 'rgba(var(--sk-brass-rgb),.18)',
          ),
          title: b.ville,
        })
          .addTo(map)
          .bindPopup(
            `<strong>${b.ville}</strong><br>${b.adresse}<br>${b.codePostal}` +
              (b.telephone ? `<br>${b.telephone}` : '') +
              `<br><em>${Math.round(km)} km du festival</em>`,
          );
      }

      // Le festival lui-même, en rouge sang, pour que la distance se lise
      // d'un coup d'œil au lieu de se calculer.
      L.marker([FESTIVAL.lat, FESTIVAL.lon], {
        icon: punaise('#8E2230', 17, 'rgba(142,34,48,.30)'),
        title: FESTIVAL.nom,
      })
        .addTo(map)
        .bindPopup(`<strong>${FESTIVAL.nom}</strong><br>25, 26 et 27 septembre 2026`);

      // Le cadrage se calcule sur les punaises elles-mêmes plutôt que
      // sur un centre fixe : la carte s'ouvre sur le Québec habité, sans
      // moitié d'écran perdue en Ontario et en Nouvelle-Angleterre.
      const points: Array<[number, number]> = BOUTIQUES_WJW.map((b) => [b.lat, b.lon]);
      points.push([FESTIVAL.lat, FESTIVAL.lon]);
      map.fitBounds(points, { padding: [38, 38] });

      carte.current = map;
      setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(points, { padding: [38, 38] });
      }, 160);
    })();

    return () => {
      vivante = false;
      carte.current?.remove();
      carte.current = null;
    };
  }, [ouverte]);

  // Le site anime ses sections avec une transformation CSS, et une
  // transformation piège tout ce qui est en `position: fixed` à
  // l'intérieur. Sans ce portail vers le corps du document, la carte
  // s'ouvrait quatre mille pixels plus bas au lieu de couvrir l'écran.
  const contenu = (
    <AnimatePresence>
      {ouverte && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Toutes les boutiques William J. Walter au Québec"
        >
          <button
            type="button"
            aria-label="Fermer la carte"
            onClick={onFermer}
            className="absolute inset-0 w-full h-full cursor-default"
            style={{ background: 'rgba(8, 20, 36, .82)', backdropFilter: 'blur(6px)' }}
          />
          <motion.div
            className="relative w-full max-w-5xl overflow-hidden"
            initial={{ scale: 0.97, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              borderRadius: 'var(--radius-card)',
              border: '1px solid rgba(var(--sk-brass-rgb), .45)',
              background: 'var(--color-midnight-deep)',
              boxShadow: 'var(--shadow-glass)',
            }}
          >
            <header className="flex items-start justify-between gap-4 px-5 md:px-8 pt-5 md:pt-6 pb-4">
              <div>
                <p
                  className="font-sans uppercase mb-1.5"
                  style={{ color: 'var(--color-brass-soft)', letterSpacing: '.26em', fontSize: 10 }}
                >
                  Trente-cinq boutiques au Québec
                </p>
                <h2
                  className="font-display"
                  style={{ color: 'var(--color-ivory)', fontSize: 'clamp(19px, 3vw, 26px)', lineHeight: 1.15 }}
                >
                  Où trouver William J. Walter
                </h2>
              </div>
              <button
                type="button"
                onClick={onFermer}
                aria-label="Fermer la carte"
                className="shrink-0 grid place-items-center rounded-full transition"
                style={{
                  width: 38, height: 38,
                  border: '1px solid rgba(var(--sk-brass-rgb),.5)',
                  color: 'var(--color-amber-glow)',
                  background: 'rgba(14,31,51,.6)',
                }}
              >
                <X size={18} />
              </button>
            </header>

            {/* Le filtre chaud sur les tuiles : la carte reste lisible et
                cesse d'être un objet gris posé dans une page ambrée. */}
            <div
              ref={hote}
              className="w-full"
              style={{
                height: 'min(62vh, 30rem)',
                filter: 'sepia(.34) saturate(.9) hue-rotate(-8deg) brightness(1.02) contrast(1.04)',
                borderTop: '1px solid rgba(var(--sk-brass-rgb),.28)',
                borderBottom: '1px solid rgba(var(--sk-brass-rgb),.28)',
              }}
            />

            <footer
              className="px-5 md:px-8 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-sans"
              style={{ color: 'var(--color-ivory-soft)', fontSize: 12 }}
            >
              <span className="inline-flex items-center gap-2">
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#8E2230', display: 'inline-block', border: '1.5px solid rgba(var(--sk-parchment-rgb),.85)' }} />
                Le festival
              </span>
              <span className="inline-flex items-center gap-2">
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--color-amber-glow)', display: 'inline-block', border: '1.5px solid rgba(var(--sk-parchment-rgb),.85)' }} />
                Les quatre boutiques de l’Outaouais
              </span>
              <span className="inline-flex items-center gap-2">
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--sk-brass)', display: 'inline-block', border: '1.5px solid rgba(var(--sk-parchment-rgb),.7)' }} />
                Les autres boutiques
              </span>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(contenu, document.body);
};

export default CarteBoutiquesWJW;
