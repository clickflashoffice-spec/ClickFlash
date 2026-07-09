import React, { useState, useEffect } from "react";
import { Photographer } from "../types";
import { logger } from "../utils/logger";
import { safeStorage } from "../utils/safeStorage";
import { z } from "zod";
import { LoginSchema } from "@clickflash/validation";

import { apiService } from "../services/apiService"; // Import apiService
import FaceScanModal from "./modals/FaceScanModal"; // Import Modal

interface LoginProps {
  portalName: string;
  onLoginSuccess: (user: Photographer) => void;
  authService: {
    getUsers: () => Promise<Photographer[]>;
    loginUser: (
      email: string,
      password: string,
    ) => Promise<{ token: string; user: Photographer } | null>;
  };
  onBack?: () => void;
}

const Login: React.FC<LoginProps> = ({
  portalName,
  onLoginSuccess,
  authService,
  onBack: _onBack,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Branding State
  const [branding, setBranding] = useState({
    title: "Star Master OS",
    logoUrl: "/icon.png", // Default to local asset
  });

  const [isFaceLoginOpen, setIsFaceLoginOpen] = useState(false);

  const handleFaceLogin = async (blob: Blob) => {
    setIsFaceLoginOpen(false); // Close first to show loading on main screen if we want, or keep open?
    // Let's close modal and show loading
    setLoading(true);
    try {
      const result = await apiService.loginWithFace(blob);
      if (result && result.user) {
        // Determine permission first
        const user = result.user;
        let hasPermission = false;
        const managementRoles: Photographer["role"][] = [
          "CEO",
          "Manager",
          "Admin",
        ];
        const masterRoles: Photographer["role"][] = [
          "CEO",
          "Manager",
          "Admin",
          "Photographer",
          "Team Leader",
        ];

        if (portalName === "Management Portal") {
          hasPermission = managementRoles.includes(user.role);
        } else {
          hasPermission = masterRoles.includes(user.role);
        }

        if (hasPermission) {
          onLoginSuccess(user);
        } else {
          setError("Access Denied: Insufficient permissions.");
        }
      }
    } catch (error: any) {
      logger.error("Face login failed", error);
      setError(error.message || "Face login failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Function to fetch the logo
    const fetchLogo = async () => {
      // Always try to fetch the latest logo URL first
      // This assumes apiService has getLogoUrl merged
      if (apiService.getLogoUrl) {
        const logoUrl = apiService.getLogoUrl();
        // Validates if endpoint is reachable roughly by check if needed,
        // but mainly we just set it. The img tag onError handles 404s.
        // We append timestamp to force refresh
        setBranding((prev) => ({
          ...prev,
          logoUrl: logoUrl + "?t=" + Date.now(),
        }));
      }
    };

    fetchLogo();

    // Listen for updates from Settings
    const handleLogoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.logoUrl) {
        setBranding((prev) => ({
          ...prev,
          logoUrl: customEvent.detail.logoUrl + "?t=" + Date.now(),
        }));
      }
    };
    window.addEventListener("masterPortalLogoUpdated", handleLogoUpdate);

    const savedBranding = safeStorage.getItem("launchpadBranding");
    if (savedBranding) {
      try {
        const parsed = JSON.parse(savedBranding);
        // Only use title from localStorage, let logo normally come from API or fallback
        if (parsed.title) {
          setBranding((prev) => ({ ...prev, title: parsed.title }));
        }
      } catch (e) {
        logger.error(
          "Failed to parse saved branding",
          e instanceof Error ? e : undefined,
        );
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("masterPortalLogoUpdated", handleLogoUpdate);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate inputs using Zod
      const validated = LoginSchema.parse({ email, password });

      // Use the API login endpoint which handles bcrypt password verification
      const result = await authService.loginUser(validated.email, validated.password);

      if (result && result.user) {
        const user = result.user;
        let hasPermission = false;
        const managementRoles: Photographer["role"][] = [
          "CEO",
          "Manager",
          "Admin",
        ];
        const masterRoles: Photographer["role"][] = [
          "CEO",
          "Manager",
          "Admin",
          "Photographer",
          "Team Leader",
        ];

        if (portalName === "Management Portal") {
          hasPermission = managementRoles.includes(user.role);
        } else {
          hasPermission = masterRoles.includes(user.role);
        }

        if (hasPermission) {
          onLoginSuccess(user);
        } else {
          setError("Access Denied: Insufficient permissions.");
        }
      } else {
        setError("Invalid credentials provided.");
      }
    } catch (err) {
      logger.error("Login error", err instanceof Error ? err : undefined, {
        email,
        portalName,
      });
      let errorMessage =
        err instanceof Error
          ? err.message
          : "System Error: Unable to authenticate.";

      if (err instanceof z.ZodError) {
        errorMessage = err.errors[0].message;
      }

      // Enhance backend connection error messages with helpful instructions
      if (
        errorMessage.includes("Cannot connect to backend server") ||
        errorMessage.includes("backend server")
      ) {
        const isWindows = navigator.platform.toLowerCase().includes("win");
        const startCommand = isWindows
          ? "start-server.bat"
          : "./start-server.sh";
        errorMessage = `Backend server is not running.\n\nTo start the server:\n• Run: ${startCommand}\n• Or: node backend/server.js\n\nThen try logging in again.`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 relative overflow-hidden font-sans">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-slate-900">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(59,130,246,0.1)_360deg)] animate-[spin_8s_linear_infinite]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0.5),rgba(15,23,42,1))]"></div>
      </div>

      {/* Status Pill */}
      <div
        className={`absolute top-6 right-6 px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-2 border backdrop-blur-md z-20 transition-colors ${isOnline ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}
      >
        <div
          className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`}
        ></div>
        <span>{isOnline ? "SYSTEM ONLINE" : "OFFLINE MODE"}</span>
      </div>


      <div className="relative z-10 w-full max-w-md p-6">
        <div className="text-center mb-10">
          <div className="relative inline-block group">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <img
              src={branding.logoUrl}
              alt="Logo"
              className="relative w-24 h-24 mx-auto rounded-full object-cover border-4 border-white/10 shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/icon.png";
              }}
            />
          </div>
          <h1 className="text-3xl font-black text-white mt-6 tracking-tight">
            {portalName}
          </h1>
          <p className="text-slate-400 mt-2 font-medium tracking-wide text-sm uppercase">
            {branding.title} v4.1.0
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1"
              >
                Identity
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-slate-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  data-testid="username-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@starmaster.photo"
                  autoComplete="username"
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-black/40 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1"
              >
                Access Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-slate-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  data-testid="password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-black/40 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                data-testid="error-message"
                aria-live="assertive"
                aria-atomic="true"
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg animate-fadeIn"
              >
                <div className="flex items-start space-x-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-200 text-sm font-medium whitespace-pre-line leading-relaxed">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              data-testid="login-button"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "AUTHENTICATE"
              )}
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <span className="relative px-3 bg-[#0B1221] text-xs text-slate-500 font-bold uppercase tracking-wider backdrop-blur-xl">
                Or
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsFaceLoginOpen(true)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-blue-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              <span>SIGN IN WITH FACE ID</span>
            </button>
          </form>
        </div>
        <p className="text-center text-slate-500 text-xs mt-8 font-medium">
          SECURE ACCESS • AUTHORIZED PERSONNEL ONLY
        </p>
      </div>

      <FaceScanModal
        isOpen={isFaceLoginOpen}
        onClose={() => setIsFaceLoginOpen(false)}
        onScan={handleFaceLogin}
        title="Login with Face ID"
        helperText="Look at the camera to authenticate securely."
      />
    </div>
  );
};

export default Login;
