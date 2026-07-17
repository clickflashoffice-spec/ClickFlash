import React from "react";
import { BrainCircuit, Cloud, Database, Gauge, ShieldCheck } from "lucide-react";

const CAPABILITIES = [
  {
    icon: Database,
    title: "First-party data",
    description: "Uses only telemetry and metrics supplied by ClickFlash services.",
  },
  {
    icon: Gauge,
    title: "Deterministic forecasts",
    description: "Calculates seven-day and thirty-day run rates from measured sales history.",
  },
  {
    icon: ShieldCheck,
    title: "No provider credentials",
    description: "Requires no external model account, API key, or per-request model fee.",
  },
];

const PixelFounderSettings: React.FC = () => (
  <div className="space-y-8">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h2 className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-slate-900">
          <BrainCircuit className="h-6 w-6 text-cyan-600" />
          PixelFounder <span className="text-cyan-600">Intelligence</span>
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Rules-backed operational guidance for the online Management app. Results are derived from supplied ClickFlash data and never sent to an external model provider.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 shadow-sm">
        <Cloud className="h-4 w-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">Online service active</span>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {CAPABILITIES.map(({ icon: Icon, title, description }) => (
        <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50">
            <Icon className="h-5 w-5 text-cyan-600" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
      ))}
    </div>

    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-5 text-sm text-cyan-900">
      Revenue guidance is not a financial guarantee. PixelFounder reports the exact data window and states when required telemetry is missing.
    </div>
  </div>
);

export default PixelFounderSettings;
