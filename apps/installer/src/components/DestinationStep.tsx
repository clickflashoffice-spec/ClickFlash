import React, { useState, useCallback, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, MapPin, Globe, Clock, DollarSign, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { InstallerState, ISO_COUNTRIES, generateDeskId, getDefaultTimezone, CURRENCIES } from "../types/installer";

interface DestinationStepProps {
  state: InstallerState;
  onCheckDeskId: (deskId: string) => Promise<{ success: boolean; data?: { available: boolean; suggestions?: string[] }; error?: string }>;
  onSetDestination: (profile: { proposed_id: string; name: string; location: string; country: string; timezone: string; currency: string }) => void;
  onNext: () => void;
  onPrev: () => void;
}

const DestinationStep: React.FC<DestinationStepProps> = ({
  state,
  onCheckDeskId,
  onSetDestination,
  onNext,
  onPrev,
}) => {
  const initial = state.desk || {
    proposed_id: generateDeskId(state.studioProfile.location || undefined),
    name: state.studioProfile.studioName || "",
    location: state.studioProfile.location || "",
    country: "US",
    timezone: state.studioProfile.timezone || getDefaultTimezone(),
    currency: state.studioProfile.currency || "USD",
  };

  const [proposedId, setProposedId] = useState(initial.proposed_id);
  const [name, setName] = useState(initial.name);
  const [location, setLocation] = useState(initial.location);
  const [country, setCountry] = useState(initial.country);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [currency, setCurrency] = useState(initial.currency);
  const [checkState, setCheckState] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCheck = useCallback(async (id: string) => {
    if (!id || !id.startsWith("MASTER_")) {
      setCheckState("idle");
      return;
    }
    setCheckState("checking");
    const result = await onCheckDeskId(id);
    if (result.success && result.data) {
      setCheckState(result.data.available ? "available" : "taken");
      setSuggestions(result.data.suggestions || []);
    } else {
      setCheckState("idle");
    }
  }, [onCheckDeskId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runCheck(proposedId), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [proposedId, runCheck]);

  const isValid = checkState === "available" && name.trim() && location.trim();

  const handleNext = () => {
    onSetDestination({ proposed_id: proposedId, name, location, country, timezone, currency });
    onNext();
  };

  return (
    <div className="step-card max-w-2xl mx-auto mt-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Destination</h2>
      <p className="text-sm text-slate-400 mb-4">
        Set the unique identifier and location for this studio.
      </p>

      <div className="space-y-4 mb-6">
        {/* Desk ID with live collision check */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Desk ID
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={proposedId}
              onChange={(e) => setProposedId(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              placeholder="MASTER_LOCATION_XXXX"
              className="input-field flex-1 font-mono"
            />
            {checkState === "checking" && (
              <RefreshCw className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
            )}
            {checkState === "available" && (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            {checkState === "taken" && (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
          </div>
          {checkState === "available" && (
            <p className="text-xs text-emerald-400 mt-1.5">✓ Desk ID is available</p>
          )}
          {checkState === "taken" && (
            <div className="mt-1.5">
              <p className="text-xs text-rose-400">✗ This Desk ID is already taken.</p>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setProposedId(s)}
                      className="text-xs px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-mono"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Studio name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Studio Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bali Photo Studio"
            className="input-field"
          />
        </div>

        {/* Location + Country */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Nusa Dua, Bali"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              <Globe className="w-3.5 h-3.5 inline mr-1" />Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input-field"
            >
              {ISO_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Timezone + Currency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              <Clock className="w-3.5 h-3.5 inline mr-1" />Timezone
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="input-field font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              <DollarSign className="w-3.5 h-3.5 inline mr-1" />Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="input-field"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!isValid}
          className="btn-primary flex items-center gap-2"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DestinationStep;
