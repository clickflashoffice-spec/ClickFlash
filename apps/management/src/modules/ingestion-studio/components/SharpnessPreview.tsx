import React from 'react';
import { useIngestionStore } from '../stores/ingestionStore';

export function SharpnessPreview() {
  const { gradingResults } = useIngestionStore();

  if (gradingResults.length === 0) return null;

  const sorted = [...gradingResults].sort((a, b) => b.sharpnessScore - a.sharpnessScore);
  const sharpest = sorted[0];
  const blurriest = sorted[sorted.length - 1];

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl mt-6">
      <h3 className="text-white font-bold mb-4">Quality Analysis Sample</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-semibold text-slate-300">Peak Sharpness</span>
            <span className="text-sm font-bold text-emerald-400">{sharpest.sharpnessScore}%</span>
          </div>
          <div className="aspect-video bg-slate-800 rounded-xl flex items-center justify-center border border-emerald-500/30">
            <span className="text-slate-500 text-sm font-mono">{sharpest.filename}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-semibold text-slate-300">Lowest Quality (Rejected)</span>
            <span className="text-sm font-bold text-red-400">{blurriest.sharpnessScore}%</span>
          </div>
          <div className="aspect-video bg-slate-800 rounded-xl flex items-center justify-center border border-red-500/30">
            <span className="text-slate-500 text-sm font-mono">{blurriest.filename}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
