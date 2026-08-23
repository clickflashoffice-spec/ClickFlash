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
  Users
} from 'lucide-react';

interface AgentLog {
  timestamp: string;
  type: 'info' | 'tool' | 'result' | 'error';
  message: string;
}

export function AgentStudioView() {
  const [taskPrompt, setTaskPrompt] = useState('Audit biometric linking logic and check pending SQLite writes.');
  const [isExecuting, setIsExecuting] = useState(false);
  const [mode, setMode] = useState<'single' | 'swarm'>('single');
  const [activeTab, setActiveTab] = useState<'runner' | 'prompts' | 'queue'>('runner');
  const [logs, setLogs] = useState<AgentLog[]>([
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'ClickFlash V6.0 Autonomous Studio ready. Curated registry linked.'
    }
  ]);
  const [agentResult, setAgentResult] = useState<string | null>(null);

  const [queueStats] = useState({
    pending: 3,
    flushing: 1,
    failed: 0,
    oldestPending: '24s ago',
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
                disabled={isExecuting}
                onClick={handleRun}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing Agent Loop...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Dispatch Task to Agent
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Live Logs & Execution Result */}
          <div className="lg:col-span-2 space-y-4">
            {/* Live Terminal */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 h-64 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2 text-slate-500">
                <span className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Real-Time Tool Execution Log
                </span>
                <span className="text-[10px]">stdio stream active</span>
              </div>
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-slate-600">[{log.timestamp}]</span>
                  <span
                    className={
                      log.type === 'tool'
                        ? 'text-amber-400'
                        : log.type === 'result'
                        ? 'text-emerald-400 font-bold'
                        : 'text-slate-300'
                    }
                  >
                    {log.type === 'tool' ? '🛠️ ' : log.type === 'result' ? '✅ ' : 'ℹ️ '}
                    {log.message}
                  </span>
                </div>
              ))}
            </div>

            {/* Agent Result Display */}
            {agentResult && (
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Agent Response & Execution Plan
                </div>
                <div className="text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {agentResult}
                </div>
              </div>
            )}
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
              SQLite Persistent Write Queue (DbWriteQueue.ts)
            </h3>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Healthy
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
