import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ManagementView, ManagementContext as ManagementContextType } from "../constants";

// ============================================================================
// ManagementContext — Centralized navigation & sync state
// Eliminates prop drilling of currentView, selectedContext, syncStatus
// across all 12 page components.
// ============================================================================

interface SyncStatus {
  lastPulse: number;
  onlineCount: number;
  status: "initializing" | "syncing" | "online" | "warning";
}

interface ManagementContextValue {
  // Navigation
  currentView: ManagementView;
  setCurrentView: (view: ManagementView) => void;

  // Scope context (global | hotel ID)
  selectedContext: ManagementContextType;
  setSelectedContext: (ctx: ManagementContextType) => void;

  // Station drill-down
  selectedStationId: string | null;
  setSelectedStationId: (id: string | null) => void;

  // Sync pulse state
  syncStatus: SyncStatus;
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStatus>>;

  // Command bar
  isCommandBarOpen: boolean;
  setIsCommandBarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ManagementCtx = createContext<ManagementContextValue | null>(null);

export const ManagementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentViewRaw] = useState<ManagementView>("executive_dashboard");
  const [selectedContext, setSelectedContext] = useState<ManagementContextType>("global");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastPulse: Date.now(),
    onlineCount: 0,
    status: "initializing",
  });
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

  const setCurrentView = useCallback((view: ManagementView) => {
    setCurrentViewRaw(view);
  }, []);

  return (
    <ManagementCtx.Provider
      value={{
        currentView,
        setCurrentView,
        selectedContext,
        setSelectedContext,
        selectedStationId,
        setSelectedStationId,
        syncStatus,
        setSyncStatus,
        isCommandBarOpen,
        setIsCommandBarOpen,
      }}
    >
      {children}
    </ManagementCtx.Provider>
  );
};

export const useManagement = (): ManagementContextValue => {
  const ctx = useContext(ManagementCtx);
  if (!ctx) throw new Error("useManagement must be used inside ManagementProvider");
  return ctx;
};
