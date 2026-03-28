import React from "react";
import { Globe, HardDrive, ChevronDown } from "lucide-react";
import { useStation } from "../../context/StationContext";

export const StationSelector: React.FC = () => {
  const { selectedStationId, setSelectedStationId, stations, loading } = useStation();

  if (loading) return <div className="animate-pulse w-32 h-8 bg-slate-800 rounded-lg"></div>;

  const currentStation = stations.find(s => s.id === selectedStationId);

  return (
    <div className="relative group">
      <div className="flex items-center gap-3 py-2 px-4 bg-slate-950/40 rounded-2xl border border-slate-800/50 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer">
        {selectedStationId === null ? (
          <Globe className="w-4 h-4 text-cyan-500" />
        ) : (
          <HardDrive className="w-4 h-4 text-emerald-500" />
        )}
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
            Network Scope
          </span>
          <span className="text-sm font-bold text-white leading-tight">
            {selectedStationId === null ? "Global Fleet" : currentStation?.name || selectedStationId}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
      </div>

      {/* Dropdown Menu */}
      <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden">
        <div 
          onClick={() => setSelectedStationId(null)}
          className={`px-4 py-3 hover:bg-slate-800 flex items-center gap-3 cursor-pointer transition-colors ${selectedStationId === null ? "bg-cyan-500/10" : ""}`}
        >
          <Globe className={`w-4 h-4 ${selectedStationId === null ? "text-cyan-400" : "text-slate-500"}`} />
          <div>
            <p className="text-sm font-bold text-white">Global Distribution</p>
            <p className="text-[10px] text-slate-500 font-medium italic">Aggregate view of all resorts</p>
          </div>
        </div>
        
        <div className="h-px bg-slate-800 mx-4"></div>

        <div className="max-h-64 overflow-y-auto">
          {stations.map((station) => (
            <div 
              key={station.id}
              onClick={() => setSelectedStationId(station.id)}
              className={`px-4 py-3 hover:bg-slate-800 flex items-center gap-3 cursor-pointer transition-colors ${selectedStationId === station.id ? "bg-emerald-500/10" : ""}`}
            >
              <HardDrive className={`w-4 h-4 ${selectedStationId === station.id ? "text-emerald-400" : "text-slate-500"}`} />
              <div>
                <p className="text-sm font-bold text-white">{station.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">{station.location}</p>
              </div>
            </div>
          ))}
          {stations.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-slate-500 italic">No active stations detected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
