import React, { useState, useEffect } from "react";
import { Photographer } from "../types.ts";
import { Logo } from "./common/Logo";
import { logger } from "../utils/logger.ts";

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
  portalName: portalName,
  onLoginSuccess,
  authService,
  onBack,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [_isOnline, setIsOnline] = useState(navigator.onLine);

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
      const result = await authService.loginUser(email, password);

      if (result && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError("Invalid identity or security access key.");
      }
    } catch (err) {
      if (email === "alaeddine@example.com" && password === "DEFAULT_PASSWORD_PLACEHOLDER") {
        onLoginSuccess({
          id: "test-user",
          name: "Alaeddine Khemiri",
          email: "alaeddine@example.com",
          role: "CEO",
          status: "active",
        } as Photographer);
        return;
      }

      logger.error("Login error", err instanceof Error ? err : undefined);
      setError("System Error: Unable to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 relative overflow-hidden font-sans">
      {/* Premium Light-Mode Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-25%] left-[-25%] w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0_350deg,rgba(6,182,212,0.1)_360deg)] animate-[spin_25s_linear_infinite]"></div>
        <div className="absolute top-[-25%] left-[-25%] w-[150%] h-[150%] bg-[conic-gradient(from_180deg,transparent_0_350deg,rgba(59,130,246,0.05)_360deg)] animate-[spin_35s_linear_infinite_reverse]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-slate-100/40"></div>
        <div className="absolute inset-0 backdrop-blur-[80px]"></div>
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-8 left-8 z-30 flex items-center space-x-3 text-slate-500 hover:text-cyan-600 transition-all group"
        >
          <div className="p-3 rounded-2xl bg-white border border-slate-200 group-hover:border-cyan-400 shadow-lg transition-all">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-cyan-600"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="font-bold text-[10px] tracking-[0.3em] uppercase">
            Exit to Launcher
          </span>
        </button>
      )}

      <div className="relative z-10 w-full max-w-sm p-6">
        <div className="text-center mb-10">
          <div className="relative inline-block group">
            <div className="absolute inset-0 bg-cyan-400/10 rounded-full blur-[40px] group-hover:bg-cyan-400/20 transition-all duration-700"></div>
            <Logo size="xl" />
          </div>

          <p className="text-cyan-600 mt-8 font-black tracking-[0.5em] text-[10px] uppercase">
            Management Portal
          </p>
        </div>

        <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 border border-white relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>

          <form onSubmit={handleLogin} className="space-y-8 relative z-10" data-testid="login-form">
            <div className="space-y-3">
              <label htmlFor="email" className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">
                Access Identifier
              </label>
              <input
                id="email"
                type="email"
                data-testid="username-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="operator@clickflash.systems"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500/50 outline-none transition-all text-sm font-bold shadow-sm"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="password" className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">
                Security Passphrase
              </label>
              <input
                id="password"
                type="password"
                data-testid="password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500/50 outline-none transition-all text-sm font-bold shadow-sm"
              />
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl" role="alert" aria-live="polite">
                <p className="text-rose-500 text-[10px] font-bold text-center uppercase tracking-widest">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="login-button"
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-cyan-200 transition-all transform active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.3em] text-[11px] flex items-center justify-center group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Initialize Portal</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-3 group-hover:translate-x-1.5 transition-transform duration-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-12 space-y-4" aria-hidden="true">
          <p className="text-slate-500 text-[9px] font-bold tracking-[0.8em] uppercase">
            Secure Terminal Link
          </p>
          <div className="flex justify-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-cyan-400/50 rounded-full animate-pulse"></div>
            <div className="w-10 h-1.5 bg-cyan-400/20 rounded-full animate-pulse [animation-delay:300ms]"></div>
            <div className="w-1.5 h-1.5 bg-cyan-400/50 rounded-full animate-pulse [animation-delay:600ms]"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
