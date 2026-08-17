import React from 'react';
import { HardDrive, Play } from 'lucide-react';
import { useIngestionStore } from './stores/ingestionStore';
import { useGrading } from './hooks/useGrading';
import { DropZone } from './components/DropZone';
import { GradingGrid } from './components/GradingGrid';
import { UploadProgress } from './components/UploadProgress';
import { SessionHistory } from './components/SessionHistory';
import { IngestionAnalytics } from './components/IngestionAnalytics';
import { SharpnessPreview } from './components/SharpnessPreview';

export function IngestionStudioPage() {
  const { activeTab, setActiveTab, files } = useIngestionStore();
  const { isGrading, startGrading } = useGrading();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-white">Ingestion Studio</h2>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <HardDrive className="w-3.5 h-3.5" />
              Master OS Linked
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">Upload, grade, and ingest raw media to the ClickFlash Master OS.</p>
        </div>
        
        {activeTab === 'ingest' && files.length > 0 && (
          <button 
            onClick={startGrading}
            disabled={isGrading}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isGrading ? (
              'Grading...'
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Start AI Grading
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('ingest')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'ingest' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Ingest & Grade
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'sessions' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Session History
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'ingest' && (
        <div className="space-y-6">
          <DropZone />
          <UploadProgress />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <GradingGrid />
            </div>
            <div>
              <SharpnessPreview />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <SessionHistory />
      )}

      {activeTab === 'analytics' && (
        <IngestionAnalytics />
      )}
    </div>
  );
}
