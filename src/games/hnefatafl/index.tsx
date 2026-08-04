// ─── Hnefatafl — plateau 3D jouable, entrée de route ────────────────
// Refondue le 2026-08-03 : c'était un jeu plein écran en noir absolu,
// avec sa propre palette (jaune #FFD700), sa propre bande de titre et
// aucun lien visuel avec le reste du site. C'est maintenant une PAGE
// DU SITE comme les autres : PageHeader à orbe, brumes de la caravane,
// typographie Cinzel, laiton, barre de navigation et pied de page.
// Le plateau vit dans une scène cadrée (et non plus en 100vh), suivie
// d'un rappel des règles. Toute couleur en dur a été remplacée par les
// jetons du design system (--color-bone, --color-brass, etc).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Shield, Swords, Users, Cpu, RotateCcw, Download, Music, VolumeX, Check, Lock } from 'lucide-react';

import { useUI } from '../../contexts/AppContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import SEO from '../../components/SEO';
import PageHeader from '../../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem } from '../../components/scroll';
import {
  applyMove,
  CELL,
  MID,
  N,
  checkWin,
  hasAnyMoves,
  initBoard,
  validMoves,
  type Board,
  type Coord,
  type Side,
} from './gameLogic';
import { setupScene } from './sceneSetup';
import { buildBoard } from './boardMesh';
import { createPieceSystem } from './pieceMesh';
import { createHighlightSystem } from './highlightSystem';
import { pickMove, type Difficulty } from './cpuPlayer';
import { BOARD_SETS, PIECE_SETS, lireChoix, ecrireChoix } from './assets';
import { annoncerLecture, ecouterExclusivite } from '../../lib/audioExclusif';

type Mode = 'two-player' | 'vs-cpu';

interface GameConfig {
  mode: Mode;
  humanSide: Side; // ignored when mode === 'two-player'
  difficulty: Difficulty;
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
  kingEscapes: string;
  kingFalls: string;
  noMoves: (winner: string) => string;
  defenders: string;
  raiders: string;
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
  diffEasy: string;
  diffMedium: string;
  diffHard: string;
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
  shopEyebrow:  string;
  shopTitle:    string;
  shopLead:     string;
  shopBoards:   string;
  shopPieces:   string;
  shopSoon:     string;
  shopActive:   string;
  shopNextSaga: string;
}

const STRINGS: Record<'FR' | 'EN', GameStrings> = {
  FR: {
    raidersFirst: 'Les Raiders commencent',
    raidersMove: 'Tour des Raiders',
    defendersMove: 'Tour des Défenseurs',
    raidersThinking: 'Les Raiders réfléchissent…',
    defendersThinking: 'Les Défenseurs réfléchissent…',
    kingEscapes: 'Le Roi s\'échappe. Victoire des Défenseurs',
    kingFalls: 'Le Roi tombe. Victoire des Raiders',
    noMoves: (winner) => `Plus aucun coup possible : ${winner} l'emportent`,
    defenders: 'les Défenseurs',
    raiders: 'les Raiders',
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
    difficultyLabel: 'DIFFICULTÉ',
    diffEasy: 'Facile',
    diffMedium: 'Intermédiaire',
    diffHard: 'Difficile',
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
    loadingLead: 'Le plateau est sculpté, les pièces arrivent de l\u2019atelier.',
    musiqueOn: 'Couper la musique',
    musiqueOff: 'Musique',
    shopEyebrow: 'Le coffre',
    shopTitle: 'Votre plateau, vos pièces',
    shopLead: 'Choisissez le plateau et les pièces séparément. Votre choix est gardé sur cet appareil, et suivra votre compte quand le coffre sera rattaché à l\u2019espace client.',
    shopBoards: 'Plateaux',
    shopPieces: 'Pièces',
    shopSoon: 'Bientôt',
    shopActive: 'En jeu',
    shopNextSaga: 'Prend effet à la prochaine saga.',
  },
  EN: {
    raidersFirst: 'Raiders move first',
    raidersMove: 'Raiders move',
    defendersMove: 'Defenders move',
    raidersThinking: 'Raiders thinking…',
    defendersThinking: 'Defenders thinking…',
    kingEscapes: 'The King has escaped. Defenders win',
    kingFalls: 'The King falls. Raiders win',
    noMoves: (winner) => `No moves left: ${winner} win`,
    defenders: 'Defenders',
    raiders: 'Raiders',
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
    difficultyLabel: 'DIFFICULTY',
    diffEasy: 'Easy',
    diffMedium: 'Medium',
    diffHard: 'Hard',
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
    loadingLead: 'The board is carved, the pieces are on their way.',
    musiqueOn: 'Mute the music',
    musiqueOff: 'Music',
    shopEyebrow: 'The chest',
    shopTitle: 'Your board, your pieces',
    shopLead: 'Pick the board and the pieces separately. Your choice is kept on this device, and will follow your account once the chest is tied to the client space.',
    shopBoards: 'Boards',
    shopPieces: 'Pieces',
    shopSoon: 'Coming soon',
    shopActive: 'In play',
    shopNextSaga: 'Takes effect on the next saga.',
  },
};

const CPU_THINK_MS = 500;

interface GameCanvasProps {
  gameKey: number;
  onUi: (ui: UIState) => void;
  strings: GameStrings;
  config: GameConfig;
  /** Avancement du chargement des modèles, de 0 à 1, puis `true` quand
   *  tout est en scène (ou qu'un asset a définitivement échoué). */
  onLoad: (progress: number, done: boolean) => void;
  /** Jeux d'assets choisis dans le coffre. */
  boardSetId: string;
  pieceSetId: string;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameKey, onUi, strings, config, onLoad, boardSetId, pieceSetId }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stringsRef = useRef(strings);
  stringsRef.current = strings;
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // `alive` flips false in cleanup. All deferred callbacks (gsap
    // onComplete, setTimeout, animation chain) check this before touching
    // React state or scene objects — protects against StrictMode double-
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

    const board0: Board = initBoard();
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

    // ── CPU scheduling — single in-flight timeout, cancellable ─────
    let cpuTimer: ReturnType<typeof setTimeout> | null = null;
    const cancelCpu = () => {
      if (cpuTimer !== null) {
        clearTimeout(cpuTimer);
        cpuTimer = null;
      }
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
      if (!cpuShouldMove()) return;
      onUi({ turn: gs.turn, over: false, msg: turnMsg(gs.turn, true) });
      cpuTimer = setTimeout(() => {
        cpuTimer = null;
        if (!cpuShouldMove()) return;
        const cfg = configRef.current;
        const move = pickMove(gs.board, gs.turn, cfg.difficulty);
        if (!move) return; // hasAnyMoves was true, but be defensive
        commitMove(move.from[0], move.from[1], move.to[0], move.to[1]);
      }, CPU_THINK_MS);
    };

    const finishMove = () => {
      if (!alive) return;
      gs.animating = false;
      const w = checkWin(gs.board);
      if (w) {
        gs.over = true;
        cancelCpu();
        const s = stringsRef.current;
        const isKingEscape = w === 'defender';
        if (isKingEscape) scene.pushCameraIn(0.78, 1.6);
        onUi({
          turn: gs.turn,
          over: true,
          msg: isKingEscape ? s.kingEscapes : s.kingFalls,
          vfx: isKingEscape ? 'king-escape' : 'king-fall',
        });
        return;
      }
      const nextTurn: Side = gs.turn === 'attacker' ? 'defender' : 'attacker';
      if (!hasAnyMoves(gs.board, nextTurn)) {
        gs.over = true;
        cancelCpu();
        const s = stringsRef.current;
        const winnerLabel = nextTurn === 'attacker' ? s.defenders : s.raiders;
        onUi({ turn: nextTurn, over: true, msg: s.noMoves(winnerLabel), vfx: null });
        return;
      }
      gs.turn = nextTurn;
      onUi({ turn: gs.turn, over: false, msg: turnMsg(gs.turn, false), vfx: null });
      scheduleCpu();
    };

    const commitMove = (fr: number, fc: number, tr: number, tc: number) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[Hnefatafl] commitMove', { fr, fc, tr, tc, piece: gs.board[fr][fc], turn: gs.turn });
      }
      // Garde defensive : jamais commettre depuis une case vide (un
      // commit fantome basculerait le tour sans bouger le plateau).
      if (!gs.board[fr]?.[fc]) return;
      const { board: nb, removed } = applyMove(gs.board, fr, fc, tr, tc);
      gs.board = nb;
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

    const handleSqClick = (r: number, c: number) => {
      if (gs.over || gs.animating) return;
      // While the CPU is thinking, lock human input on the CPU's turn.
      if (cpuShouldMove()) return;
      const cfg = configRef.current;
      // In vs-CPU mode, lock human input on the CPU's side at all times
      // (the cpuShouldMove() check above only fires after a turn flip;
      // this guards a defender-side human from poking raider pieces).
      if (cfg.mode === 'vs-cpu' && gs.turn !== cfg.humanSide) return;

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
};

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
    className={`inline-flex items-center gap-2 px-4 py-2.5 md:px-5 rounded-card border font-sans text-[11px] md:text-xs uppercase tracking-[0.18em] transition-colors duration-200 min-h-[44px] ${
      active
        ? 'bg-brass text-[#1A0A05] border-brass'
        : 'bg-black/30 text-ivory-soft border-brass/35 hover:border-brass hover:text-ivory'
    }`}
  >
    {icon}
    {children}
  </button>
);

// ─── Start screen overlay ───────────────────────────────────────────
interface StartScreenProps {
  initial: GameConfig;
  strings: GameStrings;
  onBegin: (config: GameConfig) => void;
}
const StartScreen: React.FC<StartScreenProps> = ({ initial, strings: s, onBegin }) => {
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [humanSide, setHumanSide] = useState<Side>(initial.humanSide);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty);

  const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="mb-6 text-center">
      <p className="font-sans text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-brass/70 mb-3">
        {label}
      </p>
      <div className="flex flex-wrap justify-center gap-2.5">{children}</div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-[5] flex items-center justify-center overflow-y-auto px-4 py-8 bg-[rgba(10,4,6,0.82)] backdrop-blur-md">
      <div className="w-full max-w-lg text-center">
        <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">
          {s.startSubtitle}
        </p>
        <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-[1.06]">
          {s.startTitle}
        </h2>
        <div className="divider-brass w-24 mx-auto mt-5 mb-8" />

        <Row label={s.modeLabel}>
          <Pill
            active={mode === 'two-player'}
            onClick={() => setMode('two-player')}
            icon={<Users size={13} />}
          >
            {s.modeTwoPlayer}
          </Pill>
          <Pill
            active={mode === 'vs-cpu'}
            onClick={() => setMode('vs-cpu')}
            icon={<Cpu size={13} />}
          >
            {s.modeVsCpu}
          </Pill>
        </Row>

        {mode === 'vs-cpu' && (
          <>
            <Row label={s.sideLabel}>
              <Pill
                active={humanSide === 'defender'}
                onClick={() => setHumanSide('defender')}
                icon={<Shield size={13} />}
              >
                {s.sideDefenders}
              </Pill>
              <Pill
                active={humanSide === 'attacker'}
                onClick={() => setHumanSide('attacker')}
                icon={<Swords size={13} />}
              >
                {s.sideRaiders}
              </Pill>
            </Row>

            <Row label={s.difficultyLabel}>
              <Pill active={difficulty === 'easy'} onClick={() => setDifficulty('easy')}>
                {s.diffEasy}
              </Pill>
              <Pill active={difficulty === 'medium'} onClick={() => setDifficulty('medium')}>
                {s.diffMedium}
              </Pill>
              <Pill active={difficulty === 'hard'} onClick={() => setDifficulty('hard')}>
                {s.diffHard}
              </Pill>
            </Row>
          </>
        )}

        <button
          type="button"
          onClick={() => onBegin({ mode, humanSide, difficulty })}
          className="mt-4 inline-flex items-center gap-2.5 px-8 py-3.5 min-h-[48px] rounded-card bg-brass text-[#1A0A05] border border-brass font-sans text-xs md:text-sm uppercase tracking-[0.22em] hover:bg-brass-soft transition-colors duration-200"
        >
          <Swords size={15} />
          {s.begin}
        </button>
      </div>
    </div>
  );
};

// ─── Musique du plateau ─────────────────────────────────────────────
// Facultative, jamais automatique, et exclusive : elle coupe le lecteur
// de l'en-tête quand elle démarre (et réciproquement).
// Piste : « Nordic Wist » de Kevin MacLeod, CC BY 4.0.
const MUSIQUE_URL = '/audio/nordic-wist.mp3';
const MUSIQUE_TITRE = 'Nordic Wist · Kevin MacLeod';

const BoutonMusique: React.FC<{ onLabel: string; offLabel: string }> = ({ onLabel, offLabel }) => {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [joue, setJoue] = useState(false);

  useEffect(() => ecouterExclusivite('hnefatafl', () => {
    ref.current?.pause();
    setJoue(false);
  }), []);

  const basculer = () => {
    const a = ref.current;
    if (!a) return;
    if (joue) { a.pause(); setJoue(false); return; }
    annoncerLecture('hnefatafl');
    a.volume = 0.3;
    a.play().then(() => setJoue(true)).catch(() => setJoue(false));
  };

  return (
    <>
      <audio ref={ref} src={MUSIQUE_URL} loop preload="none" />
      <button
        type="button"
        onClick={basculer}
        title={MUSIQUE_TITRE}
        aria-pressed={joue}
        className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-card border transition-colors duration-200 font-sans text-[10px] md:text-[11px] uppercase tracking-[0.18em] ${
          joue
            ? 'border-brass/60 text-ivory'
            : 'border-brass/30 text-ivory-soft hover:text-ivory hover:border-brass/60'
        }`}
      >
        {joue ? <VolumeX size={12} /> : <Music size={12} />}
        <span className="hidden sm:inline">{joue ? onLabel : offLabel}</span>
      </button>
    </>
  );
};

// ─── Le coffre, devenu rail ─────────────────────────────────────────
// Il occupait une section entière sous le jeu, avec de grandes cartes en
// grille : deux meubles séparés, alors que choisir sa table fait partie
// de la partie. Depuis le 2026-08-03 il vit DANS le cadre du jeu, en
// colonne à droite sur grand écran et en bandeau au-dessus du plateau
// sur petit. Le plateau d'abord, les pièces ensuite, comme on dresse une
// table avant d'y poser les hommes.
//
// ⚠️ Les identifiants d'assets sont lus quand la scène se construit
// (l'effet de GameCanvas ne dépend que de `gameKey`). Changer de jeu en
// pleine partie ne remonte donc RIEN sous les yeux du joueur : le rail le
// dit au lieu de laisser croire à un clic mort.
const CoffreRail: React.FC<{
  choix:    { plateau: string; pieces: string };
  setChoix: (c: { plateau: string; pieces: string }) => void;
  lang:     'FR' | 'EN';
  s:        Strings;
  enPartie: boolean;
}> = ({ choix, setChoix, lang, s, enPartie }) => {
  const poser = (cle: 'plateau' | 'pieces', id: string) => {
    const n = { ...choix, [cle]: id };
    setChoix(n);
    ecrireChoix(n.plateau, n.pieces);
  };

  const rayons = [
    { cle: 'plateau' as const, titre: s.shopBoards, items: BOARD_SETS as (BoardSet | PieceSet)[], actif: choix.plateau },
    { cle: 'pieces'  as const, titre: s.shopPieces, items: PIECE_SETS as (BoardSet | PieceSet)[], actif: choix.pieces  },
  ];

  return (
    <aside
      aria-label={s.shopEyebrow}
      className="shrink-0 lg:w-[214px] border-b lg:border-b-0 lg:border-l border-brass/20"
      style={{ background: 'rgba(0,0,0,0.28)' }}
    >
      <div className="flex lg:flex-col gap-5 lg:gap-4 p-3 md:p-4 overflow-x-auto lg:overflow-visible">
        {rayons.map((r) => (
          <div key={r.cle} className="shrink-0">
            <p className="font-sans text-[9px] uppercase tracking-[0.32em] text-brass/70 mb-2 px-0.5">
              {r.titre}
            </p>
            <div className="flex lg:flex-col gap-2">
              {r.items.map((it) => {
                const dispo = it.statut === 'disponible';
                const on = dispo && it.id === r.actif;
                return (
                  <button
                    key={it.id}
                    type="button"
                    disabled={!dispo}
                    onClick={() => dispo && poser(r.cle, it.id)}
                    aria-pressed={on}
                    title={lang === 'FR' ? it.texteFR : it.texteEN}
                    className={`group flex items-center gap-2.5 shrink-0 w-[168px] lg:w-full p-1.5 rounded-card border text-left transition-all duration-300 ${
                      on
                        ? 'border-brass/70 shadow-[0_0_18px_rgba(232,177,74,0.18)] bg-brass/10'
                        : dispo
                          ? 'border-white/10 hover:border-brass/50 hover:bg-white/[0.04]'
                          : 'border-white/8 opacity-45 cursor-not-allowed'
                    }`}
                  >
                    <span className="relative w-10 h-10 shrink-0 rounded-[4px] overflow-hidden bg-black/50">
                      {dispo ? (
                        <img
                          src={it.vignette}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-brass/40">
                          <Lock size={13} />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-display title-medieval text-[12.5px] leading-tight truncate ${on ? 'text-ivory' : 'text-ivory/80 group-hover:text-ivory'}`}>
                        {lang === 'FR' ? it.nomFR : it.nomEN}
                      </span>
                      <span className="block font-sans text-[8.5px] uppercase tracking-[0.18em] text-ivory-soft/55 mt-0.5">
                        {on ? s.shopActive : !dispo ? s.shopSoon : ' '}
                      </span>
                    </span>
                    {on && <Check size={12} className="shrink-0 text-brass mr-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {enPartie && (
          <p className="hidden lg:block font-editorial italic text-[10.5px] leading-snug text-ivory-soft/55 pt-1">
            {s.shopNextSaga}
          </p>
        )}
      </div>
    </aside>
  );
};

const HnefataflPage: React.FC = () => {
  // Pose l'atmosphère de la caravane sur <body> : brumes, grain, noir
  // chaud. C'est ce hook qui raccroche la page au reste du site.
  useCaravanPage();
  const { lang } = useUI();
  const s = useMemo(() => STRINGS[lang], [lang]);

  const [gameStarted, setGameStarted] = useState(false);
  const [config, setConfig] = useState<GameConfig>({
    mode: 'two-player',
    humanSide: 'defender',
    difficulty: 'medium',
  });
  const [gameKey, setGameKey] = useState(0);
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

  const handleBegin = (next: GameConfig) => {
    setConfig(next);
    setGameKey((k) => k + 1);
    setCharge(0);
    setPret(false);
    setUi({ turn: 'attacker', over: false, msg: s.raidersFirst, vfx: null });
    setGameStarted(true);
  };

  const returnToMenu = () => {
    setGameStarted(false);
  };

  // Pastille de tour : oxblood du site pour les Raiders, os pour les
  // Défenseurs. Plus de rouge néon ni de jaune saturé.
  const tc = ui.turn === 'attacker' ? '#A6392B' : '#E8DDC1';

  return (
    <>
      <SEO title={`${s.pageTitle} | FMM 2026`} description={s.pageIntro} />

      <PageHeader
        eyebrow={s.pageEyebrow}
        titleA={s.pageTitle}
        titleB=""
        intro={s.pageIntro}
        orbImage="/photos/hnefatafl-card.webp"
      />

      {/* ── La table de jeu ─────────────────────────────────────── */}
      <section className="relative pb-14 md:pb-20">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal>
            <div
              className="relative rounded-card overflow-hidden border border-brass/25"
              style={{
                background: 'rgba(10, 4, 6, 0.55)',
                boxShadow: '0 30px 90px rgba(0,0,0,0.55)',
              }}
            >
              {/* Bandeau d'état : qui joue, et le retour au menu */}
              <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-brass/20 bg-black/30">
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
                <span className="shrink-0 inline-flex items-center gap-2">
                  <BoutonMusique onLabel={s.musiqueOn} offLabel={s.musiqueOff} />
                {gameStarted && (
                  <button
                    type="button"
                    onClick={returnToMenu}
                    className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-card border border-brass/35 text-ivory-soft hover:text-ivory hover:border-brass transition-colors duration-200 font-sans text-[10px] md:text-[11px] uppercase tracking-[0.18em]"
                  >
                    <RotateCcw size={12} />
                    <span className="hidden sm:inline">{s.newSaga}</span>
                  </button>
                )}
                </span>
              </div>

              {/* La scène 3D. Hauteur bornée : la page respire au lieu
                  de verrouiller 100vh, et le pied de page reste
                  atteignable. */}
              <div
                className="relative w-full h-[clamp(380px,56vh,520px)] md:h-[clamp(480px,72vh,780px)]"
              >
                {gameStarted && (
                  <GameCanvas
                    gameKey={gameKey}
                    onUi={setUi}
                    strings={s}
                    config={config}
                    boardSetId={choix.plateau}
                    pieceSetId={choix.pieces}
                    onLoad={(p, done) => {
                      setCharge(p);
                      if (done) setPret(true);
                    }}
                  />
                )}

                {/* ── Écran d'attente ─────────────────────────────
                    Le plateau et les pièces pèsent près de 2,5 Mo :
                    sans cet écran, la partie s'ouvrait sur un plateau
                    procédural nu qui se transformait sous les yeux du
                    joueur. La barre suit le vrai décompte du
                    LoadingManager, pas un faux défilement. */}
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
                      <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">
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
                    {/* Le plateau en photo derrière l'écran de
                        préparation : le flou a quelque chose à flouter,
                        et on voit ce qui nous attend. */}
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: 'url(/photos/hnefatafl-card.webp)' }}
                    />
                    <StartScreen initial={config} strings={s} onBegin={handleBegin} />
                  </>
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
                    <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">
                      {s.ending}
                    </p>
                    <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory leading-[1.15] max-w-xl">
                      {ui.msg}
                    </h2>
                    <div className="divider-brass w-24 mx-auto my-7" />
                    <button
                      type="button"
                      onClick={returnToMenu}
                      className="inline-flex items-center gap-2.5 px-7 py-3.5 min-h-[48px] rounded-card bg-brass text-[#1A0A05] border border-brass font-sans text-xs md:text-sm uppercase tracking-[0.22em] hover:bg-brass-soft transition-colors duration-200"
                    >
                      <RotateCcw size={15} />
                      {s.newSaga}
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Légende. Elle ENVELOPPE au lieu de déborder : l'ancien
                  bandeau en nowrap sortait de l'écran sur mobile. */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-4 py-3 border-t border-brass/20 bg-black/30">
                <span className="font-sans text-[10px] md:text-[11px] text-ivory-soft/65 text-center">
                  {s.hint}
                </span>
                <span className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-sans text-[10px] md:text-[11px]">
                  <span style={{ color: '#C0503E' }}>{s.raidersDot}</span>
                  <span className="text-ivory-soft">{s.defendersDot}</span>
                  <span className="text-brass">{s.kingDot}</span>
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Le coffre : plateaux et pièces ──────────────────────── */}
      <section className="relative pb-16 md:pb-24">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal>
            <div className="text-center mb-9 md:mb-12">
              <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">
                {s.shopEyebrow}
              </p>
              <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-[1.06]">
                {s.shopTitle}
              </h2>
              <div className="divider-brass w-24 mx-auto mt-5" />
              <p className="font-editorial italic text-sm md:text-base text-ivory-soft leading-relaxed max-w-2xl mx-auto mt-5">
                {s.shopLead}
              </p>
            </div>
          </Reveal>

          {([
            { titre: s.shopBoards, items: BOARD_SETS, actif: choix.plateau,
              choisir: (id: string) => { const n = { ...choix, plateau: id }; setChoix(n); ecrireChoix(n.plateau, n.pieces); } },
            { titre: s.shopPieces, items: PIECE_SETS, actif: choix.pieces,
              choisir: (id: string) => { const n = { ...choix, pieces: id }; setChoix(n); ecrireChoix(n.plateau, n.pieces); } },
          ]).map((rayon) => (
            <div key={rayon.titre} className="mb-10 last:mb-0">
              <p className="font-sans text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-brass/70 mb-4">
                {rayon.titre}
              </p>
              <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {rayon.items.map((it) => {
                  const dispo = it.statut === 'disponible';
                  const on = dispo && it.id === rayon.actif;
                  return (
                    <StaggerItem key={it.id} as="div">
                      <button
                        type="button"
                        disabled={!dispo}
                        onClick={() => dispo && rayon.choisir(it.id)}
                        aria-pressed={on}
                        className={`group relative w-full h-full text-left rounded-card overflow-hidden border transition-all duration-300 ${
                          on
                            ? 'border-brass/70 shadow-[0_0_26px_rgba(232,177,74,0.22)]'
                            : dispo
                              ? 'border-white/12 hover:border-brass/50 hover:-translate-y-1'
                              : 'border-white/8 opacity-55 cursor-not-allowed'
                        }`}
                      >
                        <span className="block relative aspect-video overflow-hidden bg-black/40">
                          {dispo ? (
                            <img
                              src={it.vignette}
                              alt=""
                              aria-hidden
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-brass/40">
                              <Lock size={22} />
                            </span>
                          )}
                          <span
                            aria-hidden
                            className="absolute inset-0"
                            style={{ background: 'linear-gradient(180deg, rgba(10,2,7,0.15) 0%, rgba(10,2,7,0.88) 100%)' }}
                          />
                          {/* Pastille seulement quand elle DIT quelque
                              chose : en jeu, ou bientôt. Une carte
                              disponible et non choisie n'en porte pas,
                              sinon on affichait une pastille vide. */}
                          {(on || !dispo) && (
                            <span
                              className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.2em] font-sans ${
                                on ? 'bg-brass text-[#1A0A05]' : 'bg-black/60 text-ivory-soft border border-white/15'
                              }`}
                            >
                              {on && <Check size={10} />}
                              {on ? s.shopActive : s.shopSoon}
                            </span>
                          )}
                        </span>
                        <span className="block px-4 py-3.5">
                          <span className={`block font-display title-medieval text-base md:text-lg leading-snug mb-1.5 ${on ? 'text-ivory' : 'text-ivory/85 group-hover:text-ivory'}`}>
                            {lang === 'FR' ? it.nomFR : it.nomEN}
                          </span>
                          <span className="block font-editorial italic text-[13px] text-ivory-soft leading-snug">
                            {lang === 'FR' ? it.texteFR : it.texteEN}
                          </span>
                        </span>
                      </button>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </div>
          ))}
        </div>
      </section>

      {/* ── Les règles, en trois cartes ─────────────────────────── */}
      <section className="relative pb-20 md:pb-28">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal>
            <div className="text-center mb-10 md:mb-14">
              <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">
                {s.rulesEyebrow}
              </p>
              <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-[1.06]">
                {s.rulesTitle}
              </h2>
              <div className="divider-brass w-24 mx-auto mt-5" />
            </div>
          </Reveal>

          <Stagger className="grid md:grid-cols-3 gap-5 md:gap-7">
            {s.rules.map((r, i) => {
              const Icon = [Crown, Users, Swords][i] ?? Crown;
              return (
                <StaggerItem
                  key={r.title}
                  as="article"
                  className="glass-light rounded-card p-7 md:p-8 text-center transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mx-auto mb-5">
                    <Icon size={24} className="text-brass" />
                  </div>
                  <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-2">
                    {r.title}
                  </h3>
                  <p className="font-editorial italic text-sm md:text-base text-ivory-soft leading-snug">
                    {r.body}
                  </p>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* ── Signature de l'atelier ──────────────────────────────── */}
      {/* Le jeu est bâti par Le Salon des Inconnus, et il se télécharge
          aussi chez eux. Lien vérifié : /outils et /tools mènent tous
          deux à la vue « outils » du site du Salon. */}
      <section className="relative pb-20 md:pb-28">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal>
            <div
              className="rounded-card border border-brass/25 px-6 py-8 md:px-10 md:py-9 flex flex-col md:flex-row md:items-center gap-6 md:gap-9"
              style={{ background: 'rgba(10, 4, 6, 0.5)' }}
            >
              <img
                src="/salon/salon-logo.webp"
                alt=""
                aria-hidden
                className="h-16 md:h-20 w-auto shrink-0 self-start md:self-center opacity-90"
              />
              <div className="min-w-0 flex-1">
                <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-2">
                  {s.builtEyebrow}
                </p>
                <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory leading-snug mb-2.5">
                  {s.builtBy}
                </h3>
                <p className="font-editorial italic text-sm md:text-base text-ivory-soft leading-relaxed">
                  {s.builtLead}
                </p>
              </div>
              <a
                href="https://www.lesalondesinconnus.com/outils"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[48px] rounded-card border border-brass/45 text-ivory hover:bg-brass hover:text-[#1A0A05] hover:border-brass transition-colors duration-200 font-sans text-[11px] md:text-xs uppercase tracking-[0.2em]"
              >
                <Download size={14} />
                {s.builtCta}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};

export default HnefataflPage;
