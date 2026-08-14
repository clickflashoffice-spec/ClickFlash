import React from "react";
import { ArrowRight, ArrowLeft, MapPin, Server, Activity } from "lucide-react";
import { InstallerState } from "../types/installer";

interface FleetOverviewStepProps {
  state: InstallerState;
  onNext: () => void;
  onPrev: () => void;
}

const FleetOverviewStep: React.FC<FleetOverviewStepProps> = ({
  state,
  onNext,
  onPrev,
}) => {
  const peers = state.fleetResponse?.peers || [];
  const siteCode = state.desk?.site_code || "Unknown Site";
  const deskId = state.desk?.proposed_id || "New Master";

  return (
    <div className="step-card max-w-2xl mx-auto mt-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Fleet Overview</h2>
      <p className="text-sm text-slate-400 mb-4">
        You are adding <strong>{deskId}</strong> to the <strong>{siteCode}</strong> fleet region.
      </p>

      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-6 relative overflow-hidden">
        {/* Stylized background representing a global network map */}
        <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
          <div className="w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/40 via-slate-900 to-slate-900"></div>
          {/* Simple grid lines to imply map */}
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, #33415522 1px, transparent 1px), linear-gradient(to bottom, #33415522 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-medium text-slate-200">Active Peers in Hub</h3>
            <div className="ml-auto flex items-center gap-1 text-xs px-2 py-1 bg-cyan-950/50 text-cyan-300 rounded-full border border-cyan-800/50">
              <Activity className="w-3 h-3" />
              {peers.length} Online
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {peers.length === 0 ? (
              <div className="text-center p-4 text-sm text-slate-500 bg-slate-800/30 rounded-md border border-slate-700/50">
                This will be the first Master in the fleet.
              </div>
            ) : (
              peers.map((peer) => (
                <div key={peer.desk_id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-md border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${peer.status === "Online" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-slate-500"}`} />
                    <div>
                      <div className="text-sm font-medium text-slate-200">{peer.name || peer.desk_id}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {peer.location}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {peer.desk_id}
                  </div>
                </div>
              ))
            )}

            {/* Current (New) Node */}
            <div className="flex items-center justify-between p-3 bg-cyan-900/20 rounded-md border border-cyan-500/30">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </div>
                <div>
                  <div className="text-sm font-bold text-cyan-300">{state.desk?.name || deskId} (This Station)</div>
                  <div className="text-xs text-cyan-400/70 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {state.desk?.location || "Pending"}
                  </div>
                </div>
              </div>
              <div className="text-xs text-cyan-500">
                Registering...
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onNext}
          className="btn-primary flex items-center gap-2"
        >
          Confirm & Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FleetOverviewStep;
