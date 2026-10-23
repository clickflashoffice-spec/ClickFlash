import { useState, useEffect } from 'react';
import { Camera, MapPin, Activity, RefreshCw } from 'lucide-react';
import { TeamLiveWidget } from '../components/TeamLiveWidget';
import { fetchPhotographers, PhotographerLive } from '../lib/api';

const defaultPhotographers: PhotographerLive[] = [
  { id: 'P-01', name: 'Sarah M.', role: 'photographer', location: 'Beach Sector A', status: 'shooting', last_ping: 'Just now', shoots_today: 14 },
  { id: 'P-02', name: 'David L.', role: 'photographer', location: 'Pool Deck', status: 'active', last_ping: '1 min ago', shoots_today: 8 },
  { id: 'P-03', name: 'Elena R.', role: 'photographer', location: 'Lobby', status: 'offline', last_ping: '45 mins ago', shoots_today: 0 },
  { id: 'P-04', name: 'James K.', role: 'photographer', location: 'Waterpark', status: 'shooting', last_ping: 'Just now', shoots_today: 21 },
];

export function FleetView() {
  const [photographers, setPhotographers] = useState<PhotographerLive[]>(defaultPhotographers);
  const [loading, setLoading] = useState(false);

  const loadPhotographers = async () => {
    setLoading(true);
    try {
      const items = await fetchPhotographers();
      if (items && items.length > 0) {
        setPhotographers(items);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotographers();
    const interval = setInterval(loadPhotographers, 15000); // 15s live refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            Live Operations
          </h2>
          <p className="text-slate-400 mt-1">Real-time photographer tracking, live shoots, and fleet telemetry.</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={loadPhotographers}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh Fleet Telemetry"
              aria-label="Refresh Fleet Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm text-emerald-400 font-medium">WebRTC Stream Active</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Column: Photographers List */}
        <div className="lg:col-span-1 bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 flex justify-between items-center">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-slate-400" /> 
                    Active Photographers ({photographers.length})
                </h3>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 flex-1">
                {photographers.map(p => (
                    <div key={p.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-white">{p.name}</span>
                            {p.status === 'shooting' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-rose-500/20 text-rose-400 border border-rose-500/20">Shooting</span>}
                            {p.status === 'active' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Active</span>}
                            {p.status === 'offline' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-500/20 text-slate-400 border border-slate-500/20">Offline</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                            <MapPin className="w-3 h-3" /> {p.location || 'Roaming Zone'}
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                            <span>Shoots: <span className="text-slate-300 font-medium">{p.shoots_today ?? 0}</span></span>
                            <span>Ping: {p.last_ping || 'Active'}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Middle/Right Column: Live Map and Feed */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full">
            {/* The "Map" (Simulated with a stylized div for now) */}
            <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden relative group">
                {/* Mock Map Background Grid */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                
                {/* Simulated Pins */}
                <div className="absolute top-[30%] left-[40%] flex flex-col items-center animate-pulse">
                    <div className="w-4 h-4 bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.6)]"></div>
                    <span className="text-[10px] font-bold mt-1 bg-slate-900/80 px-1 rounded text-white">Sarah M. (Shooting)</span>
                </div>

                <div className="absolute top-[60%] left-[70%] flex flex-col items-center">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.6)]"></div>
                    <span className="text-[10px] font-bold mt-1 bg-slate-900/80 px-1 rounded text-white">James K.</span>
                </div>

                <div className="absolute top-4 left-4">
                    <div className="bg-slate-900/90 backdrop-blur p-3 rounded-lg border border-slate-700 text-sm shadow-xl">
                        <h4 className="font-bold text-white mb-1">Resort Map Sector 7G</h4>
                        <p className="text-xs text-slate-400">Live UWB/BLE Tracking</p>
                    </div>
                </div>
            </div>

            {/* WebRTC Video Feed */}
            <div className="flex-1 flex flex-col min-h-0">
                <TeamLiveWidget />
            </div>
        </div>

      </div>
    </div>
  );
}
