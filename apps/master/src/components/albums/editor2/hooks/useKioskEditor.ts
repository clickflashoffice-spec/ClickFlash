import { useState, useCallback, useMemo } from "react";
import { kioskService } from "@/services/api/kioskService";
import { logger } from "@/utils/logger";

interface UseKioskEditorProps {
  albumId: string;
  showToast: (message: string) => void;
}

export function useKioskEditor({ albumId, showToast }: UseKioskEditorProps) {
  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false);
  const [availableKiosks, setAvailableKiosks] = useState<any[]>([]);
  const [selectedKioskIds, setSelectedKioskIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSendingToKiosk, setIsSendingToKiosk] = useState(false);

  const handleOpenKioskModal = useCallback(async () => {
    try {
      const kiosks = await kioskService.getKiosks();
      setAvailableKiosks(kiosks);
      setIsKioskModalOpen(true);
    } catch (error) {
      logger.error("Failed to load kiosks", error);
      showToast("Failed to load kiosks");
    }
  }, [showToast]);

  const handleToggleKiosk = useCallback((id: string) => {
    setSelectedKioskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleKioskConfirm = useCallback(async () => {
    if (!selectedKioskIds.size || !albumId) return;

    setIsSendingToKiosk(true);
    showToast(`Enqueuing transfer to ${selectedKioskIds.size} kiosk(s)...`);

    try {
      const kioskIds = Array.from(selectedKioskIds);
      // P5: Parallel enqueuing is fast because backend only creates DB records
      const results = await Promise.allSettled(
        kioskIds.map(async (kId) => {
          const kiosk = availableKiosks.find((k) => k.id === kId);
          const name = kiosk?.name || kId;
          try {
            const res = await kioskService.sendAlbumToKiosk(albumId, kId);
            return {
              id: kId,
              name,
              success: res.success,
              message: res.message,
            };
          } catch (err) {
            return { id: kId, name, success: false, error: err };
          }
        }),
      );

      const successes: any[] = [];
      const failures: any[] = [];

      results.forEach((res) => {
        if (res.status === "fulfilled") {
          if (res.value.success) successes.push(res.value);
          else failures.push(res.value);
        } else {
          // This case is unlikely due to inner try/catch but kept for safety
          failures.push({ id: "unknown", success: false });
        }
      });

      if (successes.length > 0) {
        if (failures.length === 0) {
          showToast(
            `✓ Background transfer started for ${successes.length} kiosk(s)`,
          );
          setIsKioskModalOpen(false);
          setSelectedKioskIds(new Set());
        } else {
          showToast(
            `Started ${successes.length} transfers, failed to enqueue ${failures.length}`,
          );
          // Keep modal open to show failures
          const failedIds = new Set(failures.map((f) => f.id));
          setSelectedKioskIds(failedIds);
        }
      } else {
        showToast(`Failed to enqueue transfers to ${failures.length} kiosk(s)`);
      }
    } catch (error) {
      logger.error("Failed to send to kiosks", error);
      showToast("Critical error sending to kiosks");
    } finally {
      setIsSendingToKiosk(false);
    }
  }, [albumId, selectedKioskIds, showToast]);

  // Memoize handlers to prevent cascading re-renders
  const handlers = useMemo(
    () => ({
      handleOpenKioskModal,
      handleToggleKiosk,
      handleKioskConfirm,
    }),
    [handleOpenKioskModal, handleToggleKiosk, handleKioskConfirm],
  );

  return {
    isKioskModalOpen,
    availableKiosks,
    selectedKioskIds,
    isSendingToKiosk,
    setIsKioskModalOpen,
    setSelectedKioskIds,
    handlers,
  };
}
