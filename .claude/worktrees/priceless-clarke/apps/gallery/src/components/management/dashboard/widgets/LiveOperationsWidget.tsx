import React from 'react';
import Card from '../../../common/Card';
import { Destination } from '../../../../types';

interface LiveOperationsWidgetProps {
  destinations: Destination[];
}

const LiveOperationsWidget: React.FC<LiveOperationsWidgetProps> = ({ destinations }) => {
  // Mock real-time data simulating a live system pulse
  const systemHealth = {
      activeDestinations: destinations.length,
      totalKiosks: destinations.length * 3 + 2,
      activeOrdersToday: 142,
      syncLatency: '24ms'
  };

  return (
    <Card className="h-full bg-slate-900 text-white border-slate-800 relative overflow-hidden shadow-xl">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        <div className="relative z-10 flex justify-between items-start mb-6">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <h3 className="text-lg font-bold tracking-wide">LIVE OPS</h3>
                </div>
                <p className="text-slate-400 text-xs uppercase tracking-wider font-mono">Global Telemetry</p>
            </div>
            <div className="text-right bg-slate-800/50 px-2 py-1 rounded border border-slate-700">
                 <p className="text-[10px] text-slate-400 uppercase font-bold">Network</p>
                 <p className="text-green-400 font-mono text-sm">OPTIMAL</p>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
             <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                 <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Locations</p>
                 <p className="text-2xl font-black">{systemHealth.activeDestinations}</p>
             </div>
             <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                 <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Online Kiosks</p>
                 <p className="text-2xl font-black">{systemHealth.totalKiosks}</p>
             </div>
             <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                 <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Orders (24h)</p>
                 <p className="text-2xl font-black text-blue-400">{systemHealth.activeOrdersToday}</p>
             </div>
             <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                 <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Avg Latency</p>
                 <p className="text-2xl font-black text-green-400">{systemHealth.syncLatency}</p>
             </div>
        </div>

        <div className="relative z-10">
            <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Node Status</p>
                <span className="text-[10px] text-slate-600 font-mono">UPDATED: {new Date().toLocaleTimeString()}</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {destinations.slice(0, 5).map((dest, i) => (
                    <div key={dest.id} className="flex items-center justify-between text-sm p-2 bg-slate-800/30 rounded border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`}></div>
                            <span className="font-medium text-slate-200">{dest.name}</span>
                        </div>
                        <span className="font-mono text-xs text-slate-500">SYNCED</span>
                    </div>
                ))}
            </div>
        </div>
    </Card>
  );
};

export default LiveOperationsWidget;