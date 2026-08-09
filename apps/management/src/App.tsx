import { OfflineScreen } from '@clickflash/ui';
import React, { useState, useEffect, Suspense } from "react";
import Login from "./components/Login";
const ManagementLayout = React.lazy(() => import("./components/management/ManagementLayout"));
import { Photographer } from "./types";

import { cloudApiService } from "./services/cloudApiService";
import { StationProvider } from "./context/StationContext";
import { ManagementProvider } from "./context/ManagementContext";
import { useLocation } from "react-router-dom";
import { ActivateDevicePage } from "./components/management/ActivateDevicePage";

type AuthState = "unauthenticated" | "authenticated";

interface ManagementPortalProps {
  onExit: () => void;
}

const ManagementPortal: React.FC<ManagementPortalProps> = ({ onExit }) => {
  const [authState, setAuthState] = useState<AuthState>("unauthenticated");
  const [currentUser, setCurrentUser] = useState<Photographer | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();

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

  if (currentUser && location.pathname === "/activate") {
    return <ActivateDevicePage currentUser={currentUser} />;
  }

  return currentUser ? (
    <ManagementProvider>
      <StationProvider>
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Management Portal...</div>}>
          <ManagementLayout onLogout={handleLogout} currentUser={currentUser} />
        </Suspense>
      </StationProvider>
    </ManagementProvider>
  ) : null;
};

export default ManagementPortal;
