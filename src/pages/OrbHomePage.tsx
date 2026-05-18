import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { useUI } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useSiteFlags } from '../contexts/SiteFlagsContext';
import { SITE, PILLARS, PILLAR_COPY, type PillarKey } from '../content';
import { addLocale } from '../lib/locale';
import { useCountdown } from '../lib/useCountdown';
import SEO from '../components/SEO';

// Pattern adapted from le-salon-des-inconnus apps/hub/src/HubOrb.tsx —
// vertical list of choices on the left, glass orb on the right with
// cross-fade Ken Burns + brass/flame rim. Festival edition palette uses
// FMM tokens (midnight-deep, brass, oxblood, copper, amber-glow).

// Pillar keys + non-pillar special items (e.g. the festival video). Special
// items carry their own label/copy + a `video` URL instead of a still image.
type OrbChoice = {
  key: PillarKey | 'video';
  image?: string;
  video?: string;
  imagePosition?: string;
  label?: { FR: string; EN: string };
  copy?:  { FR: string; EN: string };
};

// Landing/idle state — Viking helmet hero with an inside-the-orb countdown
// and a tickets CTA in the blurb panel below. Index -1 represents this in
// the selectedIdx state machine; clicking any pillar moves us to 0..n.
const LANDING_IMAGE = '/wix/home/viking-helmet.jpg';
const LANDING_KEY = '__landing__';

// Curated hero image for each pillar (sampled from /public/wix/<pillar>/).
const ORB_CHOICES: OrbChoice[] = [
  { key: 'activites',   image: '/wix/home/fire-night.jpg',     imagePosition: 'center 35%' },
  { key: 'musique',     image: '/wix/musique/skarazula.jpg',   imagePosition: 'left center' },
  { key: 'marche',      image: '/wix/marche/47376430.jpg' },
  { key: 'nourriture',  image: '/wix/nourriture/41d286c9.jpg', imagePosition: 'center 40%' },
  { key: 'jeunesse',    image: '/wix/jeunesse/2b1f82d0.jpg',   imagePosition: 'right center' },
  { key: 'chevaux',     image: '/wix/chevaux/04ba7d92.jpg' },
  { key: 'apprendre',   image: '/wix/apprendre/88ea932f.jpg' },
  { key: 'hebergement', image: '/wix/hebergement/salon-living-room.jpg', imagePosition: 'center 55%' },
  { key: 'benevole',    image: '/wix/benevole/4fc431fd.jpg',   imagePosition: 'left center' },
  { key: 'partenaires', image: '/wix/partenaires/2a2a4608.jpg' },
  { key: 'histoire',    image: '/wix/histoire/03b1fe30.jpg' },
  { key: 'mariages',    image: '/wix/mariages/70dcaeae.jpg' },
  { key: 'groupes',     image: '/wix/home/shields-blue.jpg' },
  {
    key: 'video',
    video: '/orb/vikings.mp4',
    label: { FR: 'Vidéo',  EN: 'Video' },
    copy:  { FR: 'Notre court métrage de l’an dernier — vikings, feu et tambours.',
             EN: 'Last year’s short film — vikings, fire and drums.' },
  },
];

// One-shot SFX. Pre-fetches the asset on mount, then on each trigger spawns
// a fresh HTMLAudio so overlapping clicks don't restart a playing instance.
// Browser caches the file, so spawning new Audio nodes is cheap. `play()`
// rejects when the user hasn't interacted yet — first click always satisfies
// the gesture requirement, so we can safely swallow that error.
function useSfx(url: string, volume = 0.7) {
  const primedRef = useRef(false);
  useEffect(() => {
    if (primedRef.current) return;
    const a = new Audio(url);
    a.preload = 'auto';
    a.volume = 0;
    void a.load();
    primedRef.current = true;
  }, [url]);
  return useCallback(() => {
    const a = new Audio(url);
    a.volume = volume;
    a.play().catch(() => { /* autoplay blocked — first click unblocks it */ });
  }, [url, volume]);
}

// Hover SFX. Single shared audio element + restart-on-trigger so rapid
// hovers don't pile up overlapping copies, and a small throttle so a fast
// mouse sweep across 13 items doesn't machine-gun the rustle.
function useHoverSfx(url: string, volume = 0.32, throttleMs = 90) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastRef = useRef(0);
  useEffect(() => {
    const a = new Audio(url);
    a.preload = 'auto';
    a.volume = volume;
    audioRef.current = a;
  }, [url, volume]);
  return useCallback(() => {
    const now = performance.now();
    if (now - lastRef.current < throttleMs) return;
    lastRef.current = now;
    const a = audioRef.current;
    if (!a) return;
    try { a.currentTime = 0; } catch { /* may throw if not yet loaded */ }
    a.play().catch(() => { /* gesture not granted yet */ });
  }, [throttleMs]);
}

// Resolves a selectedIdx (-1 = landing, 0..n = pillar/special) to layer
// rendering info. Centralised so cross-fade state stays simple. Items with
// a video instead of an image carry the video URL through.
const resolveLayer = (idx: number): { key: string; image?: string; video?: string; imagePosition?: string } => {
  if (idx < 0) return { key: LANDING_KEY, image: LANDING_IMAGE, imagePosition: 'center 35%' };
  const c = ORB_CHOICES[idx];
  return { key: c.key, image: c.image, video: c.video, imagePosition: c.imagePosition };
};

// Sizes are 80% of the original spec (numbers were clamp(1.5/2.6vw/2.2)
// and clamp(2.4/4.5vw/3.6)) — request: shrink the in-orb countdown to
// give the festival photo + dates plate more breathing room around it.
const CountUnit: React.FC<{ n: number; label: string; small?: boolean }> = ({ n, label, small }) => (
  <span className="flex flex-col items-center leading-none">
    <span
      className="font-display title-medieval text-ivory"
      style={{ fontSize: small ? 'clamp(1.2rem, 2.08vw, 1.76rem)' : 'clamp(1.92rem, 3.6vw, 2.88rem)' }}
    >
      {n.toString().padStart(2, '0')}
    </span>
    <span className="font-display title-medieval text-[7px] md:text-[8px] uppercase tracking-[0.4em] text-[var(--color-copper)] mt-1">
      {label}
    </span>
  </span>
);

// ── Live countdown ───────────────────────────────────────────────────────
// Memoized so its 1-second ticks (setInterval inside useCountdown) only
// invalidate this small block — not the entire OrbHomePage tree. This
// was the single biggest hidden render cost on the landing.
interface LiveCountdownProps {
  targetISO: string;
  lang:      'FR' | 'EN';
  datesLabel:string;
}
const LiveCountdown: React.FC<LiveCountdownProps> = memo(({ targetISO, lang, datesLabel }) => {
  const cd = useCountdown(targetISO);
  return (
    <>
      <span className="font-display title-medieval uppercase text-[9px] md:text-[10px] tracking-[0.5em] text-[var(--color-amber-glow)] mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
        {cd.isPast
          ? (lang === 'FR' ? 'Le festival est commencé' : 'The festival has begun')
          : (lang === 'FR' ? 'Compte à rebours' : 'Countdown')}
      </span>
      {!cd.isPast && (
        <div className="flex items-baseline gap-3 md:gap-4 text-ivory drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)]">
          <CountUnit n={cd.days}    label={lang === 'FR' ? 'jours' : 'days'} />
          <span className="font-display title-medieval text-2xl md:text-3xl text-brass/70">·</span>
          <CountUnit n={cd.hours}   label={lang === 'FR' ? 'h' : 'h'} small />
          <CountUnit n={cd.minutes} label="m" small />
          <CountUnit n={cd.seconds} label="s" small />
        </div>
      )}
      <span className="font-editorial italic text-[10px] md:text-xs text-ivory-soft mt-2 tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
        {datesLabel}
      </span>
    </>
  );
});
LiveCountdown.displayName = 'LiveCountdown';

// ── Fire video ───────────────────────────────────────────────────────────
// Looping muted MP4 of real flames, masked to fade into the night at the
// top edge. Kept under the same `.orb-flame-canvas` class so the existing
// `flameKindle` 3 s fade-in and reduced-motion suppression still apply.
// preload="metadata" so the initial paint isn't blocked by downloading
// the full MP4 — the flame fades in only after 3 s, so there's plenty
// of time for the actual frames to stream in.
const FireCanvas: React.FC = memo(() => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return (
    <video
      aria-hidden="true"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      src="/orb/fire.mp4"
      className="orb-flame-canvas absolute inset-x-0 bottom-0 w-full h-[78%] pointer-events-none object-cover"
      style={{
        mixBlendMode: 'screen',
        WebkitMaskImage: 'linear-gradient(to top, black 70%, transparent 100%)',
        maskImage:       'linear-gradient(to top, black 70%, transparent 100%)',
      }}
    />
  );
});
FireCanvas.displayName = 'FireCanvas';

// ─── Dev placement editor row ─────────────────────────────────────────
// Drag the value text horizontally to scrub (1 px = `step`, shift = `fine`).
// Click −/+ to step (shift = fine). Used only inside the knight overlay
// editor — kept module-local so it doesn't leak into the public bundle.
type PropRowProps = {
  label:    string;
  value:    number;
  onChange: (v: number) => void;
  step:     number;
  fine:     number;
  min:      number;
  max:      number;
  unit?:    string;
  decimals: number;
};
const PropRow: React.FC<PropRowProps> = ({ label, value, onChange, step, fine, min, max, unit = '', decimals }) => {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const dragRef = useRef<{ x: number; v: number } | null>(null);
  const onScrubDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, v: value };
  };
  const onScrubMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    const s = dragRef.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const stepSize = e.shiftKey ? fine : step;
    onChange(clamp(s.v + dx * stepSize));
  };
  const onScrubUp = (e: React.PointerEvent<HTMLSpanElement>) => {
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const bump = (dir: 1 | -1) => (e: React.MouseEvent) => {
    onChange(clamp(value + dir * (e.shiftKey ? fine : step)));
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-8 opacity-60">{label}</span>
      <button type="button" onClick={bump(-1)} className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white/80 leading-none">−</button>
      <span
        onPointerDown={onScrubDown}
        onPointerMove={onScrubMove}
        onPointerUp={onScrubUp}
        onPointerCancel={onScrubUp}
        className="w-20 text-center tabular-nums select-none cursor-ew-resize bg-white/[0.04] hover:bg-white/10 rounded px-1 py-0.5"
        title="drag left/right to scrub (shift = fine)"
      >
        {value.toFixed(decimals)}{unit}
      </span>
      <button type="button" onClick={bump(1)} className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white/80 leading-none">+</button>
    </div>
  );
};

const OrbHomePage: React.FC = () => {
  const { lang } = useUI();
  const { user, openSignIn, isAdmin } = useAuth();
  const { flags: siteFlags } = useSiteFlags();
  // Skip 87 MB logo-intro + 220 MB vikings video for reduced-motion users.
  const reduceMotion = useReducedMotion();
  // Dev placement editor — only mounts when an admin has flipped on the
  // `knightPlacementEditor` site flag from Paramètres. Off by default.
  const knightEditorAvailable = isAdmin && siteFlags.knightPlacementEditor;
  const navigate = useNavigate();
  // Loot for general category change; food specifically for the banquet
  // (`nourriture` pillar). Both are short MP3s in /public/orb/sfx/.
  const playLoot = useSfx('/orb/sfx/loot.mp3', 0.7);
  const playFood = useSfx('/orb/sfx/food.mp3', 0.7);
  // Hover — subtle plate-armor rustle, throttled.
  const playHover = useHoverSfx('/orb/sfx/hover.mp3', 0.32);

  // -1 = landing (Viking helmet + countdown + tickets CTA).
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [confirming, setConfirming] = useState(false);
  const ticketUrl = import.meta.env.VITE_ZEFFY_TICKET_URL || '#';
  // NOTE: countdown lives inside <LiveCountdown> below, isolated so
  // its 1 s ticks don't re-render the whole orb tree.
  const countdownTarget = `${SITE.dates.start}T10:00:00-04:00`;
  const isLanding = selectedIdx < 0;


  // Cross-fade state — two stacked layers swap which one is "current"; the
  // other fades out underneath. Each layer stores a choice index (-1 for
  // landing) so it carries its own framing.
  const [layerA, setLayerA] = useState(-1);
  const [layerB, setLayerB] = useState<number | null>(null);
  const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A');

  // Orb landing media — animated FMM logo plays once on first visit, then
  // fades to the static embossed-silver logo which stays as the placeholder
  // while no menu item is selected. Comes back when user clicks away.
  // Start with introDone=true when reduced-motion is active so the static
  // embossed logo shows immediately (the 87 MB intro video is skipped).
  const [introDone, setIntroDone] = useState(reduceMotion ?? false);
  // Countdown reveal — fades in 8 s after page load (timed to land just as
  // the logo intro video finishes), then stays visible across landing
  // returns so the user doesn't wait 8 s again on click-away.
  const [showCountdown, setShowCountdown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowCountdown(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (activeLayer === 'A') {
      setLayerB(selectedIdx);
      requestAnimationFrame(() => setActiveLayer('B'));
    } else {
      setLayerA(selectedIdx);
      requestAnimationFrame(() => setActiveLayer('A'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx]);

  const layerAResolved = resolveLayer(layerA);
  const layerBResolved = layerB !== null ? resolveLayer(layerB) : null;

  const layerStyle = (c: { image?: string; imagePosition?: string }): CSSProperties => ({
    backgroundImage: c.image ? `url(${c.image})` : undefined,
    backgroundPosition: c.imagePosition ?? 'center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  });

  // Refs for the in-orb festival video (used both as the orb media when the
  // "video" choice is selected, and as the target for the fullscreen button).
  const orbVideoRef = useRef<HTMLVideoElement | null>(null);

  // ─── Knight overlay manual placement editor ────────────────────────
  // Click the pencil (top-right) to toggle. While on: drag to move,
  // wheel to resize. Values persist in localStorage and the read-out
  // shows what to paste back into the JSX defaults.
  // Manual placement values — fine-tuned in the on-page editor and
  // pasted in. Hole now sits a hair higher and slightly squashed
  // vertically to seat the orb cleanly inside the PNG's not-perfectly-
  // circular hole.
  const KNIGHT_TX_DEFAULT  = -50.8452;
  const KNIGHT_TY_DEFAULT  = -43.3935;
  const KNIGHT_W_DEFAULT   = 665;       // width %  (intrinsic horizontal size)
  const KNIGHT_SX_DEFAULT  = 0.9693;    // extra X-scale (slight horizontal squeeze)
  const KNIGHT_SY_DEFAULT  = 0.9309;    // extra Y-scale (more vertical squeeze)
  const KNIGHT_ROT_DEFAULT = 0;         // rotation in degrees
  const [knightEdit, setKnightEdit] = useState(false);
  const [knightTx,  setKnightTx]  = useState(KNIGHT_TX_DEFAULT);
  const [knightTy,  setKnightTy]  = useState(KNIGHT_TY_DEFAULT);
  const [knightW,   setKnightW]   = useState(KNIGHT_W_DEFAULT);
  const [knightSX,  setKnightSX]  = useState(KNIGHT_SX_DEFAULT);
  const [knightSY,  setKnightSY]  = useState(KNIGHT_SY_DEFAULT);
  const [knightRot, setKnightRot] = useState(KNIGHT_ROT_DEFAULT);
  // Load saved placement once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('fmm:knight-placement');
      if (!raw) return;
      const j = JSON.parse(raw);
      if (typeof j.tx  === 'number') setKnightTx(j.tx);
      if (typeof j.ty  === 'number') setKnightTy(j.ty);
      if (typeof j.w   === 'number') setKnightW(j.w);
      if (typeof j.sx  === 'number') setKnightSX(j.sx);
      if (typeof j.sy  === 'number') setKnightSY(j.sy);
      if (typeof j.rot === 'number') setKnightRot(j.rot);
    } catch { /* ignore */ }
  }, []);
  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem('fmm:knight-placement', JSON.stringify({
        tx: knightTx, ty: knightTy, w: knightW, sx: knightSX, sy: knightSY, rot: knightRot,
      }));
    } catch { /* ignore */ }
  }, [knightTx, knightTy, knightW, knightSX, knightSY, knightRot]);
  // Pointer drag — converts px delta into translate-% delta using the
  // knight image's current rendered size (so 1 px screen-move = the
  // right amount of % shift regardless of zoom or width setting).
  const knightDragRef = useRef<{
    startX: number; startY: number; startTx: number; startTy: number;
    imgW: number;   imgH: number;
  } | null>(null);
  const onKnightPointerDown = useCallback((e: React.PointerEvent<HTMLImageElement>) => {
    if (!knightEdit) return;
    const img = e.currentTarget;
    img.setPointerCapture(e.pointerId);
    const rect = img.getBoundingClientRect();
    knightDragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startTx: knightTx, startTy: knightTy,
      imgW: rect.width,  imgH: rect.height,
    };
  }, [knightEdit, knightTx, knightTy]);
  const onKnightPointerMove = useCallback((e: React.PointerEvent<HTMLImageElement>) => {
    const d = knightDragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setKnightTx(d.startTx + (dx / d.imgW) * 100);
    setKnightTy(d.startTy + (dy / d.imgH) * 100);
  }, []);
  const onKnightPointerUp = useCallback((e: React.PointerEvent<HTMLImageElement>) => {
    knightDragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);
  // Wheel modifiers:
  //   • plain wheel        → width (overall size, aspect-locked)
  //   • alt + wheel        → scaleY  (vertical stretch only)
  //   • cmd/ctrl + wheel   → rotation
  //   • shift + any        → 10× finer step
  const onKnightWheel = useCallback((e: React.WheelEvent<HTMLImageElement>) => {
    if (!knightEdit) return;
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    const fine = e.shiftKey;
    if (e.metaKey || e.ctrlKey) {
      const step = fine ? 0.1 : 1; // degrees
      setKnightRot((r) => Math.max(-180, Math.min(180, r + dir * step)));
    } else if (e.altKey) {
      const step = fine ? 0.001 : 0.01; // scaleY multiplier
      setKnightSY((s) => Math.max(0.1, Math.min(5, s + dir * step)));
    } else {
      const step = fine ? 0.2 : 2; // width %
      setKnightW((w) => Math.max(50, Math.min(2000, w + dir * step)));
    }
  }, [knightEdit]);
  const resetKnight = useCallback(() => {
    setKnightTx(KNIGHT_TX_DEFAULT);
    setKnightTy(KNIGHT_TY_DEFAULT);
    setKnightW(KNIGHT_W_DEFAULT);
    setKnightSX(KNIGHT_SX_DEFAULT);
    setKnightSY(KNIGHT_SY_DEFAULT);
    setKnightRot(KNIGHT_ROT_DEFAULT);
  }, []);
  // Drive the orb video imperatively — React's `autoPlay` prop only fires
  // on mount, so toggling it later doesn't restart playback. Play when the
  // "video" choice goes active; pause + reset when it goes away.
  const isVideoChoice = ORB_CHOICES[selectedIdx]?.key === 'video';

  // Idle attractor — after 15 s with no input, auto-select the festival
  // video so the orb starts playing on its own (kiosk-style attract loop).
  // Re-arms whenever the user interacts or moves away from the video.
  const videoChoiceIdx = ORB_CHOICES.findIndex((c) => c.key === 'video');
  useEffect(() => {
    if (videoChoiceIdx < 0) return;
    if (isVideoChoice) return; // already on video — no need to attract
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setSelectedIdx(videoChoiceIdx), 15000);
    };
    const events: (keyof DocumentEventMap)[] = [
      'mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll',
    ];
    events.forEach((e) => document.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((e) => document.removeEventListener(e, arm));
    };
  }, [isVideoChoice, videoChoiceIdx]);
  useEffect(() => {
    const v = orbVideoRef.current;
    if (!v) return;
    if (isVideoChoice) {
      v.currentTime = 0;
      void v.play().catch(() => { /* autoplay/gesture restrictions, ignore */ });
    } else {
      v.pause();
    }
  }, [isVideoChoice]);

  const requestOrbFullscreen = useCallback(() => {
    const v = orbVideoRef.current;
    if (!v) return;
    // Some Safari versions only expose webkitEnterFullscreen on the element.
    const anyV = v as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    if (typeof anyV.webkitEnterFullscreen === 'function') anyV.webkitEnterFullscreen();
    else void v.requestFullscreen?.().catch(() => { /* user-gesture required, ignore */ });
  }, []);

  const onChoiceClick = (i: number) => {
    if (i === selectedIdx) return;
    if (ORB_CHOICES[i].key === 'nourriture') playFood();
    else playLoot();
    setSelectedIdx(i);
  };

  const onConfirm = () => {
    if (isLanding) {
      setConfirming(true);
      // Landing → external Zeffy ticket purchase.
      setTimeout(() => { window.location.href = ticketUrl; }, 600);
      return;
    }
    const choiceKey = ORB_CHOICES[selectedIdx].key;
    if (choiceKey === 'video') {
      // Special: confirm on video plays the orb video fullscreen instead of
      // navigating to a non-existent slug.
      requestOrbFullscreen();
      return;
    }
    setConfirming(true);
    const choicePillar = PILLARS.find((p) => p.key === choiceKey)!;
    const target = addLocale(choicePillar.slug.FR, lang);
    setTimeout(() => navigate(target), 600);
  };

  const labelOf = (k: PillarKey | 'video'): string => {
    const choice = ORB_CHOICES.find((c) => c.key === k);
    if (choice?.label) return choice.label[lang];
    return PILLARS.find((p) => p.key === k)!.short[lang];
  };

  // Active choice metadata — null when on landing. Special items (e.g. the
  // video) carry their own copy because they're not in PILLAR_COPY.
  const activeChoice = isLanding ? null : ORB_CHOICES[selectedIdx];
  const activeCopy: string | null = activeChoice
    ? (activeChoice.copy
        ? activeChoice.copy[lang]
        : PILLAR_COPY[activeChoice.key as PillarKey][lang].lead)
    : null;
  const activeLabel = activeChoice ? labelOf(activeChoice.key) : null;

  const seoTitle = lang === 'FR'
    ? `${SITE.shortName} ${SITE.year} — Caravanes & Saltimbanques`
    : `${SITE.shortName} ${SITE.year} — Caravans & Players`;

  return (
    <>
      <SEO title={seoTitle} />

      {/* ── Knight placement editor — pencil + readout, fixed top-right.
            Drag the knight to move, click −/+ or drag values to scrub.
            Only mounts for admins when the `knightPlacementEditor` site
            flag is on (Admin → Paramètres). Off by default in production. */}
      {knightEditorAvailable && (
      <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 select-none">
        {knightEdit && (
          <div className="px-3 py-2 rounded-md bg-black/85 text-ivory text-[11px] font-mono leading-tight backdrop-blur-sm border border-white/15 shadow-lg space-y-1">
            <PropRow label="w"   value={knightW}   onChange={setKnightW}   step={1}     fine={0.1}    min={50}   max={2000} unit="%" decimals={2} />
            <PropRow label="sx"  value={knightSX}  onChange={setKnightSX}  step={0.005} fine={0.0005} min={0.1}  max={5}              decimals={4} />
            <PropRow label="sy"  value={knightSY}  onChange={setKnightSY}  step={0.005} fine={0.0005} min={0.1}  max={5}              decimals={4} />
            <PropRow label="rot" value={knightRot} onChange={setKnightRot} step={0.5}   fine={0.05}   min={-180} max={180}  unit="°" decimals={2} />
            <PropRow label="tx"  value={knightTx}  onChange={setKnightTx}  step={0.1}   fine={0.01}   min={-200} max={200}  unit="%" decimals={4} />
            <PropRow label="ty"  value={knightTy}  onChange={setKnightTy}  step={0.1}   fine={0.01}   min={-200} max={200}  unit="%" decimals={4} />
            <div className="mt-1 pt-1 border-t border-white/10 text-[10px] opacity-60 leading-snug">
              drag value left/right to scrub<br />
              click −/+ to step (shift = fine)<br />
              drag knight to move
            </div>
            <button
              type="button"
              onClick={resetKnight}
              className="mt-1 text-[10px] opacity-70 hover:opacity-100 underline"
            >
              reset
            </button>
          </div>
        )}
        <button
          type="button"
          aria-label={knightEdit ? 'Lock knight placement' : 'Edit knight placement'}
          onClick={() => setKnightEdit((v) => !v)}
          className={`h-9 w-9 rounded-full flex items-center justify-center backdrop-blur-sm border shadow-lg transition-colors ${
            knightEdit
              ? 'bg-amber-500/90 text-black border-amber-300/60'
              : 'bg-black/70 text-ivory border-white/15 hover:bg-black/85'
          }`}
        >
          {/* pencil icon */}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
      </div>
      )}

      <main className="orb-root relative w-full h-[100svh] overflow-hidden bg-midnight-deep text-ivory font-sans isolate">

        {/* ── Atmospheric background ───────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Brass + oxblood radial wash — flame warmth */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(ellipse at 75% 50%, rgba(176,141,58,0.22), transparent 55%), radial-gradient(ellipse at 18% 80%, rgba(107,31,31,0.28), transparent 60%), radial-gradient(ellipse at 50% 0%, rgba(184,106,42,0.14), transparent 70%)',
            }}
          />

          {/* Caravan set-piece — zoomed onto the wagon BODY only. The
              negative `bottom` pushes the image down so the wheels exit
              below the viewport entirely. Wider than 100vw so the barrel
              on the right of the source crops off-canvas, and so the
              right→left scroll parallax has somewhere to travel. */}
          <picture>
            <source srcSet="/orb/caravan-2x.png" media="(min-width: 1280px)" />
            <img
              src="/orb/caravan.png"
              alt=""
              aria-hidden="true"
              decoding="async"
              loading="eager"
              className="orb-caravan absolute left-1/2 top-0 w-[260%] md:w-[210%] max-w-none select-none"
              style={{
                transform: 'translateX(calc(-50% - 6%)) translateY(-18%)',
                filter: 'none',
                // Two mask layers intersected: existing vertical edge-fade,
                // plus a horizontal alpha ramp 0.40 → 0.60 so the caravan
                // sits brighter on the right than on the left.
                WebkitMaskImage:
                  'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 14%, black 35%, black 65%, rgba(0,0,0,0.9) 86%, transparent 100%), linear-gradient(to right, rgba(0,0,0,0.4), rgba(0,0,0,0.6))',
                maskImage:
                  'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 14%, black 35%, black 65%, rgba(0,0,0,0.9) 86%, transparent 100%), linear-gradient(to right, rgba(0,0,0,0.4), rgba(0,0,0,0.6))',
                WebkitMaskComposite: 'source-in',
                maskComposite: 'intersect',
              }}
            />
          </picture>

          {/* Readability scrim — left-edge darken so the choice list / CTAs
              read cleanly over the caravan, plus a soft round vignette.
              After 3 s the scrim dims to 50 % so the flame overlay below
              can warm the scene. Two stacked layers crossfade slowly
              between a forest-green tint and a cool-blue tint — like
              torchlight + dusk light alternating, with a brief teal
              moment as they cross. Outer wrapper keeps the dim-after-
              kindle behaviour; only the inner colour swaps. */}
          <div className="orb-cool-scrim absolute inset-0 pointer-events-none">
            <div
              className="orb-scrim-green absolute inset-0"
              style={{
                background:
                  'linear-gradient(to right, rgba(8,32,20,0.78) 0%, rgba(8,32,20,0.55) 28%, rgba(8,32,20,0.18) 55%, transparent 75%), radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(8,32,20,0.55) 100%)',
              }}
            />
            <div
              className="orb-scrim-blue absolute inset-0"
              style={{
                background:
                  'linear-gradient(to right, rgba(8,20,36,0.78) 0%, rgba(8,20,36,0.55) 28%, rgba(8,20,36,0.18) 55%, transparent 75%), radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(8,20,36,0.55) 100%)',
              }}
            />
          </div>

          {/* Subtle linen texture */}
          <div
            className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
            style={{
              backgroundImage:
                'url("https://www.transparenttextures.com/patterns/black-linen.png")',
            }}
          />
          {/* Soft brass top vignette */}
          <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-brass/[0.06] to-transparent" />
          {/* Particle fire — back in the z-0 atmospheric layer so the
              orb (and the knight + text + buttons above it) all paint
              ON TOP of the firelight, not the other way around. The
              video's own `mix-blend-mode: screen` works correctly
              here because it blends against the caravan + scrim
              siblings in this stacking context. */}
          <FireCanvas />
          <div
            className="orb-flame-glow absolute inset-x-0 bottom-0 h-[40%] pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 90% 60% at 50% 110%, rgba(255,110,55,0.45) 0%, rgba(190,55,20,0.28) 32%, rgba(110,25,12,0.12) 55%, transparent 78%)',
              mixBlendMode: 'screen',
            }}
          />

          {/* Bottom ember — kisses the caravan's wheels, ties it to the page */}
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-[rgba(107,31,31,0.22)] via-[rgba(184,106,42,0.05)] to-transparent" />
        </div>

        <div className="relative z-10 max-w-[1500px] h-full mx-auto px-8 md:px-20 lg:px-24 py-12 md:py-10 grid md:grid-cols-[1fr_1.15fr] gap-8 md:gap-14 items-stretch">

          {/* ── LEFT — eyebrow, list of choices, confirm CTA ───────────── */}
          {/* 2-row grid: title+list float centered in the 1fr row, CTA sits
              in the auto row pinned to the column bottom — mirrors the
              right column so the CTA shares a baseline with the blurb.
              relative + z-40 lifts every text/button above the knight
              image (z-30 in its sibling column) so the 6.54 × wide
              knight spillover can't visually cover the copy. */}
          <div className="grid grid-rows-[1fr_auto] gap-4 md:gap-5 min-h-0 relative z-40">
            <div className="self-center flex flex-col gap-4 md:gap-5 min-h-0 -translate-y-3">

            {/* TITLE PAGE — édition eyebrow, brass rule, scratch-revealed
                hero title, dates subtitle. */}
            <header className="orb-title pt-10 md:pt-12 -translate-y-3">
              {/* Édition eyebrow — single italic word, ~2.5× the previous
                  small line, sitting above the brass rule like a playbill. */}
              <p
                className="orb-title-eyebrow font-editorial italic text-[var(--color-brass-soft)] mb-3 md:mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.05rem)', letterSpacing: '0.04em', lineHeight: 1 }}
              >
                {lang === 'FR' ? 'Édition' : 'Edition'}
              </p>

              {/* Brass rule — frames the title. */}
              <div className="mb-4 md:mb-5">
                <span className="block h-px bg-gradient-to-r from-brass/70 via-brass/25 to-transparent w-full max-w-[18rem]" />
              </div>

              {/* Hero title — scratch-revealed. Wrapped in .orb-title-hero so
                  the clip-path sweep + brass-glow streak target one element. */}
              <h1 className="orb-title-hero relative font-display title-medieval uppercase leading-[0.92] tracking-[0.01em] drop-shadow-[0_3px_22px_rgba(0,0,0,0.95)]">
                <span
                  className="block bg-gradient-to-br from-ivory via-ivory to-[var(--color-amber-glow)] bg-clip-text text-transparent"
                  style={{ fontSize: 'clamp(2rem, 4.6vw, 3.7rem)' }}
                >
                  Caravanes
                </span>
                <span
                  className="block text-[var(--color-brass-soft)]"
                  style={{ fontSize: 'clamp(2rem, 4.6vw, 3.7rem)' }}
                >
                  <span
                    aria-hidden="true"
                    className="font-editorial italic normal-case text-[var(--color-amber-glow)]/90"
                    style={{ fontSize: '0.62em', letterSpacing: '0.04em', marginRight: '0.18em' }}
                  >
                    &amp;
                  </span>
                  Saltimbanques
                </span>
              </h1>

              {/* Dates subtitle — bottom rule + medieval caps */}
              <div className="mt-4 md:mt-5 flex items-baseline gap-3">
                <span className="h-px w-8 md:w-12 bg-gradient-to-r from-transparent via-brass/40 to-brass/70" />
                <p className="font-display title-medieval text-[11px] md:text-[13px] uppercase tracking-[0.3em] sm:tracking-[0.4em] text-[var(--color-brass-soft)] sm:whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {SITE.datesLabel[lang]}
                </p>
              </div>
            </header>

            {/* Choices list — 2 columns (vertical-flow): items 1-7 fill the
                left column, 8-13 fill the right. break-inside-avoid keeps
                each label on a single line within its column. */}
            <ul className="orb-list columns-2 gap-x-6 md:gap-x-8 -mx-1 min-h-0">
              {ORB_CHOICES.map((c, i) => {
                const isSelected = i === selectedIdx;
                return (
                  <li key={c.key} className="break-inside-avoid">
                    <button
                      onClick={() => onChoiceClick(i)}
                      onPointerEnter={(e) => { if (e.pointerType === 'mouse') playHover(); }}
                      onFocus={() => playHover()}
                      className="group w-full text-left px-1 py-1 md:py-1.5 flex items-baseline gap-3 md:gap-4 transition-all duration-300"
                    >
                      <span
                        className={`shrink-0 w-1.5 h-1.5 rounded-full transition-all duration-300 translate-y-[-2px] ${
                          isSelected
                            ? 'bg-[var(--color-amber-glow)] shadow-[0_0_14px_rgba(232,177,74,0.95)]'
                            : 'bg-ivory/15 group-hover:bg-ivory/40'
                        }`}
                      />
                      <span
                        className={`font-display title-medieval uppercase transition-all duration-300 leading-[1] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] ${
                          isSelected
                            ? 'text-ivory tracking-[0.04em]'
                            : 'text-ivory-soft/70 group-hover:text-ivory tracking-[0.02em]'
                        }`}
                        style={{ fontSize: 'clamp(0.95rem, 1.35vw, 1.35rem)' }}
                      >
                        {labelOf(c.key)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            </div>

            {/* CTAs — auto-row of the parent grid, pinned to the column
                bottom so it shares a baseline with the right column's
                blurb panel (also pinned bottom via grid-rows-[1fr_auto]). */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center pt-2">
              <button
                onClick={onConfirm}
                disabled={confirming}
                className={`self-start px-8 py-3.5 font-display title-medieval text-[11px] uppercase tracking-[0.35em] transition-all duration-300 border bg-brass text-midnight-deep border-brass hover:bg-brass-soft hover:scale-[1.02] ${
                  confirming ? 'opacity-50 scale-[0.98]' : ''
                }`}
                style={{
                  boxShadow:
                    '0 6px 24px rgba(176,141,58,0.32), 0 0 0 1px rgba(232,177,74,0.18) inset, 0 1px 0 rgba(255,255,255,0.18) inset',
                }}
              >
                {confirming
                  ? (lang === 'FR' ? 'Ouverture…' : 'Opening…')
                  : isLanding
                    ? (lang === 'FR' ? 'Acheter mes billets' : 'Buy tickets')
                    : (lang === 'FR' ? 'Confirmer mon choix' : 'Confirm my choice')}
              </button>
            </div>
          </div>

          {/* ── RIGHT — glass orb + blurb ───────────────────────────────── */}
          {/* Mirrors the left column: orb floats centered in 1fr row,
              blurb sits in the auto row pinned to column bottom. */}
          <div className="orb-wrap relative grid grid-rows-[1fr_auto] gap-5 md:gap-6 justify-items-center">
            <div className="relative w-full max-w-[440px] md:max-w-[480px] aspect-square self-center translate-y-4">
              {/* Outer glow ring — flame warmth (soft, far).
                  Previously had `filter: blur(55px)`, which forces an
                  offscreen rasterization pass every frame because of the
                  layers animating on top. Replaced by a wider, softer
                  radial gradient that achieves the same visual halo
                  without the per-frame blur cost. */}
              <div
                className="absolute -inset-[35%] rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(184,106,42,0.22) 0%, rgba(176,141,58,0.14) 28%, rgba(184,106,42,0.06) 48%, transparent 62%)',
                }}
              />

              <div
                role="button"
                tabIndex={0}
                onClick={onConfirm}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onConfirm();
                  }
                }}
                aria-label={isLanding
                  ? (lang === 'FR' ? 'Acheter mes billets' : 'Buy tickets')
                  : (lang === 'FR' ? `Confirmer ${activeLabel}` : `Confirm ${activeLabel}`)}
                className="orb relative aspect-square w-full rounded-full overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-amber-glow)]/70"
              >
                {/* Image cross-fade layers + Ken Burns */}
                <div
                  className={`orb-img-layer absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
                    activeLayer === 'A' ? 'opacity-100 orb-img-active' : 'opacity-0'
                  }`}
                  style={layerStyle(layerAResolved)}
                />
                {layerBResolved && (
                  <div
                    className={`orb-img-layer absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
                      activeLayer === 'B' ? 'opacity-100 orb-img-active' : 'opacity-0'
                    }`}
                    style={layerStyle(layerBResolved)}
                  />
                )}

                {/* Festival video — last year's "vikings" short. Mounted once
                    at the orb root, faded in when the "video" choice is
                    active. Tapping the orb (or the blurb button) plays it
                    fullscreen via requestOrbFullscreen. Skipped entirely
                    for prefers-reduced-motion users (220 MB source). */}
                {!reduceMotion && (
                  <video
                    ref={orbVideoRef}
                    src="/orb/vikings.mp4"
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ease-out ${
                      isVideoChoice ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    style={{ transform: 'scale(1.4)' }}
                  />
                )}

                {/* Glistening sweep — re-keys on every selection change so a
                    diagonal light lance plays across the orb during each
                    transition. Pattern adapted from the Salon des Inconnus
                    Creator Studio viewer-sweep. */}
                <div
                  key={`sweep-${selectedIdx}-${introDone ? 1 : 0}`}
                  aria-hidden="true"
                  className="orb-sweep-wrap absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                >
                  <div
                    className="orb-sweep absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 65%, transparent 100%)',
                    }}
                  />
                  <div
                    className="orb-sweep-secondary absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(110deg, transparent 0%, rgba(232,177,74,0.45) 50%, transparent 100%)',
                      mixBlendMode: 'screen',
                    }}
                  />
                </div>

                {/* Landing media — animated FMM logo intro fades into the
                    embossed-silver placeholder logo. Whole stack fades out
                    when a pillar is selected, fades back in on click-away. */}
                <div
                  className={`absolute inset-0 rounded-full overflow-hidden pointer-events-none transition-opacity duration-[1400ms] ease-out ${
                    isLanding ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div className="absolute inset-0 bg-midnight-deep" />
                  <img
                    src="/fmm-logo-embossed-silver.png"
                    alt="FMM"
                    decoding="async"
                    className="fmm-no-grade absolute left-1/2 top-[8%] w-[52%] h-[52%] object-contain"
                    style={{
                      filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.55))',
                      transform: 'translateX(-50%)',
                    }}
                  />
                  {/* Intro video stays mounted and crossfades to 0 once it
                      ends — unmounting it on `introDone` was creating a
                      hard cut between the animated logo and the static PNG.
                      Reduced-motion users skip the 87 MB intro entirely;
                      they see the static logo from frame zero. */}
                  {!reduceMotion && (
                    <video
                      autoPlay
                      muted
                      playsInline
                      preload="auto"
                      onEnded={() => setIntroDone(true)}
                      src="/orb/logo-intro.mp4"
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${
                        introDone ? 'opacity-0' : 'opacity-100'
                      }`}
                      style={{ transform: 'scale(1.4)' }}
                    />
                  )}
                </div>

                {/* Inner vignette so the image meets the rim softly. On
                    landing it stays edge-only so the embossed-silver logo
                    keeps its full luminance. */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none transition-[background] duration-700"
                  style={{
                    background: isLanding
                      ? 'radial-gradient(circle at 50% 50%, transparent 55%, rgba(8,20,36,0.7) 100%)'
                      : 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(8,20,36,0.6) 100%)',
                  }}
                />

                {/* Glass highlight — single broad radial glow with an early
                    falloff so the edge of visibility extends past the rim
                    (no visible internal seam). Replaces the previous two
                    overlays (off-centre circle + top pill) whose hard edges
                    were reading as a bright arc inside the orb. */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none orb-shine"
                  style={{
                    background:
                      'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0) 100%)',
                    mixBlendMode: 'screen',
                  }}
                />

                {/* Brass + flame ornate ring */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    border: '1px solid rgba(232,177,74,0.55)',
                    boxShadow:
                      'inset 0 0 0 5px rgba(8,20,36,0.6), inset 0 0 0 6px rgba(176,141,58,0.7), inset 0 0 70px rgba(184,106,42,0.22), 0 0 80px rgba(176,141,58,0.22), 0 0 200px rgba(107,31,31,0.18), 0 30px 80px rgba(0,0,0,0.6)',
                  }}
                />

                {/* Landing — countdown sits below the embossed logo. Fades
                    in 8 s after page load (matched to the intro video). */}
                {isLanding && (
                  <div
                    className={`absolute inset-x-0 bottom-[10%] flex flex-col items-center pointer-events-none px-6 text-center transition-opacity duration-[1200ms] ease-out ${
                      showCountdown ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <LiveCountdown
                      targetISO={countdownTarget}
                      lang={lang}
                      datesLabel={SITE.datesLabel[lang]}
                    />
                  </div>
                )}

              </div>

              {/* Kneeling knight — overlays the orb. Geometry measured
                  by flood-filling the alpha=0 hole in the PNG:
                  • hole bounding box  304 × 304 px  (perfect circle)
                  • bbox centre at (50.78 %, 42.77 %) of the PNG
                  Pinned with the recipe below:
                    width  673 %                   → hole is sub-pixel
                                                    SMALLER than the
                                                    orb (461.4 vs 462)
                                                    so the orb edge
                                                    extends a hair past
                                                    the hole and the
                                                    knight's silhouette
                                                    closes that ring
                                                    cleanly — no
                                                    background sliver.
                    translate(-50.78 %, -42.77 %)  → ball centre lands
                                                    on the orb centre.
                  Mask: ball-centred circle, fully opaque AT the orb's
                  edge (9.7 %), fades to fully transparent at 26 % —
                  the rendered radius where the "i" of Saltimbanques
                  sits, measured live in the DOM. That's a tight, fast
                  feather rather than the soft drift we had before. */}
              <img
                src="/characters/knight-orb.webp"
                alt=""
                aria-hidden
                className={`orb-knight absolute select-none ${knightEdit ? 'cursor-move' : 'pointer-events-none'}`}
                onPointerDown={onKnightPointerDown}
                onPointerMove={onKnightPointerMove}
                onPointerUp={onKnightPointerUp}
                onPointerCancel={onKnightPointerUp}
                onWheel={onKnightWheel}
                style={{
                  // Width / translate are driven by the placement editor state
                  // (pencil toggle, top-right). Defaults: w=665 %, tx=-50.7813,
                  // ty=-42.7734 — hole 456 px vs 462 px orb, 3 px buffer per side.
                  width: `${knightW}%`,
                  maxWidth: 'none', // beat Tailwind's `img { max-width: 100% }`
                  height: 'auto',
                  left: '50%',
                  top: '50%',
                  // Order: translate → rotate → scale. translate uses the
                  // image's own (pre-scale) layout box so it stays consistent
                  // across scale changes. scale(sx, sy) lets each axis be
                  // stretched independently — useful when the PNG hole
                  // isn't a perfect circle on screen and needs warping
                  // into a slight ellipse to seat the orb cleanly.
                  transform: `translate(${knightTx}%, ${knightTy}%) rotate(${knightRot}deg) scale(${knightSX}, ${knightSY})`,
                  // Four stacked masks. Listed top-to-bottom; each layer's
                  // composite operator combines that layer with the result
                  // of everything below.
                  // ① Left clear (intersect / multiply): full alpha at the
                  //   orb's left perimeter and rightward (x ≥ 42 %), ramps
                  //   down to 0.5 alpha at x ≤ 33 %. The orb edge zone is
                  //   spared so the silhouette around the orb stays solid;
                  //   the "ue" of Saltimbanques reads through at 50 %.
                  // ② Bottom boost (add): below y=60 %, +70 % alpha so the
                  //   lower body of the knight stays mostly visible past
                  //   the radial feather (less fade at the bottom).
                  // ③ Right boost (add): right of x=55 %, +60 % alpha so
                  //   the right shoulder/arm stays visible past the feather.
                  // ④ Radial (base): knight body stays fully opaque to
                  //   13 % (a fat opaque ring covering the orb's outer rim
                  //   and 70+ px past it — kills any visible hole around
                  //   the orb), feathers to transparent at 26 % (where
                  //   the "i" of Saltimbanques sits).
                  WebkitMaskImage:
                    'linear-gradient(to right, rgba(0,0,0,0.5) 33%, #000 42%), ' +
                    'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7) 60%), ' +
                    'linear-gradient(to right, transparent 55%, rgba(0,0,0,0.6) 70%), ' +
                    'radial-gradient(circle at 50.7813% 42.7734%, #000 13%, transparent 26%)',
                  maskImage:
                    'linear-gradient(to right, rgba(0,0,0,0.5) 33%, #000 42%), ' +
                    'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7) 60%), ' +
                    'linear-gradient(to right, transparent 55%, rgba(0,0,0,0.6) 70%), ' +
                    'radial-gradient(circle at 50.7813% 42.7734%, #000 13%, transparent 26%)',
                  maskComposite: 'intersect, add, add, add',
                  // Single drop-shadow pass — chained filters each force
                  // a separate rasterization. The previous (0 0 28px brass)
                  // contributed a faint warm glow that's already covered
                  // by the orb's box-shadow glow ring, so we drop it.
                  filter:
                    'drop-shadow(0 24px 36px rgba(0, 0, 0, 0.55))',
                  zIndex: 30,
                }}
              />
            </div>

            {/* Blurb glass panel — landing shows tickets CTA, pillar shows
                lead, video shows fullscreen button. */}
            <div
              key={isLanding ? LANDING_KEY : activeChoice!.key}
              className="orb-blurb-glass relative w-full max-w-[480px] rounded-2xl overflow-hidden z-40"
            >
              <div className="relative px-6 py-4 bg-midnight-deep/55 backdrop-blur-md">
                {isLanding ? (
                  <a
                    href={ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="orb-blurb group flex items-center justify-center gap-2 font-display title-medieval uppercase text-[11px] md:text-xs tracking-[0.35em] text-[var(--color-amber-glow)] hover:text-ivory transition-colors"
                  >
                    <span aria-hidden className="text-base translate-y-[-1px]">⚔</span>
                    <span>{lang === 'FR' ? 'Acheter mes billets sur Zeffy' : 'Buy tickets on Zeffy'}</span>
                    <span aria-hidden className="opacity-60 group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                ) : activeChoice?.key === 'video' ? (
                  <button
                    type="button"
                    onClick={requestOrbFullscreen}
                    className="orb-blurb group w-full flex items-center justify-center gap-2 font-display title-medieval uppercase text-[11px] md:text-xs tracking-[0.35em] text-[var(--color-amber-glow)] hover:text-ivory transition-colors"
                  >
                    <span aria-hidden className="text-base translate-y-[-1px]">▶</span>
                    <span>{lang === 'FR' ? 'Voir en plein écran' : 'Watch fullscreen'}</span>
                    <span aria-hidden className="opacity-60 group-hover:translate-x-1 transition-transform">↗</span>
                  </button>
                ) : (
                  <p className="orb-blurb font-editorial italic text-ivory-soft text-sm md:text-[15px] leading-[1.55] text-center">
                    {activeCopy}
                  </p>
                )}
              </div>
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.16), rgba(0,0,0,0) 55%)',
                  mixBlendMode: 'screen',
                }}
              />
              <div
                className="orb-shine absolute inset-x-[12%] top-0 h-[42%] pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.4), rgba(255,255,255,0) 70%)',
                  filter: 'blur(2px)',
                }}
              />
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  border: '1px solid rgba(232,177,74,0.4)',
                  boxShadow:
                    'inset 0 0 0 2px rgba(8,20,36,0.45), inset 0 0 0 3px rgba(176,141,58,0.42), inset 0 0 30px rgba(184,106,42,0.14), 0 0 30px rgba(176,141,58,0.14), 0 12px 30px rgba(0,0,0,0.5)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Top-left wordmark — logo only (the title page below carries the
            "Caravanes & Saltimbanques" edition name in full). */}
        <Link
          to={addLocale('/accueil', lang)}
          className="absolute top-5 left-5 md:top-7 md:left-10 z-20 flex items-center gap-3 group"
          aria-label={lang === 'FR' ? 'FMM accueil détaillé' : 'FMM full home'}
        >
          <img
            decoding="async"
            src={SITE.logoWhite}
            alt="FMM"
            className="fmm-no-grade h-14 md:h-20 w-auto transition-opacity group-hover:opacity-80 drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]"
          />
          <span className="hidden sm:inline-flex font-display title-medieval text-sm md:text-base text-ivory drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            FMM <span className="text-brass ml-1">{SITE.year}</span>
          </span>
        </Link>

        {/* Top-right corner — account access + lang toggle. This is
            the ONLY place outside the global NavBar (which is hidden on
            this immersive landing) where Mon compte / Se connecter
            lives. */}
        <div className="absolute top-6 right-5 md:top-8 md:right-12 z-20 flex items-center gap-4 sm:gap-6 md:gap-8">
          {user ? (
            <Link
              to={addLocale('/compte', lang)}
              className="group inline-flex items-center gap-1.5 sm:gap-2 font-display title-medieval text-[10px] md:text-xs uppercase tracking-[0.25em] sm:tracking-[0.4em] text-ivory-soft hover:text-[var(--color-amber-glow)] transition-colors"
            >
              {lang === 'FR' ? 'Mon compte' : 'My account'}
              <span aria-hidden className="hidden sm:inline-block h-px w-5 bg-ivory-soft/40 group-hover:bg-[var(--color-amber-glow)] group-hover:w-8 transition-all" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={openSignIn}
              className="group inline-flex items-center gap-1.5 sm:gap-2 font-display title-medieval text-[10px] md:text-xs uppercase tracking-[0.25em] sm:tracking-[0.4em] text-ivory-soft hover:text-[var(--color-amber-glow)] transition-colors"
            >
              {lang === 'FR' ? 'Se connecter' : 'Sign in'}
              <span aria-hidden className="hidden sm:inline-block h-px w-5 bg-ivory-soft/40 group-hover:bg-[var(--color-amber-glow)] group-hover:w-8 transition-all" />
            </button>
          )}
          <Link
            to={lang === 'FR' ? '/en' : '/'}
            className="font-display title-medieval text-[10px] md:text-xs uppercase tracking-[0.5em] text-ivory-soft hover:text-brass transition-colors"
          >
            {lang === 'FR' ? 'EN' : 'FR'}
          </Link>
        </div>

        <style>{`
          /* will-change is GPU-VRAM heavy; only mark the ACTIVE layer
             (which is actively running Ken Burns). The hidden layer
             waits at opacity:0 and doesn't need a compositor layer. */
          .orb-img-active {
            will-change: transform, opacity;
            animation: orbKenBurns 16s ease-in-out infinite alternate;
          }
          @keyframes orbKenBurns {
            0%   { transform: scale(1.05); }
            100% { transform: scale(1.14) translateY(-1.5%); }
          }
          .orb-shine { animation: orbShine 6s ease-in-out infinite alternate; }
          @keyframes orbShine {
            0%   { opacity: 0.45; transform: translateY(0); }
            100% { opacity: 0.7;  transform: translateY(2px); }
          }
          .orb-blurb, .orb-nameplate { animation: orbFadeText 600ms ease-out; }
          @keyframes orbFadeText {
            0%   { opacity: 0; transform: translateY(6px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          /* Glistening sweep — diagonal light lance + tinted secondary lance
             that play once per transition (re-keyed on selection change). */
          .orb-sweep {
            animation: orbSweep 1100ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
            transform-origin: center;
          }
          @keyframes orbSweep {
            0%   { transform: translateX(-110%); opacity: 0; }
            20%  { opacity: 1; }
            100% { transform: translateX(110%); opacity: 0; }
          }
          .orb-sweep-secondary {
            animation: orbSweepDelayed 1400ms cubic-bezier(0.2, 0.7, 0.3, 1) 120ms both;
          }
          @keyframes orbSweepDelayed {
            0%   { transform: translateX(-130%); opacity: 0; }
            25%  { opacity: 1; }
            100% { transform: translateX(130%); opacity: 0; }
          }

          .orb-blurb-glass { animation: orbGlassIn 800ms ease-out; }
          @keyframes orbGlassIn {
            0%   { opacity: 0; transform: translateY(10px) scale(0.97); }
            100% { opacity: 1; transform: translateY(0)    scale(1);    }
          }
          .orb-countdown { animation: orbFadeText 900ms ease-out; }
          /* Title page entry — eyebrow + rule rise first, then the hero
             title is scratched open by a brass-glow streak, then the dates
             rise after the reveal lands. */
          .orb-title-eyebrow,
          .orb-title > div:nth-of-type(1),
          .orb-title > div:nth-of-type(2) {
            opacity: 0;
            animation: orbTitleRise 800ms cubic-bezier(0.22,0.61,0.36,1) both;
          }
          .orb-title-eyebrow                   { animation-delay: 180ms; }
          .orb-title > div:nth-of-type(1)      { animation-delay: 360ms; }
          .orb-title > div:nth-of-type(2)      { animation-delay: 1900ms; }

          /* Scratch reveal — sweep clip-path open from left to right,
             accompanied by a glowing brass streak that races along the
             reveal edge. */
          .orb-title-hero {
            clip-path: inset(0 100% 0 0);
            animation: scratchReveal 1500ms cubic-bezier(0.45, 0.05, 0.18, 1) 600ms forwards;
          }
          @keyframes scratchReveal {
            0%   { clip-path: inset(0 100% 0 0); }
            100% { clip-path: inset(0 0% 0 0); }
          }
          .orb-title-hero::after {
            content: '';
            position: absolute;
            top: -6%;
            bottom: -6%;
            left: 0;
            width: 5px;
            background: linear-gradient(to right,
              transparent 0%,
              rgba(232,177,74,0.55) 30%,
              rgba(255,243,210,0.95) 50%,
              rgba(232,177,74,0.55) 70%,
              transparent 100%);
            filter: blur(3px);
            opacity: 0;
            pointer-events: none;
            animation: scratchEdge 1500ms cubic-bezier(0.45, 0.05, 0.18, 1) 600ms forwards;
          }
          @keyframes scratchEdge {
            0%   { left: 0%;   opacity: 0; }
            8%   { opacity: 1; }
            92%  { opacity: 1; }
            100% { left: 100%; opacity: 0; }
          }
          @keyframes orbTitleRise {
            0%   { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          /* Cool scrim → fades to 50 % after 3 s so the flame overlay below
             can warm the page. */
          .orb-cool-scrim {
            animation: orbScrimDim 1800ms cubic-bezier(0.4,0,0.4,1) 3000ms forwards;
          }
          @keyframes orbScrimDim {
            0%   { opacity: 1;   }
            100% { opacity: 0.5; }
          }

          /* Slow crossfade between forest-green and cool-blue inner
             layers. 18 s full cycle, counter-phase opacity so when one
             is at peak the other is invisible. Brief teal blend at the
             4-5 s and 13-14 s crossings — atmospheric, not glitchy. */
          .orb-scrim-green {
            animation: orbScrimGreen 18s ease-in-out infinite;
          }
          .orb-scrim-blue {
            animation: orbScrimBlue 18s ease-in-out infinite;
          }
          @keyframes orbScrimGreen {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0; }
          }
          @keyframes orbScrimBlue {
            0%, 100% { opacity: 0; }
            50%      { opacity: 1; }
          }

          /* Particle fire — kindles after 3 s. The actual flames are drawn
             on a canvas (FireCanvas component); this just fades the canvas
             + the supporting low broad ember-glow into view. */
          .orb-flame-canvas,
          .orb-flame-glow {
            opacity: 0;
            animation: flameKindle 1800ms cubic-bezier(0.4,0,0.4,1) 3000ms forwards;
          }
          @keyframes flameKindle {
            0%   { opacity: 0; }
            100% { opacity: 1; }
          }
          /* Caravan fades in + glides slightly leftward, as if advancing
             into frame from the right. Final state matches the inline
             transform so the element rests cleanly after animation ends. */
          /* caravanArrive runs once on mount then rests — no need to
             pin a compositor layer for the lifetime of the page. */
          .orb-caravan {
            animation: caravanArrive 2000ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
          }
          @keyframes caravanArrive {
            0%   { opacity: 0; transform: translateX(calc(-50% + 8%)) translateY(-18%); }
            35%  { opacity: 0; }
            100% { opacity: 1; transform: translateX(calc(-50% - 6%)) translateY(-18%); }
          }
          /* Discreet brass-tinted scrollbar for the choices list */
          .orb-list::-webkit-scrollbar { width: 4px; }
          .orb-list::-webkit-scrollbar-track { background: transparent; }
          .orb-list::-webkit-scrollbar-thumb { background: rgba(176,141,58,0.3); border-radius: 2px; }
          .orb-list::-webkit-scrollbar-thumb:hover { background: rgba(176,141,58,0.55); }
          @media (prefers-reduced-motion: reduce) {
            .orb-img-active { animation: none !important; }
            .orb-shine  { animation: none !important; }
            .orb-blurb, .orb-nameplate, .orb-blurb-glass { animation: none !important; }
            .orb-caravan { animation: none !important; opacity: 1; }
            .orb-title-hero { animation: none !important; clip-path: inset(0 0 0 0) !important; }
            .orb-title-hero::after { animation: none !important; opacity: 0 !important; }
            .orb-cool-scrim { animation: none !important; opacity: 0.5 !important; }
            .orb-scrim-green { animation: none !important; opacity: 1 !important; }
            .orb-scrim-blue  { animation: none !important; opacity: 0 !important; }
            .orb-flame-canvas { animation: none !important; opacity: 0 !important; }
            .orb-flame-glow   { animation: none !important; opacity: 1 !important; }
          }
        `}</style>
      </main>
    </>
  );
};

export default OrbHomePage;
