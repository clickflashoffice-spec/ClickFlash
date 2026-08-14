import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Zap,
  HardDrive,
  UserCheck,
  FileImage,
  Sparkles,
  Send,
  Check
} from 'lucide-react';

export interface PipelineStageInfo {
  id: 'ingest' | 'quality' | 'ai_enhance' | 'face_index' | 'kiosk_sync';
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  progress: number; // 0 - 100
  count?: number;
  total?: number;
}

export interface PipelineProgressData {
  albumTitle: string;
  albumId?: string;
  photographerName: string;
  customerName?: string;
  roomNumber?: string;
  currentFileName: string;
  currentIndex: number;
  totalFiles: number;
  successCount: number;
  failCount: number;
  enhancedCount: number;
  faceIndexedCount: number;
  kiosksDispatched: string[];
  isComplete: boolean;
  error?: string;
  stages: PipelineStageInfo[];
  throughputMBps?: number;
  logs?: string[];
}

interface AutoPipelineProgressHUDProps {
  isOpen: boolean;
  progress: PipelineProgressData;
  onClose: () => void;
  onViewAlbum?: (albumId: string) => void;
  onOpenManualEditor?: (albumId: string) => void;
}

export const AutoPipelineProgressHUD: React.FC<AutoPipelineProgressHUDProps> = ({
  isOpen,
  progress,
  onClose,
  onViewAlbum,
  onOpenManualEditor,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'logs'>('visual');

  if (!isOpen) return null;

  const totalProgress = progress.totalFiles > 0 
    ? Math.round((progress.currentIndex / progress.totalFiles) * 100)
    : 0;

  const currentStage = progress.stages.find((s) => s.status === 'active') || 
    (progress.isComplete ? progress.stages[progress.stages.length - 1] : progress.stages[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${progress.isComplete ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'}`}>
              {progress.isComplete ? <CheckCircle2 className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {progress.isComplete ? '⚡ Auto Pipeline Complete' : '⚡ Autonomous AI Studio Pipeline Active'}
                </h3>
                <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border ${progress.isComplete ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60' : 'bg-blue-950 text-blue-300 border-blue-700/60'}`}>
                  {progress.isComplete ? 'Ready on Kiosks' : 'Autonomous Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-2">
                <span>Album: <strong className="text-slate-200">{progress.albumTitle}</strong></span>
                <span>•</span>
                <span>Photographer: <strong className="text-slate-200">{progress.photographerName}</strong></span>
                {progress.roomNumber && (
                  <>
                    <span>•</span>
                    <span>Room: <strong className="text-cyan-400">#{progress.roomNumber}</strong></span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab('visual')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${activeTab === 'visual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Live Metrics
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                System Logs
              </button>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-slate-800 h-2 relative overflow-hidden">
          <motion.div
            className={`h-full ${progress.isComplete ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${totalProgress}%` }}
            transition={{ ease: 'easeOut', duration: 0.3 }}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'visual' ? (
            <>
              {/* Quick Stat Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ingested</span>
                    <HardDrive className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {progress.successCount} <span className="text-xs font-normal text-slate-400">/ {progress.totalFiles}</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">
                    {progress.failCount > 0 ? `${progress.failCount} failed` : '100% verified'}
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">AI Enhanced</span>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {progress.enhancedCount || progress.successCount}
                  </div>
                  <div className="text-[10px] text-purple-400 mt-0.5">
                    Auto-graded & tuned
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Face Indexed</span>
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {progress.faceIndexedCount || progress.successCount}
                  </div>
                  <div className="text-[10px] text-cyan-400 mt-0.5">
                    128D Embeddings
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kiosk Dispatch</span>
                    <Send className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {progress.kiosksDispatched?.length || (progress.isComplete ? 1 : 0)} <span className="text-xs font-normal text-slate-400">kiosks</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">
                    LAN Sync active
                  </div>
                </div>
              </div>

              {/* Stage Progression Pipeline */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                  <span className="font-semibold uppercase tracking-wider text-slate-300">Automated Pipeline Lifecycle</span>
                  <span>Currently: <strong className="text-blue-400">{currentStage?.name}</strong></span>
                </div>

                <div className="space-y-3">
                  {progress.stages.map((stage, idx) => {
                    const isPassed = stage.status === 'completed';
                    const isActive = stage.status === 'active';
                    const isFailed = stage.status === 'failed';

                    return (
                      <div
                        key={stage.id}
                        className={`p-3 rounded-lg border transition-all ${
                          isActive
                            ? 'bg-blue-950/40 border-blue-600/50 shadow-md ring-1 ring-blue-500/20'
                            : isPassed
                            ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                            : isFailed
                            ? 'bg-red-950/30 border-red-800/40 text-red-200'
                            : 'bg-slate-900/30 border-slate-800/50 opacity-60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isPassed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isActive
                                ? 'bg-blue-500 text-white animate-pulse'
                                : isFailed
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {isPassed ? <Check className="w-4 h-4" /> : idx + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-sm flex items-center space-x-2">
                                <span className={isActive ? 'text-white' : ''}>{stage.name}</span>
                                {isActive && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 animate-pulse">
                                    Processing...
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">{stage.description}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-mono font-semibold">
                              {isPassed ? '100%' : `${stage.progress}%`}
                            </span>
                          </div>
                        </div>

                        {isActive && (
                          <div className="mt-2.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-blue-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${stage.progress}%` }}
                              transition={{ duration: 0.2 }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Active File Banner */}
              {progress.currentFileName && !progress.isComplete && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5 truncate">
                    <FileImage className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-slate-400">Processing file:</span>
                    <span className="font-mono text-slate-200 truncate">{progress.currentFileName}</span>
                  </div>
                  <span className="text-slate-400 font-mono flex-shrink-0 ml-2">
                    {progress.currentIndex} / {progress.totalFiles}
                  </span>
                </div>
              )}
            </>
          ) : (
            /* System Log Output */
            <div className="bg-black/90 rounded-xl p-4 font-mono text-xs text-slate-300 border border-slate-800 h-[340px] overflow-y-auto space-y-1 custom-scrollbar">
              {progress.logs && progress.logs.length > 0 ? (
                progress.logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed flex items-start space-x-2">
                    <span className="text-slate-600 select-none">{String(idx + 1).padStart(3, '0')}</span>
                    <span className={log.includes('ERROR') || log.includes('Failed') ? 'text-red-400' : log.includes('SUCCESS') || log.includes('Complete') ? 'text-emerald-400' : 'text-slate-300'}>
                      {log}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 py-8 text-center">
                  Live log streaming initialized. Awaiting events...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>LAN Express Gateway: <strong>Port 8090</strong></span>
          </div>

          <div className="flex items-center space-x-3">
            {progress.isComplete ? (
              <>
                {progress.albumId && onOpenManualEditor && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenManualEditor(progress.albumId!);
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    🎨 Open in Manual Editor
                  </button>
                )}
                {progress.albumId && onViewAlbum && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewAlbum(progress.albumId!);
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    📁 View in Albums
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-colors"
                >
                  Done
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                Minimize to Background
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
