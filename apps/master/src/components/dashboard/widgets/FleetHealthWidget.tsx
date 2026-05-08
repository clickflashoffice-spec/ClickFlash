import React, { useMemo } from "react";
import { StationStatus } from "../../../types/shared";
import { motion } from "framer-motion";

interface FleetHealthWidgetProps {
  status: StationStatus | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

export const FleetHealthWidget: React.FC<FleetHealthWidgetProps> = ({
  status,
  isLoading,
  onRefresh,
}) => {
  const health = status?.health;
  const sync = status?.sync;
  const identity = status?.identity;

  const healthColor = useMemo(() => {
    if (!status) return "slate";
    if (identity?.provisioningStatus === "VERIFIED") return "emerald";
    if (identity?.provisioningStatus === "PENDING_TRIAGE") return "amber";
    return "rose";
  }, [status, identity]);

  const provisioningText = useMemo(() => {
    if (!identity) return "Initializing...";
    switch (identity.provisioningStatus) {
      case "VERIFIED": return "Commissioned";
      case "PENDING_TRIAGE": return "Identity Pending";
      case "UNPROVISIONED": return "Not Registered";
      default: return "Unknown";
    }
  }, [identity]);

  const cpuColor = useMemo(() => {
    if (!health) return "slate";
    if (health.cpuLoad > 80) return "rose";
    if (health.cpuLoad > 50) return "amber";
    return "emerald";
  }, [health]);

  const tempColor = useMemo(() => {
    if (!health || health.cpuTemp === null) return "slate";
    if (health.cpuTemp > 80) return "rose";
    if (health.cpuTemp > 65) return "amber";
    return "emerald";
  }, [health]);

  const diskColor = useMemo(() => {
    if (!health) return "slate";
    if (health.diskPercent > 90) return "rose";
    if (health.diskPercent > 75) return "amber";
    return "emerald";
  }, [health]);

  const syncStatus = useMemo(() => {
    if (!sync) return { text: "Checking...", color: "slate", icon: "sync" };
    if (sync.circuit.state === "OPEN") return { text: "Circuit Interrupted", color: "rose", icon: "alert" };
    if (!sync.isConnected) return { text: "Offline", color: "rose", icon: "wifi-off" };
    if (sync.queue.pending > 100) return { text: "Heavy Queue", color: "amber", icon: "trending-up" };
    return { text: "Synchronized", color: "emerald", icon: "check-circle" };
  }, [sync]);

  return (
    <div className="glass-card overflow-hidden hover:shadow-2xl transition-all duration-500 group relative bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl">
      {/* Premium Header Decoration */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-${healthColor}-500/20 via-${healthColor}-500 to-${healthColor}-500/20 opacity-50`} />

      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-2xl bg-${healthColor}-500/10 text-${healthColor}-600 dark:text-${healthColor}-400 shadow-inner`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {identity?.deskId || "Master Terminal"}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-${healthColor}-500/10 text-${healthColor}-600 shadow-sm border border-${healthColor}-500/20`}>
                  {provisioningText}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium font-mono opacity-60">
                UID: {identity?.machineId.slice(0, 16).toUpperCase() || "IDENTIFYING..."}
              </p>
            </div>
          </div>

          <button 
            onClick={onRefresh}
            disabled={isLoading}
            className={`p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${isLoading ? 'animate-spin opacity-50' : 'hover:scale-110'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* CPU Load */}
          <div className="bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-white/20">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Process Load</p>
              <span className={`text-xs font-bold text-${cpuColor}-600`}>{health?.cpuLoad.toFixed(1) || 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full bg-${cpuColor}-500`}
                initial={{ width: 0 }}
                animate={{ width: `${health?.cpuLoad || 0}%` }}
                transition={{ type: "spring", stiffness: 50 }}
              />
            </div>
          </div>

          {/* CPU Temp */}
          <div className="bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-white/20">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Thermal Vitals</p>
              <span className={`text-xs font-bold text-${tempColor}-600`}>
                {health?.cpuTemp != null ? `${health.cpuTemp.toFixed(1)}°C` : "N/A"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full bg-${tempColor}-500`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((health?.cpuTemp || 0), 100)}%` }}
                transition={{ type: "spring", stiffness: 50 }}
              />
            </div>
          </div>

          {/* Memory */}
          <div className="bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-white/20">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">System Memory</p>
              <span className="text-xs font-bold text-blue-600">{health?.memoryPercent.toFixed(1) || 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${health?.memoryPercent || 0}%` }}
                transition={{ type: "spring", stiffness: 50 }}
              />
            </div>
          </div>

          {/* Disk */}
          <div className="bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-white/20">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Asset Storage</p>
              <span className={`text-xs font-bold text-${diskColor}-600`}>{health?.diskPercent.toFixed(1) || 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full bg-${diskColor}-500`}
                initial={{ width: 0 }}
                animate={{ width: `${health?.diskPercent || 0}%` }}
                transition={{ type: "spring", stiffness: 50 }}
              />
            </div>
          </div>
        </div>

        {/* Sync Summary Section */}
        <div className={`p-4 rounded-3xl bg-${syncStatus.color}-500/5 border border-${syncStatus.color}-500/10`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full bg-${syncStatus.color}-500 animate-pulse`} />
              <span className={`text-xs font-bold text-${syncStatus.color}-600 uppercase tracking-wide`}>
                {syncStatus.text}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              LATENCY: {health?.networkLatency.toFixed(0) || 0}ms
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 px-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Queue Backlog</p>
              <p className="text-xl font-black text-slate-800 dark:text-white leading-none">
                {sync?.queue.pending || 0}
                <span className="text-[10px] ml-1 opacity-40 font-bold uppercase">Ops</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dead Letters</p>
              <p className={`text-xl font-black ${(sync?.queue.failed || 0) > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-white'} leading-none`}>
                {sync?.queue.failed || 0}
                <span className="text-[10px] ml-1 opacity-40 font-bold uppercase">Err</span>
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-500/10 flex justify-between items-center text-[10px] text-slate-500 font-medium">
            <span>UPTIME: {((health?.uptime || 0) / 3600).toFixed(1)}h</span>
            <span className="opacity-60">
              LAST UPLOAD: {sync?.lastSync ? new Date(sync.lastSync).toLocaleTimeString() : "PENDING"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
