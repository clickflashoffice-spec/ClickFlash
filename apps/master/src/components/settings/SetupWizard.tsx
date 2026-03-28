import React, { useState, useCallback } from "react";
import {
  Server,
  Globe,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MapPin,
  Tag,
  Mail,
  Lock,
  Plug,
  Sparkles,
} from "lucide-react";
import {
  cloudConfigService,
  CloudConfig,
  DEFAULT_HUB_URL,
} from "../../services/api/cloudConfigService";
import { useToast } from "../../context/ToastContext";

interface SetupWizardProps {
  /** Called when setup is complete — parent should hide wizard and show main app */
  onComplete: (config: CloudConfig) => void;
}

type Step = 1 | 2 | 3 | 4;

// ─── Step Indicator ───────────────────────────────────────────────────────────
const StepBadge: React.FC<{ step: number; current: Step; label: string }> = ({
  step,
  current,
  label,
}) => {
  const done = step < current;
  const active = step === current;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${done ? "bg-emerald-500 text-white" : active ? "bg-gold-500 text-black ring-4 ring-gold-500/30" : "bg-zinc-800 text-zinc-500"}`}
      >
        {done ? "✓" : step}
      </div>
      <span
        className={`text-sm font-medium ${active ? "text-white" : done ? "text-emerald-400" : "text-zinc-600"}`}
      >
        {label}
      </span>
    </div>
  );
};

// ─── Field ────────────────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-zinc-600 mt-1.5">{hint}</p>}
  </div>
);

const input =
  "w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono placeholder-zinc-700 focus:border-zinc-500 outline-none transition-colors";

// ─── Main Wizard ──────────────────────────────────────────────────────────────
const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config being built across steps
  const [deskId, setDeskId] = useState("");
  const [deskName, setDeskName] = useState("");
  const [deskLocation, setDeskLocation] = useState("");
  const [hubUrl, setHubUrl] = useState(DEFAULT_HUB_URL);
  const [hubEmail, setHubEmail] = useState("");
  const [hubPassword, setHubPassword] = useState("");

  // Step 1 validation state
  const [deskIdStatus, setDeskIdStatus] = useState<
    "idle" | "checking" | "ok" | "taken" | "invalid"
  >("idle");

  // Step 2 connection test
  const [connStatus, setConnStatus] = useState<
    "idle" | "testing" | "ok" | "fail"
  >("idle");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Step 3 registration result
  const [regToken, setRegToken] = useState<string | null>(null);

  const clearError = () => setError(null);

  // ── Step 1: Validate desk_id ──────────────────────────────────────────────
  const handleCheckDeskId = useCallback(async () => {
    const id = deskId.trim();
    if (!id) return;
    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(id)) {
      setDeskIdStatus("invalid");
      return;
    }
    setDeskIdStatus("checking");
    const result = await cloudConfigService.checkDeskId(hubUrl, id);
    setDeskIdStatus(result.available ? "ok" : "taken");
  }, [deskId, hubUrl]);

  const step1Valid =
    deskId.trim().length >= 3 &&
    deskName.trim().length >= 2 &&
    deskIdStatus === "ok";

  // ── Step 2: Test Hub Connection ───────────────────────────────────────────
  const handleTestConnection = useCallback(async () => {
    setConnStatus("testing");
    setError(null);
    const result = await cloudConfigService.testConnection(
      hubUrl,
      hubEmail,
      hubPassword,
    );
    if (result.ok) {
      setConnStatus("ok");
      setLatencyMs(result.latencyMs ?? null);
    } else {
      setConnStatus("fail");
      setError(result.error || "Connection failed");
    }
  }, [hubUrl, hubEmail, hubPassword]);

  const step2Valid = connStatus === "ok";

  // ── Step 3: Register Desk ─────────────────────────────────────────────────
  const handleRegisterDesk = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await cloudConfigService.registerDesk(hubUrl, {
        deskId: deskId.trim(),
        deskName: deskName.trim(),
        deskLocation: deskLocation.trim(),
        email: hubEmail,
        password: hubPassword,
      });
      setRegToken(result.token);
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }, [deskId, deskName, deskLocation, hubUrl, hubEmail, hubPassword]);

  // ── Step 4: Finalize ──────────────────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    setBusy(true);
    try {
      const config: CloudConfig = {
        deskId: deskId.trim(),
        deskName: deskName.trim(),
        deskLocation: deskLocation.trim(),
        hubUrl,
        hubEmail,
        hubPassword,
        deskToken: regToken || "",
        moneytrash: { enabled: true, retentionDays: 7, price: "15.00" },
      };
      await cloudConfigService.save(config);
      showToast("Station configured. Welcome to the Hub!");
      onComplete(config);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [
    deskId,
    deskName,
    deskLocation,
    hubUrl,
    hubEmail,
    hubPassword,
    regToken,
    onComplete,
    showToast,
  ]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const steps = ["Site Identity", "Hub Connection", "Registration", "Ready"];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-gold-500 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5" />
            ClickFlash Master Station Setup
          </div>
          <h1 className="text-3xl font-black text-white">Connect to Hub</h1>
          <p className="text-zinc-500 text-sm">
            4 steps to register this Master Station with the Management Hub.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between px-2">
          {steps.map((label, i) => (
            <React.Fragment key={label}>
              <StepBadge step={i + 1} current={step} label={label} />
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 ${step > i + 1 ? "bg-emerald-500/50" : "bg-zinc-800"}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-6">
          {/* ── Step 1 ── */}
          {step === 1 && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Server className="h-5 w-5 text-gold-500" />
                <h2 className="text-lg font-bold text-white">Site Identity</h2>
              </div>

              <Field
                label="Desk ID (Unique Identifier)"
                hint="3–64 chars, letters, numbers, hyphens, underscores. E.g. MARBELLA_01"
              >
                <div className="flex gap-2">
                  <input
                    className={`${input} flex-1`}
                    value={deskId}
                    onChange={(e) => {
                      setDeskId(e.target.value.toUpperCase());
                      setDeskIdStatus("idle");
                    }}
                    placeholder="RESORT_STATION_01"
                  />
                  <button
                    onClick={handleCheckDeskId}
                    disabled={deskId.length < 3 || deskIdStatus === "checking"}
                    className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-bold hover:bg-zinc-700 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    {deskIdStatus === "checking" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Check"
                    )}
                  </button>
                </div>
                {deskIdStatus === "ok" && (
                  <p className="text-emerald-400 text-xs mt-1.5">✓ Available</p>
                )}
                {deskIdStatus === "taken" && (
                  <p className="text-red-400 text-xs mt-1.5">
                    ✗ Already registered — choose a different ID
                  </p>
                )}
                {deskIdStatus === "invalid" && (
                  <p className="text-amber-400 text-xs mt-1.5">
                    Only letters, numbers, - and _ allowed (3–64 chars)
                  </p>
                )}
              </Field>

              <Field
                label="Station Name"
                hint="Human-readable name shown in Hub fleet view"
              >
                <input
                  className={input}
                  value={deskName}
                  onChange={(e) => setDeskName(e.target.value)}
                  placeholder="Marbella Resort — Station 1"
                />
              </Field>

              <Field
                label="Location / Site"
                hint="City or resort name — shown on global leaderboard"
              >
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <input
                    className={`${input} pl-10`}
                    value={deskLocation}
                    onChange={(e) => setDeskLocation(e.target.value)}
                    placeholder="Marbella, Spain"
                  />
                </div>
              </Field>
            </>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Globe className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">Hub Connection</h2>
              </div>

              <Field label="Hub URL" hint={`Production: ${DEFAULT_HUB_URL}`}>
                <input
                  className={input}
                  value={hubUrl}
                  onChange={(e) => {
                    setHubUrl(e.target.value);
                    setConnStatus("idle");
                  }}
                  placeholder={DEFAULT_HUB_URL}
                />
              </Field>

              <Field label="Hub Account Email">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <input
                    type="email"
                    className={`${input} pl-10`}
                    value={hubEmail}
                    onChange={(e) => {
                      setHubEmail(e.target.value);
                      setConnStatus("idle");
                    }}
                    placeholder="desk@yourcompany.com"
                  />
                </div>
              </Field>

              <Field label="Hub Account Password">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <input
                    type="password"
                    className={`${input} pl-10`}
                    value={hubPassword}
                    onChange={(e) => {
                      setHubPassword(e.target.value);
                      setConnStatus("idle");
                    }}
                    placeholder="••••••••••••"
                  />
                </div>
              </Field>

              <button
                onClick={handleTestConnection}
                disabled={
                  !hubUrl ||
                  !hubEmail ||
                  !hubPassword ||
                  connStatus === "testing"
                }
                className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-bold hover:bg-zinc-700 disabled:opacity-40 transition-colors"
              >
                {connStatus === "testing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Testing…
                  </>
                ) : (
                  <>
                    <Plug className="h-4 w-4" /> Test Connection
                  </>
                )}
              </button>

              {connStatus === "ok" && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Connected — {latencyMs}ms latency
                </div>
              )}
              {connStatus === "fail" && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error || "Connection failed. Check URL and credentials."}
                </div>
              )}
            </>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Tag className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-bold text-white">
                  Desk Registration
                </h2>
              </div>

              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Desk ID</span>
                  <span className="font-mono text-white">{deskId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Station Name</span>
                  <span className="text-white">{deskName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Location</span>
                  <span className="text-zinc-400">{deskLocation || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Hub</span>
                  <span className="font-mono text-zinc-400 text-xs truncate max-w-[200px]">
                    {hubUrl}
                  </span>
                </div>
              </div>

              {!regToken ? (
                <button
                  onClick={handleRegisterDesk}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-100 disabled:opacity-40 transition-colors"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Registering…
                    </>
                  ) : (
                    "Register with Hub"
                  )}
                </button>
              ) : (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle className="h-4 w-4" />
                    Station registered successfully!
                  </div>
                  <p className="text-xs text-zinc-500">
                    Your desk is now visible in the Hub's Fleet Monitor. The JWT
                    token has been saved.
                  </p>
                </div>
              )}

              {error && !regToken && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </>
          )}

          {/* ── Step 4 ── */}
          {step === 4 && (
            <>
              <div className="text-center space-y-3 py-4">
                <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-9 w-9 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">All Done!</h2>
                <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                  <span className="font-bold text-white">{deskName}</span> is
                  configured and registered with the Hub. You can update these
                  settings anytime in{" "}
                  <span className="text-gold-500">
                    Settings → Cloud & Retention
                  </span>
                  .
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Desk ID", deskId],
                  ["Station", deskName],
                  ["Location", deskLocation || "—"],
                  ["Hub URL", hubUrl.replace("https://", "")],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="bg-zinc-900 rounded-lg p-3 border border-zinc-800"
                  >
                    <p className="text-zinc-600 text-xs uppercase tracking-wider">
                      {k}
                    </p>
                    <p
                      className="text-white font-mono text-xs mt-0.5 truncate"
                      title={v}
                    >
                      {v}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleFinish}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-gold-600 to-gold-500 text-black font-bold rounded-xl hover:brightness-110 disabled:opacity-40 transition-all shadow-lg shadow-gold-500/20"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Start Operations
              </button>
            </>
          )}

          {/* Error bar for general errors */}
          {error && step !== 2 && step !== 3 && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Navigation */}
          {step < 4 && (
            <div className="flex justify-between pt-2">
              <button
                onClick={() => {
                  setStep((s) => (s - 1) as Step);
                  clearError();
                }}
                disabled={step === 1}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-20 transition-colors text-sm"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => {
                  setStep((s) => (s + 1) as Step);
                  clearError();
                }}
                disabled={
                  (step === 1 && !step1Valid) ||
                  (step === 2 && !step2Valid) ||
                  (step === 3 && !regToken)
                }
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-zinc-100 disabled:opacity-30 transition-colors text-sm"
              >
                {step === 3 ? "Finish" : "Next"}{" "}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-zinc-700">
          Skip setup? Go to{" "}
          <span className="text-zinc-500">Settings → Cloud & Retention</span> to
          configure manually.
        </p>
      </div>
    </div>
  );
};

export default SetupWizard;
