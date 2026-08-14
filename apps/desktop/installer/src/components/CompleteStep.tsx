import React, { useState } from "react";
import { CheckCircle, Rocket, Power } from "lucide-react";
import { InstallerState } from "../types/installer";

interface CompleteStepProps {
  state: InstallerState;
  onFinish: () => Promise<{ success: boolean; error?: string }>;
  onSetLaunchOnComplete: (value: boolean) => void;
}

const CompleteStep: React.FC<CompleteStepProps> = ({ state, onFinish, onSetLaunchOnComplete }) => {
  const [finished, setFinished] = useState(false);
  const [launching, setLaunching] = useState(false);

  const handleFinish = async () => {
    setLaunching(true);
    const result = await onFinish();
    setLaunching(false);
    if (result.success) {
      setFinished(true);
    }
  };

  return (
    <div className="step-card max-w-2xl mx-auto mt-4">
      {!finished ? (
        <>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-2xl mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">
              Ready to Configure
            </h2>
            <p className="text-slate-400">
              Review the deployment details, then commit configuration to the verified application payloads.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Desk ID</p>
              <p className="text-sm font-mono text-cyan-400">{state.deskId || "N/A"}</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Studio</p>
              <p className="text-sm text-slate-200">{state.studioProfile.studioName || "N/A"}</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Location</p>
              <p className="text-sm text-slate-200">{state.studioProfile.location || "N/A"}</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Deployment Root</p>
              <p className="text-sm font-mono text-cyan-400 break-all">{state.installPath || "N/A"}</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Fleet Status</p>
              <p className="text-sm text-emerald-400">
                {state.fleetRegistered
                  ? `Registered · ${state.fleetResponse?.peers?.length || 0} peer(s)`
                  : "Not registered"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <input
              type="checkbox"
              id="launch"
              checked={state.launchOnComplete}
              onChange={(event) => onSetLaunchOnComplete(event.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
            />
            <label htmlFor="launch" className="text-sm text-slate-300">
              Launch ClickFlash Master and Touch after closing installer
            </label>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleFinish}
              disabled={launching}
              className="btn-primary flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              {launching
                ? "Committing..."
                : state.launchOnComplete
                  ? "Save Configuration & Launch"
                  : "Save Configuration"}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-2xl mb-4">
            <Power className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            Configuration Complete
          </h2>
          <p className="text-slate-400 mb-6">
            {state.launchOnComplete
              ? "The selected ClickFlash applications were configured and launched."
              : "The selected ClickFlash applications were configured successfully."}
          </p>
          <p className="text-xs font-mono text-cyan-300 break-all">{state.installPath}</p>
        </div>
      )}
    </div>
  );
};

export default CompleteStep;
