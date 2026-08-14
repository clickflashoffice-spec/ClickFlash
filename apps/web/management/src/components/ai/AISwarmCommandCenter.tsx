import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Bot, Activity, Settings2, Zap, AlertTriangle, Play, Pause, ChevronRight } from 'lucide-react';

interface AgentLog {
  id: string;
  timestamp: Date;
  agents: string[];
  message: string;
  type: 'info' | 'warning' | 'action';
}

const INITIAL_LOGS: AgentLog[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    agents: ['AI Location Scout', 'AI Manager'],
    message: 'Scout detects high foot traffic at Resort A → Manager alerts photographer on standby.',
    type: 'action',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    agents: ['AI CEO', 'AI Marketing Agent'],
    message: 'CEO adjusts pricing trigger (+15%) due to demand surge → Marketing pauses discount campaigns.',
    type: 'action',
  },
];

export const AISwarmCommandCenter: React.FC = () => {
  const [logs, setLogs] = useState<AgentLog[]>(INITIAL_LOGS);
  const [isSwarmActive, setIsSwarmActive] = useState(true);
  const [priorityLevel, setPriorityLevel] = useState<number>(75);

  const agents = [
    { name: 'AI Location Scout', status: 'active', load: 45 },
    { name: 'AI Manager', status: 'active', load: 82 },
    { name: 'AI CEO', status: 'standby', load: 12 },
    { name: 'AI Marketing Agent', status: 'active', load: 64 },
  ];

  const handleTriggerSync = () => {
    const newLog: AgentLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      agents: ['System'],
      message: 'Manual Swarm Sync triggered. Re-evaluating all agent states.',
      type: 'info',
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-500" />
            AI Swarm Command Center
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor and control multi-agent collaboration in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSwarmActive(!isSwarmActive)}
            className={twMerge(
              clsx(
                "px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors",
                isSwarmActive 
                  ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
              )
            )}
          >
            {isSwarmActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isSwarmActive ? 'Halt Swarm' : 'Activate Swarm'}
          </button>
          <button
            onClick={handleTriggerSync}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Trigger Swarm Sync
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <div key={agent.name} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-slate-900 dark:text-slate-100">{agent.name}</span>
              <span className={twMerge(
                clsx(
                  "w-2.5 h-2.5 rounded-full",
                  agent.status === 'active' ? "bg-green-500" : "bg-yellow-500"
                )
              )} />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>System Load</span>
                <span>{agent.load}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={twMerge(
                    clsx(
                      "h-full rounded-full transition-all duration-500",
                      agent.load > 80 ? "bg-red-500" : agent.load > 50 ? "bg-blue-500" : "bg-green-500"
                    )
                  )}
                  style={{ width: `${agent.load}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            Real-Time Collaboration Log
          </h3>
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 h-80 overflow-y-auto space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 text-sm">
                <div className="text-slate-400 whitespace-nowrap font-mono text-xs mt-0.5">
                  {log.timestamp.toLocaleTimeString()}
                </div>
                <div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {log.agents.map(a => (
                      <span key={a} className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                        {a}
                      </span>
                    ))}
                  </div>
                  <p className={twMerge(
                    clsx(
                      "text-slate-700 dark:text-slate-300",
                      log.type === 'action' && "font-medium"
                    )
                  )}>
                    {log.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-slate-500" />
            Override Controls
          </h3>
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Global Priority Focus
                </label>
                <span className="text-sm text-slate-500">{priorityLevel}% Revenue</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={priorityLevel}
                onChange={(e) => setPriorityLevel(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Customer Exp</span>
                <span>Revenue Max</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Manual Overrides
              </label>
              {[
                'Force Photographer Dispatch',
                'Pause Dynamic Pricing',
                'Halt Automated Outreach'
              ].map((override) => (
                <button
                  key={override}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 transition-colors group"
                >
                  <span className="text-slate-700 dark:text-slate-300">{override}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
            
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-lg text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Manual overrides temporarily pause AI Swarm collective decision making for the affected domain.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISwarmCommandCenter;
