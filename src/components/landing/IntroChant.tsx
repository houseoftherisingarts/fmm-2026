import React, { useEffect, useRef, useState } from 'react';
import { annoncerLecture, ecouterExclusivite } from '../../lib/audioExclusif';

// ─── Le chant du prologue ────────────────────────────────────────────
// Un bouton discret en bas à gauche de l'intro : le visiteur décide
// d'ajouter un chant grégorien sous les images. Silence par défaut,
// jamais de lecture automatique (les navigateurs la bloquent, et une
// page qui chante sans prévenir se fait fermer).
//
// Piste : « Virtutes Vocis » de Kevin MacLeod (incompetech.com), chant
// grégorien sacré du XIe siècle, sombre et calme. Licence CC BY 4.0,
// la même que Master of the Feast déjà en place. L'attribution exigée
// est portée par l'infobulle du bouton et par public/audio/CREDITS.txt.
//
// 🚨 Le chant se tait dès que le film prend la main (`visible` passe à
// faux) : deux bandes sonores en même temps, c'est une bouillie.
// L'entrée sur le site démonte l'intro, donc le chant s'arrête aussi.

const CHANT_URL = '/audio/virtutes-vocis.mp3';
const CHANT_TITRE = 'Virtutes Vocis · Kevin MacLeod';
const VOLUME = 0.32;

const IntroChant: React.FC<{
  visible: boolean;
  silver: string;
  fontAlt: string;
}> = ({ visible, silver, fontAlt }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [chante, setChante] = useState(false);

  // Une autre source démarre : le chant se tait.
  useEffect(() => ecouterExclusivite('chant', () => {
    audioRef.current?.pause();
    setChante(false);
  }), []);

  // Le film arrive : le chant se tait.
  useEffect(() => {
    if (visible) return;
    audioRef.current?.pause();
    setChante(false);
  }, [visible]);

  // Fondu d'entrée : un chant qui démarre à plein volume fait sursauter.
  const basculer = () => {
    const a = audioRef.current;
    if (!a) return;
    if (chante) {
      a.pause();
      setChante(false);
      return;
    }
    annoncerLecture('chant');
    a.volume = 0;
    a.play()
      .then(() => {
        setChante(true);
        const debut = performance.now();
        const monter = () => {
          const t = Math.min(1, (performance.now() - debut) / 1600);
          a.volume = VOLUME * t;
          if (t < 1 && !a.paused) requestAnimationFrame(monter);
        };
        requestAnimationFrame(monter);
      })
      .catch(() => setChante(false));
  };

  if (!visible) return null;

  return (
    <>
      <audio ref={audioRef} src={CHANT_URL} loop preload="none" />
      <button
        type="button"
        onClick={basculer}
        title={CHANT_TITRE}
        aria-pressed={chante}
        aria-label={chante ? 'Arrêter le chant' : 'Faire jouer un chant grégorien'}
        className="absolute left-4 bottom-4 z-[90] inline-flex min-h-[44px] items-center gap-2.5 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.22em] backdrop-blur-sm outline-none transition-colors focus-visible:ring-2"
        style={{
          border: `1px solid ${silver}${chante ? 'AA' : '55'}`,
          color: chante ? '#E6ECF3' : 'rgba(232,236,243,0.72)',
          background: 'rgba(8,10,16,0.42)',
          fontFamily: fontAlt,
        }}
      >
        {chante ? (
          // Onde sonore : le chant court.
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={silver} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M19 5a9 9 0 0 1 0 14" />
          </svg>
        ) : (
          // Note : le chant dort.
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={silver} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        )}
        <span className="hidden sm:inline">{chante ? 'Chant en cours' : 'Ajouter le chant'}</span>
      </button>
    </>
  );
};

export default IntroChant;
