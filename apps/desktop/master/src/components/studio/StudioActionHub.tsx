import React from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Sliders,
  Sparkles,
  Send,
  HardDrive,
  ArrowRight,
  Smartphone
} from 'lucide-react';

interface StudioActionHubProps {
  onLaunchAutoPipeline: () => void;
  onLaunchManualEditor: () => void;
  pairedKiosksCount?: number;
  unprocessedAlbumsCount?: number;
  totalPhotosToday?: number;
}

export const StudioActionHub: React.FC<StudioActionHubProps> = ({
  onLaunchAutoPipeline,
  onLaunchManualEditor,
  pairedKiosksCount = 3,
  unprocessedAlbumsCount = 0,
  totalPhotosToday = 0,
}) => {
  return (
    <div className="w-full space-y-4 mb-6">
      {/* Top Banner / System Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/60 dark:bg-slate-950/60 border border-slate-800 rounded-2xl text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">Studio Hub Online</span>
          </div>
          <span className="text-slate-600 dark:text-slate-600">•</span>
          <span className="text-slate-400">LAN Gateway: <strong>Port 8090</strong></span>
          <span className="text-slate-600 dark:text-slate-600">•</span>
          <div className="flex items-center space-x-1 text-slate-300">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>Paired Touch Kiosks: <strong className="text-white">{pairedKiosksCount} active</strong></span>
          </div>
          {unprocessedAlbumsCount > 0 && (
            <>
              <span className="text-slate-600 dark:text-slate-600">•</span>
              <span className="text-amber-400">Pending: <strong>{unprocessedAlbumsCount} albums</strong></span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2 text-slate-400">
          <span>Today: <strong className="text-cyan-400">{totalPhotosToday} photos</strong> ingested</span>
        </div>
      </div>

      {/* Primary Dual-Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* 1. AUTOMATIC AI PIPELINE CARD */}
        <motion.div
          whileHover={{ scale: 1.015, y: -2 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative overflow-hidden glass-card p-6 rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-indigo-950/40 shadow-xl group"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />

          <div className="flex items-start justify-between">
            <div className="p-3.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              ⚡ Hands-Free Auto Mode
            </span>
          </div>

          <div className="mt-4 space-y-1.5">
            <h3 className="text-xl font-bold text-white tracking-tight font-heading">
              Autonomous AI Pipeline
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Select Photographer, Source & Customer Data. The rest happens <strong>100% automatically</strong>: fast ingestion, Laplacian grading, AI color correction, 128D FaceNet indexing, and direct LAN dispatch to Touch Kiosks.
            </p>
          </div>

          {/* Workflow Steps Preview */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <div className="flex items-center space-x-1">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>Auto Ingest</span>
            </div>
            <span>→</span>
            <div className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Grading & Tone</span>
            </div>
            <span>→</span>
            <div className="flex items-center space-x-1">
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Push to Touch</span>
            </div>
          </div>

          <button
            onClick={onLaunchAutoPipeline}
            className="mt-5 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 group-hover:shadow-blue-500/50"
          >
            <span>🚀 Start Auto Ingestion Pipeline</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* 2. STUDIO PRO MANUAL EDITOR CARD */}
        <motion.div
          whileHover={{ scale: 1.015, y: -2 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative overflow-hidden glass-card p-6 rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-pink-950/40 shadow-xl group"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500" />

          <div className="flex items-start justify-between">
            <div className="p-3.5 rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/30 group-hover:scale-110 transition-transform">
              <Sliders className="w-7 h-7" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              🎨 Pro Studio Workstation
            </span>
          </div>

          <div className="mt-4 space-y-1.5">
            <h3 className="text-xl font-bold text-white tracking-tight font-heading">
              Studio Pro Manual Editor
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full-featured studio grading suite: Exposure, Contrast, HSL, LUT Presets, AI Magic Eraser, Face Retouch, Before/After split comparison, Filmstrip batch copy/paste, and 1-click Kiosk delivery.
            </p>
          </div>

          {/* Workflow Steps Preview */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <div className="flex items-center space-x-1">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Raw Tonal Sliders</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Magic Eraser</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>1-Click Kiosk Sync</span>
            </div>
          </div>

          <button
            onClick={onLaunchManualEditor}
            className="mt-5 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2 group-hover:shadow-purple-500/50"
          >
            <span>🎨 Open Studio Pro Manual Editor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};
