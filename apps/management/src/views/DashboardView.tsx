import { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Zap, 
  Sun, 
  Send, 
  DollarSign, 
  Activity, 
  Sparkles,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

const revenueData = [
  { name: '08:00', revenue: 1200, yieldMultiplier: 1.0, kioskUptime: 99 },
  { name: '10:00', revenue: 3400, yieldMultiplier: 1.15, kioskUptime: 98 },
  { name: '12:00', revenue: 6800, yieldMultiplier: 1.45, kioskUptime: 99 },
  { name: '14:00', revenue: 9200, yieldMultiplier: 1.50, kioskUptime: 100 },
  { name: '16:00', revenue: 11400, yieldMultiplier: 1.35, kioskUptime: 99 },
  { name: '18:00', revenue: 13900, yieldMultiplier: 1.25, kioskUptime: 98 },
  { name: '20:00', revenue: 15850, yieldMultiplier: 1.10, kioskUptime: 100 },
];

interface AttractionZone {
  id: string;
  name: string;
  crowdLevel: 'Low' | 'Medium' | 'High' | 'Peak';
  activePhotographers: number;
  recommendedStaff: number;
  currentYieldMultiplier: number;
  estHourlyRevenue: number;
  lastCaptureSecAgo: number;
}

const INITIAL_ZONES: AttractionZone[] = [
  {
    id: 'zone-apex-coaster',
    name: 'Apex Hypercoaster Inversion',
    crowdLevel: 'Peak',
    activePhotographers: 3,
    recommendedStaff: 4,
    currentYieldMultiplier: 1.5,
    estHourlyRevenue: 1850,
    lastCaptureSecAgo: 4,
  },
  {
    id: 'zone-splash-rapids',
    name: 'Thunder River Splashdown',
    crowdLevel: 'High',
    activePhotographers: 2,
    recommendedStaff: 3,
    currentYieldMultiplier: 1.35,
    estHourlyRevenue: 1420,
    lastCaptureSecAgo: 12,
  },
  {
    id: 'zone-castle-celebration',
    name: 'Fantasy Castle Portal Entry',
    crowdLevel: 'Peak',
    activePhotographers: 4,
    recommendedStaff: 5,
    currentYieldMultiplier: 1.5,
    estHourlyRevenue: 2300,
    lastCaptureSecAgo: 2,
  },
  {
    id: 'zone-sunset-lookout',
    name: 'Sunset VIP Observation Deck',
    crowdLevel: 'Medium',
    activePhotographers: 1,
    recommendedStaff: 2,
    currentYieldMultiplier: 1.15,
    estHourlyRevenue: 780,
    lastCaptureSecAgo: 28,
  },
];

export function DashboardView() {
  const [zones, setZones] = useState<AttractionZone[]>(INITIAL_ZONES);
  const [dispatchedZoneId, setDispatchedZoneId] = useState<string | null>(null);

  const handleDispatch = (zoneId: string) => {
    setDispatchedZoneId(zoneId);
    setZones(prev => prev.map(z => {
      if (z.id === zoneId) {
        return {
          ...z,
          activePhotographers: z.activePhotographers + 1,
          estHourlyRevenue: Math.round(z.estHourlyRevenue * 1.25)
        };
      }
      return z;
    }));
    setTimeout(() => setDispatchedZoneId(null), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header with Live Status & Autonomous Yield Indicator */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-white">Executive Command Hub</h2>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Autonomous Yield V7.0 Active
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">Real-time resort media telemetry, dynamic yield pricing, and AI photographer swarm dispatch.</p>
        </div>

        {/* Dynamic Pricing Banner */}
        <div className="flex items-center gap-6 bg-slate-950/60 p-4 rounded-xl border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Sun className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Resort Weather</p>
              <p className="text-sm font-extrabold text-white">78°F Clear Sky (1.15x)</p>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Current Surge Index</p>
              <p className="text-sm font-extrabold text-indigo-400">1.45x Peak Demand</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Gross Day Revenue</span>
            <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400"><DollarSign className="w-4 h-4" /></span>
          </div>
          <p className="text-3xl font-extrabold text-white">$15,850</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center text-xs font-bold text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5 mr-1" /> +34.8%
            </span>
            <span className="text-[11px] text-slate-400">vs static pricing</span>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">AI WhatsApp Conversions</span>
            <span className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400"><Sparkles className="w-4 h-4" /></span>
          </div>
          <p className="text-3xl font-extrabold text-white">412 Orders</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center text-xs font-bold text-indigo-400">
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> $4,944 closed
            </span>
            <span className="text-[11px] text-slate-400">by Negotiator Bot</span>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Kiosk Fleet</span>
            <span className="p-2 bg-purple-500/10 rounded-xl text-purple-400"><ShieldCheck className="w-4 h-4" /></span>
          </div>
          <p className="text-3xl font-extrabold text-white">45 / 45</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-bold text-emerald-400">99.8% Uptime</span>
            <span className="text-[11px] text-slate-400">0 critical alerts</span>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Photographers</span>
            <span className="p-2 bg-amber-500/10 rounded-xl text-amber-400"><Users className="w-4 h-4" /></span>
          </div>
          <p className="text-3xl font-extrabold text-white">18 Field Crew</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-bold text-cyan-400">100% Rust Sync</span>
            <span className="text-[11px] text-slate-400">zero camera drops</span>
          </div>
        </div>
      </div>

      {/* Real-time Heatmap & Hotspot Dispatch Grid */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Real-Time Attraction Heatmap & AI Photographer Dispatch
            </h3>
            <p className="text-xs text-slate-400">Autonomous guest cluster detection and dynamic roaming photographer dispatch.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {zones.map((zone) => (
            <div 
              key={zone.id}
              className={`p-5 rounded-xl border transition-all ${
                zone.crowdLevel === 'Peak'
                  ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'
                  : zone.crowdLevel === 'High'
                  ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  zone.crowdLevel === 'Peak'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : zone.crowdLevel === 'High'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                }`}>
                  {zone.crowdLevel} Density
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Captured {zone.lastCaptureSecAgo}s ago
                </span>
              </div>

              <h4 className="font-bold text-white text-base mb-1">{zone.name}</h4>
              <p className="text-xs text-indigo-400 font-semibold mb-4">
                Surge: {zone.currentYieldMultiplier}x | Est: ${zone.estHourlyRevenue}/hr
              </p>

              <div className="space-y-2 mb-4 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Staff:</span>
                  <span className="font-bold text-white">{zone.activePhotographers} / {zone.recommendedStaff} rec</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${zone.activePhotographers >= zone.recommendedStaff ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(100, (zone.activePhotographers / zone.recommendedStaff) * 100)}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => handleDispatch(zone.id)}
                disabled={dispatchedZoneId === zone.id}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  dispatchedZoneId === zone.id
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/10'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                {dispatchedZoneId === zone.id ? 'Photographer Dispatched!' : 'AI Dispatch Reinforcements'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue & Surge Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-slate-200 text-base font-bold">Revenue & Dynamic Surge Lift</h3>
              <p className="text-xs text-slate-400">Intraday hourly capture vs dynamic yield multiplier.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '12px' }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Bar dataKey="revenue" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-slate-200 text-base font-bold">LAN Edge Node & Kiosk Uptime</h3>
              <p className="text-xs text-slate-400">High availability metric across all 45 physical terminals.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[95, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '12px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Line type="monotone" dataKey="kioskUptime" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
