import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Music, VolumeX } from 'lucide-react';
import { annoncerLecture, ecouterExclusivite } from '../../lib/audioExclusif';

// ─── La musique d'un jeu ────────────────────────────────────────────
// Une seule piste tourne à la fois sur le site : le registre d'exclusivité
// coupe les autres dès qu'un jeu prend la parole.

export interface BoutonMusiqueHandle {
  /** Lance la piste si elle ne joue pas déjà. Appelé au premier vrai
   *  geste de la personne, donc le navigateur autorise le son. */
  demarrer(): void;
}

const BoutonMusique = forwardRef<BoutonMusiqueHandle, {
  cle: string;
  url: string;
  titre: string;
  onLabel: string;
  offLabel: string;
  className?: string;
}>(({ cle, url, titre, onLabel, offLabel, className = '' }, ref) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [joue, setJoue] = useState(false);

  useEffect(() => ecouterExclusivite(cle, () => {
    audioRef.current?.pause();
    setJoue(false);
  }), [cle]);

  const jouer = () => {
    const a = audioRef.current;
    if (!a || joue) return;
    annoncerLecture(cle);
    a.volume = 0.28;
    a.play().then(() => setJoue(true)).catch(() => setJoue(false));
  };

  useImperativeHandle(ref, () => ({ demarrer: jouer }), [joue]);

  const basculer = () => {
    const a = audioRef.current;
    if (!a) return;
    if (joue) { a.pause(); setJoue(false); return; }
    jouer();
  };

  return (
    <>
      <audio ref={audioRef} src={url} loop preload="none" />
      <button
        type="button"
        onClick={basculer}
        title={titre}
        aria-pressed={joue}
        className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[40px] rounded-[15px] border border-white/15 bg-black/45 backdrop-blur-md transition-colors duration-200 font-sans text-[10px] uppercase tracking-[0.18em] ${
          joue ? 'text-ivory border-brass/50' : 'text-ivory-soft hover:text-ivory hover:border-brass/50'
        } ${className}`}
      >
        {joue ? <VolumeX size={12} /> : <Music size={12} />}
        <span className="hidden sm:inline">{joue ? onLabel : offLabel}</span>
      </button>
    </>
  );
});

BoutonMusique.displayName = 'BoutonMusique';
export default BoutonMusique;
