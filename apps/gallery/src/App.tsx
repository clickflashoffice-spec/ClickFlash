import React, { useState, useEffect } from "react";
import CustomerLogin from "./components/customer/CustomerLogin";
import CustomerLayout from "./components/customer/CustomerLayout";
import { Order } from "./types";
import { cloudApiService } from "./services/cloudApiService";
import OfflineScreen from "./components/common/OfflineScreen";

import { NetworkStatusProvider } from "./components/common/NetworkStatusProvider";

type CustomerAuthState = "unauthenticated" | "authenticated" | "loading";

interface CustomerPortalProps {
  onExit: () => void;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ onExit }) => {
  const [authState, setAuthState] = useState<CustomerAuthState>("loading");
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [currentTrashGallery, setCurrentTrashGallery] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Auto-Login Check
    const params = new URLSearchParams(window.location.search);
    const pin = params.get("pin");
    const email = params.get("email");
    const token = params.get("token"); // Used for both QR and Magic Link
    const qrSessionId = params.get("session"); // Only present for QR Login

    const tryAutoLogin = async () => {
      // 1. Magic Link Login (Token only, no session)
      if (token && !qrSessionId) {
        try {
          const order = await cloudApiService.getOrderByToken(token);
          if (order) {
            setCurrentOrder(order);
            setAuthState("authenticated");

            // Clean URL to prevent sharing functional magic links
            const newUrl =
              window.location.protocol +
              "//" +
              window.location.host +
              window.location.pathname +
              window.location.hash;
            window.history.replaceState({ path: newUrl }, "", newUrl);
            return;
          }
        } catch (e) {
          console.warn("Magic Link auto-login failed", e);
        }
      }

      // 2. QR-based Login (Token + Session ID)
      if (token && qrSessionId) {
        try {
          // Validate QR session with Touch App
          const touchApiUrl =
            (import.meta as any).env.VITE_TOUCH_API_URL ||
            "http://localhost:8091";
          const validationResponse = await fetch(
            `${touchApiUrl}/api/qr/validate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: qrSessionId, token: token }),
            },
          );

          if (validationResponse.ok) {
            const { data } = await validationResponse.json();
            const roomNumber = data.roomNumber;

            // Fetch order by room number
            if (roomNumber) {
              const order =
                await cloudApiService.getOrderByRoomNumber(roomNumber);
              if (order) {
                setCurrentOrder(order);
                setAuthState("authenticated");

                // Clean URL
                const newUrl =
                  window.location.protocol +
                  "//" +
                  window.location.host +
                  window.location.pathname +
                  window.location.hash;
                window.history.replaceState({ path: newUrl }, "", newUrl);
                return;
              }
            }
          }
        } catch (e) {
          console.warn("QR auto-login failed", e);
        }
      }

      // 3. Traditional PIN + email login (fallback from URL params)
      if (pin && email) {
        try {
          const order = await cloudApiService.getOrderByCredentials(pin, email);
          if (order) {
            setCurrentOrder(order);
            setAuthState("authenticated");

            // Clean URL
            const newUrl =
              window.location.protocol +
              "//" +
              window.location.host +
              window.location.pathname +
              window.location.hash;
            window.history.replaceState({ path: newUrl }, "", newUrl);
            return;
          }
        } catch (e) {
          console.warn("Auto-login failed", e);
        }
      }
      setAuthState("unauthenticated");
    };

    tryAutoLogin();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLoginSuccess = (payload: any) => {
    if (payload.photos && payload.id && !payload.items) {
      // It's a trash gallery
      setCurrentTrashGallery(payload);
      setCurrentOrder(null);
    } else {
      // It's a standard order
      setCurrentOrder(payload);
      setCurrentTrashGallery(null);
    }
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
        portalName="Customer Portal"
        onBack={handleBackToLauncher}
      />
    );
  }

  if (authState === "loading") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500/50 animate-pulse">
          Initializing Hub
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <CustomerLogin
        onLoginSuccess={handleLoginSuccess}
        authService={cloudApiService}
        onBack={handleBackToLauncher}
      />
    );
  }

  return (
    <NetworkStatusProvider>
      {currentOrder || currentTrashGallery ? (
        <CustomerLayout
          order={currentOrder || (undefined as any)}
          trashGallery={currentTrashGallery}
          onLogout={handleLogout}
        />
      ) : null}
    </NetworkStatusProvider>
  );
};

export default CustomerPortal;
