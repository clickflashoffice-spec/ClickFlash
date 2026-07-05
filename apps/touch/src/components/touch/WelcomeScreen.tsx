
import React, { useState, useEffect } from "react";
import KioskSettingsModal from "./KioskSettingsModal";
import RoomNumberModal from "./RoomNumberModal";
import { KioskSettings, DestinationFeatures, Photo } from "../../types.ts";
import PasswordModal from "./PasswordModal";
import { webSocketService } from "../../services/webSocketService.ts";
import FaceSearchModal from "./FaceSearchModal";
import { logger } from "../../utils/logger";
import { faceRecognitionService, FaceSearchResult } from "../../services/faceRecognitionService.ts";

interface WelcomeScreenProps {
  onBrowsePhotos: (roomNumber?: string) => void;
  kioskConnectionStatus: "Connected" | "Disconnected" | "Offline";
  onExit: () => void;
  isConfigRequired?: boolean;
  showToast: (message: string) => void;
  features?: DestinationFeatures;
}

const WelcomeButton: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  gradient: string;
  highlight?: boolean;
  delay?: number;
  testId?: string;
}> = ({
  title,
  description,
  icon,
  onClick,
  gradient,
  highlight,
  delay = 0,
  testId,
}) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`relative w-full h-auto min-h-[220px] max-h-[280px] ${gradient} rounded-3xl flex flex-col items-center justify-center text-center p-5 cursor-pointer transition-all duration-500 hover:scale-[1.03] active:scale-95 shadow-xl hover:shadow-2xl border border-white/10 group overflow-hidden animate-fadeInUp`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Background Decorator */}
    <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

    {highlight && (
      <div className="absolute inset-0 ring-4 ring-white/30 rounded-3xl animate-pulse z-0"></div>
    )}

    <div className="relative z-10 text-white mb-3 p-4 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors backdrop-blur-md shadow-lg">
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className:
          "w-10 h-10 transform group-hover:rotate-6 transition-transform duration-300",
      })}
    </div>
    <h2 className="relative z-10 text-xl font-bold text-white mb-2 drop-shadow-md whitespace-nowrap">
      {title}
    </h2>
    <p className="relative z-10 text-white/90 text-xs font-medium max-w-[90%] leading-relaxed line-clamp-2">
      {description}
    </p>
  </button>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onBrowsePhotos,
  kioskConnectionStatus,
  onExit,
  isConfigRequired,
  showToast,
  features = { ai: true, face: true, watermark: true },
}) => {
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isRoomNumberModalOpen, setRoomNumberModalOpen] = useState(false);
  const [helpRequested, setHelpRequested] = useState(false);
  const [authAction, setAuthAction] = useState<"settings" | "exit">("settings");

  // Face Login State
  const [isFaceLoginOpen, setIsFaceLoginOpen] = useState(false);
  
  // Face Search State
  const [isFaceSearchOpen, setIsFaceSearchOpen] = useState(false);
  const [faceSearchLoading, setFaceSearchLoading] = useState(false);

  const [settings, setSettings] = useState<KioskSettings>({
    logoUrl: "/logo.png",
    welcomeMessage: "Welcome",
    kioskId: "",
    // Default to true for visibility of new features
    enableRFID: true,
    enableFaceLogin: false,
    enableFaceSearch: true, // Enable face search by default
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem("kioskSettingsV2");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Merge defaults with saved settings to ensure new keys exist
        setSettings((prev) => ({
          ...prev,
          ...parsed,
        }));
      } catch (e) {}
    }

    if (isConfigRequired) {
      setSettingsOpen(true);
    }
  }, [isSettingsOpen, isConfigRequired]);

  const handleRoomNumberConfirm = (roomNumber: string) => {
    setRoomNumberModalOpen(false);
    onBrowsePhotos(roomNumber);
  };

  const handleAuthRequest = (action: "settings" | "exit") => {
    setAuthAction(action);
    setPasswordModalOpen(true);
  };

  const handleAdminAuthSuccess = () => {
    setPasswordModalOpen(false);
    if (authAction === "settings") {
      setSettingsOpen(true);
    } else if (authAction === "exit") {
      onExit();
    }
  };

  const helpTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleRequestHelp = () => {
    if (helpRequested) return;

    logger.info("[WelcomeScreen] Requesting Help...");
    logger.info("[WelcomeScreen] Connection Status:", webSocketService.status);
    logger.info("[WelcomeScreen] Kiosk Settings:", settings);

    setHelpRequested(true);
    webSocketService.sendMessage({
      type: "ASSISTANCE_REQUEST",
      payload: {
        kioskId: settings.kioskId || "UNKNOWN_KIOSK",
        message: "Customer needs assistance at Kiosk",
      },
    });
    showToast("Assistance requested. A photographer will be with you shortly.");

    if (helpTimeoutRef.current) clearTimeout(helpTimeoutRef.current);
    helpTimeoutRef.current = setTimeout(() => setHelpRequested(false), 10000);
  };

  useEffect(() => {
    return () => {
      if (helpTimeoutRef.current) clearTimeout(helpTimeoutRef.current);
    };
  }, []);

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
          logger.info("[WelcomeScreen] Keyboard Wedge detected RFID:", buffer);
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
  }, [settings.enableRFID]);

  const processRFID = async (rfidUid: string) => {
    if (!settings.enableRFID) return;

    showToast("Processing Card...");

    try {
      const rfidService = (await import("../../services/rfidService"))
        .rfidService;

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
        // Optional: Prompt to register this card if it's an admin/staff flow
      }
    } catch (e) {
      logger.error(
        "[WelcomeScreen] RFID Processing Failed",
        e instanceof Error ? e : undefined,
      );
      showToast("Error reading card.");
    }
  };

  const handleRFIDTap = async () => {
    // Check if RFID is enabled
    if (!settings.enableRFID) {
      showToast("RFID scanning is disabled in settings.");
      return;
    }

    try {
      // Try to start serial RFID listener
      const rfidService = (await import("../../services/rfidService"))
        .rfidService;

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
          // Fallback to simulation if hardware not available
          handleRFIDSimulation();
        }
      } else {
        // Browser doesn't support Web Serial API, use simulation
        handleRFIDSimulation();
      }
    } catch (error) {
      logger.error(
        "Error initializing RFID service",
        error instanceof Error ? error : undefined,
      );
      // Fallback to simulation
      handleRFIDSimulation();
    }
  };

  const handleRFIDSimulation = async () => {
    showToast("RFID scanning ready (simulation mode)...");

    try {
      const rfidService = (await import("../../services/rfidService"))
        .rfidService;

      // For demo/testing: Try to look up a test RFID or use mock
      // In production, this would be triggered by actual hardware scan
      setTimeout(async () => {
        // Try to find a room from existing mappings or use mock
        const testUid = "TEST-RFID-001";
        let roomNumber = rfidService.getRoomFromRFID(testUid);

        if (!roomNumber) {
          // Try database lookup
          roomNumber = await rfidService.lookupRoomFromDatabase(testUid);
        }

        if (!roomNumber) {
          // Use mock for demo
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

  const handleFaceLogin = async (blob: Blob) => {
    setIsFaceLoginOpen(false);
    showToast("Processing biometrics...");

    try {
      // Validate blob before processing
      if (!blob || blob.size === 0) {
        showToast("Invalid image captured. Please try again.");
        return;
      }

      // Check if face is detected first
      const faceRecognitionService = (
        await import("../../services/faceRecognitionService.ts")
      ).faceRecognitionService;
      const faceDetected = await faceRecognitionService.detectFace(blob);
      if (!faceDetected) {
        showToast(
          "No face detected. Please ensure your face is clearly visible in the frame.",
        );
        return;
      }

      // Identify user
      const user = await faceRecognitionService.identifyUser(blob);
      if (user) {
        showToast(`Welcome back, ${user.name}!`);
        setTimeout(() => {
          onBrowsePhotos(user.roomNumber);
        }, 500);
      } else {
        showToast(
          "Face not recognized. Please try again or use your Room Number.",
        );
      }
    } catch (e) {
      logger.error(
        "Error occurred during face login",
        e instanceof Error ? e : undefined,
      );
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes("timeout") || errorMessage.includes("time")) {
        showToast("Face recognition timed out. Please try again.");
      } else {
        showToast(
          "Error occurred during face login. Please try again or use your Room Number.",
        );
      }
    }
  };

  /**
   * Handle Face Search - Complete flow:
   * 1. Customer scans face
   * 2. Search for matching faces in photos
   * 3. Get room number from matched photo
   * 4. Show all photos from that room
   */
  const handleFaceSearch = async (blob: Blob) => {
    setIsFaceSearchOpen(false);
    setFaceSearchLoading(true);

    try {
      // Validate blob
      if (!blob || blob.size === 0) {
        showToast("Invalid image captured. Please try again.");
        setFaceSearchLoading(false);
        return;
      }

      showToast("Scanning your face...");

      // Check if face is detected first
      const faceDetected = await faceRecognitionService.detectFace(blob);
      if (!faceDetected) {
        showToast("No face detected. Please ensure your face is clearly visible in the frame.");
        setFaceSearchLoading(false);
        return;
      }

      showToast("Searching for your photos...");

      // Perform the complete face search flow
      const result: FaceSearchResult = await faceRecognitionService.searchByFace(blob);

      if (!result.success) {
        showToast(result.message || "Could not find your photos. Please try again or use room number.");
        setFaceSearchLoading(false);
        return;
      }

      if (!result.faceFound) {
        showToast("No face detected in photo. Please try again.");
        setFaceSearchLoading(false);
        return;
      }

      if (!result.roomFound || !result.roomNumber) {
        showToast("Face found but could not determine room. Please use room number search.");
        setFaceSearchLoading(false);
        return;
      }

      // Success! Show results
      showToast(`Found ${result.totalPhotos} photos from Room ${result.roomNumber}!`);
      
      // Navigate to photos with the room number
      setTimeout(() => {
        onBrowsePhotos(result.roomNumber || undefined);
        setFaceSearchLoading(false);
      }, 1000);

    } catch (e) {
      logger.error(
        "Error in face search",
        e instanceof Error ? e : undefined,
      );
      showToast("Error during face search. Please try again or use room number.");
      setFaceSearchLoading(false);
    }
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
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
        showToast(
          `Error attempting to enable full-screen mode: ${err.message}`,
        );
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 relative text-slate-800 dark:text-white overflow-hidden selection:bg-blue-500 selection:text-white transition-colors duration-500 font-sans">
      {/* Offline/Disconnected Warning Banner */}
      {(kioskConnectionStatus === "Offline" ||
        kioskConnectionStatus === "Disconnected") && (
        <div
          className={`absolute top-0 left-0 w-full ${kioskConnectionStatus === "Offline" ? "bg-red-700" : "bg-orange-600"} text-white z-50 p-4 shadow-lg flex items-center justify-center space-x-4 animate-slideDown pointer-events-none`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="font-bold uppercase tracking-wider text-sm md:text-base">
            {kioskConnectionStatus === "Offline"
              ? "Critical System Error - Local DB Service Down"
              : "Disconnected from Master Station - Check Network"}
          </span>
          <button
            onClick={() => window.location.reload()}
            className={`bg-white ${kioskConnectionStatus === "Offline" ? "text-red-700" : "text-orange-600"} px-4 py-1 rounded-full font-bold text-sm hover:bg-opacity-90 transition-colors shadow-sm pointer-events-auto`}
          >
            Retry Connection
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-white underline text-sm hover:text-red-100 ml-4 pointer-events-auto"
          >
            Configure IP
          </button>
        </div>
      )}

      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 opacity-100 transition-colors duration-500"></div>
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-[150px] animate-pulse-slow delay-700"></div>
      </div>

      {/* Controls Top Left */}
      <div className="absolute top-6 left-6 flex space-x-4 z-20">
        <button
          onClick={() => handleAuthRequest("settings")}
          className="p-4 bg-white/80 dark:bg-black/20 backdrop-blur-xl rounded-full hover:bg-white dark:hover:bg-white/20 transition-all border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white shadow-lg hover:scale-105 active:scale-95"
          title="Kiosk Settings"
          aria-label="Open Kiosk Settings"
          data-testid="settings-button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
        <button
          onClick={handleRequestHelp}
          disabled={helpRequested}
          className={`p-4 backdrop-blur-xl rounded-full transition-all border flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 ${helpRequested ? "bg-yellow-500/80 border-yellow-600 text-white cursor-default animate-pulse" : "bg-white/80 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/70 hover:text-yellow-600 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-500/20"}`}
          title="Call for Assistance"
          aria-label={
            helpRequested
              ? "Assistance requested, please wait"
              : "Call for Assistance"
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>
        <button
          onClick={toggleFullscreen}
          className={`p-4 backdrop-blur-xl rounded-full transition-all border flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 ${isFullscreen ? "bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400" : "bg-white/80 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/70 hover:text-blue-600"}`}
          title={
            isFullscreen ? "Exit Fullscreen" : "Enter Kiosk Mode (Fullscreen)"
          }
          aria-label={
            isFullscreen
              ? "Exit Fullscreen Mode"
              : "Enter Fullscreen Kiosk Mode"
          }
        >
          {!isFullscreen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </button>
      </div>

      <button
        onClick={() => handleAuthRequest("exit")}
        className="absolute top-6 right-6 p-4 bg-white/80 dark:bg-black/20 backdrop-blur-xl rounded-full hover:bg-white dark:hover:bg-white/20 transition-all z-20 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/70 hover:text-red-600 dark:hover:text-white shadow-lg hover:scale-105 active:scale-95"
        title="Exit Kiosk Application"
        aria-label="Exit Kiosk Application"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
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
      </button>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-7xl z-10 py-12">
        <div className="text-center mb-16 animate-fade-in-down">
          <div className="inline-block p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-8 shadow-2xl">
            <div className="bg-white dark:bg-slate-900 rounded-full p-5 border-4 border-slate-100 dark:border-slate-800">
              <img
                src={settings.logoUrl}
                alt="ClickFlash Kiosk Logo"
                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover"
              />
            </div>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-lg dark:drop-shadow-2xl">
            {settings.welcomeMessage}
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mt-6 font-medium tracking-widest uppercase opacity-90">
            Touch an option below to begin
          </p>
        </div>

        <div className="w-full px-6 sm:px-12">
          <div
            className={`grid gap-6 items-center justify-center mx-auto ${
              settings.enableRFID
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-6xl"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-4xl"
            }`}
          >
            <WelcomeButton
              onClick={() => onBrowsePhotos()}
              title="View All Photos"
              description="Browse the complete gallery of photos."
              testId="welcome-view-all-button"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
              gradient="bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900"
              delay={0}
            />

            <WelcomeButton
              onClick={() => setRoomNumberModalOpen(true)}
              title="Find by Room"
              description="Enter your room number to find photos."
              testId="welcome-find-room-button"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
              gradient="bg-gradient-to-br from-purple-600 to-purple-800 dark:from-purple-700 dark:to-purple-900"
              delay={100}
            />

            {/* Face Search Button - Always Active */}
            <WelcomeButton
              onClick={() => setIsFaceSearchOpen(true)}
              title="Search by Face"
              description="Scan your face to find your photos instantly."
              testId="welcome-face-search-button"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              }
              gradient="bg-gradient-to-br from-pink-500 to-rose-600 dark:from-pink-600 dark:to-rose-700"
              highlight={true}
              delay={150}
            />

            {/* Optional RFID Button */}
            {settings.enableRFID && (
              <WelcomeButton
                onClick={handleRFIDTap}
                title="Tap Wristband"
                description="Scan RFID bracelet to login instantly."
                testId="welcome-rfid-button"
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                }
                gradient="bg-gradient-to-br from-emerald-600 to-emerald-800 dark:from-emerald-700 dark:to-emerald-900"
                highlight={true}
                delay={200}
              />
            )}
          </div>
        </div>
      </div>

      <KioskSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={(s) => setSettings(s)}
        kioskConnectionStatus={
          kioskConnectionStatus === "Offline"
            ? "Disconnected"
            : kioskConnectionStatus
        }
      />
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
      />
      <RoomNumberModal
        isOpen={isRoomNumberModalOpen}
        onClose={() => setRoomNumberModalOpen(false)}
        onConfirm={handleRoomNumberConfirm}
      />

      <FaceSearchModal
        isOpen={isFaceLoginOpen}
        onClose={() => setIsFaceLoginOpen(false)}
        onSearch={handleFaceLogin}
        title="Face Login"
      />

      <FaceSearchModal
        isOpen={isFaceSearchOpen}
        onClose={() => setIsFaceSearchOpen(false)}
        onSearch={handleFaceSearch}
        title="Search for Your Photos"
      />

      {/* Loading overlay for face search */}
      {faceSearchLoading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 flex flex-col items-center shadow-2xl">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Searching for your photos...</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">This may take a few moments</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;
