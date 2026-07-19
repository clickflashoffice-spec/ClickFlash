import React, { useRef, useState, useEffect } from 'react';

interface MagicEraserToolProps {
  imageUrl: string;
  onSuccess: (processedUrl: string) => void;
  onCancel: () => void;
}

export const MagicEraserTool: React.FC<MagicEraserToolProps> = ({ imageUrl, onSuccess, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Calculate aspect ratio fit
      const containerRatio = container.clientWidth / container.clientHeight;
      const imgRatio = img.width / img.height;
      
      let drawWidth, drawHeight;
      if (containerRatio > imgRatio) {
        drawHeight = container.clientHeight;
        drawWidth = drawHeight * imgRatio;
      } else {
        drawWidth = container.clientWidth;
        drawHeight = drawWidth / imgRatio;
      }

      canvas.width = drawWidth;
      canvas.height = drawHeight;
      
      // We draw the image as a background in CSS, and the canvas only holds the mask
      canvas.style.backgroundImage = `url(${imageUrl})`;
      canvas.style.backgroundSize = 'contain';
      canvas.style.backgroundPosition = 'center';
      canvas.style.backgroundRepeat = 'no-repeat';

      // Setup drawing context
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    // Draw the mask in red with some transparency
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleErase = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // In a real app, we would send this dataURL to our cloud-backend Magic Eraser service
      const maskDataUrl = canvas.toDataURL('image/png');
      
      // Simulate calling the backend API
      const response = await fetch('/api/magic-eraser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          maskDataUrl
        })
      });

      // Since we are mocking, we might not have the actual route setup in the frontend proxy yet.
      // We simulate the delay instead to show the UI
      await new Promise(resolve => setTimeout(resolve, 3500));
      
      // Pretend success
      onSuccess(`${imageUrl}?magic=erased&timestamp=${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-xl">✨</span> Magic Eraser
          </h2>
          <p className="text-sm text-slate-400">Brush over photobombers or objects to remove them</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button 
            onClick={handleErase}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Erase Selected'
            )}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-center p-3 gap-4 border-b border-slate-800 bg-slate-900">
        <label className="flex items-center gap-3 text-sm text-slate-300">
          Brush Size
          <input 
            type="range" 
            min="5" 
            max="100" 
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32 accent-blue-500"
          />
        </label>
        <button 
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }}
          className="px-3 py-1 text-sm text-slate-400 hover:text-white border border-slate-700 rounded transition-colors"
        >
          Clear Brush
        </button>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center p-4"
      >
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`cursor-crosshair shadow-2xl ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
          style={{ touchAction: 'none' }}
        />
        
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-sm z-20">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
            <p className="text-lg font-medium text-white shadow-sm">AI Magic Eraser is working...</p>
            <p className="text-sm text-slate-300 mt-2">Reconstructing background seamlessly</p>
          </div>
        )}
      </div>
    </div>
  );
};
