import React from 'react';

// ─── Tarot card thumbnails ────────────────────────────────────────
// Five Major Arcana cards from the public-domain Rider-Waite-Smith
// deck (1909, Pamela Colman Smith). Source: Wikimedia Commons.
// Mapping is narrative, fitting the 2026 "Caravanes & Saltimbanques"
// theme:
//   wanderer → The Fool          — the traveller setting out
//   flame    → The Magician      — the saltimbanque, master of craft
//   wheel    → The Wheel         — the wagon, fortune in motion
//   mask     → The Hermit        — solitary wanderer with the lantern
//   helm     → The Star          — guidance, hope, the sealed pact

export type TarotGlyph = 'wanderer' | 'flame' | 'wheel' | 'mask' | 'helm';

const Image: Record<TarotGlyph, string> = {
  wanderer: '/tarot/fool.jpg',
  flame:    '/tarot/magician.jpg',
  wheel:    '/tarot/wheel.jpg',
  mask:     '/tarot/hermit.jpg',
  helm:     '/tarot/star.jpg',
};

const Alt: Record<TarotGlyph, string> = {
  wanderer: 'The Fool — public-domain Rider-Waite-Smith tarot',
  flame:    'The Magician — public-domain Rider-Waite-Smith tarot',
  wheel:    'The Wheel of Fortune — public-domain Rider-Waite-Smith tarot',
  mask:     'The Hermit — public-domain Rider-Waite-Smith tarot',
  helm:     'The Star — public-domain Rider-Waite-Smith tarot',
};

const TarotCard: React.FC<{ glyph: TarotGlyph; className?: string }> = ({ glyph, className = '' }) => (
  <article className={`relative aspect-[2/3] rounded-card overflow-hidden ${className}`}>
    {/* Card art */}
    <img
      src={Image[glyph]}
      alt={Alt[glyph]}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 w-full h-full object-cover"
    />

    {/* Brass border + inner double-line — preserved from the original
        design so the card sits on the velvet stage as a framed object. */}
    <div className="absolute inset-0 rounded-card border border-brass/60 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(176,141,58,0.15)_inset]" />
    <div className="absolute inset-1 rounded-[10px] border border-brass/25" />

    {/* Faint corner filigree (decorative SVG, not text). */}
    {[
      'top-1.5 left-1.5',  'top-1.5 right-1.5 rotate-90',
      'bottom-1.5 left-1.5 -rotate-90', 'bottom-1.5 right-1.5 rotate-180',
    ].map((pos) => (
      <svg key={pos} className={`absolute ${pos} w-2.5 h-2.5 text-brass/55`} viewBox="0 0 12 12" aria-hidden>
        <path d="M0 0 L6 0 L6 1 L1 1 L1 6 L0 6 Z M3 3 L6 3 L6 4 L4 4 L4 6 L3 6 Z" fill="currentColor" />
      </svg>
    ))}
  </article>
);

export default TarotCard;
