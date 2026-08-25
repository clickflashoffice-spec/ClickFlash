import { useState, useEffect } from 'react';
import { GalleryConfigPanel } from '../components/GalleryConfigPanel';
import { LiveGalleryPreviewPanel } from '../components/LiveGalleryPreviewPanel';
import { GalleryTheme, type DestinationGalleryConfig } from '@clickflash/types';
import { Sliders } from 'lucide-react';

export function GallerySettingsView({ destinationId = 'dest_atlantis_01' }: { destinationId?: string }) {
  const [activeConfig, setActiveConfig] = useState<DestinationGalleryConfig | null>(null);

  useEffect(() => {
    // Initial fetch from edge node
    async function loadConfig() {
      try {
        const res = await fetch(`http://localhost:8090/api/gallery-config/${destinationId}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.data) {
            setActiveConfig({
              id: destinationId,
              destinationId,
              destinationName: 'Active Destination',
              theme: data.data.theme || GalleryTheme.GLASSMORPHIC,
              features: {
                enableReels: data.data.features?.enableReels ?? true,
                enableAiFigures: data.data.features?.enableAiFigures ?? true,
                enableMagicShots: data.data.features?.enableMagicShots ?? true,
                enablePhotoBooks: data.data.features?.enablePhotoBooks ?? false,
                enableProRetouch: data.data.features?.enableProRetouch ?? true,
                enableFullGalleryDownload: data.data.features?.enableFullGalleryDownload ?? true,
                enableSinglePhotoPurchase: data.data.features?.enableSinglePhotoPurchase ?? true,
                enableFaceSearch: data.data.features?.enableFaceSearch ?? true,
              },
              aiToolTiers: data.data.aiToolTiers || {},
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch {
        // Fallback handled gracefully
      }
    }
    loadConfig();
  }, [destinationId]);

  const handleConfigChange = async (newConfig: DestinationGalleryConfig) => {
    setActiveConfig(newConfig);
    try {
      await fetch(`http://localhost:8090/api/gallery-config/${newConfig.destinationId || destinationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: newConfig.theme,
          features: newConfig.features,
          aiPermissions: [],
          aiToolTiers: newConfig.aiToolTiers,
        }),
      });
    } catch {
      // Offline/local preview fallback
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8 bg-slate-950">
      {/* Header Bar */}
      <div className="px-8 py-5 border-b border-slate-800 bg-slate-950 flex-none shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-cyan-400" />
            Destination Gallery Configuration & Live Theming
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure destination features, custom AI paywalls, and theme templates with zero-latency live preview.
          </p>
        </div>
      </div>

      {/* Split View Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* Left: Interactive Control Studio */}
        <div className="lg:col-span-6 overflow-y-auto p-6">
          <GalleryConfigPanel
            selectedDestinationId={destinationId}
            onConfigChange={handleConfigChange}
          />
        </div>

        {/* Right: Real-time Synchronized Preview Frame */}
        <div className="lg:col-span-6 overflow-hidden flex flex-col p-6">
          <LiveGalleryPreviewPanel
            config={activeConfig}
            theme={activeConfig?.theme || GalleryTheme.GLASSMORPHIC}
            galleryId="demo"
          />
        </div>
      </div>
    </div>
  );
}
