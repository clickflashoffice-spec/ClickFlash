import React from "react";
import { RefreshCw, ArrowRight, ArrowLeft, CheckCircle, XCircle, AlertTriangle, HardDrive, Cpu, Wifi } from "lucide-react";
import { InstallerState } from "../types/installer";

interface PrerequisitesStepProps {
  state: InstallerState;
  onCheck: () => Promise<unknown>;
  onNext: () => void;
  onPrev: () => void;
}

const PrerequisitesStep: React.FC<PrerequisitesStepProps> = ({
  state,
  onCheck,
  onNext,
  onPrev,
}) => {
  const prereqs = state.prerequisites;

  const allPassed = prereqs
    ? prereqs.nodeInstalled && prereqs.diskSpaceGB >= 2 && Object.values(prereqs.portsAvailable).every(Boolean)
    : false;

  return (
    <div className="step-card max-w-2xl mx-auto mt-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">System Prerequisites</h2>

      {!prereqs && (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">Click below to check your system compatibility.</p>
          <button onClick={onCheck} disabled={state.isLoading} className="btn-primary flex items-center gap-2 mx-auto">
            <RefreshCw className={`w-4 h-4 ${state.isLoading ? "animate-spin" : ""}`} />
            {state.isLoading ? "Checking..." : "Run System Check"}
          </button>
        </div>
      )}

      {prereqs && (
        <div className="space-y-3 mb-6">
          {/* Node.js */}
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-200">Node.js Runtime</p>
                <p className="text-xs text-slate-500">
                  {prereqs.nodeInstalled
                    ? `Found ${prereqs.nodeVersion}`
                    : "Not found — will bundle runtime"}
                </p>
              </div>
            </div>
            {prereqs.nodeInstalled ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
          </div>

          {/* Disk Space */}
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-200">Disk Space</p>
                <p className="text-xs text-slate-500">
                  {prereqs.diskSpaceGB >= 2
                    ? `${prereqs.diskSpaceGB} GB available`
                    : `${prereqs.diskSpaceGB} GB — need at least 2 GB`}
                </p>
              </div>
            </div>
            {prereqs.diskSpaceGB >= 2 ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400" />
            )}
          </div>

          {/* Ports */}
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-200">Network Ports</p>
                <p className="text-xs text-slate-500">
                  8090, 8091, 5353
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {Object.entries(prereqs.portsAvailable).map(([port, avail]) => (
                <span
                  key={port}
                  className={`text-xs px-2 py-0.5 rounded ${
                    avail
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  :{port} {avail ? "✓" : "✗"}
                </span>
              ))}
            </div>
          </div>

          {/* OS Info */}
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <p className="text-xs text-slate-500">
              Platform: <span className="text-slate-300">{prereqs.os}</span> · 
              Architecture: <span className="text-slate-300">{prereqs.arch}</span> · 
              Memory: <span className="text-slate-300">{prereqs.totalMemoryGB} GB</span>
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onPrev} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {prereqs && (
            <button onClick={onCheck} disabled={state.isLoading} className="btn-secondary flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${state.isLoading ? "animate-spin" : ""}`} />
              Re-check
            </button>
          )}
          <button
            onClick={onNext}
            disabled={!allPassed && !!prereqs}
            className="btn-primary flex items-center gap-2"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrerequisitesStep;
