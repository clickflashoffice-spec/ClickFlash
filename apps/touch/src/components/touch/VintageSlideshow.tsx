import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { applyVintageFilterToCanvas, VintageFilterOptions } from '../../utils/vintageFilter';
import { logger } from '../../utils/logger';

interface PhotoItem {
  id: string;
  url: string;
  title?: string;
}

interface Props {
  photos: PhotoItem[];
  onCaptureRequest: (filterMode: VintageFilterOptions['mode']) => void;
  onExitMode: () => void;
}

export const VintageSlideshow: React.FC<Props> = memo(({ photos, onCaptureRequest, onExitMode }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [filterMode, setFilterMode] = useState<VintageFilterOptions['mode']>('fotio_studio');
  const [filteredUrl, setFilteredUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Rotate slideshow every 6 seconds if not counting down
  useEffect(() => {
    if (countdown !== null || photos.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [photos.length, countdown]);

  // Apply filter whenever current photo or filter mode changes
  useEffect(() => {
    if (photos.length === 0) {
      setFilteredUrl(null);
      return;
    }
    const currentPhoto = photos[currentIndex];
    if (!currentPhoto) return;

    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const resultUrl = await applyVintageFilterToCanvas(img, {
          mode: filterMode,
          grainIntensity: 0.18,
          vignetteStrength: 0.45,
        });
        setFilteredUrl(resultUrl);
      } catch (err) {
        logger.error('[VintageSlideshow] Filter processing failed, falling back to original URL', err);
        setFilteredUrl(currentPhoto.url);
      } finally {
        setIsProcessing(false);
      }
    };
    img.onerror = () => {
      setFilteredUrl(currentPhoto.url);
      setIsProcessing(false);
    };
    img.src = currentPhoto.url;
  }, [currentIndex, photos, filterMode]);

  // Trigger countdown then capture
  const handleStartCapture = useCallback(() => {
    if (countdown !== null) return;
    logger.info(`[VintageSlideshow] Starting capture sequence in mode: ${filterMode}`);
    setCountdown(3);
  }, [countdown, filterMode]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      onCaptureRequest(filterMode);
      setCountdown(null);
    }
  }, [countdown, onCaptureRequest, filterMode]);

  const handleModeChange = useCallback((mode: VintageFilterOptions['mode']) => {
    setFilterMode(mode);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-6 select-none overflow-hidden font-sans">
      {/* Top Bar / Mode Selector */}
      <div className="flex justify-between items-center z-10 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="flex items-center space-x-3">
          <span className="text-2xl font-serif font-bold tracking-wider text-amber-100 uppercase">
            FOTIO STUDIO VINTAGE
          </span>
          <span className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/40 font-mono">
            B&W BOOTH
          </span>
        </div>

        <div className="flex space-x-2">
          {(['fotio_studio', 'high_contrast_bw', 'classic_bw', 'sepia_film'] as VintageFilterOptions['mode'][]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filterMode === mode
                  ? 'bg-amber-100 text-black shadow-lg shadow-amber-100/20 scale-105 font-bold'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {mode.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={onExitMode}
          className="px-5 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 rounded-xl text-sm font-semibold transition-all"
        >
          Exit Booth
        </button>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 flex items-center justify-center relative my-4 overflow-hidden rounded-3xl border-2 border-white/10 shadow-2xl bg-neutral-950">
        {countdown !== null ? (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-lg flex flex-col items-center justify-center animate-fade-in">
            <span className="text-9xl font-serif font-extrabold text-amber-100 animate-pulse scale-150 transition-all">
              {countdown > 0 ? countdown : 'SMILE!'}
            </span>
            <p className="mt-8 text-2xl font-light text-neutral-300 tracking-widest uppercase">
              Get ready for your classical {filterMode.replace('_', ' ')} portrait
            </p>
          </div>
        ) : null}

        {isProcessing && !filteredUrl ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="w-12 h-12 border-4 border-amber-100 border-t-transparent rounded-full animate-spin" />
            <span className="text-neutral-400 text-sm tracking-wider uppercase font-mono">
              Rendering Vintage Silver Halide Tone...
            </span>
          </div>
        ) : filteredUrl ? (
          <img
            ref={imgRef}
            src={filteredUrl}
            alt="Vintage Slideshow Preview"
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-opacity duration-500"
          />
        ) : (
          <div className="text-neutral-500 font-serif text-xl italic">
            No photos loaded right now. Tap capture below to start!
          </div>
        )}
      </div>

      {/* Bottom Capture Bar */}
      <div className="flex flex-col items-center justify-center z-10 pb-2">
        <button
          onClick={handleStartCapture}
          disabled={countdown !== null}
          className="group relative px-12 py-6 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 text-black font-serif text-2xl font-bold tracking-widest uppercase rounded-full shadow-2xl shadow-amber-200/30 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 border-4 border-white/40"
        >
          <span className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z" />
              <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
            </svg>
            <span>Capture Vintage Moment</span>
          </span>
        </button>
        <span className="mt-3 text-xs text-neutral-400 font-mono tracking-wider">
          ON-DEMAND LOCAL CPU PROCESSING • ZERO LATENCY BOOTH
        </span>
      </div>
    </div>
  );
});

VintageSlideshow.displayName = 'VintageSlideshow';
