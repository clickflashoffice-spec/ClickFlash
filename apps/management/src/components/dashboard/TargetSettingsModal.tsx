import React, { useState } from "react";
import { X, Save, Target, TrendingUp, Calendar } from "lucide-react";

interface PerformanceTargets {
  daily_income: number;
  monthly_income: number;
  daily_meetings: number;
  capture_rate: number;
}

interface TargetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (targets: PerformanceTargets) => void;
  initialTargets: PerformanceTargets;
}

const TargetSettingsModal: React.FC<TargetSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTargets,
}) => {
  const [targets, setTargets] = useState(initialTargets);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white">
              Resort Performance Targets
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Daily Income Target (€)
              </label>
              <input
                type="number"
                value={targets.daily_income}
                onChange={(e) =>
                  setTargets({
                    ...targets,
                    daily_income: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-bold focus:border-blue-500 outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Monthly Income Target (€)
              </label>
              <input
                type="number"
                value={targets.monthly_income}
                onChange={(e) =>
                  setTargets({
                    ...targets,
                    monthly_income: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-bold focus:border-emerald-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Meetings Made Target / Day
              </label>
              <input
                type="number"
                value={targets.daily_meetings}
                onChange={(e) =>
                  setTargets({
                    ...targets,
                    daily_meetings: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-bold focus:border-amber-500 outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Capture Rate Target (%)
              </label>
              <input
                type="number"
                value={targets.capture_rate}
                onChange={(e) =>
                  setTargets({
                    ...targets,
                    capture_rate: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-bold focus:border-cyan-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
            <p className="text-xs text-slate-400 leading-relaxed italic">
              * Targets are synced globally to all Master stations and used for
              automated performance alerting and BI reporting.
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(targets)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" /> Save Targets
          </button>
        </div>
      </div>
    </div>
  );
};

export default TargetSettingsModal;
