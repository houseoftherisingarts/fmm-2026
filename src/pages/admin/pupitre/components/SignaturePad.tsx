import React, { useRef, useEffect, useState } from 'react';
import { Eraser } from 'lucide-react';

// Le carré où l'on signe, à la souris ou au doigt.
//
// Deux variantes : `paper`, posée sur la feuille du Pupitre et sur
// l'atelier de signature de la régie, et `glass`, sur fond sombre.
// Rien ici ne dépend de la feuille du Pupitre : l'atelier de signature
// importe ce composant sans jamais charger pupitre.css, donc le curseur
// en plume et les couleurs sont posés en ligne plutôt que par une
// classe scopée sous `.pupitre-root`.

// Curseur en plume, encodé une fois.
const PLUME = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23000000\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 19l7-7 3 3-7 7-3-3z\"></path><path d=\"M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z\"></path><path d=\"M2 2l7.586 7.586\"></path><circle cx=\"11\" cy=\"11\" r=\"2\"></circle></svg>') 0 24, crosshair";

const LAITON = '#B08D3A';

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  label?: string;
  clearLabel: string;
  variant?: 'glass' | 'paper';
  initialImage?: string | null;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ 
  onChange, 
  label, 
  clearLabel, 
  variant = 'glass',
  initialImage
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialImage);

  // Re-draw initial image if provided (for restoring state)
  useEffect(() => {
    if (initialImage && canvasRef.current) {
       const ctx = canvasRef.current.getContext('2d');
       if (ctx) {
         ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
         const img = new Image();
         img.src = initialImage;
         img.onload = () => {
           ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
         };
       }
    }
  }, [initialImage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set resolution based on display size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Different ink color based on variant
        ctx.strokeStyle = variant === 'paper' ? '#0f0f0f' : '#ffffff';
        ctx.lineWidth = 2.5; // Slightly thicker for better visibility
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Restore image if canvas was reset by size change
        if (initialImage) {
           const img = new Image();
           img.src = initialImage;
           img.onload = () => {
             ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
           };
        }
      }
    }
  }, [variant]);

  // Calculate position accounting for CSS transforms on parent elements
  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // getBoundingClientRect returns the size *after* scaling transforms are applied
    const rect = canvas.getBoundingClientRect();
    
    // Scale factors between internal canvas pixels and visual screen pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); 
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    const { x, y } = getPos(e.nativeEvent);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    const { x, y } = getPos(e.nativeEvent);
    ctx?.lineTo(x, y);
    ctx?.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (canvasRef.current) {
        onChange(canvasRef.current.toDataURL());
      }
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onChange(null);
      setHasSignature(false);
    }
  };

  // Sur la feuille, l'aire de signature n'est pas une boîte en pointillé
  // (ça se voit à l'impression et ça n'existe sur aucun document réel) :
  // c'est un creux de papier fermé par deux ticks de laiton, comme les
  // équerres du cadre. Sur fond sombre, on garde le champ de la régie.
  const styleConteneur: React.CSSProperties = variant === 'paper'
    ? {
        // Aucun fond : sur un document officiel, un rectangle teinté
        // s'imprime et se voit. Il ne reste qu'une ligne de laiton et
        // ses deux ticks, c'est-à-dire une ligne de signature.
        background: 'transparent',
        borderBottom: `1px solid ${LAITON}`,
      }
    : {
        background: 'rgba(4, 8, 12, 0.62)',
        border: '1px solid var(--admin-line-soft)',
        borderRadius: 10,
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.5)',
      };

  return (
    <div className="relative w-full h-full group">
      <div className="relative w-full h-full overflow-hidden transition-colors" style={styleConteneur}>
        {variant === 'paper' && (
          <>
            <span
              aria-hidden
              className="absolute bottom-0 left-0 pointer-events-none"
              style={{ width: 10, height: 10, borderLeft: `1.5px solid ${LAITON}`, borderBottom: `1.5px solid ${LAITON}` }}
            />
            <span
              aria-hidden
              className="absolute bottom-0 right-0 pointer-events-none"
              style={{ width: 10, height: 10, borderRight: `1.5px solid ${LAITON}`, borderBottom: `1.5px solid ${LAITON}` }}
            />
          </>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
          style={{ cursor: variant === 'paper' ? PLUME : 'crosshair' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {/* Placeholder text */}
        {!hasSignature && label && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none uppercase"
            style={{
              fontFamily: 'var(--font-display-alt)',
              fontSize: 13,
              letterSpacing: '0.3em',
              color: variant === 'paper' ? 'rgba(58, 50, 38, 0.35)' : 'var(--admin-text-mute)',
            }}
          >
            {label}
          </div>
        )}

        {/* Clear Button - data-html2canvas-ignore prevents it from appearing in PDF */}
        <div 
          className={`absolute top-2 right-2 transition-opacity duration-200 ${hasSignature ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          data-html2canvas-ignore="true"
        >
          <button
            type="button"
            onClick={clear}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
            style={variant === 'paper'
              ? { background: 'rgba(176, 141, 58, 0.14)', color: '#6B4A12', border: `1px solid ${LAITON}` }
              : { background: 'rgba(196, 214, 230, 0.06)', color: 'var(--admin-text-soft)', border: '1px solid var(--admin-line)' }}
            title={clearLabel}
            aria-label={clearLabel}
          >
            <Eraser size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};