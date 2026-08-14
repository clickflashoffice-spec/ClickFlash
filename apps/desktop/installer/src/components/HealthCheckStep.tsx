import React from "react";
import { ArrowRight, ArrowLeft, Activity, CheckCircle, XCircle, RefreshCw, Server, Cloud, Database, HardDrive } from "lucide-react";
import { InstallerState } from "../types/installer";

interface HealthCheckStepProps {
  state: InstallerState;
  onCheck: () => Promise<unknown>;
  onNext: () => void;
  onPrev: () => void;
}

const HealthCheckStep: React.FC<HealthCheckStepProps> = ({
  state,
  onCheck,
  onNext,
  onPrev,
}) => {
  const results = state.healthResults;

  const checks = [
    { key: "masterBackend", label: "Master Backend", icon: Server, description: "Express server on port 8090" },
    { key: "touchBackend", label: "Touch Backend", icon: Server, description: "Express server on port 8091" },
    { key: "heartbeat", label: "Cloud Heartbeat", icon: Cloud, description: "Management Hub connectivity" },
    { key: "d1Write", label: "D1 Database", icon: Database, description: "Cloudflare D1 read/write" },
    { key: "r2Upload", label: "R2 Storage", icon: HardDrive, description: "Photo storage upload/download" },
  ] as const;

  const allPassed = results ? Object.values(results).every(Boolean) : false;

  return (
    <div className="step-card max-w-2xl mx-auto mt-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Health Check</h2>
      <p className="text-sm text-slate-400 mb-4">
        Verify all systems are operational before launching your studio.
      </p>

      {!results && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/10 rounded-2xl mb-4">
            <Activity className="w-8 h-8 text-cyan-400" />
          </div>
          <p className="text-slate-400 mb-4">
            Run comprehensive health checks to verify installation integrity.
          </p>
          <button
            onClick={onCheck}
            disabled={state.isLoading}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <RefreshCw className={`w-4 h-4 ${state.isLoading ? "animate-spin" : ""}`} />
            {state.isLoading ? "Running Checks..." : "Run Health Checks"}
          </button>
        </div>
      )}

      {results && (
        <div className="space-y-3 mb-6">
          {checks.map(({ key, label, icon: Icon, description }) => {
            const passed = results[key as keyof typeof results];
            return (
              <div
                key={key}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  passed
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-rose-500/5 border-rose-500/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded ${
                      passed ? "bg-emerald-500/10" : "bg-rose-500/10"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        passed ? "text-emerald-400" : "text-rose-400"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500">{description}</p>
                  </div>
                </div>
                {passed ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
              </div>
            );
          })}

          {/* Summary */}
          <div
            className={`p-3 rounded-lg border ${
              allPassed
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/20"
            }`}
          >
            <p className={`text-sm font-medium ${allPassed ? "text-emerald-300" : "text-amber-300"}`}>
              {allPassed
                ? "All systems operational. Ready to launch!"
                : "Some checks failed. You can retry or continue with caution."}
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
          {results && (
            <button
              onClick={onCheck}
              disabled={state.isLoading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${state.isLoading ? "animate-spin" : ""}`} />
              Retry
            </button>
          )}
          <button
            onClick={onNext}
            disabled={!results}
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

export default HealthCheckStep;
