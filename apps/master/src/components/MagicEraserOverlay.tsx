import React, { useRef, useState, useEffect } from 'react';
import { Loader2, Check, X as XIcon, RotateCcw } from 'lucide-react';

interface MagicEraserOverlayProps {
  photoUrl: string;
  onApply: (maskBlob: Blob) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const MagicEraserOverlay: React.FC<MagicEraserOverlayProps> = ({
  photoUrl,
  onApply,
  onCancel,
  isProcessing
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  
  // Brush settings
  const brushSize = 40;

  useEffect(() => {
    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = 'rgba(255, 0, 0, 0.6)'; // Red semi-transparent for visibility
        setCtx(context);
      }
    }
  }, []);

  const handleImageLoad = () => {
    if (imageRef.current && canvasRef.current) {
      // Set canvas internal resolution to match image natural resolution
      canvasRef.current.width = imageRef.current.naturalWidth;
      canvasRef.current.height = imageRef.current.naturalHeight;
      
      // Re-apply context settings after resize
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        context.lineWidth = brushSize;
        setCtx(context);
      }
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current || !imageRef.current) return null;
    
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    // Calculate coordinates relative to canvas display size
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    const coords = getCoordinates(e);
    if (!coords || !ctx) return;
    
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !ctx || isProcessing) return;
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && ctx) {
      ctx.closePath();
      setIsDrawing(false);
    }
  };

  const handleClear = () => {
    if (canvasRef.current && ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleApply = () => {
    if (!canvasRef.current) return;
    
    // We need to create a black and white mask for the backend
    // Where painted areas are white (255) and everything else is black (0)
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvasRef.current.width;
    maskCanvas.height = canvasRef.current.height;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!maskCtx) return;
    
    // Fill with black
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Draw the strokes in white
    const originalCtx = canvasRef.current.getContext('2d');
    if (originalCtx) {
      const imageData = originalCtx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      const data = imageData.data;
      
      const maskImageData = maskCtx.createImageData(maskCanvas.width, maskCanvas.height);
      const maskData = maskImageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // If the pixel has any alpha (meaning it was drawn on)
        if (data[i + 3] > 0) {
          maskData[i] = 255;     // R
          maskData[i + 1] = 255; // G
          maskData[i + 2] = 255; // B
          maskData[i + 3] = 255; // A
        } else {
          maskData[i] = 0;
          maskData[i + 1] = 0;
          maskData[i + 2] = 0;
          maskData[i + 3] = 255;
        }
      }
      
      maskCtx.putImageData(maskImageData, 0, 0);
      
      maskCanvas.toBlob((blob) => {
        if (blob) onApply(blob);
      }, 'image/jpeg', 0.95);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
      <div className="relative max-w-full max-h-full flex flex-col items-center gap-4">
        
        {/* Header Controls */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-2 flex items-center gap-2 shadow-2xl">
          <button 
            onClick={onCancel}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            title="Cancel"
          >
            <XIcon className="w-5 h-5" />
          </button>
          
          <div className="h-6 w-px bg-white/10 mx-2"></div>
          
          <span className="text-xs font-bold text-white uppercase tracking-wider px-2">
            Magic Eraser
          </span>
          <span className="text-[10px] text-slate-400">
            Brush over objects to remove
          </span>
          
          <div className="h-6 w-px bg-white/10 mx-2"></div>
          
          <button 
            onClick={handleClear}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2"
            title="Clear Brush"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Clear</span>
          </button>
          
          <button 
            onClick={handleApply}
            disabled={isProcessing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all flex items-center gap-2 ml-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span className="text-xs font-bold uppercase tracking-wider">Apply</span>
          </button>
        </div>

        {/* Drawing Area */}
        <div 
          ref={containerRef}
          className={`relative rounded-lg overflow-hidden border-2 ${isProcessing ? 'border-white/10' : 'border-indigo-500/50'} shadow-2xl bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px]`}
          style={{ cursor: isProcessing ? 'default' : 'crosshair', touchAction: 'none', maxWidth: '100%', maxHeight: 'calc(100vh - 160px)' }}
        >
          {/* Base Image */}
          <img 
            ref={imageRef}
            src={photoUrl} 
            alt="Magic Eraser Base" 
            className="block max-w-full max-h-[calc(100vh-160px)] object-contain pointer-events-none"
            onLoad={handleImageLoad}
          />
          
          {/* Drawing Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain touch-none w-full h-full"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
          />
          
          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
              <span className="text-sm font-bold text-white tracking-widest uppercase">Removing Object...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
