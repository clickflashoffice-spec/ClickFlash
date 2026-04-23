import React from "react";
import { Route, MapPin, Target, Zap, ChevronRight, Star } from "lucide-react";
import { PixelFounderCard } from "../common/PixelFounderCard.tsx";

const StrategicRoadmap: React.FC = () => {
  const milestones = [
    { id: 1, title: "Sousse Sector Saturation", date: "Q3 2026", status: "Active", progress: 85 },
    { id: 2, title: "Autonomous Fleet v2 Deployment", date: "Q4 2026", status: "Pending", progress: 0 },
    { id: 3, title: "Night Safari Expansion", date: "Q1 2027", status: "Planning", progress: 0 },
    { id: 4, title: "HQ Governance Engine Upgrade", date: "Q2 2027", status: "Active", progress: 40 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-black text-white">Strategic Roadmap</h2>
          <p className="text-sm font-bold text-[#94a3b8] uppercase tracking-widest mt-2">Network Growth & Expansion Milestones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PixelFounderCard title="Expansion Milestones" subtitle="Fiscal 2026-27">
           <div className="mt-8 space-y-12 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-white/5">
             {milestones.map((m) => (
               <div key={m.id} className="relative pl-12 group">
                 <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-[#070b14] flex items-center justify-center z-10 ${m.status === 'Active' ? 'bg-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.5)]' : 'bg-white/10'}`}>
                   {m.status === 'Active' && <Zap className="w-3 h-3 text-[#070b14]" />}
                 </div>
                 <div className="flex flex-col gap-1">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-black text-[#38bdf8] uppercase tracking-widest">{m.date}</span>
                     <span className={`text-[10px] font-black uppercase tracking-tighter ${m.status === 'Active' ? 'text-emerald-500' : 'text-[#475569]'}`}>{m.status}</span>
                   </div>
                   <h4 className="text-lg font-serif font-black text-white">{m.title}</h4>
                   <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                     <div className={`h-full bg-[#38bdf8] w-[${m.progress}%]`}></div>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </PixelFounderCard>

        <div className="space-y-8">
          <PixelFounderCard title="Regional Intelligence" subtitle="Target Zones">
             <div className="mt-6 flex flex-col gap-4">
               {[
                 { zone: "Coastal North", status: "Secured", score: 98 },
                 { zone: "Sousse Central", status: "Active Hunt", score: 45 },
                 { zone: "Southern Desert", status: "Unscanned", score: 0 }
               ].map((zone, i) => (
                 <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-[#38bdf8]/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <MapPin className={`w-5 h-5 ${zone.score > 90 ? 'text-[#38bdf8]' : 'text-[#475569]'}`} />
                      <div>
                        <span className="text-sm font-black text-white">{zone.zone}</span>
                        <div className="text-[10px] text-[#475569] font-black uppercase">{zone.status}</div>
                      </div>
                    </div>
                    {zone.score > 0 && <span className="text-xl font-serif font-black text-white">{zone.score}%</span>}
                 </div>
               ))}
             </div>
          </PixelFounderCard>

          <PixelFounderCard title="Governance Alpha" subtitle="Policy Directives">
             <div className="mt-4 space-y-4">
                <div className="p-5 bg-gradient-to-br from-[#38bdf8]/10 to-indigo-500/10 rounded-3xl border border-white/10">
                   <Star className="w-6 h-6 text-gold mb-3" />
                   <h6 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-2">Alpha Directive: v4.2</h6>
                   <p className="text-[11px] text-[#94a3b8] font-bold leading-relaxed">
                     "All new resort partners must implement a <span className="text-white">PixelFounder Zero-Point Audit</span> before equipment deployment. Governance mandates a 15% minimum yield projection."
                   </p>
                </div>
             </div>
          </PixelFounderCard>
        </div>
      </div>
    </div>
  );
};

export default StrategicRoadmap;
