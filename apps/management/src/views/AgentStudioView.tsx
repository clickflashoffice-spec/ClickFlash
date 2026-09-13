import { useState } from 'react';
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
