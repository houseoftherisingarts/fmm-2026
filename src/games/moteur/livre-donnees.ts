// ─── Ce que la machine a appris ─────────────────────────────────────
// FICHIER GÉNÉRÉ. Ne pas modifier à la main.
// Écrit par tools/entrainement.ts (npm run entrainement).
//
// Le livre associe une clé de position au coup que les parties gagnées
// ont retenu. La clé est celle de l'adaptateur du jeu, exactement celle
// que `recherche.ts` interroge avant de réfléchir. Le nom du livre est
// le jeu, deux points, la variante, comme le veut `nomDuLivre`.
//
// Les poids sont ceux que la montée de colline a retenus. Le jeu les
// lit au chargement et les pose par-dessus les siens.

import type { Livre } from './livre';

export const LIVRES_APPRIS: Record<string, Livre> = {
  "renard:oies13": {
    "................R...ooooooooooooo|O|0|17": "20>13",
    "..............o.R...o.ooooooooooo|R|0|18": "16>15",
    ".................R.ooooooo.oooooo|O|0|18": "25>18",
    "................R.o.ooooo.ooooooo|R|0|18": "16>15",
    ".............o..R....oooooooooooo|R|0|18": "16>9",
    "................R..ooooooo.oooooo|R|0|18": "16>15",
    ".........R.........ooooooo.oooooo|O|0|18": "19>18",
    "................R.ooooooo..oooooo|O|0|19": "24>17",
    "...............R..o.ooooo.ooooooo|O|0|18": "18>17",
    ".........R...o.......oooooooooooo|O|0|18": "13>6",
    ".......o.......R....o.ooooooooooo|R|0|19": "15>8",
  },
  "renard:oies17": {
    ".............oo.R.ooooooooooooooo|O|0|29": "24>17",
    ".............oooR.oooo.oooooooooo|R|0|30": "16>9",
    "......o.......o.R.ooooooooooooooo|R|0|30": "16>9",
    "......oo.....o..R.oo.oooooooooooo|R|0|32": "16>9",
    ".........R...oo..ooooooo.oooooooo|O|0|30": "25>24",
    ".........R...ooo..oooo.oooooooooo|O|0|30": "21>22",
    ".............ooR.ooooooo.oooooooo|O|0|30": "23>16",
    ".............oooR.ooo.ooooooooooo|O|1|30": "13>6",
    ".......o.....o.R..ooooooooooooooo|O|0|30": "21>14",
    "......o......oo.R.oo.oooooooooooo|O|0|31": "14>7",
  },
  "merelle:vol": {
    "000000000000000000000000|1|99|0": "p4",
    "000000000000010000000000|2|89|0": "p4",
    "020000000010000000000000|1|88|0": "p11",
    "000000000000000000010000|2|89|0": "p1",
    "000000000010000000000000|2|89|0": "p13",
    "000010000000000000000000|2|89|0": "p13",
    "000010000000010000020000|2|78|0": "p18",
    "000010000010000000020000|2|78|0": "p13",
  },
  "merelle:sansVol": {
    "000000000000000000000000|1|99|0": "p19",
    "000000000010000000000000|2|89|0": "p19",
    "000000000000000000010000|2|89|0": "p10",
    "000000000010000000020000|1|88|0": "p11",
    "020000000000000000010000|1|88|0": "p16",
    "020000000010000000000000|1|88|0": "p4",
    "000000000000010000000000|2|89|0": "p4",
    "000000000020010000010000|2|78|0": "p9",
    "000010000000000000000000|2|89|0": "p1",
  },
  "tafl:copenhague": {
    "0001111100000000100000000000000001000020000110002220001110223220111000222000110000200001000000000000000010000000011111000|attacker|0|1": "4,10>4,7",
    "0001011100000000100000000000000001000120000110002220001110223220111000222000110000200001000000000000000010000000011111000|defender|1|1": "4,6>3,6",
    "0001111100000000100000000000000001000020000110002221000110223220111000222000110000200001000000000000000010000000011111000|defender|1|1": "6,6>6,7",
    "0001110100000000100000000000000001000021000110002220001110223220111000222000110000200001000000000000000010000000011111000|defender|1|1": "5,7>3,7",
    "0001111100000000100000000000000001000020000100012220001110223220111000222000110000200001000000000000000010000000011111000|defender|1|1": "3,5>3,3",
    "0001111100000000100000000000000001000000210010002220000110223220111000222000110000200001000000000000000010000000011111000|defender|1|1": "4,5>2,5",
    "0001111100000000100000000000000001000000200110002220000110223220111000222000110000200001000000000000000010000000011111000|attacker|0|1": "0,6>3,6",
  },
  "tafl:brandubh": {
    "0001000000100000020001123211000200000010000001000|attacker|0|1": "3,1>5,1",
    "0001000000100000020001023211000200001010000001000|defender|1|1": "3,2>3,1",
    "0001000000001000020001123211000200000010000001000|defender|1|1": "3,2>1,2",
    "0001000010000000020001123211000200000010000001000|defender|1|1": "3,4>1,4",
  },
};

/** Les coefficients d'évaluation retenus par l'entraînement. Le jeu
 *  les pose par-dessus ceux qui sont écrits dans son `cpu.ts`. */
export const POIDS_APPRIS: Record<string, Record<string, number>> = {
  renard: {"oie":92,"menace":30,"avance":12,"souffle":15,"liberte":7,"bras":33,"taniere":5,"cohesion":9,"trou":11,"bassecour":10},
};

/** L'heure du dernier entraînement, en texte lisible. Vide tant que
 *  l'entraînement n'a pas tourné. */
export const APPRIS_LE = '2026-09-02 00:59';
