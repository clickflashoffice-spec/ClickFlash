import React, { useEffect, useState } from 'react';
import { GalleryConfig, GalleryTheme, Photo } from '@clickflash/types';
import { WebRtcViewer } from './components/WebRtcViewer';
import { SpatialHoloGallery } from './components/SpatialHoloGallery';
import { VoiceAiConcierge } from './components/VoiceAiConcierge';
import './styles/theme.css';

const samplePhotos: Photo[] = [
  {
    id: 'sample_01',
    albumId: 'album_orlando_vip',
    url: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=1200&auto=format&fit=crop&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=600&auto=format&fit=crop&q=80',
    title: 'Apex Coaster Inversion',
    photographerId: 'p_01'
  },
  {
    id: 'sample_02',
    albumId: 'album_orlando_vip',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    title: 'Water Rapids Splashdown',
    photographerId: 'p_02'
  },
  {
    id: 'sample_03',
    albumId: 'album_orlando_vip',
    url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&auto=format&fit=crop&q=80',
    title: 'Castle Golden Hour Celebration',
    photographerId: 'p_01'
  },
  {
    id: 'sample_04',
    albumId: 'album_orlando_vip',
    url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&auto=format&fit=crop&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80',
    title: 'Family VIP Portal Entry',
    photographerId: 'p_03'
  }
];

export default function App() {
  const [config, setConfig] = useState<GalleryConfig | null>(null);
  
  // Magic Link parsing
  const urlParams = new URLSearchParams(window.location.search);
  const sessionToken = urlParams.get('webrtc_session');

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('http://localhost:8090/api/gallery-config/default');
        if (response.ok) {
          const data = await response.json();
          setConfig(data.data);
          document.documentElement.dataset.theme = data.data.theme;
        } else {
          document.documentElement.dataset.theme = GalleryTheme.CLASSIC;
        }
      } catch (e) {
        document.documentElement.dataset.theme = GalleryTheme.CLASSIC;
      }
    }
    fetchConfig();
  }, []);

  return (
    <div className="gallery-app bg-[var(--ui-bg,#020617)] text-[var(--ui-text,#f8fafc)] min-h-screen p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
            ClickFlash Holographic Portal (V9.0)
          </h1>
          <p className="text-sm text-slate-400 mt-1">Spatial 3D Galleries & Multilingual AI Guest Concierge</p>
        </div>
        <VoiceAiConcierge guestName="Sarah" totalPhotos={samplePhotos.length} />
      </div>

      {sessionToken ? (
        <WebRtcViewer sessionToken={sessionToken} signalingUrl="ws://localhost:8090/webrtc-signaling" />
      ) : (
        <div className="space-y-8">
          {/* Spatial 3D Holo-Stage */}
          <SpatialHoloGallery photos={samplePhotos} />

          {config && (
            <div className="space-y-4 max-w-xl p-6 border border-slate-800 rounded-xl bg-slate-900/50">
              <h2 className="text-xl font-semibold text-white">Active Ecosystem Features</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
                {config.features.enablePhotoBooks && <li>✅ Photo Books Enabled</li>}
                {config.features.enableReels && <li>✅ Auto-Beat Reels Enabled</li>}
                {config.features.enableAiFigures && <li>✅ AI 3D Meshes & Avatars Enabled</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
