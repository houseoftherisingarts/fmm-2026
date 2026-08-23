// ─── La fanfare de succès ────────────────────────────────────────────
// Le son de succès du Witcher, exactement celui du Coffre des Inconnus
// et du Quest Book (ordre d'Alex, 2026-08-23) : le même geste doit
// sonner pareil dans toutes ses applications. Le fichier vient de
// `quest-grimoire/public/sounds/quest-complete.mp3`.

const PISTE = '/sons/succes.mp3';

let audio: HTMLAudioElement | null = null;

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
