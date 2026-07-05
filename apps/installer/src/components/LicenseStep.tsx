import React, { useState, useCallback } from "react";
import { ArrowRight, ArrowLeft, Key, Shield, CheckCircle, AlertCircle, RefreshCw, Info } from "lucide-react";
import { InstallerState } from "../types/installer";

interface LicenseStepProps {
  state: InstallerState;
  onValidate: (key: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  onNext: () => void;
  onPrev: () => void;
}

function formatLicenseKey(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.startsWith("CF-LIVE-")) {
    const rest = cleaned.slice(8);
    const parts = rest.match(/.{1,4}/g) || [];
    return `CF-LIVE-${parts.slice(0, 4).join("-")}`;
  }
  const parts = cleaned.match(/.{1,4}/g) || [];
  return parts.slice(0, 5).join("-");
}

const LicenseStep: React.FC<LicenseStepProps> = ({ state, onValidate, onNext, onPrev }) => {
  const [key, setKey] = useState(state.license?.key || "");
  const [validating, setValidating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseKey(e.target.value);
    setKey(formatted);
    setLocalError(null);
  };

  const handleValidate = useCallback(async () => {
    if (!key.trim()) return;
    setValidating(true);
    setLocalError(null);
    const result = await onValidate(key.trim());
    setValidating(false);
    if (!result.success) {
      setLocalError(result.error || "Invalid license key");
    }
  }, [key, onValidate]);

  const isValid = !!state.license;

  return (
    <div className="step-card max-w-2xl mx-auto mt-4">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-100 mb-1">License Key</h2>
          <p className="text-sm text-slate-400 mb-4">
            Enter your ClickFlash license key to activate this studio.
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                License Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={key}
                  onChange={handleChange}
                  placeholder="CF-LIVE-XXXX-XXXX-XXXX-XXXX"
                  maxLength={24}
                  className="input-field flex-1 font-mono uppercase"
                />
                <button
                  onClick={handleValidate}
                  disabled={validating || key.length < 24}
                  className="btn-secondary flex items-center gap-2 shrink-0"
                >
                  {validating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  Validate
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Format: CF-LIVE-XXXX-XXXX-XXXX-XXXX (24 characters)
              </p>
            </div>

            {isValid && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">License Valid</span>
                </div>
                <div className="space-y-1 text-xs text-emerald-200/80">
                  <p>Tenant: <span className="font-mono">{state.license?.tenant_id}</span></p>
                  <p>Plan: <span className="font-mono">{state.license?.plan}</span></p>
                  <p>Region: <span className="font-mono">{state.license?.region}</span></p>
                  <p>Max Studios: <span className="font-mono">{state.license?.max_masters}</span></p>
                  {state.license?.expires_at && (
                    <p>Expires: <span className="font-mono">{new Date(state.license.expires_at).toLocaleDateString()}</span></p>
                  )}
                </div>
              </div>
            )}

            {localError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-sm text-rose-300">{localError}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={onPrev} className="btn-secondary flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={onNext}
              disabled={!isValid}
              className="btn-primary flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="w-64 shrink-0 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-slate-200">What is a license key?</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Your ClickFlash license key ties this studio to your tenant account and unlocks features based on your plan.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Secure tenant isolation</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Feature-gated access</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Region-aware routing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseStep;
