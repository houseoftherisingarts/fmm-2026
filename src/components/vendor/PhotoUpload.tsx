import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, X, ImageOff } from 'lucide-react';
import { uploadVendorMedia, type VendorMediaKind } from '../../firebase/vendorMedia';

interface Props {
  uid: string;
  kind: VendorMediaKind;
  value?: string;                                       // existing download URL
  onUploaded: (url: string) => void;
  onClear?: () => void;
  accept?: string;                                      // mime list
  hint?: string;
  label: string;
  // Visual: 'logo' uses transparent-friendly checkerboard, 'photo' uses a wide hero crop.
  variant?: 'logo' | 'photo';
}

const PhotoUpload: React.FC<Props> = ({
  uid, kind, value, onUploaded, onClear,
  accept = 'image/*', hint, label, variant = 'photo',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const aspect   = variant === 'logo' ? 'aspect-square' : 'aspect-[16/10]';
  const checker  = variant === 'logo' ? styles.checker : undefined;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) { setError('Image only.'); return; }
    setBusy(true); setProgress(0);
    try {
      const { promise } = uploadVendorMedia(uid, kind, file, (p) => setProgress(p.percent));
      const url = await promise;
      onUploaded(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <p className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">
        {label}<span className="text-blush ml-0.5">*</span>
      </p>

      <motion.div
        whileHover={!busy ? { y: -2 } : undefined}
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative ${aspect} w-full rounded-card border-2 border-dashed cursor-pointer overflow-hidden transition-colors ${
          dragOver
            ? 'border-amber-300 bg-amber-300/10'
            : value
            ? 'border-brass/50 bg-midnight-deep/50'
            : 'border-ivory-soft/25 bg-midnight-deep/40 hover:border-brass/60'
        }`}
        style={checker}
      >
        {/* Existing image preview */}
        {value && !busy && (
          <img
            src={value}
            alt={label}
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}

        {/* Empty / call-to-action */}
        {!value && !busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 gap-2 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center">
              <Upload size={20} className="text-brass" />
            </div>
            <p className="font-sans text-xs uppercase tracking-widest text-ivory-soft">
              {dragOver ? 'Déposez ici' : 'Cliquez ou déposez un fichier'}
            </p>
          </div>
        )}

        {/* Upload progress overlay */}
        <AnimatePresence>
          {busy && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 /85 flex flex-col items-center justify-center gap-2"
            >
              <div className="w-32 h-1 rounded-full bg-ivory-soft/15 overflow-hidden">
                <motion.div
                  className="h-full bg-brass"
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <p className="font-sans text-xs uppercase tracking-widest text-ivory-soft tabular-nums">
                {Math.round(progress * 100)}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Done corner badge */}
        {value && !busy && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-emerald-500/90 border border-emerald-300 text-midnight-deep flex items-center justify-center shadow">
            <Check size={14} />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </motion.div>

      <div className="flex items-start justify-between gap-3 mt-1.5">
        <p className="font-editorial italic text-xs text-stone leading-snug">{hint}</p>
        {value && !busy && onClear && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="font-sans text-[10px] uppercase tracking-widest text-blush hover:text-blush/70 inline-flex items-center gap-1 shrink-0"
          >
            <X size={10} /> Retirer
          </button>
        )}
      </div>

      {error && (
        <p data-field-error="true" className="font-editorial italic text-xs text-blush mt-1.5 flex items-center gap-1.5">
          <ImageOff size={12} /> {error}
        </p>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  checker: {
    backgroundImage:
      'linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.05) 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
  },
};

export default PhotoUpload;
