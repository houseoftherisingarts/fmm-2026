import React from 'react';
import { ANCRES_TAUX, tauxPour } from '../../firebase/guildeMonnaie';
import type { PointTaux } from '../../firebase/guildes';
import type { Lang } from '../../content';

// ─── Le cours de la pièce ────────────────────────────────────────────
// Une courbe tracée à la main en SVG, sans librairie : trente points au
// plus, un tracé, une aire, et les trois repères de la formule posés en
// filets horizontaux. Le cours monte avec le nombre de membres actifs,
// entre un demi Montpellois et deux.
//
// Le tracé s'étire sur toute la largeur de la carte à hauteur fixe
// (preserveAspectRatio « none », traits à épaisseur constante), et les
// repères sont écrits en HTML par-dessus : ainsi les chiffres gardent la
// même taille sur sept colonnes de bureau comme sur un téléphone.

const LARGEUR = 100;
const HAUTEUR = 100;
const HAUT = 8;
const BAS = 6;
const TAUX_MIN = 0.5;
const TAUX_MAX = 2;

/** La hauteur d'un cours, en pour cent depuis le haut. */
const enY = (taux: number): number => {
  const part = (taux - TAUX_MIN) / (TAUX_MAX - TAUX_MIN);
  return HAUTEUR - BAS - part * (HAUTEUR - BAS - HAUT);
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

  const pas = serie.length > 1 ? LARGEUR / (serie.length - 1) : 0;
  const coords = serie.map((p, i) => [i * pas, enY(p.taux)] as const);
  const trace = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const aire = `${trace} L${((serie.length - 1) * pas).toFixed(2)},${HAUTEUR} L0,${HAUTEUR} Z`;
  const dernier = coords[coords.length - 1];

  return (
    <div>
      <div className="relative h-24 md:h-32">
        <svg
          viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
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
            <line
              key={a.nbActifs}
              x1={0} x2={LARGEUR} y1={enY(a.taux)} y2={enY(a.taux)}
              stroke="rgba(var(--sk-parchment-rgb),0.16)" strokeWidth="1" strokeDasharray="3 5"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={aire} fill="url(#courbe-taux-aire)" />
          <path
            d={trace} fill="none" stroke="var(--sk-gilt)" strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Les repères, en HTML pour rester lisibles à toute largeur */}
        {ANCRES_TAUX.map((a) => (
          <span
            key={a.nbActifs}
            aria-hidden
            className="absolute right-0 font-sans text-[9px] tracking-[0.18em] -translate-y-full pb-0.5"
            style={{ top: `${enY(a.taux)}%`, color: 'rgba(var(--sk-parchment-rgb),0.42)' }}
          >
            {a.taux}
          </span>
        ))}

        {/* Le point du jour */}
        {dernier && (
          <span
            aria-hidden
            className="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${dernier[0]}%`, top: `${dernier[1]}%`, background: 'var(--sk-gilt)', boxShadow: '0 0 10px rgba(var(--sk-gilt-rgb),0.7)' }}
          />
        )}
      </div>

      <p className="font-sans text-[11px] leading-relaxed mt-2" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
        {fr
          ? `Le cours suit le nombre de membres actifs : à dix il vaut ${tauxPour(10)} Montpellois, à quarante il atteint la parité, et à cent soixante il plafonne à ${tauxPour(160)}.`
          : `The rate follows the number of active members: at ten it is worth ${tauxPour(10)} Montpellois, at forty it reaches parity, and at one hundred and sixty it caps at ${tauxPour(160)}.`}
      </p>
    </div>
  );
};

export default CourbeTaux;
