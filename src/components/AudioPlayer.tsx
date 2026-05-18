import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { UI } from '../content';

// Compact header audio player — clones the Wix nav widget that loops
// "Freyja — Mystic Projekt" in the background. Source URL + title come
// from env (`VITE_AUDIO_TRACK_URL` + `VITE_AUDIO_TRACK_TITLE`); leave
// the URL empty to hide the player.
const AudioPlayer: React.FC = () => {
  const { lang } = useUI();
  const url   = import.meta.env.VITE_AUDIO_TRACK_URL;
  const title = import.meta.env.VITE_AUDIO_TRACK_TITLE || 'FMM';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.4;
  }, []);

  if (!url) {
    // No track configured — render a non-interactive placeholder so the
    // header layout stays balanced. Drop a file in /public/audio and set
    // VITE_AUDIO_TRACK_URL to enable playback.
    return (
      <div className="hidden md:flex items-center gap-3 opacity-50">
        <div className="w-8 h-8 rounded-full glass-frost flex items-center justify-center">
          <Play size={12} className="text-ivory-soft translate-x-px" />
        </div>
        <span className="font-editorial italic text-xs text-ivory-soft tracking-wide">
          {title}
        </span>
      </div>
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
