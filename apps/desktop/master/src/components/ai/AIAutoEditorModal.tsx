import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService, EditParams } from '../../services/geminiService';
import { X, Sparkles, Wand2, Check } from 'lucide-react';
import { Button, Spinner } from '@clickflash/ui';

interface AIAutoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  onSave?: (editedUrl: string, params: EditParams) => void;
}

export const AIAutoEditorModal: React.FC<AIAutoEditorModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  onSave
}) => {
  const [params, setParams] = useState<EditParams>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpness: 0,
    temperature: 0,
    tint: 0
  });

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [editedPhotoUrl, setEditedPhotoUrl] = useState<string>(photoUrl);
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const applyEditsToSharp = async (currentParams: EditParams) => {
    if (typeof window !== 'undefined' && (window as any).electron?.invoke) {
      try {
        const result = await (window as any).electron.invoke('photo:applyEdits', {
          photoUrl,
          params: currentParams
        });
        if (result && result.editedUrl) {
          setEditedPhotoUrl(result.editedUrl);
        }
      } catch (err) {
        console.error('Failed to apply edits:', err);
      }
    }
  };

  const handleEnhance = async () => {
    setIsEnhancing(true);
    try {
      const recommendedParams = await geminiService.autoEnhance(photoUrl);
      setParams(recommendedParams);
      await applyEditsToSharp(recommendedParams);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleRemoveBackground = async () => {
    setIsRemovingBg(true);
    try {
      if (typeof window !== 'undefined' && (window as any).electron?.invoke) {
        const result = await (window as any).electron.invoke('ai:remove-background', { photoUrl });
        if (result && result.url) {
          setEditedPhotoUrl(result.url);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleSliderChange = (paramName: keyof EditParams, value: number) => {
    const newParams = { ...params, [paramName]: value };
    setParams(newParams);
    // Debounce this in a real app, calling sharp immediately for demo purposes
    applyEditsToSharp(newParams);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    
    // Only drag if mouse is down
    if (e.type === 'mousemove' && (e as React.MouseEvent).buttons !== 1) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedPhotoUrl, params);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex text-white"
      >
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative h-full">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold text-lg">AI Auto Editor</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-slate-300 hover:text-white" />
            </button>
          </div>

          <div className="flex-1 p-6 flex items-center justify-center overflow-hidden bg-slate-900/50">
            <div 
              ref={containerRef}
              className="relative w-full max-w-5xl aspect-[3/2] bg-slate-800 rounded-xl overflow-hidden cursor-ew-resize shadow-2xl"
              onMouseMove={handleMouseMove}
              onTouchMove={handleMouseMove}
            >
              {/* After Image (Base layer) */}
              <img 
                src={editedPhotoUrl} 
                alt="After edits" 
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              />
              
              {/* Before Image (Top layer, clipped) */}
              <div 
                className="absolute inset-0 overflow-hidden pointer-events-none select-none"
                style={{ width: `${sliderPosition}%` }}
              >
                <img 
                  src={photoUrl} 
                  alt="Before edits" 
                  className="absolute inset-0 w-full h-full object-contain max-w-none"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              {/* Slider Handle */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <div className="flex space-x-1">
                    <div className="w-0.5 h-3 bg-slate-400 rounded-full" />
                    <div className="w-0.5 h-3 bg-slate-400 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-80 bg-slate-900 border-l border-white/10 flex flex-col h-full shadow-2xl">
          <div className="p-4 border-b border-white/10 space-y-3">
            <Button 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0 flex items-center justify-center space-x-2"
              onClick={handleEnhance}
              disabled={isEnhancing}
            >
              {isEnhancing ? <Spinner className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              <span>{isEnhancing ? 'Enhancing...' : 'Auto Enhance'}</span>
            </Button>
            <Button 
              variant="outline"
              className="w-full flex items-center justify-center space-x-2 border-slate-700 hover:bg-slate-800"
              onClick={handleRemoveBackground}
              disabled={isRemovingBg}
            >
              {isRemovingBg ? <Spinner className="w-4 h-4 mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
              <span>{isRemovingBg ? 'Removing...' : 'Remove Background'}</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {Object.entries(params).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <label className="capitalize text-slate-300">{key}</label>
                  <span className="text-slate-400 font-mono">{(value as number) > 0 ? `+${value}` : String(value)}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={value as number}
                  onChange={(e) => handleSliderChange(key as keyof EditParams, parseInt(e.target.value))}
                  className="w-full accent-blue-500 bg-slate-700 h-1 rounded-full appearance-none cursor-pointer"
                />
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/10">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center space-x-2"
              onClick={handleSave}
            >
              <Check className="w-4 h-4 mr-2" />
              <span>Save & Export</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIAutoEditorModal;
