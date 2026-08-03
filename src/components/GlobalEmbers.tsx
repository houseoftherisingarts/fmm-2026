import React from 'react';
import { useLocation } from 'react-router-dom';
import EmberCanvas from './vendor/EmberCanvas';

// ─── Braises, couche globale ────────────────────────────────────────
// Un seul champ de braises pour tout le site, monté une fois dans le
// routeur. Avant, il fallait le poser section par section : chaque
// nouvelle page repartait sans, et Alex retombait sur des pages mortes.
//
// La couche est FIXE sur la fenêtre et se pose PAR-DESSUS le contenu,
// en `mix-blend-mode: screen`. C'est le seul placement qui tient sur
// toutes les pages : beaucoup de sections portent un fond opaque, donc
// une couche posée derrière serait masquée par la moitié du site. Les
// braises sont de la lumière additive : par-dessus, elles se lisent
// comme des étincelles qui flottent devant la scène, jamais comme un
// voile. Opacité basse et `pointer-events: none` pour qu'elles ne
// gênent ni la lecture ni le clic.
//
// z-index 30 : au-dessus du contenu, sous la barre de navigation (40)
// et sous les modales (50).

/** Routes qui portent déjà leur propre feu, ou qui n'en veulent pas. */
function skipEmbers(pathname: string): boolean {
  // L'admin est un tableau de bord : pas de décor.
  if (pathname.startsWith('/admin')) return true;
  // L'accueil-orbe a sa flamme vidéo et son propre champ de braises.
  if (pathname === '/' || pathname === '/en') return true;
  return false;
}

const GlobalEmbers: React.FC = () => {
  const { pathname } = useLocation();
  if (skipEmbers(pathname)) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 30, mixBlendMode: 'screen' }}
    >
      <EmberCanvas className="opacity-55" count={26} />
    </div>
  );
};

export default GlobalEmbers;
