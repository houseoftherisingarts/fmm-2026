import React from 'react';

// Le petit médaillon rond d'un membre : sa photo si elle existe, sinon
// sa couleur et sa première lettre. Sert aux équipes du clan.
const Medaillon: React.FC<{ nom: string; hue: number | null; url: string | null; taille?: number }> = ({ nom, hue, url, taille = 40 }) => {
  const h = hue ?? 38;
  return url ? (
    <img src={url} alt="" width={taille} height={taille} className="rounded-full object-cover shrink-0"
         style={{ width: taille, height: taille, border: '1px solid rgba(var(--sk-glow-rgb), 0.45)' }} />
  ) : (
    <span aria-hidden className="rounded-full inline-flex items-center justify-center font-display shrink-0"
          style={{ width: taille, height: taille, fontSize: taille * 0.42, color: '#f3e8cf',
                   background: `linear-gradient(135deg, hsl(${h} 45% 32%), hsl(${h} 55% 18%))`,
                   border: '1px solid rgba(var(--sk-glow-rgb), 0.45)' }}>
      {(nom || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
};

export default Medaillon;
