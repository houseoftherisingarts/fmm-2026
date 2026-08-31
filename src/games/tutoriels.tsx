// ─── Les visites guidées des quatre jeux ────────────────────────────
// Alex, 2026-08-31 : chaque jeu a son bouton « Tutoriel » et une suite
// d'étapes en surimpression. Le contenu vit ici, en pur déclaratif; le
// composant qui les affiche vit à côté, dans Tutoriel.tsx.
//
// Rien n'est inventé : chaque étape reprend le règlement déjà écrit
// dans la page du jeu (les sections « règles » de chaque index.tsx).
// Quand une étape montre un coup, elle le montre sur un vrai plateau
// dessiné à partir de la géométrie du jeu (les mêmes POSITIONS et les
// mêmes ARETES que la scène 3D), pas sur un croquis approximatif : la
// visite s'ouvre avant que la partie ne commence, donc la table en
// trois dimensions n'existe pas encore.

import React from 'react';
import { ARETES, LIGNES, POSITIONS } from './merelle/logic';
import { PAS, POINTS, pointDe } from './renard/logic';

export type JeuTutoriel = 'hnefatafl' | 'merelle' | 'renard' | 'tarot';

export interface EtapeTutoriel {
  titre: string;
  /** Deux ou trois phrases, jamais plus : la carte se lit d'un souffle. */
  corps: string;
  /** La zone à mettre en évidence, marquée dans la page par
   *  `data-tuto="<nom>"`. Absente ou introuvable, la carte se centre. */
  ancre?: string;
  /** Le petit plateau dessiné dans la carte, quand l'étape montre un coup. */
  schema?: React.ReactNode;
}

// ── La palette des schémas, celle du site ───────────────────────────
const BOIS = '#6b4a29';
const BOIS_CLAIR = '#8a6236';
const GRAVURE = '#2a1809';
const LAITON = '#E8B14A';
const IVOIRE = '#F4EFE3';
const VERT = '#2AB964';
const OXBLOOD = '#A6392B';
const ROUX = '#B5551D';

/** Le cadre commun : une planche de bois, un liseré, et le dessin
 *  dedans. Les trois plateaux passent par ici. */
const Planchette: React.FC<{ children: React.ReactNode; legende?: string }> = ({ children, legende }) => (
  <figure className="mt-4 mb-1">
    <svg viewBox="0 0 120 120" className="w-full max-w-[13.5rem] mx-auto block" role="img" aria-hidden>
      <defs>
        <linearGradient id="tuto-bois" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BOIS_CLAIR} />
          <stop offset="100%" stopColor={BOIS} />
        </linearGradient>
        <filter id="tuto-lueur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="flou" />
          <feMerge><feMergeNode in="flou" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x="0" y="0" width="120" height="120" rx="8" fill="url(#tuto-bois)" />
      <rect x="3.5" y="3.5" width="113" height="113" rx="6" fill="none" stroke={GRAVURE} strokeOpacity="0.55" strokeWidth="1.2" />
      {children}
    </svg>
    {legende && (
      <figcaption className="mt-2 text-center font-sans text-[10px] uppercase tracking-[0.18em] text-ivory-soft/55">
        {legende}
      </figcaption>
    )}
  </figure>
);

// ── Le plateau de mérelle ───────────────────────────────────────────
const merelleXY = (p: number): [number, number] => {
  const [x, z] = POSITIONS[p];
  return [60 + x * 15, 60 + z * 15];
};

const MiniMerelle: React.FC<{
  clairs?: readonly number[];
  sombres?: readonly number[];
  moulin?: readonly number[];
  cibles?: readonly number[];
  legende?: string;
}> = ({ clairs = [], sombres = [], moulin, cibles = [], legende }) => (
  <Planchette legende={legende}>
    {ARETES.map(([a, b], i) => {
      const [ax, ay] = merelleXY(a);
      const [bx, by] = merelleXY(b);
      return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke={GRAVURE} strokeOpacity="0.8" strokeWidth="1.4" strokeLinecap="round" />;
    })}
    {POSITIONS.map((_, p) => {
      const [x, y] = merelleXY(p);
      return <circle key={p} cx={x} cy={y} r="2.4" fill={GRAVURE} fillOpacity="0.55" />;
    })}
    {moulin && (() => {
      const [ax, ay] = merelleXY(moulin[0]);
      const [bx, by] = merelleXY(moulin[moulin.length - 1]);
      return <line x1={ax} y1={ay} x2={bx} y2={by} stroke={LAITON} strokeWidth="3.4" strokeLinecap="round" opacity="0.85" filter="url(#tuto-lueur)" />;
    })()}
    {cibles.map((p) => {
      const [x, y] = merelleXY(p);
      return <circle key={`c${p}`} cx={x} cy={y} r="6" fill={VERT} fillOpacity="0.35" stroke={VERT} strokeWidth="1.2" />;
    })}
    {clairs.map((p) => {
      const [x, y] = merelleXY(p);
      return <circle key={`a${p}`} cx={x} cy={y} r="6.4" fill="#D9B681" stroke={GRAVURE} strokeOpacity="0.6" strokeWidth="1" />;
    })}
    {sombres.map((p) => {
      const [x, y] = merelleXY(p);
      return <circle key={`b${p}`} cx={x} cy={y} r="6.4" fill="#452A18" stroke="#1b0f06" strokeWidth="1" />;
    })}
  </Planchette>
);

// ── Le plateau du renard ────────────────────────────────────────────
const renardXY = (i: number): [number, number] => {
  const { r, c } = POINTS[i];
  return [12 + c * 16, 12 + r * 16];
};

const ARETES_RENARD: Array<[number, number]> = (() => {
  const vues = new Set<string>();
  const liste: Array<[number, number]> = [];
  POINTS.forEach((p, i) => {
    for (const { dr, dc } of PAS) {
      const v = pointDe(p.r + dr, p.c + dc);
      if (v < 0) continue;
      const cle = i < v ? `${i}-${v}` : `${v}-${i}`;
      if (vues.has(cle)) continue;
      vues.add(cle);
      liste.push([i, v]);
    }
  });
  return liste;
})();

const MiniRenard: React.FC<{
  renard: number;
  oies: readonly number[];
  saut?: readonly [number, number];
  prise?: number;
  legende?: string;
}> = ({ renard, oies, saut, prise, legende }) => (
  <Planchette legende={legende}>
    {ARETES_RENARD.map(([a, b], i) => {
      const [ax, ay] = renardXY(a);
      const [bx, by] = renardXY(b);
      return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke={GRAVURE} strokeOpacity="0.75" strokeWidth="1.2" strokeLinecap="round" />;
    })}
    {POINTS.map((_, i) => {
      const [x, y] = renardXY(i);
      return <circle key={i} cx={x} cy={y} r="2" fill={GRAVURE} fillOpacity="0.5" />;
    })}
    {saut && (() => {
      const [ax, ay] = renardXY(saut[0]);
      const [bx, by] = renardXY(saut[1]);
      return (
        <path
          d={`M ${ax} ${ay} Q ${(ax + bx) / 2} ${Math.min(ay, by) - 15} ${bx} ${by}`}
          fill="none" stroke={LAITON} strokeWidth="2.2" strokeDasharray="4 3" strokeLinecap="round" filter="url(#tuto-lueur)"
        />
      );
    })()}
    {oies.map((i) => {
      const [x, y] = renardXY(i);
      const emportee = i === prise;
      return (
        <g key={`o${i}`} opacity={emportee ? 0.45 : 1}>
          <circle cx={x} cy={y} r="5.4" fill="#F6F1E4" stroke={GRAVURE} strokeOpacity="0.5" strokeWidth="1" />
          {emportee && (
            <path d={`M ${x - 3.4} ${y - 3.4} L ${x + 3.4} ${y + 3.4} M ${x + 3.4} ${y - 3.4} L ${x - 3.4} ${y + 3.4}`}
                  stroke={OXBLOOD} strokeWidth="1.8" strokeLinecap="round" />
          )}
        </g>
      );
    })}
    {(() => {
      const [x, y] = renardXY(renard);
      return <circle cx={x} cy={y} r="6.4" fill={ROUX} stroke="#2a1006" strokeWidth="1" />;
    })()}
  </Planchette>
);

// ── Le damier du tafl ───────────────────────────────────────────────
// Onze cases de côté, le damier de Copenhague, celui que la table
// dresse par défaut. Le schéma reste juste pour les autres règlements :
// tous ont leurs quatre coins et leur trône au centre.
const TAFL_N = 11;
const taflXY = (r: number, c: number): [number, number] => [10 + c * 10, 10 + r * 10];

const MiniTafl: React.FC<{ legende?: string }> = ({ legende }) => (
  <Planchette legende={legende}>
    {Array.from({ length: TAFL_N + 1 }, (_, i) => (
      <g key={i}>
        <line x1={10} y1={10 + i * 10 - 5} x2={110} y2={10 + i * 10 - 5} stroke={GRAVURE} strokeOpacity="0.45" strokeWidth="0.7" />
        <line x1={10 + i * 10 - 5} y1={10} x2={10 + i * 10 - 5} y2={110} stroke={GRAVURE} strokeOpacity="0.45" strokeWidth="0.7" />
      </g>
    ))}
    {/* Les quatre coins, la seule sortie du Roi. */}
    {([[0, 0], [0, 10], [10, 0], [10, 10]] as const).map(([r, c], i) => {
      const [x, y] = taflXY(r, c);
      return <rect key={i} x={x - 5} y={y - 5} width="10" height="10" fill={LAITON} fillOpacity="0.22" stroke={LAITON} strokeWidth="0.8" />;
    })}
    {/* Le trône, au centre. */}
    {(() => { const [x, y] = taflXY(5, 5); return <rect x={x - 5} y={y - 5} width="10" height="10" fill={GRAVURE} fillOpacity="0.35" />; })()}
    {/* Les assaillants qui resserrent l'étau. */}
    {([[5, 1], [1, 5], [9, 5], [5, 9], [4, 1], [6, 1]] as const).map(([r, c], i) => {
      const [x, y] = taflXY(r, c);
      return <circle key={`a${i}`} cx={x} cy={y} r="3.2" fill={OXBLOOD} />;
    })}
    {/* Les défenseurs autour du Roi. */}
    {([[4, 5], [6, 5], [5, 4], [5, 6]] as const).map(([r, c], i) => {
      const [x, y] = taflXY(r, c);
      return <circle key={`d${i}`} cx={x} cy={y} r="3.2" fill={IVOIRE} fillOpacity="0.85" />;
    })}
    {/* La fuite du Roi : du trône jusqu'au coin, en pointillé. */}
    <path d={`M ${taflXY(5, 5)[0]} ${taflXY(5, 5)[1]} L ${taflXY(5, 5)[0]} ${taflXY(0, 5)[1]} L ${taflXY(0, 0)[0]} ${taflXY(0, 0)[1]}`}
          fill="none" stroke={LAITON} strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" filter="url(#tuto-lueur)" />
    {(() => {
      const [x, y] = taflXY(5, 5);
      return (
        <g filter="url(#tuto-lueur)">
          <circle cx={x} cy={y} r="4.4" fill={LAITON} stroke="#2a1809" strokeWidth="0.8" />
        </g>
      );
    })()}
  </Planchette>
);

// ── Les deux lames du tarot ─────────────────────────────────────────
const MiniTarot: React.FC<{ legende?: string }> = ({ legende }) => (
  <figure className="mt-4 mb-1">
    <svg viewBox="0 0 120 90" className="w-full max-w-[13.5rem] mx-auto block" role="img" aria-hidden>
      <defs>
        <linearGradient id="tuto-dos" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a1a20" />
          <stop offset="100%" stopColor="#1b0c10" />
        </linearGradient>
        <linearGradient id="tuto-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4EFE3" />
          <stop offset="100%" stopColor="#DCCFB4" />
        </linearGradient>
      </defs>
      <rect x="8" y="10" width="42" height="70" rx="5" fill="url(#tuto-dos)" stroke={LAITON} strokeOpacity="0.5" strokeWidth="1.2" />
      <circle cx="29" cy="45" r="12" fill="none" stroke={LAITON} strokeOpacity="0.55" strokeWidth="1.2" />
      <circle cx="29" cy="45" r="5" fill="none" stroke={LAITON} strokeOpacity="0.4" strokeWidth="1" />
      <path d="M 56 45 L 66 45 M 62 41 L 66 45 L 62 49" fill="none" stroke={LAITON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="72" y="10" width="42" height="70" rx="5" fill="url(#tuto-face)" stroke={LAITON} strokeOpacity="0.7" strokeWidth="1.2" filter="url(#tuto-lueur)" />
      <rect x="76" y="14" width="34" height="62" rx="3" fill="none" stroke="#8a6236" strokeOpacity="0.55" strokeWidth="0.9" />
      <circle cx="93" cy="34" r="7" fill="#8a6236" fillOpacity="0.35" />
      <path d="M 86 58 L 93 44 L 100 58 Z" fill="#8a6236" fillOpacity="0.45" />
      <line x1="82" y1="66" x2="104" y2="66" stroke="#8a6236" strokeOpacity="0.5" strokeWidth="1" />
    </svg>
    {legende && (
      <figcaption className="mt-2 text-center font-sans text-[10px] uppercase tracking-[0.18em] text-ivory-soft/55">
        {legende}
      </figcaption>
    )}
  </figure>
);

// ── Les étapes, jeu par jeu ─────────────────────────────────────────
// Un moulin de démonstration : la rangée du haut du grand carré.
const MOULIN_DEMO = LIGNES[0];

export const TUTORIELS: Record<JeuTutoriel, Record<'FR' | 'EN', EtapeTutoriel[]>> = {
  merelle: {
    FR: [
      {
        titre: 'Ce que vous cherchez à faire',
        corps: 'Vous avez neuf pions et le plateau en compte vingt-quatre points. Aligner trois pions sur une même ligne gravée ferme un moulin, et chaque moulin fermé vous donne le droit de retirer un pion adverse. Le camp qui tombe à deux pions, ou qui ne peut plus bouger un seul homme, a perdu.',
        ancre: 'plateau',
        schema: <MiniMerelle clairs={[0, 1, 2]} sombres={[9, 21]} moulin={MOULIN_DEMO} legende="Trois pions alignés : un moulin" />,
      },
      {
        titre: 'La pose, un pion à la fois',
        corps: 'Tant que les dix-huit pions ne sont pas sur le bois, rien ne se déplace. Cliquez un point libre et votre pion s’y pose, puis c’est à l’autre camp. Le compteur du coin vous dit combien il vous en reste en main.',
        ancre: 'plateau',
        schema: <MiniMerelle clairs={[0, 1]} sombres={[9, 21]} cibles={[2]} legende="Cliquez le point libre allumé" />,
      },
      {
        titre: 'Le moulin et la prise',
        corps: 'Les trois pions doivent occuper une ligne gravée du plateau. Les diagonales ne comptent pas, et c’est l’erreur que tout le monde fait la première fois. Dès que le moulin se ferme, le plateau allume les pions adverses que vous avez le droit d’emporter.',
        ancre: 'plateau',
        schema: <MiniMerelle clairs={[0, 1, 2]} sombres={[9, 21]} moulin={MOULIN_DEMO} cibles={[9, 21]} legende="Le moulin fermé, la prise offerte" />,
      },
      {
        titre: 'Après la pose, les pions glissent',
        corps: 'Une fois tous les pions posés, cliquez le vôtre puis un point voisin libre. Réduit à trois pions, vous volez : votre homme se pose alors sur n’importe quel point libre du plateau, ce qui laisse une vraie chance au camp qui perd.',
        ancre: 'plateau',
        schema: <MiniMerelle clairs={[1]} sombres={[9, 21]} cibles={[0, 2, 4]} legende="Le pion tenu et ses voisins libres" />,
      },
      {
        titre: 'Où trouvent-elles, les récompenses',
        corps: 'La roue des sept jours et la boutique donnent les ambiances, les plateaux et les pièces des quatre jeux. Tout ce que vous gagnez dort dans le coffre de votre espace, sous l’onglet des badges, et se choisit de là. La pastille de musique, ici en haut, ouvre les ambiances que vous possédez déjà.',
        ancre: 'musique',
      },
    ],
    EN: [
      {
        titre: 'What you are trying to do',
        corps: 'You hold nine men and the board carries twenty-four points. Three men on one engraved line make a mill, and every closed mill lets you take one enemy man off the board. The side that drops to two men, or can no longer move a single one, has lost.',
        ancre: 'plateau',
        schema: <MiniMerelle clairs={[0, 1, 2]} sombres={[9, 21]} moulin={MOULIN_DEMO} legende="Three men in line: a mill" />,
      },
      {
        titre: 'Placing, one man at a time',
        corps: 'Nothing moves until all eighteen men are on the wood. Click a free point and your man lands there, then the other side plays. The counter in the corner tells you how many you still hold in hand.',
        ancre: 'plateau',
        schema: <MiniMerelle clairs={[0, 1]} sombres={[9, 21]} cibles={[2]} legende="Click the lit free point" />,
      },
      {
        titre: 'The mill and the take',
        corps: 'The three men must sit on one engraved line of the board. Diagonals do not count, and that is the mistake everyone makes the first time. The moment a mill closes, the board lights the enemy men you are allowed to remove.',
        ancre: 'plateau',
        schema: <MiniMerelle clairs={[0, 1, 2]} sombres={[9, 21]} moulin={MOULIN_DEMO} cibles={[9, 21]} legende="Mill closed, the take offered" />,
      },
      {
        titre: 'After placing, men slide',
        corps: 'Once every man is down, click one of yours and then a free neighbouring point. Down to three men you fly: your man may land on any free point of the board, which gives the losing side a way back.',
        ancre: 'plateau',
        schema: <MiniMerelle clairs={[1]} sombres={[9, 21]} cibles={[0, 2, 4]} legende="The held man and its free neighbours" />,
      },
      {
        titre: 'Where the rewards live',
        corps: 'The seven-day wheel and the shop hand out the ambiences, the boards and the pieces of all four games. Everything you win rests in the chest of your own space, under the badges tab, and is chosen from there. The music pill up here opens the ambiences you already own.',
        ancre: 'musique',
      },
    ],
  },

  renard: {
    FR: [
      {
        titre: 'Deux camps, deux buts',
        corps: 'Les oies n’ont que le nombre pour elles : elles gagnent en coinçant le renard là où il ne peut plus bouger d’un seul point. Le renard, lui, gagne dès qu’il ne reste plus assez d’oies pour refermer l’étau.',
        ancre: 'plateau',
        schema: <MiniRenard renard={pointDe(3, 3)} oies={[pointDe(5, 2), pointDe(5, 3), pointDe(5, 4), pointDe(6, 3), pointDe(4, 2)]} legende="Le renard au centre, le troupeau qui monte" />,
      },
      {
        titre: 'Un coup se joue en deux clics',
        corps: 'Cliquez une pièce à vous et les points verts s’allument autour d’elle, puis cliquez celui où vous voulez aller. Chaque camp avance d’un point à la fois, le long des lignes brûlées au fer.',
        ancre: 'plateau',
        schema: <MiniRenard renard={pointDe(3, 3)} oies={[pointDe(5, 3), pointDe(5, 4)]} saut={[pointDe(3, 3), pointDe(2, 3)]} legende="La pièce tenue et son point vert" />,
      },
      {
        titre: 'Le saut du renard',
        corps: 'Le renard saute par-dessus une oie voisine et retombe sur le point libre derrière elle, qui est emportée. S’il peut sauter encore, il enchaîne dans le même tour : cliquez le point vert le plus lointain pour emporter toute la ligne. Les oies, elles, ne prennent jamais rien.',
        ancre: 'plateau',
        schema: <MiniRenard renard={pointDe(3, 3)} oies={[pointDe(4, 3), pointDe(6, 3)]} prise={pointDe(4, 3)} saut={[pointDe(3, 3), pointDe(5, 3)]} legende="Par-dessus l’oie, sur le point libre derrière" />,
      },
      {
        titre: 'Comment la chasse se termine',
        corps: 'Les oies l’emportent quand le renard est cerné et n’a plus un seul coup à jouer. Le renard l’emporte quand le troupeau est descendu sous le seuil du règlement choisi. Le compteur du bas de l’écran suit les oies restantes tout au long de la partie.',
        ancre: 'compteur',
      },
      {
        titre: 'Où trouvent-elles, les récompenses',
        corps: 'La roue des sept jours et la boutique donnent les ambiances, les plateaux et les pièces des quatre jeux. Tout ce que vous gagnez dort dans le coffre de votre espace, sous l’onglet des badges. La pastille de musique, ici en haut, ouvre les ambiances que vous possédez déjà.',
        ancre: 'musique',
      },
    ],
    EN: [
      {
        titre: 'Two sides, two goals',
        corps: 'The geese have nothing but numbers: they win by pinning the fox where it can no longer move a single point. The fox wins as soon as too few geese remain to close the ring.',
        ancre: 'plateau',
        schema: <MiniRenard renard={pointDe(3, 3)} oies={[pointDe(5, 2), pointDe(5, 3), pointDe(5, 4), pointDe(6, 3), pointDe(4, 2)]} legende="The fox at the centre, the flock climbing" />,
      },
      {
        titre: 'A move takes two clicks',
        corps: 'Click a piece of yours and the green points light up around it, then click the one you want. Each side moves one point at a time, along the burnt lines.',
        ancre: 'plateau',
        schema: <MiniRenard renard={pointDe(3, 3)} oies={[pointDe(5, 3), pointDe(5, 4)]} saut={[pointDe(3, 3), pointDe(2, 3)]} legende="The held piece and its green point" />,
      },
      {
        titre: 'The fox leaps',
        corps: 'The fox leaps over a neighbouring goose and lands on the free point behind it, and that goose is gone. If another leap is there, it carries on in the same turn: click the farthest green point to take the whole line. The geese never capture anything.',
        ancre: 'plateau',
        schema: <MiniRenard renard={pointDe(3, 3)} oies={[pointDe(4, 3), pointDe(6, 3)]} prise={pointDe(4, 3)} saut={[pointDe(3, 3), pointDe(5, 3)]} legende="Over the goose, onto the free point behind" />,
      },
      {
        titre: 'How the hunt ends',
        corps: 'The geese win when the fox is hemmed in with no move left. The fox wins when the flock falls below the threshold of the chosen rule set. The counter at the bottom of the screen follows the remaining geese all game long.',
        ancre: 'compteur',
      },
      {
        titre: 'Where the rewards live',
        corps: 'The seven-day wheel and the shop hand out the ambiences, the boards and the pieces of all four games. Everything you win rests in the chest of your own space, under the badges tab. The music pill up here opens the ambiences you already own.',
        ancre: 'musique',
      },
    ],
  },

  hnefatafl: {
    FR: [
      {
        titre: 'Un roi cerné cherche la sortie',
        corps: 'Le Roi doit atteindre l’un des quatre coins du damier. Les Raiders, deux fois plus nombreux, doivent l’encercler avant qu’il n’y parvienne, et ce sont eux qui ouvrent la partie.',
        ancre: 'plateau',
        schema: <MiniTafl legende="La fuite du Roi vers un coin" />,
      },
      {
        titre: 'Un coup se joue en deux clics',
        corps: 'Cliquez une de vos pièces et les cases vertes s’allument, puis cliquez celle où vous voulez aller. Toutes les pièces se déplacent en ligne droite, comme une tour aux échecs, et aucune ne saute par-dessus une autre.',
        ancre: 'plateau',
        schema: <MiniTafl legende="Le Roi monte, puis file vers le coin" />,
      },
      {
        titre: 'Les prises se font en tenaille',
        corps: 'Une pièce prise entre deux pièces adverses est capturée et quitte le damier. C’est vous qui refermez la tenaille : une pièce qui vient se placer d’elle-même entre deux adversaires ne risque rien.',
        ancre: 'plateau',
      },
      {
        titre: 'Comment la saga se termine',
        corps: 'Le Roi qui touche un coin donne la victoire aux Défenseurs. Le Roi encerclé la donne aux Raiders. Et le camp qui n’a plus un seul coup à jouer perd la partie sur-le-champ.',
        ancre: 'plateau',
      },
      {
        titre: 'Les plateaux et les pièces se gagnent',
        corps: 'Les deux dernières colonnes de cet écran tiennent les plateaux et les jeux de pièces. Ceux qui portent un cadenas s’ouvrent à la roue des sept jours ou à la boutique, et votre choix se retient d’une visite à l’autre.',
        ancre: 'coffre',
      },
    ],
    EN: [
      {
        titre: 'A cornered king looks for a way out',
        corps: 'The King must reach one of the four corners of the board. The Raiders, twice as many, have to surround him before he gets there, and they open the game.',
        ancre: 'plateau',
        schema: <MiniTafl legende="The King running for a corner" />,
      },
      {
        titre: 'A move takes two clicks',
        corps: 'Click one of your pieces and the green squares light up, then click the one you want. Every piece moves in a straight line, like a rook in chess, and none of them jumps over another.',
        ancre: 'plateau',
        schema: <MiniTafl legende="The King climbs, then runs for the corner" />,
      },
      {
        titre: 'Captures are made in a vice',
        corps: 'A piece caught between two enemy pieces is captured and leaves the board. You are the one who closes the vice: a piece that walks between two enemies of its own accord is safe.',
        ancre: 'plateau',
      },
      {
        titre: 'How the saga ends',
        corps: 'A King who touches a corner hands victory to the Defenders. A King surrounded hands it to the Raiders. And the side with no move left loses the game on the spot.',
        ancre: 'plateau',
      },
      {
        titre: 'Boards and pieces are won',
        corps: 'The last two columns of this screen hold the boards and the piece sets. The locked ones open at the seven-day wheel or at the shop, and your choice is remembered from one visit to the next.',
        ancre: 'coffre',
      },
    ],
  },

  tarot: {
    FR: [
      {
        titre: 'Posez votre question',
        corps: 'Le tarot de Marseille est un jeu de route qui a suivi les foires bien avant d’arriver jusqu’à nous. Écrivez la question qui vous occupe dans le champ du bas, ou laissez-le vide, puis choisissez un tirage dans la barre du haut.',
        ancre: 'question',
      },
      {
        titre: 'Retournez les cartes une à une',
        corps: 'Cliquez une carte pour la retourner, dans l’ordre qui vous plaît. Le paquet a été mélangé une seule fois au début du tirage et une lame sur deux sort renversée, donc rien ne se rejoue.',
        ancre: 'tapis',
        schema: <MiniTarot legende="Une carte sur son dos, une carte retournée" />,
      },
      {
        titre: 'Lisez ce que la lame raconte',
        corps: 'Posez ensuite le curseur sur une carte retournée, ou touchez-la une seconde fois, et son sens vient se lire dans le panneau de verre. Quand toutes les places sont retournées, la lecture d’ensemble se compose à partir des lames sorties et de votre question.',
        ancre: 'tapis',
      },
      {
        titre: 'Le dos des cartes se gagne',
        corps: 'Le tarot de la caravane s’obtient à la roue des sept jours, au quatrième jour d’affilée. Une fois gagné, le bouton du bas fait passer d’un dos à l’autre, et tout ce que vous gagnez dort dans le coffre de votre espace.',
        ancre: 'dos',
      },
    ],
    EN: [
      {
        titre: 'Ask your question',
        corps: 'The Marseille tarot is a road deck, one that followed the fairs long before it reached us. Write the question on your mind in the field below, or leave it empty, then pick a spread in the top bar.',
        ancre: 'question',
      },
      {
        titre: 'Turn the cards one at a time',
        corps: 'Click a card to turn it, in whatever order suits you. The deck was shuffled once at the start of the spread and every other card comes out reversed, so nothing is replayed.',
        ancre: 'tapis',
        schema: <MiniTarot legende="One card face down, one turned over" />,
      },
      {
        titre: 'Read what the card tells',
        corps: 'Then rest the cursor on a turned card, or tap it a second time, and its meaning appears in the glass panel. Once every place is turned, the whole reading is composed from the cards that came out and from your question.',
        ancre: 'tapis',
      },
      {
        titre: 'Card backs are won',
        corps: 'The caravan tarot comes from the seven-day wheel, on the fourth day in a row. Once it is won, the button below switches from one back to the other, and everything you win rests in the chest of your own space.',
        ancre: 'dos',
      },
    ],
  },
};
