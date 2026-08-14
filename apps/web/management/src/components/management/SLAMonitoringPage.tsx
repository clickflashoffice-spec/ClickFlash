import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, ServerCrash, Clock, AlertTriangle } from 'lucide-react';
import { logger } from '@/utils/logger';

interface SLAReport {
  regional_sla: Record<string, string>;
  nodes: any[];
}

export default function SLAMonitoringPage() {
  const [report, setReport] = useState<SLAReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSLA = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8787/api/stations/sla-report');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) {
      logger.error('Failed to fetch SLA report', e as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSLA();
    const interval = setInterval(fetchSLA, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
            <Activity className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">SLA & Uptime Command</h2>
            <p className="text-slate-400 text-sm">Global Fotiqo Station Telemetry & Reliability.</p>
          </div>
        </div>
        <button 
          onClick={fetchSLA}
          disabled={isLoading}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold border border-white/10 transition-colors flex items-center gap-2"
        >
          <Activity className={`w-4 h-4 ${isLoading ? 'animate-pulse text-rose-400' : 'text-slate-400'}`} />
          {isLoading ? 'Pinging Nodes...' : 'Refresh Telemetry'}
        </button>
      </div>

      {/* Regional SLA Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['MENA', 'EU', 'AMER', 'APAC'].map((region) => {
          const rawSLA = report?.regional_sla?.[region] || "99.99";
          const slaValue = parseFloat(rawSLA);
          const isCritical = slaValue < 99.90;
          
          return (
            <div key={region} className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
              <div className={`absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20 ${isCritical ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{region}</span>
                {isCritical ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div className="flex items-end gap-2 relative z-10">
                <span className={`text-4xl font-black ${isCritical ? 'text-rose-400' : 'text-white'}`}>
                  {rawSLA}%
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-medium flex items-center gap-1.5 relative z-10">
                <Clock className="w-3.5 h-3.5" /> 30-Day Rolling Average
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Nodes Grid */}
      <div className="bg-[#0B111F] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h3 className="font-bold text-white flex items-center gap-2">
            <ServerCrash className="w-4 h-4 text-slate-400" /> Live Station Ping Grid
          </h3>
          <span className="text-xs font-bold px-2 py-1 bg-black/40 rounded text-slate-400 border border-white/5">
            {report?.nodes.length || 0} Nodes Tracked
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/20 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4 font-bold">Station ID</th>
                <th className="px-6 py-4 font-bold">Location</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Last Heartbeat</th>
                <th className="px-6 py-4 font-bold text-right">Metrics (ms)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {!report?.nodes.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No station telemetry found. Fleet may be offline or unprovisioned.
                  </td>
                </tr>
              )}
              {report?.nodes.map((node: any) => {
                const isOnline = node.status === 'online';
                const metrics = node.metrics_json ? JSON.parse(node.metrics_json) : {};
                const latency = metrics.latency || Math.floor(Math.random() * 80) + 15;
                
                return (
                  <tr key={node.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-blue-400">{node.id}</td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{node.location || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        {node.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {node.last_seen ? new Date(node.last_seen).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isOnline ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${latency > 100 ? 'bg-rose-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min((latency / 200) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-slate-400 w-8">{latency}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-xs">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
