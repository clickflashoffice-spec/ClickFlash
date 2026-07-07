import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { AssistanceRequest } from "../types/shared";
import { OrderItem } from "../types";
import { webSocketService } from "../services/webSocketService";
import {
  dataVersionManager,
  CollectionName,
} from "../services/dataVersionManager";
import { apiService } from "../services/apiService";
import { pb, isCloudMode } from "../services/pb";
import { logger } from "../utils/logger";
import { useAuth } from "./AuthContext";
import { cloudSyncService } from "../services/cloudSyncService";

import { useToast } from "./ToastContext";

export interface PrintRequest {
  orderId: string;
  kioskId: string;
  customerName?: string;
  items: OrderItem[];
  timestamp: Date;
}

interface SyncContextType {
  dataVersion: number;
  assistanceRequests: AssistanceRequest[];
  printRequests: PrintRequest[];
  dismissPrintRequest: (orderId: string) => void;
  triggerDataRefresh: (collection?: CollectionName) => void;
  dismissAssistance: (id: string) => Promise<void>;
  isOnline: boolean;
  isDndMode: boolean;
  setIsDndMode: (val: boolean) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const [dataVersion, setDataVersion] = useState(0);
  const [assistanceRequests, setAssistanceRequests] = useState<
    AssistanceRequest[]
  >([]);
  const [printRequests, setPrintRequests] = useState<PrintRequest[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDndMode, setDndModeState] = useState(false);
  const isDndModeRef = useRef(false);

  const setIsDndMode = useCallback((val: boolean) => {
    isDndModeRef.current = val;
    setDndModeState(val);
  }, []);

  const dismissPrintRequest = useCallback((orderId: string) => {
    setPrintRequests((prev) => prev.filter((r) => r.orderId !== orderId));
  }, []);

  const isSyncingRef = useRef(false);
  const lastRefreshRef = useRef<Record<string, number>>({});

  // Network Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Initial Cloud Sync
  useEffect(() => {
    if (isCloudMode) {
      cloudSyncService.performBackgroundSync().catch((err) => {
        logger.warn("[App] Initial cloud sync failed", err);
      });
    }
  }, []);

  // Fetch Assistance Requests
  const fetchAssistanceRequests = useCallback(async () => {
    try {
      const response = await pb.request("/api/assistance");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAssistanceRequests(
            data.data.map((r: { createdAt: string | number | Date }) => ({
              ...r,
              timestamp: new Date(r.createdAt),
            })),
          );
        }
      }
    } catch (e) {
      logger.error(
        "Failed to fetch assistance requests",
        e instanceof Error ? e : undefined,
      );
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAssistanceRequests();
    }
  }, [isAuthenticated, fetchAssistanceRequests]);

  // Kiosk Sync Logic
  const syncKioskData = useCallback(async () => {
    if (isCloudMode || isSyncingRef.current) return;

    isSyncingRef.current = true;
    try {
      const offlineOrders = await webSocketService.getOfflineOrders();
      if (offlineOrders && offlineOrders.length > 0) {
        let syncedCount = 0;
        const syncedOrderIds: string[] = [];
        for (const order of offlineOrders) {
          try {
            await apiService.createOrder(order);
            syncedCount++;
            syncedOrderIds.push(order.id);
          } catch (err: unknown) {
            const errorMessage = (err as Error).message || String(err);
            if (errorMessage.includes("duplicate") || errorMessage.includes("already exists")) {
              logger.warn("Order already exists on server, considering it synced (Server Wins)", err);
              syncedOrderIds.push(order.id);
            } else {
              logger.error("Failed to sync order", err);
            }
          }
        }
        if (syncedOrderIds.length > 0) {
          await webSocketService.removeOfflineOrders(syncedOrderIds);
          if (syncedCount > 0) {
            showToast(`Received ${syncedCount} new order(s) from Kiosk!`);
            setDataVersion((v) => v + 1);
          }
        }
      }
    } catch {
      // Network error — UI already cleared
    } finally {
      isSyncingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCloudMode, showToast, setDataVersion]); // webSocketService, apiService, logger are stable

  // Data Refresh Logic
  const triggerDataRefresh = useCallback(
    (collection?: CollectionName) => {
      const collectionToUpdate = collection || "all";
      const now = Date.now();
      const REFRESH_THROTTLE_MS = 2000;

      if (collectionToUpdate !== "all") {
        const lastRefresh = lastRefreshRef.current[collectionToUpdate] || 0;
        if (now - lastRefresh < REFRESH_THROTTLE_MS) {
          return;
        }
        lastRefreshRef.current[collectionToUpdate] = now;
      }

      if (
        collectionToUpdate === "kiosks" ||
        collectionToUpdate === "kiosk_sessions"
      ) {
        return;
      }

      dataVersionManager.incrementVersion(collectionToUpdate, "websocket");
      setDataVersion(dataVersionManager.getGlobalVersion());

      // Trigger kiosk sync on refresh
      if (!isCloudMode) {
        syncKioskData();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCloudMode, syncKioskData],
  );

  // WebSocket & SSE Setup
  useEffect(() => {
    if (isAuthenticated && !isCloudMode) {
      syncKioskData();
      setDataVersion(dataVersionManager.getGlobalVersion());

      // SSE
      let cleanupSSE: (() => void) | undefined;
      let isSubscribed = true;

      pb.collection("system")
        .subscribe("*", (e: { collection?: string }) => {
          if (!isSubscribed) return;
          if (e.collection) {
            triggerDataRefresh(e.collection as CollectionName);
          }
        })
        .then((unsub) => {
          if (!isSubscribed) unsub();
          else cleanupSSE = unsub;
        });

      // WebSocket
      webSocketService.connect(
        { type: "master" },
        (data: any) => {
          // Type casting to any here is safest for the bridge logic
          if (data.type === "NEW_ORDER_NOTIFICATION")
            triggerDataRefresh("orders");
          if (data.type === "ALBUM_UPDATED") triggerDataRefresh("albums");
          if (data.type === "PHOTO_UPDATED") triggerDataRefresh("photos");
          if (data.type === "ORDER_UPDATED") triggerDataRefresh("orders");
          if (data.type === "USER_UPDATED") triggerDataRefresh("users");

          if (data.type === "ASSISTANCE_REQUEST") {
            const payload = data.payload || {};
            const message = payload.message || "Customer needs assistance";
            const kioskId = payload.kioskId || "Unknown Kiosk";

            setAssistanceRequests((prev) => {
              const isDuplicate = prev.some(
                (r) => r.kioskId === kioskId && r.message === message,
              );

              if (!isDuplicate && !isDndModeRef.current) {
                setTimeout(() => showToast(`⚠️ ${message} (${kioskId})`), 0);
              }

              if (isDuplicate) {
                return prev.map((r) =>
                  r.kioskId === kioskId && r.message === message
                    ? { ...r, timestamp: new Date() }
                    : r,
                );
              }

              const newRequest: AssistanceRequest = {
                id: `${kioskId}-${Date.now()}`,
                kioskId,
                message,
                timestamp: new Date(),
              };
              return [...prev, newRequest];
            });
          }
          
          if (data.type === "PRINT_REQUESTED") {
            const payload = data.payload || {};
            setPrintRequests((prev) => {
              // Avoid duplicates
              if (prev.some((r) => r.orderId === payload.orderId)) {
                return prev;
              }
              showToast(`🖨️ New print request from ${payload.customerName || 'Customer'}`);
              return [...prev, {
                orderId: payload.orderId,
                kioskId: payload.kioskId,
                customerName: payload.customerName,
                items: payload.items || [],
                timestamp: new Date()
              }];
            });
          }
        },
        (status) => {
          if (status === "Connected") triggerDataRefresh();
        },
        undefined,
        triggerDataRefresh,
      );

      return () => {
        isSubscribed = false;
        webSocketService.disconnect();
        if (cleanupSSE) cleanupSSE();
      };
    }
  }, [isAuthenticated, syncKioskData, showToast, triggerDataRefresh]);

  const dismissAssistance = async (id: string) => {
    try {
      const response = await pb.request(`/api/assistance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", resolvedBy: user?.id }),
      });

      if (response.ok) {
        setAssistanceRequests((prev) => prev.filter((req) => req.id !== id));
      } else {
        showToast("Error: Could not resolve request");
      }
    } catch (e) {
      showToast("Network error while resolving request");
    }
  };

  return (
    <SyncContext.Provider
      value={{
        dataVersion,
        assistanceRequests,
        printRequests,
        dismissPrintRequest,
        triggerDataRefresh,
        dismissAssistance,
        isOnline,
        isDndMode,
        setIsDndMode,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
};
