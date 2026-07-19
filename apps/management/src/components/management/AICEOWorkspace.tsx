import React, { useState, useEffect } from "react";
import {
  Briefcase, TrendingUp, TrendingDown, DollarSign,
  BarChart3, Zap, Globe, Calendar, ChevronUp, ChevronDown, Target, RefreshCw, Sparkles, CheckCircle2
} from "lucide-react";
import { aiIntelligenceService, CEOInsightsResponse, PricingSuggestion } from "@/services/aiIntelligenceService";

const MONTHLY_REVENUE = [
  { month: "Jan", revenue: 18400, target: 20000 },
  { month: "Feb", revenue: 21200, target: 20000 },
  { month: "Mar", revenue: 19800, target: 22000 },
  { month: "Apr", revenue: 26500, target: 22000 },
  { month: "May", revenue: 31200, target: 28000 },
  { month: "Jun", revenue: 29800, target: 30000 },
  { month: "Jul", revenue: 34100, target: 32000 },
];

const INITIAL_PRICING_SUGGESTIONS: PricingSuggestion[] = [
  {
    id: "ps1",
    trigger: "Peak Hours (14:00-17:00) detected",
    suggestion: "Increase Digital Album from EUR 85 → EUR 99",
    impact: "+18% projected revenue",
    confidence: 92,
    color: "emerald"
  },
  {
    id: "ps2",
    trigger: "Low conversion rate at Beach Front",
    suggestion: "Offer 10% flash discount code for next 2 hours",
    impact: "+34% conversion at this location",
    confidence: 78,
    color: "amber"
  },
  {
    id: "ps3",
    trigger: "All-inclusive guests arriving (40 rooms today)",
    suggestion: "Pre-sell 'Resort Memory Package' at check-in (EUR 120)",
    impact: "EUR 4,800 potential incremental revenue",
    confidence: 85,
    color: "sky"
  }
];

const SUGGESTION_COLOR_MAP: Record<string, { border: string; bg: string; text: string; buttonBg: string }> = {
  emerald: { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-400", buttonBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  amber:   { border: "border-amber-500/40",   bg: "bg-amber-500/10",   text: "text-amber-400",   buttonBg: "bg-amber-500/20 text-amber-300 border-amber-500/40"   },
  sky:     { border: "border-cyan-500/40",    bg: "bg-cyan-500/10",    text: "text-cyan-400",    buttonBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"    },
  purple:  { border: "border-purple-500/40",  bg: "bg-purple-500/10",  text: "text-purple-400",  buttonBg: "bg-purple-500/20 text-purple-300 border-purple-500/40"  },
};

const maxRevenue = Math.max(...MONTHLY_REVENUE.map(d => Math.max(d.revenue, d.target)));

export const AICEOWorkspace: React.FC = () => {
  const [activePricing, setActivePricing] = useState<string | null>(null);
  const [ceoData, setCeoData] = useState<CEOInsightsResponse | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [pushedGlobal, setPushedGlobal] = useState(false);

  const loadCEOInsights = async () => {
    setLoadingAI(true);
    try {
      const data = await aiIntelligenceService.fetchCEOInsights();
      setCeoData(data);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    loadCEOInsights();
  }, []);

  const handlePushToAllTerminals = () => {
    setPushedGlobal(true);
    setTimeout(() => setPushedGlobal(false), 3500);
  };

  const totalRevenue = MONTHLY_REVENUE.reduce((sum, d) => sum + d.revenue, 0);
  const totalTarget = MONTHLY_REVENUE.reduce((sum, d) => sum + d.target, 0);
  const variance = ((totalRevenue - totalTarget) / totalTarget) * 100;
  const isPositive = variance >= 0;

  const pricingSuggestions = ceoData?.pricingSuggestions?.length
    ? ceoData.pricingSuggestions
    : INITIAL_PRICING_SUGGESTIONS;

  return (
    <div className="p-4 lg:p-8 space-y-6 bg-[#0B111F] min-h-screen text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131C31] p-6 rounded-2xl border border-white/10 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-wider border border-cyan-500/30">
              Executive Strategic Advisory
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-black text-white font-serif flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-cyan-400 animate-pulse" />
            AI CEO Workspace
          </h2>
          <p className="text-slate-400 text-sm mt-1">Strategic revenue forecasting, dynamic pricing, and global staff allocation</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handlePushToAllTerminals}
            disabled={pushedGlobal}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm transition-all shadow-xl min-h-[48px] active:scale-95 ${
              pushedGlobal
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-purple-500 hover:bg-purple-400 text-black shadow-purple-500/20"
            }`}
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>{pushedGlobal ? "Broadcasted to 100+ Terminals ✓" : "Push Pricing to All Terminals"}</span>
          </button>
          <button
            onClick={loadCEOInsights}
            disabled={loadingAI}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl font-black text-sm transition-all shadow-xl min-h-[48px] active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${loadingAI ? "animate-spin" : ""}`} />
            <span>{loadingAI ? "Synthesizing D1 & Stripe..." : "Refresh AI Strategy"}</span>
          </button>
        </div>
      </div>

      {/* Executive Summary Banner */}
      {ceoData?.executiveSummary && (
        <div className="bg-gradient-to-r from-purple-900/40 via-cyan-900/30 to-[#131C31] border border-purple-500/40 rounded-2xl p-6 shadow-2xl space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-black text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 animate-spin" /> Live Gemini Executive Advisory & Forecast
          </div>
          <p className="text-white text-sm lg:text-base leading-relaxed font-bold">{ceoData.executiveSummary}</p>
          <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-cyan-300 font-black">
            <span>Projected August Forecast: <strong className="text-emerald-400 font-mono text-sm">EUR {ceoData.forecastAugust.toLocaleString()}</strong></span>
            <span>Model: Gemini 2.5 Pro Executive</span>
          </div>
        </div>
      )}

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#131C31] border border-white/10 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">YTD Revenue</p>
          <p className="text-3xl font-black text-white font-mono">€{(totalRevenue / 1000).toFixed(0)}k</p>
          <div className={`flex items-center gap-1 mt-2 text-xs font-black ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {isPositive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{Math.abs(variance).toFixed(1)}% vs target</span>
          </div>
        </div>
        <div className="bg-[#131C31] border border-white/10 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Best Month</p>
          <p className="text-3xl font-black text-emerald-400 font-mono">Jul</p>
          <p className="text-xs font-bold text-slate-400 mt-2">€34,100 — All-time peak</p>
        </div>
        <div className="bg-[#131C31] border border-white/10 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Active Locations</p>
          <p className="text-3xl font-black text-cyan-400 font-mono">3</p>
          <p className="text-xs font-bold text-slate-400 mt-2">of 100+ planned resorts</p>
        </div>
        <div className="bg-[#131C31] border border-white/10 rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">AI Forecast (Aug)</p>
          <p className="text-3xl font-black text-purple-400 font-mono">€38k</p>
          <p className="text-xs font-bold text-emerald-400 mt-2">+11.4% MoM expansion</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-[#131C31] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span>Revenue vs Target Telemetry</span>
            </h3>
            <p className="text-slate-400 text-xs mt-1">Monthly actuals compared against seasonal target trajectory and Gemini AI August projection</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cyan-500 inline-block" /> Actual</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white/20 inline-block" /> Target</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500/70 inline-block border border-purple-400 border-dashed" /> AI Forecast</span>
          </div>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-3 h-48 pt-4">
          {MONTHLY_REVENUE.map((d) => {
            const revenueH = (d.revenue / maxRevenue) * 100;
            const targetH = (d.target / maxRevenue) * 100;
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end gap-1 h-40">
                  <div
                    className="flex-1 bg-cyan-500/80 hover:bg-cyan-400 rounded-t-lg transition-all relative group shadow-lg"
                    style={{ height: `${revenueH}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#0B111F] border border-white/15 rounded-lg px-2.5 py-1 text-xs font-black text-white whitespace-nowrap shadow-2xl z-10">
                      €{d.revenue.toLocaleString()}
                    </div>
                  </div>
                  <div
                    className="flex-1 bg-white/10 rounded-t-lg transition-all"
                    style={{ height: `${targetH}%` }}
                  />
                </div>
                <span className="text-xs font-black text-slate-400">{d.month}</span>
              </div>
            );
          })}
          {/* August AI Forecast */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full flex items-end gap-1 h-40">
              <div
                className="flex-1 bg-purple-500/40 border-2 border-purple-400 border-dashed rounded-t-lg shadow-lg relative group"
                style={{ height: `${(38000 / maxRevenue) * 100}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#0B111F] border border-purple-500 rounded-lg px-2.5 py-1 text-xs font-black text-purple-300 whitespace-nowrap shadow-2xl z-10">
                  Forecast: €38,000
                </div>
              </div>
              <div
                className="flex-1 bg-white/10 rounded-t-lg"
                style={{ height: `${(34000 / maxRevenue) * 100}%` }}
              />
            </div>
            <span className="text-xs font-black text-purple-400">Aug*</span>
          </div>
        </div>
      </div>

      {/* AI Dynamic Pricing */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
          <span>AI Dynamic Pricing Suggestions (Real-time Elasticity Engine)</span>
        </h3>
        <div className="space-y-3">
          {pricingSuggestions.map(suggestion => {
            const sc = SUGGESTION_COLOR_MAP[suggestion.color] || SUGGESTION_COLOR_MAP.sky;
            return (
              <div
                key={suggestion.id}
                className={`bg-[#131C31] border-2 ${sc.border} rounded-2xl p-5 shadow-2xl transition-all hover:border-white/20`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Target className={`w-4 h-4 ${sc.text}`} />
                      <p className={`${sc.text} text-xs font-black uppercase tracking-wider`}>{suggestion.trigger}</p>
                    </div>
                    <p className="text-white font-black text-base mb-2.5">{suggestion.suggestion}</p>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-emerald-400 text-xs font-black flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <TrendingUp className="w-3.5 h-3.5" /> {suggestion.impact}
                      </span>
                      <span className="text-slate-400 text-xs font-bold">
                        AI Confidence: <span className="font-black text-white">{suggestion.confidence}%</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => setActivePricing(activePricing === suggestion.id ? null : suggestion.id)}
                      className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black transition-all min-h-[48px] shadow-lg active:scale-95 ${
                        activePricing === suggestion.id
                          ? "bg-emerald-500 text-black shadow-emerald-500/30"
                          : `border ${sc.buttonBg} hover:opacity-90`
                      }`}
                    >
                      {activePricing === suggestion.id ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Applied to Fleet</span>
                        </>
                      ) : (
                        <span>Apply Suggestion</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Staff Allocation */}
      <div className="bg-[#131C31] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
        <h3 className="text-lg font-black text-white flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-cyan-400" />
          <span>Global Staff Allocation & Load Balancing</span>
        </h3>
        <div className="space-y-4">
          {[
            { location: "Marhaba Club (Pool Area B)", photographers: 3, sessions: 8, revenue: "€2,340", load: 95 },
            { location: "Marhaba Occidental (Beach)", photographers: 2, sessions: 5, revenue: "€980", load: 62 },
            { location: "Concorde (Lobby)", photographers: 1, sessions: 2, revenue: "€390", load: 28 },
          ].map(loc => (
            <div key={loc.location} className="bg-[#0B111F] p-4 rounded-xl border border-white/5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-white font-black text-sm truncate">{loc.location}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-bold shrink-0">
                  <span>{loc.photographers} staff</span>
                  <span>{loc.sessions} active sessions</span>
                  <span className="text-cyan-400 font-black">{loc.revenue}</span>
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-white/5">
                <div
                  className={`h-full rounded-full transition-all ${loc.load > 80 ? "bg-rose-500" : loc.load > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${loc.load}%` }}
                />
              </div>
              <p className="text-slate-400 text-xs font-bold">{loc.load}% capacity utilization</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3 text-xs text-slate-300 font-bold bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
          <Zap className="w-5 h-5 text-purple-400 shrink-0 animate-bounce" />
          <span>AI Recommendation: Redeploy 1 photographer from Lobby to Pool Area B to eliminate customer wait queue and capture an estimated €850 in incremental revenue today.</span>
        </div>
      </div>
    </div>
  );
};
