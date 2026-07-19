import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  Suspense,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Order,
  Photographer,
  Album,
  View,
  SystemHealthStats,
} from "../types.ts";
import { useCurrency } from "./CurrencyContext";
import PageHeader from "./common/PageHeader";
import { logger } from "../utils/logger";
import { dashboardService } from "../services/api/dashboardService";
import { useQueryClient, QueryErrorResetBoundary } from "@tanstack/react-query";
import { orderKeys } from "../hooks/useOrders";
import AnalyticsView from "./AnalyticsView";
import { ErrorBoundary } from "./common/ErrorBoundary";
import { DashboardViewportSkeleton } from "./dashboard/StatCard";

// Lazy load widgets for better performance
const RecentOrdersWidget = React.lazy(
  () => import("./dashboard/widgets/RecentOrdersWidget"),
);
const TopPhotographersWidget = React.lazy(
  () => import("./dashboard/widgets/TopPhotographersWidget"),
);
const SalesChartWidget = React.lazy(
  () => import("./dashboard/widgets/SalesChartWidget"),
);
const TopAlbumsWidget = React.lazy(
  () => import("./dashboard/widgets/TopAlbumsWidget"),
);
const ProductMixWidget = React.lazy(
  () => import("./dashboard/widgets/ProductMixWidget"),
);
const CloudHealthWidget = React.lazy(() =>
  import("./dashboard/widgets/CloudHealthWidget").then((module) => ({
    default: module.CloudHealthWidget,
  })),
);
const TrashRetentionWidget = React.lazy(() =>
  import("./dashboard/widgets/TrashRetentionWidget").then((module) => ({
    default: module.TrashRetentionWidget,
  })),
);

// New dashboard widgets (Phase 3 — previously empty placeholder files)
const CalendarWidget   = React.lazy(() => import("./dashboard/CalendarWidget"));
const ChartPlaceholder = React.lazy(() => import("./dashboard/ChartPlaceholder"));
const RatingWidget     = React.lazy(() => import("./dashboard/RatingWidget"));
const Toolbar          = React.lazy(() => import("./dashboard/Toolbar"));
const UserStatsWidget  = React.lazy(() => import("./dashboard/UserStatsWidget"));

// ============================================================================
// Types & Interfaces
// ============================================================================

interface DashboardProps {
  localData: {
    orders: Order[];
    photographers: Photographer[];
    albums: Album[];
  };
  currentUser: Photographer;
  onNavigate: (view: View, params?: unknown) => void;
}

type TimeFilter = "Today" | "7D" | "30D";

interface FilterOption {
  id: TimeFilter;
  label: string;
}

interface KpiData {
  todaysRevenue: number;
  todaysPhotos: number;
  albumsToProcess: number;
  pendingOrders: number;
  ptpActive?: number;
  ptpSpeed?: string;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
  color?: "blue" | "purple" | "emerald" | "amber" | "rose" | "cyan";
  subtitle?: string;
  onClick?: () => void;
  isLoading?: boolean;
}

// ... skipped down to StatCard component ...

const StatCard: React.FC<StatCardProps> = React.memo(
  ({ title, value, icon, className = "", color = "blue", subtitle, onClick }) => {
    // Generate color-specific classes using useMemo so they evaluate correctly
    const colorClasses = useMemo(() => {
      const colors = {
        blue: "bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400",
        purple: "bg-purple-500/10 dark:bg-purple-400/10 text-purple-600 dark:text-purple-400",
        emerald: "bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
        amber: "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400",
        rose: "bg-rose-500/10 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400",
        cyan: "bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-400",
      };
      return colors[color] || colors.blue;
    }, [color]);

    return (
      <motion.div
        variants={{
          hidden: { opacity: 0, scale: 0.95, y: 20 },
          show: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: "spring", stiffness: 100 },
          },
        }}
        whileHover={{
          scale: 1.04,
          y: -6,
          boxShadow: "0 25px 50px -12px rgba(31, 38, 135, 0.15)",
        }}
        whileTap={{ scale: 0.98 }}
        className={`group relative glass-card p-4 sm:p-5 flex items-start space-x-3 sm:space-x-4 overflow-visible transition-all duration-300 ${onClick ? "cursor-pointer border-blue-200/40 dark:border-blue-700/40 hover:border-blue-400/50" : ""} ${className}`}
        onClick={onClick}
        {...(onClick ? { role: "button", tabIndex: 0 } : {})}
        onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      >
        {/* Subtle internal shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-2xl" />

        <div className={`relative p-2.5 sm:p-3 rounded-2xl shrink-0 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${colorClasses}`}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<any>, {
                className: "h-5 w-5 sm:h-6 sm:w-6",
              })
            : icon}
        </div>
        <div className="relative flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 sm:mb-1.5 uppercase tracking-[0.1em] opacity-70">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-850 dark:text-white leading-tight tracking-tight font-heading">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1 font-mono font-bold tracking-tight bg-cyan-500/10 px-2 py-0.5 rounded w-fit">{subtitle}</p>
          )}
        </div>
      </motion.div>
    );
  }
);

StatCard.displayName = "StatCard";

// ============================================================================
// Utility Functions
// ============================================================================

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

const formatDateDisplay = (): string => {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

const getTodayString = (): string => {
  return new Date().toISOString().split("T")[0];
};

const convertToCSV = (data: Order[] | Photographer[] | Album[]): string => {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = (row as unknown as Record<string, unknown>)[header];
      const escaped =
        typeof value === "string"
          ? value.replace(/"/g, '""')
          : String(value ?? "");
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
};

const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  try {
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    logger.info("CSV exported successfully", {
      filename,
      rows: csvContent.split("\n").length - 1,
    });
  } catch (error) {
    logger.error("Failed to download CSV:", error as Error);
    throw error;
  } finally {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// ============================================================================
// Dashboard Component
// ============================================================================

const DashboardComponent: React.FC<DashboardProps> = ({
  localData,
  currentUser,
  onNavigate,
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7D");
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">(
    "overview",
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealthStats | null>(
    null,
  );
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();

  // Ensure we have data with proper defaults
  const safeData = useMemo(
    () => ({
      orders: localData?.orders || [],
      photographers: localData?.photographers || [],
      albums: localData?.albums || [],
    }),
    [localData],
  );

  const fetchSystemHealth = useCallback(async () => {
    setIsLoadingHealth(true);
    try {
      const data = await dashboardService.getSystemHealth();
      setSystemHealth(data);
    } catch (error) {
      logger.error("Failed to fetch system health", error as Error);
    } finally {
      setIsLoadingHealth(false);
    }
  }, []);

  // Perform initial fetch of system health
  useEffect(() => {
    fetchSystemHealth();
    // Poll every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchSystemHealth]);

  // Memoized filter options
  const filterOptions: FilterOption[] = useMemo(
    () => [
      { id: "Today", label: "Today" },
      { id: "7D", label: "7 Days" },
      { id: "30D", label: "30 Days" },
    ],
    [],
  );

  // Calculate KPI data
  const kpiData: KpiData = useMemo(() => {
    const todayString = getTodayString();

    try {
      const todaysOrders = safeData.orders.filter(
        (order) => order.date === todayString && order.status === "Completed",
      );
      const todaysRevenue = todaysOrders.reduce(
        (sum, order) => sum + order.total,
        0,
      );

      const todaysAlbums = safeData.albums.filter(
        (album) => album.date === todayString,
      );
      const todaysPhotos = todaysAlbums.reduce(
        (sum, album) => sum + (album.photos?.length || 0),
        0,
      );

      const albumsToProcess = safeData.albums.filter(
        (album) => album.status !== "Finalized" && album.status !== "Archived",
      ).length;

      return {
        todaysRevenue,
        todaysPhotos,
        albumsToProcess,
        pendingOrders: safeData.orders.filter(
          (order) => order.status === "Pending",
        ).length,
        ptpActive: 2,
        ptpSpeed: "145 MB/s",
      };
    } catch (error) {
      logger.error("Error calculating KPI data:", error as Error);
      return {
        todaysRevenue: 0,
        todaysPhotos: 0,
        albumsToProcess: 0,
        pendingOrders: 0,
        ptpActive: 0,
        ptpSpeed: "0 MB/s",
      };
    }
  }, [safeData.orders, safeData.albums]);

  // Handle refresh action
  const handleRefresh = useCallback(async (): Promise<void> => {
    logger.info("Dashboard refresh initiated");
    setIsRefreshing(true);

    try {
      await fetchSystemHealth();
      // Simulate refresh delay for perceived performance
      await new Promise((resolve) => setTimeout(resolve, 500));
      logger.info("Dashboard refresh completed");
    } catch (error) {
      logger.error("Dashboard refresh failed:", error as Error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchSystemHealth]);

  // Handle export to CSV
  const handleExportCSV = useCallback((): void => {
    try {
      logger.info("Exporting dashboard data to CSV", {
        ordersCount: safeData.orders.length,
        timeFilter,
      });

      const csvContent = convertToCSV(safeData.orders);
      const timestamp = new Date().toISOString().split("T")[0];
      downloadCSV(
        csvContent,
        `orders-${timestamp}-${timeFilter.toLowerCase()}.csv`,
      );
    } catch (error) {
      logger.error("Failed to export CSV:", error as Error);
    }
  }, [safeData.orders, timeFilter]);

  // Handle time filter change
  const handleTimeFilterChange = useCallback(
    (filterId: TimeFilter): void => {
      logger.debug("Time filter changed", { from: timeFilter, to: filterId });
      setTimeFilter(filterId);
    },
    [timeFilter],
  );

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: "overview" | "analytics"): void => {
      logger.debug("Tab changed", { tab });

      // Rule: Proactive Query Cancellation (Phase 81 Fix)
      if (tab === "analytics") {
        queryClient.cancelQueries({ queryKey: orderKeys.all });
      }

      setActiveTab(tab);
    },
    [queryClient],
  );

  // Memoized header components
  const headerTitle = useMemo(
    () => (
      <>
        {getGreeting()},{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 animate-gradient">
          {currentUser.name.split(" ")[0]}
        </span>
      </>
    ),
    [currentUser.name],
  );

  const headerSubtitle = useMemo(
    () => (
      <div className="flex items-center text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium sm:font-semibold">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-blue-500 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        {formatDateDisplay()}
      </div>
    ),
    [],
  );

  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2 sm:gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center min-h-[48px] gap-2 px-6 glass-button hover:bg-white/10 dark:hover:bg-white/5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <motion.svg
            animate={{ rotate: isRefreshing ? 360 : 0 }}
            transition={{
              repeat: isRefreshing ? Infinity : 0,
              duration: 1,
              ease: "linear",
            }}
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 sm:h-5 sm:w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </motion.svg>
          <span className="hidden sm:inline">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExportCSV}
          className="flex items-center justify-center min-h-[48px] gap-2 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-md shadow-cyan-500/20"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 sm:h-5 sm:w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4 4m4 4V4"
            />
          </svg>
          <span className="hidden sm:inline">Export CSV</span>
        </motion.button>

        <div className="flex items-center space-x-1 glass-card p-1 sm:p-1.5 border-white/20">
          {filterOptions.map((option) => (
            <motion.button
              key={option.id}
              onClick={() => handleTimeFilterChange(option.id)}
              className={`px-4 min-h-[48px] flex items-center justify-center rounded-xl font-bold text-sm transition-colors relative z-10 ${
                timeFilter === option.id
                  ? "text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white/10"
              }`}
            >
              {timeFilter === option.id && (
                <motion.div
                  layoutId="filter-indicator"
                  className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl -z-10"
                />
              )}
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>
    ),
    [
      isRefreshing,
      timeFilter,
      filterOptions,
      handleRefresh,
      handleExportCSV,
      handleTimeFilterChange,
    ],
  );

  return (
    <ErrorBoundary>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.1 } },
        }}
        className="space-y-4 sm:space-y-6 md:space-y-8 pb-8"
      >
        <PageHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          actions={headerActions}
          className="pb-2"
        />

        <motion.div
          variants={{
            hidden: { opacity: 0, x: -20 },
            show: { opacity: 1, x: 0 },
          }}
          className="flex items-center space-x-2 glass-card p-1.5 w-fit border-white/20"
        >
          <button
            onClick={() => handleTabChange("overview")}
            className={`px-6 min-h-[48px] rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 relative z-10 ${
              activeTab === "overview"
                ? "text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/10"
            }`}
          >
            {activeTab === "overview" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl -z-10"
              />
            )}
            Overview
          </button>
          <button
            onClick={() => handleTabChange("analytics")}
            className={`px-6 min-h-[48px] rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 relative z-10 ${
              activeTab === "analytics"
                ? "text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/10"
            }`}
          >
            {activeTab === "analytics" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl -z-10"
              />
            )}
            Analytics
          </button>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { delay: 0.1 } },
          }}
          className="relative min-h-[400px]"
        >
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary onReset={reset}>
                <Suspense fallback={<DashboardViewportSkeleton />}>
                  <AnimatePresence mode="wait">
                    {activeTab === "overview" ? (
                      <motion.div
                        key="overview"
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0, y: -10 }}
                        variants={{
                          hidden: { opacity: 0 },
                          show: {
                            opacity: 1,
                            y: 0,
                            transition: {
                              duration: 0.3,
                              staggerChildren: 0.08,
                              delayChildren: 0.1,
                            },
                          },
                        }}
                        className="space-y-8"
                      >
                        {/* Quick-action toolbar */}
                        <Toolbar onNavigate={onNavigate} />

                        <motion.div
                          variants={{
                            hidden: { opacity: 0 },
                            show: {
                              opacity: 1,
                              transition: { staggerChildren: 0.05 },
                            },
                          }}
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6"
                        >
                          <StatCard
                            title="Today's Revenue"
                            value={formatCurrency(kpiData.todaysRevenue)}
                            icon={
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
                              </svg>
                            }
                            color="blue"
                          />
                          <StatCard
                            title="Photos Created"
                            value={kpiData.todaysPhotos.toLocaleString()}
                            icon={
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            }
                            color="purple"
                          />
                          <StatCard
                            title="Albums to Process"
                            value={kpiData.albumsToProcess.toLocaleString()}
                            icon={
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9l-2-2H5a2 2 0 01-2 2v10a2 2 0 012 2z" />
                              </svg>
                            }
                            color="emerald"
                            onClick={() => onNavigate("Albums")}
                          />
                          <StatCard
                            title="Pending Orders"
                            value={kpiData.pendingOrders.toLocaleString()}
                            icon={
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            }
                            color="amber"
                            onClick={() => onNavigate("Orders")}
                          />
                          <StatCard
                            title="PTP Tether"
                            value={`${kpiData.ptpActive} Active`}
                            icon={
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            }
                            color="cyan"
                            subtitle={kpiData.ptpSpeed}
                          />
                        </motion.div>

                        <motion.div
                          variants={{
                            hidden: { opacity: 0, y: 30 },
                            show: {
                              opacity: 1,
                              y: 0,
                              transition: { type: "spring", damping: 25 },
                            },
                          }}
                          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                        >
                          <SalesChartWidget orders={safeData.orders} />
                          <RecentOrdersWidget
                            orders={safeData.orders}
                            onOrderClick={(id) => onNavigate("Orders", { id })}
                          />
                        </motion.div>

                        <motion.div
                          variants={{
                            hidden: { opacity: 0, scale: 0.95 },
                            show: {
                              opacity: 1,
                              scale: 1,
                              transition: { type: "spring", damping: 20 },
                            },
                          }}
                          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                        >
                          <div className="lg:col-span-1 space-y-6">
                            <CloudHealthWidget
                              stats={systemHealth}
                              isLoading={isLoadingHealth}
                              onRefresh={fetchSystemHealth}
                            />
                            <TrashRetentionWidget
                              stats={systemHealth}
                              onChangeView={(view) => onNavigate(view as View)}
                            />
                          </div>
                          <div className="lg:col-span-2">
                            <TopPhotographersWidget
                              photographers={safeData.photographers}
                              orders={safeData.orders}
                            />
                          </div>
                        </motion.div>

                        <motion.div
                          variants={{
                            hidden: { opacity: 0, y: 20 },
                            show: {
                              opacity: 1,
                              y: 0,
                              transition: { duration: 0.5, delay: 0.1 },
                            },
                          }}
                          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                        >
                          <TopAlbumsWidget
                            albums={safeData.albums}
                            orders={safeData.orders}
                          />
                          <ProductMixWidget orders={safeData.orders} />
                        </motion.div>

                        {/* Phase 3: New widgets row */}
                        <motion.div
                          variants={{
                            hidden: { opacity: 0, y: 20 },
                            show: {
                              opacity: 1,
                              y: 0,
                              transition: { duration: 0.5, delay: 0.15 },
                            },
                          }}
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                        >
                          <CalendarWidget />
                          <RatingWidget orders={safeData.orders} />
                          <ChartPlaceholder orders={safeData.orders} />
                          <UserStatsWidget
                            photographers={safeData.photographers}
                            orders={safeData.orders}
                            albums={safeData.albums}
                          />
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="analytics"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <AnalyticsView />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </motion.div>
      </motion.div>
    </ErrorBoundary>
  );
};

// Memoize Dashboard to prevent unnecessary re-renders
const Dashboard = memo(DashboardComponent, (prevProps, nextProps) => {
  // Only re-render if localData reference changes
  return prevProps.localData === nextProps.localData &&
         prevProps.currentUser?.id === nextProps.currentUser?.id;
});

Dashboard.displayName = "Dashboard";

export default Dashboard;
