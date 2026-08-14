import React from 'react';
import { CloudDownload, Box, Film, Sparkles } from 'lucide-react';

export type AIProductType = 'full-gallery' | '3d-figure' | 'ai-reel' | 'magic-shot';

interface AIProductBarProps {
  onAction: (type: AIProductType) => void;
}

export default function AIProductBar({ onAction }: AIProductBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe bg-slate-950/80 backdrop-blur-xl border-t border-white/10 shadow-2xl">
      <div className="max-w-4xl mx-auto flex items-center justify-around gap-2 md:gap-6">
        <button
          onClick={() => onAction('full-gallery')}
          className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 flex-1 min-h-[48px] p-2 rounded-2xl hover:bg-white/5 transition-colors group"
        >
          <div className="p-3 rounded-full bg-cyan-500/20 text-cyan-500 group-hover:scale-110 transition-transform">
            <CloudDownload size={24} strokeWidth={2} />
          </div>
          <span className="text-[10px] md:text-sm font-medium text-slate-300 group-hover:text-white text-center">Buy Full Gallery</span>
        </button>

        <button
          onClick={() => onAction('3d-figure')}
          className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 flex-1 min-h-[48px] p-2 rounded-2xl hover:bg-white/5 transition-colors group"
        >
          <div className="p-3 rounded-full bg-pink-500/20 text-pink-500 group-hover:scale-110 transition-transform">
            <Box size={24} strokeWidth={2} />
          </div>
          <span className="text-[10px] md:text-sm font-medium text-slate-300 group-hover:text-white text-center">Order 3D Figure</span>
        </button>

        <button
          onClick={() => onAction('ai-reel')}
          className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 flex-1 min-h-[48px] p-2 rounded-2xl hover:bg-white/5 transition-colors group relative"
        >
          <div className="relative p-3 rounded-full bg-purple-500/20 text-purple-500 group-hover:scale-110 transition-transform">
            <Film size={24} strokeWidth={2} />
            <span className="absolute top-0 right-0 w-3 h-3 bg-purple-400 rounded-full animate-ping opacity-75"></span>
            <span className="absolute top-0 right-0 w-3 h-3 bg-purple-500 rounded-full border-2 border-slate-950"></span>
          </div>
          <span className="text-[10px] md:text-sm font-medium text-slate-300 group-hover:text-white text-center">Create AI Reel</span>
        </button>

        <button
          onClick={() => onAction('magic-shot')}
          className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 flex-1 min-h-[48px] p-2 rounded-2xl hover:bg-white/5 transition-colors group"
        >
          <div className="p-3 rounded-full bg-blue-500/20 text-blue-500 group-hover:scale-110 transition-transform">
            <Sparkles size={24} strokeWidth={2} />
          </div>
          <span className="text-[10px] md:text-sm font-medium text-slate-300 group-hover:text-white text-center">Try Magic Shot</span>
        </button>
      </div>
    </div>
  );
}
