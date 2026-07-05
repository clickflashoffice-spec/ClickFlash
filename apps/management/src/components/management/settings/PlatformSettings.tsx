import React from "react";
import GlobalFeatureSettings from "./GlobalFeatureSettings";

const PlatformSettings: React.FC = () => {
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
