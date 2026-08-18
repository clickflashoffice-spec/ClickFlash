import React, { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { QrCode, RefreshCw, Copy, CheckCircle } from "lucide-react";

interface PairingQRCodeProps {
  deskId: string;
  masterIp: string;
  pairingToken: string;
  onRefresh: () => Promise<string>;
}

const PairingQRCode: React.FC<PairingQRCodeProps> = ({
  deskId,
  masterIp,
  pairingToken,
  onRefresh,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  const generateQR = useCallback(async () => {
    const payload = JSON.stringify({
      deskId,
      ip: masterIp,
      port: 8090,
      pairingToken,
      timestamp: Date.now(),
    });
    const url = await QRCode.toDataURL(payload, {
      width: 256,
      margin: 2,
      color: { dark: "#06b6d4", light: "#0f172a" },
    });
    setQrDataUrl(url);
  }, [deskId, masterIp, pairingToken]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  // Auto-refresh token every 4 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      await onRefresh();
      setTimeLeft(300);
    }, 240000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      JSON.stringify({ deskId, ip: masterIp, port: 8090, pairingToken })
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-6 bg-slate-800/60 rounded-xl border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">Manual Pairing</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${timeLeft < 60 ? "text-rose-400" : "text-slate-500"}`}>
            Expires in {formatTime(timeLeft)}
          </span>
          <button
            onClick={() => { onRefresh(); setTimeLeft(300); }}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="Pairing QR Code"
            className="w-48 h-48 rounded-lg border border-slate-700/50"
          />
        )}
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Scan this QR code with the Touch Kiosk, or copy the pairing details below.
        </p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy Pairing Details
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PairingQRCode;
