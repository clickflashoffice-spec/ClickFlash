import React, { useState, useEffect } from "react";
import { 
  WifiOff, 
  Cpu, 
  HardDrive, 
  Clock, 
  Zap,
} from "lucide-react";
import { cloudApiService } from "../../services/cloudApiService";

interface FleetStation {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline";
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  syncStatus: {
    syncLag: number;
  };
  orders: {
    today: number;
  };
  photos: {
    today: number;
  };
}

const ResortIntelligence: React.FC = () => {
  const [fleet, setFleet] = useState<FleetStation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFleet = async () => {
      try {
        const res = await cloudApiService.get("/api/cloud/fleet");
        if (res.data && res.data.success) {
          setFleet(res.data.fleet);
        }
      } catch (err) {
        console.error("Failed to fetch fleet status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFleet();
    const interval = setInterval(fetchFleet, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-10 text-slate-400 animate-pulse">Scanning Global Fleet...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fleet.map((station) => (
          <div key={station.id} className="glass-panel p-6 rounded-[2.5rem] border-slate-800/30 bg-slate-900 shadow-2xl group hover:border-cyan-500/30 transition-all duration-500 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${station.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 active-glow' : 'bg-slate-800/50 border-slate-700/50'}`}>
                  {station.status === 'online' ? (
                    <Zap className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-black text-white tracking-tight">{station.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{station.location}</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${station.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                {station.status}
              </div>
            </div>

            {/* Health Grid */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-slate-950/40 border border-slate-800/50 rounded-2xl p-3 text-center">
                <Cpu className="w-4 h-4 text-cyan-500 mx-auto mb-1.5" />
                <p className="text-[10px] text-slate-500 font-bold uppercase truncate">CPU</p>
                <p className="text-sm font-black text-white">{station.metrics.cpuUsage}%</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/50 rounded-2xl p-3 text-center">
                <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1.5" />
                <p className="text-[10px] text-slate-500 font-bold uppercase truncate">MEM</p>
                <p className="text-sm font-black text-white">{station.metrics.memoryUsage}%</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/50 rounded-2xl p-3 text-center">
                <HardDrive className="w-4 h-4 text-indigo-500 mx-auto mb-1.5" />
                <p className="text-[10px] text-slate-500 font-bold uppercase truncate">DISK</p>
                <p className="text-sm font-black text-white">{station.metrics.diskUsage}%</p>
              </div>
            </div>

            {/* Sync Meter */}
            <div className="mb-8 px-2">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase">Sync Latency</span>
                </div>
                <span className={`text-[10px] font-black uppercase ${station.syncStatus.syncLag < 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {station.syncStatus.syncLag}m ago
                </span>
              </div>
              <div className="h-2 bg-slate-950/60 rounded-full border border-slate-800/50 overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${station.syncStatus.syncLag < 5 ? 'from-emerald-500 to-teal-400' : 'from-amber-500 to-orange-400'} rounded-full`}
                  style={{ width: `${Math.max(10, 100 - station.syncStatus.syncLag * 2)}%` }}
                ></div>
              </div>
            </div>

            {/* Stats Footer */}
            <div className="mt-auto pt-6 border-t border-slate-800 flex justify-between items-center">
              <div className="flex gap-4">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase">Orders</p>
                  <p className="text-sm font-black text-white">{station.orders.today}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase">Photos</p>
                  <p className="text-sm font-black text-white">{station.photos.today}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {[1,2,3].map(i => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${station.status === 'online' ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {fleet.length === 0 && (
          <div className="col-span-full py-20 text-center glass-panel rounded-[3rem] border-slate-800/30 bg-slate-900">
            <WifiOff className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-black text-white uppercase tracking-widest">No Active Nodes Detected</h3>
            <p className="text-slate-500 mt-2">Waiting for Master heartbeat signal from global stations...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResortIntelligence;
