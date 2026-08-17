import React from 'react';
import { CheckCircle2, XCircle, Trash2, Zap, AlertTriangle } from 'lucide-react';
import { usePhotographerStore, UploadBatchItem } from '../stores/photographerStore';

export const PhotoGradingPreview: React.FC<{ item: UploadBatchItem }> = ({ item }) => {
  const toggleKeeper = usePhotographerStore((state) => state.toggleKeeper);
  const removeBatchItem = usePhotographerStore((state) => state.removeBatchItem);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 45) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col group transition-all hover:border-slate-700">
      {/* Thumbnail Stage */}
      <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
        <img src={item.previewUrl} alt={item.fileName} className="w-full h-full object-cover" />

        {/* Quality Score Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border backdrop-blur-md ${getScoreColor(item.sharpnessScore)}`}>
            {item.sharpnessScore}% Sharp
          </span>
          {item.sharpnessScore < 45 && (
            <span className="p-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle size={12} />
            </span>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={() => removeBatchItem(item.id)}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>

        {/* Progress overlay */}
        {item.status === 'uploading' && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-2">
              <div className="bg-cyan-400 h-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold">{item.progress}% Uploading</span>
          </div>
        )}

        {item.status === 'completed' && (
          <div className="absolute top-2 right-2 p-1 rounded-full bg-emerald-500 text-slate-950 shadow-md">
            <CheckCircle2 size={14} />
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-2.5 flex items-center justify-between bg-slate-900/90 text-xs">
        <span className="truncate max-w-[110px] text-slate-400 font-mono text-[11px]">{item.fileName}</span>
        
        <button
          onClick={() => toggleKeeper(item.id)}
          className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
            item.isKeeper
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20'
          }`}
        >
          {item.isKeeper ? (
            <>
              <CheckCircle2 size={12} /> Keeper
            </>
          ) : (
            <>
              <XCircle size={12} /> Cull / Discard
            </>
          )}
        </button>
      </div>
    </div>
  );
};
