import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { annoncerLecture, ecouterExclusivite } from '../../lib/audioExclusif';
import { formatDuree, type Piste } from '../../firebase/vitrines';

// ─── Le lecteur d'une vitrine de musicien ────────────────────────────
// Un seul élément <audio> pour toute la liste : la piste choisie joue,
// la barre suit, un clic sur une autre piste la remplace. Le lecteur
// respecte le contrat audioExclusif du site : quand il démarre, la
// musique d'ambiance se tait, et l'inverse.

const SOURCE = 'vitrine';

const LecteurPistes: React.FC<{ pistes: Piste[]; fr: boolean }> = ({ pistes, fr }) => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [courante, setCourante] = useState<string | null>(null);
  const [enLecture, setEnLecture] = useState(false);
  const [progres, setProgres] = useState(0);

  useEffect(() => ecouterExclusivite(SOURCE, () => { audio.current?.pause(); }), []);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onTime = () => setProgres(a.duration ? a.currentTime / a.duration : 0);
    const onPlay = () => setEnLecture(true);
    const onPause = () => setEnLecture(false);
    const onEnd = () => {
      // La suivante enchaîne, comme sur un album.
      const i = pistes.findIndex((p) => p.id === courante);
      const suivante = pistes[i + 1];
      if (suivante) jouer(suivante); else setEnLecture(false);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courante, pistes]);

  function jouer(p: Piste) {
    const a = audio.current;
    if (!a) return;
    if (courante === p.id) {
      if (a.paused) { annoncerLecture(SOURCE); a.play().catch(() => {}); } else a.pause();
      return;
    }
    setCourante(p.id);
    setProgres(0);
    a.src = p.url;
    annoncerLecture(SOURCE);
    a.play().catch(() => {});
  }

  function chercher(e: React.MouseEvent<HTMLDivElement>) {
    const a = audio.current;
    if (!a || !a.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
  }

  return (
    <div className="space-y-2">
      <audio ref={audio} preload="none" />
      {pistes.map((p, i) => {
        const active = p.id === courante;
        return (
          <div key={p.id}
               className={`rounded-card border transition ${active ? 'border-brass/60 bg-brass/10' : 'border-white/10 bg-black/25 hover:border-brass/40'}`}>
            <button type="button" onClick={() => jouer(p)}
                    aria-label={`${active && enLecture ? (fr ? 'Pause' : 'Pause') : (fr ? 'Écouter' : 'Play')} : ${p.titre}`}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left">
              <span className="w-10 h-10 rounded-full bg-brass text-midnight-deep flex items-center justify-center shrink-0">
                {active && enLecture ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </span>
              <span className="font-sans text-[13px] text-ivory-soft/70 w-6 shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-editorial text-base text-ivory flex-1 min-w-0 truncate">{p.titre}</span>
              <span className="font-sans text-[13px] text-ivory-soft/80 shrink-0">{formatDuree(p.duree)}</span>
            </button>
            {active && (
              <div role="progressbar" aria-valuenow={Math.round(progres * 100)} aria-valuemin={0} aria-valuemax={100}
                   onClick={chercher} className="mx-4 mb-3 h-1.5 rounded-full bg-white/10 cursor-pointer overflow-hidden">
                <div className="h-full bg-brass transition-[width] duration-200" style={{ width: `${progres * 100}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LecteurPistes;
