// ─── Hnefatafl — playable 3D board, route entry point ───────────────
// Full-screen game. Owns its own header strip; the global NavBar +
// Footer are hidden for this route via the isImmersive() helper in
// src/App.tsx.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'framer-motion';

import { useUI } from '../../contexts/AppContext';
import {
  applyMove,
  checkWin,
  hasAnyMoves,
  initBoard,
  validMoves,
  type Board,
  type Coord,
  type Side,
} from './gameLogic';
import { setupScene } from './sceneSetup';
import { buildBoard, loadBoardModel } from './boardMesh';
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
    kingEscapes: '👑 Le Roi s\'échappe ! Victoire des Défenseurs',
    kingFalls: '⚔️ Le Roi tombe ! Victoire des Raiders',
    noMoves: (winner) => `Plus aucun coup — ${winner} l'emportent`,
    defenders: 'les Défenseurs',
    raiders: 'les Raiders',
    ending: 'LA SAGA SE TERMINE',
    newSaga: '⚔ NOUVELLE SAGA',
    hint: 'Cliquez une pièce · Cliquez une case verte · Glissez pour pivoter',
    raidersDot: '● Raiders',
    defendersDot: '● Défenseurs',
    kingDot: '● Roi — atteindre un coin ★',
    startTitle: 'PRÉPAREZ VOTRE SAGA',
    startSubtitle: 'CHOISISSEZ VOTRE CAMP',
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
    begin: '⚔ COMMENCER',
  },
  EN: {
    raidersFirst: 'Raiders move first',
    raidersMove: 'Raiders move',
    defendersMove: 'Defenders move',
    raidersThinking: 'Raiders thinking…',
    defendersThinking: 'Defenders thinking…',
    kingEscapes: '👑 The King has escaped! Defenders win!',
    kingFalls: '⚔️ The King falls! Raiders win!',
    noMoves: (winner) => `No moves left — ${winner} win!`,
    defenders: 'Defenders',
    raiders: 'Raiders',
    ending: 'THE SAGA ENDS',
    newSaga: '⚔ NEW SAGA',
    hint: 'Click piece · Click green to move · Drag to orbit',
    raidersDot: '● Raiders',
    defendersDot: '● Defenders',
    kingDot: '● King — must reach a corner ★',
    startTitle: 'PREPARE YOUR SAGA',
    startSubtitle: 'CHOOSE YOUR SIDE',
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
    begin: '⚔ BEGIN',
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

    const { squares, clickables, decorations } = buildBoard(scene.scene);
    const pieces = createPieceSystem(scene.scene, clickables);
    const hl = createHighlightSystem(scene.scene);

    // Kick off the GLB load (large asset, served from /public/). The
    // loader auto-fits the model to the 11×11 board span and aligns its
    // top surface with the play plane. On success, hide the procedural
    // decorations and make the procedural squares invisible — they
    // remain in the raycast list so clicks still resolve to (r, c).
    //
    // TUNING: the GLB's actual playing-surface ratio to its outer
    // extent is unknown. `scaleMul` here scales the auto-fit result.
    // Bump up if pieces fall off the board edges, down if pieces look
    // small in a sea of board. yOffset nudges pieces sit-line if they
    // float above or sink into the board surface. Watch devtools for
    // the "[Hnefatafl] Board GLB loaded" log with raw + final sizes.
    const boardModel = loadBoardModel(scene.scene, {
      scaleMul: 0.55,
      yOffset: 0,
      onLoad: () => {
        if (!alive) return;
        for (const d of decorations) d.visible = false;
        for (const row of squares) {
          for (const sq of row) {
            const mat = sq.material as THREE.MeshPhongMaterial;
            mat.transparent = true;
            mat.opacity = 0;
            mat.depthWrite = false;
            sq.castShadow = false;
            sq.receiveShadow = false;
          }
        }
      },
      onError: () => {
        // Procedural board remains visible — clean fallback.
      },
    });

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
    const tryClick = (clientX: number, clientY: number) => {
      if (dragged) return;
      const rect = scene.renderer.domElement.getBoundingClientRect();
      mp.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mp.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mp, scene.camera);
      const hit = ray
        .intersectObjects(clickables, false)
        .find((h) => h.object.userData.r !== undefined);
      if (hit) handleSqClick(hit.object.userData.r as number, hit.object.userData.c as number);
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
      boardModel.cancel();
      hl.dispose();
      pieces.dispose();
      scene.dispose();
    };
  }, [gameKey, onUi]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

// ─── Start-screen pill button ───────────────────────────────────────
interface PillProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}
const Pill: React.FC<PillProps> = ({ active, onClick, children }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: active ? '#1A0A00' : hover ? '#100704' : 'transparent',
        border: `1px solid ${active ? '#FFD700' : '#7A5215'}`,
        color: active ? '#FFD700' : '#C09050',
        padding: '8px 18px',
        fontSize: 'clamp(9px,1.5vw,12px)',
        letterSpacing: '.25em',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textTransform: 'uppercase',
        transition: 'all .15s',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
};

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
