import React from 'react';
import { useIngestionStore } from '../stores/ingestionStore';
import { Check, X, AlertTriangle } from 'lucide-react';

export function GradingGrid() {
  const { gradingResults, updateGradeResult } = useIngestionStore();

  if (gradingResults.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-xl">
        <p className="text-slate-400">No grading results yet. Start grading to see results.</p>
      </div>
    );
  }

  const keepers = gradingResults.filter(r => r.status === 'keeper').length;
  const rejects = gradingResults.filter(r => r.status === 'reject').length;
  const total = gradingResults.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <h3 className="text-white font-bold">Grading Summary</h3>
        <div className="flex gap-4">
          <span className="text-emerald-400 font-semibold">{keepers} Keepers</span>
          <span className="text-red-400 font-semibold">{rejects} Rejects</span>
          <span className="text-slate-400 font-semibold">{total} Total</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {gradingResults.map((result) => (
          <div key={result.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group">
            <div className="aspect-square bg-slate-800 flex items-center justify-center relative">
              <span className="text-slate-600 font-bold text-xs">{result.filename}</span>
              <div className="absolute top-2 right-2">
                {result.status === 'keeper' && <div className="p-1 bg-emerald-500 rounded-full shadow-lg"><Check className="w-3 h-3 text-white" /></div>}
                {result.status === 'reject' && <div className="p-1 bg-red-500 rounded-full shadow-lg"><X className="w-3 h-3 text-white" /></div>}
                {result.status === 'borderline' && <div className="p-1 bg-amber-500 rounded-full shadow-lg"><AlertTriangle className="w-3 h-3 text-white" /></div>}
              </div>
            </div>
            <div className="p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 truncate max-w-[80px]" title={result.filename}>{result.filename}</span>
                <span className={`text-xs font-bold ${
                  result.sharpnessScore > 70 ? 'text-emerald-400' : result.sharpnessScore > 40 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {result.sharpnessScore}%
                </span>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => updateGradeResult(result.id, 'keeper')}
                  className={`flex-1 py-1 rounded text-xs font-bold transition-colors ${result.status === 'keeper' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  K
                </button>
                <button 
                  onClick={() => updateGradeResult(result.id, 'reject')}
                  className={`flex-1 py-1 rounded text-xs font-bold transition-colors ${result.status === 'reject' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  R
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
