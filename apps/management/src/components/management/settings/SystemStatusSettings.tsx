import React, { useState } from 'react';
import {
  Activity,
  Database,
  Server,
  Cloud,
  HardDrive,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface SystemStatus {
  database: { status: "online" | "offline" | "degraded"; message: string };
  cloudSync: { status: "online" | "offline" | "degraded"; message: string };
  storage: { used: number; total: number; unit: string };
  apiLatency: number;
  lastBackup: string;
  version: string;
}

const SystemStatusSettings: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>({
    database: { status: "online", message: "D1 Database connected" },
    cloudSync: { status: "online", message: "Cloudflare Workers active" },
    storage: { used: 47.2, total: 100, unit: "GB" },
    apiLatency: 45,
    lastBackup: new Date().toISOString(),
    version: "4.2.0",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshStatus = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setStatus({ ...status, apiLatency: Math.floor(Math.random() * 100) + 20 });
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "degraded":
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case "offline":
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      online: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      degraded: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      offline: "bg-red-500/10 text-red-400 border-red-500/30",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-bold uppercase border ${classes[status as keyof typeof classes] || classes.online}`}
      >
        {status}
      </span>
    );
  };

  const storagePercentage = (status.storage.used / status.storage.total) * 100;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase flex items-center gap-3">
            <Activity className="w-6 h-6 text-cyan-400" />
            System <span className="text-cyan-400">Status</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Monitor system health and service status
          </p>
        </div>
        <button
          onClick={refreshStatus}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database Status */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <Database className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-300">Database</h3>
                <p className="text-xs text-slate-500">Cloudflare D1</p>
              </div>
            </div>
            {getStatusBadge(status.database.status)}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {getStatusIcon(status.database.status)}
            <span>{status.database.message}</span>
          </div>
        </div>

        {/* Cloud Sync Status */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <Cloud className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-300">
                  Cloud Services
                </h3>
                <p className="text-xs text-slate-500">Workers & R2</p>
              </div>
            </div>
            {getStatusBadge(status.cloudSync.status)}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {getStatusIcon(status.cloudSync.status)}
            <span>{status.cloudSync.message}</span>
          </div>
        </div>

        {/* API Latency */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <Server className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-300">
                  API Latency
                </h3>
                <p className="text-xs text-slate-500">Response Time</p>
              </div>
            </div>
            <span
              className={`text-lg font-bold ${status.apiLatency < 50 ? "text-emerald-400" : status.apiLatency < 100 ? "text-amber-400" : "text-red-400"}`}
            >
              {status.apiLatency}ms
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${status.apiLatency < 50 ? "bg-emerald-500" : status.apiLatency < 100 ? "bg-amber-500" : "bg-red-500"}`}
              style={
                {
                  "--tw-progress": `${Math.min((status.apiLatency / 200) * 100, 100)}%`,
                } as React.CSSProperties
              }
            ></div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <HardDrive className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-300">Storage</h3>
                <p className="text-xs text-slate-500">R2 Bucket Usage</p>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-300">
              {status.storage.used}
              {status.storage.unit}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${storagePercentage > 80 ? "bg-red-500" : storagePercentage > 60 ? "bg-amber-500" : "bg-cyan-500"}`}
              style={
                {
                  "--tw-progress": `${storagePercentage}%`,
                } as React.CSSProperties
              }
            ></div>
          </div>
          <p className="text-xs text-slate-500">
            {storagePercentage.toFixed(1)}% of {status.storage.total}
            {status.storage.unit} used
          </p>
        </div>
      </div>

      {/* System Info */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
          System Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Version</p>
            <p className="text-sm font-bold text-slate-300">
              v{status.version}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Environment</p>
            <p className="text-sm font-bold text-emerald-400">Production</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Region</p>
            <p className="text-sm font-bold text-slate-300">Global (CDN)</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Last Backup</p>
            <p className="text-sm font-bold text-slate-300">
              {new Date(status.lastBackup).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium transition-all">
            Run Diagnostics
          </button>
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-all">
            View Logs
          </button>
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-all">
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusSettings;
