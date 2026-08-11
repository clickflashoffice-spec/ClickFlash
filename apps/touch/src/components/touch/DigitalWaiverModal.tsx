import React, { memo, useRef, useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (dataUrl: string) => void;
}

export const DigitalWaiverModal: React.FC<Props> = memo(({
  isOpen,
  onClose,
  onAccept
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear canvas on open
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setHasSignature(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
      // Prevent scrolling
      e.preventDefault();
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
      e.preventDefault(); // Prevent scrolling
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleAccept = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    onAccept(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <div className="relative w-full max-w-3xl rounded-3xl bg-neutral-900 border border-neutral-800 p-8 shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Digital Waiver & Photo Release</h2>
          <p className="text-neutral-400 mt-2 text-sm">
            Please read and sign the terms and conditions below.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-4 mb-6 custom-scrollbar text-sm text-neutral-300 space-y-4 bg-neutral-950 p-6 rounded-xl border border-neutral-800">
          <p>
            <strong>1. Photo Usage Rights:</strong> I hereby grant ClickFlash Photography and its affiliates the absolute right and permission to use my photographic portraits or pictures for commercial, promotional, and marketing purposes.
          </p>
          <p>
            <strong>2. GDPR Privacy Consent:</strong> I consent to the collection, processing, and storage of my personal data (including digital images) in accordance with the General Data Protection Regulation (GDPR). I understand that my data will be securely stored and used solely for the purposes of providing the requested services.
          </p>
          <p>
            <strong>3. Liability Waiver:</strong> I release and discharge ClickFlash Photography from any and all claims and demands arising out of or in connection with the use of the photographs, including without limitation any and all claims for libel or violation of any right of publicity or privacy.
          </p>
          <p>
            <strong>4. Age Certification:</strong> By signing below, I certify that I am at least 18 years of age, or if under 18, that I am the parent or legal guardian of the participant and have the legal authority to execute this release on their behalf.
          </p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
              Please sign below
            </label>
            <button
              onClick={clearCanvas}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wider font-semibold"
            >
              Clear Signature
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border-2 border-neutral-700 bg-white">
            <canvas
              ref={canvasRef}
              width={800}
              height={200}
              className="w-full h-[200px] touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors border border-neutral-700"
          >
            Decline & Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!hasSignature}
            className="flex-1 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-950 font-bold transition-colors shadow-lg"
          >
            I Accept
          </button>
        </div>
        
      </div>
    </div>
  );
});

DigitalWaiverModal.displayName = 'DigitalWaiverModal';
