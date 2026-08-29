import React, { useEffect, useState } from 'react';

// ─── L'orbe du site, en composant ───────────────────────────────────
// LE grand cercle canon : lueur externe, image Ken Burns, balayage
// lumineux au montage et au survol, vignette interne, verre, et la
// bordure laiton signature. Extrait de PageHeader (Alex, 29 août :
// « le même cercle que partout ailleurs, avec la bordure dorée, la
// bordure et le shine au hover, utilise ça partout »). PageHeader et
// toute page qui pose un grand cercle passent par ici : un seul écrin.

interface Props {
  image:      string;
  position?:  string;
  video?:     string;
  label?:     string;
  className?: string;
}

const Orb: React.FC<Props> = ({ image, position = 'center', video, label, className = '' }) => {
  // Le balayage se rejoue à chaque survol : re-keyer remonte les spans
  // et leur animation CSS repart de zéro (même mécanique que PageHeader).
  const [sweepKey, setSweepKey] = useState(0);
  useEffect(() => { setSweepKey((k) => k + 1); }, []);
  const triggerSweep = () => setSweepKey((k) => k + 1);

  return (
    <div className={`relative aspect-square ${className}`} role={label ? 'img' : undefined} aria-label={label}>
      {/* Lueur chaude externe */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(184, 106, 42, 0.32), rgba(176, 141, 58, 0.18) 40%, transparent 65%)',
          filter: 'blur(55px)',
        }}
      />

      <div
        className="orb-shell relative aspect-square w-full rounded-full overflow-hidden group cursor-pointer"
        onMouseEnter={triggerSweep}
        onFocus={triggerSweep}
        tabIndex={0}
      >
        {video ? (
          <video
            src={video}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover fmm-orb-img-active"
            style={{ objectPosition: position }}
          />
        ) : (
          <div
            className="absolute inset-0 fmm-orb-img-active"
            style={{ backgroundImage: `url(${image})`, backgroundPosition: position, backgroundSize: 'cover' }}
          />
        )}

        {/* Balayage lumineux : au montage et à chaque survol */}
        <div
          key={`sweep-${sweepKey}`}
          aria-hidden
          className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
        >
          <div
            className="fmm-orb-sweep absolute inset-0"
            style={{
              background:
                'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 65%, transparent 100%)',
            }}
          />
          <div
            className="fmm-orb-sweep-2 absolute inset-0"
            style={{
              background:
                'linear-gradient(110deg, transparent 0%, rgba(232, 177, 74, 0.45) 50%, transparent 100%)',
              mixBlendMode: 'screen',
            }}
          />
        </div>

        {/* Vignette interne : fond l'image dans la bordure */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, transparent 55%, rgba(10, 2, 7, 0.7) 100%)',
          }}
        />

        {/* Verre : large reflet radial en haut */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full pointer-events-none fmm-orb-shine"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.06) 40%, rgba(255, 255, 255, 0) 100%)',
            mixBlendMode: 'screen',
          }}
        />

        {/* La bordure laiton et flamme : la signature de l'orbe */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: '1px solid rgba(232, 177, 74, 0.55)',
            boxShadow:
              'inset 0 0 0 5px rgba(10, 2, 7, 0.6),' +
              'inset 0 0 0 6px rgba(176, 141, 58, 0.7),' +
              'inset 0 0 70px rgba(184, 106, 42, 0.22),' +
              '0 0 80px rgba(176, 141, 58, 0.22),' +
              '0 0 200px rgba(107, 31, 31, 0.18),' +
              '0 30px 80px rgba(0, 0, 0, 0.6)',
          }}
        />
      </div>
    </div>
  );
};

export default Orb;
