import React, { useState, useEffect } from "react";
import {
  Users, Activity, AlertTriangle, Wifi, WifiOff, Star, TrendingUp,
  MessageSquare, Zap, ChevronRight, Filter, Send, X, Camera, RefreshCw, Sparkles
} from "lucide-react";
import { aiIntelligenceService, ManagerFlag } from "@/services/aiIntelligenceService";

const INITIAL_FLEET = [
  { id: "p1", name: "Lucas Hernandez", avatar: "lucas", location: "Pool Area B", status: "online", currentSession: "Session #4821", revenue_today: 640, conversion_rate: 68, last_seen: "Active now", ai_flag: null as string | null },
  { id: "p2", name: "Sofia Marchetti", avatar: "sofia", location: "Beach Front", status: "flagged", currentSession: "Session #4819", revenue_today: 120, conversion_rate: 18, last_seen: "Active now", ai_flag: "Conversion rate critically low (18%). Customer satisfaction at risk." },
  { id: "p3", name: "Ahmed Al-Rashid", avatar: "ahmed", location: "Lobby", status: "idle", currentSession: null as string | null, revenue_today: 390, conversion_rate: 51, last_seen: "8 mins ago", ai_flag: null as string | null },
  { id: "p4", name: "Elena Kovacs", avatar: "elena", location: "Sunset Point", status: "online", currentSession: "Session #4823", revenue_today: 890, conversion_rate: 74, last_seen: "Active now", ai_flag: null as string | null },
  { id: "p5", name: "Yusuf Ozturk", avatar: "yusuf", location: "---", status: "offline", currentSession: null as string | null, revenue_today: 0, conversion_rate: 0, last_seen: "2 hours ago", ai_flag: "Photographer did not check-in today. No GPS signal." },
];

type FleetMember = typeof INITIAL_FLEET[0];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  online:  { label: "Online",  color: "text-emerald-400", bg: "bg-emerald-400", ring: "ring-1 ring-emerald-500/40 border-emerald-500/20" },
  idle:    { label: "Idle",    color: "text-amber-400",   bg: "bg-amber-400",   ring: "ring-1 ring-amber-500/40 border-amber-500/20"   },
  offline: { label: "Offline", color: "text-slate-500",   bg: "bg-slate-500",   ring: "ring-1 ring-slate-500/30 border-slate-500/20"   },
  flagged: { label: "Flagged", color: "text-rose-400",    bg: "bg-rose-400",    ring: "ring-2 ring-rose-500 border-rose-500/40 bg-rose-500/5"    },
};

export const AIManagerWorkspace: React.FC = () => {
  const [fleet, setFleet] = useState<FleetMember[]>(INITIAL_FLEET);
  const [filterStatus, setFilterStatus] = useState("all");
  const [coachingTarget, setCoachingTarget] = useState<FleetMember | null>(null);
  const [coachingMessage, setCoachingMessage] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [generatingCoach, setGeneratingCoach] = useState(false);

  const runAIFleetScan = async () => {
    setLoadingAI(true);
    try {
      const aiFlags = await aiIntelligenceService.fetchManagerFlags(fleet);
      setFleet(prev => prev.map(member => {
        const flagObj = aiFlags.find(f => f.photographerId === member.id);
        if (flagObj) {
          return {
            ...member,
            status: "flagged",
            ai_flag: flagObj.flagReason
          };
        }
        return member;
      }));
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    runAIFleetScan();
  }, []);

  const handleOpenCoaching = (target: FleetMember) => {
    setCoachingTarget(target);
    const defaultMsg = target.ai_flag
      ? `Hi ${target.name.split(" ")[0]}, your conversion rate is at ${target.conversion_rate}%. Focus on group shots and upselling album packages today.`
      : `Hi ${target.name.split(" ")[0]}, great work! Your ${target.conversion_rate}% conversion is above target. Keep it up!`;
    setCoachingMessage(defaultMsg);
  };

  const handleRegenerateCoaching = async () => {
    if (!coachingTarget) return;
    setGeneratingCoach(true);
    try {
      const prompt = `Write a short, highly motivating 3-sentence coaching dispatch for resort photographer ${coachingTarget.name}.
Current conversion rate: ${coachingTarget.conversion_rate}%. Today's revenue: EUR ${coachingTarget.revenue_today}. Status: ${coachingTarget.status}. Flag reason: ${coachingTarget.ai_flag || "None"}.
Provide tactical tips to improve their sunset or poolside guest interaction.`;
      const aiResponse = await aiIntelligenceService.queryAssistant(prompt, { photographer: coachingTarget });
      setCoachingMessage(aiResponse);
    } finally {
      setGeneratingCoach(false);
    }
  };

  const flags = fleet.filter(p => p.ai_flag);
  const onlineCount = fleet.filter(p => p.status === "online").length;
  const totalRevenue = fleet.reduce((sum, p) => sum + p.revenue_today, 0);
  const validRates = fleet.filter(p => p.conversion_rate > 0);
  const avgConversion = validRates.length
    ? Math.round(validRates.reduce((sum, p) => sum + p.conversion_rate, 0) / validRates.length)
    : 0;
  const filtered = filterStatus === "all" ? fleet : fleet.filter(p => p.status === filterStatus);

  return (
    <div className="p-4 lg:p-8 space-y-6 bg-[#0B111F] min-h-screen text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131C31] p-6 rounded-2xl border border-white/10 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-black uppercase tracking-wider border border-purple-500/30">
              Coaching & Dispatch Controller
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-black text-white font-serif flex items-center gap-3">
            <Users className="w-7 h-7 text-purple-400 animate-pulse" />
            AI Manager Workspace
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time fleet telemetry, automated conversion flagging, and instant coaching dispatch</p>
        </div>
        <button
          onClick={runAIFleetScan}
          disabled={loadingAI}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl font-black text-sm transition-all shadow-xl min-h-[48px] active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loadingAI ? "animate-spin" : ""}`} />
          <span>{loadingAI ? "Scanning D1 Telemetry..." : "Run AI Fleet Scan"}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#131C31] border border-white/10 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
          <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30 shrink-0">
            <Wifi className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Online Fleet</p>
            <p className="text-2xl lg:text-3xl font-black text-emerald-400 mt-0.5">{onlineCount} / {fleet.length}</p>
          </div>
        </div>
        <div className="bg-[#131C31] border border-rose-500/30 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
          <div className="p-3 bg-rose-500/20 rounded-xl border border-rose-500/30 shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-400 animate-bounce" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Flagged Alerts</p>
            <p className="text-2xl lg:text-3xl font-black text-rose-400 mt-0.5">{flags.length}</p>
          </div>
        </div>
        <div className="bg-[#131C31] border border-white/10 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
          <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-500/30 shrink-0">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Today's Revenue</p>
            <p className="text-2xl lg:text-3xl font-black text-cyan-400 mt-0.5">€{totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-[#131C31] border border-white/10 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
          <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/30 shrink-0">
            <Star className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Avg Conversion</p>
            <p className="text-2xl lg:text-3xl font-black text-amber-400 mt-0.5">{avgConversion}%</p>
          </div>
        </div>
      </div>

      {/* Hardware / Consumables Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#131C31] border border-cyan-500/30 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
              <Camera className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Fleet Shutter Telemetry</p>
              <p className="text-white font-black text-base mt-0.5">Nikon D750 @ 152k actuations</p>
              <p className="text-cyan-400 text-xs font-bold mt-0.5">Shutter Maintenance Recommended within 14 days</p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 bg-cyan-500/20 text-cyan-300 font-black text-xs rounded-xl border border-cyan-500/40 shrink-0">
            92% Health
          </span>
        </div>

        <div className="bg-[#131C31] border border-purple-500/30 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-purple-500/10 rounded-xl border border-purple-500/30">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Kiosk Consumables Alert</p>
              <p className="text-white font-black text-base mt-0.5">Epson D800 Paper Roll @ 12%</p>
              <p className="text-purple-400 text-xs font-bold mt-0.5">Replenish roll before peak evening rush (17:00)</p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 bg-purple-500/20 text-purple-300 font-black text-xs rounded-xl border border-purple-500/40 shrink-0">
            Action Needed
          </span>
        </div>
      </div>

      {/* Flagged Alerts Section */}
      {flags.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 animate-pulse" /> AI Automated Flags ({flags.length} Photographers Requiring Intervention)
          </h3>
          {flags.map(p => (
            <div key={p.id} className="bg-[#131C31] border-2 border-rose-500/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-black text-base">{p.name}</h4>
                    <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-black text-[10px] uppercase">
                      Critically Flagged
                    </span>
                  </div>
                  <p className="text-rose-300 text-xs font-bold mt-1">{p.ai_flag}</p>
                </div>
              </div>
              <button 
                onClick={() => handleOpenCoaching(p)} 
                className="flex items-center justify-center gap-2 px-5 py-3 bg-purple-500 hover:bg-purple-400 text-black font-black text-sm rounded-xl transition-all shadow-lg shadow-purple-500/20 active:scale-95 shrink-0 min-h-[48px]"
              >
                <Zap className="w-4 h-4" />
                <span>Dispatch AI Coaching</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Fleet Roster & Filters */}
      <div className="bg-[#131C31] rounded-2xl border border-white/10 p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <h3 className="text-base font-black text-white flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-cyan-400" />
            <span>Active Fleet Roster ({fleet.length} Photographers)</span>
          </h3>
          <div className="flex items-center gap-1.5 bg-[#0B111F] p-1.5 rounded-xl border border-white/10">
            <Filter className="w-4 h-4 text-slate-400 ml-2" />
            {["all", "online", "idle", "flagged", "offline"].map(s => (
              <button 
                key={s} 
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-lg text-xs font-black capitalize transition-all min-h-[40px] ${
                  filterStatus === s 
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-md" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(p => {
            const sc = STATUS_CONFIG[p.status];
            return (
              <div key={p.id} className={`bg-[#0B111F] border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-lg hover:border-white/20 ${sc.ring}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-slate-800 border border-white/10 overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.avatar}&backgroundColor=b6e3f4`} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 ${sc.bg} rounded-full border-2 border-[#0B111F] shadow-lg`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-black text-base truncate">{p.name}</h4>
                      {p.ai_flag && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      <span className={`text-xs font-black px-2 py-0.5 rounded bg-white/5 border border-white/5 ${sc.color}`}>{sc.label}</span>
                      {p.location && p.location !== "---" && <span className="text-xs font-bold text-slate-400">{p.location}</span>}
                      {p.currentSession && <span className="text-xs font-bold text-cyan-400 flex items-center gap-1"><Activity className="w-3.5 h-3.5" />{p.currentSession}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
                  <div className="text-center sm:text-right">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Revenue</p>
                    <p className="text-white font-black text-base">€{p.revenue_today}</p>
                  </div>
                  <div className="text-center sm:text-right">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Conversion</p>
                    <p className={`font-black text-base ${p.conversion_rate >= 40 ? "text-emerald-400" : p.conversion_rate > 0 ? "text-rose-400" : "text-slate-500"}`}>
                      {p.conversion_rate > 0 ? `${p.conversion_rate}%` : "---"}
                    </p>
                  </div>
                  <div className="text-center sm:text-right">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Status</p>
                    <p className="text-slate-300 font-bold text-xs flex items-center sm:justify-end gap-1">
                      {p.status === "online" ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" />Now</> : <><WifiOff className="w-3.5 h-3.5 text-slate-500" />{p.last_seen}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleOpenCoaching(p)} 
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-xl text-purple-300 font-black text-xs transition-all min-h-[44px] active:scale-95"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Coach</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Fitts' Law Coaching Dispatch */}
      {coachingTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setCoachingTarget(null)}>
          <div className="bg-[#131C31] border border-white/15 rounded-3xl p-6 lg:p-8 w-full max-w-xl shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-black text-lg">AI Coaching Dispatch</h3>
                  <p className="text-slate-400 text-xs font-bold">Recipient: {coachingTarget.name} ({coachingTarget.location})</p>
                </div>
              </div>
              <button onClick={() => setCoachingTarget(null)} className="p-2.5 hover:bg-white/10 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Personalized Dispatch Text</span>
                <button
                  onClick={handleRegenerateCoaching}
                  disabled={generatingCoach}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-black transition-all min-h-[44px] active:scale-95"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${generatingCoach ? "animate-spin" : ""}`} />
                  <span>{generatingCoach ? "Gemini Synthesizing..." : "Regenerate with Gemini"}</span>
                </button>
              </div>

              <textarea
                value={coachingMessage}
                onChange={(e) => setCoachingMessage(e.target.value)}
                rows={5}
                className="w-full bg-[#0B111F] border border-white/15 rounded-2xl p-4 text-sm text-white font-medium focus:outline-none focus:border-purple-500 resize-none leading-relaxed shadow-inner"
              />

              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 px-1">
                <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Powered by Fotiqo Gemini AI. Sent via WebSocket directly to Staff App.</span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => setCoachingTarget(null)}
                  className="flex-1 py-3.5 rounded-xl font-black text-sm bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all min-h-[48px]"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setCoachingTarget(null)} 
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm bg-purple-500 hover:bg-purple-400 text-black transition-all shadow-lg shadow-purple-500/30 min-h-[48px] active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Send to {coachingTarget.name.split(" ")[0]}'s App</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
