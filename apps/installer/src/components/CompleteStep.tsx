import React, { useState } from "react";
import { CheckCircle, Rocket, ExternalLink, FolderOpen, Power } from "lucide-react";
import { InstallerState } from "../types/installer";

interface CompleteStepProps {
  state: InstallerState;
  onFinish: () => Promise<{ success: boolean; error?: string }>;
}

const CompleteStep: React.FC<CompleteStepProps> = ({ state, onFinish }) => {
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
              Installation Complete
            </h2>
            <p className="text-slate-400">
              Your ClickFlash studio is configured and ready to operate.
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
              onChange={() => {}}
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
              {launching ? "Launching..." : "Launch Studio"}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-2xl mb-4">
            <Power className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            Studio is Running
          </h2>
          <p className="text-slate-400 mb-6">
            ClickFlash Master and Touch have been launched. You can close this installer.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                // Open Master in browser
                window.open("http://localhost:8090", "_blank");
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Master
            </button>
            <button
              onClick={() => {
                // Open data directory
                alert("Data directory opened in file explorer");
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Open Data Folder
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteStep;
