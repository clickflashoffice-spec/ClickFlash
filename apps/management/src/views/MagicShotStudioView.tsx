import { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  Compass, 
  Zap, 
  Plus, 
  Sliders, 
  TrendingUp, 
  DollarSign, 
  RefreshCw 
} from 'lucide-react';
import { MagicShotTemplate } from '@clickflash/types';

const INITIAL_TEMPLATES: MagicShotTemplate[] = [
  {
    id: 'magic-shot-dragon-burst',
    destinationId: 'LOCAL_DEST',
    attractionId: 'roller-coaster-peak',
    name: 'Inferno Dragon Magic Shot',
    description: 'An enchanted fire dragon swoops overhead with glowing embers and dynamic motion smoke trails.',
    category: 'character_composite',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=60',
    samplePreviewUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
    watermarkEnabled: true,
    premiumUpsellPriceCents: 999,
    isActive: true,
    depthThreshold: 0.45,
    requiredPoseGuidance: 'Look up in awe and point towards the sky!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: 'layer-bg-smoke',
        type: 'background',
        assetUrl: '/assets/vfx/smoke_plume.png',
        zIndex: 1,
        opacity: 0.85,
        position: { x: 0.5, y: 0.2, scale: 1.2 }
      },
      {
        id: 'layer-dragon-char',
        type: 'animated_character',
        assetUrl: '/assets/characters/inferno_dragon.png',
        zIndex: 2,
        opacity: 1.0,
        position: { x: 0.7, y: 0.25, scale: 0.9 }
      }
    ]
  },
  {
    id: 'magic-shot-galaxy-portal',
    destinationId: 'LOCAL_DEST',
    attractionId: 'space-voyager',
    name: 'Celestial Galaxy Portal',
    description: 'A swirling cosmic wormhole opens up behind guests with starlight refraction.',
    category: 'spatial_3d_portal',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=400&auto=format&fit=crop&q=60',
    samplePreviewUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
    watermarkEnabled: true,
    premiumUpsellPriceCents: 1299,
    isActive: true,
    depthThreshold: 0.5,
    requiredPoseGuidance: 'Reach out as if stepping through a cosmic gateway!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: 'layer-vortex',
        type: 'background',
        assetUrl: '/assets/vfx/galaxy_vortex.png',
        zIndex: 0,
        opacity: 0.95,
        position: { x: 0.5, y: 0.5, scale: 1.4 }
      }
    ]
  },
  {
    id: 'magic-shot-lightning-speed',
    destinationId: 'LOCAL_DEST',
    attractionId: 'hyper-drop',
    name: 'Coaster Thunder Speed',
    description: 'Electric storm lightning bursts and motion blur velocity ribbons.',
    category: 'ride_action_burst',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400&auto=format&fit=crop&q=60',
    samplePreviewUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
    watermarkEnabled: true,
    premiumUpsellPriceCents: 799,
    isActive: true,
    depthThreshold: 0.4,
    requiredPoseGuidance: 'Hands in the air with high energy!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: 'lightning-bolts',
        type: 'overlay_particle',
        assetUrl: '/assets/vfx/lightning.png',
        zIndex: 8,
        opacity: 0.85,
        position: { x: 0.5, y: 0.5, scale: 1.1 }
      }
    ]
  }
];

export function MagicShotStudioView() {
  const [templates, setTemplates] = useState<MagicShotTemplate[]>(INITIAL_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<MagicShotTemplate>(INITIAL_TEMPLATES[0]);
  const [isSimulatingRender, setIsSimulatingRender] = useState(false);

  const toggleTemplateActive = (id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
    if (selectedTemplate.id === id) {
      setSelectedTemplate(prev => ({ ...prev, isActive: !prev.isActive }));
    }
  };

  const handleSimulateRender = () => {
    setIsSimulatingRender(true);
    setTimeout(() => {
      setIsSimulatingRender(false);
    }, 1000);
  };

  return (
    <div className="space-y-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-lg shadow-indigo-950/50">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            Magic Shot VFX & WebXR Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure autonomous edge AI scene segmentation, 3D character overlays, and depth parallax templates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleSimulateRender}
            disabled={isSimulatingRender}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isSimulatingRender ? 'animate-spin' : ''}`} />
            <span>Test Edge Pipeline</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/50 transition">
            <Plus className="w-4 h-4" />
            <span>Create New Template</span>
          </button>
        </div>
      </div>

      {/* Edge AI Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Templates</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white">{templates.filter(t => t.isActive).length} / {templates.length}</p>
          <p className="text-xs text-emerald-400 font-semibold mt-1">100% Ready for live guest render</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Edge Render Latency</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">418 ms</p>
          <p className="text-xs text-slate-400 font-semibold mt-1">BiRefNet monocular depth map</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Magic Shot Conversion Lift</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">+38.4%</p>
          <p className="text-xs text-emerald-400 font-semibold mt-1">vs regular static photo sales</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">VFX Upsell Revenue (Today)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">$4,820.00</p>
          <p className="text-xs text-emerald-400 font-semibold mt-1">+19.2% from automated WhatsApp reels</p>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Template Catalog */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">
            Attraction Templates
          </h2>
          <div className="space-y-3">
            {templates.map(tmpl => {
              const isSelected = selectedTemplate.id === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/40' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={tmpl.thumbnailUrl} 
                      alt={tmpl.name}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-700" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white truncate">{tmpl.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tmpl.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {tmpl.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{tmpl.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-400">
                        <span className="text-cyan-400">${(tmpl.premiumUpsellPriceCents / 100).toFixed(2)}</span>
                        <span>•</span>
                        <span>{tmpl.layers.length} VFX Layers</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Template Inspector & Live Layers Config */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  {selectedTemplate.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Template ID: {selectedTemplate.id}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleTemplateActive(selectedTemplate.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    selectedTemplate.isActive 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {selectedTemplate.isActive ? 'Active on Edge Node' : 'Activate Template'}
                </button>
              </div>
            </div>

            {/* Preview Banner */}
            <div className="relative rounded-2xl overflow-hidden h-64 bg-slate-950 border border-slate-800 flex items-center justify-center">
              <img 
                src={selectedTemplate.samplePreviewUrl} 
                alt={selectedTemplate.name}
                className="w-full h-full object-cover opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                <div>
                  <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Photographer Pose Guidance</p>
                  <p className="text-sm font-semibold">{selectedTemplate.requiredPoseGuidance || 'Standard resort group portrait'}</p>
                </div>
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>3D WebXR Parallax Depth: {selectedTemplate.depthThreshold || 0.5}</span>
                </div>
              </div>
            </div>

            {/* Layer Stack */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                VFX Layer Composition Stack
              </h3>
              <div className="space-y-2.5">
                {selectedTemplate.layers.map((layer, idx) => (
                  <div 
                    key={layer.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-slate-200 uppercase tracking-wider">{layer.type.replace('_', ' ')}</p>
                        <p className="text-slate-400 text-[11px] font-mono truncate max-w-xs">{layer.assetUrl}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400 font-medium">
                      <span>Opacity: {Math.round(layer.opacity * 100)}%</span>
                      <span>Scale: {layer.position.scale}x</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-cyan-300 uppercase">z-index: {layer.zIndex}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
