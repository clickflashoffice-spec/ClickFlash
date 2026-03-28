import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import ManagementLayout from "./components/management/ManagementLayout";
import { Photographer } from "./types";
import OfflineScreen from "./components/common/OfflineScreen";
import { cloudApiService } from "./services/cloudApiService";
import { StationProvider } from "./context/StationContext";

type AuthState = "unauthenticated" | "authenticated";

interface ManagementPortalProps {
  onExit: () => void;
}

const ManagementPortal: React.FC<ManagementPortalProps> = ({ onExit }) => {
  const [authState, setAuthState] = useState<AuthState>("unauthenticated");
  const [currentUser, setCurrentUser] = useState<Photographer | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const handleLoginSuccess = (user: Photographer) => {
    setCurrentUser(user);
    setAuthState("authenticated");
  };

  const handleLogout = () => {
    onExit();
  };

  const handleBackToLauncher = () => {
    onExit();
  };

  if (!isOnline) {
    return (
      <OfflineScreen
        portalName="Management Portal"
        onBack={handleBackToLauncher}
      />
    );
  }

  if (authState === "unauthenticated") {
    return (
      <Login
        portalName="Management Portal"
        onLoginSuccess={handleLoginSuccess}
        authService={cloudApiService}
        onBack={handleBackToLauncher}
      />
    );
  }

  return currentUser ? (
    <StationProvider>
      <ManagementLayout onLogout={handleLogout} currentUser={currentUser} />
    </StationProvider>
  ) : null;
};

export default ManagementPortal;
