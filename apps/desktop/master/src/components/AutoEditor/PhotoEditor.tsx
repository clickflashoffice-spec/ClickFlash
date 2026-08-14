import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Photo, ManualEdits } from '@clickflash/types';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { initialEdits } from '../../constants/photoConstants';
import { Maximize, RefreshCcw, Check, X, Zap, Loader2 } from 'lucide-react';
import { logger } from '../../utils/logger';
import { motion, AnimatePresence } from 'framer-motion';
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

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // If accepted, save the auto-edits as manual edits
      const editsToSave = accepted ? enhancedEdits : defaultEdits;
      await onSave(photo?.id, editsToSave, accepted);
      onClose();
    } catch (error) {
      logger.error('Failed to save auto-edits', error);
    } finally {
      setIsSaving(false);
    }
  }, [accepted, enhancedEdits, defaultEdits, onSave, photo?.id, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') handleSave();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleSave]);

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

          <AnimatePresence mode="wait">
            {hasAutoEdits ? (
              <motion.div
                key="slider"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full h-full p-8"
              >
                <BeforeAfterSlider
                  photo={photo}
                  beforeEdits={defaultEdits}
                  afterEdits={enhancedEdits}
                  zoom={zoom}
                  pan={pan}
                  className="w-full h-full"
                />
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center gap-6 relative z-10"
              >
                <div className="relative">
                  {/* Outer pulse ring when active */}
                  {isEnhancing && (
                    <motion.div 
                      animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0, 0] }} 
                      transition={{ duration: 2, repeat: Infinity }} 
                      className="absolute inset-0 rounded-full bg-blue-500/30"
                    />
                  )}
                  <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-full relative z-10 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                    <RefreshCcw className={`w-12 h-12 text-blue-500 ${isEnhancing ? 'animate-spin' : ''}`} />
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-medium text-slate-200">
                    {isEnhancing ? 'Running Offline Matrix Engine...' : 'No Auto-Edits Found'}
                  </h3>
                  <p className="text-sm text-slate-400 max-w-sm">
                    {isEnhancing 
                      ? 'Analyzing local tensors and adjusting color profiles. This might take a few seconds.' 
                      : 'Click the button below to process this image on your device using the matrix engine.'}
                  </p>
                </div>

                {!isEnhancing && (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRunOfflineEngine} 
                    className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-3 transition-all font-bold shadow-lg shadow-blue-500/20 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
                    <Zap className="w-5 h-5 relative z-10" />
                    <span className="relative z-10 tracking-wide">Run Engine Now</span>
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
        <div className="w-[340px] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
          <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Enhancement Status
            </h3>
            
            <AnimatePresence mode="wait">
              {hasAutoEdits ? (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-3 text-blue-400 font-bold mb-3 relative z-10">
                      <div className="p-1.5 bg-blue-500/20 rounded-lg">
                        <Check className="w-4 h-4" />
                      </div>
                      <span className="text-sm">AI Enhanced</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed relative z-10">
                      This photo was automatically color corrected and exposed optimally.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calculated Adjustments</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {localAutoEdits?.exposure !== undefined && (
                        <div className="bg-slate-800/50 border border-white/5 p-3 rounded-xl flex flex-col gap-1">
                          <span className="text-xs text-slate-400">Exposure</span>
                          <span className="text-sm font-medium text-slate-200">{localAutoEdits.exposure > 0 ? '+' : ''}{localAutoEdits.exposure.toFixed(2)}</span>
                        </div>
                      )}
                      {localAutoEdits?.contrast !== undefined && (
                        <div className="bg-slate-800/50 border border-white/5 p-3 rounded-xl flex flex-col gap-1">
                          <span className="text-xs text-slate-400">Contrast</span>
                          <span className="text-sm font-medium text-slate-200">{localAutoEdits.contrast > 0 ? '+' : ''}{localAutoEdits.contrast.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl"
                >
                  <p className="text-xs text-slate-500 leading-relaxed">Processing pending or skipped. Run the engine to see auto-edits.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-8 bg-slate-950/50 border-t border-white/5 backdrop-blur-xl space-y-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 border-2 border-slate-600 rounded bg-slate-800 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-colors flex items-center justify-center">
                  <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                </div>
              </div>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Apply Auto Enhancements</span>
            </label>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : 'Confirm & Close'}
              <span className="absolute right-4 text-[10px] text-blue-300/50 font-normal hidden sm:block">↵</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
