import React, { useEffect, useState } from 'react';
import { GalleryConfig, GalleryTheme } from '@clickflash/types';
import { WebRtcViewer } from './components/WebRtcViewer';
import './styles/theme.css';

export default function App() {
  const [config, setConfig] = useState<GalleryConfig | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        // Fetch config from the backend API
        const response = await fetch('http://localhost:8090/api/gallery-config/default');
        if (response.ok) {
          const data = await response.json();
          setConfig(data.data);
          // Inject selected theme into root HTML element
          document.documentElement.dataset.theme = data.data.theme;
        } else {
          // Fallback to CLASSIC
          document.documentElement.dataset.theme = GalleryTheme.CLASSIC;
        }
      } catch (e) {
        console.error("Failed to fetch config", e);
        document.documentElement.dataset.theme = GalleryTheme.CLASSIC;
      }
    }
    fetchConfig();
  }, []);

  return (
    <div className="gallery-app bg-[var(--ui-bg)] text-[var(--ui-text)] min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8 text-[var(--ui-primary)]">Customer Gallery (Self-Service)</h1>
      <p className="mb-4">This preview simulates the public-facing gallery using the requested configuration.</p>
      
      {config && (
        <div className="space-y-4 max-w-xl p-6 border border-current rounded-xl" style={{ borderColor: 'var(--ui-primary)' }}>
          <h2 className="text-xl font-semibold">Active Features</h2>
          <ul className="list-disc pl-5">
            {config.features.enablePhotoBooks && <li>✅ Photo Books Enabled</li>}
            {config.features.enableReels && <li>✅ Reels Enabled</li>}
            {config.features.enableAiFigures && <li>✅ AI Figures Enabled</li>}
          </ul>
          
          <h2 className="text-xl font-semibold mt-6">AI Permissions</h2>
          <ul className="list-disc pl-5">
            {config.aiPermissions.map(perm => (
              <li key={perm}>✅ {perm}</li>
            ))}
          </ul>
        </div>
      )}

      {/* WebRTC Magic Gallery Viewer */}
      <WebRtcViewer />
    </div>
  );
}
