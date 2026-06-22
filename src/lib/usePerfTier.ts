import { useState } from 'react';

// ─── Perf tier ───────────────────────────────────────────────────────────
// Detects machines / connections that can't afford the full cinematic load
// (scrubbed video, always-on canvases, mix-blend video layers). When `lite`
// is true, callers fall back to static art so the page stays fluid on budget
// laptops and slow links. Good machines keep the premium look untouched.

export function detectLite(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };

  // Explicit data-saver, or a slow effective connection.
  if (nav.connection?.saveData) return true;
  const et = nav.connection?.effectiveType;
  if (et && /(slow-2g|2g|3g)/.test(et)) return true;

  const cores = nav.hardwareConcurrency;
  const mem = nav.deviceMemory; // Chromium only; capped at 8

  // Very weak on a single axis, or weak on both at once.
  if (typeof cores === 'number' && cores <= 2) return true;
  if (typeof mem === 'number' && mem <= 2) return true;
  if (typeof cores === 'number' && cores <= 4 && typeof mem === 'number' && mem <= 4) return true;

  return false;
}

// Evaluated once on mount; the device tier doesn't change mid-session.
export function usePerfTier(): { lite: boolean } {
  const [lite] = useState(detectLite);
  return { lite };
}
