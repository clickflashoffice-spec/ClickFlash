import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelfServiceQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  accessCode: string;
}

export const SelfServiceQRModal: React.FC<SelfServiceQRModalProps> = ({
  isOpen,
  onClose,
  eventId,
  accessCode,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const generateQRToken = useCallback(async () => {
    if (!eventId || !accessCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, accessCode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          setQrUrl(data.url);
          setExpiresAt(data.expiresAt);
          return;
        }
      }
      // Fallback
      setQrUrl(`https://gallery.clickflash.com/connect?accessCode=${accessCode}`);
      setExpiresAt(Date.now() + 15 * 60 * 1000);
    } catch {
      setQrUrl(`https://gallery.clickflash.com/connect?accessCode=${accessCode}`);
      setExpiresAt(Date.now() + 15 * 60 * 1000);
    } finally {
      setLoading(false);
    }
  }, [eventId, accessCode]);

  useEffect(() => {
    if (isOpen) {
      generateQRToken();
    }
  }, [isOpen, generateQRToken]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      if (remaining <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 p-8 shadow-2xl text-center overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-3">
              Contactless Ordering
            </span>
            <h2 className="text-3xl font-bold text-white">
              Scan to Order on Your Phone
            </h2>
            <p className="text-neutral-400 mt-2 text-sm md:text-base">
              Skip the line! Scan this dynamic QR code with your phone camera to view photos and checkout directly on your personal device.
            </p>
          </div>

          {loading ? (
            <div className="my-16 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
              <p className="text-neutral-400 text-sm">Generating dynamic QR code...</p>
            </div>
          ) : error ? (
            <div className="my-12 p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
              <p>{error}</p>
              <button
                onClick={generateQRToken}
                className="mt-4 px-6 py-2 rounded-xl bg-neutral-800 text-white text-sm font-medium hover:bg-neutral-700 transition"
              >
                Retry
              </button>
            </div>
          ) : qrUrl ? (
            <div className="flex flex-col items-center my-6">
              <div className="p-6 rounded-3xl bg-white shadow-2xl border-4 border-amber-500/40">
                <QRCodeSVG
                  value={qrUrl}
                  size={240}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  level="M"
                />
              </div>
              {timeLeft && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-800 text-xs text-neutral-300 border border-neutral-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Dynamic Code Active ({timeLeft})
                </div>
              )}
            </div>
          ) : null}

          <button
            onClick={onClose}
            className="w-full mt-4 py-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-lg transition-colors border border-neutral-700"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
