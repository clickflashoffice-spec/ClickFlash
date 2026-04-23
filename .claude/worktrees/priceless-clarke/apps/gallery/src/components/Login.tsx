import React, { useState, useEffect } from "react";
import { Photographer } from "../types.ts";
import { logger } from "../utils/logger.ts";
import { pb } from "../services/pb.ts";
import { Logo } from "./common/Logo";

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
  onBack,
}) => {
  const [email, setEmail] = useState("alaeddine@example.com");
  const [password, setPassword] = useState("DEFAULT_PASSWORD_PLACEHOLDER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Branding State
  const [branding, setBranding] = useState({
    title: "ClickFlash OS"
  });

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Use the API login endpoint which handles bcrypt password verification
      const result = await authService.loginUser(email, password);

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

      // If user not found and using default credentials, try to initialize default user
      if (
        errorMessage.includes("Invalid email or password") &&
        email === "alaeddine@example.com" &&
        password === "DEFAULT_PASSWORD_PLACEHOLDER"
      ) {
        try {
          const initResponse = await fetch(
            `${pb.baseUrl}/api/init/default-user`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            },
          );

          if (initResponse.ok) {
            const initData = await initResponse.json();
            if (initData.success) {
              // Retry login after initialization
              const retryResult = await authService.loginUser(email, password);
              if (retryResult && retryResult.user) {
                const user = retryResult.user;
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
                const hasPermission =
                  portalName === "Management Portal"
                    ? managementRoles.includes(user.role)
                    : masterRoles.includes(user.role);

                if (hasPermission) {
                  onLoginSuccess(user);
                  return;
                }
              }
            }
          }
        } catch (initErr) {
          // Ignore init errors, show original login error
          logger.warn(
            "Failed to initialize default user",
            initErr instanceof Error ? initErr : undefined,
          );
        }
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
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden font-sans light color-scheme-light">
      {/* Animated Gradient Background - Light Mode */}
      <div className="absolute inset-0 bg-slate-50">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(59,130,246,0.05)_360deg)] animate-[spin_12s_linear_infinite]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(248,250,252,0),#f8fafc)]"></div>
      </div>

      {/* Status Pill */}
      <div
        className={`absolute top-6 right-6 px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-2 border backdrop-blur-md z-20 transition-colors ${isOnline ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-sm" : "bg-red-500/10 text-red-600 border-red-500/20 shadow-sm"}`}
      >
        <div
          className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`}
        ></div>
        <span>{isOnline ? "SYSTEM ONLINE" : "OFFLINE MODE"}</span>
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-20 flex items-center space-x-2 text-slate-500 hover:text-blue-600 transition-colors group"
        >
          <div className="p-2 rounded-xl bg-white border border-slate-200 group-hover:border-blue-500/50 shadow-sm transition-all">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-blue-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="font-bold text-xs tracking-[0.2em] text-slate-500 group-hover:text-blue-600 transition-colors uppercase">
            RETURN TO HUB
          </span>
        </button>
      )}

      <div className="relative z-10 w-full max-w-md p-6">
        <div className="text-center mb-10">
          <div className="relative inline-block group transform hover:scale-110 transition-all duration-500">
            <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <Logo size="xl" className="relative mx-auto" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mt-8 tracking-tighter uppercase italic">
            Click<span className="text-blue-600">Flash</span>
          </h1>
          <p className="text-blue-600/60 mt-2 font-black tracking-[0.4em] text-[10px] uppercase">
            Customer Gallery
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-10 shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
          <form onSubmit={handleLogin} className="space-y-8 relative z-10">
            <div className="space-y-3">
              <label
                htmlFor="email"
                className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1"
              >
                Identity
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@clickflash.photo"
                  autoComplete="username"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm font-bold shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="password"
                className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1"
              >
                Access Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm font-bold shadow-inner"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="flex-1">
                    <p className="text-red-500 text-[10px] font-black text-center uppercase tracking-wider">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] text-xs flex items-center justify-center group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-200/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Initialize Session"
              )}
            </button>
          </form>
        </div>
        <div className="text-center mt-12 space-y-2">
          <p className="text-slate-400 text-[9px] font-black tracking-[0.6em] uppercase">
            Quantum Shield Protected
          </p>
          <div className="flex justify-center gap-1 opacity-20">
            <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse"></div>
            <div className="w-8 h-1 bg-slate-400 rounded-full animate-pulse [animation-delay:200ms]"></div>
            <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse [animation-delay:400ms]"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
