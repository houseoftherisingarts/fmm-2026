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
import { Crown, Shield, Swords, Users, Cpu, RotateCcw } from 'lucide-react';

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
  },
};

const CPU_THINK_MS = 500;

interface GameCanvasProps {
  gameKey: number;
  onUi: (ui: UIState) => void;
  strings: GameStrings;
  config: GameConfig;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameKey, onUi, strings, config }) => {
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

    const { clickables } = buildBoard(scene.scene, () => alive);
    const pieces = createPieceSystem(scene.scene, clickables);
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
        if (isKingEscape) scene.pushCameraIn(13, 1.6);
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
    <div style={{ marginBottom: 22, textAlign: 'center' }}>
      <div
        style={{
          color: '#6A4010',
          fontSize: 'clamp(8px,1.3vw,11px)',
          letterSpacing: '.45em',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(4,2,0,.88)',
        backdropFilter: 'blur(12px)',
        zIndex: 5,
        padding: '24px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: 80,
          height: 2,
          background: 'linear-gradient(90deg,transparent,#7A5215,transparent)',
          marginBottom: 22,
        }}
      />
      <div
        style={{
          color: '#FFD700',
          fontSize: 'clamp(16px,4vw,28px)',
          fontWeight: 900,
          letterSpacing: '.28em',
          textAlign: 'center',
          textShadow: '0 0 20px rgba(255,136,0,.6)',
        }}
      >
        {s.startTitle}
      </div>
      <div
        style={{
          color: '#4A2808',
          fontSize: 'clamp(8px,1.4vw,11px)',
          letterSpacing: '.4em',
          margin: '8px 0 22px',
        }}
      >
        {s.startSubtitle}
      </div>
      <div
        style={{
          width: 80,
          height: 2,
          background: 'linear-gradient(90deg,transparent,#7A5215,transparent)',
          marginBottom: 30,
        }}
      />

      <Row label={s.modeLabel}>
        <Pill active={mode === 'two-player'} onClick={() => setMode('two-player')}>
          {s.modeTwoPlayer}
        </Pill>
        <Pill active={mode === 'vs-cpu'} onClick={() => setMode('vs-cpu')}>
          {s.modeVsCpu}
        </Pill>
      </Row>

      {mode === 'vs-cpu' && (
        <>
          <Row label={s.sideLabel}>
            <Pill active={humanSide === 'defender'} onClick={() => setHumanSide('defender')}>
              {s.sideDefenders}
            </Pill>
            <Pill active={humanSide === 'attacker'} onClick={() => setHumanSide('attacker')}>
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
        style={{
          marginTop: 16,
          background: 'transparent',
          border: '1px solid #7A5215',
          color: '#FFD700',
          padding: '12px 36px',
          fontSize: 'clamp(10px,1.7vw,14px)',
          letterSpacing: '.35em',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all .2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#1A0A00';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        {s.begin}
      </button>
    </div>
  );
};

const HnefataflPage: React.FC = () => {
  const { lang } = useUI();
  const s = useMemo(() => STRINGS[lang], [lang]);

  const [gameStarted, setGameStarted] = useState(false);
  const [config, setConfig] = useState<GameConfig>({
    mode: 'two-player',
    humanSide: 'defender',
    difficulty: 'medium',
  });
  const [gameKey, setGameKey] = useState(0);
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
    setUi({ turn: 'attacker', over: false, msg: s.raidersFirst, vfx: null });
    setGameStarted(true);
  };

  const returnToMenu = () => {
    setGameStarted(false);
  };

  const tc = ui.turn === 'attacker' ? '#CC2211' : '#D4C49A';

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#080502',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Cinzel", "Palatino Linotype", serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '10px 20px',
          borderBottom: '1px solid #5A3A0A',
          background: '#0E0703',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: '#FFD700',
            fontSize: 'clamp(14px,3.5vw,26px)',
            letterSpacing: '.35em',
            fontWeight: 900,
            textShadow: '0 0 20px rgba(255,136,0,.6)',
          }}
        >
          HNEFATAFL
        </div>
        <div
          style={{
            color: '#6A4010',
            fontSize: 'clamp(7px,1.2vw,10px)',
            letterSpacing: '.5em',
            marginTop: 2,
          }}
        >
          FESTIVAL MÉDIÉVAL DE MONTPELLIER
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {gameStarted && (
          <GameCanvas gameKey={gameKey} onUi={setUi} strings={s} config={config} />
        )}

        {!gameStarted && (
          <StartScreen initial={config} strings={s} onBegin={handleBegin} />
        )}

        {gameStarted && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(8,5,2,.9)',
                border: `1px solid ${tc}44`,
                borderRadius: 3,
                padding: '7px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                backdropFilter: 'blur(8px)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: tc,
                  boxShadow: `0 0 10px ${tc}`,
                }}
              />
              <span
                style={{
                  color: '#C09050',
                  fontSize: 'clamp(9px,1.6vw,13px)',
                  letterSpacing: '.2em',
                }}
              >
                {ui.msg}
              </span>
            </div>

            <AnimatePresence>
              {ui.vfx === 'king-escape' && (
                <motion.div
                  key={`fx-escape-${gameKey}`}
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.8, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                      'radial-gradient(circle at center, rgba(255,215,0,0.85) 0%, rgba(255,160,30,0.5) 35%, rgba(0,0,0,0) 70%)',
                    zIndex: 4,
                  }}
                />
              )}
              {ui.vfx === 'king-fall' && (
                <motion.div
                  key={`fx-fall-${gameKey}`}
                  initial={{ opacity: 0.95 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                      'radial-gradient(ellipse at center, rgba(40,0,0,0) 30%, rgba(120,10,10,0.55) 75%, rgba(20,0,0,0.9) 100%)',
                    zIndex: 4,
                  }}
                />
              )}
            </AnimatePresence>

            {ui.over && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 1.2, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(4,2,0,.88)',
                  backdropFilter: 'blur(12px)',
                  zIndex: 5,
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 2,
                    background: 'linear-gradient(90deg,transparent,#7A5215,transparent)',
                    marginBottom: 28,
                  }}
                />
                <div
                  style={{
                    color: '#FFD700',
                    fontSize: 'clamp(16px,4.5vw,32px)',
                    fontWeight: 900,
                    letterSpacing: '.2em',
                    textAlign: 'center',
                    padding: '0 24px',
                    lineHeight: 1.3,
                  }}
                >
                  {ui.msg}
                </div>
                <div
                  style={{
                    color: '#4A2808',
                    fontSize: 'clamp(8px,1.4vw,11px)',
                    letterSpacing: '.4em',
                    margin: '12px 0 28px',
                  }}
                >
                  {s.ending}
                </div>
                <div
                  style={{
                    width: 80,
                    height: 2,
                    background: 'linear-gradient(90deg,transparent,#7A5215,transparent)',
                    marginBottom: 28,
                  }}
                />
                <button
                  onClick={returnToMenu}
                  style={{
                    background: 'transparent',
                    border: '1px solid #7A5215',
                    color: '#FFD700',
                    padding: '10px 30px',
                    fontSize: 'clamp(9px,1.6vw,13px)',
                    letterSpacing: '.3em',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all .2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#1A0A00';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  {s.newSaga}
                </button>
              </motion.div>
            )}

            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(8,5,2,.85)',
                border: '1px solid #2A1405',
                borderRadius: 3,
                padding: '5px 14px',
                fontSize: 'clamp(7px,1.2vw,10px)',
                color: '#4A2C0E',
                textAlign: 'center',
                letterSpacing: '.08em',
                whiteSpace: 'nowrap',
              }}
            >
              {s.hint} &nbsp;|&nbsp;
              <span style={{ color: '#881100' }}>{s.raidersDot}</span> &nbsp;
              <span style={{ color: '#888060' }}>{s.defendersDot}</span> &nbsp;
              <span style={{ color: '#997700' }}>{s.kingDot}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HnefataflPage;
