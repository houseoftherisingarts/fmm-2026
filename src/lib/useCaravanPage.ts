import { useEffect } from 'react';

/**
 * Tags <body> with `fmm-caravan-page` for the lifetime of the calling
 * component. The class triggers the global caravan-palette shim in
 * index.css — sections, cards, eyebrows, buttons all re-tone to the
 * velvet/oxblood/copper register used by /marche, so every pillar page
 * accessed through the orb (and the application forms) share the same
 * visual edition without each page needing structural rewrites.
 */
export function useCaravanPage() {
  useEffect(() => {
    document.body.classList.add('fmm-caravan-page');
    return () => { document.body.classList.remove('fmm-caravan-page'); };
  }, []);
}
