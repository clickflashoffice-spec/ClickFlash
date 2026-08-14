import { useState } from 'react';
import { Camera, MapPin, Activity } from 'lucide-react';

type Photographer = {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'offline' | 'shooting';
  lastPing: string;
  shootsToday: number;
};

const defaultPhotographers: Photographer[] = [
  { id: 'P-01', name: 'Sarah M.', location: 'Beach Sector A', status: 'shooting', lastPing: 'Just now', shootsToday: 14 },
  { id: 'P-02', name: 'David L.', location: 'Pool Deck', status: 'active', lastPing: '1 min ago', shootsToday: 8 },
  { id: 'P-03', name: 'Elena R.', location: 'Lobby', status: 'offline', lastPing: '45 mins ago', shootsToday: 0 },
  { id: 'P-04', name: 'James K.', location: 'Waterpark', status: 'shooting', lastPing: 'Just now', shootsToday: 21 },
];

export function FleetView() {
  const [photographers] = useState(() => [...defaultPhotographers]);
  const [liveFeed] = useState([
    { id: 1, time: '10:42 AM', event: 'Sarah M. registered a new shoot: John D. (Beach)' },
    { id: 2, time: '10:41 AM', event: 'James K. uploaded 42 high-res burst photos (Waterpark)' },
    { id: 3, time: '10:38 AM', event: 'David L. came online (Pool Deck)' },
  ]);

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
        <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm text-emerald-400 font-medium">WebRTC Stream Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Column: Photographers List */}
        <div className="lg:col-span-1 bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-slate-400" /> 
                    Active Photographers
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
                            <MapPin className="w-3 h-3" /> {p.location}
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                            <span>Shoots: <span className="text-slate-300 font-medium">{p.shootsToday}</span></span>
                            <span>Ping: {p.lastPing}</span>
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

            {/* Live Feed */}
            <div className="h-64 bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-slate-400" /> 
                        Live Shoot Feed (Redis Stream)
                    </h3>
                </div>
                <div className="overflow-y-auto p-4 space-y-3 flex-1 font-mono text-sm">
                    {liveFeed.map(feed => (
                        <div key={feed.id} className="flex gap-4 items-start py-2 border-b border-slate-800/50 last:border-0">
                            <span className="text-blue-400 shrink-0">{feed.time}</span>
                            <span className="text-slate-300">{feed.event}</span>
                        </div>
                    ))}
                    <div className="text-slate-500 text-xs text-center mt-4 pt-4 border-t border-slate-800/50">Listening for incoming WebRTC events...</div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
