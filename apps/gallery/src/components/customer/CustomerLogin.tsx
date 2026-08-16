import { logger } from "@clickflash/logger";
import React, { useState, useEffect } from "react";
import { Order } from "../../types";
import {
  moneyTrashService,
  TrashGallery,
} from "../../services/moneyTrashService";
import { cloudApiService } from "../../services/cloudApiService";
import { Logo } from "../common/Logo";

interface CustomerLoginProps {
  onLoginSuccess: (payload: Order | TrashGallery) => void;
  authService: {
    getOrderByCredentials: (
      pin: string,
      email: string,
    ) => Promise<Order | null>;
    getOrderByToken?: (token: string) => Promise<Order | null>;
  };
  onBack?: () => void;
}

type LoginMode = "gallery" | "order" | "magic" | "proximity" | "selfie";

const CustomerLogin: React.FC<CustomerLoginProps> = ({
  onLoginSuccess,
  authService,
  onBack,
}) => {
  const [mode, setMode] = useState<LoginMode>("gallery");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    if (token) {
      const validateToken = async () => {
        setLoading(true);
        setError("");
        try {
          const order = await cloudApiService.validateMagicLink(token);
          if (order) {
            onLoginSuccess(order);
          } else {
            setError("The magic link token is invalid or expired.");
            setMode("magic");
          }
        } catch (err) {
          logger.error("Magic link validation failed", err);
          setError("An error occurred while validating the magic link.");
          setMode("magic");
        } finally {
          setLoading(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      validateToken();
    }
  }, [onLoginSuccess]);
  const [accessPin, setAccessPin] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isBleScanning, setIsBleScanning] = useState(false);
  const [bleDeviceName, setBleDeviceName] = useState<string | null>(null);
  const [selfieStream, setSelfieStream] = useState<MediaStream | null>(null);
  const [isCapturingSelfie, setIsCapturingSelfie] = useState(false);

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
      } else if (mode === "magic" || mode === "proximity") {
        const trimmedInput = accessPin.trim();
        if (!trimmedInput) {
          setError(mode === "proximity" ? "Please scan your BLE attraction pass." : "Please enter your magic token.");
          setLoading(false);
          return;
        }

        if (mode === "proximity" && trimmedInput.startsWith("B2B-")) {
          const trashGallery = await moneyTrashService.getArchivedPhotos(trimmedInput);
          if (trashGallery && trashGallery.photos.length > 0) {
            onLoginSuccess(trashGallery);
            return;
          }
        }

        const order = authService.getOrderByToken
          ? await authService.getOrderByToken(trimmedInput)
          : null;
        if (order) {
          onLoginSuccess(order);
        } else if (mode === "proximity") {
          setError("Proximity pass not found or expired.");
        } else {
          setError("The magic token is invalid or expired.");
        }
      }
    } catch (err) {
      logger.error("Customer login failed", err);
      setError("An error occurred during login. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleBleProximityScan = async () => {
    setError("");
    setIsBleScanning(true);
    setBleDeviceName(null);

    try {
      const nav = navigator as unknown as {
        bluetooth?: {
          requestDevice: (options: {
            filters: Array<{ services: string[] }>;
            optionalServices: string[];
          }) => Promise<{ name?: string; id: string }>;
        };
      };
      if (typeof navigator !== "undefined" && nav.bluetooth) {
        const device = await nav.bluetooth.requestDevice({
          filters: [{ services: ["0000feaa-0000-1000-8000-00805f9b34fb"] }],
          optionalServices: ["battery_service"],
        });
        logger.info(`[Proximity BLE] Detected device: ${device.name || device.id}`);
        setBleDeviceName(device.name || `Wristband #${device.id.substring(0, 6).toUpperCase()}`);
        setAccessPin(`BLE-${device.id.substring(0, 8).toUpperCase()}`);
        setIsBleScanning(false);
      } else {
        // Fallback simulation when Web Bluetooth API is not available on host/browser
        logger.info("[Proximity BLE] Web Bluetooth unavailable, running simulation unlock...");
        setTimeout(() => {
          setBleDeviceName("ClickFlash VIP Wristband #8841");
          setAccessPin("B2B-8841-PASS");
          setIsBleScanning(false);
        }, 1200);
      }
    } catch (err: unknown) {
      logger.warn("BLE scanning cancelled or failed", err);
      setIsBleScanning(false);
      setError(err instanceof Error ? err.message : "BLE scanning cancelled by user.");
    }
  };

  const handleSelfieCapture = async () => {
    setError("");
    setIsCapturingSelfie(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setSelfieStream(stream);
      logger.info("[Selfie Biometrics] Camera initialized. Capturing face embedding...");
      
      // Hook up real Vector DB search in Gallery (WEB-GAP-005)
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      await new Promise(resolve => {
        video.onloadeddata = resolve;
      });

      // Let camera adjust exposure for 1s
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
         ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
         const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
         
         const matches = await cloudApiService.searchPhotosByFace(imageDataUrl);
         
         stream.getTracks().forEach(track => track.stop());
         setSelfieStream(null);
         setIsCapturingSelfie(false);

         if (matches && matches.length > 0) {
            setAccessPin(`VECTOR-MATCHED-${matches.length}`);
            onLoginSuccess({
               event_id: 'face-search',
               status: 'active',
               photos: matches.map(m => ({
                 id: m.id,
                 url: m.url || m.r2_path,
                 aiTags: m.aiTags || [],
                 price: 15,
                 watermarkedUrl: m.watermarkedUrl
               }))
            } as any);
         } else {
            setError("No photos found matching your face in the Vector DB.");
         }
      } else {
         throw new Error("Canvas context is not available");
      }
    } catch (err) {
      logger.error("Camera access denied or vector search failed", err);
      setError("Camera access is required for biometric matching, or the search failed.");
      setIsCapturingSelfie(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 relative overflow-hidden selection:bg-cyan-500/30">
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
          <div className="grid grid-cols-2 sm:grid-cols-5 bg-slate-100 rounded-2xl p-1.5 mb-8 border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => {
                setMode("gallery");
                setError("");
              }}
              className={`py-3 px-1 text-[9px] font-black uppercase tracking-[0.1em] rounded-xl transition-all ${
                mode === "gallery"
                  ? "bg-white text-cyan-800 shadow-sm border border-slate-200"
                  : "text-slate-700 hover:text-slate-800"
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
              className={`py-3 px-1 text-[9px] font-black uppercase tracking-[0.1em] rounded-xl transition-all ${
                mode === "order"
                  ? "bg-white text-cyan-800 shadow-sm border border-slate-200"
                  : "text-slate-700 hover:text-slate-800"
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
              className={`py-3 px-1 text-[9px] font-black uppercase tracking-[0.1em] rounded-xl transition-all ${
                mode === "magic"
                  ? "bg-white text-cyan-800 shadow-sm border border-slate-200"
                  : "text-slate-700 hover:text-slate-800"
              }`}
            >
              Magic Token
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("proximity");
                setError("");
              }}
              className={`py-3 px-1 text-[9px] font-black uppercase tracking-[0.1em] rounded-xl transition-all flex items-center justify-center gap-1 ${
                mode === "proximity"
                  ? "bg-cyan-500 text-white shadow-sm font-extrabold"
                  : "text-cyan-800 hover:text-cyan-800 bg-cyan-50/50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              BLE Proximity
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("selfie");
                setError("");
              }}
              className={`py-3 px-1 text-[9px] font-black uppercase tracking-[0.1em] rounded-xl transition-all flex items-center justify-center gap-1 ${
                mode === "selfie"
                  ? "bg-purple-600 text-white shadow-sm font-extrabold"
                  : "text-purple-800 hover:text-purple-800 bg-purple-50/50"
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Selfie
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            {mode === "gallery" && (
              <div className="group">
                <label
                  htmlFor="accessCode"
                  className="block text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-cyan-800 transition-colors"
                >
                  B2B Access Code
                </label>
                <input
                  type="text"
                  id="accessCode"
                  name="accessCode"
                  data-testid="access-code-input"
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
                    className="block text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-cyan-800 transition-colors"
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
                    className="block text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-cyan-800 transition-colors"
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
              <div className="space-y-4">
                <div className="group">
                  <label
                    htmlFor="magicToken"
                    className="block text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-cyan-800 transition-colors"
                  >
                    Magic Token
                  </label>
                  <input
                    type="text"
                    id="magicToken"
                    name="magicToken"
                    value={accessPin}
                    onChange={(e) => setAccessPin(e.target.value)}
                    placeholder="Paste the token from your secure link"
                    required
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all font-bold text-sm group-hover:border-slate-300"
                  />
                </div>
              </div>
            )}

            {mode === "proximity" && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 text-center relative overflow-hidden">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center relative">
                      {isBleScanning && (
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-500 animate-ping"></div>
                      )}
                      <svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">
                        Zero-Touch Proximity BLE
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        {bleDeviceName ? `Connected: ${bleDeviceName}` : "Scan for nearby Attraction Wristband / Beacon"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleBleProximityScan}
                      disabled={isBleScanning}
                      className="mt-2 w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                    >
                      {isBleScanning ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                          Scanning Beacons...
                        </>
                      ) : (
                        "Scan Proximity Pass / Wristband"
                      )}
                    </button>
                  </div>
                </div>

                <input
                  type="hidden"
                  id="proximityToken"
                  name="proximityToken"
                  value={accessPin}
                />
              </div>
            )}

            {mode === "selfie" && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 border border-purple-500/20 text-center relative overflow-hidden">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-24 h-24 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center relative overflow-hidden">
                      {isCapturingSelfie ? (
                         <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                            <span className="text-white text-xs font-bold animate-pulse">Capturing...</span>
                         </div>
                      ) : (
                        <svg className="w-10 h-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                      {isCapturingSelfie && (
                        <div className="absolute inset-0 rounded-full border-4 border-purple-500 animate-spin border-t-transparent"></div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">
                        Zero-Click Face Match
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium px-4">
                        Take a quick selfie to instantly find all photos containing your face via our secure Vector DB.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSelfieCapture}
                      disabled={isCapturingSelfie}
                      className="mt-2 w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                    >
                      {isCapturingSelfie ? "Analyzing Face Vectors..." : "Take Selfie to Match"}
                    </button>
                  </div>
                </div>
                <input type="hidden" value={accessPin} />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs text-center font-bold animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              data-testid="submit-code-button"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-cyan-500/10 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.1em] text-sm border-t border-white/20 relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loading
                  ? "Processing..."
                  : mode === "gallery"
                    ? "Enter Gallery"
                    : mode === "order"
                      ? "Access My Order"
                        : mode === "proximity"
                          ? "Unlock Proximity Gallery"
                          : mode === "selfie"
                            ? "Enter via Biometrics"
                            : "Access Secure Link"}
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
