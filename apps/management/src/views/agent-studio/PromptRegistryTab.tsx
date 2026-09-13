import { useState } from 'react';
import {
  Bot, Terminal, Database, Play, RefreshCw, CheckCircle2, FileCode, ShieldCheck, Users, Percent, Camera, MessageSquare, Sparkles, Award
} from 'lucide-react';
import { YieldArbitrageEngine, VisionBridge, type GuestCart, type PhotoQualityMetrics } from '@clickflash/ai';

interface AgentLog {
  timestamp: string;
  type: 'info' | 'tool' | 'result' | 'error';
  message: string;
}

export function PromptRegistryTab() {
  return (
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
  );
}
