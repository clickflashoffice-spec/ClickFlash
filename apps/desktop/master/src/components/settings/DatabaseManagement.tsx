import React, { useState, useEffect } from "react";
import { checkBackendHealth, pb } from "../../services/pb.ts";
import { DEFAULT_MASTER_PORT } from "../../constants.ts";
import {
  Database,
  Zap,
  RefreshCw,
  Box,
  ShieldCheck,
  Terminal,
  HardDrive,
  Save,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";

interface DbStats {
  dbFileSize: number;
  walFileSize: number;
  rowCounts: Record<string, number>;
  migrationCount: number;
  lastMigration: string;
  lastBackup: string;
  journalMode: string;
  engine: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const DatabaseManagement: React.FC = () => {
  const [status, setStatus] = useState<"online" | "offline">("offline");
  const [isAdmin, setIsAdmin] = useState(
    pb.authStore.isValid && pb.authStore.isAdmin,
  );
  const [loading, setLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [maintenanceLog, setMaintenanceLog] = useState<string[]>([]);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const checkStatus = async () => {
      const isOnline = await checkBackendHealth();
      setStatus(isOnline ? "online" : "offline");
    };
    checkStatus();
    fetchDbStats();
    const interval = setInterval(checkStatus, 30000);

    const unsubscribe = pb.authStore.onChange(() => {
      setIsAdmin(pb.authStore.isValid && pb.authStore.isAdmin);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const fetchDbStats = async () => {
    try {
      const res = await fetch(
        `http://${window.location.hostname}:${DEFAULT_MASTER_PORT}/api/system/db-stats`,
      );
      if (res.ok) {
        setDbStats(await res.json());
      }
    } catch {
      // Silently ignore network errors for stats
    }
  };

  const addLog = (msg: string) => {
    setMaintenanceLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 49),
    ]);
  };

  const handleMaintenanceAction = async (
    action: "vacuum" | "archive" | "rebuild",
    label: string,
  ) => {
    setLoading(true);
    addLog(`Starting ${label}...`);
    try {
      const res = await fetch(
        `http://${window.location.hostname}:${DEFAULT_MASTER_PORT}/api/system/${action}`,
        { method: "POST" },
      );
      if (res.ok) {
        addLog(`SUCCESS: ${label} completed successfully.`);
        showToast(`${label} completed`);
        fetchDbStats(); // Refresh stats after maintenance
      } else {
        const txt = await res.text();
        addLog(`ERROR: ${label} failed — ${txt}`);
        showToast(`${label} failed`);
      }
    } catch (err: any) {
      addLog(`ERROR: ${label} failed — ${err.message}`);
      showToast(`${label} error`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    addLog("Starting manual backup...");
    try {
      const res = await fetch(
        `http://${window.location.hostname}:${DEFAULT_MASTER_PORT}/api/system/backup`,
        { method: "POST" },
      );
      if (res.ok) {
        const data = await res.json();
        addLog(`SUCCESS: Backup created (${formatBytes(data.size)})`);
        showToast("Backup created successfully");
        fetchDbStats();
      } else {
        const txt = await res.text();
        addLog(`ERROR: Backup failed — ${txt}`);
        showToast("Backup failed");
      }
    } catch (err: any) {
      addLog(`ERROR: Backup failed — ${err.message}`);
      showToast("Backup error");
    } finally {
      setBackingUp(false);
    }
  };

  const openAdminPanel = () => {
    window.open(
      `http://${window.location.hostname}:${DEFAULT_MASTER_PORT}/_/`,
      "_blank",
    );
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
          Admin Required
        </h3>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">
          Please log in as an administrator to access the Titan Protocol
          database management suite.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-cyan-50 dark:bg-cyan-900/30 rounded-2xl text-cyan-600 dark:text-cyan-400">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Database <span className="text-cyan-600">Operations</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={`w-2 h-2 rounded-full ${status === "online" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
              />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                TITAN PROTOCOL: {status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={openAdminPanel}
          className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg w-full md:w-auto justify-center"
        >
          <RefreshCw className="w-4 h-4" />
          Admin Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Optimization */}
            <button
              disabled={loading}
              onClick={() => handleMaintenanceAction("vacuum", "Optimization")}
              className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-cyan-500/30 transition-all text-left disabled:opacity-50"
            >
              <div className="p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl text-cyan-600 dark:text-cyan-400 w-fit mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Optimize Database
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Run VACUUM and ANALYZE to reclaim space and update query plans.
              </p>
            </button>

            {/* Archival */}
            <button
              disabled={loading}
              onClick={() => handleMaintenanceAction("archive", "Archival")}
              className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-amber-500/30 transition-all text-left disabled:opacity-50"
            >
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400 w-fit mb-4 group-hover:scale-110 transition-transform">
                <Box className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Archive Old Data
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Move orders and logs older than 90 days to archive tables.
              </p>
            </button>

            {/* Manual Backup */}
            <button
              disabled={backingUp}
              onClick={handleBackup}
              className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all text-left disabled:opacity-50"
            >
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 w-fit mb-4 group-hover:scale-110 transition-transform">
                <Save className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Backup Now
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Create a compacted backup using VACUUM INTO.
              </p>
            </button>

            {/* System Rebuild */}
            <button
              disabled={loading}
              onClick={() =>
                handleMaintenanceAction("rebuild", "Full System Rebuild")
              }
              className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-red-500/30 transition-all text-left disabled:opacity-50"
            >
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400 w-fit mb-4 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Emergency Rebuild
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Optimize DB, rebuild all indices, and refresh vector index.
              </p>
            </button>
          </div>

          {/* Audit Logs */}
          <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-cyan-500" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">
                  Live Maintenance Log
                </h3>
              </div>
              <div className="px-2 py-1 bg-cyan-500/10 rounded-md">
                <span className="text-[10px] font-bold text-cyan-500 uppercase">
                  v4.1-Stable
                </span>
              </div>
            </div>
            <div className="h-48 overflow-y-auto font-mono text-[10px] space-y-1.5 custom-scrollbar">
              {maintenanceLog.length === 0 ? (
                <div className="text-slate-600 italic">
                  Ready for maintenance operations...
                </div>
              ) : (
                maintenanceLog.map((log, i) => (
                  <div
                    key={i}
                    className={`${log.includes("ERROR") ? "text-red-400" : log.includes("SUCCESS") ? "text-emerald-400" : "text-cyan-200/60"}`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Status — Live Stats */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Database Health
              </h4>
              <button
                onClick={fetchDbStats}
                title="Refresh database stats"
                className="text-slate-400 hover:text-cyan-500 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                {
                  label: "Storage Engine",
                  value: dbStats?.engine || "SQLite 3.x",
                },
                {
                  label: "Journal Mode",
                  value: dbStats?.journalMode || "WAL",
                },
                {
                  label: "DB Size",
                  value: dbStats ? formatBytes(dbStats.dbFileSize) : "—",
                },
                {
                  label: "WAL Size",
                  value: dbStats ? formatBytes(dbStats.walFileSize) : "—",
                },
                {
                  label: "Migrations",
                  value: dbStats ? `${dbStats.migrationCount} applied` : "—",
                },
                {
                  label: "Last Backup",
                  value:
                    dbStats?.lastBackup === "Never"
                      ? "Never"
                      : dbStats?.lastBackup
                        ? new Date(dbStats.lastBackup).toLocaleDateString()
                        : "—",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  <span className="text-xs text-slate-500 font-medium">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Row Counts */}
          {dbStats?.rowCounts && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <HardDrive className="w-4 h-4 text-purple-500" />
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Table Counts
                </h4>
              </div>
              <div className="space-y-3">
                {Object.entries(dbStats.rowCounts).map(([table, count]) => (
                  <div
                    key={table}
                    className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                  >
                    <span className="text-xs text-slate-500 font-mono">
                      {table}
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {count >= 0 ? count.toLocaleString() : "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Resilience Protocol
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Automatic backups are triggered daily at 03:00. Manual maintenance
              operations should only be performed during low-traffic periods to
              avoid write locks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManagement;
