import os
import re

with open('apps/management/src/views/AgentStudioView.tsx', 'r', encoding='utf-8') as f:
    source = f.read()

# We can just extract the inner JSX using python.
def extract_tab_jsx(tab_name):
    # Find {activeTab === 'tab_name' && ( ... )}
    pattern = r"\{activeTab === '" + tab_name + r"' && \((.*?)\)\}"
    match = re.search(pattern, source, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""

runner_jsx = extract_tab_jsx('runner')
yield_jsx = extract_tab_jsx('yield')
vision_jsx = extract_tab_jsx('vision')
prompts_jsx = extract_tab_jsx('prompts')
queue_jsx = extract_tab_jsx('queue')

# Now let's write the 5 Tab Components + the Main Component.
imports = """import { useState } from 'react';
import {
  Bot, Terminal, Database, Play, RefreshCw, CheckCircle2, FileCode, ShieldCheck, Users, Percent, Camera, MessageSquare, Sparkles, Award
} from 'lucide-react';
import { YieldArbitrageEngine, VisionBridge, type GuestCart, type PhotoQualityMetrics } from '@clickflash/ai';

interface AgentLog {
  timestamp: string;
  type: 'info' | 'tool' | 'result' | 'error';
  message: string;
}
"""

runner_code = imports + """
export function TaskRunnerTab() {
  const [taskPrompt, setTaskPrompt] = useState('Audit biometric linking logic and check pending SQLite writes.');
  const [isExecuting, setIsExecuting] = useState(false);
  const [mode, setMode] = useState<'single' | 'swarm'>('single');
  const [logs, setLogs] = useState<AgentLog[]>([{ timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'ClickFlash V6.0 Autonomous Studio ready. Curated registry linked.' }]);
  const [agentResult, setAgentResult] = useState<string | null>(null);

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
        ? "### 🤖 ClickFlash Autonomous Agent Execution Summary\\n\\n- **Rule Invariants Verified**: No Master OS UI bloat, zero QR codes.\\n- **Queue Durability**: 3 pending writes verified in local SQLite queue.\\n- **Turborepo Health**: packages/ai, packages/types, and apps/desktop/master all typechecked cleanly.\\n\\n*Action plan generated and ready for deployment.*"
        : "### 👑 Swarm CEO Orchestration Report\\n\\n1. **Edge Architecture Agent**: Verified DbWriteQueue.ts schema durability.\\n2. **Cloud & Pricing Agent**: Evaluated dynamic yield tier for biometric guest pass.\\n3. **QA & Boundary Agent**: Validated npm run typecheck:all (0 errors).\\n\\n**Final Conclusion**: Swarm consensus reached with 100% boundary safety.";

      setLogs(prev => [...prev, { timestamp: finishTime, type: 'result', message: 'Agent loop concluded with verified result.' }]);
      setAgentResult(mockResult);
      setIsExecuting(false);
    }, 1500);
  };

  return (
""" + "    " + runner_jsx + "\n  );\n}\n"

yield_code = imports + """
export function YieldArbitrageTab() {
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

  return (
""" + "    " + yield_jsx + "\n  );\n}\n"

vision_code = imports + """
export function VisionCullingTab() {
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

  return (
""" + "    " + vision_jsx + "\n  );\n}\n"

prompts_code = imports + """
export function PromptRegistryTab() {
  return (
""" + "    " + prompts_jsx + "\n  );\n}\n"

queue_code = imports + """
export function SQLiteQueueTab() {
  const [queueStats] = useState({
    pending: 3,
    flushing: 1,
    failed: 0,
    oldestPending: '24s ago',
    sentinelUptime: '99.98%',
    dbPath: 'apps/desktop/master/star_master.db (SQLite triple-write)'
  });

  return (
""" + "    " + queue_jsx + "\n  );\n}\n"

with open('apps/management/src/views/agent-studio/TaskRunnerTab.tsx', 'w', encoding='utf-8') as f: f.write(runner_code)
with open('apps/management/src/views/agent-studio/YieldArbitrageTab.tsx', 'w', encoding='utf-8') as f: f.write(yield_code)
with open('apps/management/src/views/agent-studio/VisionCullingTab.tsx', 'w', encoding='utf-8') as f: f.write(vision_code)
with open('apps/management/src/views/agent-studio/PromptRegistryTab.tsx', 'w', encoding='utf-8') as f: f.write(prompts_code)
with open('apps/management/src/views/agent-studio/SQLiteQueueTab.tsx', 'w', encoding='utf-8') as f: f.write(queue_code)

# Now rewrite AgentStudioView
main_view = """import { useState } from 'react';
import { Bot, Play, Percent, Camera, FileCode, Database } from 'lucide-react';
import { TaskRunnerTab } from './agent-studio/TaskRunnerTab';
import { YieldArbitrageTab } from './agent-studio/YieldArbitrageTab';
import { VisionCullingTab } from './agent-studio/VisionCullingTab';
import { PromptRegistryTab } from './agent-studio/PromptRegistryTab';
import { SQLiteQueueTab } from './agent-studio/SQLiteQueueTab';

export function AgentStudioView() {
  const [activeTab, setActiveTab] = useState<'runner' | 'yield' | 'vision' | 'prompts' | 'queue'>('runner');

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
              activeTab === 'runner' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Task Runner
          </button>
          <button
            onClick={() => setActiveTab('yield')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'yield' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" /> Yield Arbitrage
          </button>
          <button
            onClick={() => setActiveTab('vision')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'vision' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Biometric Culling
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'prompts' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" /> Prompt Registry
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'queue' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> SQLite Queue
          </button>
        </div>
      </div>

      {/* Dynamic Content */}
      {activeTab === 'runner' && <TaskRunnerTab />}
      {activeTab === 'yield' && <YieldArbitrageTab />}
      {activeTab === 'vision' && <VisionCullingTab />}
      {activeTab === 'prompts' && <PromptRegistryTab />}
      {activeTab === 'queue' && <SQLiteQueueTab />}
    </div>
  );
}
"""

with open('apps/management/src/views/AgentStudioView.tsx', 'w', encoding='utf-8') as f:
    f.write(main_view)

print("Split completed successfully.")
