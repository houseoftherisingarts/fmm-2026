// Meta (Facebook) Pixel loader + page-view tracker.
// Gated behind user consent — `loadMetaPixel()` is called from the
// ConsentBanner once accepted. Until then, `window.fbq` is undefined
// and `trackPixelPageView()` no-ops.

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; callMethod?: (...args: unknown[]) => void; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
  }
}

let loaded = false;

export function loadMetaPixel() {
  const id = import.meta.env.VITE_META_PIXEL_ID;
  if (!id || loaded || typeof window === 'undefined') return;
  loaded = true;

  // Inline the official Meta Pixel boot snippet using a self-invoking IIFE
  // so we don't fight TS strictness on the global-mutating one-liner.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.fbq) return;

  const fbq: any = function (...args: unknown[]) {
    fbq.callMethod ? fbq.callMethod.apply(fbq, args) : (fbq.queue as unknown[]).push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;

  const t = document.createElement('script');
  t.async = true;
  t.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const s = document.getElementsByTagName('script')[0];
  s?.parentNode?.insertBefore(t, s);

  fbq('init', id);
  fbq('track', 'PageView');
}

export function trackPixelPageView() {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', 'PageView');
}
