import React, { useState, useEffect } from "react";
import { HardDrive, Layers, CheckCircle2 } from "lucide-react";

interface StudioHealthStatus {
  freeSpaceGB: number;
  queueDepth: number;
  status: "optimal" | "warning" | "critical";
}

export const StudioResourceHealthHUD: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [health, setHealth] = useState<StudioHealthStatus>({
    freeSpaceGB: 124.5,
    queueDepth: 0,
    status: "optimal",
  });

  useEffect(() => {
    // Poll local master studio health telemetry
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && (window as any).api?.getSystemHealth) {
        (window as any).api.getSystemHealth().then((res: any) => {
          if (res) {
            setHealth({
              freeSpaceGB: res.freeSpaceGB ?? 124.5,
              queueDepth: res.queueDepth ?? 0,
              status: res.freeSpaceGB < 15 ? "critical" : res.freeSpaceGB < 30 ? "warning" : "optimal",
            });
          }
        }).catch(() => {});
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const badgeColor =
    health.status === "critical"
      ? "text-red-500 bg-red-500/10 border-red-500/20"
      : health.status === "warning"
      ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
      : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold cursor-default transition-all"
        title={`Studio Storage: ${health.freeSpaceGB.toFixed(1)} GB Free | RAW Processing Queue: ${health.queueDepth} jobs`}
      >
        <HardDrive className={`w-3.5 h-3.5 ${health.status === "optimal" ? "text-emerald-500" : "text-amber-500"}`} />
        <span className="text-slate-700 dark:text-slate-200">{health.freeSpaceGB.toFixed(0)} GB</span>
        {health.queueDepth > 0 && (
          <span className="flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">
            <Layers className="w-3 h-3" />
            {health.queueDepth}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 px-2.5 py-1 rounded-xl border ${badgeColor}`}>
      <HardDrive className="w-3.5 h-3.5" />
      <span className="text-xs font-bold">{health.freeSpaceGB.toFixed(1)} GB Free</span>
      {health.queueDepth > 0 ? (
        <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
          Queue: {health.queueDepth}
        </span>
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      )}
    </div>
  );
};

export default StudioResourceHealthHUD;
