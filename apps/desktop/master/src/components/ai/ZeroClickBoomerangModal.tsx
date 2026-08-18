import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Film, Play, Save, Repeat } from 'lucide-react';
import { Button, Spinner } from '@clickflash/ui';

interface ZeroClickBoomerangModalProps {
  isOpen: boolean;
  onClose: () => void;
  burstPhotos: string[]; // URLs of the burst sequence
  onSave?: (videoUrl: string) => void;
}

export const ZeroClickBoomerangModal: React.FC<ZeroClickBoomerangModalProps> = ({
  isOpen,
  onClose,
  burstPhotos,
  onSave
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [filter, setFilter] = useState<'none' | 'vintage' | 'punchy' | 'bw'>('none');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-stitch simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && burstPhotos.length > 0) {
      const baseDelay = 100; // ms per frame
      const delay = baseDelay / speed;
      
      let forward = true;
      interval = setInterval(() => {
        setCurrentFrame(prev => {
          if (forward) {
            if (prev >= burstPhotos.length - 1) {
              forward = false;
              return prev - 1;
            }
            return prev + 1;
          } else {
            if (prev <= 0) {
              forward = true;
              return prev + 1;
            }
            return prev - 1;
          }
        });
      }, delay);
    }
    return () => clearInterval(interval);
  }, [isPlaying, burstPhotos.length, speed]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate generation delay
    setTimeout(() => {
      setIsGenerating(false);
      if (onSave) {
        onSave('generated-boomerang-url.mp4'); // Mock save
      }
      onClose();
    }, 2000);
  };

  const getFilterClass = () => {
    switch (filter) {
      case 'vintage': return 'sepia-[0.5] contrast-[0.9]';
      case 'punchy': return 'saturate-[1.5] contrast-[1.2]';
      case 'bw': return 'grayscale';
      default: return '';
    }
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
              <Repeat className="w-5 h-5 text-pink-400" />
              <h2 className="font-semibold text-lg">Zero-Click Boomerang Generator</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-slate-300 hover:text-white" />
            </button>
          </div>

          <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-hidden bg-slate-900/50">
            {burstPhotos.length === 0 ? (
              <div className="text-slate-400 flex flex-col items-center">
                <Film className="w-12 h-12 mb-4 opacity-50" />
                <p>No burst photos selected.</p>
              </div>
            ) : (
              <div className="relative w-full max-w-4xl aspect-video bg-slate-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
                <img 
                  src={burstPhotos[currentFrame]} 
                  alt="Boomerang frame" 
                  className={`w-full h-full object-contain transition-all duration-75 ${getFilterClass()}`}
                />
              </div>
            )}
            
            {burstPhotos.length > 0 && (
              <div className="mt-6 flex space-x-4">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
                >
                  {isPlaying ? <span className="block w-4 h-4 bg-white rounded-sm" /> : <Play className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-80 bg-slate-900 border-l border-white/10 flex flex-col h-full shadow-2xl">
          <div className="p-4 border-b border-white/10 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">Bounce Speed</h3>
              <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg">
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s as any)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                      speed === s 
                        ? 'bg-pink-500 text-white shadow' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-white/10 space-y-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Video Filters</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'none', label: 'Original' },
                { id: 'vintage', label: 'Vintage' },
                { id: 'punchy', label: 'Punchy' },
                { id: 'bw', label: 'B & W' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`py-2 px-3 text-sm rounded-lg border transition ${
                    filter === f.id
                      ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-4 border-t border-white/10">
            <Button 
              className="w-full bg-pink-600 hover:bg-pink-500 flex items-center justify-center space-x-2"
              onClick={handleGenerate}
              disabled={isGenerating || burstPhotos.length === 0}
            >
              {isGenerating ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              <span>{isGenerating ? 'Stitching...' : 'Save Boomerang'}</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZeroClickBoomerangModal;
