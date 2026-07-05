import React, { useState } from "react";
import useSystemSetting from "../../../hooks/useSystemSetting";
import { isPublicDomain } from "../../../utils/environment";
import { apiService } from "../../../services/apiService";
import { Destination } from "../../../types";

type ConnectionStatus = "unknown" | "testing" | "success" | "error";

const ConnectionSettings: React.FC = () => {
  const {
    value: settings,
    update: setSettings,
    isLoading: isSettingsLoading,
  } = useSystemSetting("galleryConnectionSettings", {
    url: isPublicDomain()
      ? "https://gallery.clickflash.photo"
      : "http://localhost:8093",
    key: "",
  });

  const { update: setLegacySettings } = useSystemSetting(
    "masterCloudSettings",
    {
      url: "",
      key: "",
    },
  );

  const [status, setStatus] = useState<ConnectionStatus>("unknown");
  const [_syncedPortals, setSyncedPortals] = useState<Destination[]>([]);
  const [_loadingPortals, setLoadingPortals] = useState(false);

  const fetchSyncedPortals = async () => {
    setLoadingPortals(true);
    try {
      const dests = await apiService.getDestinations();
      setSyncedPortals(dests);
    } catch (e) {
      console.error("Failed to fetch destinations", e);
    } finally {
      setLoadingPortals(false);
    }
  };

  // removed useEffect for fetchSyncedPortals to avoid auto-fail on load if not configured

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSettings = { ...settings, [e.target.name]: e.target.value };
    setSettings(newSettings);
    setLegacySettings(newSettings); // Sync legacy
    setStatus("unknown");
  };

  const handleTest = async () => {
    setStatus("testing");
    try {
      // Simple health check to the specific URL
      // We use fetch directly to bypass current pb config for the test
      const cleanUrl = settings.url.replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/api/health`);
      if (res.ok) {
        setStatus("success");
        // If test passes, we might want to reload or trigger re-config
        // forcing a reload is the easiest way to ensure pb.ts picks up new localStorage
        if (window.confirm("Connection successful! Reload to apply changes?")) {
          window.location.reload();
        }
      } else {
        setStatus("error");
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  const StatusMessage: React.FC = () => {
    switch (status) {
      case "testing":
        return (
          <div className="flex items-center space-x-2 text-blue-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span>Testing Connection...</span>
          </div>
        );
      case "success":
        return (
          <p className="text-green-500 font-semibold">✓ Connection Verified!</p>
        );
      case "error":
        return (
          <p className="text-red-500 font-semibold">
            ✗ Connection Failed. Check URL and ensure Gallery is running.
          </p>
        );
      case "unknown":
      default:
        return (
          <p className="text-slate-500">Enter Gallery URL and Admin Key.</p>
        );
    }
  };

  const inputStyles =
    "w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold";

  if (isSettingsLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mr-3"></div>
        <span>Synchronizing Cloud Config...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Customer Gallery Connection */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
          Cloud <span className="text-cyan-600">Connection</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1 max-w-2xl">
          Link this Management Portal to your Customer Gallery (Online Shop).
          This allows you to sync products, packs, and settings directly.
        </p>
      </div>
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Gallery URL
          </label>
          <input
            type="text"
            name="url"
            value={settings.url}
            onChange={handleChange}
            placeholder="e.g. http://localhost:8093"
            className={inputStyles}
          />
          <p className="text-xs text-slate-400 mt-1">
            The full URL where your Customer Gallery is accessible.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            Admin API Key
          </label>
          <input
            type="password"
            name="key"
            value={settings.key}
            onChange={handleChange}
            placeholder="Shared Secret Key"
            className={inputStyles}
          />
        </div>
        <div className="flex items-center space-x-4 pt-4">
          <button
            onClick={handleTest}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 px-6 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
          >
            Test & Save
          </button>
        </div>
        <div className="mt-4 h-6">
          <StatusMessage />
        </div>
      </div>

      {/* Section 2: Synced Info (Optional/Debug) */}
      <div className="pt-8 border-t border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
            System Status
          </h2>
          <button
            onClick={fetchSyncedPortals}
            className="text-[10px] font-black uppercase tracking-widest text-cyan-600 hover:text-cyan-500 hidden"
          >
            Refresh
          </button>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-inner">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
            Current Configured URL
          </p>
          <p className="font-mono text-sm text-slate-700">{settings.url}</p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionSettings;
