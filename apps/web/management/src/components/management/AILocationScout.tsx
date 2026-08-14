import React, { useState, useEffect } from "react";
import { Map, Layers, Target, Activity, Users, Flame, Info, RefreshCw, Navigation, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { aiIntelligenceService, ScoutInsight } from "@/services/aiIntelligenceService";

export const AILocationScout: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<"revenue" | "checkins" | "photographers">("revenue");
  const [insights, setInsights] = useState<ScoutInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [executedZones, setExecutedZones] = useState<Record<string, boolean>>({});
  const [selectedZone, setSelectedZone] = useState<ScoutInsight | null>(null);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const data = await aiIntelligenceService.fetchScoutInsights({
        currentLocation: "Marhaba Resort & Spa",
        activeFleet: 5,
        hourlyRevenue: 6940,
      });
      setInsights(data);
      if (data.length > 0 && !selectedZone) {
        setSelectedZone(data[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const handleAction = (zoneId: string) => {
    setExecutedZones((prev) => ({ ...prev, [zoneId]: true }));
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 bg-[#0B111F] min-h-screen text-white">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-[#131C31] p-6 rounded-2xl border border-white/10 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/30">
              Live Fleet Telemetry
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-black text-white font-serif flex items-center gap-3">
            <Map className="w-7 h-7 text-cyan-400 animate-pulse" />
            AI Location Scout & Heatmaps
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time D1 zone profitability clusters & predictive foot traffic surge warnings
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadInsights}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 rounded-xl text-sm font-black transition-all min-h-[48px] shadow-lg active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Syncing D1..." : "Refresh Telemetry"}</span>
          </button>
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0B111F] p-1.5 rounded-xl border border-white/10 shadow-inner">
            <button
              onClick={() => setActiveLayer("revenue")}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-black transition-all min-h-[48px] ${
                activeLayer === "revenue"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Profit Zones</span>
            </button>
            <button
              onClick={() => setActiveLayer("checkins")}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-black transition-all min-h-[48px] ${
                activeLayer === "checkins"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.25)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Foot Traffic</span>
            </button>
            <button
              onClick={() => setActiveLayer("photographers")}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-black transition-all min-h-[48px] ${
                activeLayer === "photographers"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.25)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>GPS Fleet (5)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[660px]">
        {/* Interactive Tactical Map Viewport */}
        <div className="lg:col-span-3 bg-[#131C31] rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl flex flex-col justify-between">
          {/* Tactical Grid Background */}
          <div 
            className="absolute inset-0 bg-[#0B111F] opacity-95" 
            style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, #1e293b 0%, transparent 100%), url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23334155' fill-opacity='0.15'%3E%3Cpath d='M0 38h40v2H0v-2zM38 0v40h2V0h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
          
          {/* Map Controls */}
          <div className="absolute top-5 right-5 flex flex-col gap-2 z-20">
            <button className="w-12 h-12 bg-[#131C31]/90 backdrop-blur-md rounded-xl border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-xl active:scale-95">
              <span className="text-2xl font-black">+</span>
            </button>
            <button className="w-12 h-12 bg-[#131C31]/90 backdrop-blur-md rounded-xl border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-xl active:scale-95">
              <span className="text-2xl font-black">-</span>
            </button>
            <button className="w-12 h-12 bg-[#131C31]/90 backdrop-blur-md rounded-xl border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-xl active:scale-95 mt-2">
              <Layers className="w-5 h-5 text-cyan-400" />
            </button>
          </div>

          {/* Interactive Heatmap & GPS Pins Overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            {activeLayer === "revenue" && (
              <>
                <div className="absolute top-[28%] left-[38%] w-72 h-72 bg-rose-500/25 rounded-full blur-[70px] animate-pulse" />
                <div className="absolute top-[48%] left-[58%] w-56 h-56 bg-amber-500/25 rounded-full blur-[50px]" />
                <div className="absolute top-[62%] left-[28%] w-40 h-40 bg-emerald-500/20 rounded-full blur-[40px]" />
                
                {insights.map((z, idx) => {
                  const positions = [
                    { top: "33%", left: "42%" },
                    { top: "52%", left: "60%" },
                    { top: "66%", left: "32%" },
                    { top: "45%", left: "20%" }
                  ];
                  const pos = positions[idx] || { top: "50%", left: "50%" };
                  const isHigh = z.priority === "HIGH";
                  const badgeColor = isHigh ? "bg-rose-500 border-rose-400" : z.priority === "MEDIUM" ? "bg-amber-500 border-amber-400" : "bg-blue-500 border-blue-400";
                  const dotColor = isHigh ? "bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.9)]" : z.priority === "MEDIUM" ? "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.9)]" : "bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.9)]";

                  return (
                    <div
                      key={z.zoneId}
                      style={{ top: pos.top, left: pos.left }}
                      onClick={() => setSelectedZone(z)}
                      className="absolute flex flex-col items-center cursor-pointer group transition-all duration-300 transform hover:scale-110 z-20"
                    >
                      <div className={`${badgeColor} text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-2xl border mb-1.5 whitespace-nowrap flex items-center gap-1.5 transition-all group-hover:scale-105`}>
                        <Target className="w-3.5 h-3.5" />
                        <span>{z.zoneName}: €{z.revenuePerHour}/hr</span>
                      </div>
                      <div className={`w-5 h-5 ${dotColor} rounded-full border-2 border-white`} />
                    </div>
                  );
                })}
              </>
            )}

            {activeLayer === "checkins" && (
              <>
                <div className="absolute top-[35%] left-[40%] flex items-center justify-center cursor-pointer" onClick={() => insights[0] && setSelectedZone(insights[0])}>
                  <div className="w-24 h-24 bg-blue-500/20 rounded-full animate-ping absolute" />
                  <div className="w-14 h-14 bg-blue-500/90 rounded-full border-2 border-white flex items-center justify-center shadow-2xl z-10">
                    <span className="text-white font-black text-sm">142</span>
                  </div>
                </div>
                
                <div className="absolute top-[60%] left-[62%] flex items-center justify-center cursor-pointer" onClick={() => insights[1] && setSelectedZone(insights[1])}>
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full animate-ping absolute" />
                  <div className="w-12 h-12 bg-blue-500/90 rounded-full border-2 border-white flex items-center justify-center shadow-2xl z-10">
                    <span className="text-white font-black text-xs">45</span>
                  </div>
                </div>
              </>
            )}

            {activeLayer === "photographers" && (
              <>
                <div className="absolute top-[33%] left-[43%] cursor-pointer group" onClick={() => insights[0] && setSelectedZone(insights[0])}>
                  <div className="w-10 h-10 bg-purple-500 rounded-full border-2 border-white shadow-2xl overflow-hidden flex items-center justify-center transform group-hover:scale-110 transition-transform">
                    <UserAvatar seed="john" />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#0B111F] text-purple-300 text-[10px] font-black px-2 py-0.5 rounded border border-purple-500/30 whitespace-nowrap">
                    John D. (Pool B)
                  </div>
                </div>
                <div className="absolute top-[38%] left-[40%] cursor-pointer group" onClick={() => insights[0] && setSelectedZone(insights[0])}>
                  <div className="w-10 h-10 bg-purple-500 rounded-full border-2 border-white shadow-2xl overflow-hidden flex items-center justify-center transform group-hover:scale-110 transition-transform">
                    <UserAvatar seed="sarah" />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#0B111F] text-purple-300 text-[10px] font-black px-2 py-0.5 rounded border border-purple-500/30 whitespace-nowrap">
                    Sofia M. (Pool B)
                  </div>
                </div>
                <div className="absolute top-[52%] left-[60%] cursor-pointer group" onClick={() => insights[1] && setSelectedZone(insights[1])}>
                  <div className="w-10 h-10 bg-purple-500 rounded-full border-2 border-white shadow-2xl overflow-hidden flex items-center justify-center transform group-hover:scale-110 transition-transform">
                    <UserAvatar seed="mike" />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#0B111F] text-purple-300 text-[10px] font-black px-2 py-0.5 rounded border border-purple-500/30 whitespace-nowrap">
                    Mike R. (Sunset Pt)
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Selected Zone Bottom Fitts' Law Overlay */}
          {selectedZone && (
            <div className="z-20 m-5 bg-[#0B111F]/95 backdrop-blur-xl p-5 rounded-2xl border border-white/15 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                  selectedZone.priority === "HIGH" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}>
                  {selectedZone.profitabilityScore}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-white text-lg">{selectedZone.zoneName}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      selectedZone.priority === "HIGH" ? "bg-rose-500 text-white" : "bg-amber-500 text-black"
                    }`}>
                      {selectedZone.priority} Priority
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-0.5 mb-1">
                    Live Revenue Velocity: <strong className="text-emerald-400">€{selectedZone.revenuePerHour}/hr</strong> | Action: <strong>{selectedZone.actionType}</strong>
                  </p>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                    <span className="bg-white/5 px-2 py-1 rounded">
                      Traffic: {selectedZone.zoneId === 'poolside' ? 'High (850/hr)' : selectedZone.zoneId === 'beach-pier' ? 'Very High (1.2k/hr)' : selectedZone.zoneId === 'sunset-pt' ? 'Surging (900/hr)' : 'Moderate (400/hr)'}
                    </span>
                    <span className="bg-white/5 px-2 py-1 rounded">
                      Capture Rate: {selectedZone.zoneId === 'poolside' ? '24%' : selectedZone.zoneId === 'beach-pier' ? '12% (Low)' : selectedZone.zoneId === 'sunset-pt' ? '31%' : '18%'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedZone.actionType !== "MAINTAIN" && (
                  <button
                    onClick={() => handleAction(selectedZone.zoneId)}
                    disabled={executedZones[selectedZone.zoneId]}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all min-h-[48px] shadow-xl ${
                      executedZones[selectedZone.zoneId]
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/30 active:scale-95"
                    }`}
                  >
                    {executedZones[selectedZone.zoneId] ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Redeployed ✓</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4" />
                        <span>Redeploy Photographer</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Map Legend */}
          <div className="bg-[#0B111F]/90 backdrop-blur-md px-5 py-3 border-t border-white/10 flex flex-wrap gap-4 text-xs font-bold text-slate-300 z-20">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"></span> High Profit Cluster (€3,000+/hr)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></span> Surge Warning (€1,500+/hr)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span> Baseline Coverage (&lt;€1,000/hr)
            </div>
          </div>
        </div>

        {/* AI Recommendations Panel */}
        <div className="bg-[#131C31] rounded-2xl border border-white/10 p-6 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
                  <Flame className="w-6 h-6 text-cyan-400 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">AI Scout Insights</h3>
                  <p className="text-xs text-slate-400">Tactical fleet recommendations</p>
                </div>
              </div>
              {loading && <span className="text-xs text-cyan-400 animate-pulse font-black">Syncing...</span>}
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[480px] custom-scrollbar pr-1">
              {insights.length === 0 && !loading ? (
                <div className="p-8 text-center bg-[#0B111F] rounded-xl border border-white/5">
                  <p className="text-slate-400 text-sm font-bold">No active zone anomalies detected right now.</p>
                </div>
              ) : (
                insights.map((insight) => {
                  const isHigh = insight.priority === "HIGH";
                  const isMed = insight.priority === "MEDIUM";
                  const borderClass = isHigh
                    ? "border-rose-500/40 bg-rose-500/10 shadow-[0_4px_20px_rgba(244,63,94,0.15)]"
                    : isMed
                    ? "border-amber-500/40 bg-amber-500/10 shadow-[0_4px_20px_rgba(245,158,11,0.15)]"
                    : "border-blue-500/40 bg-blue-500/10 shadow-[0_4px_20px_rgba(59,130,246,0.15)]";
                  const textTitleClass = isHigh ? "text-rose-400" : isMed ? "text-amber-400" : "text-blue-400";
                  const isSelected = selectedZone?.zoneId === insight.zoneId;

                  return (
                    <div
                      key={insight.zoneId}
                      onClick={() => setSelectedZone(insight)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer group ${borderClass} ${
                        isSelected ? "ring-2 ring-cyan-400" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className={`${textTitleClass} font-black text-base flex items-center gap-1.5`}>
                          {isHigh ? <Target className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          <span>{insight.zoneName}</span>
                        </h4>
                        <span className="text-xs font-black px-2 py-0.5 rounded bg-black/40 text-white border border-white/10">
                          Score: {insight.profitabilityScore}
                        </span>
                      </div>
                      
                      <p className="text-slate-200 text-xs mb-4 leading-relaxed font-medium">
                        {insight.recommendationText}
                      </p>

                      {insight.actionType !== "MAINTAIN" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(insight.zoneId);
                          }}
                          disabled={executedZones[insight.zoneId]}
                          className={`w-full text-sm font-black py-3 rounded-xl transition-all border min-h-[48px] flex items-center justify-center gap-2 shadow-lg ${
                            executedZones[insight.zoneId]
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : isHigh
                              ? "bg-rose-500 hover:bg-rose-400 text-white border-rose-400 active:scale-95"
                              : "bg-amber-500 hover:bg-amber-400 text-black border-amber-400 active:scale-95"
                          }`}
                        >
                          {executedZones[insight.zoneId] ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Action Executed ✓</span>
                            </>
                          ) : (
                            <>
                              <span>{insight.actionType === "REDEPLOY" ? "Redeploy Photographer" : "Alert Fleet"}</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>D1 telemetry synced • Fotiqo Gemini AI Scout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserAvatar = ({ seed }: { seed: string }) => (
  <img 
    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=transparent`} 
    alt="avatar" 
    className="w-full h-full object-cover"
  />
);
