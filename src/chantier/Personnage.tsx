import React from 'react';
import {
  COULEUR_RARETE, COULEURS_COIFFURE, TEINTES_PEAU,
  objetParId, type CorpsId, type Emplacement,
} from './objets';

// ─── Le mannequin ───────────────────────────────────────────────────
// Paper-doll 2D dessiné en SVG, en couches : cape, corps, coiffure,
// équipement. Deux silhouettes (A large d'épaules, B plus svelte),
// trois teintes de peau, quatre coiffures, et les pièces du catalogue
// (objets.ts) qui se posent chacune sur son emplacement. Style médiéval
// stylisé : hachures, dégradés métalliques et rivets plutôt que des
// aplats plats (Alex, 2026-08-27 — RÈGLE OUTILS-DESIGN).

export interface PersonnageProps {
  corps: CorpsId;
  peau: number;
  coiffure: number;
  equipe: Partial<Record<Emplacement, string | null>>;
  size?: number;
}

const CX = 100;
const SHOULDER_Y = 68;
const WAIST_Y = 160;
const FOOT_Y = 300;

function measures(corps: CorpsId) {
  return corps === 'A'
    ? { shoulder: 46, waist: 30, hip: 32 }
    : { shoulder: 36, waist: 24, hip: 26 };
}

/** Enveloppe une pièce dans un léger halo pour les objets rares et
 *  légendaires : c'est le seul signal de rareté sur le mannequin, le
 *  cadre coloré fait le reste dans l'inventaire. */
const Piece: React.FC<{ rarete?: 'commune' | 'rare' | 'legendaire'; children: React.ReactNode }> = ({ rarete, children }) => {
  if (!rarete || rarete === 'commune') return <>{children}</>;
  const c = COULEUR_RARETE[rarete];
  return <g style={{ filter: `drop-shadow(0 0 5px ${c})` }}>{children}</g>;
};

const Personnage: React.FC<PersonnageProps> = ({ corps, peau, coiffure, equipe, size = 340 }) => {
  const m = measures(corps);
  const skin = TEINTES_PEAU[peau] ?? TEINTES_PEAU[0];
  const hairColor = COULEURS_COIFFURE[coiffure] ?? COULEURS_COIFFURE[0];

  const casque = objetParId(equipe.tete);
  const torse = objetParId(equipe.torse);
  const jambes = objetParId(equipe.jambes);
  const pieds = objetParId(equipe.pieds);
  const armeD = objetParId(equipe.mainDroite);
  const armeG = objetParId(equipe.mainGauche);
  const cape = objetParId(equipe.cape);
  const amulette = objetParId(equipe.amulette);
  const anneau = objetParId(equipe.anneau);
  const mains = objetParId(equipe.mains);

  const handL = { x: 100 - m.shoulder - 11, y: 182 };
  const handR = { x: 100 + m.shoulder + 11, y: 182 };

  return (
    <svg viewBox="0 0 200 340" width={size} height={size} role="img" aria-label="Personnage">
      <defs>
        <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="transparent" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,0.35)" strokeWidth="1.4" />
        </pattern>
        <pattern id="mailgrid" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="transparent" />
          <circle cx="1" cy="1" r="0.65" fill="rgba(0,0,0,0.4)" />
          <circle cx="5" cy="5" r="0.65" fill="rgba(0,0,0,0.4)" />
        </pattern>
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="35%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="70%" stopColor="rgba(0,0,0,0.20)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.42)" />
        </linearGradient>
      </defs>

      {/* Cape : derrière tout, attachée aux épaules. */}
      {cape && (
        <Piece rarete={cape.rarete}>
          <polygon
            points={`${100 - m.shoulder + 6},${SHOULDER_Y - 2} ${100 + m.shoulder - 6},${SHOULDER_Y - 2} ${100 + m.waist + 16},250 ${100 - m.waist - 16},250`}
            fill={cape.couleur} opacity={0.92}
          />
          <line x1={100} y1={SHOULDER_Y + 6} x2={100} y2="244" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
          {/* Cape étoilée (variante 4) : un semis de petites étoiles sur le tissu de nuit. */}
          {cape.variante === 4 && [
            [86, 100], [116, 92], [100, 130], [78, 160], [124, 170], [100, 210],
          ].map(([sx, sy], i) => (
            <path key={i} d={`M ${sx} ${sy - 2.4} L ${sx + 0.9} ${sy - 0.6} L ${sx + 2.4} ${sy} L ${sx + 0.9} ${sy + 0.6} L ${sx} ${sy + 2.4} L ${sx - 0.9} ${sy + 0.6} L ${sx - 2.4} ${sy} L ${sx - 0.9} ${sy - 0.6} Z`}
                  fill="rgba(244,239,227,0.75)" />
          ))}
        </Piece>
      )}

      {/* Jambes (corps) */}
      <polygon points={`96,${WAIST_Y} ${100 - m.hip},${WAIST_Y} ${100 - m.hip + 6},${FOOT_Y - 4} 90,${FOOT_Y - 4}`} fill={skin} />
      <polygon points={`104,${WAIST_Y} ${100 + m.hip},${WAIST_Y} ${100 + m.hip - 6},${FOOT_Y - 4} 110,${FOOT_Y - 4}`} fill={skin} />
      {jambes && (
        <Piece rarete={jambes.rarete}>
          <polygon points={`97,${WAIST_Y} ${100 - m.hip + 2},${WAIST_Y} ${100 - m.hip + 7},${FOOT_Y - 14} 92,${FOOT_Y - 14}`}
                    fill={jambes.couleur} />
          <polygon points={`97,${WAIST_Y} ${100 - m.hip + 2},${WAIST_Y} ${100 - m.hip + 7},${FOOT_Y - 14} 92,${FOOT_Y - 14}`}
                    fill={jambes.variante === 2 ? 'url(#mailgrid)' : 'url(#hatch)'} />
          <polygon points={`103,${WAIST_Y} ${100 + m.hip - 2},${WAIST_Y} ${100 + m.hip - 7},${FOOT_Y - 14} 108,${FOOT_Y - 14}`}
                    fill={jambes.couleur} />
          <polygon points={`103,${WAIST_Y} ${100 + m.hip - 2},${WAIST_Y} ${100 + m.hip - 7},${FOOT_Y - 14} 108,${FOOT_Y - 14}`}
                    fill={jambes.variante === 2 ? 'url(#mailgrid)' : 'url(#hatch)'} />
        </Piece>
      )}
      {/* Pieds */}
      <ellipse cx={100 - m.hip + 8} cy={FOOT_Y} rx="15" ry="8" fill={pieds ? pieds.couleur : '#4A3420'} />
      <ellipse cx={100 + m.hip - 8} cy={FOOT_Y} rx="15" ry="8" fill={pieds ? pieds.couleur : '#4A3420'} />
      {pieds && (
        <Piece rarete={pieds.rarete}>
          {pieds.variante === 2 && <>
            <circle cx={100 - m.hip + 3} cy={FOOT_Y - 4} r="1.6" fill="rgba(244,239,227,0.7)" />
            <circle cx={100 + m.hip - 3} cy={FOOT_Y - 4} r="1.6" fill="rgba(244,239,227,0.7)" />
          </>}
          {/* Bottes ailées (variante 3) : une petite paire d'ailes à chaque talon. */}
          {pieds.variante === 3 && <>
            <path d={`M ${100 - m.hip - 3} ${FOOT_Y - 2} q -10 -6 -14 -14 q 8 1 12 5 q 4 -6 3 -12 q 5 5 4 13 q 6 -3 10 -1 q -8 6 -15 9 Z`}
                  fill={pieds.couleur} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
            <path d={`M ${100 + m.hip + 3} ${FOOT_Y - 2} q 10 -6 14 -14 q -8 1 -12 5 q -4 -6 -3 -12 q -5 5 -4 13 q -6 -3 -10 -1 q 8 6 15 9 Z`}
                  fill={pieds.couleur} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
          </>}
          <line x1={100 - m.hip + 1} y1={FOOT_Y - 5} x2={100 - m.hip + 15} y2={FOOT_Y - 5} stroke="rgba(0,0,0,0.4)" strokeWidth="1.4" />
          <line x1={100 + m.hip - 1} y1={FOOT_Y - 5} x2={100 + m.hip - 15} y2={FOOT_Y - 5} stroke="rgba(0,0,0,0.4)" strokeWidth="1.4" />
        </Piece>
      )}

      {/* Bras */}
      <polygon points={`${100 - m.shoulder + 6},72 ${100 - m.shoulder - 14},76 ${handL.x - 8},${handL.y - 4} ${100 - m.shoulder + 12},152`} fill={skin} />
      <polygon points={`${100 + m.shoulder - 6},72 ${100 + m.shoulder + 14},76 ${handR.x + 8},${handR.y - 4} ${100 + m.shoulder - 12},152`} fill={skin} />
      <circle cx={handL.x} cy={handL.y} r="9" fill={skin} />
      <circle cx={handR.x} cy={handR.y} r="9" fill={skin} />
      {mains && (
        <Piece rarete={mains.rarete}>
          <circle cx={handL.x} cy={handL.y} r="9.5" fill={mains.couleur} />
          <circle cx={handR.x} cy={handR.y} r="9.5" fill={mains.couleur} />
        </Piece>
      )}
      {anneau && (
        <Piece rarete={anneau.rarete}>
          <circle cx={handR.x + 3} cy={handR.y + 3} r="2.4" fill="none" stroke={anneau.couleur} strokeWidth="1.6" />
        </Piece>
      )}

      {/* Torse (tunique de base, puis armure par-dessus) */}
      <polygon points={`${100 - m.shoulder},${SHOULDER_Y} ${100 + m.shoulder},${SHOULDER_Y} ${100 + m.waist},${WAIST_Y} ${100 - m.waist},${WAIST_Y}`}
                fill="var(--color-ivory-soft)" opacity={0.5} />
      {torse && (
        <Piece rarete={torse.rarete}>
          <polygon points={`${100 - m.shoulder + 2},${SHOULDER_Y} ${100 + m.shoulder - 2},${SHOULDER_Y} ${100 + m.waist},${WAIST_Y} ${100 - m.waist},${WAIST_Y}`}
                    fill={torse.couleur} />
          <polygon points={`${100 - m.shoulder + 2},${SHOULDER_Y} ${100 + m.shoulder - 2},${SHOULDER_Y} ${100 + m.waist},${WAIST_Y} ${100 - m.waist},${WAIST_Y}`}
                    fill={torse.variante === 2 ? 'url(#mailgrid)' : torse.variante === 3 ? 'url(#metal)' : 'url(#hatch)'} />
          <line x1={100} y1={SHOULDER_Y + 4} x2={100} y2={WAIST_Y - 4} stroke="rgba(0,0,0,0.3)" strokeWidth="1.4" />
          {torse.variante === 3 && <>
            <circle cx={100 - m.shoulder + 8} cy={SHOULDER_Y + 6} r="3" fill={torse.couleur} stroke="rgba(0,0,0,0.4)" />
            <circle cx={100 + m.shoulder - 8} cy={SHOULDER_Y + 6} r="3" fill={torse.couleur} stroke="rgba(0,0,0,0.4)" />
            <circle cx={92} cy={130} r="1.6" fill="rgba(244,239,227,0.75)" />
            <circle cx={108} cy={130} r="1.6" fill="rgba(244,239,227,0.75)" />
          </>}
        </Piece>
      )}
      {amulette && (
        <Piece rarete={amulette.rarete}>
          <polygon points="100,96 105,104 100,112 95,104" fill={amulette.couleur} stroke="rgba(0,0,0,0.35)" />
          {/* Amulette de l'œil (variante 2) : une pupille gravée au centre. */}
          {amulette.variante === 2 && <circle cx="100" cy="104" r="1.8" fill="rgba(244,239,227,0.85)" />}
        </Piece>
      )}

      {/* Tête */}
      <circle cx={CX} cy="44" r="19" fill={skin} />
      <circle cx={CX - 6} cy="44" r="1.6" fill="rgba(0,0,0,0.55)" />
      <circle cx={CX + 6} cy="44" r="1.6" fill="rgba(0,0,0,0.55)" />

      {/* Coiffure */}
      {!casque && coiffure === 0 && <ellipse cx={CX} cy="30" rx="19" ry="13" fill={hairColor} />}
      {!casque && coiffure === 1 && <>
        <ellipse cx={CX} cy="30" rx="19" ry="13" fill={hairColor} />
        <rect x={CX - 20} y="30" width="6" height="30" rx="3" fill={hairColor} />
        <rect x={CX + 14} y="30" width="6" height="30" rx="3" fill={hairColor} />
      </>}
      {!casque && coiffure === 2 && <>
        <ellipse cx={CX} cy="31" rx="18" ry="11" fill={hairColor} />
        <circle cx={CX} cy="18" r="6" fill={hairColor} />
      </>}
      {!casque && coiffure === 3 && <>
        <ellipse cx={CX} cy="35" rx="14" ry="10" fill={hairColor} opacity={0.5} />
        <polygon points={`${CX - 3},10 ${CX + 3},10 ${CX + 5},34 ${CX - 5},34`} fill={hairColor} />
      </>}

      {/* Casque */}
      {casque && (
        <Piece rarete={casque.rarete}>
          {casque.variante === 1 && (
            <path d={`M ${CX - 20} 40 A 20 20 0 0 1 ${CX + 20} 40 L ${CX + 15} 58 L ${CX - 15} 58 Z`} fill={casque.couleur} />
          )}
          {casque.variante === 2 && <>
            <path d={`M ${CX - 20} 42 A 20 20 0 0 1 ${CX + 20} 42 L ${CX + 17} 62 L ${CX - 17} 62 Z`} fill={casque.couleur} />
            <path d={`M ${CX - 20} 42 A 20 20 0 0 1 ${CX + 20} 42 L ${CX + 17} 62 L ${CX - 17} 62 Z`} fill="url(#mailgrid)" />
          </>}
          {casque.variante === 3 && <>
            <path d={`M ${CX - 21} 40 A 21 21 0 0 1 ${CX + 21} 40 L ${CX + 17} 56 L ${CX - 17} 56 Z`} fill={casque.couleur} />
            <path d={`M ${CX - 21} 40 A 21 21 0 0 1 ${CX + 21} 40 L ${CX + 17} 56 L ${CX - 17} 56 Z`} fill="url(#metal)" />
            <rect x={CX - 12} y="44" width="24" height="3.5" rx="1.5" fill="rgba(5,2,4,0.85)" />
            <circle cx={CX - 18} cy="42" r="1.6" fill="rgba(244,239,227,0.75)" />
            <circle cx={CX + 18} cy="42" r="1.6" fill="rgba(244,239,227,0.75)" />
          </>}
          {/* Masque du corbeau (variante 4) : cosmétique pur, un bec crochu. */}
          {casque.variante === 4 && <>
            <path d={`M ${CX - 19} 38 A 19 19 0 0 1 ${CX + 19} 38 L ${CX + 15} 50 L ${CX - 15} 50 Z`} fill={casque.couleur} />
            <path d={`M ${CX - 4} 50 Q ${CX} 60 ${CX + 5} 50 Q ${CX} 55 ${CX - 4} 50 Z`} fill={casque.couleur} stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
            <circle cx={CX - 9} cy="40" r="1.4" fill="rgba(216,176,90,0.85)" />
            <circle cx={CX + 9} cy="40" r="1.4" fill="rgba(216,176,90,0.85)" />
          </>}
          {/* Couronne du Parrain (variante 5) : cosmétique légendaire, une couronne à pointes. */}
          {casque.variante === 5 && <>
            <path d={`M ${CX - 18} 34 L ${CX - 12} 22 L ${CX - 6} 32 L ${CX} 18 L ${CX + 6} 32 L ${CX + 12} 22 L ${CX + 18} 34 L ${CX + 16} 42 L ${CX - 16} 42 Z`}
                  fill={casque.couleur} stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
            <circle cx={CX} cy="30" r="1.8" fill="#5B2E2E" />
            <circle cx={CX - 12} cy="34" r="1.3" fill="#5B2E2E" />
            <circle cx={CX + 12} cy="34" r="1.3" fill="#5B2E2E" />
          </>}
          {/* Couronne de fleurs (variante 6) : cosmétique, un cercle de petites fleurs. */}
          {casque.variante === 6 && <>
            <path d={`M ${CX - 20} 40 A 20 20 0 0 1 ${CX + 20} 40 L ${CX + 15} 44 L ${CX - 15} 44 Z`} fill={casque.couleur} opacity={0.85} />
            {[-16, -8, 0, 8, 16].map((dx, i) => (
              <circle key={i} cx={CX + dx} cy={40 - Math.abs(dx) * 0.15} r="2.2" fill={i % 2 === 0 ? '#E9C7D8' : '#F4EFE3'} stroke="rgba(0,0,0,0.25)" strokeWidth="0.5" />
            ))}
          </>}
        </Piece>
      )}

      {/* Bouclier, main gauche */}
      {armeG && (
        <Piece rarete={armeG.rarete}>
          {armeG.variante === 1 ? (
            <>
              <circle cx={handL.x - 6} cy={handL.y + 2} r="16" fill={armeG.couleur} stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
              <circle cx={handL.x - 6} cy={handL.y + 2} r="16" fill="url(#hatch)" />
              <circle cx={handL.x - 6} cy={handL.y + 2} r="5" fill="rgba(0,0,0,0.35)" />
            </>
          ) : (
            <>
              <polygon points={`${handL.x - 6},${handL.y - 20} ${handL.x + 10},${handL.y - 10} ${handL.x + 8},${handL.y + 16} ${handL.x - 6},${handL.y + 26} ${handL.x - 20},${handL.y + 16} ${handL.x - 22},${handL.y - 10}`}
                        fill={armeG.couleur} stroke="rgba(0,0,0,0.4)" />
              <polygon points={`${handL.x - 6},${handL.y - 20} ${handL.x + 10},${handL.y - 10} ${handL.x + 8},${handL.y + 16} ${handL.x - 6},${handL.y + 26} ${handL.x - 20},${handL.y + 16} ${handL.x - 22},${handL.y - 10}`}
                        fill="url(#metal)" />
            </>
          )}
        </Piece>
      )}

      {/* Arme, main droite */}
      {armeD && (
        <Piece rarete={armeD.rarete}>
          {armeD.variante === 1 && <>
            <rect x={handR.x - 2} y={handR.y - 70} width="4" height="60" rx="1.5" fill="url(#metal)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
            <rect x={handR.x - 9} y={handR.y - 12} width="18" height="4" rx="1" fill={armeD.couleur} />
            <rect x={handR.x - 2.5} y={handR.y - 10} width="5" height="14" rx="1.5" fill={armeD.couleur} />
          </>}
          {armeD.variante === 2 && <>
            <rect x={handR.x - 2} y={handR.y - 58} width="4" height="58" rx="1.5" fill="#5C4326" />
            <polygon points={`${handR.x},${handR.y - 66} ${handR.x + 16},${handR.y - 56} ${handR.x + 12},${handR.y - 44} ${handR.x},${handR.y - 48}`}
                      fill={armeD.couleur} stroke="rgba(0,0,0,0.4)" />
          </>}
          {armeD.variante === 3 && <>
            <rect x={handR.x - 2} y={handR.y - 76} width="4" height="76" rx="2" fill="#4A3420" />
            <circle cx={handR.x} cy={handR.y - 78} r="5" fill={armeD.couleur} />
          </>}
          {/* Épée de lune (variante 4) : lame courbe, un joyau serti au pommeau. */}
          {armeD.variante === 4 && <>
            <path d={`M ${handR.x} ${handR.y - 12} Q ${handR.x + 14} ${handR.y - 45} ${handR.x + 3} ${handR.y - 72}`}
                  fill="none" stroke={armeD.couleur} strokeWidth="4.5" strokeLinecap="round" />
            <path d={`M ${handR.x} ${handR.y - 12} Q ${handR.x + 14} ${handR.y - 45} ${handR.x + 3} ${handR.y - 72}`}
                  fill="none" stroke="url(#metal)" strokeWidth="4.5" strokeLinecap="round" />
            <path d={`M ${handR.x} ${handR.y - 12} Q ${handR.x + 14} ${handR.y - 45} ${handR.x + 3} ${handR.y - 72}`}
                  fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
            <rect x={handR.x - 9} y={handR.y - 12} width="18" height="4" rx="1" fill={armeD.couleur} />
            <rect x={handR.x - 2.5} y={handR.y - 10} width="5" height="12" rx="1.5" fill={armeD.couleur} />
            <circle cx={handR.x} cy={handR.y + 3} r="2.2" fill="#B9C6E0" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
          </>}
        </Piece>
      )}
    </svg>
  );
};

export default Personnage;
