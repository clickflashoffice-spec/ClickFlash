import React, { useState } from 'react';
import { 
  Video, 
  Box, 
  Wand2, 
  Sparkles, 
  Paintbrush, 
  BookOpen, 
  MonitorPlay, 
  DownloadCloud, 
  Image as ImageIcon,
  Settings,
  Info,
  Lightbulb
} from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface AIToolPermission {
  id: string;
  title: string;
  isPremium: boolean;
}

export const GalleryConfigPanel: React.FC = () => {
  const [features, setFeatures] = useState<Feature[]>([
    { id: 'reels', title: 'AI Auto-Reels', description: 'Automatically generate engaging video reels from gallery photos.', icon: <Video size={20} />, enabled: false },
    { id: '3d', title: '3D Figurines', description: 'Offer 3D printed figurines from multi-angle shots.', icon: <Box size={20} />, enabled: false },
    { id: 'magic', title: 'Magic Shots AR', description: 'Add augmented reality elements and characters to photos.', icon: <Wand2 size={20} />, enabled: false },
    { id: 'enhance', title: 'AI Enhancement', description: 'Automatic lighting, color, and sharpness correction.', icon: <Sparkles size={20} />, enabled: true },
    { id: 'retouch', title: 'Pro Retouch', description: 'Advanced blemish removal and skin smoothing.', icon: <Paintbrush size={20} />, enabled: true },
    { id: 'books', title: 'Photo Books', description: 'Custom printed photo books mailed to guests.', icon: <BookOpen size={20} />, enabled: false },
    { id: 'slideshow', title: 'Slideshows', description: 'Digital slideshows with music and transitions.', icon: <MonitorPlay size={20} />, enabled: true },
    { id: 'full-dl', title: 'Full Gallery Download', description: 'Allow guests to download all their photos at once.', icon: <DownloadCloud size={20} />, enabled: true },
    { id: 'single-pic', title: 'Single Photo Purchase', description: 'Allow à la carte digital or print photo purchases.', icon: <ImageIcon size={20} />, enabled: true },
  ]);

  const [aiPermissions, setAiPermissions] = useState<AIToolPermission[]>([
    { id: 'reels-perm', title: 'AI Auto-Reels', isPremium: true },
    { id: 'enhance-perm', title: 'AI Enhancement', isPremium: false },
    { id: 'magic-perm', title: 'Magic Shots AR', isPremium: true },
  ]);

  const toggleFeature = (id: string) => {
    setFeatures(features.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const togglePermission = (id: string) => {
    setAiPermissions(aiPermissions.map(p => p.id === id ? { ...p, isPremium: !p.isPremium } : p));
  };

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200">
      {/* AI Suggestion Banner */}
      <div className="bg-amber-950/40 border border-amber-500/50 rounded-lg p-4 flex items-start gap-4">
        <div className="bg-amber-500/20 p-2 rounded-full text-amber-400 shrink-0">
          <Lightbulb size={24} />
        </div>
        <div>
          <h3 className="text-amber-400 font-semibold text-lg mb-1">AI Suggestion</h3>
          <p className="text-amber-200/80">
            Based on past performance at this location, we recommend enabling Reels and Magic Shots for a projected <span className="font-bold text-amber-400">+32% revenue increase</span>.
          </p>
        </div>
        <button 
          onClick={() => {
            toggleFeature('reels');
            toggleFeature('magic');
          }}
          className="ml-auto mt-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-medium px-4 py-2 rounded transition-colors whitespace-nowrap"
        >
          Apply Suggestion
        </button>
      </div>

      {/* Feature Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Settings size={24} className="text-cyan-400" />
          À la carte Gallery Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(feature => (
            <div 
              key={feature.id} 
              className={`border rounded-lg p-4 flex flex-col gap-3 transition-colors ${feature.enabled ? 'bg-slate-800/80 border-cyan-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${feature.enabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                  {feature.icon}
                </div>
                {/* Toggle Switch */}
                <button 
                  onClick={() => toggleFeature(feature.id)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${feature.enabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${feature.enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <div>
                <h4 className={`font-medium ${feature.enabled ? 'text-slate-100' : 'text-slate-300'}`}>{feature.title}</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Tool Permissions */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Wand2 size={24} className="text-amber-400" />
          AI Tool Permissions
        </h2>
        <p className="text-slate-400 text-sm mb-6">Choose whether AI features are provided for free or kept behind a premium paywall for guests.</p>
        
        <div className="space-y-3">
          {aiPermissions.map(perm => (
            <div key={perm.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="font-medium text-slate-200">{perm.title}</span>
              <div className="flex bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => togglePermission(perm.id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${!perm.isPremium ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Free
                </button>
                <button 
                  onClick={() => togglePermission(perm.id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${perm.isPremium ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Premium <Info size={14} className={perm.isPremium ? 'text-amber-900' : ''} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
