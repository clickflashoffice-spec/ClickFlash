import React, { useState, useCallback } from "react";
import { ArrowRight, ArrowLeft, Key, Shield, CheckCircle, AlertCircle, RefreshCw, Info } from "lucide-react";
import type { ValidatedLicense } from "../../installer-ipc-schemas";
import { InstallerState } from "../types/installer";

interface LicenseStepProps {
  state: InstallerState;
  onValidate: (key: string) => Promise<{ success: boolean; data?: ValidatedLicense; error?: string }>;
  onNext: () => void;
  onPrev: () => void;
}

function formatLicenseKey(raw: string): string {
  // Ed25519 keys are base64, so we cannot uppercase or strip characters aggressively.
  // We'll just trim whitespace.
  return raw.trim();
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
                  placeholder="Enter license key..."
                  className="input-field flex-1 font-mono"
                />
                <button
                  onClick={handleValidate}
                  disabled={validating || key.length < 50}
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
                Format: Full Ed25519 Token
              </p>
            </div>

            {isValid && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">License Valid</span>
                </div>
                <div className="space-y-1 text-xs text-emerald-200/80">
                  <p>Plan: <span className="font-mono">{state.license?.plan}</span></p>
                  <p>Max Studios: <span className="font-mono">{state.license?.max_masters}</span></p>
                  <p>Machine: <span className="font-mono">{state.license?.machine_id}</span></p>
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
            Your signed ClickFlash license activates the approved plan and studio limit without sending the key to a server.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Offline signature verification</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Optional machine binding</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Expiry and plan enforcement</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseStep;
