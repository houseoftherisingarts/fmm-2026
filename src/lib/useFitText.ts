import { useCallback, useEffect, useRef } from 'react';

// ─── useFitText ──────────────────────────────────────────────────────
// RÈGLE (Alex, 2026-08-22) : aucun mot ne doit JAMAIS être coupé sur le
// site. Le hero de Programmation affichait « PROGRAMMAT » : le titre en
// clamp(…, 8.2vw, 5.6rem) débordait sa colonne et le `overflow-hidden`
// du header tranchait la fin du mot.
//
// Le hook ne touche PAS à la taille déclarée : il ne règle qu'un
// facteur `--fit`. L'élément garde son clamp responsive et s'écrit
//
//   font-size: calc(clamp(1.8rem, 8.2vw, 5.6rem) * var(--fit, 1));
//
// Une première version écrasait `font-size` directement : elle effaçait
// du même coup le clamp posé par React, la « taille naturelle » retombait
// à 16 px héritée, et le titre finissait en corps de texte.
//
// `floor` empêche un titre de hero de descendre au rang de paragraphe :
// sous cette valeur on arrête de réduire et on laisse le texte tenir sur
// la largeur disponible plutôt que de le rendre illisible.

export function useFitText<T extends HTMLElement>(deps: unknown = null, floor = 0.42) {
  const ref = useRef<T | null>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--fit', '1');
    const avail = el.clientWidth;
    if (!avail) return;

    let f = 1;
    // scrollWidth > clientWidth : le mot déborde. On descend par pas de
    // 2,5 %. Une quarantaine de passes couvre jusqu'au plancher.
    let guard = 60;
    while (el.scrollWidth > avail + 0.5 && f > floor && guard-- > 0) {
      f *= 0.975;
      el.style.setProperty('--fit', String(f));
    }
  }, [floor]);

  useEffect(() => {
    fit();
    const el = ref.current;
    if (!el) return;
    // On observe le PARENT : observer l'élément lui-même déclenche une
    // boucle (réduire la police change sa hauteur, donc le retaille).
    const ro = new ResizeObserver(fit);
    if (el.parentElement) ro.observe(el.parentElement);
    // Les polices display arrivent après le premier rendu : sans ça, la
    // mesure se fait sur la police de repli et le vrai titre déborde.
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [fit, deps]);

  return { ref, refit: fit };
}
