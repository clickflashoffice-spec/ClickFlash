import React, { useState } from "react";
import WebsiteControlPage from "../WebsiteControlPage";
import ConnectionSettings from "./ConnectionSettings";
import GlobalFeatureSettings from "./GlobalFeatureSettings";

type SubTab = "Features" | "Website" | "Sync";

const PlatformSettings: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("Features");

  const SUB_TABS: { id: SubTab; label: string }[] = [
    { id: "Features", label: "Global Features" },
    { id: "Website", label: "Website Control" },
    { id: "Sync", label: "Cloud Handshake" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
          Platform <span className="text-cyan-600">Orchestration</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Manage global feature flags, website content, and cloud connectivity.
        </p>
      </div>

      <div className="animate-fadeIn">
        <GlobalFeatureSettings />
      </div>
    </div>
  );
};

export default PlatformSettings;
