import React from "react";
import { 
  Users, 
  Award, 
  Target, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import { PixelFounderCard } from "../common/PixelFounderCard.tsx";

const DailyScorecards: React.FC = () => {
  const staff = [
    { name: "Ahmed Salem", role: "L10 Architect", revenue: 1450, target: 1200, yield: 98, status: "Peak Performance" },
    { name: "Karim Brahim", role: "Senior Closer", revenue: 980, target: 1200, yield: 82, status: "Yield Gap Identified" },
    { name: "Myriame K.", role: "Growth Lead", revenue: 1120, target: 1000, yield: 91, status: "Normal Duty" },
    { name: "Sami Ben Ali", role: "Junior Hunter", revenue: 450, target: 800, yield: 56, status: "Training Required" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* HEADER */}
      <div className="header-layout">
        <div className="header-title">
          <span>Performance Diagnostics</span>
          <h1>Daily Scorecards</h1>
        </div>
        <div className="btn-ai animate-pulse-gold cursor-pointer">
          <Zap className="w-4 h-4" />
          Generate Feedback Loops
        </div>
      </div>

      <div className="grid-3">
        <div className="card-pixelfounder">
          <div className="card-title text-slate-400">
            <Users className="w-4 h-4" />
            Total Fleet Force
          </div>
          <div className="kpi-value text-slate-900">42</div>
          <p className="kpi-sub text-emerald-600">+4 vs Yesterday</p>
        </div>
        <div className="card-pixelfounder">
          <div className="card-title text-slate-400">
            <Target className="w-4 h-4" />
            Avg. Yield Rate
          </div>
          <div className="kpi-value text-slate-900">84.2%</div>
          <p className="kpi-sub text-emerald-600">Within Target</p>
        </div>
        <div className="card-pixelfounder">
          <div className="card-title text-slate-400">
            <ShieldCheck className="w-4 h-4" />
            Audit Compliance
          </div>
          <div className="kpi-value text-slate-900">100%</div>
          <p className="kpi-sub text-emerald-600">Global Standard</p>
        </div>
      </div>

      <div className="grid-layout-main">
        {/* LEADERBOARD */}
        <div className="card-dark !p-0 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <div className="card-title mb-0">
              <Award className="w-4 h-4 text-gold" />
              Regional Leaderboard
            </div>
            <span className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">Live Updates</span>
          </div>
          
          <table className="pixel-table">
            <thead>
              <tr>
                <th>Personnel</th>
                <th>Performance Status</th>
                <th className="text-right">Daily Yield</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((p, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#38bdf8]/10 border border-[#38bdf8]/20 rounded-xl flex items-center justify-center font-black text-[#38bdf8]">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{p.name}</div>
                        <div className="text-[10px] font-black text-[#94a3b8] uppercase tracking-tighter">{p.role}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${p.yield > 90 ? 'bg-emerald-500' : p.yield > 70 ? 'bg-[#38bdf8]' : 'bg-red-500'}`}></div>
                       <span className={`text-[11px] font-black uppercase tracking-widest ${p.yield > 90 ? 'text-emerald-500' : p.yield > 70 ? 'text-[#38bdf8]' : 'text-red-500'}`}>
                         {p.status}
                       </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="text-base font-serif font-black text-white">€{p.revenue}</div>
                    <div className="text-[10px] font-bold text-[#94a3b8]">Target: €{p.target}</div>
                  </td>
                  <td className="text-right">
                    <button className="btn-icon bg-white/5 border border-white/10 hover:border-[#38bdf8] ml-auto" title="Send Message">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-black/40 text-center">
             <button className="text-[10px] font-black uppercase tracking-[0.2em] text-[#38bdf8] hover:underline">
               Export Global Staff Audit (.pdf)
             </button>
          </div>
        </div>

        {/* FEEDBACK & ALERTS */}
        <div className="space-y-6">
          <div className="card-pixelfounder">
            <div className="card-title text-[#ef4444]">
              <AlertCircle className="w-4 h-4" />
              Critical Attention (2)
            </div>
            <div className="space-y-4 mt-6">
               <div className="alert-box alert-danger m-0">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase">Low Conversion Alert</span>
                  </div>
                  <p className="text-sm font-bold">Sami Ben Ali (Sector 9) has failed to convert 12 consecutive pitches.</p>
                  <button className="mt-3 btn-ai bg-red-500 text-white hover:bg-red-600 w-full">Deploy Senior Support</button>
               </div>
               
               <div className="alert-box alert-warning m-0">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase">Upsell Warning</span>
                  </div>
                  <p className="text-sm font-bold">Yield Gap detected in Marhaba Occidental. Bundle adoption -18%.</p>
                  <button className="mt-3 btn-ai bg-amber-500 text-white hover:bg-amber-600 w-full">Update Offer Menu</button>
               </div>
            </div>
          </div>

          <div className="card-dark">
             <div className="card-title">
               <TrendingUp className="w-4 h-4 text-[#38bdf8]" />
               AI Growth Prediction
             </div>
             <p className="text-sm text-[#94a3b8] font-medium leading-relaxed mt-4">
               Based on current pitch intensity, the fleet is projected to hit <span className="text-white font-black text-xs">€48,200</span> by EOD (+12% vs week avg).
             </p>
             <div className="mt-6 flex items-center justify-between">
                <div className="text-xs font-black text-white">PROBABILITY: 88%</div>
                <div className="flex gap-1">
                   {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-6 bg-[#38bdf8] rounded-full opacity-50 last:opacity-100"></div>)}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyScorecards;
