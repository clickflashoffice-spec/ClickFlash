import React, { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle, RefreshCw, Server, Activity, Database, ExternalLink } from "lucide-react";

interface FirstSyncStepProps {
  onRegisterAndSync: () => Promise<{ success: boolean; data?: { desk_id: string; r2_test_ok: boolean }; error?: string }>;
  onNext: () => void;
  onPrev: () => void;
  onOpenExternal: (url: string) => void;
}

const FirstSyncStep: React.FC<FirstSyncStepProps> = ({
  onRegisterAndSync,
  onNext,
  onPrev,
  onOpenExternal,
}) => {
  const [phase, setPhase] = useState<"idle" | "registering" | "heartbeating" | "testing-r2" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ desk_id: string; r2_test_ok: boolean } | null>(null);

  const run = async () => {
    setPhase("registering");
    setError(null);
    const res = await onRegisterAndSync();
    if (res.success && res.data) {
      setResult(res.data);
      setPhase("success");
    } else {
      setError(res.error || "Unknown error");
      setPhase("error");
    }
  };

  useEffect(() => {
    if (phase === "idle") {
      run();
    }
  }, []);

  return (
    <div className="step-card max-w-2xl mx-auto mt-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">First Sync</h2>
      <p className="text-sm text-slate-400 mb-4">
        Registering your studio with the ClickFlash Hub and verifying connectivity.
      </p>

      <div className="space-y-3 mb-6">
        <StepRow
          icon={<Server className="w-4 h-4" />}
          label="Register with Hub"
          state={phase === "registering" ? "active" : ["heartbeating", "testing-r2", "success"].includes(phase) ? "done" : phase === "error" ? "error" : "pending"}
        />
        <StepRow
          icon={<Activity className="w-4 h-4" />}
          label="Send first heartbeat"
          state={["testing-r2", "success"].includes(phase) ? "done" : phase === "heartbeating" ? "active" : phase === "error" ? "error" : "pending"}
        />
        <StepRow
          icon={<Database className="w-4 h-4" />}
          label="Test R2 photo upload"
          state={phase === "success" ? (result?.r2_test_ok ? "done" : "error") : phase === "testing-r2" ? "active" : phase === "error" ? "error" : "pending"}
        />
      </div>

      {phase === "success" && result && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">Studio is online</span>
          </div>
          <p className="text-xs text-emerald-200/80 mb-2">
            Desk ID: <span className="font-mono">{result.desk_id}</span>
          </p>
          <button
            onClick={() => onOpenExternal(`https://hub.clickflash.app/fleet/${result.desk_id}`)}
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
          >
            View in Hub <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}

      {phase === "error" && error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span className="text-sm font-semibold text-rose-300">First sync failed</span>
          </div>
          <p className="text-xs text-rose-200/80 mb-3">{error}</p>
          <button onClick={run} className="btn-secondary text-xs flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onPrev} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={phase !== "success"}
          className="btn-primary flex items-center gap-2"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const StepRow: React.FC<{ icon: React.ReactNode; label: string; state: "pending" | "active" | "done" | "error" }> = ({ icon, label, state }) => {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      state === "active" ? "border-cyan-500/30 bg-cyan-500/5" :
      state === "done" ? "border-emerald-500/30 bg-emerald-500/5" :
      state === "error" ? "border-rose-500/30 bg-rose-500/5" :
      "border-slate-700/30 bg-slate-900/30"
    }`}>
      <div className={
        state === "active" ? "text-cyan-400" :
        state === "done" ? "text-emerald-400" :
        state === "error" ? "text-rose-400" :
        "text-slate-500"
      }>{icon}</div>
      <span className={`text-sm flex-1 ${
        state === "active" ? "text-cyan-200" :
        state === "done" ? "text-emerald-200" :
        state === "error" ? "text-rose-200" :
        "text-slate-400"
      }`}>{label}</span>
      {state === "active" && <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />}
      {state === "done" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
      {state === "error" && <AlertCircle className="w-4 h-4 text-rose-400" />}
    </div>
  );
};

export default FirstSyncStep;
