import { useEffect } from 'react';

/**
 * Tags <body> with `fmm-caravan-page` for the lifetime of the calling
 * component. The class triggers the global caravan-palette shim in
 * index.css: sections, cards, eyebrows, buttons all re-tone to the
 * velvet/oxblood/copper register used by /marche, so every pillar page
 * accessed through the orb (and the application forms) share the same
 * visual edition without each page needing structural rewrites.
 */
export function useCaravanPage() {
  useEffect(() => {
    // Une page peut en ouvrir une autre en repli (le Marché ouvre la
    // Nourriture) : on compte les porteurs pour ne pas retirer la
    // classe sous les pieds de l'autre.
    const n = Number(document.body.dataset.caravane || '0') + 1;
    document.body.dataset.caravane = String(n);
    document.body.classList.add('fmm-caravan-page');
    return () => {
      const reste = Number(document.body.dataset.caravane || '1') - 1;
      document.body.dataset.caravane = String(Math.max(0, reste));
      if (reste <= 0) document.body.classList.remove('fmm-caravan-page');
    };
  }, []);

  useSectionsVivantes();
}

/**
 * Chaque section arrive en fondu et porte sa brume au raccord.
 *
 * Alex l'a demandé deux fois : le site ne doit pas défiler comme un
 * document. Un observateur pose la classe quand la section entre dans
 * l'écran; sans JavaScript, rien n'est caché (l'état d'attente n'est
 * posé QUE par le hook, jamais par la feuille de style seule).
 */
export function useSectionsVivantes() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('main section, section'))
      .filter((el): el is HTMLElement => el instanceof HTMLElement)
      .filter((el) => !el.dataset.sansFondu);
    if (sections.length === 0) return;

    const doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doux) return;

    sections.forEach((el) => el.classList.add('fmm-section-attente'));

    const obs = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('fmm-section-vue');
          obs.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.04 },
    );
    sections.forEach((el) => obs.observe(el));

    // Filet : ce qui est déjà à l'écran s'allume tout de suite.
    const t = window.setTimeout(() => {
      sections.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('fmm-section-vue');
      });
    }, 60);

    return () => { window.clearTimeout(t); obs.disconnect(); };
  }, []);
}
