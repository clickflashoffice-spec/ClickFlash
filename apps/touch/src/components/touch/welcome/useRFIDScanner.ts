import { useEffect } from "react";
import { logger } from "../../../utils/logger";

interface UseRFIDScannerProps {
  enableRFID: boolean;
  showToast: (message: string) => void;
  onBrowsePhotos: (roomNumber: string) => void;
}

export const useRFIDScanner = ({ enableRFID, showToast, onBrowsePhotos }: UseRFIDScannerProps) => {
  // --- Keyboard Wedge Listener for RFID (HID Mode) ---
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;
    const TIMEOUT_MS = 100; // Max time between keystrokes for a scanner

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const now = Date.now();

      // If time since last key is too long, reset buffer (it's likely manual typing)
      if (now - lastKeyTime > TIMEOUT_MS && buffer.length > 0) {
        buffer = "";
      }

      lastKeyTime = now;

      if (e.key === "Enter") {
        if (buffer.length >= 4) {
          // Assume valid RFID is at least 4 chars
          logger.info("[useRFIDScanner] Keyboard Wedge detected RFID:", buffer);
          await processRFID(buffer);
        }
        buffer = "";
      } else if (e.key.length === 1) {
        // Printable chars
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [enableRFID]);

  const processRFID = async (rfidUid: string) => {
    if (!enableRFID) return;

    showToast("Processing Card...");

    try {
      const rfidService = (await import("../../../services/rfidService")).rfidService;

      // 1. Try Local/API Lookup
      let roomNumber = rfidService.getRoomFromRFID(rfidUid);

      if (!roomNumber) {
        // 2. Try Database Lookup (Async)
        roomNumber = await rfidService.lookupRoomFromDatabase(rfidUid);
      }

      if (roomNumber) {
        showToast(`Welcome! Room ${roomNumber}`);
        setTimeout(() => onBrowsePhotos(roomNumber!), 500);
      } else {
        showToast("Card not recognized. Please see a photographer.");
      }
    } catch (e) {
      logger.error(
        "[useRFIDScanner] RFID Processing Failed",
        e instanceof Error ? e : undefined,
      );
      showToast("Error reading card.");
    }
  };

  const handleRFIDSimulation = async () => {
    showToast("RFID scanning ready (simulation mode)...");

    try {
      const rfidService = (await import("../../../services/rfidService")).rfidService;

      // For demo/testing: Try to look up a test RFID or use mock
      setTimeout(async () => {
        const testUid = "TEST-RFID-001";
        let roomNumber = rfidService.getRoomFromRFID(testUid);

        if (!roomNumber) {
          roomNumber = await rfidService.lookupRoomFromDatabase(testUid);
        }

        if (!roomNumber) {
          showToast("RFID Wristband Detected! (Demo Mode)");
          rfidService.simulateRFIDScan(testUid, "101");
          roomNumber = "101";
        }

        setTimeout(() => {
          onBrowsePhotos(roomNumber || "101");
        }, 500);
      }, 1000);
    } catch (error) {
      logger.error(
        "Error in RFID simulation",
        error instanceof Error ? error : undefined,
      );
      showToast("RFID scanning unavailable. Please use room number entry.");
    }
  };

  const handleRFIDTap = async () => {
    if (!enableRFID) {
      showToast("RFID scanning is disabled in settings.");
      return;
    }

    try {
      const rfidService = (await import("../../../services/rfidService")).rfidService;

      if (rfidService.isSerialAPIAvailable()) {
        showToast("Ready to scan wristband...");

        const started = await rfidService.startSerialRFIDListener(
          async (roomNumber, rfidUid) => {
            showToast(`Wristband detected! Room: ${roomNumber}`);
            setTimeout(() => {
              onBrowsePhotos(roomNumber);
            }, 500);
          },
        );

        if (!started) {
          handleRFIDSimulation();
        }
      } else {
        handleRFIDSimulation();
      }
    } catch (error) {
      logger.error(
        "Error initializing RFID service",
        error instanceof Error ? error : undefined,
      );
      handleRFIDSimulation();
    }
  };

  return { handleRFIDTap };
};
