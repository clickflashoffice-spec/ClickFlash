import React, { useState } from 'react';
import { 
  Video, 
  Box, 
  Wand2, 
  Sparkles, 
  Paintbrush, 
  BookOpen, 
  DownloadCloud, 
  Image as ImageIcon,
  Settings,
  Lightbulb,
  Palette,
  MapPin,
  CheckCircle2,
  ScanFace
} from 'lucide-react';
import { GalleryTheme, type DestinationGalleryConfig, type AIToolPricingConfig } from '@clickflash/types';

export interface DestinationOption {
  id: string;
  name: string;
  location: string;
}

export const destinations: DestinationOption[] = [
  { id: 'dest_atlantis_01', name: 'Atlantis Resort & Waterpark', location: 'Dubai, UAE' },
  { id: 'dest_hyatt_02', name: 'Grand Hyatt Beach Club', location: 'Maui, Hawaii' },
  { id: 'dest_paradise_03', name: 'Paradise Cove Lagoon', location: 'Cancún, Mexico' },
  { id: 'dest_universal_04', name: 'Universal Concession Studio', location: 'Orlando, USA' },
];

export interface GalleryConfigPanelProps {
  onConfigChange?: (config: DestinationGalleryConfig) => void;
  selectedDestinationId?: string;
  onSelectDestination?: (id: string) => void;
}

export const GalleryConfigPanel: React.FC<GalleryConfigPanelProps> = ({
  onConfigChange,
  selectedDestinationId = 'dest_atlantis_01',
  onSelectDestination,
}) => {
  const [currentDestId, setCurrentDestId] = useState(selectedDestinationId);
  const [selectedTheme, setSelectedTheme] = useState<GalleryTheme>(GalleryTheme.GLASSMORPHIC);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [features, setFeatures] = useState({
    enableReels: true,
    enableAiFigures: true,
    enableMagicShots: true,
    enablePhotoBooks: false,
    enableProRetouch: true,
    enableFullGalleryDownload: true,
    enableSinglePhotoPurchase: true,
    enableFaceSearch: true,
  });

  const [aiToolTiers, setAiToolTiers] = useState<Record<string, AIToolPricingConfig>>({
    'reels': { toolId: 'reels', name: 'AI Auto-Reels', permission: 'premium', priceMinor: 1499, currency: 'USD' },
    '3d_figures': { toolId: '3d_figures', name: '3D Figurines', permission: 'premium', priceMinor: 4999, currency: 'USD' },
    'magic_shots': { toolId: 'magic_shots', name: 'Magic Shots AR', permission: 'free', priceMinor: 499, currency: 'USD' },
    'bg_removal': { toolId: 'bg_removal', name: 'Background Removal', permission: 'free', priceMinor: 299, currency: 'USD' },
    'super_res': { toolId: 'super_res', name: '4K Super-Resolution', permission: 'free', priceMinor: 399, currency: 'USD' },
    'pro_retouch': { toolId: 'pro_retouch', name: 'Pro Blemish Retouch', permission: 'premium', priceMinor: 799, currency: 'USD' },
  });

  const activeDestination = destinations.find(d => d.id === currentDestId) || destinations[0];

  const notifyChanges = (
    updatedTheme: GalleryTheme,
    updatedFeatures: typeof features,
    updatedTiers: typeof aiToolTiers
  ) => {
    const config: DestinationGalleryConfig = {
      id: currentDestId,
      destinationId: currentDestId,
      destinationName: activeDestination.name,
      theme: updatedTheme,
      features: updatedFeatures,
      aiToolTiers: updatedTiers,
      updatedAt: new Date().toISOString(),
    };
    onConfigChange?.(config);
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 400);
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const handleDestinationChange = (id: string) => {
    setCurrentDestId(id);
    onSelectDestination?.(id);
    notifyChanges(selectedTheme, features, aiToolTiers);
  };

  const handleThemeSelect = (theme: GalleryTheme) => {
    setSelectedTheme(theme);
    notifyChanges(theme, features, aiToolTiers);
  };

  const toggleFeature = (key: keyof typeof features) => {
    const updated = { ...features, [key]: !features[key] };
    setFeatures(updated);
    notifyChanges(selectedTheme, updated, aiToolTiers);
  };

  const cyclePermission = (toolId: string) => {
    const current = aiToolTiers[toolId];
    if (!current) return;
    const cycle: Array<'free' | 'premium' | 'disabled'> = ['free', 'premium', 'disabled'];
    const nextIdx = (cycle.indexOf(current.permission) + 1) % cycle.length;
    const updated = {
      ...aiToolTiers,
      [toolId]: { ...current, permission: cycle[nextIdx] }
    };
    setAiToolTiers(updated);
    notifyChanges(selectedTheme, features, updated);
  };

  const updatePrice = (toolId: string, priceDollars: number) => {
    const current = aiToolTiers[toolId];
    if (!current) return;
    const updated = {
      ...aiToolTiers,
      [toolId]: { ...current, priceMinor: Math.round(priceDollars * 100) }
    };
    setAiToolTiers(updated);
    notifyChanges(selectedTheme, features, updated);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200">
      {/* Destination Selector & Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <MapPin size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Target Resort Destination</h2>
            <p className="text-xs text-slate-400">Configure feature availability, theming & AI monetization</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={currentDestId}
            onChange={(e) => handleDestinationChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            {destinations.map(dest => (
              <option key={dest.id} value={dest.id}>{dest.name} ({dest.location})</option>
            ))}
          </select>

          {saveStatus === 'saving' && (
            <span className="text-xs text-amber-400 animate-pulse font-medium">Syncing...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 size={14} /> Saved & Synced
            </span>
          )}
        </div>
      </div>

      {/* Theme Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Palette size={18} className="text-cyan-400" />
          Gallery UI Theme Template
        </h3>
        <p className="text-xs text-slate-400 mb-4">Choose the visual styling presented to guests in their 3D & web gallery.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { key: GalleryTheme.GLASSMORPHIC, title: 'Glassmorphic Dark', desc: 'Frosted cyan neon glass surfaces with ambient glow & deep contrast.' },
            { key: GalleryTheme.FILMSTRIP, title: 'Cinematic Filmstrip', desc: 'Warm amber tones on dark matte slate, designed for luxury resorts.' },
            { key: GalleryTheme.CLASSIC, title: 'Classic Editorial', desc: 'Clean, high-contrast crisp grid layout for fast navigation.' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => handleThemeSelect(t.key)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedTheme === t.key
                  ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-bold ${selectedTheme === t.key ? 'text-cyan-400' : 'text-white'}`}>{t.title}</span>
                {selectedTheme === t.key && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* AI Suggestion Banner */}
      <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 flex items-start gap-4">
        <div className="bg-amber-500/20 p-2 rounded-full text-amber-400 shrink-0">
          <Lightbulb size={22} />
        </div>
        <div className="flex-1">
          <h3 className="text-amber-400 font-bold text-sm mb-1">Autonomous CEO Insight</h3>
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Historical guest conversion at <span className="font-bold text-white">{activeDestination.name}</span> shows a <span className="font-bold text-amber-400">+32% revenue lift</span> when AI Reels and Magic Shots are enabled with 3D Figurine upselling.
          </p>
        </div>
        <button 
          onClick={() => {
            const updated = { ...features, enableReels: true, enableMagicShots: true, enableAiFigures: true };
            setFeatures(updated);
            notifyChanges(selectedTheme, updated, aiToolTiers);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          Apply Recommended
        </button>
      </div>

      {/* Feature Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Settings size={18} className="text-cyan-400" />
          Modular Destination Features
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key: 'enableReels', title: 'AI Auto-Reels', desc: 'Beat-synced video highlights', icon: <Video size={18} /> },
            { key: 'enableAiFigures', title: '3D Figurines', desc: 'Spatial WebGPU 3D avatar preview', icon: <Box size={18} /> },
            { key: 'enableMagicShots', title: 'Magic Shots AR', desc: 'Augmented reality overlays & characters', icon: <Wand2 size={18} /> },
            { key: 'enableFaceSearch', title: 'Biometric Face Search', desc: 'Instant selfie-based photo linking', icon: <ScanFace size={18} /> },
            { key: 'enablePhotoBooks', title: 'Printed Photo Books', desc: 'Custom souvenir albums shipped to room', icon: <BookOpen size={18} /> },
            { key: 'enableProRetouch', title: 'Pro Retouch', desc: 'AI skin smoothing & lighting boost', icon: <Paintbrush size={18} /> },
            { key: 'enableFullGalleryDownload', title: 'Full Gallery Pass', desc: 'Single-click high-res ZIP unlock', icon: <DownloadCloud size={18} /> },
            { key: 'enableSinglePhotoPurchase', title: 'Single Downloads', desc: 'À la carte photo purchase', icon: <ImageIcon size={18} /> },
          ].map(f => {
            const isEnabled = features[f.key as keyof typeof features];
            return (
              <div 
                key={f.key} 
                className={`border rounded-xl p-3.5 flex flex-col justify-between transition-all ${
                  isEnabled ? 'bg-slate-800/80 border-cyan-500/50 shadow-sm' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`p-2 rounded-lg ${isEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                    {f.icon}
                  </div>
                  <button 
                    onClick={() => toggleFeature(f.key as keyof typeof features)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${isEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${isEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isEnabled ? 'text-white' : 'text-slate-400'}`}>{f.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Tool Permissions & Monetization */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              Granular AI Permissions & Pricing Tiers
            </h3>
            <p className="text-xs text-slate-400 mt-1">Configure whether AI features are free, locked behind a paywall with custom pricing, or disabled.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(aiToolTiers).map(tier => (
            <div key={tier.toolId} className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <span className="text-xs font-bold text-white block">{tier.name}</span>
                <span className="text-[10px] text-slate-500">
                  {tier.permission === 'free' ? 'Available to all guests' : tier.permission === 'premium' ? `Paywall: $${(tier.priceMinor / 100).toFixed(2)}` : 'Hidden from UI'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {tier.permission === 'premium' && (
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                    <span className="text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0.99"
                      value={(tier.priceMinor / 100).toFixed(2)}
                      onChange={(e) => updatePrice(tier.toolId, parseFloat(e.target.value) || 0)}
                      className="w-14 bg-transparent text-xs text-amber-400 font-bold focus:outline-none"
                    />
                  </div>
                )}

                <button
                  onClick={() => cyclePermission(tier.toolId)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    tier.permission === 'free' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    tier.permission === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                  title="Click to cycle: Free → Premium → Disabled"
                >
                  {tier.permission}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
