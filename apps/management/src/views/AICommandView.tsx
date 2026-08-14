import { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Play,
  Activity,
  Settings2,
  BarChart2,
  Sparkles,
  Wand2,
  Film,
  Box,
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  RefreshCw,
} from 'lucide-react';
import {
  aiEngineService,
  type AIWorkerConfig,
  type AIJob,
  type AIWorkerType,
  type AIPermission,
} from '../services/aiEngineService';

const iconMap: Record<string, React.ElementType> = {
  Sparkles, Wand2, Film, Box, Shield, FileText,
};

const accentMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-400',    badge: 'bg-cyan-500' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   badge: 'bg-amber-500' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  badge: 'bg-purple-500' },
  pink:    { bg: 'bg-pink-500/10',    border: 'border-pink-500/20',    text: 'text-pink-400',    badge: 'bg-pink-500' },
  slate:   { bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   text: 'text-slate-400',   badge: 'bg-slate-500' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', badge: 'bg-emerald-500' },
};

const permissionLabels: Record<AIPermission, { label: string; color: string }> = {
  free:     { label: 'FREE',     color: 'bg-emerald-500/20 text-emerald-400' },
  premium:  { label: 'PREMIUM',  color: 'bg-amber-500/20 text-amber-400' },
  disabled: { label: 'DISABLED', color: 'bg-slate-700 text-slate-500' },
};

export function AICommandView() {
  const [activeTab, setActiveTab] = useState<'engine' | 'jobs' | 'settings'>('engine');
  const [configs, setConfigs] = useState<AIWorkerConfig[]>(aiEngineService.getConfigs());
  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [testGalleryId, setTestGalleryId] = useState('gallery-demo-001');
  const [isProcessing, setIsProcessing] = useState(false);

  // Refresh jobs every second
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs([...aiEngineService.getJobs()]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleWorker = useCallback((type: AIWorkerType) => {
    const config = configs.find(c => c.type === type);
    if (!config) return;
    aiEngineService.updateConfig(type, { enabled: !config.enabled });
    setConfigs([...aiEngineService.getConfigs()]);
  }, [configs]);

  const handlePermissionCycle = useCallback((type: AIWorkerType) => {
    const config = configs.find(c => c.type === type);
    if (!config) return;
    const cycle: AIPermission[] = ['free', 'premium', 'disabled'];
    const nextIndex = (cycle.indexOf(config.permission) + 1) % cycle.length;
    aiEngineService.updateConfig(type, { permission: cycle[nextIndex] });
    setConfigs([...aiEngineService.getConfigs()]);
  }, [configs]);

  const handleDispatchSingle = useCallback(async (type: AIWorkerType) => {
    await aiEngineService.dispatchJob(type, testGalleryId);
    setJobs([...aiEngineService.getJobs()]);
  }, [testGalleryId]);

  const handleProcessAll = useCallback(async () => {
    setIsProcessing(true);
    const enabledTypes = configs.filter(c => c.enabled).map(c => c.type);
    await aiEngineService.processGallery(testGalleryId, enabledTypes);
    setJobs([...aiEngineService.getJobs()]);
    setIsProcessing(false);
  }, [configs, testGalleryId]);

  const activeWorkers = configs.filter(c => c.enabled).length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const processingJobs = jobs.filter(j => j.status === 'processing').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="w-8 h-8 text-indigo-500" />
            AI Engine — Command Center
          </h2>
          <p className="text-slate-400 mt-1">Primary AI control plane. All AI operations are dispatched and monitored from here.</p>
        </div>
        <div className="flex bg-slate-800 p-1 rounded-lg">
          {(['engine', 'jobs', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Workers</p>
          <p className="text-2xl font-bold text-white mt-1">{activeWorkers} <span className="text-sm text-slate-500">/ {configs.length}</span></p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Jobs Processing</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{processingJobs}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Jobs Completed</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{completedJobs}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-indigo-500/30">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Compute Source</p>
          <p className="text-sm font-bold text-indigo-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Management Hub (Primary)
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">MoneyTrash: Fallback</p>
        </div>
      </div>

      {/* ENGINE TAB */}
      {activeTab === 'engine' && (
        <div className="space-y-6">
          {/* Quick Process */}
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-sm font-bold text-white">Quick Process Gallery</p>
                <p className="text-xs text-slate-400">Run all enabled AI workers on a gallery</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={testGalleryId}
                onChange={e => setTestGalleryId(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white w-48"
                placeholder="Gallery ID"
              />
              <button
                onClick={() => void handleProcessAll()}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isProcessing ? 'Processing...' : 'Run All'}
              </button>
            </div>
          </div>

          {/* Worker Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {configs.map(config => {
              const Icon = iconMap[config.icon] || Sparkles;
              const accent = accentMap[config.accentColor] || accentMap.cyan;
              const perm = permissionLabels[config.permission];

              return (
                <div
                  key={config.type}
                  className={`bg-slate-900 rounded-xl border transition-all ${
                    config.enabled ? `${accent.border} shadow-sm` : 'border-slate-800 opacity-60'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${accent.bg} border ${accent.border} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${accent.text}`} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{config.name}</h4>
                          <span className="text-[10px] text-slate-500">{config.estimatedDuration}</span>
                        </div>
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={() => handleToggleWorker(config.type)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${config.enabled ? accent.badge : 'bg-slate-700'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-4">{config.description}</p>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handlePermissionCycle(config.type)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${perm.color} cursor-pointer hover:opacity-80 transition-opacity`}
                        title="Click to cycle: Free → Premium → Disabled"
                      >
                        {perm.label}
                      </button>
                      <button
                        onClick={() => void handleDispatchSingle(config.type)}
                        disabled={!config.enabled}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors disabled:opacity-30 flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3" /> Run
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* JOBS TAB */}
      {activeTab === 'jobs' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Job Queue
            </h3>
            <span className="text-xs text-slate-500">{jobs.length} total</span>
          </div>
          {jobs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No jobs dispatched yet. Go to the Engine tab to run AI workers.</div>
          ) : (
            <div className="divide-y divide-slate-800/50 max-h-[60vh] overflow-y-auto">
              {jobs.map(job => {
                const config = configs.find(c => c.type === job.type);
                const accent = accentMap[config?.accentColor || 'cyan'];

                return (
                  <div key={job.id} className="p-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                    <div className={`w-8 h-8 rounded-lg ${accent.bg} border ${accent.border} flex items-center justify-center shrink-0`}>
                      {job.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : job.status === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{config?.name || job.type}</span>
                        <span className="text-[10px] text-slate-600 font-mono">{job.id.slice(-8)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500">Gallery: {job.galleryId}</span>
                      </div>
                    </div>
                    <div className="w-32 shrink-0">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className={
                          job.status === 'completed' ? 'text-emerald-400 font-bold' :
                          job.status === 'error' ? 'text-rose-400 font-bold' :
                          'text-amber-400'
                        }>
                          {job.status === 'completed' ? 'Done' : job.status === 'error' ? 'Failed' : `${job.progress}%`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            job.status === 'completed' ? 'bg-emerald-500' : job.status === 'error' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-400" /> Compute Routing
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-950 border border-indigo-500/20 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-white">Primary: Management Hub</p>
                  <p className="text-xs text-slate-400 mt-0.5">All AI jobs dispatched directly to the Master OS edge node via API.</p>
                </div>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> Active
                </span>
              </div>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-white">Secondary: MoneyTrash Desktop</p>
                  <p className="text-xs text-slate-400 mt-0.5">Optional offline processor for batch operations. Falls back when Management Hub is unavailable.</p>
                </div>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700 text-slate-400 text-xs font-bold">
                  Fallback
                </span>
              </div>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-white">Tertiary: Cloud GPU Workers</p>
                  <p className="text-xs text-slate-400 mt-0.5">Cloudflare Workers AI or external GPU for heavy mesh/reel generation.</p>
                </div>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700 text-slate-400 text-xs font-bold">
                  On Demand
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" /> Resource Usage
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">API Tokens (Daily)</span>
                  <span className="font-medium text-white">45.2k / 100k</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[45%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">GPU Compute Hours</span>
                  <span className="font-medium text-white">12.4 / 24</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-fuchsia-500 w-[52%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">3D Mesh Renders Today</span>
                  <span className="font-medium text-white">7 / 50</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 w-[14%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
