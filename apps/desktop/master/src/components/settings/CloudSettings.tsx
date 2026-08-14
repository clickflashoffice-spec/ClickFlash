import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Cloud,
  RefreshCw,
  Save,
  Server,
  Shield,
  Activity,
  Database,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Tag,
  Loader2,
  Plug,
} from "lucide-react";
import {
  cloudConfigService,
  CloudConfig,
  DEFAULT_HUB_URL,
} from "../../services/api/cloudConfigService";
import { configService } from "../../services/api/configService";
import { useToast } from "../../context/ToastContext";
import { cloudService } from "../../services/api/cloudService";

const CloudSettings = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [config, setConfig] = useState<CloudConfig>({
    deskId: "",
    deskName: "",
    deskLocation: "",
    hubUrl: DEFAULT_HUB_URL,
    hubEmail: "",
    hubPassword: "",
    deskToken: "",
    galleryUrl: "",
    galleryApiKey: "",
    moneytrash: { enabled: true, retentionDays: 7, price: "15.00" },
  });

  const [cloudStatus, setCloudStatus] = useState<any>(null);
  const [connStatus, setConnStatus] = useState<
    "idle" | "testing" | "ok" | "fail"
  >("idle");
  const [connLatency, setConnLatency] = useState<number | null>(null);
  const [connError, setConnError] = useState<string | null>(null);

  // desk_id check
  const [deskIdStatus, setDeskIdStatus] = useState<
    "idle" | "checking" | "ok" | "taken" | "invalid"
  >("idle");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [cfg, status] = await Promise.all([
        cloudConfigService.load(),
        cloudService.getStatus().catch(() => null),
      ]);
      setConfig(cfg);
      setCloudStatus(status);
      setLoading(false);
    };
    init();
  }, []);

  const set = (patch: Partial<CloudConfig>) =>
    setConfig((c) => ({ ...c, ...patch }));
  const setMoneytrash = (patch: Partial<CloudConfig["moneytrash"]>) =>
    setConfig((c) => ({ ...c, moneytrash: { ...c.moneytrash, ...patch } }));

  // ── Connection Test ───────────────────────────────────────────────────────
  const handleTestConnection = useCallback(async () => {
    setConnStatus("testing");
    setConnError(null);
    const result = await cloudConfigService.testConnection(
      config.hubUrl,
      config.hubEmail,
      config.hubPassword,
    );
    if (result.ok) {
      setConnStatus("ok");
      setConnLatency(result.latencyMs ?? null);
    } else {
      setConnStatus("fail");
      setConnError(result.error || "Connection failed");
    }
  }, [config.hubUrl, config.hubEmail, config.hubPassword]);

  // ── Desk ID Check ─────────────────────────────────────────────────────────
  const handleCheckDeskId = useCallback(async () => {
    const id = config.deskId.trim();
    if (!id || !/^[a-zA-Z0-9_-]{3,64}$/.test(id)) {
      setDeskIdStatus("invalid");
      return;
    }
    setDeskIdStatus("checking");
    const result = await cloudConfigService.checkDeskId(config.hubUrl, id);
    setDeskIdStatus(result.available ? "ok" : "taken");
  }, [config.deskId, config.hubUrl]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await cloudConfigService.save(config);
      showToast("Configuration saved successfully");
    } catch (e: any) {
      showToast(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Force Sync ────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncBusy(true);
    try {
      await cloudService.triggerSync();
      showToast("Cloud sync triggered successfully");
    } catch (e: any) {
      showToast(`Sync failed: ${e.message}`);
    } finally {
      setSyncBusy(false);
    }
  };

  const handleRetention = async () => {
    setSyncBusy(true);
    try {
      await cloudService.triggerRetention();
      showToast("Retention batch processing started");
    } catch (e: any) {
      showToast(`Retention failed: ${e.message}`);
    } finally {
      setSyncBusy(false);
    }
  };

  // ── Config Export / Import ────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const data = await configService.exportConfig();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clickflash-config-${config.deskId || "master"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Configuration exported");
    } catch (e: any) {
      showToast(`Export failed: ${e.message}`);
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        await configService.importConfig(imported);
        showToast("Configuration imported. Reloading…");
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        showToast(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const inputCls =
    "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:border-gold-500 outline-none transition-colors";
  const labelCls =
    "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500 dark:text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Cloud className="w-8 h-8 text-gold-500" />
            Cloud & Hub Configuration
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Connect this Master Station to the Management Hub and configure
            retention.
          </p>
        </div>
        <div
          className={`px-4 py-2 rounded-full border flex items-center gap-2 ${
            cloudStatus?.connected
              ? "bg-green-500/10 border-green-500/20 text-green-500"
              : "bg-red-500/10 border-red-500/20 text-red-500"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span className="text-sm font-bold uppercase tracking-wider">
            {cloudStatus?.connected ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left Column: Main Config ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Station Identity */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              Station Identity
            </h2>
            <div className="space-y-4">
              {/* Desk ID */}
              <div>
                <label className={labelCls}>Desk ID (Unique)</label>
                <div className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={config.deskId}
                    onChange={(e) => {
                      set({ deskId: e.target.value });
                      setDeskIdStatus("idle");
                    }}
                    placeholder="RESORT_STATION_01"
                  />
                  <button
                    onClick={handleCheckDeskId}
                    disabled={
                      config.deskId.length < 3 || deskIdStatus === "checking"
                    }
                    className="px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors shadow-sm"
                    title="Check desk ID availability on Hub"
                  >
                    {deskIdStatus === "checking" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Check"
                    )}
                  </button>
                </div>
                {deskIdStatus === "ok" && (
                  <p className="text-emerald-400 text-xs mt-1.5">
                    ✓ Available on Hub
                  </p>
                )}
                {deskIdStatus === "taken" && (
                  <p className="text-red-400 text-xs mt-1.5">
                    ✗ Already registered — choose a different ID
                  </p>
                )}
                {deskIdStatus === "invalid" && (
                  <p className="text-amber-400 text-xs mt-1.5">
                    Only letters, numbers, - and _ (3–64 chars)
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Unique identifier for this station (e.g. RESORT_A_MASTER_1).
                </p>
              </div>

              {/* Station Name */}
              <div>
                <label className={labelCls}>Station Name</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    className={`${inputCls} pl-10`}
                    value={config.deskName}
                    onChange={(e) => set({ deskName: e.target.value })}
                    placeholder="Marbella Resort — Station 1"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Human-readable name shown in Hub fleet view and global
                  leaderboard.
                </p>
              </div>

              {/* Location */}
              <div>
                <label className={labelCls}>Location / Site</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    className={`${inputCls} pl-10`}
                    value={config.deskLocation}
                    onChange={(e) => set({ deskLocation: e.target.value })}
                    placeholder="Marbella, Spain"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  City or resort — shown on global leaderboard in Management
                  Hub.
                </p>
              </div>
            </div>
          </div>

          {/* Hub Connection */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Plug className="w-5 h-5 text-gold-500" />
              Hub Connection
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Hub URL</label>
                <input
                  type="text"
                  className={inputCls}
                  value={config.hubUrl}
                  onChange={(e) => {
                    set({ hubUrl: e.target.value });
                    setConnStatus("idle");
                  }}
                  placeholder={DEFAULT_HUB_URL}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Production: {DEFAULT_HUB_URL} | Dev: http://localhost:8787
                </p>
              </div>
              <div>
                <label className={labelCls}>Hub Account Email</label>
                <input
                  type="email"
                  className={inputCls}
                  value={config.hubEmail}
                  onChange={(e) => {
                    set({ hubEmail: e.target.value });
                    setConnStatus("idle");
                  }}
                  placeholder="desk@yourcompany.com"
                />
              </div>
              <div>
                <label className={labelCls}>Hub Account Password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={config.hubPassword}
                  onChange={(e) => {
                    set({ hubPassword: e.target.value });
                    setConnStatus("idle");
                  }}
                  placeholder="••••••••••••"
                />
              </div>

              {/* Test Connection */}
              <button
                onClick={handleTestConnection}
                disabled={!config.hubUrl || connStatus === "testing"}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors"
              >
                {connStatus === "testing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Testing…
                  </>
                ) : (
                  <>
                    <Plug className="h-4 w-4" /> Test Connection
                  </>
                )}
              </button>

              {connStatus === "ok" && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Hub reachable — {connLatency}ms
                </div>
              )}
              {connStatus === "fail" && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {connError}
                </div>
              )}
            </div>
          </div>

          {/* Customer Gallery Configuration */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-emerald-500" />
              Customer Gallery
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Gallery Public URL</label>
                <input
                  type="text"
                  className={inputCls}
                  value={config.galleryUrl}
                  onChange={(e) => set({ galleryUrl: e.target.value })}
                  placeholder="https://gallery.clickflash.io"
                />
                <p className="text-xs text-slate-500 mt-2">
                  The public URL where customers access their photos.
                </p>
              </div>
              <div>
                <label className={labelCls}>Gallery API Key</label>
                <input
                  type="password"
                  className={inputCls}
                  value={config.galleryApiKey}
                  onChange={(e) => set({ galleryApiKey: e.target.value })}
                  placeholder="cf_gal_••••••••••••"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Secret key for Master to Gallery asset synchronization.
                </p>
              </div>
            </div>
          </div>

          {/* Retention Policy */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gold-500" />
              Retention Policy (Moneytrash)
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">
                    Enable Retention Marketing
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Automatically queue unsold photos for watermarked upload.
                  </p>
                </div>
                <div
                  className={`h-6 w-12 rounded-full relative cursor-pointer transition-colors ${config.moneytrash.enabled ? "bg-gold-500" : "bg-slate-300"}`}
                  onClick={() =>
                    setMoneytrash({ enabled: !config.moneytrash.enabled })
                  }
                >
                  <div
                    className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow-lg transition-all ${config.moneytrash.enabled ? "right-1" : "left-1"}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Retention Period (Days)</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={config.moneytrash.retentionDays}
                    onChange={(e) =>
                      setMoneytrash({
                        retentionDays: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Days to keep unsold photos locally.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Price per Photo (€)</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={config.moneytrash.price}
                    onChange={(e) => setMoneytrash({ price: e.target.value })}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Sales price for retention assets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition flex items-center gap-2 shadow-md shadow-slate-200 dark:shadow-none"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Configuration
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={handleImportClick}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <Upload className="w-4 h-4" /> Import
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* ── Right Column: Sync Ops ─────────────────────────────────── */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-500" />
              Sync Operations
            </h2>
            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Last Sync
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  {cloudStatus?.lastSync
                    ? new Date(cloudStatus.lastSync).toLocaleTimeString()
                    : "Never"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Pending Uploads
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  0
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Fulfillment Queue
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  0
                </span>
              </div>
              {config.deskId && (
                <div className="flex justify-between text-sm pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">
                    Desk ID
                  </span>
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                    {config.deskId}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <button
                onClick={handleSync}
                disabled={syncBusy}
                className="w-full py-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600 shadow-sm"
              >
                <RefreshCw
                  className={`w-4 h-4 ${syncBusy ? "animate-spin" : ""}`}
                />
                Force Order Sync
              </button>
              <button
                onClick={handleRetention}
                disabled={syncBusy}
                className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-black font-bold rounded-xl hover:brightness-110 transition flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20"
              >
                <Cloud className="w-4 h-4" />
                Run Retention Batch
              </button>
            </div>
          </div>

          {/* Quick Setup Tip */}
          <div className="bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800 rounded-2xl p-4">
            <p className="text-xs text-gold-700 dark:text-gold-400 font-semibold mb-1">
              First time here?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Use the{" "}
              <span className="text-gold-600 dark:text-gold-400 font-semibold">
                4-step Setup Wizard
              </span>{" "}
              in Onboarding for guided registration with the Management Hub.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudSettings;
