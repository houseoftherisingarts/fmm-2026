import React from 'react';
import { motion } from 'framer-motion';
import type { MarcheKiosk } from '../../content/marche';
import { Eyebrow, DisplayTitle, HexPanel, ChevronButton, HexMark, SectionFog, SectionTopRail, SectionBottomRail } from './atmospherics';
import { useSpotlight, useTilt } from './effects';

interface Props {
  lang: 'FR' | 'EN';
  products: MarcheKiosk[];
  copy: ForgeCopy;
}

export interface ForgeCopy {
  eyebrow:    string;
  title:      string;
  lead:       string;
  preorder:   string;
  finePrint:  string;
  emptyState: string;
  rebateBadge:string;
  retailLabel:string;
  festLabel:  string;
}

// ─── ForgeCounter — In-house item slots ──────────────────────────────
// LoL item-shop slot aesthetic for in-house pre-orders. Each product
// is a photo-fronted slot tile with a clear price stack:
//   strikethrough retail (top) → festival price (bottom, amber-glow)
// Tilts under cursor. Pre-order CTA is disabled until orders open.
const ForgeCounter: React.FC<Props> = ({ lang, products, copy }) => (
  <section className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden">
    <SectionFog />

    <div className="relative max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-24 md:pt-32 pb-24 md:pb-32">
      <SectionTopRail
        index="05"
        name={copy.eyebrow}
        meta={lang === 'FR' ? 'Pièces' : 'Pieces'}
        metaValue={String(products.length)}
        className="mb-10 md:mb-14"
      />

      <header className="max-w-3xl mb-12 md:mb-16">
        <Eyebrow className="mb-5 inline-flex items-center gap-3">
          <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-copper)' }} />
          {copy.eyebrow}
        </Eyebrow>
        <DisplayTitle size="xl" glow className="mb-6">{copy.title}</DisplayTitle>
        <p className="font-editorial text-base md:text-lg text-[var(--color-bone)]/80 leading-relaxed max-w-2xl">
          {copy.lead}
        </p>
      </header>

      {products.length === 0 ? (
        <p className="font-editorial italic text-[var(--color-bone)]/70 text-base max-w-xl">
          {copy.emptyState}
        </p>
      ) : (
        <ul className="grid gap-6 md:gap-8 md:grid-cols-3">
          {products.map((p, i) => (
            <li key={p.id}>
              <SlotTile product={p} index={i} total={products.length} lang={lang} copy={copy} />
            </li>
          ))}
        </ul>
      )}

      <p className="font-editorial italic text-[12px] tracking-wide mt-10 max-w-2xl" style={{ color: 'var(--color-bone)', opacity: 0.55 }}>
        {copy.finePrint}
      </p>

      <SectionBottomRail
        className="mt-14 md:mt-20"
        hint={lang === 'FR' ? 'Précommandes ouvrent prochainement' : 'Pre-orders opening soon'}
        meta={lang === 'FR' ? 'Boutique maison' : 'In-house shop'}
      />
    </div>
  </section>
);

const SlotTile: React.FC<{
  product: MarcheKiosk;
  index: number;
  total: number;
  lang: 'FR' | 'EN';
  copy: ForgeCopy;
}> = ({ product, index, total, lang, copy }) => {
  const tilt = useTilt(6);
  const spot = useSpotlight('rgba(232, 177, 74, 0.28)', 280);
  const note = product.prepNote?.[lang === 'FR' ? 'FR' : 'EN'];
  const tag  = lang === 'FR' ? product.tagFR : product.tagEN;

  // Discount %, if both prices present and parseable.
  const discount = ((): string | null => {
    if (!product.prepStrike || !product.prepPrice) return null;
    const a = parseFloat(product.prepStrike.replace(/[^\d.]/g, ''));
    const b = parseFloat(product.prepPrice.replace(/[^\d.]/g, ''));
    if (!a || !b || b >= a) return null;
    return `-${Math.round(((a - b) / a) * 100)}%`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: 0.08 * index }}
      style={{ perspective: 1400 }}
    >
      <div
        ref={tilt.ref}
        onMouseMove={(e) => { tilt.onMove(e); spot.onMove(e); }}
        onMouseLeave={() => { tilt.onLeave(); spot.onLeave(); }}
      >
        <motion.div style={{ rotateX: tilt.rx, rotateY: tilt.ry, transformStyle: 'preserve-3d' }}>
          <HexPanel size="md" className="fmm-shimmer">
            <div className="relative caravan-glass overflow-hidden">
              {/* Photo */}
              <div className="relative aspect-[5/4] overflow-hidden">
                <img
                  src={product.image || '/wix/marche/73932437.jpg'}
                  alt={product.name}
                  decoding="async"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
                  style={{ objectPosition: product.imagePosition || 'center' }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(184,106,42,0.18) 0%, transparent 35%, rgba(10,2,7,0.78) 100%)',
                  }}
                />
                <motion.div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: spot.background, mixBlendMode: 'screen' }}
                />
                {/* Slot index */}
                <span
                  className="absolute top-3 left-3 inline-block px-2 py-0.5 font-sans text-[9px] tracking-[0.5em]"
                  style={{
                    color: 'var(--color-amber-glow)',
                    background: 'rgba(10, 2, 7, 0.85)',
                    border: '1px solid rgba(232, 177, 74, 0.5)',
                  }}
                >
                  {String(index + 1).padStart(2, '0')} <span className="opacity-60">·</span> {String(total).padStart(2, '0')}
                </span>
                {/* Discount badge */}
                {discount && (
                  <span
                    className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 font-sans uppercase tracking-[0.3em] text-[10px] font-semibold"
                    style={{
                      color: 'var(--color-velvet-deep)',
                      background:
                        'linear-gradient(180deg, var(--color-amber-glow) 0%, var(--color-mustard) 100%)',
                      boxShadow: '0 0 16px -2px rgba(232, 177, 74, 0.55)',
                    }}
                  >
                    {discount}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-6 md:p-7">
                <p
                  className="font-editorial italic uppercase tracking-[0.4em] text-[10px] mb-3 inline-flex items-center gap-2"
                  style={{ color: 'var(--color-amber-glow)' }}
                >
                  <HexMark className="opacity-80" /> {product.category}
                </p>
                <h3
                  className="font-display leading-[1.05] tracking-[-0.005em] text-xl md:text-2xl mb-3"
                  style={{ color: 'var(--color-bone)', fontWeight: 400 }}
                >
                  {product.name}
                </h3>
                <p
                  className="font-editorial italic text-[14px] leading-snug mb-6"
                  style={{ color: 'var(--color-bone)', opacity: 0.75 }}
                >
                  {tag}
                </p>

                {/* Price stack */}
                <div className="flex items-end gap-5 mb-3">
                  {product.prepStrike && (
                    <div className="flex flex-col">
                      <span
                        className="font-editorial italic uppercase tracking-[0.4em] text-[9px] mb-1"
                        style={{ color: 'var(--color-bone)', opacity: 0.45 }}
                      >
                        {copy.retailLabel}
                      </span>
                      <span
                        className="relative font-editorial italic text-base"
                        style={{ color: 'var(--color-bone)', opacity: 0.5 }}
                      >
                        {product.prepStrike}
                        <span aria-hidden className="absolute inset-x-0 top-1/2 h-px" style={{ background: 'var(--color-blush)' }} />
                      </span>
                    </div>
                  )}
                  {product.prepPrice && (
                    <div className="flex flex-col">
                      <span
                        className="font-editorial italic uppercase tracking-[0.4em] text-[9px] mb-1"
                        style={{ color: 'var(--color-amber-glow)' }}
                      >
                        {copy.festLabel}
                      </span>
                      <span
                        className="font-display text-2xl md:text-3xl tracking-[-0.005em] leading-none"
                        style={{
                          color: 'var(--color-amber-glow)',
                          fontWeight: 400,
                          textShadow: '0 0 18px rgba(232, 177, 74, 0.35)',
                        }}
                      >
                        {product.prepPrice}
                      </span>
                    </div>
                  )}
                </div>

                {note && (
                  <p
                    className="font-editorial italic text-[11px] mb-6"
                    style={{ color: 'var(--color-bone)', opacity: 0.55 }}
                  >
                    {note}
                  </p>
                )}

                <ChevronButton disabled variant="ghost">
                  {copy.preorder}
                </ChevronButton>
              </div>
            </div>
          </HexPanel>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ForgeCounter;
