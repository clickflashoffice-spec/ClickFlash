import { useState, useEffect, useRef } from 'react';
import { Monitor, Smartphone, ExternalLink, RefreshCw } from 'lucide-react';
import { GalleryTheme, type DestinationGalleryConfig } from '@clickflash/types';

interface LiveGalleryPreviewPanelProps {
  galleryUrl?: string;
  galleryId?: string;
  config?: DestinationGalleryConfig | null;
  theme?: GalleryTheme;
}

export function LiveGalleryPreviewPanel({ galleryUrl, galleryId, config, theme }: LiveGalleryPreviewPanelProps) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const activeTheme = theme || config?.theme || GalleryTheme.GLASSMORPHIC;
  const activeDest = config?.destinationId || 'dest_atlantis_01';

  const defaultUrl = `${window.location.origin.replace('5175', '5176')}/?preview=true&galleryId=${galleryId || 'demo'}&theme=${activeTheme.toLowerCase()}&destinationId=${activeDest}`;
  const previewUrl = galleryUrl || defaultUrl;

  // Dispatch postMessage updates when config or theme changes
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      if (config) {
        iframeRef.current.contentWindow.postMessage({ type: 'SET_GALLERY_CONFIG', config }, '*');
      }
      if (activeTheme) {
        iframeRef.current.contentWindow.postMessage({ type: 'SET_GALLERY_THEME', theme: activeTheme }, '*');
      }
    }
  }, [config, activeTheme]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Live Gallery Guest View</h3>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/40">
            {activeTheme}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded-md transition-colors ${
                device === 'mobile' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile View (375x667)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('desktop')}
              className={`p-1.5 rounded-md transition-colors ${
                device === 'desktop' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Open Fullscreen in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reload Preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 flex items-center justify-center bg-slate-950/70 overflow-auto">
        <div
          className={`relative transition-all duration-300 ease-out bg-slate-900 ${
            device === 'mobile'
              ? 'w-[375px] h-[667px] rounded-[2.5rem] ring-8 ring-slate-800 shadow-2xl overflow-hidden'
              : 'w-full h-[580px] max-w-[960px] rounded-2xl ring-4 ring-slate-800 shadow-2xl overflow-hidden'
          }`}
        >
          {/* Device notch header for mobile */}
          {device === 'mobile' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-5 bg-slate-800 rounded-b-2xl z-20 flex items-center justify-center">
              <div className="w-10 h-1 bg-slate-700 rounded-full" />
            </div>
          )}

          <iframe
            ref={iframeRef}
            key={refreshKey}
            src={previewUrl}
            className="w-full h-full border-0 bg-slate-950"
            title="Gallery Live Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />

          {/* Status bar */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[9px] text-slate-300 font-medium flex items-center gap-2 z-20 border border-white/10 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Reactive Sync
          </div>
        </div>
      </div>
    </div>
  );
}
