import React, { useState, useEffect } from 'react';

interface CorsImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export const CorsImage: React.FC<CorsImageProps> = ({ src, alt, className, ...props }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchImage = async () => {
      if (!src) return;

      // If it's already a data URL, use it directly
      if (src.startsWith('data:')) {
        if (isMounted) {
          setImageSrc(src);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setHasError(false);

      // Define strategies to fetch the image as a blob
      const strategies = [
        // Strategy 1: AllOrigins Proxy
        async () => {
          const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`);
          if (!res.ok) throw new Error('AllOrigins failed');
          return res.blob();
        },
        // Strategy 2: CorsProxy.io
        async () => {
           const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(src)}`);
           if (!res.ok) throw new Error('CorsProxy failed');
           return res.blob();
        },
        // Strategy 3: Direct fetch (works if origin allows CORS)
        async () => {
          const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
          if (!res.ok) throw new Error('Direct fetch failed');
          return res.blob();
        }
      ];

      let blob: Blob | null = null;

      // Try strategies sequentially
      for (const strategy of strategies) {
        try {
          blob = await strategy();
          if (blob) break; // Success
        } catch (e) {
          // Continue to next strategy
        }
      }

      if (isMounted) {
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (isMounted && typeof reader.result === 'string') {
              setImageSrc(reader.result);
              setIsLoading(false);
            }
          };
          reader.readAsDataURL(blob);
        } else {
          // Fallback: If all proxies fail, use original URL.
          // This ensures the user sees something, even if export might be compromised.
          console.warn('CorsImage: All loading strategies failed. Falling back to original URL.');
          setImageSrc(src);
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [src]);

  // While loading, maintain space with opacity 0 if className provides dimensions
  if (isLoading) {
      return <img src={src} alt={alt} className={`${className} opacity-0`} {...props} />;
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      // If we fell back to the original URL (hasError), we try crossOrigin="anonymous".
      // This is a "Hail Mary" for export; if the server rejects it, the image might break in preview,
      // but if the server allows it, export works. 
      crossOrigin={hasError ? "anonymous" : undefined}
      {...props}
    />
  );
};