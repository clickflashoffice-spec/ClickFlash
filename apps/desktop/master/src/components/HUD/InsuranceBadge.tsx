import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, Cpu, Activity } from "lucide-react";
import { SentinelTelemetry, PhotoInsuranceResult } from "@clickflash/ai-core";

export const InsuranceBadge: React.FC = () => {
  const [telemetry, setTelemetry] = useState<SentinelTelemetry | null>(null);
  const [activeAlert, setActiveAlert] = useState<PhotoInsuranceResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isThrottling, setIsThrottling] = useState(false);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("/api/insurance/telemetry");
        if (res.ok) {
          const data = await res.json();
          setTelemetry(data.telemetry);
        }
      } catch {
        // Sentinel offline fallback
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleThrottle = async () => {
    try {
      const nextState = !telemetry?.isThrottled;
      setIsThrottling(true);
      const res = await fetch("/api/insurance/throttle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isThrottled: nextState })
      });
      if (res.ok) {
        setTelemetry((prev: SentinelTelemetry | null) => prev ? { ...prev, isThrottled: nextState } : null);
      }
    } finally {
      setIsThrottling(false);
    }
  };

  const isOnline = telemetry?.masterOnline ?? false;
  const bufferedCount = telemetry?.bufferedPhotosCount ?? 0;

  return (
    <div className="relative inline-block">
      {/* HUD Pill Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all duration-300 shadow-sm ${
          isOnline
            ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300 hover:border-emerald-500/60"
            : "bg-amber-950/60 border-amber-500/30 text-amber-300 hover:border-amber-500/60"
        }`}
      >
        {isOnline ? (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        ) : (
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span>{isOnline ? "AI Sentinel Active" : "Sentinel Standby"}</span>
        {bufferedCount > 0 && (
          <span className="bg-amber-500 text-black text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {bufferedCount} Spooled
          </span>
        )}
      </button>

      {/* Floating Quality Warning Toast if active */}
      {activeAlert && (
        <div className="fixed top-6 right-6 z-50 flex items-start p-4 bg-red-950/90 border border-red-500/50 rounded-xl backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-4 duration-300 max-w-sm">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 mr-3" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-200 uppercase tracking-wide">
              Quality Insurance Warning
            </h4>
            <p className="text-xs text-red-300/90 mt-1">
              Photo <span className="font-mono font-bold text-white">{activeAlert.photoId}</span>:{" "}
              {activeAlert.recommendedAction}
            </p>
            <div className="flex items-center space-x-3 mt-2 text-[11px] text-red-400/80">
              <span>Focus: {activeAlert.laplacianScore}</span>
              <span>Exposure: {Math.round(activeAlert.exposureScore * 100)}%</span>
            </div>
          </div>
          <button
            onClick={() => setActiveAlert(null)}
            className="text-red-400 hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Popover Flyout Details */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 p-4 bg-slate-900/95 border border-slate-700/60 rounded-2xl backdrop-blur-2xl shadow-2xl z-40 text-slate-200 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-100">AI Sentinel & Ingest Insurer</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              v1.0 Sentinel
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Uptime:</span>
              </span>
              <span className="font-mono text-slate-200">
                {telemetry?.uptimeSeconds ? `${Math.floor(telemetry.uptimeSeconds / 60)}m ${Math.floor(telemetry.uptimeSeconds % 60)}s` : "0s"}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>CPU Load:</span>
              </span>
              <span className="font-mono text-slate-200">
                {telemetry?.cpuLoadPercent ?? 0}%
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Immutable Journal Records:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {telemetry?.journalEntriesCount ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Emergency Spool Buffer:</span>
              <span className={`font-mono font-bold ${bufferedCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
                {bufferedCount} Photos
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={handleToggleThrottle}
              disabled={isThrottling}
              className={`w-full py-2 px-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                telemetry?.isThrottled
                  ? "bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30"
                  : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isThrottling ? "animate-spin" : ""}`} />
              <span>
                {telemetry?.isThrottled ? "AI Throttling Active (120 FPS UI Mode)" : "Normal AI Processing"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
