import React, { useEffect, useState, lazy, Suspense } from 'react';
import { GalleryConfig, GalleryTheme, Photo, Order } from '@clickflash/types';
import { VoiceAiConcierge } from './components/VoiceAiConcierge';
import { cloudApiService } from './services/cloudApiService';
import { Sparkles, ShoppingBag, Box, LogIn, Radio, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from '@clickflash/ui';
import './styles/theme.css';

// Lazy load route modes and spatial canvas components
const CustomerLayout = lazy(() => import('./components/customer/CustomerLayout'));
const CustomerLogin = lazy(() => import('./components/customer/CustomerLogin'));
const SpatialHoloGallery = lazy(() => import('./components/SpatialHoloGallery').then(m => ({ default: m.SpatialHoloGallery })));
const WebRtcViewer = lazy(() => import('./components/WebRtcViewer').then(m => ({ default: m.WebRtcViewer })));

export const samplePhotos: Photo[] = [
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

export const sampleOrder: Order = {
  id: 'ord_orlando_vip_8841',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  date: new Date().toISOString().split('T')[0],
  clientName: 'Sarah Jenkins (VIP Guest)',
  email: 'sarah.jenkins@example.com',
  status: 'Completed',
  total: 149.00,
  photographerId: 'p_01',
  destinationId: 'dest_orlando_resort',
  albumId: 'album_orlando_vip',
  orderNumber: 'CF-2026-8841',
  items: [
    {
      id: 'item_01',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      name: 'All-Inclusive High-Res Digital Pass',
      productId: 'prod_digital_all',
      price: 99.00,
      quantity: 1,
      photo: samplePhotos[0],
      deliveryType: 'digital'
    },
    {
      id: 'item_02',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      name: '3D Holographic Figure & Avatar Mesh',
      productId: 'prod_3d_figure',
      price: 50.00,
      quantity: 1,
      photo: samplePhotos[2],
      deliveryType: 'both'
    }
  ]
};

type PortalMode = 'ecommerce' | 'holo_3d' | 'login' | 'stream';

export default function App() {
  const [config, setConfig] = useState<GalleryConfig | null>(null);
  const [activeMode, setActiveMode] = useState<PortalMode>('ecommerce');
  const [activeOrder, setActiveOrder] = useState<Order | null>(sampleOrder);
  
  // Magic Link / WebRTC & Theme query param parsing
  const urlParams = new URLSearchParams(window.location.search);
  const sessionToken = urlParams.get('webrtc_session');
  const initialTheme = urlParams.get('theme') as GalleryTheme | null;

  useEffect(() => {
    // 1. URL theme priority
    if (initialTheme) {
      document.documentElement.dataset.theme = initialTheme;
    }

    // 2. Fetch default config from edge node
    async function fetchConfig() {
      try {
        const response = await fetch('http://localhost:8090/api/gallery-config/default');
        if (response.ok) {
          const data = await response.json();
          setConfig(data.data);
          if (!initialTheme) {
            document.documentElement.dataset.theme = data.data.theme || GalleryTheme.GLASSMORPHIC;
          }
        } else if (!initialTheme) {
          document.documentElement.dataset.theme = GalleryTheme.GLASSMORPHIC;
        }
      } catch {
        if (!initialTheme) {
          document.documentElement.dataset.theme = GalleryTheme.GLASSMORPHIC;
        }
      }
    }
    fetchConfig();

    // 3. Listen for postMessage from Management Hub iframe preview
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SET_GALLERY_THEME' && event.data.theme) {
        document.documentElement.dataset.theme = event.data.theme;
      } else if (event.data?.type === 'SET_GALLERY_CONFIG' && event.data.config) {
        setConfig(event.data.config);
        if (event.data.config.theme) {
          document.documentElement.dataset.theme = event.data.config.theme;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [initialTheme]);

  return (
    <div className="gallery-app bg-slate-950 text-slate-50 min-h-screen flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Top Universal Ecosystem Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-white flex items-center gap-2">
              ClickFlash Holographic Portal
              <span className="text-[10px] font-mono uppercase bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 px-2 py-0.5 rounded-full">
                V9.0 Autonomous
              </span>
            </h1>
            <p className="text-xs text-slate-400">Resort Media Cloud & Spatial Guest Showcase</p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 gap-1 shadow-inner">
          <button
            onClick={() => setActiveMode('ecommerce')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'ecommerce'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Store & Gallery
          </button>
          
          <button
            onClick={() => setActiveMode('holo_3d')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'holo_3d'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D Holo-Stage
          </button>

          <button
            onClick={() => setActiveMode('login')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'login'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Selfie / Pin Login
          </button>

          {sessionToken && (
            <button
              onClick={() => setActiveMode('stream')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'stream'
                  ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Live Stream
            </button>
          )}
        </div>

        {/* AI Voice Concierge & Status */}
        <div className="flex items-center gap-3">
          <VoiceAiConcierge guestName={activeOrder?.clientName || "Sarah"} totalPhotos={samplePhotos.length} />
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-bit Biometric Vault</span>
          </div>
        </div>
      </header>

      {/* Main View Port */}
      <main className="flex-1 w-full">
        <ErrorBoundary fallback={
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-red-400 p-8 text-center bg-slate-900/50 rounded-2xl border border-red-500/20 max-w-2xl mx-auto mt-12">
            <AlertTriangle className="w-12 h-12 text-red-500" />
            <h3 className="text-xl font-bold text-white">Display System Error</h3>
            <p className="text-sm text-slate-400">The holographic portal encountered a fatal rendering error. Please reload the page.</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">Reload Portal</button>
          </div>
        }>
          <Suspense fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-cyan-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium text-slate-400">Loading Holographic Media Portal...</p>
            </div>
          }>
          {activeMode === 'ecommerce' && (
            <div className="w-full">
              <CustomerLayout
                order={activeOrder || sampleOrder}
                config={config}
                onLogout={() => {
                  setActiveOrder(null);
                  setActiveMode('login');
                }}
              />
            </div>
          )}

          {activeMode === 'holo_3d' && (
            <div className="p-8 space-y-8 max-w-7xl mx-auto">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                  Spatial WebXR & Holographic Viewing Stage
                </h2>
                <p className="text-sm text-slate-400">
                  Experience Apple Vision Pro & Meta Quest 3 3D depth pop-out with local WebGPU 4x Neural Super-Resolution.
                </p>
              </div>
              
              <SpatialHoloGallery photos={samplePhotos} />

              {config && (
                <div className="space-y-4 max-w-xl mx-auto p-6 border border-slate-800 rounded-2xl bg-slate-900/50 backdrop-blur-md">
                  <h3 className="text-lg font-semibold text-white">Active Ecosystem Capabilities</h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-300">
                    {config.features.enablePhotoBooks && <li>✅ Premium Automated Photo Books</li>}
                    {config.features.enableReels && <li>✅ AI Highlight Beat-Synced Reels</li>}
                    {config.features.enableAiFigures && <li>✅ 3D Avatar Meshes & Physical Statues</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeMode === 'login' && (
            <div className="p-6">
              <CustomerLogin
                authService={cloudApiService}
                onLoginSuccess={(payload: any) => {
                  if (payload && payload.items) {
                    setActiveOrder(payload);
                  }
                  setActiveMode('ecommerce');
                }}
                onBack={() => setActiveMode('ecommerce')}
              />
            </div>
          )}

          {activeMode === 'stream' && sessionToken && (
            <div className="p-8 max-w-5xl mx-auto">
              <WebRtcViewer sessionToken={sessionToken} signalingUrl="ws://localhost:8090/webrtc-signaling" />
            </div>
          )}
        </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
