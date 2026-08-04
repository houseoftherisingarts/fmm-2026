import { useEffect } from 'react';

/**
 * Marque <body> avec `fmm-emeraude-page` pour la durée de vie du
 * composant appelant. La classe s'ajoute PAR-DESSUS `fmm-caravan-page`
 * (posée par useCaravanPage) : tout le travail structurel du shim
 * caravane reste actif, seules les couleurs basculent vers l'émeraude.
 * Voir le bloc « Édition Émeraude » dans index.css.
 */
export function useEmeraudePage() {
  useEffect(() => {
    document.body.classList.add('fmm-emeraude-page');
    return () => { document.body.classList.remove('fmm-emeraude-page'); };
  }, []);
}
