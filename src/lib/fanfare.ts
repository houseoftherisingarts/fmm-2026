// ─── La fanfare de succès ────────────────────────────────────────────
// Le son de succès du Witcher, exactement celui du Coffre des Inconnus
// et du Quest Book (ordre d'Alex, 2026-08-23) : le même geste doit
// sonner pareil dans toutes ses applications. Le fichier vient de
// `quest-grimoire/public/sounds/quest-complete.mp3`.

const PISTE = '/sons/succes.mp3';

let audio: HTMLAudioElement | null = null;
let deverrouille = false;

/**
 * Le son du badge doit partir tout seul, sans jamais demander la
 * permission (Alex, 2026-08-28). Les navigateurs refusent le son tant
 * que la personne n'a rien touché, alors le tout premier geste sur le
 * site sert d'autorisation : la piste part en muet, puis se remet à
 * zéro. Le badge qui tombe ensuite sonne pour de bon.
 */
export function preparerLeSon(): void {
  if (typeof window === 'undefined' || deverrouille) return;
  const ouvrir = () => {
    deverrouille = true;
    try {
      if (!audio) { audio = new Audio(PISTE); audio.preload = 'auto'; }
      const avant = audio.volume;
      audio.volume = 0;
      void audio.play().then(() => {
        audio?.pause();
        if (audio) { audio.currentTime = 0; audio.volume = avant; }
      }).catch(() => { /* le navigateur boude encore, le prochain geste réessaiera */ });
    } catch { /* pas de son, tant pis */ }
    retirer();
  };
  const retirer = () => {
    window.removeEventListener('pointerdown', ouvrir);
    window.removeEventListener('keydown', ouvrir);
    window.removeEventListener('touchstart', ouvrir);
  };
  window.addEventListener('pointerdown', ouvrir, { once: false });
  window.addEventListener('keydown', ouvrir, { once: false });
  window.addEventListener('touchstart', ouvrir, { once: false });
}

function jouer(volume: number) {
  if (typeof window === 'undefined') return;
  try {
    if (!audio) {
      audio = new Audio(PISTE);
      audio.preload = 'auto';
    }
    audio.currentTime = 0;
    audio.volume = volume;
    void audio.play().catch(() => { /* le navigateur attend un geste */ });
  } catch { /* pas de son, tant pis */ }
}

/** Un badge gagné. */
export function sonnerBadge() { jouer(0.55); }

/** Une collection complétée : le même son, plein volume. */
export function sonnerFanfare() { jouer(0.9); }
