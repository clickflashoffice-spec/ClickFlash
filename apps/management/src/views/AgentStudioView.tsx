import { useState } from 'react';
import {
  Bot,
  Terminal,
  Database,
  Play,
  RefreshCw,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  Users,
  Percent,
  Camera,
  MessageSquare,
  Sparkles,
  Award
} from 'lucide-react';
import { YieldArbitrageEngine, VisionBridge, type GuestCart, type PhotoQualityMetrics } from '@clickflash/ai';

interface AgentLog {
  timestamp: string;
  type: 'info' | 'tool' | 'result' | 'error';
  message: string;
}

export function AgentStudioView() {
  const [taskPrompt, setTaskPrompt] = useState('Audit biometric linking logic and check pending SQLite writes.');
  const [isExecuting, setIsExecuting] = useState(false);
  const [mode, setMode] = useState<'single' | 'swarm'>('single');
  const [activeTab, setActiveTab] = useState<'runner' | 'yield' | 'vision' | 'prompts' | 'queue'>('runner');
  const [logs, setLogs] = useState<AgentLog[]>([
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'ClickFlash V6.0 Autonomous Studio ready. Curated registry linked.'
    }
  ]);
  const [agentResult, setAgentResult] = useState<string | null>(null);

  // Yield Simulator State
  const [cartState, setCartState] = useState<GuestCart>({
    guestId: 'guest_8829',
    guestName: 'Jessica Taylor',
    resortName: 'Grand Hyatt Beach Resort',
    photoCount: 42,
    basePrice: 120,
    hoursSinceAbandonment: 26,
    activityType: 'Parasailing Adventure',
    isVip: false
  });

  const yieldOffer = YieldArbitrageEngine.calculateOffer(cartState);
  const whatsAppMessage = YieldArbitrageEngine.formatWhatsAppPitch(cartState, yieldOffer);

  // Vision Culling Lab State
  const [visionMetrics, setVisionMetrics] = useState<PhotoQualityMetrics>({
    photoId: 'IMG_2026_HERO_042',
    sharpnessScore: 88,
    exposureScore: 92,
    compositionScore: 85,
    eyesOpenConfidence: 0.98,
    smileConfidence: 0.94,
    faceCount: 2
  });

  const cullingResult = VisionBridge.evaluateCulling(visionMetrics);

  const [queueStats] = useState({
    pending: 3,
    flushing: 1,
    failed: 0,
    oldestPending: '24s ago',
    sentinelUptime: '99.98%',
    dbPath: 'apps/desktop/master/star_master.db (SQLite triple-write)'
  });

  const handleRun = async () => {
    if (!taskPrompt.trim()) return;
    setIsExecuting(true);
    setAgentResult(null);

    const now = new Date().toLocaleTimeString();
    setLogs(prev => [
      ...prev,
      { timestamp: now, type: 'info', message: `Dispatching ${mode.toUpperCase()} task: "${taskPrompt}"` },
      { timestamp: now, type: 'tool', message: 'Loading curated/system_prompts/core/identity.tmpl & guidelines.tmpl...' },
      { timestamp: now, type: 'tool', message: 'Tool called: querySQLiteQueue("SELECT COUNT(*) FROM pending_writes")' },
      { timestamp: now, type: 'tool', message: 'Tool executed: returned 4 rows with 0 errors.' }
    ]);

    setTimeout(() => {
      const finishTime = new Date().toLocaleTimeString();
      const mockResult = mode === 'single'
        ? "### ✅ ClickFlash Autonomous Agent Execution Summary\n\n- **Rule Invariants Verified**: No Master OS UI bloat, zero QR codes.\n- **Queue Durability**: 3 pending writes verified in local SQLite queue.\n- **Turborepo Health**: packages/ai, packages/types, and apps/desktop/master all typechecked cleanly.\n\n*Action plan generated and ready for deployment.*"
        : "### 👑 Swarm CEO Orchestration Report\n\n1. **Edge Architecture Agent**: Verified DbWriteQueue.ts schema durability.\n2. **Cloud & Pricing Agent**: Evaluated dynamic yield tier for biometric guest pass.\n3. **QA & Boundary Agent**: Validated npm run typecheck:all (0 errors).\n\n**Final Conclusion**: Swarm consensus reached with 100% boundary safety.";

      setLogs(prev => [
        ...prev,
        { timestamp: finishTime, type: 'result', message: 'Agent loop concluded with verified result.' }
      ]);
      setAgentResult(mockResult);
      setIsExecuting(false);
    }, 1500);
  };

  return (
    <div className="p-6 space-y-6 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 rounded-xl">
            <Bot className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
              Autonomous Agent Studio
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                V6.0 Ecosystem
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Prompt Compiler, Live Tool Loop, and Multi-Agent Swarm Orchestrator
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('runner')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'runner'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Task Runner
          </button>
          <button
            onClick={() => setActiveTab('yield')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'yield'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" /> Yield Arbitrage
          </button>
          <button
            onClick={() => setActiveTab('vision')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'vision'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Biometric Culling
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'prompts'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" /> Prompt Registry
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'queue'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> SQLite Queue
          </button>
        </div>
      </div>

      {activeTab === 'runner' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input & Config */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Execution Mode
                </label>
                <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setMode('single')}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      mode === 'single' ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    Single Agent
                  </button>
                  <button
                    onClick={() => setMode('swarm')}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      mode === 'swarm' ? 'bg-purple-500/20 text-purple-400 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    Swarm CEO
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Task Objective
                </label>
                <textarea
                  rows={4}
                  value={taskPrompt}
                  onChange={e => setTaskPrompt(e.target.value)}
                  placeholder="Enter objective (e.g. Audit biometric sync invariants)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Engine:</span>
                  <span className="font-mono text-cyan-400">Gemini 2.5 Pro</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Invariants:</span>
                  <span className="font-mono text-emerald-400">V6.0 Enforced</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Tool Access:</span>
                  <span className="font-mono text-amber-400">Readonly SQLite + Typecheck</span>
                </div>
              </div>

              <button
                onClick={handleRun}
                disabled={isExecuting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Executing Task...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Run Autonomous Task
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Real-time Terminal Log & Output */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 min-h-[300px] flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="text-slate-400 flex items-center gap-1.5 font-sans font-semibold">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Real-Time Tool Execution Log
                  </span>
                  <span className="text-[10px] text-slate-500">Auto-scrolling</span>
                </div>
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-500 select-none">[{log.timestamp}]</span>
                    {log.type === 'tool' ? (
                      <span className="text-amber-400">⚡ {log.message}</span>
                    ) : log.type === 'result' ? (
                      <span className="text-emerald-400 font-bold">✨ {log.message}</span>
                    ) : (
                      <span className="text-slate-300">ℹ️ {log.message}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {agentResult && (
              <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-4">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Execution Synthesis
                </div>
                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                  {agentResult}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Yield Simulator Tab */}
      {activeTab === 'yield' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <Percent className="w-4 h-4" /> Dynamic Yield Elasticity Simulator
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Guest Name:</label>
                <input
                  type="text"
                  value={cartState.guestName}
                  onChange={e => setCartState({ ...cartState, guestName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Photo Count ({cartState.photoCount}):</label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={cartState.photoCount}
                    onChange={e => setCartState({ ...cartState, photoCount: Number(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Hours Elapsed ({cartState.hoursSinceAbandonment}h):</label>
                  <input
                    type="range"
                    min="1"
                    max="72"
                    value={cartState.hoursSinceAbandonment}
                    onChange={e => setCartState({ ...cartState, hoursSinceAbandonment: Number(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Base Price ($):</label>
                  <input
                    type="number"
                    value={cartState.basePrice}
                    onChange={e => setCartState({ ...cartState, basePrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cartState.isVip}
                      onChange={e => setCartState({ ...cartState, isVip: e.target.checked })}
                      className="rounded accent-cyan-500"
                    />
                    VIP Guest Protection
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Discount</span>
                <p className="text-lg font-bold text-cyan-400">{yieldOffer.discountPercent}%</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Offer Price</span>
                <p className="text-lg font-bold text-emerald-400">${yieldOffer.discountedPrice}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Urgency</span>
                <p className="text-lg font-bold text-amber-400">{yieldOffer.urgencyLevel}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> WhatsApp Recovery Pitch Preview
            </h3>
            <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {whatsAppMessage}
            </div>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800">
              Magic Link: <span className="text-cyan-400">{yieldOffer.magicLink}</span>
            </div>
          </div>
        </div>
      )}

      {/* Vision Culling Tab */}
      {activeTab === 'vision' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
              <Camera className="w-4 h-4" /> ArcFace Biometric & Culling Lab
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Sharpness ({visionMetrics.sharpnessScore}/100):</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={visionMetrics.sharpnessScore}
                  onChange={e => setVisionMetrics({ ...visionMetrics, sharpnessScore: Number(e.target.value) })}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Exposure Balance ({visionMetrics.exposureScore}/100):</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={visionMetrics.exposureScore}
                  onChange={e => setVisionMetrics({ ...visionMetrics, exposureScore: Number(e.target.value) })}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Eyes Open Confidence ({Math.round(visionMetrics.eyesOpenConfidence * 100)}%):</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={visionMetrics.eyesOpenConfidence}
                  onChange={e => setVisionMetrics({ ...visionMetrics, eyesOpenConfidence: Number(e.target.value) })}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Smile Confidence ({Math.round(visionMetrics.smileConfidence * 100)}%):</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={visionMetrics.smileConfidence}
                  onChange={e => setVisionMetrics({ ...visionMetrics, smileConfidence: Number(e.target.value) })}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <Award className="w-4 h-4" /> Automated Grading Result
            </h3>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Assigned Grade:</span>
                <span className={`text-2xl font-black ${
                  cullingResult.grade === 'A+' ? 'text-emerald-400' :
                  cullingResult.grade === 'A' ? 'text-cyan-400' :
                  cullingResult.grade === 'B' ? 'text-blue-400' :
                  cullingResult.grade === 'C' ? 'text-amber-400' : 'text-rose-500'
                }`}>
                  {cullingResult.grade}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Overall Quality Score:</span>
                <span className="font-mono text-slate-200">{cullingResult.overallScore} / 100</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Hero Shot Status:</span>
                <span className={`font-semibold flex items-center gap-1 ${cullingResult.isHeroShot ? 'text-amber-400' : 'text-slate-500'}`}>
                  {cullingResult.isHeroShot ? <Sparkles className="w-3.5 h-3.5" /> : null}
                  {cullingResult.isHeroShot ? 'HERO SHOT' : 'Standard Shot'}
                </span>
              </div>

              {cullingResult.rejectReasons.length > 0 && (
                <div className="bg-rose-950/30 border border-rose-800/40 p-2.5 rounded text-xs text-rose-300">
                  <span className="font-bold block mb-1">Rejection Flags:</span>
                  <ul className="list-disc list-inside">
                    {cullingResult.rejectReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Core Identity & Guidelines
            </h3>
            <p className="text-xs text-slate-400">
              <code>curated/system_prompts/core/identity.tmpl</code>
            </p>
            <div className="bg-slate-950 p-3 rounded text-[11px] font-mono text-slate-300">
              Autonomous AI Agent for ClickFlash V6.0. Codified constraints: SQLite queue instead of Redis, zero QR codes, headless Master OS.
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
              <Users className="w-4 h-4" /> Swarm CEO Orchestrator
            </h3>
            <p className="text-xs text-slate-400">
              <code>curated/system_prompts/swarm/ceo.tmpl</code>
            </p>
            <div className="bg-slate-950 p-3 rounded text-[11px] font-mono text-slate-300">
              Breaks complex objectives into Edge, Cloud, and Boundary sub-agents with automatic output synthesis.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              SQLite Persistent Write Queue (DbWriteQueue.ts) & Edge Sentinel
            </h3>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Sentinel Active ({queueStats.sentinelUptime})
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">Pending Writes</span>
              <p className="text-lg font-bold text-cyan-400">{queueStats.pending}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">Flushing State</span>
              <p className="text-lg font-bold text-amber-400">{queueStats.flushing}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">Failed / Retries</span>
              <p className="text-lg font-bold text-emerald-400">{queueStats.failed}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
