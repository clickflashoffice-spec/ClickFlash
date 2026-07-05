import React, { memo } from 'react';
import { Settings } from 'lucide-react';
import { AppSettings } from '@/types';

interface Props {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isNativeMode: boolean;
  setIsNativeMode: (val: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = memo(({
  settings,
  setSettings,
  isNativeMode,
  setIsNativeMode,
  onSave,
  onClose
}) => {
  return (
    <div className="max-w-6xl mx-auto mb-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold mb-4 text-zinc-300 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        Application Settings
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
              Cloud Hub URL (API)
            </label>
            <input
              type="text"
              value={settings.apiUrl}
              onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
              placeholder="https://cloud.clickflash.app"
              className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
              Station ID (Desk ID)
            </label>
            <input
              type="text"
              value={settings.deskId}
              onChange={(e) => setSettings({ ...settings, deskId: e.target.value.toUpperCase() })}
              placeholder="STATION-01"
              className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none transition-colors font-mono"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cloud Storage (R2/S3-Compatible)</h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="password"
                value={settings.s3AccessKey || ''}
                onChange={(e) => setSettings({ ...settings, s3AccessKey: e.target.value })}
                placeholder="Access Key"
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
              />
              <input
                type="password"
                value={settings.s3SecretKey || ''}
                onChange={(e) => setSettings({ ...settings, s3SecretKey: e.target.value })}
                placeholder="Secret Key"
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={settings.s3Region || ''}
                onChange={(e) => setSettings({ ...settings, s3Region: e.target.value })}
                placeholder="Region (e.g. auto)"
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
              />
              <input
                type="text"
                value={settings.s3Bucket || ''}
                onChange={(e) => setSettings({ ...settings, s3Bucket: e.target.value })}
                placeholder="Bucket Name"
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>
            <div>
              <input
                type="text"
                value={settings.s3Endpoint || ''}
                onChange={(e) => setSettings({ ...settings, s3Endpoint: e.target.value })}
                placeholder="Custom Endpoint (e.g. R2 endpoint)"
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.saveHistory}
                onChange={(e) => setSettings({ ...settings, saveHistory: e.target.checked })}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="text-sm text-zinc-400">Save upload history locally</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isNativeMode}
                onChange={(e) => setIsNativeMode(e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="text-sm text-zinc-400">Enable High-Performance Native Picker</span>
            </label>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg text-sm transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
});

SettingsModal.displayName = 'SettingsModal';
