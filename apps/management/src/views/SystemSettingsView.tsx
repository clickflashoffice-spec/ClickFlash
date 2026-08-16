import { useState, useEffect } from 'react';
import { Save, Shield, Layout, Server } from 'lucide-react';

export function SystemSettingsView() {
  const [settings, setSettings] = useState<Record<string, any>>({
    enableFaceSearch: true,
    enableRFID: true,
    kioskLogoUrl: 'https://i.imgur.com/3Y2j2s2.png',
    kioskWelcomeMessage: 'Scan Wristband to Start',
    kioskInactivityTimeout: 120,
    adminPassword: '',
  });
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`http://localhost:8090/api/settings`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const saveSettings = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`http://localhost:8090/api/settings`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ settings })
      });
      
      if (res.ok) {
        alert('Global Settings saved to Master Node!');
      } else {
        alert('Failed to save settings');
      }
    } catch (e) {
      alert('Failed to save settings');
    }
  };

  const handleToggle = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="p-8 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">⚙️ System Configuration</h1>
        <button onClick={saveSettings} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl flex items-center gap-2">
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Layout className="w-5 h-5 text-indigo-400" />
                Global Kiosk Settings
            </h2>
            <div className="flex flex-col gap-4">
               <div>
                  <label className="block text-slate-300 text-sm mb-1">Kiosk Logo URL</label>
                  <input 
                     type="text"
                     value={settings.kioskLogoUrl || ''}
                     onChange={e => setSettings({...settings, kioskLogoUrl: e.target.value})}
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
               </div>
               <div>
                  <label className="block text-slate-300 text-sm mb-1">Welcome Message</label>
                  <input 
                     type="text"
                     value={settings.kioskWelcomeMessage || ''}
                     onChange={e => setSettings({...settings, kioskWelcomeMessage: e.target.value})}
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
               </div>
               <div>
                  <label className="block text-slate-300 text-sm mb-1">Inactivity Timeout (seconds)</label>
                  <input 
                     type="number"
                     value={settings.kioskInactivityTimeout || 120}
                     onChange={e => setSettings({...settings, kioskInactivityTimeout: parseInt(e.target.value)})}
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
               </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Security & Identity
            </h2>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={settings.enableRFID} onChange={() => handleToggle('enableRFID')} className="rounded text-indigo-600 bg-slate-800" />
                Enable RFID Wristband Linking
              </label>
              <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={settings.enableFaceSearch} onChange={() => handleToggle('enableFaceSearch')} className="rounded text-indigo-600 bg-slate-800" />
                Enable Biometric Face Search (VectorDB)
              </label>
              
              <div className="mt-4 pt-4 border-t border-slate-800">
                  <label className="block text-slate-300 text-sm mb-1">Global Admin Pin / Password</label>
                  <input 
                     type="password"
                     value={settings.adminPassword || ''}
                     onChange={e => setSettings({...settings, adminPassword: e.target.value})}
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                     placeholder="Enter new admin pin..."
                  />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-400" />
              MoneyTrash Ingestion Configuration
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1">API URL</label>
                <input
                  type="text"
                  value={settings.moneytrashApiUrl || ''}
                  onChange={e => setSettings({...settings, moneytrashApiUrl: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  placeholder="https://api..."
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-1">Desk ID</label>
                <input
                  type="text"
                  value={settings.moneytrashDeskId || ''}
                  onChange={e => setSettings({...settings, moneytrashDeskId: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  placeholder="STATION-01"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">S3 Access Key</label>
                  <input
                    type="password"
                    value={settings.s3AccessKey || ''}
                    onChange={e => setSettings({...settings, s3AccessKey: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">S3 Secret Key</label>
                  <input
                    type="password"
                    value={settings.s3SecretKey || ''}
                    onChange={e => setSettings({...settings, s3SecretKey: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">S3 Region</label>
                  <input
                    type="text"
                    value={settings.s3Region || ''}
                    onChange={e => setSettings({...settings, s3Region: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    placeholder="auto"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">S3 Bucket</label>
                  <input
                    type="text"
                    value={settings.s3Bucket || ''}
                    onChange={e => setSettings({...settings, s3Bucket: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
             <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-400" />
                System Information
             </h2>
             <div className="text-sm text-slate-400 space-y-2 flex-1">
                 <p>These settings are globally applied to all connected applications across the ClickFlash network.</p>
                 <p>When you press save, the Master OS distributes these settings over the WebSocket layer to all live clients.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
