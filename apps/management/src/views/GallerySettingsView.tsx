import { useState, useEffect } from 'react';
import { GalleryTheme, AIPermission, GalleryConfig } from '@clickflash/types';
import { Save } from 'lucide-react';

export function GallerySettingsView({ destinationId = 'default' }: { destinationId?: string }) {
  const [config, setConfig] = useState<GalleryConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:8090/api/gallery-config/${destinationId}`);
        if (res.ok) {
          const data = await res.json();
          setConfig(data.data);
        } else {
          // Default config
          setConfig({
            theme: GalleryTheme.CLASSIC,
            features: { enablePhotoBooks: false, enableReels: false, enableAiFigures: false },
            aiPermissions: []
          });
        }
      } catch (e) {
        setConfig({
          theme: GalleryTheme.CLASSIC,
          features: { enablePhotoBooks: false, enableReels: false, enableAiFigures: false },
          aiPermissions: []
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, [destinationId]);

  const saveConfig = async () => {
    if (!config) return;
    try {
      await fetch(`http://localhost:8090/api/gallery-config/${destinationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      alert('Settings saved!');
    } catch (e) {
      alert('Failed to save settings');
    }
  };

  if (isLoading || !config) return <div>Loading...</div>;

  return (
    <div className="p-8 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">⚙️ Gallery Settings</h1>
        <button onClick={saveConfig} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl flex items-center gap-2">
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Theme Configuration</h2>
            <div className="flex flex-col gap-3">
              {Object.values(GalleryTheme).map(theme => (
                <label key={theme} className="flex items-center gap-3 text-slate-300">
                  <input 
                    type="radio" 
                    name="theme" 
                    value={theme}
                    checked={config.theme === theme}
                    onChange={(e) => setConfig({ ...config, theme: e.target.value as GalleryTheme })}
                    className="w-4 h-4 text-indigo-600 bg-slate-800 border-slate-700"
                  />
                  {theme}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Feature Toggles</h2>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 text-slate-300">
                <input type="checkbox" checked={config.features.enablePhotoBooks} onChange={(e) => setConfig({...config, features: {...config.features, enablePhotoBooks: e.target.checked}})} className="rounded text-indigo-600 bg-slate-800" />
                Enable Photo Books
              </label>
              <label className="flex items-center gap-3 text-slate-300">
                <input type="checkbox" checked={config.features.enableReels} onChange={(e) => setConfig({...config, features: {...config.features, enableReels: e.target.checked}})} className="rounded text-indigo-600 bg-slate-800" />
                Enable Reels
              </label>
              <label className="flex items-center gap-3 text-slate-300">
                <input type="checkbox" checked={config.features.enableAiFigures} onChange={(e) => setConfig({...config, features: {...config.features, enableAiFigures: e.target.checked}})} className="rounded text-indigo-600 bg-slate-800" />
                Enable AI Figures
              </label>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Granular AI Permissions</h2>
            <div className="flex flex-col gap-3">
              {Object.values(AIPermission).map(perm => (
                <label key={perm} className="flex items-center gap-3 text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={config.aiPermissions.includes(perm)}
                    onChange={(e) => {
                      const newPerms = e.target.checked 
                        ? [...config.aiPermissions, perm]
                        : config.aiPermissions.filter(p => p !== perm);
                      setConfig({ ...config, aiPermissions: newPerms });
                    }}
                    className="rounded text-indigo-600 bg-slate-800"
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold text-white mb-4">Live Preview</h2>
            <div className="flex-1 bg-black rounded-lg border border-slate-700 overflow-hidden">
              <iframe 
                src="http://localhost:5176"
                className="w-full h-full border-0"
                title="Live Gallery Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
