'use client';

import React, { useState } from 'react';
import { Wand2, CheckCircle2 } from 'lucide-react';

const DEMO_MODES = [
  { id: 'enhance', name: '✨ Auto-Enhance', desc: 'Neural exposure, contrast & skin tone balancing' },
  { id: 'sky', name: '🌅 Sky Replacement', desc: 'Convert cloudy skies into dramatic golden hour sunsets' },
  { id: 'face', name: '👤 128D Face Search', desc: 'Find all matching guest photos in under 200ms' },
];

export function LiveAIDemoSimulator() {
  const [activeMode, setActiveMode] = useState<'enhance' | 'sky' | 'face'>('enhance');
  const [isEnhanced, setIsEnhanced] = useState(true);
  const [selectedSky, setSelectedSky] = useState<'sunset' | 'azure' | 'golden'>('sunset');

  return (
    <section className="py-24 bg-zinc-950 text-white relative overflow-hidden border-t border-zinc-850">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Wand2 className="w-3.5 h-3.5" />
            Interactive Sandbox
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Experience <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">ClickFlash AI</span> Live
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Test the same computer vision engines running across our resort kiosks and mobile apps.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl gap-2">
            {DEMO_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id as any)}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeMode === mode.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {mode.name}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Demo Viewport */}
        <div className="max-w-4xl mx-auto bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
          {/* Viewport Header */}
          <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-xs text-zinc-400 font-mono ml-2">ClickFlash Edge AI Engine v3.0</span>
            </div>
            <div className="text-xs font-semibold text-purple-400">
              ⚡ Inference: 142ms (Client-Side WebGL)
            </div>
          </div>

          {/* Interactive Sandbox Area */}
          <div className="p-8">
            {activeMode === 'enhance' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-zinc-300">
                    Toggle AI Lighting & Contrast Optimization:
                  </span>
                  <button
                    onClick={() => setIsEnhanced(!isEnhanced)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                      isEnhanced ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {isEnhanced ? '✨ AI Enhanced (Active)' : 'Original Raw'}
                  </button>
                </div>

                <div className="relative h-96 rounded-2xl overflow-hidden border border-zinc-750 bg-black flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1200&auto=format&fit=crop"
                    alt="Sample"
                    className={`w-full h-full object-cover transition-all duration-700 ${
                      isEnhanced ? 'contrast-125 saturate-125 brightness-110' : 'contrast-90 saturate-75 brightness-95'
                    }`}
                  />
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white">
                    {isEnhanced ? '✨ AI Auto-Exposure + Skin Tone Warmth' : 'Original Unedited Exposure'}
                  </div>
                </div>
              </div>
            )}

            {activeMode === 'sky' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-zinc-300">Select Neural Sky Preset:</span>
                  <div className="flex gap-2">
                    {(['sunset', 'golden', 'azure'] as const).map((sky) => (
                      <button
                        key={sky}
                        onClick={() => setSelectedSky(sky)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                          selectedSky === sky
                            ? 'bg-purple-500 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {sky}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative h-96 rounded-2xl overflow-hidden border border-zinc-750 bg-black">
                  <img
                    src={
                      selectedSky === 'sunset'
                        ? 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop'
                        : selectedSky === 'golden'
                        ? 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&auto=format&fit=crop'
                        : 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop'
                    }
                    alt="Sky Replacement"
                    className="w-full h-full object-cover transition-opacity duration-500"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white">
                    🌅 Horizon Blend: 99.4% Precision Segmented
                  </div>
                </div>
              </div>
            )}

            {activeMode === 'face' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-zinc-300">Face Vector Matching:</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 14 Photos Matched (98.6% Confidence)
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
                      <img
                        src={`https://images.unsplash.com/photo-${1500000000000 + i * 100000}?w=400&auto=format&fit=crop`}
                        alt="Match"
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
                          e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop';
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-emerald-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded">
                        99% Match
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
