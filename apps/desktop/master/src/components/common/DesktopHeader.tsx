import React from "react";
import { Search, Command, Shield } from "lucide-react";
import { useGlobalSearch } from "../../context/GlobalSearchContext";
import NetworkStatusIndicator from "./NetworkStatusIndicator";
import ThermalMonitor from "./ThermalMonitor";
import StudioResourceHealthHUD from "./StudioResourceHealthHUD";
import { CloudStatusIndicator } from "./CloudStatusIndicator";
import { Photographer } from "../../types";
import { pb } from "../../services/pb";

interface DesktopHeaderProps {
  currentUser: Photographer;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({ currentUser }) => {
  const { toggle } = useGlobalSearch();

  return (
    <header role="banner" className="hidden md:flex items-center justify-between px-6 py-4 glass-panel border-x-0 border-t-0 rounded-none sticky top-0 z-30 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md shadow-sm no-print border-b border-slate-200/50 dark:border-zinc-800/50 transition-colors duration-300">
      {/* Left: Mock Search Bar */}
      <div className="flex-1 max-w-md">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-slate-100/50 hover:bg-slate-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400 shadow-inner active:scale-[0.99] transition-all duration-200"
          title="Search anything... (Press /)"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4" />
            <span className="text-sm font-medium">Search...</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-350/10 dark:border-zinc-700/50">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right: Active indicators & User Profile */}
      <div className="flex items-center gap-4 pl-4">
        {/* Indicators Group */}
        <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-zinc-900/50 border border-slate-200/40 dark:border-zinc-800/45 px-3 py-1.5 rounded-2xl shadow-inner">
          {/* @ts-ignore */}
<NetworkStatusIndicator compact />
          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />
          {/* @ts-ignore */}
<ThermalMonitor compact />
          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />
          <StudioResourceHealthHUD compact />
          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />
          <CloudStatusIndicator size="small" />
        </div>

        {/* User Mini Badge */}
        <div className="flex items-center gap-3 border-l border-slate-200/60 dark:border-zinc-800/80 pl-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
              {currentUser.name}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550 flex items-center gap-1">
              {currentUser.role === "Admin" && <Shield className="w-2.5 h-2.5 text-blue-500" />}
              {currentUser.role}
            </span>
          </div>
          <div className="relative">
            <img
              src={
                currentUser.avatarUrl
                  ? (currentUser.avatarUrl.startsWith("http") || currentUser.avatarUrl.startsWith("data:")
                    ? currentUser.avatarUrl
                    : `${pb.baseUrl}${currentUser.avatarUrl.startsWith("/") ? "" : "/"}${currentUser.avatarUrl}`)
                  : "https://i.imgur.com/3Y2j2s2.png"
              }
              alt={currentUser.name}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-md object-cover ring-2 ring-blue-500/10"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== "https://i.imgur.com/3Y2j2s2.png") {
                  target.src = "https://i.imgur.com/3Y2j2s2.png";
                }
              }}
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-950 shadow-md"></div>
          </div>
        </div>
      </div>
    </header>
  );
};
