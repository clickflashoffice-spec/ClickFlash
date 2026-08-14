import { useState } from 'react';
import { Monitor, Smartphone, ExternalLink, RefreshCw } from 'lucide-react';

interface LiveGalleryPreviewPanelProps {
  galleryUrl?: string;
  galleryId?: string;
}

export function LiveGalleryPreviewPanel({ galleryUrl, galleryId }: LiveGalleryPreviewPanelProps) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [refreshKey, setRefreshKey] = useState(0);

  const previewUrl = galleryUrl || `${window.location.origin.replace('5175', '5176')}/?preview=true&galleryId=${galleryId || 'demo'}`;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-cyan-400" />
          Live Gallery Preview
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded-md transition-colors ${
                device === 'mobile' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile Preview"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('desktop')}
              className={`p-1.5 rounded-md transition-colors ${
                device === 'desktop' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop Preview"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh Preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 flex justify-center bg-slate-950/50">
        <div
          className={`relative transition-all duration-300 ease-out ${
            device === 'mobile'
              ? 'w-[375px] h-[667px] rounded-[2rem] ring-4 ring-slate-700 shadow-2xl'
              : 'w-full max-w-[900px] h-[560px] rounded-xl ring-2 ring-slate-700'
          }`}
        >
          {/* Device frame header */}
          {device === 'mobile' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10" />
          )}

          <iframe
            key={refreshKey}
            src={previewUrl}
            className="w-full h-full rounded-[inherit] bg-white"
            title="Gallery Live Preview"
            sandbox="allow-scripts allow-same-origin"
          />

          {/* Status bar */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm text-[9px] text-slate-400 font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Preview — Changes reflect instantly
          </div>
        </div>
      </div>
    </div>
  );
}
