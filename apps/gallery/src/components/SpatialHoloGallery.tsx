import React, { useState, useEffect } from 'react';
import { Photo, SpatialHoloGalleryConfig } from '@clickflash/types';
import { Sparkles, Eye, Maximize2, RotateCw } from 'lucide-react';
import { WebGpuUpscaler } from '../services/WebGpuUpscaler';

interface SpatialHoloGalleryProps {
  photos: Photo[];
  onSelectPhoto?: (photo: Photo) => void;
  config?: Partial<SpatialHoloGalleryConfig>;
}

export const SpatialHoloGallery: React.FC<SpatialHoloGalleryProps> = ({
  photos,
  onSelectPhoto,
  config = {}
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [isWebGpuActive, setIsWebGpuActive] = useState<boolean>(false);
  const [isUpscaling, setIsUpscaling] = useState<boolean>(false);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);

  const activePhoto = photos[activeIndex] || photos[0];

  useEffect(() => {
    WebGpuUpscaler.getInstance().initialize().then((pipeline) => {
      setIsWebGpuActive(pipeline.supported);
    });
  }, []);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % Math.max(photos.length, 1));
    setRotationAngle((prev) => prev - (360 / Math.max(photos.length, 1)));
    setEnhancedUrl(null);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + photos.length) % Math.max(photos.length, 1));
    setRotationAngle((prev) => prev + (360 / Math.max(photos.length, 1)));
    setEnhancedUrl(null);
  };

  const handleApplyWebGpu4x = async () => {
    if (!activePhoto) return;
    setIsUpscaling(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = activePhoto.url;
      await new Promise((resolve) => { img.onload = resolve; });
      const upscaled = await WebGpuUpscaler.getInstance().upscaleImage(img, 4);
      setEnhancedUrl(upscaled);
    } catch (err) {
      console.error('WebGPU Upscaling failed:', err);
    } finally {
      setIsUpscaling(false);
    }
  };

  return (
    <div className="spatial-holo-container relative w-full h-[650px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col items-center justify-between p-6">
      {/* Ambient Holographic Particle Header */}
      <div className="w-full flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Eye className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Spatial Holo-Gallery
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                WebXR 3D
              </span>
            </h3>
            <p className="text-xs text-slate-400">Volumetric Depth & Perceptual Light Stage</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isWebGpuActive && (
            <button
              onClick={handleApplyWebGpu4x}
              disabled={isUpscaling}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 transition-all shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              {isUpscaling ? 'Upscaling 4K...' : 'WebGPU 4x Neural Super-Res'}
            </button>
          )}
          <div className="px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300">
            {photos.length > 0 ? `${activeIndex + 1} / ${photos.length}` : '0 / 0'}
          </div>
        </div>
      </div>

      {/* 3D Volumetric Stage */}
      <div className="spatial-stage relative w-full flex-1 flex items-center justify-center perspective-[1200px] overflow-hidden my-4">
        <div 
          className="holo-carousel relative w-72 h-96 transition-transform duration-700 ease-out preserve-3d"
          style={{ transform: `rotateY(${rotationAngle * 0.4}deg)` }}
        >
          {photos.slice(0, 7).map((photo, idx) => {
            const offset = (idx - activeIndex + photos.length) % photos.length;
            const isCenter = offset === 0;
            const translateX = (offset - Math.min(3, photos.length / 2)) * 140;
            const translateZ = isCenter ? 100 : -150 - Math.abs(offset) * 50;
            const rotateY = (offset - Math.min(3, photos.length / 2)) * -20;
            const opacity = isCenter ? 1 : Math.max(0.2, 1 - Math.abs(offset) * 0.35);

            return (
              <div
                key={photo.id || idx}
                onClick={() => {
                  setActiveIndex(idx);
                  if (onSelectPhoto) onSelectPhoto(photo);
                }}
                className={`absolute inset-0 rounded-2xl overflow-hidden cursor-pointer border transition-all duration-500 ${
                  isCenter 
                    ? 'border-cyan-400/80 shadow-[0_0_40px_rgba(6,182,212,0.4)] scale-105 z-30 ring-2 ring-cyan-400/50' 
                    : 'border-slate-700/50 hover:border-slate-500 scale-90 z-10'
                }`}
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
                  opacity
                }}
              >
                <img
                  src={isCenter && enhancedUrl ? enhancedUrl : photo.previewUrl || photo.url}
                  alt={photo.title || 'Spatial frame'}
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                {isCenter && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="text-xs font-semibold truncate">{photo.title || 'Resort Moment'}</span>
                    <Maximize2 className="w-4 h-4 text-cyan-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Surface */}
      <div className="w-full flex items-center justify-between z-20 pt-2 border-t border-slate-850">
        <button
          onClick={handlePrev}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-200 text-sm font-medium transition-colors"
        >
          ← Previous
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setRotationAngle((prev) => prev + 45)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            title="Orbit 3D Stage"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400">Drag or swipe to orbit spatial field</span>
        </div>

        <button
          onClick={handleNext}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium shadow-lg transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
};
