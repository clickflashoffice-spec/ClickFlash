import React, { useState, useMemo } from "react";
import { 
  Gem, 
  TrendingUp, 
  Target, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight,
  ArrowRight,
  Info,
  Zap,
  DollarSign,
  Brain
} from "lucide-react";
import { PixelFounderCard, PixelFounderStatCard } from "../common/PixelFounderCard.tsx";
import './YieldIntelligence.css';
// import { apiService } from "@/services/apiService"; // Placeholder - fixing relative import if needed

const YieldIntelligence: React.FC = () => {
  const [upsellTarget, setUpsellTarget] = useState(65);
  const [conversionRate, setConversionRate] = useState(24);
  const [avgOrderValue, setAvgOrderValue] = useState(45);
  const [historicalStats, setHistoricalStats] = useState<any[]>([]);

  React.useEffect(() => {
    fetch("/api/yield/stats")
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          const latest = data[0];
          setAvgOrderValue(Math.round(latest.avg_order_value));
          setHistoricalStats(data);
        }
      })
      .catch(err => console.error("Failed to fetch yield stats", err));
  }, []);

  const revenueStats = useMemo(() => {
    const baseline = 450000;
    const lift = (upsellTarget / 100) * 0.15 * baseline;
    const final = baseline + lift;
    return {
      baseline,
      lift,
      final,
      roi: ((lift / 25000) * 100).toFixed(1) // Assuming 25k marketing spend
    };
  }, [upsellTarget]);

  const handleExport = () => {
    const csvContent = [
      ["Metric", "Value", "Trend"],
      ["Conversion Velocity", `${conversionRate}%`, "2.4%"],
      ["Avg Order Value", `€${avgOrderValue}`, "€5"],
      ["Capture Rate", "78%", "-4%"],
      ["Estimated Monthly Lift", `€${Math.round(revenueStats.lift)}`, "12%"],
      ["Final ARR Est", `€${revenueStats.final.toFixed(2)}`, "N/A"]
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `clickflash_yield_audit_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-black text-white">Yield Intelligence Hub</h2>
          <p className="text-sm font-bold text-[#94a3b8] uppercase tracking-widest mt-2">Financial Diagnostic & Upsell Optimization</p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">Network Health</span>
            <span className="text-emerald-500 font-black">€2,450,000 ARR</span>
          </div>
          <div className="h-10 w-px bg-white/5"></div>
          <button 
            onClick={handleExport}
            className="btn-ai bg-emerald-500 text-[#070b14] hover:bg-emerald-400 group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4" />
              Export Audit
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PixelFounderStatCard
          label="Conversion Velocity"
          value={`${conversionRate}%`}
          trend={{ value: "2.4%", isPositive: true }}
          goalProgress={conversionRate * 1.5}
        />
        <PixelFounderStatCard
          label="Avg Order Value"
          value={`€${avgOrderValue}`}
          trend={{ value: "€5", isPositive: true }}
          goalProgress={85}
        />
        <PixelFounderStatCard
          label="Capture Rate"
          value="78%"
          trend={{ value: "4%", isPositive: false }}
          goalProgress={78}
        />
        <PixelFounderStatCard
          label="Estimated Lift"
          value={`+€${Math.round(revenueStats.lift / 1000)}k`}
          trend={{ value: "12%", isPositive: true }}
          goalProgress={upsellTarget}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* INTERACTIVE SIMULATOR */}
        <div className="xl:col-span-2 space-y-8">
          <PixelFounderCard title="Digital Upsell Simulator" subtitle="Interactive Yield Forecasting">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-4">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-[#94a3b8] uppercase tracking-tighter">Upsell Intensity</label>
                    <span className="text-lg font-black text-[#38bdf8]">{upsellTarget}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={upsellTarget} 
                    onChange={(e) => setUpsellTarget(parseInt(e.target.value))}
                    className="w-full accent-[#38bdf8] h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-bold text-[#475569] uppercase tracking-widest">
                    <span>Conservative</span>
                    <span>Aggressive</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-[#94a3b8] uppercase tracking-tighter">Conversion Confidence</label>
                    <span className="text-lg font-black text-emerald-500">{conversionRate}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={conversionRate} 
                    onChange={(e) => setConversionRate(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="p-6 bg-[#38bdf8]/5 border border-[#38bdf8]/10 rounded-2xl flex items-start gap-4">
                  <Info className="w-5 h-5 text-[#38bdf8] mt-1 shrink-0" />
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    AI suggests a <span className="text-white font-bold">65% intensity</span> is optimal for current staff morale vs revenue goals. Exceeding 80% increases exit risk.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="p-6 bg-black/40 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#38bdf8]/5 rounded-full blur-3xl group-hover:bg-[#38bdf8]/10 transition-all"></div>
                    <span className="text-[10px] font-black text-[#38bdf8] uppercase tracking-[0.2em] block mb-2">Projected Monthly Lift</span>
                    <div className="text-5xl font-serif font-black text-white">€{Math.round(revenueStats.lift).toLocaleString()}</div>
                    <div className="mt-4 flex items-center gap-2 text-emerald-500 font-bold text-sm">
                      <TrendingUp className="w-4 h-4" />
                      +{((revenueStats.lift / revenueStats.baseline) * 100).toFixed(1)}% Revenue Growth
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="text-[9px] font-black text-[#94a3b8] uppercase block mb-1">Final ARR Est</span>
                      <div className="text-xl font-serif font-black text-white">€{(revenueStats.final / 1000).toFixed(1)}k</div>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="text-[9px] font-black text-[#94a3b8] uppercase block mb-1">Training ROI</span>
                      <div className="text-xl font-serif font-black text-emerald-500">{revenueStats.roi}%</div>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-6 py-4 bg-[#38bdf8] text-[#070b14] text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_20px_rgba(56,189,248,0.3)] hover:translate-y-[-2px] transition-all">
                  Deploy Governance Mandate
                </button>
              </div>
            </div>
          </PixelFounderCard>

          <PixelFounderCard title="Volume Profit Tool" subtitle="Cross-Destination Comparison">
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/5">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">
                  <tr>
                    <th className="p-4">Destination</th>
                    <th className="p-4">Volume (Photos)</th>
                    <th className="p-4">Profit / Unit</th>
                    <th className="p-4">Efficiency</th>
                    <th className="p-4">Trend</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-bold text-white divide-y divide-white/5">
                  {[
                    { name: "Concorde Sector", vol: "12,450", profit: "€42", eff: "94%", trend: "up" },
                    { name: "Occidental Zone", vol: "8,210", profit: "€38", eff: "82%", trend: "down" },
                    { name: "Club Marhaba", vol: "15,900", profit: "€45", eff: "96%", trend: "up" }
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">{row.name}</td>
                      <td className="p-4 text-[#94a3b8]">{row.vol}</td>
                      <td className="p-4">€{row.profit}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`efficiency-bar ${parseInt(row.eff) > 90 ? 'bg-[#38bdf8]' : 'bg-amber-500'}`}
                              style={{ '--efficiency-width': row.eff } as React.CSSProperties}
                            ></div>
                          </div>
                          <span>{row.eff}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {row.trend === 'up' ? <ArrowUpRight className="text-emerald-500" /> : <ArrowDownRight className="text-amber-500" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PixelFounderCard>
        </div>

        {/* SIDEBAR KPI VISUALS */}
        <div className="space-y-8">
          <PixelFounderCard title="Yield Gaps" subtitle="Critical Targets">
            <div className="mt-6 space-y-6">
              {[
                { label: "Upsell Gap (L1)", value: 24, color: "#38bdf8" },
                { label: "Staff Efficiency", value: 12, color: "#f59e0b" },
                { label: "Lab Waste", value: 5, color: "#ef4444" }
              ].map((gap, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-[#94a3b8]">{gap.label}</span>
                    <span className="text-white">{gap.value}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`gap-bar ${
                        gap.color === '#38bdf8' ? 'bg-[#38bdf8]' : 
                        gap.color === '#f59e0b' ? 'bg-amber-500' : 
                        'bg-rose-500'
                      }`} 
                      style={{ '--gap-width': `${gap.value}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          </PixelFounderCard>

          <PixelFounderCard title="AI Strategy Advisor" subtitle="Mandate Alpha">
            <div className="mt-4 p-4 rounded-2xl bg-[#0ea5e9]/5 border border-[#0ea5e9]/10 space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#38bdf8] animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Active Analysis</span>
              </div>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                "Based on current <span className="text-white">Marhaba Club</span> metrics, shifting focus to <span className="text-[#38bdf8]">L2 Upsell</span> (Digital Packages) will yield a higher profit margin than single prints due to reduced lab overhead."
              </p>
              <button className="w-full pt-2 flex items-center justify-center gap-2 text-[10px] font-black text-[#38bdf8] uppercase tracking-widest hover:text-white transition-colors">
                Apply Strategic Shift <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </PixelFounderCard>
          
          <div className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-2xl relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all">
             <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <Zap className="w-12 h-12 text-white/40 absolute -right-2 -bottom-2 group-hover:rotate-12 transition-all" />
             <h4 className="text-lg font-serif font-black text-white mb-2">B2B Engine</h4>
             <p className="text-xs text-white/80 font-bold mb-4">You have 4 new prospecting leads waiting for outreach.</p>
             <button className="px-4 py-2 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl">
               Start Prospecting
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YieldIntelligence;
