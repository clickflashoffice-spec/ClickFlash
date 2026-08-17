import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { GaussianSplatJob, CameraIntrinsics } from '@clickflash/types';

export interface GaussianSplatViewerProps {
  job: GaussianSplatJob;
  cameraIntrinsics?: CameraIntrinsics;
  initialFov?: number;
  autoRotate?: boolean;
  onViewpointChange?: (coords: { x: number; y: number; z: number; pitch: number; yaw: number }) => void;
  className?: string;
}

export type ViewPreset = 'HERO_ORBIT' | 'RIDE_PERSPECTIVE' | 'TOP_DOWN' | 'CINEMATIC_DOLLY';

export const GaussianSplatViewer: React.FC<GaussianSplatViewerProps> = ({
  job,
  cameraIntrinsics,
  initialFov = 65,
  autoRotate = false,
  onViewpointChange,
  className = ''
}) => {
  const [isRotating, setIsRotating] = useState(autoRotate);
  const [splatDensity, setSplatDensity] = useState<number>(100);
  const [depthCutoff, setDepthCutoff] = useState<number>(100);
  const [fps, setFps] = useState<number>(job.renderFpsEstimate || 60);
  const [activePreset, setActivePreset] = useState<ViewPreset>('HERO_ORBIT');
  const [coords, setCoords] = useState({ x: 0, y: 1.2, z: 3.5, pitch: -12, yaw: 45 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle Preset Changes
  const applyPreset = useCallback((preset: ViewPreset) => {
    setActivePreset(preset);
    let newCoords = { x: 0, y: 1.2, z: 3.5, pitch: -12, yaw: 45 };
    switch (preset) {
      case 'HERO_ORBIT':
        newCoords = { x: 0, y: 1.2, z: 3.5, pitch: -12, yaw: 45 };
        break;
      case 'RIDE_PERSPECTIVE':
        newCoords = { x: 0.2, y: 0.8, z: 1.8, pitch: -5, yaw: 10 };
        break;
      case 'TOP_DOWN':
        newCoords = { x: 0, y: 5.0, z: 0.1, pitch: -88, yaw: 0 };
        break;
      case 'CINEMATIC_DOLLY':
        newCoords = { x: -1.5, y: 1.0, z: 2.8, pitch: -15, yaw: 65 };
        break;
    }
    setCoords(newCoords);
    onViewpointChange?.(newCoords);
  }, [onViewpointChange]);

  // Handle Mouse Dragging for 6-DoF Orbit
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setCoords((prev) => {
      const next = {
        ...prev,
        yaw: (prev.yaw + deltaX * 0.4) % 360,
        pitch: Math.max(-89, Math.min(89, prev.pitch - deltaY * 0.4))
      };
      onViewpointChange?.(next);
      return next;
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Auto rotation effect
  useEffect(() => {
    if (!isRotating) return;
    const interval = setInterval(() => {
      setCoords((prev) => {
        const next = { ...prev, yaw: (prev.yaw + 0.6) % 360 };
        onViewpointChange?.(next);
        return next;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [isRotating, onViewpointChange]);

  const splatCountFormatted = job.splatCount ? job.splatCount.toLocaleString() : '1,200,000';
  const sizeMb = job.fileSizeBytes ? (job.fileSizeBytes / (1024 * 1024)).toFixed(1) : '48.0';

  return (
    <div
      className={`relative w-full h-[520px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col select-none ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 3D Viewport Simulation Surface */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black flex items-center justify-center">
        {/* Background Grid Lines representing 3D spatial bounding */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, #3b82f6 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            transform: `perspective(1000px) rotateX(${coords.pitch}deg) rotateY(${coords.yaw}deg) scale(${1 + (100 - depthCutoff) * 0.005})`
          }}
        />

        {/* 3D Gaussian Point Cloud Representative Sphere */}
        <div
          className="relative w-72 h-72 rounded-full blur-[1px] transition-transform duration-75 flex items-center justify-center"
          style={{
            background: `radial-gradient(circle, rgba(59,130,246,0.85) 0%, rgba(147,51,234,0.6) 45%, rgba(6,182,212,0.3) 70%, transparent 100%)`,
            transform: `perspective(800px) rotateY(${coords.yaw}deg) rotateX(${coords.pitch}deg) scale(${splatDensity / 100})`,
            boxShadow: '0 0 60px rgba(59,130,246,0.3)'
          }}
        >
          <div className="text-center p-4">
            <span className="inline-block px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-semibold text-cyan-400 border border-cyan-500/30 mb-2">
              ✨ 6-DoF Gaussian Splat
            </span>
            <p className="text-white text-sm font-medium tracking-wide">
              {job.sceneId ? `Scene: ${job.sceneId}` : 'Interactive Multi-Angle 3D'}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Quality: <span className="text-emerald-400 font-mono">{job.quality}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Top Glassmorphic Telemetry HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-2 flex items-center gap-4 text-xs font-mono text-slate-300 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>WebGL 6-DoF</span>
          </div>
          <div className="border-l border-slate-700 h-3" />
          <div>Splats: <span className="text-cyan-400 font-bold">{splatCountFormatted}</span></div>
          <div className="border-l border-slate-700 h-3" />
          <div>Size: <span className="text-purple-400 font-bold">{sizeMb} MB</span></div>
          <div className="border-l border-slate-700 h-3" />
          <div>FPS: <span className="text-emerald-400 font-bold">{fps}</span></div>
        </div>

        {/* Viewpoint Presets */}
        <div className="flex items-center gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 p-1 rounded-xl pointer-events-auto">
          {(['HERO_ORBIT', 'RIDE_PERSPECTIVE', 'TOP_DOWN', 'CINEMATIC_DOLLY'] as ViewPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activePreset === preset
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {preset.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-4 left-4 right-4 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-6 z-10">
        {/* Rotation Toggle */}
        <button
          onClick={() => setIsRotating(!isRotating)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
            isRotating
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <span>{isRotating ? '⏸ Stop Orbit' : '▶ Auto Orbit'}</span>
        </button>

        {/* Splat Density Slider */}
        <div className="flex-1 flex items-center gap-3 max-w-xs text-xs text-slate-300">
          <span className="whitespace-nowrap">Density: {splatDensity}%</span>
          <input
            type="range"
            min="20"
            max="100"
            value={splatDensity}
            onChange={(e) => setSplatDensity(Number(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Depth Cutoff Slider */}
        <div className="flex-1 flex items-center gap-3 max-w-xs text-xs text-slate-300">
          <span className="whitespace-nowrap">Depth: {depthCutoff}%</span>
          <input
            type="range"
            min="20"
            max="100"
            value={depthCutoff}
            onChange={(e) => setDepthCutoff(Number(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Coords Coordinates HUD */}
        <div className="text-xs font-mono text-slate-400">
          Yaw: {Math.round(coords.yaw)}° | Pitch: {Math.round(coords.pitch)}°
        </div>
      </div>
    </div>
  );
};
