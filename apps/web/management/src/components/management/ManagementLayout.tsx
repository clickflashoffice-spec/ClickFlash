import React, { useState, useEffect, lazy, Suspense } from "react";
import { ManagementView } from "../../constants.ts";
import { useManagement } from "../../context/ManagementContext.tsx";
import {
  ManagementErrorBoundary,
  DashboardErrorBoundary,
} from "../error-boundaries/FeatureErrorBoundary";
import { Photographer } from "../../types.ts";
import { orchestrationService } from "../../services/orchestrationService";
import SimplifiedSidebar from "./SimplifiedSidebar.tsx";
import CommandBar from "../common/CommandBar.tsx";
import Breadcrumb from "../common/Breadcrumb.tsx";
import { GlobalLocationSwitcher } from "../common/GlobalLocationSwitcher.tsx";
import {
  Menu,
  Bell,
  Settings,
  Search,
  Command as CommandIcon,
} from "lucide-react";
import { Spinner } from "@clickflash/ui";
import { logger } from '@/utils/logger';

const AIChatBot = lazy(() => import("./AIChatBot.tsx"));

const UnifiedFinancePage = lazy(() => import("./UnifiedFinancePage.tsx"));
const FleetMonitorPage = lazy(() => import("./FleetMonitorPage.tsx"));
const ManagementSettingsPage = lazy(() => import("./ManagementSettingsPage.tsx"));
const BillingPage = lazy(() => import("./BillingPage.tsx"));
const Photographers = lazy(() => import("../Photographers.tsx"));
const WorkforceDashboard = lazy(() => import("./WorkforceDashboard.tsx"));
const WarehousePage = lazy(() => import("./WarehousePage.tsx"));
const ReportsPage = lazy(() => import("./ReportsPage.tsx"));
const SessionTypesSettings = lazy(() => import("./settings/SessionTypesSettings.tsx"));
const PayrollPage = lazy(() => import("./PayrollPage.tsx"));
const CapitalPage = lazy(() => import("./CapitalPage.tsx"));
const SyncLogsPage = lazy(() => import("./SyncLogsPage.tsx"));
const UnifiedMasterDashboard = lazy(() => import("./UnifiedMasterDashboard.tsx"));
const Orders = lazy(() => import("../Orders.tsx"));
const LicenseManagementPage = lazy(() => import("./LicenseManagementPage.tsx"));
const EmailCampaigns = lazy(() => import("./EmailCampaigns.tsx"));
const VolumeExports = lazy(() => import("./VolumeExports.tsx"));
const AILocationScout = lazy(() => import("./AILocationScout.tsx").then(m => ({ default: m.AILocationScout })));
const AIManagerWorkspace = lazy(() => import("./AIManagerWorkspace.tsx").then(m => ({ default: m.AIManagerWorkspace })));
const AICEOWorkspace = lazy(() => import("./AICEOWorkspace.tsx").then(m => ({ default: m.AICEOWorkspace })));

// Phase 6 / Epic 5 Pages
const FranchiseOnboardingPage = lazy(() => import("./FranchiseOnboardingPage.tsx"));
const WhiteLabelSettingsPage = lazy(() => import("./WhiteLabelSettingsPage.tsx"));
const SLAMonitoringPage = lazy(() => import("./SLAMonitoringPage.tsx"));
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Spinner size="large" />
  </div>
);

interface ManagementLayoutProps {
  currentUser: Photographer;
  onLogout: () => void;
}

const ManagementLayout: React.FC<ManagementLayoutProps> = ({
  currentUser,
  onLogout,
}) => {
  const {
    currentView,
    setCurrentView,
    selectedContext,
    setSelectedContext,
    selectedStationId: _selectedStationId,
    setSelectedStationId,
    syncStatus,
    setSyncStatus,
    isCommandBarOpen,
    setIsCommandBarOpen,
  } = useManagement();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  const isMobile = window.innerWidth < 1024;

  // Global Key Listeners for Command Bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandBarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle Orchestration Pulse
  useEffect(() => {
    orchestrationService.startGlobalPulse();

    const handlePulse = (data: unknown) => {
      const pulse = data as { timestamp: number; onlineCount: number };
      setSyncStatus((prev) => ({
        ...prev,
        lastPulse: pulse.timestamp,
        onlineCount: pulse.onlineCount,
        status: pulse.onlineCount > 0 ? "online" : "warning",
      }));
    };

    const handleMasterOnline = () => {
      setSyncStatus((prev) => ({ ...prev, status: "syncing" }));
      setTimeout(() => {
        setSyncStatus((prev) => ({
          ...prev,
          onlineCount: orchestrationService.getOnlineMasters().length,
          status: "online",
        }));
      }, 2000);
    };

    orchestrationService.on("pulse", handlePulse);
    orchestrationService.on("master:online", handleMasterOnline);
    orchestrationService.on("master:offline", handlePulse);

    return () => {
      orchestrationService.stopGlobalPulse();
      orchestrationService.off("pulse", handlePulse);
      orchestrationService.off("master:online", handleMasterOnline);
      orchestrationService.off("master:offline", handlePulse);
    };
  }, []);

  // Responsive Sidebar Handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderView = () => {
    const content = (() => {
      switch (currentView) {
        case "executive_dashboard":
          return (
            <DashboardErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <UnifiedMasterDashboard />
              </Suspense>
            </DashboardErrorBoundary>
          );

        case "stations_overview":
          return (
            <Suspense fallback={<PageLoader />}>
              <FleetMonitorPage
                onNavigateToStation={(id) => {
                  setSelectedContext(id);
                  setSelectedStationId(id);
                }}
              />
            </Suspense>
          );

        case "orders_sales":
          return (
            <Suspense fallback={<PageLoader />}>
              <Orders
                currentUser={currentUser}
                showToast={(msg) => logger.info(msg)}
                onPrintOrder={() => {}}
                onPrintReceipt={() => {}}
                onOpenLabFolder={() => {}}
              />
            </Suspense>
          );

        case "volume_exports":
          return (
            <Suspense fallback={<PageLoader />}>
              <VolumeExports />
            </Suspense>
          );

        case "assets_inventory":
          return (
            <Suspense fallback={<PageLoader />}>
              <WarehousePage />
            </Suspense>
          );

        case "sync_logs":
          return (
            <Suspense fallback={<PageLoader />}>
              <SyncLogsPage />
            </Suspense>
          );

        case "revenue_income":
          return (
            <Suspense fallback={<PageLoader />}>
              <UnifiedFinancePage currentUser={currentUser} />
            </Suspense>
          );

        case "expenses_payroll":
          return (
            <Suspense fallback={<PageLoader />}>
              <PayrollPage currentUser={currentUser} />
            </Suspense>
          );

        case "capital_treasury":
          return (
            <Suspense fallback={<PageLoader />}>
              <CapitalPage />
            </Suspense>
          );

        case "general_settings":
          return (
            <Suspense fallback={<PageLoader />}>
              <ManagementSettingsPage currentUser={currentUser} />
            </Suspense>
          );
          
        case "billing_subscription":
          return (
            <Suspense fallback={<PageLoader />}>
              <BillingPage currentUser={currentUser} />
            </Suspense>
          );

        case "license_management":
          return (
            <Suspense fallback={<PageLoader />}>
              <LicenseManagementPage />
            </Suspense>
          );

        case "staff_management":
          return (
            <Suspense fallback={<PageLoader />}>
              <Photographers currentUser={currentUser} />
            </Suspense>
          );

        case "workforce_dashboard":
          return (
            <Suspense fallback={<PageLoader />}>
              <WorkforceDashboard />
            </Suspense>
          );

        case "session_types":
          return (
            <Suspense fallback={<PageLoader />}>
              <SessionTypesSettings />
            </Suspense>
          );

        case "reports_insights":
          return (
            <Suspense fallback={<PageLoader />}>
              <ReportsPage />
            </Suspense>
          );

        case "email_campaigns":
          return (
            <Suspense fallback={<PageLoader />}>
              <EmailCampaigns />
            </Suspense>
          );

        case "ai_location_scout":
          return (
            <Suspense fallback={<PageLoader />}>
              <AILocationScout />
            </Suspense>
          );

        case "ai_manager_workspace":
          return (
            <Suspense fallback={<PageLoader />}>
              <AIManagerWorkspace />
            </Suspense>
          );

        case "ai_ceo_workspace":
          return (
            <Suspense fallback={<PageLoader />}>
              <AICEOWorkspace />
            </Suspense>
          );

        case "franchise_onboarding":
          return (
            <Suspense fallback={<PageLoader />}>
              <FranchiseOnboardingPage />
            </Suspense>
          );

        case "white_label_settings":
          return (
            <Suspense fallback={<PageLoader />}>
              <WhiteLabelSettingsPage />
            </Suspense>
          );

        case "sla_monitoring":
          return (
            <Suspense fallback={<PageLoader />}>
              <SLAMonitoringPage />
            </Suspense>
          );

        default:
          return (
            <DashboardErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <UnifiedMasterDashboard />
              </Suspense>
            </DashboardErrorBoundary>
          );
      }
    })();

    return <ManagementErrorBoundary>{content}</ManagementErrorBoundary>;
  };


  return (
    <div className="flex h-screen w-screen bg-[#070b14] text-white overflow-hidden font-sans" data-testid="dashboard">
      {/* Mobile Backdrop */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Persistent Floating Sidebar */}
      <aside
        id="sidebar-navigation"
        aria-label="Sidebar Navigation"
        className={`fixed left-0 top-0 z-50 transition-all duration-500 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } h-full lg:h-[calc(100vh-2rem)] lg:my-4 lg:ml-4 lg:rounded-[2rem] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10`}
      >
        <SimplifiedSidebar
          currentView={currentView}
          setCurrentView={(view) => {
            setCurrentView(view);
            if (isMobile) setIsSidebarOpen(false);
          }}
          onLogout={onLogout}
          currentUser={currentUser}
        />
      </aside>

      {/* Main Content Area */}
      <main
        role="main"
        className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out relative z-10 ${
          isSidebarOpen && !isMobile ? "pl-[320px]" : "pl-0"
        } pb-24 lg:pb-0`}
      >
        {/* Top Operational Bar - Command Deck Style */}
        <header role="banner" className="h-20 flex items-center justify-between px-4 lg:px-8 bg-[#070b14]/80 backdrop-blur-xl border-b border-white/5 z-20 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              aria-expanded={isSidebarOpen}
              aria-controls="sidebar-navigation"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-[#38bdf8] hover:bg-[#38bdf8]/10 transition-colors"
            >
              <Menu
                className={`w-5 h-5 transition-transform duration-300 ${isSidebarOpen ? "rotate-180" : ""}`}
              />
            </button>

            <div className="hidden sm:flex flex-col gap-0.5">
              <Breadcrumb
                currentView={currentView}
                onNavigate={(view) => {
                  setCurrentView(view);
                  if (isMobile) setIsSidebarOpen(false);
                }}
              />
              <h1 className="text-lg lg:text-xl font-serif font-black text-white leading-tight truncate max-w-[200px] lg:max-w-none">
                {currentView
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-6">
            {/* Context Selector (Global vs Hotel - 100+ Master Locations Scale) */}
            <GlobalLocationSwitcher 
              selectedContext={selectedContext}
              onContextChange={(context) => setSelectedContext(context)}
            />

            <div className="h-8 w-px bg-white/10 hidden lg:block"></div>

            <div className="hidden xl:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Fleet Sync
              </span>
              <span
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  syncStatus.status === "online"
                    ? "text-emerald-600"
                    : syncStatus.status === "syncing"
                      ? "text-blue-600"
                      : "text-amber-600"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    syncStatus.status === "online"
                      ? "bg-emerald-500"
                      : syncStatus.status === "syncing"
                        ? "bg-blue-500"
                        : "bg-amber-500"
                  }`}
                ></div>
                {syncStatus.status === "online"
                  ? `${syncStatus.onlineCount} Active`
                  : syncStatus.status === "syncing"
                    ? "Syncing..."
                    : "Offline"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsCommandBarOpen(true)}
                title="Search (Cmd+K)"
                aria-label="Open search"
                className="hidden md:flex p-2 lg:p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-blue-400 transition-colors shadow-sm items-center gap-2 group hover:bg-white/10"
              >
                <Search className="w-4 h-4 lg:w-5 lg:h-5" />
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/20 rounded border border-white/5 group-hover:border-blue-500/30 transition-colors">
                  <CommandIcon className="w-2.5 h-2.5 text-slate-500 group-hover:text-blue-400" />
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-400">
                    K
                  </span>
                </div>
              </button>
              <button
                onClick={() => setCurrentView("reports_insights")}
                title="Notifications"
                aria-label="View notifications"
                className="p-2 lg:p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-blue-400 transition-colors shadow-sm hover:bg-white/10"
              >
                <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button
                onClick={() => setCurrentView("general_settings")}
                title="Settings"
                aria-label="Open settings"
                className="p-2 lg:p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-blue-400 transition-colors shadow-sm hover:bg-white/10"
              >
                <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic View Container */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar relative z-10 w-full min-h-[calc(100vh-5rem)]">
          <div className="bg-transparent min-h-full rounded-2xl lg:rounded-3xl p-0 shadow-none border-none">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full">
              {renderView()}
            </div>
          </div>
        </div>

        {/* PixelFounder AI Chat Context */}
        <Suspense fallback={null}>
          <AIChatBot />
        </Suspense>

        {/* Global Command Bar */}
        <CommandBar
          isOpen={isCommandBarOpen}
          onClose={() => setIsCommandBarOpen(false)}
          onSelect={(view) => setCurrentView(view)}
        />
      </main>
    </div>
  );
};

export default ManagementLayout;
