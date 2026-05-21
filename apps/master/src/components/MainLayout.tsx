import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
  lazy,
} from "react";
import { Sidebar } from "./Sidebar";
import Header from "./Header";
// Import Orders normally to avoid chunk loading issues
import Orders from "./Orders";
// Lazy load components
const Dashboard = lazy(() => import("./Dashboard"));
const Albums = lazy(() => import("./albums/Albums"));
const Photographers = lazy(() => import("./Photographers"));
const SettingsPage = lazy(() => import("./settings/SettingsPage"));
const Bookings = lazy(() => import("./bookings/Bookings"));
const PrintLayout = lazy(() => import("./orders/PrintLayout"));
const CustomerReceipt = lazy(() => import("./orders/CustomerReceipt"));
const Clients = lazy(() => import("./Clients"));
const OrderManagementView = lazy(() => import("./orders/OrderManagementView"));
const GrowthPage = lazy(() => import("./GrowthPage"));
const LocalResortDashboard = lazy(() => import("./LocalResortDashboard"));

const AIIdeasModal = lazy(() => import("./AIIdeasModal"));
import Toast from "./common/Toast";
import AssistanceNotificationBar from "./common/AssistanceNotificationBar";
import PageTransition from "./common/PageTransition"; // Import PageTransition
import {
  FeatureErrorBoundary,
  DashboardErrorBoundary,
  AlbumErrorBoundary,
  OrderErrorBoundary,
  SettingsErrorBoundary,
} from "./error-boundaries/FeatureErrorBoundary";
import { apiService } from "../services/apiService";
import { Order, Photographer, Album, View, AssistanceRequest } from "../types";
import Spinner from "./common/Spinner";
import NetworkStatusIndicator from "./common/NetworkStatusIndicator";
import { usePermissions } from "../hooks/usePermissions";
import AccessDenied from "./common/AccessDenied";
import { useDestinationFeatures } from "../hooks/useDestinationFeatures";
import { logger } from "../utils/logger";
import { UpdateNotification } from "./UpdateNotification";
import { GlobalSearch } from "./common/GlobalSearch/GlobalSearch";
import {
  dataVersionManager,
  ConflictInfo,
} from "../services/dataVersionManager";
import { pb } from "../services/pb";
import { safeStorage } from "../utils/safeStorage";

// Lazy load heavy components for code splitting

/**
 * MainLayout Component Props
 */
interface MainLayoutProps {
  /** Callback to switch/logout user */
  onSwitchUser: () => void;
  /** Current logged-in user */
  currentUser: Photographer;
  /** Whether the app is online (for AI features) */
  isOnline: boolean;
  /** Data version number - increments trigger data refresh */
  dataVersion?: number;
  /** Assistance requests from touch kiosks */
  assistanceRequests?: AssistanceRequest[];
  /** Callback to dismiss an assistance request */
  onDismissAssistance?: (id: string) => void;
  /** Callback to refresh current user data */
  onRefreshUser?: () => void;
}

/**
 * MainLayout Component
 *
 * Main layout component for the Master Portal, providing:
 * - Sidebar navigation
 * - View routing (Dashboard, Albums, Orders, etc.)
 * - Data fetching and refresh management
 * - Toast notifications
 * - Auto-refresh based on visibility and intervals
 * - Permission-based access control
 *
 * Features:
 * - Lazy loading of heavy components (DocumentationPage)
 * - Visibility-based auto-refresh (pauses when tab is hidden)
 * - Force refresh capability
 * - WebSocket integration for real-time updates
 * - Print/receipt/lab folder views
 *
 * @param {MainLayoutProps} props - Component props
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  onSwitchUser,
  currentUser,
  isOnline,
  dataVersion = 0,
  assistanceRequests = [],
  onDismissAssistance,
}) => {
  const [currentView, setCurrentView] = useState<View>("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Initialize from localStorage or default to false (expanded)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = safeStorage.getItem("isSidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev: boolean) => {
      const newState = !prev;
      safeStorage.setItem("isSidebarCollapsed", JSON.stringify(newState));
      return newState;
    });
  };

  const [isAIIdeasModalOpen, setAIIdeasModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [printOrderData, setPrintOrderData] = useState<Order | null>(null);
  const [receiptOrderData, setReceiptOrderData] = useState<Order | null>(null);
  const [labFolderOrder, setLabFolderOrder] = useState<Order | null>(null);

  const [dashboardData, setDashboardData] = useState<{
    orders: Order[];
    photographers: Photographer[];
    albums: Album[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  // Local refresh trigger to force updates in child components
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
  const { can } = usePermissions(currentUser);

  // Combine parent dataVersion with local trigger to create effective trigger
  const effectiveRefreshTrigger = (dataVersion || 0) + localRefreshTrigger;

  // Debug: Log permission check issues
  useEffect(() => {
    if (currentUser && import.meta.env.DEV) {
      logger.debug("MainLayout: Current user and permissions", {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        hasViewDashboard: can("viewDashboard"),
        hasViewAlbums: can("viewAlbums"),
        hasViewSettings: can("viewSettings"),
      });
    }
  }, [currentUser, can]);

  // Get global feature flags for this destination
  const { features } = useDestinationFeatures(currentUser);

  // Throttling refs to prevent too many rapid refresh requests
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef<number>(0);
  const MIN_REFRESH_INTERVAL_MS = 1000; // Minimum 1 second between refresh requests

  /**
   * Fetch dashboard data (orders, photographers, albums)
   *
   * Features:
   * - Parallel data fetching for better performance
   * - Loading state management
   * - Error handling with fallback to empty arrays
   * - Last refresh time tracking for incremental refresh
   *
   * @param {boolean} forceRefresh - If true, always show loading state
   * @returns {Promise<void>}
   */
  const fetchDashboardData = useCallback(
    async (forceRefresh = false) => {
      // Don't set loading on initial mount if we have cached data
      const isInitialLoad = !dashboardData;
      if (isInitialLoad || forceRefresh) {
        setLoading(true);
      }

      try {
        const [allOrdersResponse, allPhotographers, allAlbums] =
          await Promise.all([
            apiService.getOrders(),
            apiService.getUsers(),
            apiService.getAlbums(),
          ]);
        setDashboardData({
          orders: allOrdersResponse.data,
          photographers: allPhotographers,
          albums: allAlbums,
        });

        // Store last refresh time for incremental refresh
        safeStorage.setItem("lastDashboardRefresh", new Date().toISOString());
      } catch (error) {
        const err = error as {
          status?: number;
          code?: string;
          message: string;
        };
        const errorStatus = err.status;
        const errorCode = err.code;
        const errorMessage = err.message || "Failed to load dashboard data";

        // Check if it's an authentication error (401) - only check status/code, not messages
        // to avoid false positives from other errors
        // Only log out if user is actually authenticated (to avoid logging out during initial load)
        const isAuthError =
          (errorStatus === 401 || errorCode === "AUTHENTICATION_ERROR") &&
          currentUser;

        if (isAuthError) {
          logger.warn(
            "Authentication token invalid during data fetch, logging out",
            {
              userId: currentUser?.id,
              errorMessage,
            },
          );

          // Clear authentication token and session
          pb.authStore.clear();
          safeStorage.removeItem("authToken");
          safeStorage.removeItem("masterPortalUser");

          // Show logout message
          setToastMessage("Your session has expired. Please log in again.");

          // Log user out
          onSwitchUser();
          return; // Don't continue after logout
        }

        logger.error("Failed to load dashboard data", err, {
          userId: currentUser?.id,
        });
        // If we have no data and failed, show error state
        if (isInitialLoad && !dashboardData) {
          setDashboardData({ orders: [], photographers: [], albums: [] });
        }
      } finally {
        setLoading(false);
      }
    },
    [dashboardData, currentUser, onSwitchUser],
  );

  /**
   * Manually refresh dashboard data (frontend only)
   */
  const refreshData = useCallback(
    async (showToast = true) => {
      // Prevent concurrent refresh calls
      const now = Date.now();
      if (
        isRefreshingRef.current ||
        now - lastRefreshTimeRef.current < MIN_REFRESH_INTERVAL_MS
      )
        return;

      isRefreshingRef.current = true;
      lastRefreshTimeRef.current = now;

      try {
        await fetchDashboardData(true);
        if (showToast) setToastMessage("Data updated");
        setLocalRefreshTrigger((prev) => prev + 1);
      } catch (error) {
        logger.error(
          "Data refresh failed",
          error instanceof Error ? error : undefined,
        );
        if (showToast) setToastMessage("Refresh failed");
      } finally {
        isRefreshingRef.current = false;
      }
    },
    [fetchDashboardData],
  );

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser, dataVersion, fetchDashboardData]);

  // Register conflict callbacks for data version manager
  useEffect(() => {
    // Register conflict handlers for each collection
    const handleConflict = (conflict: ConflictInfo) => {
      logger.warn("Data version conflict detected, resolving", {
        collection: conflict.collection,
        localVersion: conflict.localVersion,
        serverVersion: conflict.serverVersion,
      });

      // Resolve conflict using server wins strategy by default
      dataVersionManager.resolveConflict(conflict, "server");
      showToast(
        `Data conflict resolved for ${conflict.collection}. Server version used.`,
      );
    };

    dataVersionManager.onConflict("albums", handleConflict);
    dataVersionManager.onConflict("orders", handleConflict);
    dataVersionManager.onConflict("photos", handleConflict);
    dataVersionManager.onConflict("users", handleConflict);

    // Cleanup on unmount
    return () => {
      dataVersionManager.offConflict("albums");
      dataVersionManager.offConflict("orders");
      dataVersionManager.offConflict("photos");
      dataVersionManager.offConflict("users");
    };
  }, [showToast]);

  /**
   * Auto-refresh data at regular intervals (only when tab is visible)
   *
   * Features:
   * - Configurable refresh interval
   * - Visibility-based pause/resume
   * - Immediate refresh when tab becomes visible
   * - Respects autoRefreshEnabled setting
   * - Graceful error handling
   * - Automatic retry on errors with exponential backoff
   */

  useEffect(() => {
    const handlePrint = (onCleanup: () => void) => {
      const handleAfterPrint = () => {
        onCleanup();
        window.removeEventListener("afterprint", handleAfterPrint);
      };
      window.addEventListener("afterprint", handleAfterPrint);
      const timer = setTimeout(() => {
        window.print();
      }, 100);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("afterprint", handleAfterPrint);
      };
    };
    if (printOrderData) return handlePrint(() => setPrintOrderData(null));
    if (receiptOrderData) return handlePrint(() => setReceiptOrderData(null));
  }, [printOrderData, receiptOrderData]);

  const handleOpenAIIdeas = () => {
    if (!isOnline) {
      showToast("AI features require an internet connection.");
      return;
    }
    setAIIdeasModalOpen(true);
    setIsSidebarOpen(false);
  };

  const [viewParams, setViewParams] = useState<any>(null);

  const handleNavigate = (view: View, params?: any) => {
    setCurrentView(view);
    setViewParams(params);
    setLabFolderOrder(null);
  };

  const renderView = () => {
    // Show UI immediately, load data in background
    if (!dashboardData && loading) {
      // Only show spinner on initial load, not on refreshes
      return (
        <div className="flex items-center justify-center h-full min-h-[50vh]">
          <Spinner />
        </div>
      );
    }

    if (labFolderOrder) {
      return (
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
          }
        >
          <OrderManagementView
            order={labFolderOrder}
            onBack={() => setLabFolderOrder(null)}
            onUpdateOrder={(updated) => {
              refreshData();
              setLabFolderOrder(updated);
            }}
          />
        </Suspense>
      );
    }

    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        }
      >
        <PageTransition viewKey={currentView}>
          <div className="max-w-[1600px] mx-auto">
            {(() => {
              // Safety check: Ensure user is loaded before permission checks
              if (!currentUser) {
                return (
                  <div className="flex items-center justify-center h-full">
                    <Spinner size="large" />
                  </div>
                );
              }

              switch (currentView) {
                case "Dashboard":
                  if (!can("viewDashboard")) {
                    logger.warn("Access denied to Dashboard", {
                      userId: currentUser.id,
                      role: currentUser.role,
                    });
                    return (
                      <AccessDenied
                        permission="viewDashboard"
                        role={currentUser.role}
                        page="Dashboard"
                      />
                    );
                  }
                  return (
                    <DashboardErrorBoundary>
                      <Dashboard
                        localData={
                          dashboardData || {
                            orders: [],
                            photographers: [],
                            albums: [],
                          }
                        }
                        currentUser={currentUser}
                        onNavigate={handleNavigate}
                      />
                    </DashboardErrorBoundary>
                  );
                case "Albums":
                  if (!can("viewAlbums")) {
                    logger.warn("Access denied to Albums", {
                      userId: currentUser.id,
                      role: currentUser.role,
                    });
                    return (
                      <AccessDenied
                        permission="viewAlbums"
                        role={currentUser.role}
                        page="Albums"
                      />
                    );
                  }
                  return (
                    <AlbumErrorBoundary>
                      <Albums
                        showToast={showToast}
                        currentUser={currentUser}
                        isOnline={isOnline}
                        refreshTrigger={effectiveRefreshTrigger}
                      />
                    </AlbumErrorBoundary>
                  );
                case "Bookings":
                  if (!can("viewBookings")) {
                    logger.warn("Access denied to Bookings", {
                      userId: currentUser.id,
                      role: currentUser.role,
                    });
                    return (
                      <AccessDenied
                        permission="viewBookings"
                        role={currentUser.role}
                        page="Bookings"
                      />
                    );
                  }
                  return (
                    <FeatureErrorBoundary feature="Bookings" severity="medium">
                      <Bookings
                        showToast={showToast}
                        refreshTrigger={effectiveRefreshTrigger}
                      />
                    </FeatureErrorBoundary>
                  );
                case "Orders":
                  if (!can("viewOrders")) {
                    logger.warn("Access denied to Orders", {
                      userId: currentUser.id,
                      role: currentUser.role,
                    });
                    return (
                      <AccessDenied
                        permission="viewOrders"
                        role={currentUser.role}
                        page="Orders"
                      />
                    );
                  }
                  return (
                    <OrderErrorBoundary>
                      <Orders
                        showToast={showToast}
                        currentUser={currentUser}
                        onPrintOrder={setPrintOrderData}
                        onPrintReceipt={setReceiptOrderData}
                        onOpenLabFolder={setLabFolderOrder}
                        refreshTrigger={effectiveRefreshTrigger}
                      />
                    </OrderErrorBoundary>
                  );
                case "Clients":
                  if (!can("viewClients")) {
                    logger.warn("Access denied to Clients", {
                      userId: currentUser.id,
                      role: currentUser.role,
                    });
                    return (
                      <AccessDenied
                        permission="viewClients"
                        role={currentUser.role}
                        page="Clients"
                      />
                    );
                  }
                  return (
                    <FeatureErrorBoundary feature="Clients" severity="medium">
                      <Clients
                        currentUser={currentUser}
                        refreshTrigger={effectiveRefreshTrigger}
                      />
                    </FeatureErrorBoundary>
                  );
                case "Photographers":
                  if (!can("viewPhotographers")) {
                    logger.warn("Access denied to Photographers", {
                      userId: currentUser.id,
                      role: currentUser.role,
                    });
                    return (
                      <AccessDenied
                        permission="viewPhotographers"
                        role={currentUser.role}
                        page="Photographers"
                      />
                    );
                  }
                  return (
                    <FeatureErrorBoundary feature="Photographers" severity="medium">
                      <Photographers
                        currentUser={currentUser}
                        photographers={dashboardData?.photographers || []}
                        orders={dashboardData?.orders || []}
                        refreshData={refreshData}
                      />
                    </FeatureErrorBoundary>
                  );
                case "Settings":
                  if (!can("viewSettings")) {
                    logger.warn("Access denied to Settings", {
                      userId: currentUser.id,
                      role: currentUser.role,
                    });
                    return (
                      <AccessDenied
                        permission="viewSettings"
                        role={currentUser.role}
                        page="Settings"
                      />
                    );
                  }
                  return (
                    <SettingsErrorBoundary>
                      <SettingsPage
                        currentUser={currentUser}
                        onCurrentUserUpdate={() => refreshData()}
                        showToast={showToast}
                        features={features}
                        initialTab={viewParams?.tab as any}
                      />
                    </SettingsErrorBoundary>
                  );
                case "Growth":
                  if (!can("viewGrowth")) {
                    logger.warn("Access denied to Growth", {
                      userId: currentUser.id,
                      role: currentUser.role,
                    });
                    return (
                      <AccessDenied
                        permission="viewGrowth"
                        role={currentUser.role}
                        page="Growth"
                      />
                    );
                  }
                  return (
                    <FeatureErrorBoundary feature="Growth" severity="low">
                      <GrowthPage currentUser={currentUser} />
                    </FeatureErrorBoundary>
                  );

                case "LocalResortDashboard":
                  return (
                    <DashboardErrorBoundary>
                      <LocalResortDashboard />
                    </DashboardErrorBoundary>
                  );

                default:
                  return (
                    <DashboardErrorBoundary>
                      <Dashboard
                        localData={
                          dashboardData || {
                            orders: [],
                            photographers: [],
                            albums: [],
                          }
                        }
                        currentUser={currentUser}
                        onNavigate={handleNavigate}
                      />
                    </DashboardErrorBoundary>
                  );
              }
            })()}
          </div>
        </PageTransition>
      </Suspense>
    );
  };

  if (printOrderData)
    return (
      <Suspense fallback={<Spinner />}>
        <PrintLayout order={printOrderData} />
      </Suspense>
    );
  if (receiptOrderData)
    return (
      <Suspense fallback={<Spinner />}>
        <CustomerReceipt order={receiptOrderData} />
      </Suspense>
    );
  if (labFolderOrder)
    return (
      <Suspense fallback={<Spinner />}>
        <OrderManagementView
          order={labFolderOrder}
          onBack={() => setLabFolderOrder(null)}
          onUpdateOrder={(updated) => {
            refreshData();
            setLabFolderOrder(updated);
          }}
        />
      </Suspense>
    );

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-50/50 via-slate-50 to-purple-50/30 dark:bg-none dark:bg-slate-900 text-slate-800 dark:text-white font-sans flex flex-col md:flex-row text-sm sm:text-base relative overflow-hidden">
      {/* Decorative Orbs for Premium feel (Light Mode only) */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none dark:hidden animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/10 blur-[120px] rounded-full pointer-events-none dark:hidden" />
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Mobile Header */}
      <Header
        currentUser={currentUser}
        onMenuClick={() => setIsSidebarOpen(true)}
      />

      {/* Sidebar Overlay for Mobile */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"} no-print`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar Container */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 transform md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full"} ${isSidebarCollapsed ? "md:w-20" : "md:w-56 lg:w-64"} md:translate-x-0 no-print`}
      >
        <Sidebar
          currentView={currentView}
          setCurrentView={(view: View) => {
            handleNavigate(view);
            setIsSidebarOpen(false);
          }}
          onOpenAIIdeas={handleOpenAIIdeas}
          onSwitchUser={onSwitchUser}
          currentUser={currentUser}
          isOnline={isOnline}
          features={features}
          onCloseMobile={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
      </nav>

      {/* Main Content */}
      <main
        id="main-content"
        role="main"
        className="flex-1 md:h-screen md:overflow-y-auto custom-scrollbar focus:outline-none"
        tabIndex={-1}
      >
        {/* Notification Bar for Assistance Requests */}
        <div className="no-print">
          {assistanceRequests.length > 0 && onDismissAssistance && (
            <div className="sticky top-0 z-20 glass-panel border-b-0 rounded-none px-3 sm:px-4 md:px-6 py-2">
              <AssistanceNotificationBar
                assistanceRequests={assistanceRequests}
                onDismiss={onDismissAssistance}
              />
            </div>
          )}

          {/* Cloud Sync Status Indicator for Desktop (Mini) */}
          <div className="hidden md:flex absolute top-4 right-6 z-10 pointer-events-none">
            <div className="pointer-events-auto">
              <NetworkStatusIndicator compact />
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 pb-16 sm:pb-20 md:pb-8">
          {renderView()}
        </div>
      </main>

      {/* Global Search Overlay */}
      <GlobalSearch currentUser={currentUser} />

      {/* Auto-Updater Notification */}
      <UpdateNotification />

      <Suspense fallback={null}>
        <AIIdeasModal
          isOpen={isAIIdeasModalOpen}
          onClose={() => setAIIdeasModalOpen(false)}
        />
      </Suspense>
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

    </div>
  );
};

export default MainLayout;
