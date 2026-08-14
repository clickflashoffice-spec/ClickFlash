import { OfflineScreen } from '@clickflash/ui';
import { logger } from '@clickflash/logger';
import React, { useState, useEffect } from "react";
import CustomerLogin from "./components/customer/CustomerLogin";
import CustomerLayout from "./components/customer/CustomerLayout";
import { Order } from "./types";
import { cloudApiService } from "./services/cloudApiService";
import {
  moneyTrashService,
  type TrashGallery,
} from "./services/moneyTrashService";
import useCartStore from "./stores/useCartStore";


import { NetworkStatusProvider } from "./components/common/NetworkStatusProvider";

type CustomerAuthState = "unauthenticated" | "authenticated" | "loading";

interface CustomerPortalProps {
  onExit: () => void;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ onExit }) => {
  const [authState, setAuthState] = useState<CustomerAuthState>("loading");
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [currentTrashGallery, setCurrentTrashGallery] = useState<TrashGallery | null>(null);
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

    const cleanSensitiveParams = () => {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("token");
      cleanUrl.searchParams.delete("pin");
      cleanUrl.searchParams.delete("email");
      window.history.replaceState({}, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    };

    const tryAutoLogin = async () => {
      // 1. Cloud-issued customer token or magic link
      if (token) {
        try {
          const order = await cloudApiService.getOrderByToken(token);
          if (order) {
            setCurrentOrder(order);
            setAuthState("authenticated");

            // Clean URL to prevent sharing functional magic links
            cleanSensitiveParams();
            return;
          }
        } catch (e) {
          logger.warn("Magic Link auto-login failed", e);
        }
      }

      // 2. Traditional PIN + email login (fallback from URL params)
      if (pin && email) {
        try {
          const order = await cloudApiService.getOrderByCredentials(pin, email);
          if (order) {
            setCurrentOrder(order);
            setAuthState("authenticated");

            // Clean URL
            cleanSensitiveParams();
            return;
          }
        } catch (e) {
          logger.warn("Auto-login failed", e);
        }
      }

      const storedToken = localStorage.getItem("gallery_token");
      if (storedToken) {
        try {
          const order = await cloudApiService.getOrderByToken(storedToken);
          if (order) {
            setCurrentOrder(order);
            setAuthState("authenticated");
            return;
          }
        } catch (error) {
          logger.warn("Stored customer session could not be restored", error);
        }
        localStorage.removeItem("gallery_token");
      }

      // MoneyTrash is online-only. Remember only the access code for the
      // current browser tab and exchange it for a fresh scoped token on reload.
      const rememberedAccessCode = moneyTrashService.getRememberedAccessCode();
      if (rememberedAccessCode) {
        try {
          const gallery = await moneyTrashService.getArchivedPhotos(rememberedAccessCode);
          if (gallery?.photos.length) {
            setCurrentTrashGallery(gallery);
            setCurrentOrder(null);
            setAuthState("authenticated");
            return;
          }
        } catch (error) {
          logger.warn("MoneyTrash browser session could not be restored", error);
        }
        moneyTrashService.clearRememberedAccessCode();
      }
      setAuthState("unauthenticated");
    };

    tryAutoLogin();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLoginSuccess = (payload: Order | TrashGallery) => {
    if ("photos" in payload) {
      // It's a trash gallery
      localStorage.removeItem("gallery_token");
      setCurrentTrashGallery(payload);
      setCurrentOrder(null);
      moneyTrashService.rememberAccessCode(payload.accessCode);
      useCartStore.getState().clearCart();
    } else {
      // It's a standard order
      setCurrentOrder(payload);
      setCurrentTrashGallery(null);
      moneyTrashService.clearRememberedAccessCode();
    }
    setAuthState("authenticated");
  };

  const handleLogout = () => {
    localStorage.removeItem("gallery_token");
    moneyTrashService.clearRememberedAccessCode();
    if (currentTrashGallery) useCartStore.getState().clearCart();
    setCurrentOrder(null);
    setCurrentTrashGallery(null);
    setAuthState("unauthenticated");
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
          order={currentOrder ?? undefined}
          trashGallery={currentTrashGallery ?? undefined}
          onLogout={handleLogout}
        />
      ) : null}
    </NetworkStatusProvider>
  );
};

export default CustomerPortal;
