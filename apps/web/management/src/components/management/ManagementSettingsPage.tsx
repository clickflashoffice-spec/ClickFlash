import React, { useState } from "react";
import { Photographer } from "../../types";
import { usePermissions } from "../../hooks/usePermissions";
import PermissionsMatrix from "./settings/PermissionsMatrix";
import OperationalSettings from "./settings/OperationalSettings";
import PlatformSettings from "./settings/PlatformSettings";
import WatermarkSettings from "./settings/WatermarkSettings";
import GeneralSettings from "./settings/GeneralSettings";
import PhotoSettings from "./settings/PhotoSettings";
import SystemStatusSettings from "./settings/SystemStatusSettings";
import ConnectionSettings from "./settings/ConnectionSettings";
import PixelFounderSettings from "./settings/PixelFounderSettings";
import SubscriptionSettings from "./settings/SubscriptionSettings";

type SettingsTab =
  | "general"
  | "platform"
  | "operations"
  | "photos"
  | "watermark"
  | "currency"
  | "connection"
  | "ai"
  | "admins"
  | "permissions"
  | "status"
  | "subscription";

interface ManagementSettingsPageProps {
  currentUser: Photographer;
}

const ManagementSettingsPage: React.FC<ManagementSettingsPageProps> = ({
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const { can } = usePermissions(currentUser);

  const TABS = [
    {
      id: "general" as SettingsTab,
      label: "General",
      component: <GeneralSettings />,
      permission: true,
      description: "Studio information, contact details, and business hours.",
    },
    {
      id: "platform" as SettingsTab,
      label: "Platform",
      component: <PlatformSettings />,
      permission: can("manageGlobalSettings"),
      description: "Cloud handshake, Branding, and Feature Flags.",
    },
    {
      id: "operations" as SettingsTab,
      label: "Operations",
      component: <OperationalSettings />,
      permission: can("manageGlobalSettings"),
      description: "Financial entities, Session templates, and Categorization.",
    },
    {
      id: "photos" as SettingsTab,
      label: "Photo Processing",
      component: <PhotoSettings />,
      permission: true,
      description: "Image processing, compression, and storage settings.",
    },
    {
      id: "watermark" as SettingsTab,
      label: "Watermark",
      component: <WatermarkSettings />,
      permission: true,
      description: "Configure global watermark settings for galleries.",
    },
    {
      id: "connection" as SettingsTab,
      label: "Connections",
      component: <ConnectionSettings />,
      permission: true,
      description: "Master station connections and network settings.",
    },
    {
      id: "ai" as SettingsTab,
      label: "PixelFounder",
      component: <PixelFounderSettings />,
      permission: can("manageGlobalSettings"),
      description: "First-party rules, telemetry scope, and forecast behavior.",
    },
    {
      id: "subscription" as SettingsTab,
      label: "Subscription",
      component: <SubscriptionSettings />,
      permission: can("manageGlobalSettings"),
      description: "Manage billing, referrals, and white-labeling.",
    },
    {
      id: "permissions" as SettingsTab,
      label: "Permissions",
      component: <PermissionsMatrix />,
      permission: true,
      description: "Global permission definitions and RBAC matrix.",
    },
    {
      id: "status" as SettingsTab,
      label: "System Status",
      component: <SystemStatusSettings />,
      permission: true,
      description: "Monitor system health and service status.",
    },
  ];

  const visibleTabs = TABS.filter((tab) => tab.permission);

  const renderTabContent = () => {
    const currentTabConfig = visibleTabs.find((tab) => tab.id === activeTab);
    return currentTabConfig ? currentTabConfig.component : null;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
            Control <span className="text-blue-500">Center</span>
          </h1>
          <p className="text-slate-400 text-sm font-bold tracking-widest uppercase mt-2">
            Global System Tuning &amp; Governance
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        <nav className="lg:w-80 flex-shrink-0 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`w-full text-left p-5 rounded-2xl transition-all border group ${
                activeTab === tab.id
                  ? "bg-blue-500/10 border-blue-500/20 text-white shadow-md shadow-blue-500/5"
                  : "bg-white/4 border-white/8 text-slate-400 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-black uppercase tracking-[0.2em] transition-colors ${
                    activeTab === tab.id
                      ? "text-blue-400"
                      : "text-slate-400 group-hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                )}
              </div>
              <p
                className={`text-[10px] leading-relaxed transition-colors ${
                  activeTab === tab.id
                    ? "text-slate-300"
                    : "text-slate-500 group-hover:text-slate-400"
                }`}
              >
                {tab.description}
              </p>
            </button>
          ))}
        </nav>
        <main className="flex-grow">
          <div className="bg-white/4 border border-white/8 rounded-3xl p-10 shadow-sm relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManagementSettingsPage;
