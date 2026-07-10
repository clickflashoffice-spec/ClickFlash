import React, { useState } from "react";
import { Order } from "../../types";
import {
  moneyTrashService,
  TrashGallery,
} from "../../services/moneyTrashService";
import { Logo } from "../common/Logo";

interface CustomerLoginProps {
  onLoginSuccess: (payload: Order | TrashGallery) => void;
  authService: {
    getOrderByCredentials: (
      pin: string,
      email: string,
    ) => Promise<Order | null>;
    getOrderByRoomNumber: (roomNumber: string) => Promise<Order | null>;
    getOrderByToken?: (token: string) => Promise<Order | null>;
  };
  onBack?: () => void;
}

type LoginMode = "gallery" | "order" | "magic";

const CustomerLogin: React.FC<CustomerLoginProps> = ({
  onLoginSuccess,
  authService,
  onBack,
}) => {
  const [mode, setMode] = useState<LoginMode>("gallery");
  const [accessPin, setAccessPin] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "gallery") {
        const trimmedCode = accessPin.trim();
        if (!trimmedCode) {
          setError("Please enter your B2B Access Code.");
          setLoading(false);
          return;
        }

        const trashGallery =
          await moneyTrashService.getArchivedPhotos(trimmedCode);
        if (trashGallery && trashGallery.photos.length > 0) {
          onLoginSuccess(trashGallery);
        } else {
          setError("No active B2B gallery found for this code.");
        }
      } else if (mode === "order") {
        const trimmedPin = accessPin.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedPin || !trimmedEmail) {
          setError("Please enter both your PIN and Email address.");
          setLoading(false);
          return;
        }

        const order = await authService.getOrderByCredentials(
          trimmedPin,
          trimmedEmail,
        );
        if (order) {
          onLoginSuccess(order);
        } else {
          setError("Digital order not found or not yet validated.");
        }
      } else if (mode === "magic") {
        const trimmedInput = accessPin.trim();
        if (!trimmedInput) {
          setError("Please enter your Room Number or Magic Token.");
          setLoading(false);
          return;
        }

        let order = await authService.getOrderByRoomNumber(trimmedInput);
        if (!order && authService.getOrderByToken) {
          order = await authService.getOrderByToken(trimmedInput);
        }
        if (order) {
          onLoginSuccess(order);
        } else {
          setError("No order found for this Room Number or Token.");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 relative overflow-hidden selection:bg-cyan-500/30">
      {/* Cinematic Background Atmosphere - Adapted for Light Mode */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse-slow active"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay mix-blend-multiply"></div>
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center space-x-2 text-slate-500 hover:text-cyan-600 transition-all z-20 group"
        >
          <div className="p-2 rounded-full bg-slate-100 border border-slate-200 group-hover:border-cyan-500/50 group-hover:bg-cyan-50 transition-all">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
          <span className="font-bold tracking-widest uppercase text-[10px]">
            Portal Home
          </span>
        </button>
      )}

      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in-down">
        <div className="text-center mb-12">
          <div className="relative inline-block group transform hover:scale-110 transition-all duration-500">
            <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <Logo size="xl" />
          </div>

          <p className="text-cyan-600/60 mt-6 font-black tracking-[0.4em] text-[10px] uppercase">
            Customer Service Gallery
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100">
          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-2xl p-1.5 mb-10 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode("gallery");
                setError("");
              }}
              className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all ${
                mode === "gallery"
                  ? "bg-white text-cyan-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Buy Photos
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("order");
                setError("");
              }}
              className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all ${
                mode === "order"
                  ? "bg-white text-cyan-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              PIN / Email
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("magic");
                setError("");
              }}
              className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all ${
                mode === "magic"
                  ? "bg-white text-cyan-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Room / Token
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            {mode === "gallery" && (
              <div className="group">
                <label
                  htmlFor="accessPin"
                  className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-cyan-600 transition-colors"
                >
                  B2B Access Code
                </label>
                <input
                  type="text"
                  id="accessCode"
                  name="accessCode"
                  value={accessPin}
                  onChange={(e) => setAccessPin(e.target.value)}
                  placeholder="e.g. B2B-XXXX-XXXX"
                  required
                  autoComplete="off"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all font-bold text-sm group-hover:border-slate-300"
                />
              </div>
            )}

            {mode === "order" && (
              <div className="space-y-6">
                <div className="group">
                  <label
                    htmlFor="accessPin"
                    className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-cyan-600 transition-colors"
                  >
                    6-Digit Access PIN
                  </label>
                  <input
                    type="text"
                    id="accessPin"
                    name="accessPin"
                    value={accessPin}
                    onChange={(e) => setAccessPin(e.target.value)}
                    placeholder="Found in your email"
                    required
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all font-bold text-sm tracking-[0.5em] text-center uppercase group-hover:border-slate-300"
                  />
                </div>
                <div className="group">
                  <label
                    htmlFor="email"
                    className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-cyan-600 transition-colors"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Registered email"
                    required
                    autoComplete="email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all font-bold text-sm group-hover:border-slate-300"
                  />
                </div>
              </div>
            )}

            {mode === "magic" && (
              <div className="group">
                <label
                  htmlFor="accessPin"
                  className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-cyan-600 transition-colors"
                >
                  Room Number or Magic Token
                </label>
                <input
                  type="text"
                  id="accessPin"
                  name="accessPin"
                  value={accessPin}
                  onChange={(e) => setAccessPin(e.target.value)}
                  placeholder="e.g. 402 or CF-TOKEN-XYZ"
                  required
                  autoComplete="off"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all font-bold text-sm group-hover:border-slate-300"
                />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs text-center font-bold animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-cyan-500/10 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.1em] text-sm border-t border-white/20 relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loading
                  ? "Authenticating..."
                  : mode === "gallery"
                    ? "Enter Gallery"
                    : mode === "order"
                      ? "Access My Order"
                      : "Access Room / Token"}
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </form>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-loose">
            Secure SSL Encryption Enabled
            <br />
            <span className="opacity-50 font-medium">
              ClickFlash Private Photography Cloud
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
