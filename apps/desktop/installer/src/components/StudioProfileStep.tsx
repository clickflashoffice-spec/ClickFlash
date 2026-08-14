import React from "react";
import { ArrowRight, ArrowLeft, Building2, MapPin, Clock, DollarSign } from "lucide-react";
import { InstallerState, CURRENCIES, getDefaultTimezone } from "../types/installer";

interface StudioProfileStepProps {
  state: InstallerState;
  onUpdate: (profile: Partial<InstallerState["studioProfile"]>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const StudioProfileStep: React.FC<StudioProfileStepProps> = ({
  state,
  onUpdate,
  onNext,
  onPrev,
}) => {
  const profile = state.studioProfile;

  return (
    <div className="step-card max-w-2xl mx-auto mt-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Studio Profile</h2>
      <p className="text-sm text-slate-400 mb-4">
        Configure your studio identity. This will be visible across your global fleet.
      </p>

      <div className="space-y-4 mb-6">
        {/* Studio Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Studio Name
          </label>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={profile.studioName}
              onChange={(e) => onUpdate({ studioName: e.target.value })}
              placeholder="e.g., Bali Beach Photography"
              className="input-field flex-1"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Location
          </label>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={profile.location}
              onChange={(e) => onUpdate({ location: e.target.value })}
              placeholder="e.g., Bali, Indonesia"
              className="input-field flex-1"
            />
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Timezone
          </label>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={profile.timezone}
              onChange={(e) => onUpdate({ timezone: e.target.value })}
              placeholder={getDefaultTimezone()}
              className="input-field flex-1"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Auto-detected: {getDefaultTimezone()}
          </p>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Currency
          </label>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-500" />
            <select
              value={profile.currency}
              onChange={(e) => onUpdate({ currency: e.target.value })}
              className="input-field flex-1"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Desk ID Preview */}
      <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 mb-6">
        <p className="text-xs text-slate-500 mb-1">Generated Desk ID</p>
        <p className="text-sm font-mono text-cyan-400">
          {state.deskId || "Will be generated after Cloudflare registration"}
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!profile.studioName.trim()}
          className="btn-primary flex items-center gap-2"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StudioProfileStep;
