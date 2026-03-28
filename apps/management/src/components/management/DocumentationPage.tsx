import React, { useState } from "react";
import { Photographer } from "../../types";
import {
  BookOpen,
  Server,
  Monitor,
  RefreshCw,
  Shield,
  HelpCircle,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import Card from "../common/Card.tsx";

interface DocumentationPageProps {
  currentUser: Photographer;
}

const DocumentationPage: React.FC<DocumentationPageProps> = ({
  currentUser,
}) => {
  const [activeSection, setActiveSection] = useState("overview");

  const sections = [
    { id: "overview", label: "System Overview", icon: BookOpen },
    { id: "master", label: "Master Station", icon: Server },
    { id: "touch", label: "Touch Kiosk", icon: Monitor },
    { id: "sync", label: "Sync Protocol", icon: RefreshCw },
    { id: "security", label: "Security & Auth", icon: Shield },
  ];

  const SidebarItem = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
        activeSection === id
          ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
          : "text-slate-500 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <span className="font-bold text-sm uppercase tracking-wider">
          {label}
        </span>
      </div>
      {activeSection === id && <ChevronRight className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-8 animate-in fade-in duration-500">
      {/* Sidebar Navigation */}
      <div className="xl:w-80 space-y-2">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-4">
          <h2 className="text-xl font-black text-slate-800 p-2">Docs Index</h2>
          <div className="space-y-1">
            {sections.map((s) => (
              <SidebarItem key={s.id} {...s} />
            ))}
          </div>
        </div>

        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold uppercase tracking-wider">
              Quick Support
            </h3>
          </div>
          <p className="text-slate-400 text-xs mb-4">
            Need urgent technical assistance with the fleet?
          </p>
          <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
            Open Support Ticket
          </button>
        </Card>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-[600px]">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          {activeSection === "overview" && (
            <div className="space-y-8 max-w-4xl">
              <div className="space-y-4">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                  System <span className="text-cyan-500">Architecture</span>
                </h1>
                <p className="text-slate-500 text-lg font-medium leading-relaxed">
                  ClickFlash is a distributed, offline-first photography
                  ecosystem designed for high-volume resort environments. The
                  system operates on three distinct layers: Local Masters,
                  Consumer Kiosks, and the Global Hub.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h3 className="font-black text-slate-800 mb-2 uppercase tracking-tight">
                    Master Station
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    The processing powerhouse. Handles ingestion, AI face
                    indexing, and cloud relay.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "100GB+ Photo Storage",
                      "AI Search indexing",
                      "HTTP Bridge API",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-xs font-bold text-slate-700"
                      >
                        <CheckCircle2 className="w-4 h-4 text-cyan-500" />{" "}
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h3 className="font-black text-slate-800 mb-2 uppercase tracking-tight">
                    Touch Kiosk
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Consumer-facing selection units. 100% offline-ready with
                    local LAN fetch.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Instant Image Preview",
                      "Guest Selection Flow",
                      "Local UI Shell",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-xs font-bold text-slate-700"
                      >
                        <CheckCircle2 className="w-4 h-4 text-cyan-500" />{" "}
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === "master" && (
            <div className="space-y-8 max-w-4xl">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                Master Station <span className="text-cyan-500">Operations</span>
              </h1>
              <section className="space-y-4">
                <h2 className="text-xl font-black uppercase text-slate-800">
                  1. Data Ingestion
                </h2>
                <p className="text-slate-500 text-md">
                  Photos are imported directly via the SD Card reader or
                  hot-folder. The system automatically tiers assets into:
                </p>
                <div className="flex gap-4">
                  <div className="flex-1 p-4 bg-slate-100 rounded-xl text-center">
                    <span className="block font-black text-slate-900">
                      Tiny
                    </span>
                    <span className="text-xs text-slate-500">Thumbnail</span>
                  </div>
                  <div className="flex-1 p-4 bg-slate-100 rounded-xl text-center">
                    <span className="block font-black text-slate-900">
                      Preview
                    </span>
                    <span className="text-xs text-slate-500">Selection</span>
                  </div>
                  <div className="flex-1 p-4 bg-slate-100 rounded-xl text-center">
                    <span className="block font-black text-slate-900">
                      Hi-Res
                    </span>
                    <span className="text-xs text-slate-500">Fulfillment</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === "sync" && (
            <div className="space-y-8 max-w-4xl">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                Synchronization <span className="text-cyan-500">Protocol</span>
              </h1>
              <div className="p-6 bg-cyan-900 text-white rounded-3xl">
                <h3 className="text-lg font-bold mb-2">
                  Master → Global Hub (Push)
                </h3>
                <p className="text-cyan-100 text-sm leading-relaxed">
                  The Master station executes an hourly background worker
                  (CloudSyncService) to push Orders and Heartbeats to the Global
                  Hub via standard REST API. Hi-Res assets are pushed only upon
                  order fulfillment using a chunked-upload mechanism to ensure
                  integrity over flaky connections.
                </p>
              </div>
            </div>
          )}

          {/* Additional sections would be populated here... */}
          {!["overview", "master", "sync"].includes(activeSection) && (
            <div className="py-20 text-center animate-in fade-in">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <HelpCircle className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-800">
                Content Coming Soon
              </h3>
              <p className="text-slate-400 max-w-xs mx-auto mt-2">
                This section of the documentation is currently being finalized
                by the engineering team.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentationPage;
