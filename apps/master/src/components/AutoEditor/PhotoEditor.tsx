import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Photo, ManualEdits } from '@clickflash/types';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { initialEdits } from '../../constants/photoConstants';
import { Maximize, RefreshCcw, Check, X, Zap } from 'lucide-react';
import { logger } from '../../utils/logger';
import { imageProcessingService } from '../../services/imageProcessingService';

interface PhotoEditorProps {
  photo: Photo;
  isOpen: boolean;
  onClose: () => void;
  onSave: (photoId: string, edits: ManualEdits, autoEnhanced?: boolean) => Promise<void> | void;
}

export const PhotoEditor: React.FC<PhotoEditorProps> = ({
  photo,
  isOpen,
  onClose,
  onSave,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [localAutoEdits, setLocalAutoEdits] = useState<ManualEdits | null>(photo.autoEdits || null);
  
  // The edits to apply if the user accepts the auto-edits
  const defaultEdits = photo.manualEdits || initialEdits;
  const enhancedEdits = localAutoEdits 
    ? { ...defaultEdits, ...localAutoEdits }
    : defaultEdits;

  // Track if we're showing the "After" preview as the accepted state
  const [accepted, setAccepted] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  
  // Image Space hook logic adapted for this simple viewer
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || zoom > 1) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoom((prev) => Math.max(1, Math.min(4, prev + delta)));
    }
  }, [zoom]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setAccepted(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // If accepted, save the auto-edits as manual edits
      const editsToSave = accepted ? enhancedEdits : defaultEdits;
      await onSave(photo.id, editsToSave, accepted);
      onClose();
    } catch (error) {
      logger.error('Failed to save auto-edits', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !photo) return null;

  const hasAutoEdits = !!localAutoEdits;

  const handleRunOfflineEngine = async () => {
    setIsEnhancing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = photo.url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = await imageProcessingService.autoEnhanceAsync(imageData);
      setLocalAutoEdits(result.adjustments as unknown as ManualEdits);
      setAccepted(true);
    } catch (e) {
      logger.error('Failed offline enhance', e);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 h-16 bg-slate-900 border-b border-white/5 z-50">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black tracking-widest uppercase text-slate-300">
            Auto Enhance Review
          </h2>
          <div className="h-4 w-px bg-white/20"></div>
          <span className="text-xs text-slate-400">
            {photo.title || photo.originalFilename || 'Untitled'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div 
          className="flex-1 relative bg-black flex items-center justify-center overflow-hidden"
          ref={viewerRef}
          onWheel={handleWheel}
        >
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>

          {hasAutoEdits ? (
            <BeforeAfterSlider
              photo={photo}
              beforeEdits={defaultEdits}
              afterEdits={enhancedEdits}
              zoom={zoom}
              pan={pan}
              className="w-full h-full p-8"
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-slate-500 flex flex-col items-center">
                <RefreshCcw className={`w-12 h-12 mb-4 opacity-50 ${isEnhancing ? 'animate-spin' : ''}`} />
                <p>{isEnhancing ? 'Running Offline Matrix Engine...' : 'No auto-edits available for this photo.'}</p>
                {!isEnhancing && (
                  <button onClick={handleRunOfflineEngine} className="mt-4 px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg flex items-center gap-2 transition-colors border border-blue-500/30">
                    <Zap className="w-4 h-4" />
                    Run Engine Now
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="absolute bottom-8 right-8 flex items-center gap-2 bg-slate-900/80 backdrop-blur rounded-xl p-2 border border-white/10">
            <span className="text-[10px] font-mono font-bold px-2">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => { setZoom(1); setPan({x: 0, y: 0}); }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-900 border-l border-white/5 flex flex-col">
          <div className="p-6 flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-slate-300">
              Enhancement Status
            </h3>
            
            {hasAutoEdits ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                    <Check className="w-4 h-4" />
                    <span>AI Enhanced</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    This photo was automatically color corrected and exposed optimally.
                  </p>
                </div>
                
                <div className="space-y-2 mt-6">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">Adjustments</h4>
                  <ul className="text-xs space-y-1 text-slate-300">
                    {localAutoEdits?.exposure !== undefined && <li>Exposure: {localAutoEdits.exposure.toFixed(2)}</li>}
                    {localAutoEdits?.contrast !== undefined && <li>Contrast: {localAutoEdits.contrast.toFixed(2)}</li>}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Processing pending or skipped.</p>
            )}
          </div>

          <div className="p-6 bg-black/40 border-t border-white/5 space-y-3">
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input 
                type="checkbox" 
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <span className="text-sm">Apply Auto Enhancements</span>
            </label>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Confirm & Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
