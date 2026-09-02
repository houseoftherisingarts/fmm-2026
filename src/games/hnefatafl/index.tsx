// ─── Hnefatafl: plateau 3D jouable, entrée de route ────────────────
// Refondue le 2026-08-03 : c'était un jeu plein écran en noir absolu,
// avec sa propre palette (jaune #FFD700), sa propre bande de titre et
// aucun lien visuel avec le reste du site. C'est maintenant une PAGE
// DU SITE comme les autres : PageHeader à orbe, brumes de la caravane,
// typographie Cinzel, laiton, barre de navigation et pied de page.
// Le plateau vit dans une scène cadrée (et non plus en 100vh), suivie
// d'un rappel des règles. Toute couleur en dur a été remplacée par les
// jetons du design system (--color-bone, --color-brass, etc).

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CadreJeu from '../../components/jeux/CadreJeu';
import BoutonMusique, { type BoutonMusiqueHandle } from '../../components/jeux/BoutonMusique';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Shield, Swords, Users, Cpu, RotateCcw, Download, Check, Lock, Maximize2, Minimize2, Scroll, X } from 'lucide-react';

import { useUI } from '../../contexts/AppContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import SEO from '../../components/SEO';
import {
  applyMove,
  CELL,
  MID,
  N,
  validMoves,
  REGLES,
  REGLE_DEFAUT,
  regle,
  setRegle,
  type Board,
  type Coord,
  type Side,
} from './gameLogic';
import { setupScene } from './sceneSetup';
import { buildBoard } from './boardMesh';
import { createPieceSystem } from './pieceMesh';
import { createHighlightSystem } from './highlightSystem';
import type { CpuMove } from './cpuPlayer';
import {
  coupLegal, etatInitial, gagnantDe, jouerArbitre, texteVerdict,
  type EtatTafl,
} from './arbitre';
import { nouveauPenseur } from '../moteur/penseur';
import { nomNiveau, NIVEAUX_POSSIBLES, type Niveau } from '../moteur/niveaux';
import { BOARD_SETS, PIECE_SETS, lireChoix, ecrireChoix, type BoardSet, type PieceSet } from './assets';
import { useBadgeJeu, useBadges } from '../../contexts/BadgesContext';
import { useAuth } from '../../contexts/AuthContext';
import { suivreMaBourse } from '../../firebase/montpellois';
import { ApercuRecompense } from '../../components/compte/RecompensesQuotidiennes';
import {
  suivrePartie, jouerCoup, abandonner, coupEnTexte, coupDepuisTexte,
  repondreAuDefi, reclamerForfait, tempsRestant, formatDelai,
  type PartieTafl,
} from '../../firebase/tafl';
import PanneauAmis from '../../components/jeux/PanneauAmis';
import HnefataflPanneaux from '../../components/jeux/HnefataflPanneaux';
import PubDebutPartie from '../../components/jeux/PubDebutPartie';
import BoiteAide from '../../components/jeux/BoiteAide';
import Tutoriel, { BoutonTutoriel, useTutoriel } from '../Tutoriel';
import { jeuTafl } from './jeuDefiable';

type Mode = 'two-player' | 'vs-cpu';

interface GameConfig {
  mode: Mode;
  humanSide: Side; // ignored when mode === 'two-player'
  /** La marche de force de l'adversaire de bois, du marmiton au connétable. */
  niveau: Niveau;
  /** Le règlement choisi : Copenhague, Fetlar, Tawlbwrdd, Brandubh. */
  regleId: string;
}

type VfxKind = 'king-escape' | 'king-fall' | null;

interface UIState {
  turn: Side;
  over: boolean;
  msg: string;
  vfx?: VfxKind;
}

interface GameStrings {
  raidersFirst: string;
  raidersMove: string;
  defendersMove: string;
  raidersThinking: string;
  defendersThinking: string;
  ending: string;
  newSaga: string;
  hint: string;
  raidersDot: string;
  defendersDot: string;
  kingDot: string;
  startTitle: string;
  startSubtitle: string;
  modeLabel: string;
  modeTwoPlayer: string;
  modeVsCpu: string;
  sideLabel: string;
  sideDefenders: string;
  sideRaiders: string;
  difficultyLabel: string;
  begin: string;
  // Habillage de page (ajouté avec la refonte du 2026-08-03)
  pageEyebrow: string;
  pageTitle: string;
  pageIntro: string;
  tableReady: string;
  rulesEyebrow: string;
  rulesTitle: string;
  rules: Array<{ title: string; body: string }>;
  // Signature de l'atelier (2026-08-03)
  builtEyebrow: string;
  builtBy:      string;
  builtLead:    string;
  builtCta:     string;
  loadingTitle: string;
  loadingLead:  string;
  musiqueOn:    string;
  musiqueOff:   string;
  shopBoards:   string;
  shopPieces:   string;
  shopSoon:     string;
  pleinEcran:        string;
  quitterPleinEcran: string;
  afficherRegles:    string;
  cacherRegles:      string;
  // La boîte « je ne sais pas quoi faire ».
  aideBut:        string;
  aidePreparer:   string;
  aideFini:       string;
  aideAttente:    (nom: string) => string;
  aideOrdinateur: string;
  aideRoi:        string;
  aideRaiders:    string;
  aideAVous:      string;
}

const STRINGS: Record<'FR' | 'EN', GameStrings> = {
  FR: {
    raidersFirst: 'Les Raiders commencent',
    raidersMove: 'Tour des Raiders',
    defendersMove: 'Tour des Défenseurs',
    raidersThinking: 'Les Raiders réfléchissent…',
    defendersThinking: 'Les Défenseurs réfléchissent…',
    ending: 'La saga se termine',
    newSaga: 'Nouvelle saga',
    hint: 'Cliquez une pièce · Cliquez une case verte · Glissez pour pivoter',
    raidersDot: '● Raiders',
    defendersDot: '● Défenseurs',
    kingDot: '● Roi : atteindre un coin ★',
    startTitle: 'Préparez votre saga',
    startSubtitle: 'Choisissez votre camp',
    modeLabel: 'MODE',
    modeTwoPlayer: 'Deux joueurs',
    modeVsCpu: 'Contre l\'ordinateur',
    sideLabel: 'VOTRE CAMP',
    sideDefenders: 'Défenseurs',
    sideRaiders: 'Raiders',
    difficultyLabel: 'LA MARCHE DE L’ADVERSAIRE',
    begin: 'Commencer la partie',
    pageEyebrow: 'Jeunesse · Jeu de plateau',
    pageTitle: 'Hnefatafl',
    pageIntro:
      'Le jeu des Vikings, mille ans avant les échecs. Un roi cerné cherche la sortie, ses assaillants resserrent l\u2019étau. La partie se joue ici, en trois dimensions, sur un plateau sculpté. Elle se joue aussi sur le site du festival, autour d\u2019une vraie table de bois.',
    tableReady: 'La table est prête',
    rulesEyebrow: 'Avant de vous asseoir',
    rulesTitle: 'Trois choses à savoir',
    rules: [
      {
        title: 'Le but',
        body: 'Le Roi doit atteindre l\u2019un des quatre coins du plateau. Les Raiders doivent l\u2019encercler avant qu\u2019il n\u2019y parvienne.',
      },
      {
        title: 'Les camps',
        body: 'Les Raiders sont deux fois plus nombreux et jouent en premier. Les Défenseurs sont moins nombreux, mais ils protègent le Roi.',
      },
      {
        title: 'Les prises',
        body: 'Toutes les pièces se déplacent en ligne droite, comme une tour. Une pièce prise entre deux pièces adverses est capturée.',
      },
    ],
    builtEyebrow: 'L\u2019atelier',
    builtBy: 'Jeu développé par Le Salon des Inconnus',
    builtLead: 'Le plateau, les pièces et le code viennent de l\u2019atelier du Salon des Inconnus, à Namur. Vous pouvez aussi emporter le jeu chez vous : il se télécharge dans la section outils.',
    builtCta: 'Les outils du Salon',
    loadingTitle: 'On dresse la table',
    loadingLead: '',
    musiqueOn: 'Couper la musique',
    musiqueOff: 'Musique',
    shopBoards: 'Plateaux',
    shopPieces: 'Pièces',
    shopSoon: 'Bientôt',
    pleinEcran: 'Plein écran',
    quitterPleinEcran: 'Quitter le plein écran',
    afficherRegles: 'Afficher les règles',
    cacherRegles: 'Cacher les règles',
    aideBut: 'Le but : le Roi doit atteindre un coin, les Raiders doivent l’encercler.',
    aidePreparer: 'Choisissez le règlement et votre camp, puis dressez la table.',
    aideFini: 'La saga est terminée.',
    aideAttente: (nom) => `À ${nom} de jouer.`,
    aideOrdinateur: 'À l’ordinateur de jouer.',
    aideRoi: 'Amenez le roi à un coin.',
    aideRaiders: 'Capturez les défenseurs en les prenant en tenaille.',
    aideAVous: 'À vous.',
  },
  EN: {
    raidersFirst: 'Raiders move first',
    raidersMove: 'Raiders move',
    defendersMove: 'Defenders move',
    raidersThinking: 'Raiders thinking…',
    defendersThinking: 'Defenders thinking…',
    ending: 'The saga ends',
    newSaga: 'New saga',
    hint: 'Click piece · Click green to move · Drag to orbit',
    raidersDot: '● Raiders',
    defendersDot: '● Defenders',
    kingDot: '● King : reach a corner ★',
    startTitle: 'Prepare your saga',
    startSubtitle: 'Choose your side',
    modeLabel: 'MODE',
    modeTwoPlayer: 'Two players',
    modeVsCpu: 'Against computer',
    sideLabel: 'YOUR SIDE',
    sideDefenders: 'Defenders',
    sideRaiders: 'Raiders',
    difficultyLabel: 'THE OPPONENT’S STEP',
    begin: 'Begin the game',
    pageEyebrow: 'Youth · Board game',
    pageTitle: 'Hnefatafl',
    pageIntro:
      'The Viking board game, a thousand years before chess. A cornered king looks for a way out while his attackers tighten the ring. Play it here in three dimensions on a carved board. Play it again at the festival, around a real wooden table.',
    tableReady: 'The table is set',
    rulesEyebrow: 'Before you sit down',
    rulesTitle: 'Three things to know',
    rules: [
      {
        title: 'The goal',
        body: 'The King must reach one of the four corners of the board. The Raiders must surround him before he gets there.',
      },
      {
        title: 'The sides',
        body: 'Raiders are twice as many and move first. Defenders are fewer, but they shield the King.',
      },
      {
        title: 'Captures',
        body: 'Every piece moves in a straight line, like a rook. A piece caught between two enemy pieces is captured.',
      },
    ],
    builtEyebrow: 'The workshop',
    builtBy: 'Game built by Le Salon des Inconnus',
    builtLead: 'The board, the pieces and the code all come from the Salon des Inconnus workshop in Namur. You can also take the game home: it downloads from the tools section.',
    builtCta: 'The Salon\u2019s tools',
    loadingTitle: 'Setting the table',
    loadingLead: '',
    musiqueOn: 'Mute the music',
    musiqueOff: 'Music',
    shopBoards: 'Boards',
    shopPieces: 'Pieces',
    shopSoon: 'Coming soon',
    pleinEcran: 'Fullscreen',
    quitterPleinEcran: 'Exit fullscreen',
    afficherRegles: 'Show the rules',
    cacherRegles: 'Hide the rules',
    aideBut: 'The goal: the King must reach a corner, the Raiders must surround him.',
    aidePreparer: 'Pick the rule set and your side, then set the table.',
    aideFini: 'The saga is over.',
    aideAttente: (nom) => `${nom} to play.`,
    aideOrdinateur: 'The computer is playing.',
    aideRoi: 'Walk the king to a corner.',
    aideRaiders: 'Capture the defenders by catching them in a vice.',
    aideAVous: 'Your move.',
  },
};

/** Le fil d'une partie en ligne, branché sur Firestore par la page. */
export interface FilEnLigne {
  /** Mon camp : je ne peux toucher que mes pièces, à mon tour. */
  monCamp: Side;
  /** Partie terminée ou abandonnée : plus personne ne bouge rien. */
  fige?: boolean;
  /** Appelé quand JE joue : la page pousse le coup à l'autre. */
  surMonCoup: (coup: { fr: number; fc: number; tr: number; tc: number; tourSuivant: Side; gagnant: 'attacker' | 'defender' | null }) => void;
}

/** Ce que la page peut demander au damier. */
export interface CanvasHandle {
  /** Rejoue un coup reçu de l'adversaire. */
  jouerDistant: (fr: number, fc: number, tr: number, tc: number) => void;
}

interface GameCanvasProps {
  gameKey: number;
  onUi: (ui: UIState) => void;
  /** La langue du verdict de l'arbitre, que `strings` ne porte pas. */
  langue: 'FR' | 'EN';
  /** Présent = partie en ligne contre une vraie personne. */
  enLigne?: FilEnLigne | null;
  strings: GameStrings;
  config: GameConfig;
  /** Avancement du chargement des modèles, de 0 à 1, puis `true` quand
   *  tout est en scène (ou qu'un asset a définitivement échoué). */
  onLoad: (progress: number, done: boolean) => void;
  /** Jeux d'assets choisis dans le coffre. */
  boardSetId: string;
  pieceSetId: string;
}

const GameCanvas = forwardRef<CanvasHandle, GameCanvasProps>(({ gameKey, onUi, langue, strings, config, onLoad, boardSetId, pieceSetId, enLigne }, ref) => {
  // La poignée doit survivre aux re-rendus : le moteur vit dans un
  // effet, il publie sa fonction ici.
  const distantRef = useRef<((fr: number, fc: number, tr: number, tc: number) => void) | null>(null);
  const enLigneRef = useRef<FilEnLigne | null>(enLigne ?? null);
  enLigneRef.current = enLigne ?? null;
  useImperativeHandle(ref, () => ({
    jouerDistant: (fr, fc, tr, tc) => distantRef.current?.(fr, fc, tr, tc),
  }), []);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stringsRef = useRef(strings);
  stringsRef.current = strings;
  const configRef = useRef(config);
  configRef.current = config;
  const langueRef = useRef(langue);
  langueRef.current = langue;

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // `alive` flips false in cleanup. All deferred callbacks (gsap
    // onComplete, setTimeout, animation chain) check this before touching
    // React state or scene objects: protects against StrictMode double-
    // mount and HMR remount races during piece animations.
    let alive = true;

    const scene = setupScene(el);
    const detachResize = scene.attachResize();

    // ── Chargement des modèles ──────────────────────────────────────
    // Un seul gestionnaire pour le plateau, les trois pièces, leurs
    // textures et le décalque : l'écran d'attente montre donc un vrai
    // avancement, pas une animation décorative.
    //
    // 🚨 Deux garde-fous, parce qu'un écran d'attente qui ne se lève
    // jamais est pire que pas d'écran du tout :
    //   · onError laisse quand même passer (le jeu tourne avec le
    //     plateau procédural si un GLB manque);
    //   · un délai maximal libère la partie même si le réseau meurt en
    //     plein téléchargement, cas où ni onLoad ni onError ne tombent.
    const manager = new THREE.LoadingManager();
    let released = false;
    const release = () => {
      if (released || !alive) return;
      released = true;
      onLoad(1, true);
    };
    manager.onProgress = (_url, loaded, total) => {
      if (!alive || released) return;
      onLoad(total > 0 ? loaded / total : 0, false);
    };
    manager.onLoad = release;
    manager.onError = (url) => {
      console.warn('[hnefatafl] asset introuvable, la partie continue sans lui', url);
      release();
    };
    const secours = window.setTimeout(release, 15000);

    const { clickables } = buildBoard(scene.scene, () => alive, manager, boardSetId);
    const pieces = createPieceSystem(scene.scene, clickables, undefined, manager, pieceSetId);
    const hl = createHighlightSystem(scene.scene);

    // ── Sonde de développement ──────────────────────────────────────
    // Expose la projection case -> écran pour les tests Playwright :
    // window.__hnef.squareToScreen(r, c) rend {x, y} en pixels client.
    // Dev seulement : rien n'est expose en production.
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__hnef = {
        squareToScreen: (r: number, c: number) => {
          const v = new THREE.Vector3((c - MID) * CELL, 0.12, (r - MID) * CELL);
          v.project(scene.camera);
          const rect = scene.renderer.domElement.getBoundingClientRect();
          return {
            x: rect.left + ((v.x + 1) / 2) * rect.width,
            y: rect.top + ((1 - v.y) / 2) * rect.height,
          };
        },
        state: () => ({ turn: gs.turn, over: gs.over, sel: gs.sel, mode: configRef.current.mode, humanSide: configRef.current.humanSide, board: gs.board.map((row) => row.join('')) }),
      };
    }

    // ── L'arbitre de la table ───────────────────────────────────────
    // Il ne se reconstruit JAMAIS à partir du damier seul. C'est lui
    // qui porte le registre des positions déjà parues et le compteur
    // des demi-coups sans prise, et un état neuf à chaque coup rendrait
    // la machine aveugle aux deux règles qui closent une partie
    // enlisée. La partie en ligne rejoue ses coups par le même chemin,
    // sans quoi les deux joueurs ne verraient pas le même verdict.
    let arb: EtatTafl = etatInitial(configRef.current.regleId);
    const board0: Board = arb.board;
    for (let r = 0; r < board0.length; r++) {
      for (let c = 0; c < board0[r].length; c++) {
        if (board0[r][c]) pieces.mkPiece(r, c, board0[r][c]);
      }
    }

    const gs: {
      board: Board;
      turn: Side;
      sel: Coord | null;
      moves: Coord[];
      over: boolean;
      animating: boolean;
    } = {
      board: board0,
      turn: 'attacker',
      sel: null,
      moves: [],
      over: false,
      animating: false,
    };

    // ── La réflexion de la machine ──────────────────────────────────
    // Elle part dans le travailleur du penseur, jamais sur le fil qui
    // dessine la scène : c'est ce qui laisse au connétable ses deux
    // secondes et demie sans figer le plateau. Chaque demande porte un
    // numéro, et une réponse dont le numéro a été dépassé se jette,
    // parce que la partie a changé de position pendant la recherche.
    const penseur = nouveauPenseur();
    let demande = 0;
    const cancelCpu = () => {
      demande += 1;
      penseur.arreter();
    };

    const cpuShouldMove = (): boolean => {
      const cfg = configRef.current;
      return (
        cfg.mode === 'vs-cpu'
        && !gs.over
        && !gs.animating
        && gs.turn !== cfg.humanSide
      );
    };

    const turnMsg = (turn: Side, thinking: boolean): string => {
      const s = stringsRef.current;
      if (thinking) {
        return turn === 'attacker' ? s.raidersThinking : s.defendersThinking;
      }
      return turn === 'attacker' ? s.raidersMove : s.defendersMove;
    };

    const scheduleCpu = () => {
      cancelCpu();
      const cfg = configRef.current;
      if (!cpuShouldMove()) {
        // La main passe à la personne. La machine profite de son tour
        // pour préparer sa réponse, et jouera sans la faire attendre.
        if (cfg.mode === 'vs-cpu' && !gs.over) {
          penseur.anticiper('tafl', cfg.regleId, arb, cfg.niveau);
        }
        return;
      }
      onUi({ turn: gs.turn, over: false, msg: turnMsg(gs.turn, true) });
      const mienne = demande;
      void penseur
        .demanderCoup<CpuMove>('tafl', cfg.regleId, arb, cfg.niveau)
        .then((coup) => {
          if (!alive || demande !== mienne || !coup) return;
          if (!cpuShouldMove()) return;
          commitMove(coup.from[0], coup.from[1], coup.to[0], coup.to[1]);
        });
    };

    const finishMove = () => {
      if (!alive) return;
      gs.animating = false;
      // L'arbitre est seul juge de la fin : la fuite du roi, la prise,
      // le camp qui n'a plus un coup, la répétition triple qui fait
      // perdre celui qui la provoque, et les cent vingt demi-coups sans
      // prise qui rendent la partie nulle.
      const v = arb.verdict;
      if (v) {
        gs.over = true;
        cancelCpu();
        const vfx: VfxKind = v.issue === 'defender'
          ? 'king-escape'
          : v.issue === 'attacker' ? 'king-fall' : null;
        if (vfx === 'king-escape') scene.pushCameraIn(0.78, 1.6);
        onUi({
          turn: gs.turn,
          over: true,
          msg: texteVerdict(v, langueRef.current === 'FR'),
          vfx,
        });
        return;
      }
      gs.turn = arb.tour;
      onUi({ turn: gs.turn, over: false, msg: turnMsg(gs.turn, false), vfx: null });
      scheduleCpu();
    };

    const commitMove = (fr: number, fc: number, tr: number, tc: number, distant = false) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[Hnefatafl] commitMove', { fr, fc, tr, tc, piece: gs.board[fr][fc], turn: gs.turn });
      }
      // Garde defensive : jamais commettre depuis une case vide (un
      // commit fantome basculerait le tour sans bouger le plateau).
      if (!gs.board[fr]?.[fc]) return;
      // `applyMove` ne sert plus qu'à savoir QUI disparaît du plateau,
      // pour les animations. L'état de la partie, lui, avance par
      // l'arbitre, et il n'avance que par là.
      const { removed } = applyMove(gs.board, fr, fc, tr, tc);
      arb = jouerArbitre(arb, [fr, fc], [tr, tc]);
      // Partie en ligne : mon coup part vers l'autre. Le coup reçu de
      // l'adversaire, lui, ne repart pas (sinon il ferait la navette).
      const fil = enLigneRef.current;
      if (fil && !distant) {
        fil.surMonCoup({
          fr, fc, tr, tc,
          tourSuivant: arb.tour,
          gagnant: gagnantDe(arb.verdict),
        });
      }
      gs.board = arb.board;
      gs.sel = null;
      gs.moves = [];
      hl.clearHL();
      gs.animating = true;

      const afterMove = () => {
        if (!alive) return;
        if (removed.length === 0) {
          finishMove();
          return;
        }
        let remaining = removed.length;
        const onOne = () => {
          if (!alive) return;
          remaining -= 1;
          if (remaining === 0) finishMove();
        };
        removed.forEach(([rr, rc]) => pieces.rmPiece(rr, rc, { onComplete: onOne }));
      };

      pieces.mvPiece(fr, fc, tr, tc, { onComplete: afterMove });
    };

    // La page rejoue ici les coups de l'adversaire.
    distantRef.current = (fr: number, fc: number, tr: number, tc: number) => {
      if (gs.over) return;
      // Le coup vient du réseau. L'arbitre refuse un coup illégal en
      // levant une erreur, ce qui arrêterait la page : on le pèse donc
      // avant, et un coup impossible se signale plutôt que de passer.
      if (!coupLegal(arb.board, arb.tour, [fr, fc], [tr, tc])) {
        console.warn('[hnefatafl] coup distant refusé par l’arbitre', { fr, fc, tr, tc });
        return;
      }
      commitMove(fr, fc, tr, tc, true);
    };

    const handleSqClick = (r: number, c: number) => {
      if (gs.over || gs.animating) return;
      // While the CPU is thinking, lock human input on the CPU's turn.
      if (cpuShouldMove()) return;
      const cfg = configRef.current;
      // In vs-CPU mode, lock human input on the CPU's side at all times
      // (the cpuShouldMove() check above only fires after a turn flip;
      // this guards a defender-side human from poking raider pieces).
      if (cfg.mode === 'vs-cpu' && gs.turn !== cfg.humanSide) return;
      // En ligne : je ne touche que mes hommes, et seulement à mon tour.
      // Une partie finie ou abandonnée verrouille les deux camps.
      const fil = enLigneRef.current;
      if (fil && (fil.fige || gs.turn !== fil.monCamp)) return;

      const piece = gs.board[r][c];
      const mine = gs.turn === 'attacker' ? piece === 1 : piece === 2 || piece === 3;

      if (gs.sel) {
        const [sr, sc] = gs.sel;
        if (r === sr && c === sc) {
          gs.sel = null;
          gs.moves = [];
          hl.clearHL();
          return;
        }
        if (gs.moves.some(([mr, mc]) => mr === r && mc === c)) {
          commitMove(sr, sc, r, c);
          return;
        }
      }
      if (piece && mine) {
        gs.sel = [r, c];
        gs.moves = validMoves(gs.board, r, c);
        hl.showHL(gs.sel, gs.moves);
      } else {
        gs.sel = null;
        gs.moves = [];
        hl.clearHL();
      }
    };

    // ── Pointer/touch input ────────────────────────────────────────
    const ray = new THREE.Raycaster();
    const mp = new THREE.Vector2();
    let isDown = false;
    let dragged = false;
    let downXY = { x: 0, y: 0 };
    let lastXY = { x: 0, y: 0 };

    const beginDrag = (x: number, y: number) => {
      isDown = true;
      dragged = false;
      downXY = { x, y };
      lastXY = { x, y };
    };
    const continueDrag = (x: number, y: number) => {
      if (!isDown) return;
      const dx = x - lastXY.x;
      const dy = y - lastXY.y;
      const totalDx = x - downXY.x;
      const totalDy = y - downXY.y;
      if (dragged || Math.abs(totalDx) > 4 || Math.abs(totalDy) > 4) {
        dragged = true;
        scene.rotateOrbit(dx, dy);
        lastXY = { x, y };
      }
    };
    const endDrag = () => {
      isDown = false;
    };
    // Plan du champ de jeu, pour resoudre la case visee independamment
    // de ce qui se dresse devant. Le bug d'origine : les pieces hautes
    // intersectaient le rayon AVANT la tuile verte visee, le clic se
    // resolvait sur la piece, et le coup n'etait jamais applique
    // (audit 2026-08-03, regles et IA saines par ailleurs).
    const playPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);
    const planePoint = new THREE.Vector3();

    const tryClick = (clientX: number, clientY: number) => {
      if (dragged) return;
      const rect = scene.renderer.domElement.getBoundingClientRect();
      mp.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mp.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mp, scene.camera);

      // Case sous le curseur, par intersection avec le plan du plateau.
      let planeRC: { r: number; c: number } | null = null;
      if (ray.ray.intersectPlane(playPlane, planePoint)) {
        const c = Math.round(planePoint.x / CELL + MID);
        const r = Math.round(planePoint.z / CELL + MID);
        if (r >= 0 && r < N && c >= 0 && c < N) planeRC = { r, c };
      }

      const hits = ray.intersectObjects(clickables, false);
      const pieceHit = hits.find((h) => h.object.userData.r !== undefined && !h.object.userData.isSquare);
      const squareHit = hits.find((h) => h.object.userData.isSquare);

      // 1. Un coup est en attente et le plan designe une case legale :
      //    on JOUE, meme si une piece obstrue visuellement la tuile.
      if (gs.sel && planeRC && gs.moves.some(([mr, mc]) => mr === planeRC.r && mc === planeRC.c)) {
        handleSqClick(planeRC.r, planeRC.c);
        return;
      }
      // 2. Sinon, une piece cliquee directement se selectionne.
      if (pieceHit) {
        handleSqClick(pieceHit.object.userData.r as number, pieceHit.object.userData.c as number);
        return;
      }
      // 3. Sinon, la tuile touchee, ou la case du plan en dernier recours.
      if (squareHit) {
        handleSqClick(squareHit.object.userData.r as number, squareHit.object.userData.c as number);
        return;
      }
      if (planeRC) handleSqClick(planeRC.r, planeRC.c);
    };

    const onMouseDown = (e: MouseEvent) => beginDrag(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => continueDrag(e.clientX, e.clientY);
    const onMouseUp = () => endDrag();
    const onClick = (e: MouseEvent) => tryClick(e.clientX, e.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      beginDrag(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDown || e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      continueDrag(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const wasDragged = dragged;
      endDrag();
      if (t && !wasDragged) tryClick(t.clientX, t.clientY);
    };
    const onContextMenu = (e: Event) => e.preventDefault();

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mouseleave', onMouseUp);
    el.addEventListener('click', onClick);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    el.addEventListener('contextmenu', onContextMenu);

    // ── First CPU move (if human picked Defenders) ─────────────────
    scheduleCpu();

    // ── Render loop ────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      scene.torchA.intensity = 5 + Math.sin(t * 7.1) * 0.6 + Math.sin(t * 13.3) * 0.3;
      scene.torchB.intensity = 4 + Math.sin(t * 5.7 + 1.2) * 0.5 + Math.sin(t * 11.7) * 0.3;
      if (gs.sel) {
        const entry = pieces.getPiece(gs.sel[0], gs.sel[1]);
        if (entry) {
          const isK = entry.pType === 3;
          const bh = isK ? 0.92 : 0.56;
          const cr = isK ? 0.33 : 0.27;
          const lift = 0.1 + Math.sin(t * 3.2) * 0.08;
          entry.body.position.y = lift + bh / 2;
          entry.cap.position.y = lift + bh + cr * 0.65;
        }
      }
      scene.renderer.render(scene.scene, scene.camera);
    };
    animate();

    return () => {
      alive = false;
      clearTimeout(secours);
      cancelAnimationFrame(raf);
      cancelCpu();
      penseur.fermer();
      detachResize();
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mouseleave', onMouseUp);
      el.removeEventListener('click', onClick);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('contextmenu', onContextMenu);
      hl.dispose();
      pieces.dispose();
      scene.dispose();
    };
  }, [gameKey, onUi]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
});
GameCanvas.displayName = 'GameCanvas';

// ─── Jeton de choix de l'écran de préparation ───────────────────────
// Grammaire du site : verre sombre, filet de laiton, texte os. L'état
// actif se marque par le laiton PLEIN (comme les appels à l'action du
// site), pas par un jaune saturé.
interface PillProps {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}
const Pill: React.FC<PillProps> = ({ active, onClick, icon, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`inline-flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 rounded-card border font-sans text-[10px] md:text-xs uppercase tracking-[0.12em] md:tracking-[0.18em] transition-colors duration-200 min-h-[44px] ${
      active
        ? 'bg-brass text-[#1A0A05] border-brass'
        : 'bg-black/30 text-ivory-soft border-brass/35 hover:border-brass hover:text-ivory'
    }`}
  >
    {icon}
    {children}
  </button>
);

// Pastille de jeu : même grammaire que Pill, avec la vignette de l'objet.
// C'est ce qui permet de choisir sa table et ses hommes SANS quitter
// l'écran de préparation, à la manière d'un lobby de Gwent.
const PilleJeu: React.FC<{
  it:      BoardSet | PieceSet;
  active:  boolean;
  lang:    'FR' | 'EN';
  soon:    string;
  onClick: () => void;
  /** Un jeu 'recompense' (roue des sept jours) gagné par la personne. */
  debloque?: boolean;
}> = ({ it, active, lang, soon, onClick, debloque }) => {
  const dispo = it.statut === 'disponible' || (it.statut === 'recompense' && !!debloque);
  return (
    <button
      type="button"
      disabled={!dispo}
      onClick={onClick}
      aria-pressed={active}
      title={lang === 'FR' ? it.texteFR : it.texteEN}
      className={`inline-flex items-center gap-2 md:gap-2.5 p-1 pr-2.5 md:p-1.5 md:pr-4 rounded-card border font-sans text-[10px] md:text-xs uppercase tracking-[0.12em] md:tracking-[0.14em] transition-colors duration-200 min-h-[44px] ${
        active
          ? 'bg-brass text-[#1A0A05] border-brass'
          : dispo
            ? 'bg-black/30 text-ivory-soft border-brass/35 hover:border-brass hover:text-ivory'
            : 'bg-black/30 text-ivory-soft/50 border-brass/20 opacity-55 cursor-not-allowed'
      }`}
    >
      <span className="relative w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-[3px] overflow-hidden bg-black/50">
        {dispo ? (
          it.vignette ? (
            <img
              src={it.vignette}
              alt=""
              aria-hidden
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            // La caravane n'a pas encore de vignette photographiée :
            // un aplat de ses couleurs tient la place.
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: 'linear-gradient(150deg, #2f6f5a 0%, #8a2430 55%, #d9a441 100%)' }}
            />
          )
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-brass/40">
            <Lock size={12} />
          </span>
        )}
      </span>
      <span className="text-left leading-tight max-w-[84px] md:max-w-[120px]">
        {lang === 'FR' ? it.nomFR : it.nomEN}
        {!dispo && (
          <span className="block text-[9px] tracking-[0.2em] opacity-70">
            {it.statut === 'recompense'
              ? (lang === 'FR' ? '3e jour d’affilée' : '3rd day in a row')
              : soon}
          </span>
        )}
      </span>
      {active && <Check size={12} className="shrink-0" />}
    </button>
  );
};

// ─── Start screen overlay ───────────────────────────────────────────
interface StartScreenProps {
  initial: GameConfig;
  strings: GameStrings;
  onBegin: (config: GameConfig) => void;
  lang:    'FR' | 'EN';
  choix:   { plateau: string; pieces: string };
  onChoix: (cle: 'plateau' | 'pieces', id: string) => void;
  onTutoriel: () => void;
}
const StartScreen: React.FC<StartScreenProps> = ({ initial, strings: s, onBegin, lang, choix, onChoix, onTutoriel }) => {
  // La caravane (récompense quotidienne du jour 3) se déverrouille par la bourse.
  const { user } = useAuth();
  const [taflDebloques, setTaflDebloques] = useState<string[]>([]);
  const [plateauxDebloques, setPlateauxDebloques] = useState<string[]>([]);
  useEffect(() => {
    if (!user?.uid) { setTaflDebloques([]); setPlateauxDebloques([]); return; }
    return suivreMaBourse(user.uid, (b) => { setTaflDebloques(b.taflPieces || []); setPlateauxDebloques(b.taflPlateaux || []); });
  }, [user?.uid]);

  const [mode, setMode] = useState<Mode>(initial.mode);
  const [humanSide, setHumanSide] = useState<Side>(initial.humanSide);
  const [niveau, setNiveau] = useState<Niveau>(initial.niveau);
  // Le tafl n'a jamais eu un règlement unique : on choisit le sien
  // avant de dresser la table (Alex, 2026-08-22).
  const [regleId, setRegleId] = useState<string>(initial.regleId);
  const regleChoisie = regle(regleId);

  // Quatre colonnes de gauche à droite sur ordinateur (Alex, 2026-08-30) :
  // le règlement, le mode, le plateau, les pièces. Rien à faire défiler,
  // le bouton reste au bas de la fenêtre. Sur téléphone, les colonnes
  // s'empilent et c'est le milieu qui défile, jamais le bouton.
  const Colonne: React.FC<{ num: string; label: string; tuto?: string; children: React.ReactNode }> = ({ num, label, tuto, children }) => (
    <section data-tuto={tuto} className="rounded-card border border-brass/20 bg-black/30 p-3.5 md:p-4 min-w-0">
      <p className="flex items-baseline gap-2.5 mb-3 md:mb-4">
        <span className="font-display title-medieval text-lg md:text-xl" style={{ color: 'rgba(232,177,74,0.6)' }}>{num}</span>
        <span className="font-sans text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-brass/70">{label}</span>
      </p>
      <div className="flex flex-col items-stretch gap-2">{children}</div>
    </section>
  );
  const SousTitre: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="font-sans text-[9px] uppercase tracking-[0.3em] text-ivory-soft/55 mt-2 mb-0.5">{children}</p>
  );

  return (
    <div className="absolute inset-0 z-[5] flex flex-col bg-[rgba(10,4,6,0.82)] backdrop-blur-md">
      <div className="shrink-0 text-center px-4 pt-4 md:pt-6">
        <p className="font-editorial uppercase tracking-[0.4em] text-[10px] md:text-xs text-[var(--color-amber-glow)] mb-1.5 md:mb-2">
          {s.startSubtitle}
        </p>
        <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory leading-[1.06]">
          {s.startTitle}
        </h2>
        <div className="divider-brass w-24 mx-auto mt-3 mb-3 md:mt-4 md:mb-5" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-2">
        <div className="grid gap-3 md:gap-4 lg:grid-cols-4 max-w-6xl mx-auto items-start">
          <Colonne num="I" label={lang === 'FR' ? 'Le règlement' : 'The rule set'}>
            {REGLES.map((r) => (
              <Pill key={r.id} active={regleId === r.id} onClick={() => setRegleId(r.id)} icon={<Scroll size={13} />}>
                {lang === 'FR' ? r.nomFR : r.nomEN}
              </Pill>
            ))}
            <p className="font-editorial text-[12px] md:text-[13px] text-ivory-soft/75 mt-2 leading-snug">
              {lang === 'FR' ? regleChoisie.texteFR : regleChoisie.texteEN}
              <span className="block mt-1 font-sans uppercase tracking-[0.24em] text-[10px] text-brass/70">
                {regleChoisie.taille}×{regleChoisie.taille}
              </span>
            </p>
          </Colonne>

          <Colonne num="II" label={s.modeLabel}>
            <Pill active={mode === 'two-player'} onClick={() => setMode('two-player')} icon={<Users size={13} />}>
              {s.modeTwoPlayer}
            </Pill>
            <Pill active={mode === 'vs-cpu'} onClick={() => setMode('vs-cpu')} icon={<Cpu size={13} />}>
              {s.modeVsCpu}
            </Pill>
            {mode === 'vs-cpu' && (
              <>
                <SousTitre>{s.sideLabel}</SousTitre>
                <Pill active={humanSide === 'defender'} onClick={() => setHumanSide('defender')} icon={<Shield size={13} />}>
                  {s.sideDefenders}
                </Pill>
                <Pill active={humanSide === 'attacker'} onClick={() => setHumanSide('attacker')} icon={<Swords size={13} />}>
                  {s.sideRaiders}
                </Pill>
                {/* Les dix marches, du marmiton au connétable. Elles
                    tiennent en deux rangées de cinq chiffres, et le nom
                    de celle qu'on a choisie s'écrit dessous : dix
                    pastilles nommées auraient poussé le bouton de départ
                    hors de l'écran. */}
                <SousTitre>{s.difficultyLabel}</SousTitre>
                <div className="grid grid-cols-5 gap-1.5">
                  {NIVEAUX_POSSIBLES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNiveau(n)}
                      aria-pressed={niveau === n}
                      aria-label={nomNiveau(n, lang === 'FR')}
                      title={nomNiveau(n, lang === 'FR')}
                      className={`min-h-[40px] rounded-card border font-sans text-xs tracking-[0.08em] transition-colors duration-200 ${
                        niveau === n
                          ? 'bg-brass text-[#1A0A05] border-brass'
                          : 'bg-black/30 text-ivory-soft border-brass/35 hover:border-brass hover:text-ivory'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="font-editorial text-[12px] md:text-[13px] text-ivory-soft/75 leading-snug">
                  {nomNiveau(niveau, lang === 'FR')}
                </p>
              </>
            )}
          </Colonne>

          <Colonne num="III" label={s.shopBoards}>
            {BOARD_SETS.map((b) => (
              <PilleJeu
                key={b.id}
                it={b}
                lang={lang}
                soon={s.shopSoon}
                active={choix.plateau === b.id}
                debloque={plateauxDebloques.includes(b.id)}
                onClick={() => onChoix('plateau', b.id)}
              />
            ))}
          </Colonne>

          <Colonne num="IV" label={s.shopPieces} tuto="coffre">
            {PIECE_SETS.map((b) => (
              <PilleJeu
                key={b.id}
                it={b}
                lang={lang}
                soon={s.shopSoon}
                active={choix.pieces === b.id}
                debloque={taflDebloques.includes(b.id)}
                onClick={() => onChoix('pieces', b.id)}
              />
            ))}
            {/* La caravane se gagne, elle ne s'achète pas : l'aperçu dit
                comment, tant qu'elle n'est pas dans le coffre (Alex, 2026-08-30). */}
            {!taflDebloques.includes('caravane') && (
              <div className="mt-1">
                <ApercuRecompense jour={8} lang={lang} className="!p-3" />
              </div>
            )}
          </Colonne>
        </div>
      </div>

      {/* Le bouton vit au bas de la fenêtre, hors du défilement : il ne
          peut plus passer sous le pli (bogue du 30 août : le panneau,
          devenu plus haut que l'écran, poussait le bouton hors de vue). */}
      <div
        className="shrink-0 flex flex-wrap items-center justify-center gap-2.5 px-4 pt-3 pb-3 md:pb-4"
        style={{ background: 'linear-gradient(0deg, rgba(10,4,6,0.96) 62%, rgba(10,4,6,0))' }}
      >
        <BoutonTutoriel onClick={onTutoriel} lang={lang} className="min-h-[48px]" />
        <button
          type="button"
          onClick={() => onBegin({ mode, humanSide, niveau, regleId })}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 min-h-[48px] rounded-card bg-brass text-[#1A0A05] border border-brass font-sans text-xs md:text-sm uppercase tracking-[0.22em] hover:bg-brass-soft transition-colors duration-200"
        >
          <Swords size={15} />
          {s.begin}
        </button>
      </div>
    </div>
  );
};

const HnefataflPage: React.FC = () => {
  // Pose l'atmosphère de la caravane sur <body> : brumes, grain, noir
  // chaud. C'est ce hook qui raccroche la page au reste du site.
  useCaravanPage();
  const { lang } = useUI();
  const s = useMemo(() => STRINGS[lang], [lang]);

  // ── Partie en ligne ──────────────────────────────────────────────
  // /jeunesse/hnefatafl?partie=<id> ouvre la partie lancée depuis
  // l'espace client. La page suit le document, rejoue les coups de
  // l'autre et pousse les miens (Alex, 2026-08-23).
  const { user } = useAuth();
  // Lu par le routeur, pas figé au premier rendu : un deuxième lien
  // ?partie= sur la même route ouvre bien la nouvelle partie
  // (vérification du 2026-08-27).
  const [params, setParams] = useSearchParams();
  const partieId = params.get('partie');
  // La visite guidée s'offre d'elle-même à la première venue, jamais
  // quand un défi attend à l'autre bout du fil.
  const tuto = useTutoriel('hnefatafl', !partieId);
  const [partie, setPartie] = useState<PartieTafl | null>(null);
  const canvasRef = useRef<CanvasHandle>(null);
  const appliques = useRef(0);
  // Les coups reçus se rejouent en file, un toutes les sept dixièmes de
  // seconde. Les minuteurs encore en vol vivent ici pour pouvoir être
  // éteints quand la table change.
  const rejeux = useRef<number[]>([]);
  const monCamp: Side | null = useMemo(() => {
    if (!partie || !user) return null;
    if (partie.camps.attacker === user.uid) return 'attacker';
    if (partie.camps.defender === user.uid) return 'defender';
    return null;
  }, [partie, user]);

  const [gameStarted, setGameStarted] = useState(false);
  // Nouvelle partie dans l'URL : on repart de zéro.
  useEffect(() => { setGameStarted(false); setPartie(null); setMaison(null); appliques.current = 0; }, [partieId]);
  // Le minuteur du coup (Alex, 2026-08-27) : le temps restant se relit
  // chaque minute; écoulé sur le tour de l'autre, je peux réclamer.
  const [tic, setTic] = useState(0);
  useEffect(() => {
    if (!partie?.echeance || partie.statut !== 'encours') return;
    const t = window.setInterval(() => setTic((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, [partie?.echeance, partie?.statut]);
  const restant = partie ? tempsRestant(partie) : null;
  void tic;
  // Aperçu de développement seulement : `?apercu=1&auto=1` ouvre la
  // partie sans passer par l'écran de choix, pour capturer la table.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('apercu') === '1' && q.get('auto') === '1') setGameStarted(true);
  }, []);
  useBadgeJeu('tafl');
  const { gagnerBadge } = useBadges();
  const musiqueRef = useRef<BoutonMusiqueHandle>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [pleinEcran, setPleinEcran] = useState(false);
  // Le panneau des amis s'ouvre par-dessus la table, sans la rétrécir.
  const [amisOuverts, setAmisOuverts] = useState(false);
  // Le nom que porte la maison quand elle a pris le siège au bout de la
  // minute d'attente. Nul tout le reste du temps, et c'est lui qui dit
  // à la page qu'elle joue contre l'ordinateur sous un nom d'emprunt.
  const [maison, setMaison] = useState<string | null>(null);
  // Les trois choses à savoir et la signature de l'atelier vivent dans
  // un panneau posé sur la table, plus dans une section sous la page.
  const [reglesOuvertes, setReglesOuvertes] = useState(false);
  const [config, setConfig] = useState<GameConfig>({
    mode: 'two-player',
    humanSide: 'defender',
    niveau: 5,
    regleId: REGLE_DEFAUT,
  });
  const [gameKey, setGameKey] = useState(0);
  // La pub AdSense se pose devant « Commencer la partie » : le vrai
  // départ (handleBegin) attend dans `pubEnAttente` et ne s'exécute
  // qu'au « Continuer » de l'interstitiel.
  const [pubEnAttente, setPubEnAttente] = useState<(() => void) | null>(null);
  // Ce que le panneau des amis doit savoir du tafl. Mémorisé : le
  // panneau se réabonne à chaque fois que l'adaptateur change.
  const jeuDefi = useMemo(
    () => jeuTafl({ lang, regleId: config.regleId, camp: config.humanSide }),
    [lang, config.regleId, config.humanSide],
  );
  // Avancement du chargement des modèles 3D. `pret` bascule quand tout
  // est en scène, ou qu'un garde-fou a libéré la partie.
  const [charge, setCharge] = useState(0);
  const [pret, setPret] = useState(false);
  // Jeux d'assets choisis dans le coffre. Relire au montage seulement :
  // changer de jeu en pleine partie remonterait la scène 3D.
  const [choix, setChoix] = useState(() => lireChoix());
  const [ui, setUi] = useState<UIState>({
    turn: 'attacker',
    over: false,
    msg: s.raidersFirst,
    vfx: null,
  });

  // Keep idle status message in sync with language without resetting the game.
  useEffect(() => {
    setUi((prev) => {
      if (prev.over) return prev;
      const next = STRINGS[lang];
      const msg = prev.turn === 'attacker' ? next.raidersMove : next.defendersMove;
      return { ...prev, msg };
    });
  }, [lang]);

  useEffect(() => {
    if (!partieId) return;
    return suivrePartie(partieId, setPartie);
  }, [partieId]);

  // Dès que la partie est en cours, on dresse la table sans passer par
  // l'écran de préparation : les réglages ont été choisis au défi.
  useEffect(() => {
    if (!partie || partie.statut !== 'encours' || gameStarted) return;
    setRegle(partie.regleId);
    appliques.current = 0;
    setConfig({ mode: 'two-player', humanSide: 'defender', niveau: 5, regleId: partie.regleId });
    setGameKey((k) => k + 1);
    setCharge(0);
    setPret(false);
    setUi({ turn: 'attacker', over: false, msg: s.raidersFirst, vfx: null });
    setGameStarted(true);
  }, [partie, gameStarted, s]);

  // Les coups arrivés depuis l'autre bout se rejouent sur le damier.
  useEffect(() => {
    if (!partie || !pret || !gameStarted) return;
    const restants = partie.coups.slice(appliques.current);
    if (restants.length === 0) return;
    restants.forEach((coup, i) => {
      const [fr, fc, tr, tc] = coupDepuisTexte(coup);
      // Un coup par tranche : les animations s'enchaînent proprement.
      rejeux.current.push(window.setTimeout(
        () => canvasRef.current?.jouerDistant(fr, fc, tr, tc), i * 700,
      ));
    });
    appliques.current = partie.coups.length;
  }, [partie, pret, gameStarted]);

  // La table change (nouvelle saga, bascule sur la maison, autre lien
  // ?partie=) : les coups encore en file s'éteignent avec elle. Sans
  // cela, un coup de la partie d'avant tombait sur le damier neuf, où
  // l'arbitre le refusait sans que personne ne sache pourquoi.
  useEffect(() => () => {
    rejeux.current.forEach((m) => window.clearTimeout(m));
    rejeux.current = [];
  }, [gameKey]);

  const handleBegin = (next: GameConfig, nomMaison: string | null = null) => {
    // Le règlement s'applique AVANT que la scène ne se monte : il fixe
    // la taille du damier et la mise en place.
    setRegle(next.regleId);
    setConfig(next);
    // Le nom d'emprunt se pose ici et nulle part ailleurs : toute
    // partie qui commence autrement que par la maison le retire, sinon
    // la carte « Contre X » survivait à la saga suivante.
    setMaison(nomMaison);
    setGameKey((k) => k + 1);
    setCharge(0);
    setPret(false);
    setUi({ turn: 'attacker', over: false, msg: s.raidersFirst, vfx: null });
    setGameStarted(true);
    // Le clic sur « Commencer la partie » EST le geste utilisateur qui
    // autorise la lecture avec son : la musique démarre ici plutôt que
    // d'attendre un second clic sur son propre bouton. Demande d'Alex,
    // 2026-08-04.
    musiqueRef.current?.demarrer();
  };

  // La maison prend le siège. Alex, 2026-09-01 : « pas proposer, juste
  // partir une partie contre l'ordinateur et randomiser le nom de
  // l'adversaire. Par contre il faut que l'adversaire soit très fort. »
  // La partie s'ouvre donc sur-le-champ, à la dixième marche, sans
  // écran de choix et sans réclame, et le nom tiré au sort remplace
  // « l'ordinateur » partout où l'adversaire est nommé.
  const prendreLaMaison = (nom: string) => {
    // Aucune réclame ne s'interpose : la minute d'attente a déjà été
    // longue. Un interstitiel resté en attente s'efface avec elle.
    setPubEnAttente(null);
    handleBegin({ ...config, mode: 'vs-cpu', niveau: 10 }, nom);
  };

  // Qui je suis à la table. Une personne sans compte parle quand même
  // pendant une partie contre la maison : son fil ne quitte jamais la
  // page, et la table ouverte, elle, reste réservée aux comptes.
  const moi = useMemo(() => ({
    uid: user?.uid ?? 'invite',
    nom: user?.displayName?.trim() || (lang === 'FR' ? 'Vous' : 'You'),
  }), [user?.uid, user?.displayName, lang]);
  const nomEnFace = partie
    ? (partie.noms[partie.joueurs.find((u) => u !== user?.uid) ?? ''] ?? '—')
    : (maison ?? '');

  const returnToMenu = () => {
    setGameStarted(false);
    // 🚨 L'écran de victoire (ui.over) n'est pas gardé par `gameStarted` :
    // il flotte en z-[5] au-dessus du lobby pour pouvoir s'afficher
    // pendant la partie. Sans ce reset, il restait collé à l'écran après
    // « Nouvelle saga », masquant le lobby et donnant l'impression que
    // le bouton ne faisait rien. Bug signalé par Alex le 2026-08-04.
    setUi({ turn: 'attacker', over: false, msg: s.raidersFirst, vfx: null });
  };

  // Plein écran : bascule le conteneur de la scène, pas la page
  // entière (le bandeau d'état et la légende restent visibles). On
  // écoute l'événement natif plutôt que de ne se fier qu'au clic, parce
  // que le navigateur peut aussi sortir du plein écran via Échap, par un
  // raccourci système ou par son propre bouton, et la page doit revenir
  // en ordre dans les trois cas : l'état commande la hauteur du
  // conteneur, et le ResizeObserver de la scène remesure le canevas.
  useEffect(() => {
    const surChangement = () => setPleinEcran(document.fullscreenElement === sceneRef.current);
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', surChangement);
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('fullscreenchange', surChangement);
      document.removeEventListener('keydown', surTouche);
    };
  }, []);

  const basculerPleinEcran = () => {
    if (!sceneRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      sceneRef.current.requestFullscreen().catch(() => {});
    }
  };

  /** Ce que la boîte d'aide affiche : le tour courant, puis le geste
   *  attendu MAINTENANT, lu sur l'état réel du damier. */
  const aideAction = (() => {
    if (!gameStarted) return s.aidePreparer;
    if (ui.over) return s.aideFini;
    const tour = ui.turn === 'attacker' ? s.raidersMove : s.defendersMove;
    if (partieId && monCamp && ui.turn !== monCamp) {
      const autre = partie?.noms[partie.joueurs.find((u) => u !== user?.uid) ?? ''] ?? '—';
      return `${tour} · ${s.aideAttente(autre)}`;
    }
    if (!partieId && config.mode === 'vs-cpu' && ui.turn !== config.humanSide) {
      return `${tour} · ${maison ? s.aideAttente(maison) : s.aideOrdinateur}`;
    }
    const prefixe = partieId ? `${s.aideAVous} ` : '';
    return `${tour} · ${prefixe}${ui.turn === 'defender' ? s.aideRoi : s.aideRaiders}`;
  })();

  // Pastille de tour : oxblood du site pour les Raiders, os pour les
  // Défenseurs. Plus de rouge néon ni de jaune saturé.
  const tc = ui.turn === 'attacker' ? '#A6392B' : '#E8DDC1';
  return (
    <>
      <SEO title={`${s.pageTitle} | FMM 2026`} description={s.pageIntro} />

      {/* Une seule page : le hero, puis la table qui prend tout l'écran,
          et le reste posé dessus en verre sombre. Les trois choses à
          savoir et la signature de l'atelier ne vivent plus dans des
          sections détachées sous le jeu (Alex, 2026-08-23). */}
      <CadreJeu
        eyebrow={s.pageEyebrow}
        titre={s.pageTitle}
        intro={s.pageIntro}
        orbImage="/jeux/tuile-tafl-v2.webp"
        lang={lang}
      >
        {/* ── La table ────────────────────────────────────────────── */}
        <div ref={sceneRef} data-tuto="plateau" className="absolute inset-0 bg-[#0a0406]">
          {/* La porte de sortie du plein écran. Le bandeau qui porte la
              bascule reste hors du plein écran : sans ce bouton, il ne
              resterait que la touche Échap, que personne ne devine. */}
          {pleinEcran && (
            <button
              type="button"
              onClick={basculerPleinEcran}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-[7] inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-[15px] border border-brass/55 bg-black/70 backdrop-blur-md text-ivory hover:bg-brass hover:text-[#1A0A05] hover:border-brass transition-colors duration-200 font-sans text-[10px] md:text-[11px] uppercase tracking-[0.18em]"
              style={{ boxShadow: '0 10px 34px rgba(0,0,0,0.6)' }}
            >
              <Minimize2 size={13} />
              {s.quitterPleinEcran}
            </button>
          )}

          {gameStarted && (
            <GameCanvas
              ref={canvasRef}
              gameKey={gameKey}
              onUi={setUi}
              langue={lang}
              strings={s}
              config={config}
              enLigne={partieId && monCamp ? {
                monCamp,
                fige: partie?.statut !== 'encours',
                surMonCoup: ({ fr, fc, tr, tc, tourSuivant, gagnant }) => {
                  appliques.current += 1;
                  // Une partie menée jusqu'au bout vaut son badge,
                  // gagnée ou perdue : c'est d'aller au bout qui compte.
                  if (gagnant) gagnerBadge('tafl');
                  void jouerCoup(
                    partieId,
                    partie?.coups ?? [],
                    coupEnTexte(fr, fc, tr, tc),
                    tourSuivant,
                    gagnant,
                    partie?.delaiMs,
                  );
                },
              } : null}
              boardSetId={choix.plateau}
              pieceSetId={choix.pieces}
              onLoad={(p, done) => {
                setCharge(p);
                if (done) setPret(true);
              }}
            />
          )}

          {/* ── Écran d'attente ───────────────────────────────────
              Le plateau et les pièces pèsent près de 2,5 Mo : sans cet
              écran, la partie s'ouvrait sur un plateau procédural nu
              qui se transformait sous les yeux du joueur. La barre suit
              le vrai décompte du LoadingManager. */}
          <AnimatePresence>
            {gameStarted && !pret && (
              <motion.div
                key="chargement"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute inset-0 z-[6] flex flex-col items-center justify-center px-6 text-center bg-[rgba(10,4,6,0.92)] backdrop-blur-md"
              >
                <img
                  src="/salon/salon-logo.webp"
                  alt=""
                  aria-hidden
                  className="h-12 w-auto opacity-70 mb-6 animate-pulse"
                />
                <p className="font-editorial uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">
                  {s.loadingLead}
                </p>
                <h3 className="font-display title-medieval text-2xl md:text-4xl text-ivory leading-tight mb-7">
                  {s.loadingTitle}
                </h3>
                {/* Jauge de laiton */}
                <div
                  className="w-56 md:w-72 h-[3px] rounded-full overflow-hidden"
                  style={{ background: 'rgba(244,239,227,0.12)' }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(charge * 100)}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-300 ease-out"
                    style={{
                      width: `${Math.max(6, Math.round(charge * 100))}%`,
                      background:
                        'linear-gradient(90deg, var(--color-brass), var(--color-amber-glow))',
                      boxShadow: '0 0 12px rgba(232,177,74,0.55)',
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!gameStarted && (
            <>
              {/* Le plateau en photo derrière l'écran de préparation :
                  le flou a quelque chose à flouter, et on voit ce qui
                  nous attend. */}
              <div
                aria-hidden
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: 'url(/photos/hnefatafl-card.webp)' }}
              />
              <StartScreen
                initial={config}
                strings={s}
                onBegin={(next) => setPubEnAttente(() => () => handleBegin(next))}
                lang={lang}
                choix={choix}
                onTutoriel={tuto.ouvrir}
                onChoix={(cle, id) => {
                  const n = { ...choix, [cle]: id };
                  setChoix(n);
                  ecrireChoix(n.plateau, n.pieces);
                }}
              />
            </>
          )}

          {/* La pub AdSense, devant tout le reste, entre le clic sur
              « Commencer la partie » et le vrai départ. */}
          {pubEnAttente && (
            <PubDebutPartie
              lang={lang}
              jeu="hnefatafl"
              onContinuer={() => { const action = pubEnAttente; setPubEnAttente(null); action(); }}
            />
          )}

          <AnimatePresence>
            {ui.vfx === 'king-escape' && (
              <motion.div
                key={`fx-escape-${gameKey}`}
                initial={{ opacity: 0.9 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
                className="absolute inset-0 z-[4] pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at center, rgba(232,177,74,0.8) 0%, rgba(184,106,42,0.45) 35%, rgba(0,0,0,0) 70%)',
                }}
              />
            )}
            {ui.vfx === 'king-fall' && (
              <motion.div
                key={`fx-fall-${gameKey}`}
                initial={{ opacity: 0.95 }}
                animate={{ opacity: 0.4 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                className="absolute inset-0 z-[4] pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(40,0,0,0) 30%, rgba(107,31,31,0.6) 75%, rgba(20,0,0,0.9) 100%)',
                }}
              />
            )}
          </AnimatePresence>

          {ui.over && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 1.2, ease: 'easeOut' }}
              className="absolute inset-0 z-[5] flex flex-col items-center justify-center px-6 text-center bg-[rgba(10,4,6,0.85)] backdrop-blur-md"
            >
              <p className="font-editorial uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">
                {s.ending}
              </p>
              <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory leading-[1.15] max-w-xl">
                {ui.msg}
              </h2>
              <div className="divider-brass w-24 mx-auto my-7" />
              <button
                type="button"
                onClick={returnToMenu}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 min-h-[48px] rounded-[15px] bg-brass text-[#1A0A05] border border-brass font-sans text-xs md:text-sm uppercase tracking-[0.22em] hover:bg-brass-soft transition-colors duration-200"
              >
                <RotateCcw size={15} />
                {s.newSaga}
              </button>
            </motion.div>
          )}
        </div>

        {/* ── Bandeau du haut : à qui de jouer, et les commandes ──── */}
        {/* Le côté droit garde sa place libre pour le X de fermeture. */}
        <div
          className="absolute top-0 inset-x-0 z-30 flex flex-wrap items-center justify-between gap-3 pl-4 md:pl-7 pr-16 md:pr-20 py-3"
          style={{ background: 'linear-gradient(180deg, rgba(8,3,5,0.92), rgba(8,3,5,0))' }}
        >
          <span className="inline-flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: tc, boxShadow: `0 0 10px ${tc}` }}
            />
            <span className="font-sans text-[11px] md:text-xs uppercase tracking-[0.18em] text-ivory-soft truncate">
              {gameStarted ? ui.msg : s.tableReady}
            </span>
          </span>
          <span className="shrink-0 inline-flex items-center gap-2" data-tuto="musique">
            <BoutonMusique ref={musiqueRef} cle="hnefatafl" defaut="nordique" lang={lang} onLabel={s.musiqueOn} offLabel={s.musiqueOff} />
            <button
              type="button"
              onClick={basculerPleinEcran}
              title={pleinEcran ? s.quitterPleinEcran : s.pleinEcran}
              aria-pressed={pleinEcran}
              className="shrink-0 inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors duration-200 font-sans text-[10px] md:text-[11px] uppercase tracking-[0.18em]"
            >
              {pleinEcran ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              <span className="hidden sm:inline">{pleinEcran ? s.quitterPleinEcran : s.pleinEcran}</span>
            </button>
            {gameStarted && (
              <button
                type="button"
                onClick={returnToMenu}
                className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors duration-200 font-sans text-[10px] md:text-[11px] uppercase tracking-[0.18em]"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">{s.newSaga}</span>
              </button>
            )}
          </span>
        </div>

        {/* ── Le défi en attente : accepter, refuser, ou patienter ── */}
        {partie && user && (partie.statut === 'defi' || partie.statut === 'refuse') && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[min(24rem,calc(100%-2rem))] rounded-[15px] border border-brass/40 bg-black/70 backdrop-blur-md px-6 py-6 text-center">
            <p className="font-sans uppercase tracking-[0.25em] text-[10px] text-brass mb-2">
              {lang === 'FR' ? 'Défi' : 'Challenge'}
            </p>
            <p className="font-display text-lg text-ivory mb-2">
              {partie.statut === 'refuse'
                ? (lang === 'FR' ? 'Ce défi a été refusé.' : 'This challenge was declined.')
                : partie.lancePar === user.uid
                  ? (lang === 'FR'
                      ? `Défi envoyé à ${partie.noms[partie.joueurs.find((u) => u !== user.uid) ?? ''] ?? '—'}`
                      : `Challenge sent to ${partie.noms[partie.joueurs.find((u) => u !== user.uid) ?? ''] ?? '—'}`)
                  : (lang === 'FR'
                      ? `${partie.noms[partie.lancePar] ?? '—'} vous défie`
                      : `${partie.noms[partie.lancePar] ?? '—'} challenges you`)}
            </p>
            {partie.statut === 'defi' && partie.lancePar === user.uid && (
              <p className="font-sans text-xs text-ivory-soft/70">
                {lang === 'FR'
                  ? 'La table se dresse dès que la personne accepte. Vous pouvez revenir plus tard : la partie vous attendra dans vos notifications.'
                  : 'The table is set as soon as they accept. You can come back later: the game will wait in your notifications.'}
              </p>
            )}
            {partie.statut === 'defi' && partie.lancePar !== user.uid && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button type="button" onClick={() => { void repondreAuDefi(partie.id, true, partie.delaiMs); }}
                        className="px-5 py-2.5 rounded-[15px] bg-brass text-midnight-deep font-sans uppercase tracking-[0.18em] text-[10px] font-semibold hover:bg-brass-soft transition-colors">
                  {lang === 'FR' ? 'Accepter' : 'Accept'}
                </button>
                <button type="button" onClick={() => { void repondreAuDefi(partie.id, false); }}
                        className="px-5 py-2.5 rounded-[15px] border border-white/20 text-ivory-soft hover:text-ivory font-sans uppercase tracking-[0.18em] text-[10px] transition-colors">
                  {lang === 'FR' ? 'Refuser' : 'Decline'}
                </button>
              </div>
            )}
            {partie.delaiMs ? (
              <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.18em] text-ivory-soft/55">
                {lang === 'FR' ? `Minuteur : ${formatDelai(partie.delaiMs, true)} par coup` : `Timer: ${formatDelai(partie.delaiMs, false)} per move`}
              </p>
            ) : null}
          </div>
        )}

        {/* ── La partie en ligne : contre qui, quel camp, à qui de jouer ── */}
        {partie && monCamp && (
          <div className="absolute left-3 md:left-6 top-16 z-20 w-[min(22rem,calc(100%-1.5rem))] rounded-[15px] border border-white/15 bg-black/45 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block font-display text-[13px] text-ivory truncate">
                {lang === 'FR' ? 'Contre' : 'Against'}{' '}
                {partie.noms[partie.joueurs.find((u) => u !== user?.uid) ?? ''] ?? '—'}
              </span>
              <span className="block font-sans text-[9px] uppercase tracking-[0.16em] text-ivory-soft/60 mt-1">
                {monCamp === 'attacker'
                  ? (lang === 'FR' ? 'Vous menez les assaillants' : 'You lead the raiders')
                  : (lang === 'FR' ? 'Vous défendez le roi' : 'You defend the king')}
                {' · '}
                {partie.statut === 'fini'
                  ? (lang === 'FR' ? 'Partie terminée' : 'Game over')
                  : partie.tour === monCamp
                    ? (lang === 'FR' ? 'À vous de jouer' : 'Your move')
                    : (lang === 'FR' ? 'En attente de l’autre' : 'Waiting for them')}
              </span>
            </span>
            {partie.statut === 'encours' && restant !== null && (
              restant <= 0 && partie.tour !== monCamp ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!partieId || !user) return;
                    const perdant = partie.camps[partie.tour];
                    void reclamerForfait(partieId, perdant, monCamp);
                  }}
                  className="shrink-0 px-3 py-2 rounded-[15px] bg-brass text-midnight-deep font-sans text-[9px] uppercase tracking-[0.18em] font-semibold hover:bg-brass-soft transition-colors"
                >
                  {lang === 'FR' ? 'Temps écoulé · réclamer' : 'Time is up · claim'}
                </button>
              ) : (
                <span className="shrink-0 font-sans text-[9px] uppercase tracking-[0.18em]"
                      style={{ color: restant < 3_600_000 ? '#E08A6E' : 'rgba(244,239,227,0.6)' }}>
                  ⏳ {formatDelai(restant, lang === 'FR')}
                </span>
              )
            )}
            {partie.statut === 'encours' && (
              <button
                type="button"
                onClick={() => {
                  if (!partieId || !user) return;
                  void abandonner(partieId, user.uid, monCamp === 'attacker' ? 'defender' : 'attacker');
                }}
                className="shrink-0 px-3 py-2 rounded-[15px] border border-white/15 text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors font-sans text-[9px] uppercase tracking-[0.18em]"
              >
                {lang === 'FR' ? 'Abandonner' : 'Resign'}
              </button>
            )}
          </div>
        )}

        {/* ── Les amis, en overlay sur la table ────────────────────── */}
        {user && (
          <>
            <button
              type="button"
              onClick={() => setAmisOuverts((v) => !v)}
              aria-expanded={amisOuverts}
              className="absolute top-16 right-3 md:right-6 z-20 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[15px] border border-white/15 bg-black/45 backdrop-blur-md text-ivory-soft hover:text-ivory hover:border-brass/50 transition-colors font-sans text-[10px] uppercase tracking-[0.2em]"
            >
              <Users size={13} className="text-brass" />
              {lang === 'FR' ? 'Défier un ami' : 'Challenge a friend'}
            </button>
            <AnimatePresence>
              {amisOuverts && (
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-16 right-3 md:right-6 z-30 w-[min(20rem,calc(100%-1.5rem))] max-h-[calc(100%-8rem)] overflow-y-auto rounded-[15px] border border-white/15 bg-black/55 backdrop-blur-xl p-3"
                >
                  <button
                    type="button"
                    onClick={() => setAmisOuverts(false)}
                    aria-label={lang === 'FR' ? 'Fermer' : 'Close'}
                    className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full text-ivory-soft/70 hover:text-ivory hover:bg-white/10 transition-colors"
                  >
                    <X size={15} />
                  </button>
                  <PanneauAmis lang={lang} jeu={jeuDefi} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── La table ouverte et la parole, en overlay elles aussi ──
            Le plateau garde toute sa largeur : les deux panneaux se
            posent DESSUS, dans le patron du panneau des amis. */}
        <HnefataflPanneaux
          lang={lang}
          regleId={config.regleId}
          monCamp={config.humanSide}
          nomRegle={(id) => { const r = regle(id); return lang === 'FR' ? r.nomFR : r.nomEN; }}
          surPartie={(id) => setParams({ partie: id })}
          surOrdinateur={prendreLaMaison}
          salle={partieId ? { collection: 'taflParties' as const, partieId } : null}
          moi={moi}
          connecte={!!user && !partieId}
          adversaire={nomEnFace}
          maison={maison}
        />

        {/* ── Les règles, dans un panneau posé sur la table ────────── */}
        <AnimatePresence>
          {reglesOuvertes && (
            <motion.aside
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-3 md:left-6 bottom-20 z-30 w-[22rem] max-w-[calc(100%-1.5rem)] max-h-[72%] overflow-y-auto rounded-[15px] border border-white/15 bg-black/60 backdrop-blur-xl p-5"
            >
              <button
                type="button"
                onClick={() => setReglesOuvertes(false)}
                aria-label={lang === 'FR' ? 'Fermer' : 'Close'}
                className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full text-ivory-soft/70 hover:text-ivory hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>
              <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-[var(--color-amber-glow)] mb-1.5">
                {s.rulesEyebrow}
              </p>
              <h2 className="font-display title-medieval text-xl text-ivory">
                {s.rulesTitle}
              </h2>
              <div className="divider-brass w-12 my-4" />
              <ol className="space-y-4 list-none">
                {s.rules.map((r, i) => {
                  const Icon = [Crown, Users, Swords][i] ?? Crown;
                  return (
                    <li key={r.title} className="flex gap-3">
                      <span
                        aria-hidden
                        className="w-9 h-9 shrink-0 rounded-full bg-brass/15 border border-brass/40 grid place-items-center"
                      >
                        <Icon size={16} className="text-brass" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display title-medieval text-base text-ivory mb-1">
                          {r.title}
                        </span>
                        <span className="block font-editorial text-[13px] text-ivory-soft leading-relaxed">
                          {r.body}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>

              {/* L'atelier qui a bâti le jeu, et le chemin pour l'emporter
                  chez soi. Ce bloc vivait dans une section détachée sous
                  la page : il vit maintenant ici. */}
              <div className="mt-5 pt-4 border-t border-white/10">
                <p className="font-editorial text-[13px] text-ivory-soft/85 leading-relaxed mb-3">
                  {s.builtLead}
                </p>
                <a
                  href="https://www.lesalondesinconnus.com/outils"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[15px] border border-brass/45 text-ivory hover:bg-brass hover:text-[#1A0A05] hover:border-brass transition-colors duration-200 font-sans text-[10px] uppercase tracking-[0.18em]"
                >
                  <Download size={13} />
                  {s.builtCta}
                </a>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Bandeau du bas : les règles, le geste, les camps ─────── */}
        <div
          className="absolute inset-x-0 bottom-0 z-[3] flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-3 md:px-6 pt-10 pb-3"
          style={{ background: 'linear-gradient(0deg, rgba(8,3,5,0.94), rgba(8,3,5,0))' }}
        >
          <button
            type="button"
            onClick={() => setReglesOuvertes((v) => !v)}
            aria-expanded={reglesOuvertes}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brass/45 bg-black/50 backdrop-blur-md font-sans uppercase tracking-[0.18em] text-[10px] text-ivory hover:bg-brass/15 transition-colors duration-200"
          >
            <Scroll size={13} className="text-brass" />
            {reglesOuvertes ? s.cacherRegles : s.afficherRegles}
          </button>
          <BoutonTutoriel onClick={tuto.ouvrir} lang={lang} className="!min-h-0 py-2" />
          <span className="font-sans text-[10px] md:text-[11px] text-ivory-soft/65 text-center">
            {s.hint}
          </span>
          <span className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-sans text-[10px] md:text-[11px]">
            <span style={{ color: '#C0503E' }}>{s.raidersDot}</span>
            <span className="text-ivory-soft">{s.defendersDot}</span>
            <span className="text-brass">{s.kingDot}</span>
          </span>
        </div>
        {/* ── « Je ne sais pas quoi faire » ───────────────────────── */}
        {!ui.over && (
          <BoiteAide
            but={s.aideBut}
            action={aideAction}
            lang={lang}
            className="right-3 md:right-6 bottom-24"
          />
        )}
      </CadreJeu>

      <Tutoriel jeu="hnefatafl" lang={lang} ouvert={tuto.ouvert} onFermer={tuto.fermer} />
    </>
  );
};

export default HnefataflPage;
