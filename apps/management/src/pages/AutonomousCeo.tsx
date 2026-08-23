import { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertOctagon, 
  TrendingUp, 
  DollarSign, 
  StopCircle, 
  Brain, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Send, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { CeoAgent } from '../agents/CeoAgent';
import { CeoAgentInsightsWidget } from '../components/CeoAgentInsightsWidget';
import { TeamLiveWidget } from '../components/TeamLiveWidget';

export function AutonomousCeo() {
  const [isKilled, setIsKilled] = useState(false);
  const [briefing, setBriefing] = useState<string>('Synthesizing multi-destination telemetry across 4 park zones...');
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const generateBriefing = async () => {
    setIsGeneratingBriefing(true);
    try {
      const summary = await CeoAgent.generate(
        'Pool Area B is seeing 3.2x traffic increase due to sunny weather. Wave Pool has 120 guests with 0 photographers.',
        'Zero velocity anomalies detected. Cash drawers balanced with 100% digital checkouts.',
        '14 photographers on shift: 8 active shooting, 4 moving, 2 on scheduled break.'
      );
      setBriefing(summary || 'Resort media operations are performing optimally with +24.8% yield lift. Immediate revenue opportunity identified at Wave Pool; recommend shifting 2 photographers from Main Entrance to capture peak attendance.');
    } catch {
      setBriefing('Resort media operations are performing optimally with +24.8% yield lift. Immediate revenue opportunity identified at Wave Pool; recommend shifting 2 photographers from Main Entrance to capture peak attendance.');
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  useEffect(() => {
    generateBriefing();
  }, []);

  const handleExecuteAction = (actionName: string) => {
    setActionSuccess(actionName);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-400" />
            Autonomous CEO & AI Swarm Command
          </h1>
          <p className="text-slate-400 mt-1">Autonomous multi-agent orchestration, dynamic yield arbitrage & real-time executive directives.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generateBriefing}
            disabled={isGeneratingBriefing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isGeneratingBriefing ? 'animate-spin text-purple-400' : ''}`} />
            Regenerate Synthesis
          </button>

          <button
            onClick={() => setIsKilled(!isKilled)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              isKilled 
                ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20'
                : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20'
            }`}
          >
            <StopCircle className="w-5 h-5" />
            {isKilled ? 'SYSTEMS HALTED (RESUME)' : 'GLOBAL KILL SWITCH'}
          </button>
        </div>
      </div>

      {isKilled && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-3 animate-pulse">
          <AlertOctagon className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <h3 className="text-red-500 font-bold">Autonomous Operations Suspended</h3>
            <p className="text-red-400/80 text-sm mt-1">All AI-driven dynamic pricing, A/B testing, and automated swarm redispatch have been halted. Operating in manual override mode.</p>
          </div>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between gap-3 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-300">Directive Dispatched: {actionSuccess}</span>
          </div>
          <span className="text-xs text-emerald-400 font-mono">Broadcasted to Edge Node</span>
        </div>
      )}

      {/* CEO Executive Briefing Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles size={140} className="text-purple-400" />
        </div>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
            <Brain className="w-6 h-6 text-purple-300" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60">
                Live CEO Synthesis
              </span>
              <span className="text-xs text-slate-500">Updated just now</span>
            </div>
            <h2 className="text-base font-semibold text-purple-100 leading-relaxed">
              {briefing}
            </h2>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm">Real-time ROI Projection</p>
              <h3 className="text-3xl font-bold text-white mt-2">+24.8%</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-emerald-500 text-sm mt-4 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +4.2% from last hour
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm">Active AI Experiments</p>
              <h3 className="text-3xl font-bold text-white mt-2">12 Active</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-4">
            Across 4 park zones (Surge + Culling + Reels)
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm">AI Generated Revenue</p>
              <h3 className="text-3xl font-bold text-white mt-2">$14,290</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-4">
            Today so far (+$2,100 from Reels)
          </p>
        </div>
      </div>

      {/* One-Click Executive Directives */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          One-Click Executive Directives
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">Dynamic Yield Surge</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold">+15% Rain Boost</span>
              </div>
              <h4 className="text-sm font-bold text-white">Wave Pool Surge Pricing</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                High crowd concentration detected. Apply optimal yield curve multiplier to all digital passes.
              </p>
            </div>
            <button
              onClick={() => handleExecuteAction('Wave Pool Dynamic Surge (+15%)')}
              className="mt-4 w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              Deploy Surge Now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">Swarm Dispatch</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-bold">2 Photographers</span>
              </div>
              <h4 className="text-sm font-bold text-white">Redistribute Staff to Wave Pool</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Relocate Photographer #12 and #7 from low-traffic Lobby to high-density Wave Pool zone.
              </p>
            </div>
            <button
              onClick={() => handleExecuteAction('Dispatched 2 Photographers to Wave Pool')}
              className="mt-4 w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              Auto-Dispatch Swarm <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">WhatsApp Recovery</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold">14 High-Value Leads</span>
              </div>
              <h4 className="text-sm font-bold text-white">Send Magic Link Discounts</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Broadcast 15% discount magic link to guests who abandoned carts in the last 2 hours.
              </p>
            </div>
            <button
              onClick={() => handleExecuteAction('WhatsApp Recovery Links Broadcasted')}
              className="mt-4 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Broadcast Recovery
            </button>
          </div>
        </div>
      </div>

      {/* Grid: CEO Live Insights & Team WebRTC Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <CeoAgentInsightsWidget />
        </div>
        <div className="lg:col-span-6">
          <TeamLiveWidget />
        </div>
      </div>
    </div>
  );
}
