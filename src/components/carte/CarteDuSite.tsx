import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Maximize2, X } from 'lucide-react';
import { CARTE, CARTE_SRCSET } from '../../content/carte';

// ─── La carte du site, une seule fois ────────────────────────────────
// Le même objet sert l'accueil, la page d'hébergement, le pop-up
// d'arrivée, le parchemin du babillard et l'espace client. Trois
// largeurs de WebP pour le rendu, un JPEG de 3200 px pour la copie qu'on
// télécharge ou qu'on imprime.
//
// Un clic ouvre la carte plein écran, parce qu'une carte de festival se
// lit de près : les noms des quartiers font 18 px sur un téléphone.

export const CarteDuSite: React.FC<{
  lang: 'FR' | 'EN';
  /** Rendu prioritaire : la carte est déjà à l'écran (pop-up). */
  prioritaire?: boolean;
  /** Le bouton de téléchargement, en bas à droite de l'image. */
  telechargeable?: boolean;
  /** Ce qui enveloppe l'image. L'accueil la veut pleine largeur et sans
   *  cadre, l'espace client la veut encadrée. */
  className?: string;
  /** Tailles réelles à l'écran, pour que le navigateur choisisse bien. */
  sizes?: string;
}> = ({
  lang, prioritaire = false, telechargeable = true,
  className = '', sizes = '100vw',
}) => {
  const fr = lang === 'FR';
  const [zoom, setZoom] = useState(false);

  // Échap ferme la carte plein écran, et le corps de page cesse de
  // défiler derrière elle.
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(false); };
    window.addEventListener('keydown', onKey);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = avant;
    };
  }, [zoom]);

  const alt = fr
    ? 'Carte du site du Festival Médiéval de Montpellier 2026'
    : 'Site map of the Festival Médiéval de Montpellier 2026';

  return (
    <>
      <div className={`relative group ${className}`}>
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label={fr ? 'Agrandir la carte' : 'Enlarge the map'}
          className="block w-full cursor-zoom-in"
        >
          <img
            src={CARTE.webp1920}
            srcSet={CARTE_SRCSET}
            sizes={sizes}
            width={CARTE.largeur}
            height={CARTE.hauteur}
            alt={alt}
            decoding="async"
            loading={prioritaire ? 'eager' : 'lazy'}
            fetchPriority={prioritaire ? 'high' : 'low'}
            className="w-full h-auto"
          />
        </button>

        {/* Les deux gestes possibles sur la carte : l'agrandir, l'emporter.
            Sur un téléphone, les deux boutons descendent sous l'image :
            posés dessus, ils mangeaient le quart du terrain. */}
        <span className="mt-2 pr-3 flex items-center justify-end gap-2 md:mt-0 md:pr-0 md:absolute md:bottom-6 md:right-6">
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-card bg-midnight-deep/85 backdrop-blur-sm border border-brass/40 font-sans uppercase tracking-widest text-[10px] md:text-xs font-semibold text-brass hover:bg-brass hover:text-midnight-deep hover:border-brass transition-colors"
          >
            <Maximize2 size={13} /> {fr ? 'Agrandir' : 'Enlarge'}
          </button>
          {telechargeable && (
            <a
              href={CARTE.jpg}
              download={CARTE.nomFichier}
              className="inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-card bg-midnight-deep/85 backdrop-blur-sm border border-brass/40 font-sans uppercase tracking-widest text-[10px] md:text-xs font-semibold text-brass hover:bg-brass hover:text-midnight-deep hover:border-brass transition-colors"
            >
              <Download size={13} /> {fr ? 'Télécharger' : 'Download'}
            </a>
          )}
        </span>
      </div>

      {/* Plein écran : la carte occupe tout, on la fait défiler pour
          lire les quartiers, et le fond se ferme d'un clic. */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[115] overflow-auto"
            style={{ background: 'rgba(6,3,4,0.95)' }}
            role="dialog" aria-modal="true" aria-label={alt}
            onClick={() => setZoom(false)}
          >
            <img
              src={CARTE.webp2560}
              alt={alt}
              className="min-w-[1100px] w-full h-auto cursor-zoom-out"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setZoom(false)}
              aria-label={fr ? 'Fermer' : 'Close'}
              className="fixed top-4 right-4 p-3 rounded-full bg-midnight-deep/85 border border-brass/40 text-brass hover:bg-brass hover:text-midnight-deep transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CarteDuSite;
