import { useEffect, useState } from 'react';

/** Les quatre peaux du site. « rouge » est la palette d'origine. */
export type SkinActif = 'rouge' | 'bleu' | 'vert' | 'dore';

function lireSkin(): SkinActif {
  if (typeof document === 'undefined') return 'rouge';
  const c = document.documentElement.classList;
  if (c.contains('skin-bleu')) return 'bleu';
  if (c.contains('skin-dore')) return 'dore';
  if (c.contains('skin-vert')) return 'vert';
  return 'rouge';
}

/**
 * La peau active, lue sur <html>.
 *
 * usePrefsFond.ts pose la classe (skin-bleu, skin-vert, skin-dore) au
 * premier rendu depuis localStorage, puis la corrige quand Firestore
 * répond. Un MutationObserver suffit donc à suivre les deux moments,
 * sans faire remonter la préférence dans un contexte React.
 */
export function useSkinActif(): SkinActif {
  const [skin, setSkin] = useState<SkinActif>(lireSkin);

  useEffect(() => {
    setSkin(lireSkin());
    const obs = new MutationObserver(() => setSkin(lireSkin()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return skin;
}
