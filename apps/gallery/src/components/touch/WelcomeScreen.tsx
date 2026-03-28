import React, { useState, useEffect } from "react";
import KioskSettingsModal from "./KioskSettingsModal";
import RoomNumberModal from "./RoomNumberModal";
import { KioskSettings, DestinationFeatures } from "../../types.ts";
import PasswordModal from "./PasswordModal";
import { webSocketService } from "../../services/webSocketService.ts";
import FaceSearchModal from "./FaceSearchModal";
import { faceRecognitionService } from "../../services/faceRecognitionService.ts";

interface WelcomeScreenProps {
  onBrowsePhotos: (roomNumber?: string) => void;
  kioskConnectionStatus: "Connected" | "Disconnected";
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
}> = ({
  title,
  description,
  icon,
  onClick,
  gradient,
  highlight,
  delay = 0,
}) => (
  <button
    onClick={onClick}
    style={{ animationDelay: `${delay}ms` }}
    className={`relative w-full h-64 ${gradient} rounded-3xl flex flex-col items-center justify-center text-center p-6 cursor-pointer transition-all duration-500 hover:scale-[1.03] active:scale-95 shadow-xl hover:shadow-2xl border border-white/10 group overflow-hidden animate-fadeInUp`}
  >
    {/* Background Decorator */}
    <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

    {highlight && (
      <div className="absolute inset-0 ring-4 ring-white/30 rounded-3xl animate-pulse z-0"></div>
    )}

    <div className="relative z-10 text-white mb-4 p-5 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors backdrop-blur-md shadow-lg">
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className:
          "w-10 h-10 transform group-hover:rotate-6 transition-transform duration-300",
      })}
    </div>
    <h2 className="relative z-10 text-2xl font-bold text-white mb-2 drop-shadow-md">
      {title}
    </h2>
    <p className="relative z-10 text-white/90 text-sm font-medium max-w-[85%] leading-relaxed">
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

  const [settings, setSettings] = useState<KioskSettings>({
    logoUrl: "/gallery/logo.png",
    welcomeMessage: "Welcome",
    kioskId: "",
    // Default to true for visibility of new features
    enableRFID: true,
    enableFaceLogin: true,
    enableFaceSearch: true,
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

  const handleRequestHelp = () => {
    if (helpRequested) return;
    setHelpRequested(true);
    webSocketService.sendMessage({
      type: "ASSISTANCE_REQUEST",
      payload: {
        kioskId: settings.kioskId,
        message: "Customer needs assistance at Kiosk",
      },
    });
    showToast("Assistance requested. A photographer will be with you shortly.");
    setTimeout(() => setHelpRequested(false), 10000);
  };

  const handleRFIDTap = () => {
    // Simulate scanning a wristband which auto-logs into a room
    showToast("RFID Wristband Detected!");
    setTimeout(() => {
      onBrowsePhotos("101"); // Mock room 101
    }, 1000);
  };

  const handleFaceLogin = async (blob: Blob) => {
    // Don't close immediately, maybe show a small spinner or toast?
    setIsFaceLoginOpen(false);
    showToast("Processing biometrics...");

    try {
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
      console.error(e);
      showToast("Error occurred during face login.");
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 relative text-slate-800 dark:text-white overflow-hidden selection:bg-blue-500 selection:text-white transition-colors duration-500">
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
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>
      </div>

      <button
        onClick={() => handleAuthRequest("exit")}
        className="absolute top-6 right-6 p-4 bg-white/80 dark:bg-black/20 backdrop-blur-xl rounded-full hover:bg-white dark:hover:bg-white/20 transition-all z-20 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/70 hover:text-red-600 dark:hover:text-white shadow-lg hover:scale-105 active:scale-95"
        title="Exit Kiosk Mode"
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
      </button>

      <div className="text-center z-10 mb-12 animate-fade-in-down">
        <div className="inline-block p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-6 shadow-2xl">
          <div className="bg-white dark:bg-slate-900 rounded-full p-4 border-4 border-slate-100 dark:border-slate-800">
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="w-32 h-32 rounded-full object-cover"
            />
          </div>
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-lg dark:drop-shadow-2xl">
          {settings.welcomeMessage}
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-300 mt-4 font-medium tracking-wide uppercase opacity-90">
          Touch an option below to begin
        </p>
      </div>

      <div className="w-full max-w-[90rem] z-10 px-4 sm:px-8">
        <div
          className={`grid gap-6 ${
            settings.enableRFID && settings.enableFaceLogin
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
              : settings.enableRFID || settings.enableFaceLogin
                ? "grid-cols-1 md:grid-cols-3"
                : "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto"
          }`}
        >
          <WelcomeButton
            onClick={() => onBrowsePhotos()}
            title="View All Photos"
            description="Browse the complete gallery of photos."
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
            title="Find My Photos"
            description="Enter your room number to filter."
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

          {/* Optional RFID Button */}
          {settings.enableRFID && (
            <WelcomeButton
              onClick={handleRFIDTap}
              title="Tap Wristband"
              description="Scan RFID bracelet to login instantly."
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

          {/* Optional Face Login Button */}
          {settings.enableFaceLogin && features.face && (
            <WelcomeButton
              onClick={() => setIsFaceLoginOpen(true)}
              title="Login with Face"
              description="Scan your face to find photos."
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
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              gradient="bg-gradient-to-br from-pink-600 to-rose-800 dark:from-pink-700 dark:to-rose-900"
              highlight={true}
              delay={300}
            />
          )}
        </div>
      </div>

      <KioskSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={(s) => setSettings(s)}
        kioskConnectionStatus={kioskConnectionStatus}
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
      />
    </div>
  );
};

export default WelcomeScreen;
