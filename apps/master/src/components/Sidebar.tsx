import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import PasswordModal from "./common/PasswordModal";
import { CloudStatusIndicator } from "./common/CloudStatusIndicator";
import NetworkStatusIndicator from "./common/NetworkStatusIndicator";
import { RealtimeStatus } from "./common/RealtimeStatus";
import FleetStatusIndicator from "./common/FleetStatusIndicator";
import { usePermissions } from "../hooks/usePermissions.ts";
import { Photographer, View, DestinationFeatures } from "../types.ts";
import { pb } from "../services/pb.ts";
import { useSync } from "../context/SyncContext";
import { BarChart3 } from "lucide-react";
import DailyResortStatsModal from "./modals/DailyResortStatsModal";
import { logger } from '@/utils/logger';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onOpenAIIdeas: () => void;
  onSwitchUser: () => void;
  currentUser: Photographer;
  isOnline: boolean;
  features: DestinationFeatures;
  onCloseMobile?: () => void;
  onEnterKiosk?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const NAV_ITEMS_CONFIG = [
  {
    view: "Dashboard",
    label: "Dashboard",
    icon: (className?: string) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className || "h-4 w-4 sm:h-5 sm:w-5"}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
    permission: "viewDashboard",
  },
  {
    view: "Albums",
    label: "Albums",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h2"
        />
      </svg>
    ),
    permission: "viewAlbums",
  },
  {
    view: "Orders",
    label: "Orders",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    permission: "viewOrders",
  },
  {
    view: "PrintQueue",
    label: "Print Queue",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
    ),
    permission: "viewOrders",
  },
  {
    view: "Photographers",
    label: "Photographers",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    permission: "viewPhotographers",
  },

  // { view: 'MoneyTrash', label: 'Money Trash', icon: ... }, // Deprecated
  // { view: 'Marketing', label: 'Marketing', icon: ... }, // Deprecated
  {
    view: "Growth",
    label: "Growth",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
    permission: "viewGrowth",
  },

  {
    view: "LocalResortDashboard",
    label: "Resort BI",
    icon: (className?: string) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className || "h-4 w-4 sm:h-5 sm:w-5"}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    permission: "viewSettings",
  },

  {
    view: "Settings",
    label: "Settings",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    permission: "viewSettings",
  },
];

const NavItem: React.FC<{
  item: (typeof NAV_ITEMS_CONFIG)[0];
  isActive: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
}> = ({ item, isActive, onClick, isCollapsed }) => {
  const iconElement =
    typeof item.icon === "function"
      ? item.icon("h-4 w-4 sm:h-5 sm:w-5")
      : React.isValidElement(item.icon)
        ? React.cloneElement(item.icon as React.ReactElement<any>, {
            className: "h-4 w-4 sm:h-5 sm:w-5",
          })
        : item.icon;

  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.96 }}
      aria-current={isActive ? "page" : undefined}
      title={isCollapsed ? item.label : undefined}
      className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "space-x-3 px-4"} py-2.5 rounded-xl w-full text-left transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
        isActive
          ? "glass-button bg-gradient-to-r from-blue-600/20 to-purple-600/20 shadow-xl border-white/20 dark:border-white/10 text-white font-bold backdrop-blur-xl"
          : "text-slate-600 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/5"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="nav-bg"
          className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl -z-10 shadow-lg shadow-blue-500/20"
          initial={false}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div
        className={`transition-transform duration-500 ${isActive ? "scale-110" : "group-hover:scale-110"} flex-shrink-0`}
      >
        {iconElement}
      </div>
      {!isCollapsed && (
        <span
          className={`font-semibold text-xs sm:text-sm transition-colors flex-1 ${isActive ? "text-white" : ""}`}
        >
          {item.label}
        </span>
      )}
      {!isCollapsed && isActive && (
        <motion.div
          layoutId="active-indicator"
          className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] flex-shrink-0"
        />
      )}
    </motion.button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  onOpenAIIdeas,
  onSwitchUser,
  currentUser,
  isOnline,
  features,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { can } = usePermissions(currentUser);
  const { isDndMode: _isDndMode, setIsDndMode: _setIsDndMode } = useSync();
  const visibleNavItems = NAV_ITEMS_CONFIG.filter((item) =>
    can(item.permission as any),
  );
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isDailyStatsOpen, setIsDailyStatsOpen] = useState(false);
  const [_isSavingStats, setIsSavingStats] = useState(false);
  const [kioskClicks, setKioskClicks] = useState(0);
  const [lastKioskClick, setLastKioskClick] = useState(0);
  const isElectron = (window as any).electron;

  const handleSaveDailyStats = async (stats: {
    guests: number;
    departures: number;
    viewing_sessions: number;
  }) => {
    setIsSavingStats(true);
    try {
      const date = new Date().toISOString().split("T")[0];

      // Save operational stats
      await fetch("/api/resort-analytics/operational-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          guests: stats.guests,
          departures: stats.departures,
        }),
      });

      // Override viewing sessions if provided
      if (stats.viewing_sessions > 0) {
        // This could be a separate endpoint or handled by the same one
      }
    } catch (error) {
      logger.error("Failed to save daily stats:", error);
    } finally {
      setIsSavingStats(false);
      setIsDailyStatsOpen(false);
    }
  };

  const handleExitKiosk = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch (error) {
      logger.error("Failed to exit kiosk/fullscreen:", error);
    }
  };

  const verifyKioskExit = async (pin: string): Promise<boolean> => {
    if (isElectron && isElectron.ipcRenderer) {
      try {
        const res = await isElectron.ipcRenderer.invoke("kiosk:unlock", pin);
        if (!res.success) throw new Error(res.error || "Invalid PIN");
        return true;
      } catch (err: any) {
        throw new Error(err.message || "IPC validation failed");
      }
    }
    // Web fallback — validate via backend API
    const resp = await fetch("/api/auth/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (resp.ok) return true;
    throw new Error("Invalid PIN");
  };

  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        logger.error(
          `Error attempting to enable full-screen mode: ${err.message}`,
        );
      });
    } else {
      // Prompt for password before exiting fullscreen
      setIsExitModalOpen(true);
    }
  };

  const handleAvatarClick = () => {
    const now = Date.now();
    if (now - lastKioskClick > 1000) {
      // Reset if more than 1 second between clicks
      setKioskClicks(1);
    } else {
      const newClicks = kioskClicks + 1;
      setKioskClicks(newClicks);
      if (newClicks >= 5) {
        setIsExitModalOpen(true);
        setKioskClicks(0);
      }
    }
    setLastKioskClick(now);
  };

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? 80 : 256, // Approx standard Tailwind widths (20 vs 64)
      }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`relative z-20 flex flex-col h-full glass-panel border-r border-white/20 dark:border-white/5 shadow-2xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/80 ${isCollapsed ? "items-center px-2" : "px-4"}`}
    >
      <div className="flex flex-col h-full py-4 space-y-4 overflow-y-auto overflow-x-hidden">
        {/* Mobile Close Button */}
        {onCloseMobile && (
          <div className="md:hidden flex justify-end mb-1">
            <button
              onClick={onCloseMobile}
              title="Close Menu"
              className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all hover:scale-110 active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Collapse Toggle for Desktop */}
        {onToggleCollapse && (
          <div
            className={`hidden md:flex ${isCollapsed ? "justify-center" : "justify-end"} mb-2`}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-white/10 dark:hover:bg-white/5 rounded-md transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
              )}
            </motion.button>
          </div>
        )}

        <motion.div
          layout
          onClick={handleAvatarClick}
          className={`flex items-center cursor-pointer select-none ${isCollapsed ? "justify-center p-2" : "space-x-3 p-3"} glass-card border-none bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 transition-all rounded-xl`}
        >
          <div className="relative flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <img
              src={
                currentUser.avatarUrl
                  ? currentUser.avatarUrl.startsWith("http") ||
                    currentUser.avatarUrl.startsWith("data:")
                    ? currentUser.avatarUrl
                    : `${pb.baseUrl}${currentUser.avatarUrl.startsWith("/") ? "" : "/"}${currentUser.avatarUrl}`
                  : "https://i.imgur.com/3Y2j2s2.png"
              }
              alt={currentUser.name}
              className={`${isCollapsed ? "w-10 h-10" : "w-12 h-12"} relative rounded-xl object-cover ring-2 ring-white/50 dark:ring-white/10 shadow-2xl`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== "https://i.imgur.com/3Y2j2s2.png") {
                  target.src = "https://i.imgur.com/3Y2j2s2.png";
                }
              }}
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 shadow-lg z-10"
            />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="overflow-hidden flex-1 min-w-0"
              >
                <p className="font-bold text-slate-800 dark:text-white text-sm truncate font-heading">
                  {currentUser.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium uppercase tracking-wide opacity-80">
                  {currentUser.role}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <nav
          className="flex-1 space-y-1 py-2 w-full"
          aria-label="Navigation menu"
        >
          {visibleNavItems.map((item) => (
            <NavItem
              key={item.view}
              item={item}
              isActive={currentView === item.view}
              onClick={() => setCurrentView(item.view as View)}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>

        <div
          className={`space-y-2 pt-4 border-t border-slate-200/20 dark:border-white/10 w-full`}
        >
          {features.ai && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenAIIdeas}
              disabled={!isOnline}
              title={
                !isOnline
                  ? "AI features require an internet connection"
                  : "Generate photoshoot ideas"
              }
              className={`group flex items-center ${isCollapsed ? "justify-center px-0" : "space-x-2.5 px-4"} py-2.5 rounded-xl w-full text-left transition-all glass-button bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200/30 text-purple-700 dark:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 transition-transform group-hover:rotate-180 duration-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {!isCollapsed && (
                <span className="font-semibold text-sm">AI Ideas</span>
              )}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsDailyStatsOpen(true)}
            className={`group flex items-center ${isCollapsed ? "justify-center px-0" : "space-x-2.5 px-4"} py-2.5 rounded-xl w-full text-left transition-all glass-button bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border-blue-200/30 text-blue-700 dark:text-blue-300`}
            title={
              isCollapsed
                ? "Daily Resort Stats"
                : "Log Daily Operational Metrics"
            }
          >
            <BarChart3 className="h-5 w-5" />
            {!isCollapsed && (
              <span className="font-semibold text-sm">Daily Stats</span>
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSwitchUser}
            className={`flex items-center ${isCollapsed ? "justify-center px-0" : "space-x-2.5 px-4"} py-2.5 rounded-xl w-full text-left transition-all text-slate-600 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/5 border border-transparent hover:border-white/10`}
            title={isCollapsed ? "Switch User" : undefined}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {!isCollapsed && (
              <span className="font-semibold text-sm">Switch User</span>
            )}
          </motion.button>

          <div
            className={`flex flex-col gap-2 ${isCollapsed ? "items-center" : ""}`}
          >
            {!isCollapsed && <NetworkStatusIndicator />}
            {!isCollapsed && <RealtimeStatus />}
            {!isCollapsed && <FleetStatusIndicator />}
            <div
              className={`flex-shrink-0 flex items-center justify-center p-2 rounded-xl glass-card bg-white/40 dark:bg-slate-800/40 border-slate-200/50 dark:border-white/5 ${isCollapsed ? "w-full" : ""}`}
            >
              <CloudStatusIndicator size={isCollapsed ? "small" : "normal"} />
            </div>
          </div>

          <div
            className={`flex ${isCollapsed ? "flex-col gap-2 justify-center" : "justify-between"} items-center px-3 py-2.5 glass-card bg-white/40 dark:bg-slate-800/40 rounded-xl border-slate-200/50 dark:border-white/5`}
          >
            {!isCollapsed && (
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Appearance
              </p>
            )}
            <ThemeToggle />
          </div>

          {/* Fullscreen Toggle - Only show when NOT in fullscreen (Kiosk mode) */}
          {!isElectron && !isFullscreen && !isCollapsed && (
            <button
              onClick={toggleFullscreen}
              className={`flex items-center justify-center space-x-2 w-full px-3 py-2 rounded-lg transition-colors border mt-2 ${
                isFullscreen
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  : "bg-white hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
              aria-label="Enter Kiosk Mode"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              <span className="text-xs font-semibold">Fullscreen</span>
            </button>
          )}

          <PasswordModal
            isOpen={isExitModalOpen}
            onClose={() => setIsExitModalOpen(false)}
            onSuccess={handleExitKiosk}
            verifyPassword={verifyKioskExit}
            title="Admin Bypass: Exit Kiosk"
            message="Enter the 6-digit Admin PIN to exit the Kiosk OS protection."
          />

          <DailyResortStatsModal
            isOpen={isDailyStatsOpen}
            onClose={() => setIsDailyStatsOpen(false)}
            onSave={handleSaveDailyStats}
          />
        </div>
      </div>
    </motion.aside>
  );
};
