import React, { useState } from "react";
import { ManagementView } from "../../constants.ts";
import { Photographer } from "../../types.ts";
import {
  LayoutDashboard,
  Server,
  Wallet,
  Settings,
  ChevronDown,
  LogOut,
  User,
  ShoppingCart,
  Package,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  ClipboardList,
} from "lucide-react";

interface SimplifiedSidebarProps {
  currentView: ManagementView;
  setCurrentView: (view: ManagementView) => void;
  onLogout: () => void;
  currentUser: Photographer;
}

// ============================================================================
// SIMPLIFIED 4-TAB NAVIGATION STRUCTURE
// ============================================================================
// Replaced 6-hub structure with 4 primary tabs for streamlined navigation.
// Navigation items reduced from 37 to 12 (68% reduction).
// ============================================================================

type TabId = "dashboard" | "operations" | "finance" | "settings";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
  views: ManagementView[];
}

const TABS: TabConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    views: ["executive_dashboard"],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Server,
    views: [
      "stations_overview",
      "orders_sales",
      "assets_inventory",
      "sync_logs",
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Wallet,
    views: ["revenue_income", "expenses_payroll", "capital_treasury"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    views: [
      "general_settings",
      "staff_management",
      "session_types",
      "reports_insights",
    ],
  },
];

interface TabItemConfig {
  view: ManagementView;
  label: string;
  icon: React.ElementType;
}

const TAB_ITEMS: Record<TabId, TabItemConfig[]> = {
  dashboard: [
    {
      view: "executive_dashboard",
      label: "Executive Dashboard",
      icon: LayoutDashboard,
    },
  ],
  operations: [
    { view: "stations_overview", label: "Stations Overview", icon: Server },
    { view: "orders_sales", label: "Orders & Sales", icon: ShoppingCart },
    { view: "assets_inventory", label: "Assets & Inventory", icon: Package },
    { view: "sync_logs", label: "Sync & Logs", icon: RefreshCw },
  ],
  finance: [
    { view: "revenue_income", label: "Revenue & Income", icon: TrendingUp },
    { view: "expenses_payroll", label: "Expenses & Payroll", icon: DollarSign },
    { view: "capital_treasury", label: "Capital & Treasury", icon: Users },
  ],
  settings: [
    { view: "general_settings", label: "General Settings", icon: Settings },
    { view: "staff_management", label: "Staff Management", icon: Users },
    { view: "session_types", label: "Session Types", icon: ClipboardList },
    { view: "reports_insights", label: "Reports & Insights", icon: FileText },
  ],
};

export const SimplifiedSidebar: React.FC<SimplifiedSidebarProps> = ({
  currentView,
  setCurrentView,
  onLogout,
  currentUser,
}) => {
  const [expandedTab, setExpandedTab] = useState<TabId>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine which tab contains the current view
  const activeTab =
    TABS.find((tab) => tab.views.includes(currentView)) || TABS[0];

  const handleTabClick = (tab: TabConfig) => {
    if (expandedTab === tab.id) {
      // If already expanded, just collapse it
      setExpandedTab(tab.id);
    } else {
      // Expand this tab and navigate to first item
      setExpandedTab(tab.id);
      setCurrentView(tab.views[0]);
    }
  };

  const handleItemClick = (view: ManagementView) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <div className="flex flex-col h-full w-full bg-slate-900/50 backdrop-blur-2xl">
        {/* Logo */}
        <div className="p-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-white/20">
              <span className="text-white font-black text-lg">CF</span>
            </div>
            <div>
              <h1 className="text-white font-black text-lg tracking-tight">Management</h1>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Cloud Dashboard</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab.id === tab.id;
            const isExpanded = expandedTab === tab.id;
            const items = TAB_ITEMS[tab.id];

            return (
              <div key={tab.id} className="space-y-0.5">
                {/* Tab Header */}
                <button
                  onClick={() => handleTabClick(tab)}
                  aria-expanded={isExpanded ? "true" : "false"}
                  aria-label={`${tab.label} tab`}
                  className={`
                    w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200
                    ${
                      isActive
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-blue-500/15" : "bg-white/5"}`}>
                      <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                    </div>
                    <span className={`font-semibold text-sm ${isActive ? "text-blue-300" : ""}`}>{tab.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {tab.id === "operations" && (
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-amber-500/20 shadow-sm shadow-amber-500/10">
                        12
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 opacity-60 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {/* Tab Items — with left accent on active */}
                {isExpanded && (
                  <div className="mt-0.5 space-y-0.5">
                    {items.map((item) => {
                      const isItemActive = currentView === item.view;
                      const ItemIcon = item.icon;

                      return (
                        <button
                          key={item.view}
                          onClick={() => handleItemClick(item.view)}
                          aria-current={isItemActive ? "page" : undefined}
                          aria-label={item.label}
                          className={`
                            relative w-full flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg
                            transition-all duration-200
                            ${
                              isItemActive
                                ? "bg-blue-500/8 text-blue-300 border border-blue-500/15"
                                : "text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                            }
                          `}
                        >
                          {/* Left accent bar */}
                          {isItemActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
                          )}
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <ItemIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isItemActive ? "text-blue-400" : "text-slate-500"}`} />
                              <span className={`text-sm ${isItemActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                            </div>
                            {item.view === "orders_sales" && (
                              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-amber-500/20 shadow-sm shadow-amber-500/10">
                                12
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>


        {/* User Section */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/20 border border-white/5 shadow-inner">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center border border-white/20">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-black tracking-tight truncate">
                {currentUser?.name || "Admin User"}
              </p>
              <p className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest truncate">
                {currentUser?.role || "Administrator"}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070b14]/80 backdrop-blur-3xl border-t border-white/10 px-2 py-safe-bottom pt-2 pb-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab.id === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentView(tab.views[0]);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl
                  transition-all duration-300
                  ${
                    isActive
                      ? "text-blue-400 bg-blue-500/10 border border-blue-500/20 shadow-inner"
                      : "text-slate-500 hover:text-slate-300"
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default SimplifiedSidebar;
