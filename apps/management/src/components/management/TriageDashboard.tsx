import React from 'react';
import {Truck, 
  MapPin, 
  AlertTriangle, 
  ArrowRight,
  Target,
  Zap,
  CheckCircle2,
  Brain} from "lucide-react";
import { apiService } from "../../services/apiService";
import { useQuery } from "@tanstack/react-query";
import { ManagementContext } from "../../constants";

interface TriageDashboardProps {
  context?: ManagementContext;
}

interface FleetMetric {
  name: string;
  status: "online" | "offline";
  location: string;
  ip: string;
  metrics: Record<string, unknown>;
}

const TriageDashboard: React.FC<TriageDashboardProps> = ({ context: context = "global" }) => {
  const { data: triageMetrics = [] } = useQuery({
    queryKey: ["fleet-triage"],
    queryFn: () => apiService.getFleetTriage(),
    refetchInterval: 15000 // Refetch every 15s
  });

  const fleetData: FleetMetric[] = triageMetrics.map((m: Record<string, unknown>) => ({
    name: m.desk_id as string,
    status: (Date.now() - new Date(m.timestamp as string).getTime()) < 60000 ? 'online' : 'offline',
    location: 'Sector 7',
    ip: '192.168.1.' + (m.id as string | number),
    metrics: m as Record<string, unknown>
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* HEADER */}
      <div className="header-layout">
        <div className="header-title">
          <span>Governance & Operations</span>
          <h1>Regional Fleet Triage</h1>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="text-[10px] font-black text-emerald-500 uppercase">Fleet Health</div>
            <div className="text-xl font-serif font-black text-white">98.2% Optimal</div>
          </div>
        </div>
      </div>

      <div className="grid-layout-main">
        {/* LEFT: FLEET STATUS */}
        <div className="space-y-8">
          <div className="card-dark">
            <div className="card-title text-[#38bdf8]">
              <Truck className="w-4 h-4" />
              Live Station Diagnostics
            </div>
            
            <div className="space-y-4">
              {fleetData.map((station, i) => (
                <div key={i} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-[#38bdf8]/30 transition-all group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 relative">
                      <Truck className={`w-6 h-6 ${station.status === 'online' ? 'text-[#38bdf8]' : 'text-amber-500'}`} />
                      {station.status === 'online' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#111827] animate-pulse"></div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white uppercase">{station.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest">
                        <MapPin className="w-3 h-3" />
                        {station.location || 'Sector 7'} • {station.ip || '192.168.1.1'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="hidden md:block">
                      <div className="text-[10px] text-[#94a3b8] font-black uppercase mb-1">Yield Gap</div>
                      <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden" aria-label="Yield Gap Progress">
                        <div className="h-full bg-amber-500 w-[24%]" />
                      </div>
                    </div>
                    
                    <div className="text-right min-w-[100px]">
                    <div className="text-xl font-serif font-black text-white">€{(((station.metrics.orders as { today?: number } | undefined)?.today) ?? 0).toLocaleString()}</div>
                      <div className="text-[10px] text-emerald-500 font-extrabold">+12.4% vs Avg</div>
                    </div>

                    <button 
                      className="p-2.5 bg-white/5 rounded-xl text-[#38bdf8] hover:bg-[#38bdf8]/10 transition-all"
                      title="View Station Details"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="card-dark">
              <div className="card-title">
                <Target className="w-4 h-4 text-emerald-500" />
                Regional Target Progress
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-end mb-2">
                  <div className="kpi-value text-white">€1.24M</div>
                  <div className="text-emerald-500 font-black text-sm mb-1">68.2% ACHIEVED</div>
                </div>
                <div className="target-bar-bg h-3 bg-white/5">
                  <div className="target-bar-fill bg-gradient-to-r from-[#38bdf8] to-emerald-500 h-full w-[68.2%]" />
                </div>
                <div className="mt-4 flex justify-between text-[10px] text-[#94a3b8] font-black uppercase">
                  <span>Start: €0</span>
                  <span>Target: €1.82M</span>
                </div>
              </div>
            </div>

            <div className="card-dark">
              <div className="card-title">
                <Zap className="w-4 h-4 text-amber-500" />
                Training ROI Diagnostic
              </div>
              <div className="space-y-4 mt-4">
                {[
                  { label: 'Pitch Success Rate', value: 74, color: '#38bdf8' },
                  { label: 'Upsell Penetration', value: 58, color: '#f59e0b' },
                  { label: 'Customer Retention', value: 92, color: '#10b981' }
                ].map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">
                      <span>{item.label}</span>
                      <span className="text-white">{item.value}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full w-[${item.value}%] ${
                          item.color === '#38bdf8' ? 'bg-[#38bdf8]' : 
                          item.color === '#f59e0b' ? 'bg-amber-500' : 
                          'bg-emerald-500'
                        }`} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: LIVE TASKS */}
        <div className="space-y-8">
          <div className="dispatch-hub">
            <div className="card-title text-[#38bdf8]">
              <Brain className="w-4 h-4" />
              AI Deployment Directives
            </div>
            
            <div className="space-y-4 mt-6">
              {[
                { type: 'Critical', msg: 'Marhaba Club Yield Gap: Deploy "Digital Bundle" offer immediately.', station: 'Marhaba Club' },
                { type: 'Warning', msg: 'Karim Brahim: Conversion drop identified. Request Pitch Audit.', station: 'Fleet Wide' },
                { type: 'Success', msg: 'Target met in Sector 4. Reallocate resources to Sector 7.', station: 'Regional' }
              ].map((alert, i) => (
                <div key={i} className={`alert-box ${alert.type === 'Critical' ? 'alert-danger' : alert.type === 'Warning' ? 'alert-warning' : 'alert-success'} flex gap-3 p-5`}>
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">{alert.station} • {alert.type}</div>
                    <p className="text-sm font-bold leading-snug">{alert.msg}</p>
                    <button className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase text-current/80 hover:text-current transition-colors">
                      Execute Dispatch <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-pixelfounder">
            <div className="card-title text-slate-400">
              <CheckCircle2 className="w-4 h-4" />
              Audit Checklist
            </div>
            <div className="space-y-4 mt-6">
              {[
                { label: 'Printers Status Check', done: true },
                { label: 'Face Indexing Verify', done: true },
                { label: 'Cloud Sync Integrity', done: false },
                { label: 'Morning Stand-up Log', done: true }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border ${item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'} flex items-center justify-center text-white`}>
                    {item.done && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span className={`text-sm font-bold ${item.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TriageDashboard;
