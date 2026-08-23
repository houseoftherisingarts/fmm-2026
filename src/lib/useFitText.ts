import { useCallback, useEffect, useRef, useState } from 'react';

// ─── useFitText ──────────────────────────────────────────────────────
// RÈGLE (Alex, 2026-08-22) : aucun mot ne doit JAMAIS être coupé sur le
// site. Le hero de Programmation affichait « PROGRAMMAT » : le titre en
// clamp(…, 8.2vw, 5.6rem) débordait sa colonne et le `overflow-hidden`
// du header tranchait la fin du mot.
//
// Une taille en vw ne sait rien de la largeur réelle de sa colonne ni de
// la longueur du mot. Ce hook mesure : il réduit la police jusqu'à ce
// que le texte tienne, puis s'arrête. Il se recalcule au redimensionnement
// et quand le texte change (changement de langue).
//
// Usage :
//   const { ref, style } = useFitText<HTMLHeadingElement>(titre);
//   <h1 ref={ref} style={{ ...style, fontSize: 'clamp(...)' }}>…
// Le hook écrase fontSize seulement s'il doit rétrécir.

export function useFitText<T extends HTMLElement>(deps: unknown = null, minPx = 18) {
  const ref = useRef<T | null>(null);
  const [scale, setScale] = useState(1);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // On repart toujours de la taille naturelle : sinon deux passes de
    // suite rétréciraient en cascade sans jamais regrossir.
    el.style.removeProperty('font-size');
    const natural = parseFloat(getComputedStyle(el).fontSize) || 16;
    const avail = el.clientWidth;
    if (!avail) return;

    let size = natural;
    // scrollWidth > clientWidth : ça déborde. On descend par pas de 2 %.
    // Une trentaine de passes couvre une réduction jusqu'à ~55 %.
    let guard = 40;
    while (el.scrollWidth > avail + 0.5 && size > minPx && guard-- > 0) {
      size *= 0.97;
      el.style.fontSize = `${size}px`;
    }
    setScale(size / natural);
  }, [minPx]);

  useEffect(() => {
    fit();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    // Les polices display arrivent après le premier rendu : sans ça, la
    // mesure se fait sur la police de repli et le vrai titre déborde.
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [fit, deps]);

  return { ref, scale, refit: fit };
}
