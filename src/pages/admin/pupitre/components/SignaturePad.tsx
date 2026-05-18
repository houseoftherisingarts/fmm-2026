import React, { useRef, useEffect, useState } from 'react';
import { Eraser } from 'lucide-react';

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

  const containerClasses = variant === 'paper' 
    ? "bg-transparent border-2 border-dashed border-gold-600/20 hover:border-gold-600/40 rounded-lg signature-paper" 
    : "glass-input rounded-xl hover:border-gold-500/40";

  return (
    <div className="relative w-full h-full group">
      <div className={`relative w-full h-full overflow-hidden transition-colors ${containerClasses}`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
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
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none font-display text-sm tracking-widest uppercase
            ${variant === 'paper' ? 'text-dark-900/30' : 'text-neutral-600 opacity-50'}
          `}>
             ~ {label} ~
          </div>
        )}

        {/* Clear Button - data-html2canvas-ignore prevents it from appearing in PDF */}
        <div 
          className={`absolute top-2 right-2 transition-opacity duration-200 ${hasSignature ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          data-html2canvas-ignore="true"
        >
          <button 
            onClick={clear}
            className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full
              ${variant === 'paper' 
                ? 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200' 
                : 'text-gold-500 hover:text-gold-300'}
            `}
            title={clearLabel}
          >
            <Eraser size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};