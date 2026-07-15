import React, { useRef, useEffect, useState } from 'react';
import { Photo } from '@/types';
import { logger } from '@/utils/logger';

interface MagicShotRendererProps {
  photo: Photo;
  overlayUrl?: string; // Foreground PNG (e.g., Pirate Hat, Frame)
  backgroundUrl?: string; // Background for green screen replacement
  isGreenScreen?: boolean;
  onRenderComplete?: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

export const MagicShotRenderer: React.FC<MagicShotRendererProps> = ({
  photo,
  overlayUrl,
  backgroundUrl,
  isGreenScreen = false,
  onRenderComplete,
  width = 800,
  height = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const renderMagicShot = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      setIsProcessing(true);
      
      try {
        // Load the main photo
        const mainImg = await loadImage(photo.url);
        
        // Draw background first if green screen
        if (isGreenScreen && backgroundUrl) {
          const bgImg = await loadImage(backgroundUrl);
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
          
          // Draw main photo with chroma key
          drawChromaKey(ctx, mainImg, canvas.width, canvas.height);
        } else {
          // Normal draw
          ctx.drawImage(mainImg, 0, 0, canvas.width, canvas.height);
        }

        // Draw overlay if exists
        if (overlayUrl) {
          const overlayImg = await loadImage(overlayUrl);
          ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
        }

        if (onRenderComplete) {
          onRenderComplete(canvas.toDataURL('image/jpeg', 0.9));
        }

      } catch (error) {
        logger.error('[MagicShotRenderer] Failed to render Magic Shot', error);
      } finally {
        setIsProcessing(false);
      }
    };

    renderMagicShot();
  }, [photo.url, overlayUrl, backgroundUrl, isGreenScreen]);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const drawChromaKey = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) => {
    // Create a temporary canvas for the foreground image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(img, 0, 0, w, h);
    
    // Get image data
    const frame = tempCtx.getImageData(0, 0, w, h);
    const length = frame.data.length;

    // Simple Green Screen removal logic (Chroma Key)
    // Looking for pixels with high green values compared to red and blue
    for (let i = 0; i < length; i += 4) {
      const r = frame.data[i];
      const g = frame.data[i + 1];
      const b = frame.data[i + 2];

      // Very basic threshold for "green"
      if (g > 100 && g > r * 1.4 && g > b * 1.4) {
        frame.data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    tempCtx.putImageData(frame, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0, w, h);
  };

  return (
    <div className="relative inline-block rounded-xl overflow-hidden shadow-2xl bg-gray-900">
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        className="w-full h-auto object-contain"
      />
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
};

export default MagicShotRenderer;
