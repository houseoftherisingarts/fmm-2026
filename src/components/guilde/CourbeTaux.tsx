import React from 'react';
import { ANCRES_TAUX, tauxPour } from '../../firebase/guildeMonnaie';
import type { PointTaux } from '../../firebase/guildes';
import type { Lang } from '../../content';

// ─── Le cours de la pièce ────────────────────────────────────────────
// Une courbe tracée à la main en SVG, sans librairie : trente points au
// plus, un tracé, une aire, et les trois repères de la formule posés en
// filets horizontaux. Le cours monte avec le nombre de membres actifs,
// entre un demi Montpellois et deux. La boîte est large (640 sur 120)
// parce que la carte du cours occupe sept colonnes sur douze depuis le
// 6 septembre 2026 : un tracé étroit étiré aurait grossi les chiffres.

const LARGEUR = 640;
const HAUTEUR = 120;
const MARGE = 6;
const TAUX_MIN = 0.5;
const TAUX_MAX = 2;

const enY = (taux: number): number => {
  const part = (taux - TAUX_MIN) / (TAUX_MAX - TAUX_MIN);
  return HAUTEUR - MARGE - part * (HAUTEUR - MARGE * 2);
};

const CourbeTaux: React.FC<{
  historique: PointTaux[] | undefined;
  tauxActuel: number;
  nbActifs: number;
  lang: Lang;
}> = ({ historique, tauxActuel, nbActifs, lang }) => {
  const fr = lang === 'FR';

  // Un seul jour d'archive ne fait pas une courbe : le point du jour
  // s'ajoute pour que le tracé parte de quelque part.
  const points = (historique || []).slice(-30);
  const serie = points.length >= 2
    ? points
    : [...points, { jour: 'aujourd’hui', taux: tauxActuel, nbActifs }];

  const pas = serie.length > 1 ? (LARGEUR - MARGE * 2) / (serie.length - 1) : 0;
  const coords = serie.map((p, i) => [MARGE + i * pas, enY(p.taux)] as const);
  const trace = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const aire = `${trace} L${(MARGE + (serie.length - 1) * pas).toFixed(1)},${HAUTEUR} L${MARGE},${HAUTEUR} Z`;
  const dernier = coords[coords.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        className="w-full h-auto"
        role="img"
        aria-label={fr
          ? `Le cours de la pièce sur ${serie.length} jours, à ${tauxActuel} Montpellois aujourd’hui.`
          : `The coin rate over ${serie.length} days, at ${tauxActuel} Montpellois today.`}
      >
        <defs>
          <linearGradient id="courbe-taux-aire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--sk-gilt)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--sk-gilt)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ANCRES_TAUX.map((a) => (
          <g key={a.nbActifs}>
            <line
              x1={MARGE} x2={LARGEUR - MARGE} y1={enY(a.taux)} y2={enY(a.taux)}
              stroke="rgba(var(--sk-parchment-rgb),0.16)" strokeWidth="1" strokeDasharray="3 5"
            />
            <text
              x={LARGEUR - MARGE} y={enY(a.taux) - 4} textAnchor="end"
              fill="rgba(var(--sk-parchment-rgb),0.42)"
              style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.18em' }}
            >
              {a.taux}
            </text>
          </g>
        ))}

        <path d={aire} fill="url(#courbe-taux-aire)" />
        <path d={trace} fill="none" stroke="var(--sk-gilt)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {dernier && <circle cx={dernier[0]} cy={dernier[1]} r="4" fill="var(--sk-gilt)" />}
      </svg>

      <p className="font-sans text-[11px] leading-relaxed mt-2" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
        {fr
          ? `Le cours suit le nombre de membres actifs : à dix il vaut ${tauxPour(10)} Montpellois, à quarante il atteint la parité, et à cent soixante il plafonne à ${tauxPour(160)}.`
          : `The rate follows the number of active members: at ten it is worth ${tauxPour(10)} Montpellois, at forty it reaches parity, and at one hundred and sixty it caps at ${tauxPour(160)}.`}
      </p>
    </div>
  );
};

export default CourbeTaux;
