import { Card } from "@clickflash/ui";
import React, { useState, useEffect } from "react";
import {
  Database,
  Trash2,
  History,
  HardDrive,
  RefreshCw,
  Gauge,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

import { apiService } from "../../services/apiService";
import { logger } from "../../utils/logger";

interface RetentionStats {
  disk: {
    usedPercent: number;
    totalGb: number;
    availableGb: number;
  };
  database: {
    mainSize: number;
    archiveSize: number;
  };
  recycler: {
    archivedAlbumsCount: number;
    oldestArchivedAlbum: string;
    scrubQueueSize: number;
  };
}

const DataManagementSettings: React.FC = () => {
  const [retentionSettings, setRetentionSettings] = useState({
    hiResDays: 14,
    tieredDays: 60,
    auditDays: 90,
    cloudSyncRequired: true,
    fulfillmentLock: true
  });
  
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hiRes, tiered, audit, cloud, lock, statsData] = await Promise.all([
        apiService.getSetting("retention_days_hi_res"),
        apiService.getSetting("retention_days_tiered"),
        apiService.getSetting("retention_days_audit"),
        apiService.getSetting("retention_cloud_sync_required"),
        apiService.getSetting("retention_fulfillment_lock"),
        (apiService as any).get("/retention/stats")
      ]);

      setRetentionSettings({
        hiResDays: parseInt(String(hiRes || "14")),
        tieredDays: parseInt(String(tiered || "60")),
        auditDays: parseInt(String(audit || "90")),
        cloudSyncRequired: String(cloud) === "true",
        fulfillmentLock: String(lock) === "true"
      });
      
      setStats(statsData);
    } catch (err) {
      logger.error("[RetentionSettings] Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        apiService.setSetting("retention_days_hi_res", String(retentionSettings.hiResDays)),
        apiService.setSetting("retention_days_tiered", String(retentionSettings.tieredDays)),
        apiService.setSetting("retention_days_audit", String(retentionSettings.auditDays)),
        apiService.setSetting("retention_cloud_sync_required", String(retentionSettings.cloudSyncRequired)),
        apiService.setSetting("retention_fulfillment_lock", String(retentionSettings.fulfillmentLock))
      ]);
      alert("Retention policies successfully deployed.");
    } catch (err) {
      logger.error("[RetentionSettings] Save failed", err);
      alert("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualScrub = async () => {
    if (!window.confirm("WARNING: This will physically delete original files for archived albums based on your policy. This is irreversible. Proceed?")) return;
    
    setScrubbing(true);
    try {
      await (apiService as any).post("/recycler/scrub", {});
      alert("Industrial scrub cycle completed successfully.");
      fetchData();
    } catch (err) {
      logger.error("[RetentionSettings] Scrub failed", err);
    } finally {
      setScrubbing(false);
    }
  };

  const handlePruneSessions = async () => {
    if (!confirm("This will delete kiosk sessions older than 24 hours. Continue?")) return;
    try {
      const res = await (apiService as any).post("/system/prune-sessions", { hours: 24 });
      alert(res.message || "Sessions pruned.");
    } catch (e: any) {
      alert("Failed to prune sessions: " + e.message);
    }
  };

  if (loading && !stats) return <div className="p-8 text-center text-slate-500">Initializing Recycler Metrics...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Data Retention & Recycler</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage asset lifecycle and local disk pressure</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={fetchData}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Recycler Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900 border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-slate-800 dark:text-white">Disk Utilization</h3>
          </div>
          <div className="space-y-4">
            <div className="relative pt-1">
              <div className="flex items-center justify-between mb-2 text-xs font-semibold uppercase">
                <span className="text-blue-600 dark:text-blue-400">Total Usage</span>
                <span className="text-blue-600 dark:text-blue-400">{stats?.disk.usedPercent.toFixed(1)}%</span>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200 dark:bg-blue-900/40">
                <div style={{ width: `${stats?.disk.usedPercent}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
              </div>
            </div>
            <p className="text-xs text-slate-500">{stats?.disk.availableGb.toFixed(1)}GB free of {stats?.disk.totalGb.toFixed(1)}GB</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-slate-900 border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-purple-500" />
            <h3 className="font-bold text-slate-800 dark:text-white">Database Health</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Master DB:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{stats?.database.mainSize.toFixed(1)} MB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Archive DB:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{stats?.database.archiveSize.toFixed(1)} MB</span>
            </div>
            <div className="mt-2 pt-2 border-t border-purple-100 dark:border-purple-900/30">
              <p className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-bold">Rule 20 Compliance: VACUUM Weekly</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-800 dark:text-white">Scrub Queue</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Archived Albums:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats?.recycler.archivedAlbumsCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Oldest in Queue:</span>
              <span className="font-mono text-[10px] text-slate-800 dark:text-slate-200">{stats?.recycler.oldestArchivedAlbum}</span>
            </div>
            <button 
              onClick={handleManualScrub}
              disabled={scrubbing}
              className="mt-2 w-full flex items-center justify-center gap-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {scrubbing ? 'Running Scrub...' : 'Run Manual Scrub'}
            </button>
          </div>
        </Card>
      </div>

      {/* Retention Policies */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recycler Policies</h3>
            <p className="text-sm text-slate-500">Configure how long assets persist on this local station</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Original Hi-Res Retention (Days)</label>
              <input 
                type="number" 
                value={retentionSettings.hiResDays}
                onChange={(e) => setRetentionSettings({...retentionSettings, hiResDays: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <p className="mt-1.5 text-xs text-slate-500 italic">Full-resolution source files (Approx. 5-15MB each)</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Lightweight Tiers Retention (Days)</label>
              <input 
                type="number" 
                value={retentionSettings.tieredDays}
                onChange={(e) => setRetentionSettings({...retentionSettings, tieredDays: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <p className="mt-1.5 text-xs text-slate-500 italic">Previews and thumbnails (Approx. 200KB each)</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Audit & Diagnostic Logs Retention (Days)</label>
              <input 
                type="number" 
                value={retentionSettings.auditDays}
                onChange={(e) => setRetentionSettings({...retentionSettings, auditDays: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Apex Fulfillment Safeguards
              </h4>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="pt-0.5">
                    <input 
                      type="checkbox" 
                      checked={retentionSettings.fulfillmentLock}
                      onChange={(e) => setRetentionSettings({...retentionSettings, fulfillmentLock: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">Fulfillment Lock</span>
                    <span className="text-xs text-slate-500">Prevent deletion of any assets belonging to albums with pending, unfulfilled, or unexported orders.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="pt-0.5">
                    <input 
                      type="checkbox" 
                      checked={retentionSettings.cloudSyncRequired}
                      onChange={(e) => setRetentionSettings({...retentionSettings, cloudSyncRequired: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">Cloud Sync Verification</span>
                    <span className="text-xs text-slate-500">Recycler will wait until album metadata is cryptographically verified by the Management Hub before purging.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
               <button 
                  onClick={handlePruneSessions}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors"
                >
                  Prune Stuck Sessions
                </button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Warning: Assets purged by the recycler cannot be recovered from the local machine.</span>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/20"
          >
            {isSaving ? 'Deploying...' : 'Update Policies'}
          </button>
        </div>
      </Card>

      <div className="p-6 bg-slate-100 dark:bg-slate-800/40 rounded-2xl flex flex-col items-center text-center">
        <Database className="w-8 h-8 text-slate-400 mb-3" />
        <h4 className="font-bold text-slate-800 dark:text-white mb-1">Industrial Data Integrity</h4>
        <p className="text-sm text-slate-500 max-w-lg mb-4">ClickFlash implements GDPR-compliant one-way data flow. Archived metadata is preserved in a decoupled SQLite archive database, while physical assets are rotated to maintain peak disk performance (Law 15).</p>
      </div>
    </div>
  );
};

export default DataManagementSettings;
