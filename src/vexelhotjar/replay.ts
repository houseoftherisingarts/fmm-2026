// ─── L'enregistrement de session (rrweb), chargé seulement pour les
// sessions tirées au sort ──────────────────────────────────────────────────
// rrweb prend une photo du DOM au départ puis note chaque mutation, chaque
// déplacement de souris (échantillonné) et chaque défilement; l'admin rejoue
// la visite dans rrweb-player. Tout ce qui se tape est masqué (les mots de
// passe comme le reste), un élément marqué `data-vh-masquer` voit son texte
// remplacé par des étoiles et `data-vh-bloquer` le fait disparaître du film.
// Les morceaux partent toutes les dix secondes, gzippés, vers /api/vh.

import { record } from '@rrweb/record';

const ENVOI_MS = 10_000;
const PREMIER_ENVOI_MS = 1_500;
const EVENEMENTS_PAR_MORCEAU = 250;
const DUREE_MAX_MS = 20 * 60_000;

export function demarrer(envoyer: (seq: number, events: unknown[]) => void): () => void {
  let tampon: unknown[] = [];
  let seq = 0;
  let minuterie: number | undefined;
  const debut = Date.now();

  const vider = () => {
    if (minuterie !== undefined) { clearTimeout(minuterie); minuterie = undefined; }
    if (!tampon.length) return;
    const morceau = tampon;
    tampon = [];
    envoyer(seq, morceau);
    seq += 1;
  };

  const arreter = record({
    emit(ev) {
      if (Date.now() - debut > DUREE_MAX_MS) { fin(); return; }
      tampon.push(ev);
      if (tampon.length >= EVENEMENTS_PAR_MORCEAU) vider();
      // le premier morceau (la photo du DOM, le plus lourd) part vite, tant que la page vit
      else if (minuterie === undefined) minuterie = window.setTimeout(vider, seq === 0 ? PREMIER_ENVOI_MS : ENVOI_MS);
    },
    maskAllInputs: true,
    maskTextSelector: '[data-vh-masquer]',
    blockSelector: '[data-vh-bloquer], iframe, canvas',
    sampling: { mousemove: 80, scroll: 150, input: 'last', media: 800 },
    checkoutEveryNms: 5 * 60_000,
    inlineStylesheet: true,
    recordCanvas: false,
    collectFonts: false,
  });

  const surCache = () => { if (document.visibilityState === 'hidden') vider(); };
  document.addEventListener('visibilitychange', surCache);
  window.addEventListener('pagehide', vider);

  const fin = () => {
    arreter?.();
    vider();
    document.removeEventListener('visibilitychange', surCache);
    window.removeEventListener('pagehide', vider);
  };
  return fin;
}
