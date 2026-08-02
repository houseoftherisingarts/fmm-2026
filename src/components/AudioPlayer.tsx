import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { UI } from '../content';

// Musique d'ambiance du thème « Caravanes et Saltimbanques ».
// Piste : Gypsy Shoegazer (No Voices) de Kevin MacLeod, CC BY
// (incompetech.com), hébergée dans /public/audio et jouée en boucle par
// le lecteur ci-dessous (VITE_AUDIO_TRACK_URL). Le crédit visible vit
// dans le titre du chip; détail licence : public/audio/CREDITS.txt.
// La piste rêvée d'Alex (Gypsy Caravan, Derek & Brandon Fiechter) est
// protégée : on ne peut pas l'héberger sans licence. Le lien Spotify
// ci-dessous reste le repli si jamais l'URL locale est vidée.
const SPOTIFY_LINK  = 'https://open.spotify.com/search/Gypsy%20Caravan%20Derek%20Brandon%20Fiechter';
const SPOTIFY_TITLE = 'Gypsy Caravan · D&B Fiechter';

// Compact header audio chip. If `VITE_AUDIO_TRACK_URL` points to a
// local audio file it becomes a real loop player; otherwise it links
// out to the theme track on Spotify.
const AudioPlayer: React.FC = () => {
  const { lang } = useUI();
  const url   = import.meta.env.VITE_AUDIO_TRACK_URL;
  const title = import.meta.env.VITE_AUDIO_TRACK_TITLE || SPOTIFY_TITLE;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.4;
  }, []);

  if (!url) {
    // Pas de fichier local : le chip ouvre la piste-thème sur Spotify.
    return (
      <a
        href={SPOTIFY_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden md:flex items-center gap-3 opacity-70 hover:opacity-100 transition group"
        aria-label={`${title} (Spotify)`}
      >
        <span className="w-8 h-8 rounded-full glass-frost flex items-center justify-center group-hover:border-brass transition">
          <Play size={12} className="text-ivory-soft translate-x-px group-hover:text-brass transition" />
        </span>
        <span className="font-editorial italic text-xs text-ivory-soft tracking-wide max-w-[200px] truncate group-hover:text-ivory transition">
          {title}
        </span>
      </a>
    );
  }

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  return (
    <div className="hidden md:flex items-center gap-3">
      <audio ref={audioRef} src={url} loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? UI[lang].pause : UI[lang].play}
        className="w-8 h-8 rounded-full glass-frost flex items-center justify-center hover:border-brass transition group"
      >
        {playing ? (
          <Pause size={12} className="text-ivory group-hover:text-brass transition" />
        ) : (
          <Play size={12} className="text-ivory translate-x-px group-hover:text-brass transition" />
        )}
      </button>
      <span className="font-editorial italic text-xs text-ivory-soft tracking-wide max-w-[180px] truncate">
        {title}
      </span>
    </div>
  );
};

export default AudioPlayer;
