import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cloud, Sunset, Moon, Sun, CloudLightning, Check } from 'lucide-react';
import { Button } from '@clickflash/ui';

interface AISkyReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  onSave?: (editedUrl: string, params: SkyParams) => void;
}

export interface SkyParams {
  preset: string;
  skyOpacity: number;
  horizonBlend: number;
  warmLighting: number;
}

const SKY_PRESETS = [
  { id: 'azure', name: 'Clear Azure', icon: Sun },
  { id: 'sunset', name: 'Dramatic Sunset', icon: Sunset },
  { id: 'golden', name: 'Golden Hour', icon: Sun },
  { id: 'stars', name: 'Twilight Stars', icon: Moon },
  { id: 'stormy', name: 'Stormy Cinematic', icon: CloudLightning }
];

export const AISkyReplacementModal: React.FC<AISkyReplacementModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  onSave
}) => {
  const [params, setParams] = useState<SkyParams>({
    preset: 'azure',
    skyOpacity: 100,
    horizonBlend: 50,
    warmLighting: 20
  });

  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSliderChange = (paramName: keyof SkyParams, value: number | string) => {
    setParams(prev => ({ ...prev, [paramName]: value }));
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    
    if (e.type === 'mousemove' && (e as React.MouseEvent).buttons !== 1) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(photoUrl, params); // In a real app, pass the processed URL
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
              <Cloud className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold text-lg">AI Sky Replacement</h2>
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
              {/* Simulated processed image */}
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <img 
                  src={photoUrl} 
                  alt="Sky replaced" 
                  className={`absolute inset-0 w-full h-full object-contain pointer-events-none select-none filter ${params.preset === 'sunset' ? 'sepia-[0.3]' : ''}`}
                />
              </div>
              
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
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Sky Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {SKY_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isActive = params.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSliderChange('preset', preset.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                      isActive 
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <Icon className="w-6 h-6 mb-2" />
                    <span className="text-xs text-center">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-slate-300">Sky Opacity</label>
                <span className="text-slate-400 font-mono">{params.skyOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={params.skyOpacity}
                onChange={(e) => handleSliderChange('skyOpacity', parseInt(e.target.value))}
                className="w-full accent-blue-500 bg-slate-700 h-1 rounded-full appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-slate-300">Horizon Blend</label>
                <span className="text-slate-400 font-mono">{params.horizonBlend}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={params.horizonBlend}
                onChange={(e) => handleSliderChange('horizonBlend', parseInt(e.target.value))}
                className="w-full accent-blue-500 bg-slate-700 h-1 rounded-full appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-slate-300">Warm Lighting</label>
                <span className="text-slate-400 font-mono">{params.warmLighting}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={params.warmLighting}
                onChange={(e) => handleSliderChange('warmLighting', parseInt(e.target.value))}
                className="w-full accent-blue-500 bg-slate-700 h-1 rounded-full appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="p-4 border-t border-white/10">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center space-x-2"
              onClick={handleSave}
            >
              <Check className="w-4 h-4 mr-2" />
              <span>Apply & Export</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AISkyReplacementModal;
