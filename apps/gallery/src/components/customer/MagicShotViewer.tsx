import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Layers, 
  Download, 
  Share2, 
  Maximize2, 
  Eye, 
  Compass, 
  Zap, 
  Flame, 
  Check, 
  Play, 
  Pause 
} from 'lucide-react';
import { MagicShotTemplate } from '@clickflash/types';

interface MagicShotViewerProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  photoId: string;
  onShare?: (url: string) => void;
  onDownload?: (type: 'image' | 'video_reel') => void;
}

const DEMO_TEMPLATES: MagicShotTemplate[] = [
  {
    id: 'magic-shot-dragon-burst',
    destinationId: 'DEST_PARK_1',
    name: 'Inferno Dragon Burst',
    description: 'Enchanted dragon swoops overhead with live fire embers and cinematic depth.',
    category: 'character_composite',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=60',
    samplePreviewUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
    watermarkEnabled: true,
    premiumUpsellPriceCents: 999,
    isActive: true,
    depthThreshold: 0.45,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: 'dragon-char',
        type: 'animated_character',
        assetUrl: '/assets/characters/inferno_dragon.png',
        zIndex: 2,
        opacity: 1.0,
        blendMode: 'normal',
        position: { x: 0.7, y: 0.25, scale: 0.9 }
      },
      {
        id: 'dragon-embers',
        type: 'overlay_particle',
        assetUrl: '/assets/vfx/glowing_embers.png',
        zIndex: 10,
        opacity: 0.9,
        blendMode: 'screen',
        position: { x: 0.5, y: 0.5, scale: 1.0 }
      }
    ]
  },
  {
    id: 'magic-shot-galaxy-portal',
    destinationId: 'DEST_PARK_1',
    name: 'Celestial Galaxy Portal',
    description: 'A cosmic wormhole with star dust depth map and holographic refraction.',
    category: 'spatial_3d_portal',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=300&auto=format&fit=crop&q=60',
    samplePreviewUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
    watermarkEnabled: true,
    premiumUpsellPriceCents: 1299,
    isActive: true,
    depthThreshold: 0.5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: 'portal-vortex',
        type: 'background',
        assetUrl: '/assets/vfx/galaxy_vortex.png',
        zIndex: 0,
        opacity: 0.95,
        blendMode: 'overlay',
        position: { x: 0.5, y: 0.5, scale: 1.4 }
      }
    ]
  },
  {
    id: 'magic-shot-lightning-speed',
    destinationId: 'DEST_PARK_1',
    name: 'Coaster Thunder Speed',
    description: 'Electric storm lightning bursts and motion blur velocity ribbons.',
    category: 'ride_action_burst',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=300&auto=format&fit=crop&q=60',
    samplePreviewUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
    watermarkEnabled: true,
    premiumUpsellPriceCents: 799,
    isActive: true,
    depthThreshold: 0.4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: 'lightning-bolts',
        type: 'overlay_particle',
        assetUrl: '/assets/vfx/lightning.png',
        zIndex: 8,
        opacity: 0.85,
        blendMode: 'screen',
        position: { x: 0.5, y: 0.5, scale: 1.1 }
      }
    ]
  }
];

export default function MagicShotViewer({
  isOpen,
  onClose,
  photoUrl,
  photoId,
  onShare,
  onDownload
}: MagicShotViewerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MagicShotTemplate>(DEMO_TEMPLATES[0]);
  const [is3DParallaxActive, setIs3DParallaxActive] = useState(true);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [isPlayingReel, setIsPlayingReel] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax calculations based on pointer movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!is3DParallaxActive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 30;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 30;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  // Gyroscope tilt support for mobile
  useEffect(() => {
    if (!isOpen) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!is3DParallaxActive || event.gamma === null || event.beta === null) return;
      // Clamp tilt values
      const x = Math.min(Math.max(event.gamma * 0.6, -20), 20);
      const y = Math.min(Math.max((event.beta - 45) * 0.6, -20), 20);
      setMouseOffset({ x, y });
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [isOpen, is3DParallaxActive]);

  if (!isOpen) return null;

  const handleExport = (type: 'image' | 'video_reel') => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      if (onDownload) onDownload(type);
    }, 1200);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="magic-shot-title"
    >
      <div className="relative w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row my-8">
        
        {/* Left Side: 3D Parallax Viewport */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative flex-1 bg-slate-900 min-h-[420px] md:min-h-[580px] flex items-center justify-center overflow-hidden cursor-crosshair select-none"
        >
          {/* Background Layer with Parallax Depth */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-100 ease-out scale-110"
            style={{
              backgroundImage: `url(${photoUrl})`,
              transform: `translate3d(${mouseOffset.x * 0.4}px, ${mouseOffset.y * 0.4}px, 0px) scale(1.1)`
            }}
          />

          {/* Depth VFX Overlay Layer */}
          <div 
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"
          />

          {/* Animated 3D Magic Shot Holographic Character / Effect */}
          {selectedTemplate.id === 'magic-shot-dragon-burst' && (
            <div 
              className="absolute top-10 right-12 transition-transform duration-150 ease-out pointer-events-none animate-pulse"
              style={{
                transform: `translate3d(${mouseOffset.x * 1.5}px, ${mouseOffset.y * 1.5}px, 40px)`
              }}
            >
              <div className="flex items-center gap-2 bg-amber-500/30 backdrop-blur-sm border border-amber-400/50 text-amber-200 px-4 py-2 rounded-full shadow-lg">
                <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
                <span className="text-sm font-semibold tracking-wide">Inferno Dragon VFX Composite</span>
              </div>
            </div>
          )}

          {selectedTemplate.id === 'magic-shot-galaxy-portal' && (
            <div 
              className="absolute inset-0 flex items-center justify-center transition-transform duration-150 ease-out pointer-events-none"
              style={{
                transform: `translate3d(${mouseOffset.x * 1.2}px, ${mouseOffset.y * 1.2}px, 30px)`
              }}
            >
              <div className="w-64 h-64 rounded-full border-4 border-purple-500/40 border-dashed animate-spin bg-radial from-purple-900/40 to-transparent blur-xs" />
            </div>
          )}

          {selectedTemplate.id === 'magic-shot-lightning-speed' && (
            <div 
              className="absolute inset-0 flex items-center justify-around pointer-events-none transition-transform duration-75"
              style={{
                transform: `translate3d(${mouseOffset.x * 1.8}px, ${mouseOffset.y * 1.8}px, 50px)`
              }}
            >
              <Zap className="w-20 h-20 text-cyan-300 opacity-75 animate-ping" />
              <Zap className="w-28 h-28 text-amber-300 opacity-80 animate-pulse" />
            </div>
          )}

          {/* Foreground Subject Depth Layer */}
          <div 
            className="absolute bottom-6 left-6 z-10 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/60 text-slate-200 shadow-xl"
          >
            <Compass className={`w-5 h-5 ${is3DParallaxActive ? 'text-cyan-400 animate-spin' : 'text-slate-400'}`} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">WebXR 3D Parallax</p>
              <p className="text-[11px] text-slate-400">Move cursor or tilt device for depth shift</p>
            </div>
          </div>

          {/* Close Button on Image */}
          <button
            onClick={onClose}
            aria-label="Close Magic Shot Studio"
            className="absolute top-4 left-4 z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Right Side: VFX Controls & Studio Panel */}
        <div className="w-full md:w-[380px] p-6 flex flex-col justify-between bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 text-white shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="magic-shot-title" className="text-lg font-bold text-white leading-tight">
                    Magic Shot VFX Studio
                  </h2>
                  <p className="text-xs text-slate-400">Autonomous Edge AI Compositing</p>
                </div>
              </div>
            </div>

            {/* Parallax Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">3D Holographic Parallax</span>
              </div>
              <button
                onClick={() => setIs3DParallaxActive(!is3DParallaxActive)}
                role="switch"
                aria-checked={is3DParallaxActive}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  is3DParallaxActive ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    is3DParallaxActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Attraction Templates Selector */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Select VFX Template
              </label>
              <div className="space-y-2.5">
                {DEMO_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate.id === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                        isSelected 
                          ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-lg shadow-cyan-950/50' 
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <img 
                        src={tmpl.thumbnailUrl} 
                        alt={tmpl.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold truncate text-white">{tmpl.name}</p>
                          {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{tmpl.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            {showToast && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Magic Shot generated & saved to your WhatsApp album!</span>
              </div>
            )}

            <button
              onClick={() => handleExport('video_reel')}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-950/50 transition-all disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing 3D Reel...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Export 9:16 TikTok / Instagram Reel</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleExport('image')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Download 4K Spatial Photo</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
