import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, RotateCcw, ImageIcon, Loader2 } from 'lucide-react';
import {
  AVAILABLE_VENDOR_IMAGES,
  loadVendorImageOverrides,
  saveVendorImageOverride,
  clearVendorImageOverride,
} from '../../firebase/vendorImages';

interface Props {
  /** Vendor IDs + their default (hardcoded) image, so the picker can
      show "current" state and the "Reset" affordance. */
  vendors: Array<{ id: string; name: string; defaultImage?: string }>;
  /** Open the picker pre-focused on a specific vendor. */
  initialVendorId?: string | null;
  /** Admin doing the editing. */
  editorUid: string;
  onClose: () => void;
  /** Called when an override is saved or cleared — caller can refresh. */
  onSaved?: () => void;
}

// ─── VendorImagePicker ──────────────────────────────────────────────
// Full-screen image library + per-vendor selector. Two columns:
//   Left  → vendor list (premium · marché · digital · prep). Click a
//           row to focus that vendor; the right column then offers the
//           image grid for it.
//   Right → 40-image grid. Active vendor's current image is rim-lit.
//           Click any tile → saves as override → next render shows it
//           as the new current.
//
// Storage backs to crm/vendor-image-overrides. The same Firestore doc
// is read by the public /marche, so changes appear immediately on
// reload (no redeploy needed).
const VendorImagePicker: React.FC<Props> = ({
  vendors,
  initialVendorId = null,
  editorUid,
  onClose,
  onSaved,
}) => {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [focusId, setFocusId] = useState<string | null>(initialVendorId ?? vendors[0]?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initial load.
  useEffect(() => {
    let live = true;
    loadVendorImageOverrides()
      .then((o) => { if (live) setOverrides(o); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const focused = vendors.find((v) => v.id === focusId) ?? null;
  const focusedImage = focused
    ? (overrides[focused.id] ?? focused.defaultImage ?? null)
    : null;
  const focusedIsOverridden = focused ? !!overrides[focused.id] : false;

  const onPick = async (imagePath: string) => {
    if (!focused || savingId) return;
    setSavingId(focused.id);
    setError(null);
    // Optimistic update so the rim flips immediately.
    setOverrides((prev) => ({ ...prev, [focused.id]: imagePath }));
    try {
      await saveVendorImageOverride(focused.id, imagePath, editorUid);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Revert on failure.
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[focused.id];
        return next;
      });
    } finally {
      setSavingId(null);
    }
  };

  const onReset = async () => {
    if (!focused || savingId || !focusedIsOverridden) return;
    setSavingId(focused.id);
    setError(null);
    try {
      await clearVendorImageOverride(focused.id, editorUid);
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[focused.id];
        return next;
      });
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center px-3 md:px-6"
      style={{ background: 'rgba(8, 20, 36, 0.85)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-7xl max-h-[90vh] rounded-lg-card border border-brass/35 bg-midnight-deep overflow-hidden flex flex-col"
      >
        {/* Header */}
        <header className="px-5 md:px-7 py-4 md:py-5 flex items-center justify-between gap-3 border-b border-ivory-soft/15">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-brass/15 border border-brass/45 flex items-center justify-center text-brass shrink-0">
              <ImageIcon size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
                Bibliothèque d’images
              </p>
              <h3 className="font-display title-medieval text-lg md:text-xl text-ivory leading-tight truncate">
                Choisir une photo par kiosque
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-midnight/80 border border-ivory-soft/20 text-ivory-soft hover:text-brass hover:border-brass transition flex items-center justify-center shrink-0"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </header>

        {error && (
          <p className="px-5 md:px-7 py-2 font-editorial italic text-xs text-blush border-b border-blush/30">
            {error}
          </p>
        )}

        {/* Body — two columns */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[260px_1fr]">
          {/* Left — vendor list */}
          <aside className="border-r border-ivory-soft/15 overflow-y-auto bg-midnight/40">
            {loading ? (
              <p className="p-5 font-editorial italic text-xs text-ivory-soft">Chargement…</p>
            ) : (
              <ul className="py-2">
                {vendors.map((v) => {
                  const isFocused = v.id === focusId;
                  const hasOverride = !!overrides[v.id];
                  const currentImg = overrides[v.id] ?? v.defaultImage;
                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => setFocusId(v.id)}
                        className={`group w-full flex items-center gap-3 px-4 py-2.5 text-left transition border-l-2 ${
                          isFocused
                            ? 'bg-brass/10 border-brass'
                            : 'border-transparent hover:bg-brass/5 hover:border-brass/40'
                        }`}
                      >
                        <span
                          className="w-9 h-9 shrink-0 bg-midnight border border-ivory-soft/20 overflow-hidden"
                          style={currentImg ? {
                            backgroundImage: `url(${currentImg})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          } : undefined}
                        />
                        <span className="flex-1 min-w-0">
                          <span className={`block font-sans text-sm truncate transition ${isFocused ? 'text-ivory' : 'text-ivory-soft'}`}>
                            {v.name}
                          </span>
                          {hasOverride && (
                            <span className="block font-editorial italic uppercase tracking-[0.25em] text-[9px] text-brass mt-0.5">
                              Modifié
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Right — image grid */}
          <main className="overflow-y-auto p-4 md:p-6 bg-midnight-deep">
            {!focused ? (
              <p className="font-editorial italic text-ivory-soft text-sm">
                Sélectionnez un kiosque à gauche pour choisir sa photo.
              </p>
            ) : (
              <>
                {/* Focused vendor heading + current image preview + reset */}
                <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    {focusedImage && (
                      <span
                        className="w-12 h-12 shrink-0 border border-brass/45"
                        style={{
                          backgroundImage: `url(${focusedImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-editorial italic text-brass uppercase tracking-[0.25em] text-[9px] mb-0.5">
                        {focused.id}
                      </p>
                      <h4 className="font-display title-medieval text-base md:text-lg text-ivory truncate">
                        {focused.name}
                      </h4>
                    </div>
                  </div>
                  {focusedIsOverridden && (
                    <button
                      type="button"
                      onClick={onReset}
                      disabled={savingId === focused.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ivory-soft/30 text-ivory-soft hover:border-brass hover:text-brass font-sans uppercase tracking-wider text-[10px] font-semibold transition rounded-card disabled:opacity-50"
                    >
                      <RotateCcw size={11} /> Rétablir
                    </button>
                  )}
                </header>

                {/* Grid */}
                <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
                  {AVAILABLE_VENDOR_IMAGES.map((img) => {
                    const isActive = focusedImage === img;
                    const isSaving = savingId === focused.id && isActive;
                    return (
                      <li key={img}>
                        <button
                          type="button"
                          onClick={() => onPick(img)}
                          aria-pressed={isActive}
                          className={`group relative block w-full aspect-square overflow-hidden transition-all ${
                            isActive
                              ? 'ring-2 ring-brass shadow-[0_0_0_3px_rgba(176,141,58,0.25),0_10px_24px_-6px_rgba(232,177,74,0.5)]'
                              : 'ring-1 ring-ivory-soft/15 hover:ring-brass/60 hover:scale-[1.02]'
                          }`}
                        >
                          <img
                            src={img}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          {isActive && (
                            <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-brass text-midnight-deep flex items-center justify-center shadow-md">
                              {isSaving ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Check size={12} />
                              )}
                            </span>
                          )}
                          {/* Tiny filename badge (last hash) */}
                          <span className="absolute bottom-1 left-1 right-1 font-sans text-[9px] tracking-[0.2em] uppercase text-ivory bg-midnight-deep/75 px-1 py-0.5 truncate">
                            {img.split('/').pop()?.split('.')[0]}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </main>
        </div>

        {/* Footer count */}
        <footer className="px-5 md:px-7 py-3 border-t border-ivory-soft/15 font-editorial italic text-xs text-ivory-soft flex items-center justify-between">
          <span>{AVAILABLE_VENDOR_IMAGES.length} photos · {Object.keys(overrides).length} substitution{Object.keys(overrides).length === 1 ? '' : 's'} active{Object.keys(overrides).length === 1 ? '' : 's'}</span>
          <span className="hidden md:inline">Esc · Fermer</span>
        </footer>
      </motion.div>
    </motion.div>
  );
};

export default VendorImagePicker;
