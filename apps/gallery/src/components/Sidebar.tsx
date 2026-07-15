import { logger } from '@clickflash/logger';
import React, { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { Logo } from "./common/Logo";
import { usePermissions } from "../hooks/usePermissions.ts";
import { Photographer, View, DestinationFeatures, Permission } from "../types.ts";

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onOpenAIIdeas: () => void;
  onSwitchUser: () => void;
  currentUser: Photographer;
  isOnline: boolean;
  features: DestinationFeatures;
  onCloseMobile?: () => void;
}

const NAV_ITEMS_CONFIG: Array<{ view: View; label: string; icon: React.ReactNode; permission: Permission }> = [
  {
    view: "Dashboard",
    label: "Dashboard",
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
    view: "Clients",
    label: "Clients",
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
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    permission: "viewOrders",
  },
  {
    view: "Products",
    label: "Products",
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
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    ),
    permission: "manageProducts",
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
  {
    view: "Bookings",
    label: "Bookings",
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
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    permission: "viewBookings",
  },
  {
    view: "Documentation",
    label: "Documentation",
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    permission: "viewDocumentation",
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
}> = ({ item, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded-xl w-full text-left transition-all duration-200 active:scale-95 ${
      isActive
        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
        : "text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
    }`}
  >
    {item.icon}
    <span className="font-medium text-sm">{item.label}</span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  onOpenAIIdeas,
  onSwitchUser,
  currentUser,
  isOnline,
  features,
  onCloseMobile,
}) => {
  const { can } = usePermissions(currentUser);
  const visibleNavItems = NAV_ITEMS_CONFIG.filter((item) =>
    can(item.permission),
  );
  const [logoUrl, setLogoUrl] = useState("/gallery/logo.png");
  const [deskName, setDeskName] = useState("MASTER STATION");

  useEffect(() => {
    // Load branding from local storage if available
    const saved = localStorage.getItem("clickflash_branding");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLogoUrl(parsed.logoUrl || "/gallery/logo.png");
        setDeskName(parsed.deskName || "MASTER STATION");
      } catch (e) {
        logger.error("Failed to parse branding", e);
      }
    }
  }, []);

  // Listen for logo changes from settings (both same-tab and cross-tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "masterPortalLogo") {
        try {
          const parsed = JSON.parse(e.newValue || "{}");
          setLogoUrl(parsed.logoUrl || "/gallery/logo.png");
        } catch (e) {
          logger.error(
            "Failed to update logo from storage event",
            e instanceof Error ? e : undefined,
          );
        }
      }
    };

    const handleLogoUpdate = (e: CustomEvent) => {
      setLogoUrl(e.detail.logoUrl || "https://i.imgur.com/3Y2j2s2.png");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(
      "masterPortalLogoUpdated",
      handleLogoUpdate as EventListener,
    );

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "masterPortalLogoUpdated",
        handleLogoUpdate as EventListener,
      );
    };
  }, []);

  return (
    <aside className="p-4 flex flex-col space-y-2 flex-1 overflow-y-auto h-full">
      <div className="flex items-center justify-between px-1 pb-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <Logo size="sm" />
          <div>
            <h1 className="font-black text-slate-900 dark:text-white leading-tight text-[13px] uppercase tracking-wider">
              ClickFlash
            </h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]">
              Master Portal
            </p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            title="Close Sidebar"
            className="md:hidden p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
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
        )}
      </div>

      <div className="flex items-center space-x-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-2">
        <img
          src={currentUser.avatarUrl}
          alt={currentUser.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="overflow-hidden">
          <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
            {currentUser.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {currentUser.role}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 py-2">
        {visibleNavItems.map((item) => (
          <NavItem
            key={item.view}
            item={item}
            isActive={currentView === item.view}
            onClick={() => setCurrentView(item.view as View)}
          />
        ))}
      </nav>

      <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
        {features.ai && (
          <button
            onClick={onOpenAIIdeas}
            disabled={!isOnline}
            title={
              !isOnline
                ? "AI features require an internet connection"
                : "Generate photoshoot ideas"
            }
            className="flex items-center space-x-3 px-4 py-3 rounded-xl w-full text-left transition-colors duration-200 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-500/10 disabled:text-slate-500"
          >
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
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span className="font-medium text-sm">AI Shoot Ideas</span>
          </button>
        )}
        <button
          onClick={onSwitchUser}
          className="flex items-center space-x-3 px-4 py-3 rounded-xl w-full text-left transition-colors duration-200 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
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
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="font-medium text-sm">Switch User</span>
        </button>

        <div
          className={`flex items-center justify-between px-4 py-2 rounded-xl text-xs font-semibold border ${isOnline ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"}`}
        >
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-amber-500"}`}
            ></span>
            <span>{isOnline ? "Online" : "Local Mode"}</span>
          </div>
        </div>

        <div className="flex justify-between items-center px-4 py-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Appearance
          </p>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
};
