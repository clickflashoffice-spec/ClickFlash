import React from "react";
import {Smile, 
  Users,
  Download,
  Share2,
  AlertCircle} from "lucide-react";
import { PixelFounderCard } from "../common/PixelFounderCard.tsx";

const WeeklyOpsReport: React.FC = () => {
  const managerKPIs = [
    { label: "Partner Mood (HQ Audit)", score: 85, trend: "+5%", status: "Nominal" },
    { label: "New Leads (Sousse Sector)", score: 12, trend: "-2", status: "Warning" },
    { label: "Staff Morale Diagnostic", score: 92, trend: "+10%", status: "High" },
    { label: "Inventory Efficiency", score: 74, trend: "Flat", status: "Neutral" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <h2 className="text-4xl font-serif font-black text-white">Weekly Ops & KPIs</h2>
          <span className="text-[#94a3b8] font-bold uppercase tracking-widest text-xs">Week 24 • June 2026</span>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#94a3b8] hover:bg-white/10 transition-all">
            <Download className="w-4 h-4" /> PDF Report
          </button>
          <button className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#38bdf8] hover:bg-[#38bdf8]/10 transition-all">
            <Share2 className="w-4 h-4" /> Dispatch to HQ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {managerKPIs.map((kpi, i) => (
          <PixelFounderCard key={i} title={kpi.label} subtitle={kpi.status}>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-3xl font-serif font-black text-white">{kpi.score}</span>
              <span className={`text-[10px] font-black uppercase ${kpi.trend.startsWith('+') ? 'text-emerald-500' : kpi.trend === 'Flat' ? 'text-[#94a3b8]' : 'text-rose-500'}`}>
                {kpi.trend}
              </span>
            </div>
            <div className="h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
               <div 
                 className={`h-full ${kpi.status === 'Warning' ? 'bg-rose-500' : 'bg-[#38bdf8]'} w-[${kpi.score}%]`} 
               />
            </div>
          </PixelFounderCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <PixelFounderCard title="Regional Performance Matrix" subtitle="Volume vs Yield">
            <div className="h-64 mt-6 flex items-end justify-between gap-4 px-4 pb-4 border-b border-l border-white/5">
              {[
                { name: "Concorde", value: 85, color: "#38bdf8", class: "h-[170px] bg-[#38bdf8]" },
                { name: "Occidental", value: 64, color: "#fbbf24", class: "h-[128px] bg-amber-400" },
                { name: "Club Marhaba", value: 92, color: "#10b981", class: "h-[184px] bg-emerald-500" },
                { name: "Palace", value: 45, color: "#ef4444", class: "h-[90px] bg-rose-500" },
                { name: "Jaz", value: 78, color: "#38bdf8", class: "h-[156px] bg-[#38bdf8]" }
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                  <div className="w-full relative">
                    <div 
                      className={`w-full rounded-t-xl transition-all duration-1000 ease-out group-hover:opacity-80 ${bar.class}`} 
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {bar.value}%
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-[#94a3b8] uppercase tracking-tighter w-full text-center truncate">{bar.name}</span>
                </div>
              ))}
            </div>
          </PixelFounderCard>

          <PixelFounderCard title="Governance Log" subtitle="RecentHQ Directives">
            <div className="mt-6 space-y-4">
              {[
                { type: "Mandate", msg: "Shift Concorde upsell target to 85% effective immediately.", time: "2h ago" },
                { type: "Audit", msg: "Inventory reconciliation required for Occidental sector.", time: "5h ago" },
                { type: "Approval", msg: "New recruitment budget approved for Night Safari expansion.", time: "Yesterday" }
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-[#38bdf8]/30 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white uppercase tracking-tight">{log.type}</span>
                      <p className="text-[11px] text-[#94a3b8] font-bold">{log.msg}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#475569] font-black uppercase">
                    {log.time}
                  </span>
                </div>
              ))}
            </div>
          </PixelFounderCard>
        </div>

        <div className="space-y-8">
          <PixelFounderCard title="Manager Sentiment" subtitle="Regional Pulse">
            <div className="mt-6 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-emerald-500/10 border-4 border-emerald-500/20 flex flex-col items-center justify-center text-emerald-500 mb-6 group hover:scale-110 transition-all">
                <Smile className="w-12 h-12 mb-1" />
                <span className="text-lg font-black font-serif">High</span>
              </div>
              <p className="text-[11px] text-[#94a3b8] text-center font-bold px-4">
                Managers report high engagement with the <span className="text-white">AI Duty Dispatcher</span>. Low resistance to current mandated targets.
              </p>
            </div>
          </PixelFounderCard>

          <PixelFounderCard title="Operational Risks" subtitle="Fleet Integrity">
             <div className="mt-6 space-y-4">
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4">
                   <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
                   <div>
                     <h6 className="text-[10px] font-black text-rose-500 uppercase">Sync Latency (Marhaba Palace)</h6>
                     <p className="text-[11px] text-[#94a3b8] font-bold">Latency exceeding 5s. Possible local link failure.</p>
                   </div>
                </div>
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4">
                   <Users className="w-6 h-6 text-amber-500 shrink-0" />
                   <div>
                     <h6 className="text-[10px] font-black text-amber-500 uppercase">Resignation Risk (Ahmed)</h6>
                     <p className="text-[11px] text-[#94a3b8] font-bold">Burnout alerts detected on L10 Architect shift.</p>
                   </div>
                </div>
             </div>
          </PixelFounderCard>
        </div>
      </div>
    </div>
  );
};

export default WeeklyOpsReport;
