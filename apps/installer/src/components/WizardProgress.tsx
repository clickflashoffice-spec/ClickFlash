import React from "react";
import { Check, Circle } from "lucide-react";

interface WizardProgressProps {
  steps: string[];
  labels: Record<string, string>;
  currentIndex: number;
  onStepClick: (index: number) => void;
}

const WizardProgress: React.FC<WizardProgressProps> = ({
  steps,
  labels,
  currentIndex,
  onStepClick,
}) => {
  return (
    <div className="px-6 py-3 bg-slate-800/30 border-b border-slate-700/30">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = index <= currentIndex;

          return (
            <React.Fragment key={step}>
              <button
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-1.5 transition-opacity ${
                  isClickable ? "cursor-pointer hover:opacity-80" : "cursor-default opacity-50"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isCompleted
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : isCurrent
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-slate-700/50 text-slate-500 border border-slate-600/30"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    isCurrent ? "text-cyan-400" : isCompleted ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {labels[step]}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 transition-colors ${
                    index < currentIndex ? "bg-emerald-500/30" : "bg-slate-700/50"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default WizardProgress;
