import React, { useEffect, useState } from "react";
import { Check, Layers, Monitor, Tablet, Cloud, Database, Cpu, FolderOpen, ShieldCheck } from "lucide-react";
import type { ApplicationComponent } from "../../installer-ipc-schemas";
import type { PayloadBundleSummary } from "../../installer-payload-verification";

export interface AppOption {
  id: ApplicationComponent;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  required?: boolean;
  defaultChecked: boolean;
  port?: number;
}

interface AppSelectionStepProps {
  selectedApps: ApplicationComponent[];
  payloadBundlePath: string;
  installPath: string;
  payloadBundle: PayloadBundleSummary | null;
  onSelectPayloadBundle: () => Promise<string | null>;
  onSelectInstallDirectory: () => Promise<string | null>;
  onNext: (selectedApps: ApplicationComponent[]) => void;
  onPrev: () => void;
}

const APPS: AppOption[] = [
  {
    id: "master",
    title: "Master Portal",
    subtitle: "Main Studio Station (Electron + React 19)",
    description: "Primary photography workflow hub. Handles photo tethering, automated/manual photo editing, order management, and thermal receipt printing.",
    icon: <Monitor className="w-6 h-6 text-blue-400" />,
    required: true,
    defaultChecked: true,
    port: 8090,
  },
  {
    id: "touch",
    title: "Touch Kiosk",
    subtitle: "Customer Ordering Terminal (Electron + React 19)",
    description: "Customer-facing touchscreen ordering terminal with RFID/Face recognition, package selection, and instant print requests.",
    icon: <Tablet className="w-6 h-6 text-purple-400" />,
    defaultChecked: true,
    port: 8091,
  },
  {
    id: "auto-editor",
    title: "AI & Photo Processing Engine",
    subtitle: "Offline WASM/Canvas Worker Engine",
    description: "Custom non-blocking image enhancer, background face detection, auto-exposure correction, and batch ZIP compilation.",
    icon: <Cpu className="w-6 h-6 text-emerald-400" />,
    defaultChecked: true,
  },
  {
    id: "sync-service",
    title: "LAN & Cloud Sync Service",
    subtitle: "Bi-directional Zero-Latency Tunnel",
    description: "Real-time WebSocket bridge between Master Portal and Touch Kiosks, plus Cloudflare D1/R2 background sync.",
    icon: <Database className="w-6 h-6 text-amber-400" />,
    defaultChecked: true,
    port: 3001,
  },
  {
    id: "management",
    title: "Management Hub Connector",
    subtitle: "Cloud Fleet & Analytics Link",
    description: "Connects this studio to the multi-destination Management Hub for live revenue dashboards and remote health diagnostics.",
    icon: <Cloud className="w-6 h-6 text-cyan-400" />,
    defaultChecked: true,
  },
];

export const AppSelectionStep: React.FC<AppSelectionStepProps> = ({
  selectedApps,
  payloadBundlePath,
  installPath,
  payloadBundle,
  onSelectPayloadBundle,
  onSelectInstallDirectory,
  onNext,
  onPrev,
}) => {
  const [selectedIds, setSelectedIds] = useState<ApplicationComponent[]>(() =>
    selectedApps.length > 0
      ? selectedApps
      : APPS.filter((app) => app.defaultChecked).map((app) => app.id)
  );
  const [selectingBundle, setSelectingBundle] = useState(false);
  const [selectingTarget, setSelectingTarget] = useState(false);

  useEffect(() => {
    if (!payloadBundle) return;
    setSelectedIds((previous) => {
      const withoutTouch = previous.filter((application) => application !== "touch");
      return payloadBundle.components.includes("touch")
        ? [...withoutTouch, "touch"]
        : withoutTouch;
    });
  }, [payloadBundle]);

  const toggleApp = (id: ApplicationComponent, required?: boolean) => {
    if (required || (id === "touch" && payloadBundle)) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(APPS
      .filter((application) => (
        application.id !== "touch" || !payloadBundle || payloadBundle.components.includes("touch")
      ))
      .map((application) => application.id));
  };

  const handleSelectBundle = async () => {
    setSelectingBundle(true);
    try {
      await onSelectPayloadBundle();
    } finally {
      setSelectingBundle(false);
    }
  };

  const handleSelectTarget = async () => {
    setSelectingTarget(true);
    try {
      await onSelectInstallDirectory();
    } finally {
      setSelectingTarget(false);
    }
  };

  const desktopSelectionMatchesBundle = Boolean(
    payloadBundle
    && selectedIds.includes("touch") === payloadBundle.components.includes("touch"),
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center mb-3">
          <Layers className="w-6 h-6 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          Choose Applications to Install
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
          Customize your ClickFlash ecosystem deployment. Select components tailored to this workstation.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={selectAll}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          Select All Full Suite
        </button>
      </div>

      <div className="p-4 rounded-2xl border border-slate-700 bg-slate-900/50">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              Signed application bundle
              {payloadBundle && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Choose a ClickFlash release bundle. Its signature and every application file will be checked before setup continues.
            </p>
            <p className="text-xs font-mono text-cyan-300 mt-2 truncate">
              {payloadBundlePath || "No verified bundle selected"}
            </p>
            {payloadBundle && (
              <p className="text-xs text-emerald-300 mt-1">
                Verified release {payloadBundle.releaseId} · v{payloadBundle.version} · {payloadBundle.fileCount.toLocaleString()} files
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSelectBundle}
            disabled={selectingBundle}
            className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 text-sm font-semibold transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            <FolderOpen className="w-4 h-4" />
            {selectingBundle ? "Verifying..." : "Choose Bundle"}
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-slate-700 bg-slate-900/50">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200">Installation destination</p>
            <p className="text-xs text-slate-400 mt-1">
              Choose an empty folder for a new installation, or the same verified ClickFlash release to repair it without losing configuration.
            </p>
            <p className="text-xs font-mono text-cyan-300 mt-2 truncate">
              {installPath || "No installation destination selected"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSelectTarget}
            disabled={selectingTarget}
            className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 text-sm font-semibold transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            <FolderOpen className="w-4 h-4" />
            {selectingTarget ? "Selecting..." : "Choose Destination"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto pr-1">
        {APPS.map((app) => {
          const isSelected = selectedIds.includes(app.id);
          return (
            <div
              key={app.id}
              onClick={() => toggleApp(app.id, app.required)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? "bg-slate-800/80 border-blue-500/50 shadow-lg shadow-blue-500/10"
                  : "bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-70"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/5 flex-shrink-0">
                  {app.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {app.title}
                      {app.required && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                          Required
                        </span>
                      )}
                      {app.port && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                          Port {app.port}
                        </span>
                      )}
                    </h3>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {app.subtitle}
                  </p>
                  <p className="text-xs text-slate-400/80 mt-1.5 leading-relaxed">
                    {app.description}
                  </p>
                </div>

                <div className="flex-shrink-0 self-center">
                  <div
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "border-slate-600 bg-slate-800"
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-all"
        >
          Back
        </button>
        <button
          onClick={() => onNext(selectedIds)}
          disabled={
            selectedIds.length === 0
            || !payloadBundlePath
            || !installPath
            || !payloadBundle
            || !desktopSelectionMatchesBundle
          }
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
        >
          Continue with {selectedIds.length} Component{selectedIds.length > 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
};

export default AppSelectionStep;
