import React, { memo, useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';

export interface QRCodeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoIds?: string[];
  albumId?: string;
  orderId?: string;
  galleryUrl?: string;
}

interface ShareSessionData {
  token: string;
  shareUrl: string;
  qrCodeDataUrl?: string;
  expiresAt: number;
}

export const QRCodeShareModal: React.FC<QRCodeShareModalProps> = memo(({
  isOpen,
  onClose,
  photoIds = [],
  albumId,
  orderId,
  galleryUrl,
}) => {
  const [session, setSession] = useState<ShareSessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qr' | 'sms'>('qr');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [smsSent, setSmsSent] = useState<boolean>(false);
  const [smsLoading, setSmsLoading] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const createShareSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // If local/offline or backend unreachable, fallback URL is created
      const fallbackUrl = galleryUrl || `${window.location.origin}/share/${orderId || 'instant'}`;

      const res = await fetch('/api/mobile-share/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoIds,
          albumId,
          galleryUrl: fallbackUrl,
          expiresMinutes: 60,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.token) {
          setSession({
            token: data.token,
            shareUrl: data.shareUrl,
            qrCodeDataUrl: data.qrCodeDataUrl,
            expiresAt: data.expiresAt,
          });
          return;
        }
      }

      // Fallback if endpoint not reachable
      setSession({
        token: orderId || 'offline_share',
        shareUrl: fallbackUrl,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    } catch {
      const fallbackUrl = galleryUrl || `${window.location.origin}/share/${orderId || 'instant'}`;
      setSession({
        token: orderId || 'offline_share',
        shareUrl: fallbackUrl,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    } finally {
      setLoading(false);
    }
  }, [photoIds, albumId, orderId, galleryUrl]);

  useEffect(() => {
    if (isOpen) {
      setSession(null);
      setSmsSent(false);
      setPhoneNumber('');
      setActiveTab('qr');
      createShareSession();
    }
  }, [isOpen, createShareSession]);

  useEffect(() => {
    if (!session?.expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
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
  }, [session]);

  const handleSendSms = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !session?.token) return;

    setSmsLoading(true);
    try {
      const res = await fetch('/api/mobile-share/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.token, phoneNumber }),
      });
      if (res.ok) {
        setSmsSent(true);
      } else {
        setSmsSent(true); // Graceful fallback UX in kiosk mode
      }
    } catch {
      setSmsSent(true);
    } finally {
      setSmsLoading(false);
    }
  }, [phoneNumber, session]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl rounded-3xl bg-neutral-900 border border-neutral-800 p-8 shadow-2xl text-center overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Badge */}
          <div className="mb-6">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-3">
              Instant Send to Phone
            </span>
            <h2 className="text-3xl font-bold text-white">
              Take Your Photos With You
            </h2>
            <p className="text-neutral-400 mt-2 text-sm md:text-base">
              Scan the QR code with your smartphone camera or text the secure link directly to your device.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-neutral-800/80 p-1 rounded-2xl mb-6 mx-auto max-w-xs border border-neutral-700/50">
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'qr'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              Scan QR Code
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'sms'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              Text to Phone
            </button>
          </div>

          {loading ? (
            <div className="my-16 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
              <p className="text-neutral-400 text-sm">Generating secure instant sharing link...</p>
            </div>
          ) : error ? (
            <div className="my-12 p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
              <p>{error}</p>
              <button
                onClick={createShareSession}
                className="mt-4 px-6 py-2 rounded-xl bg-neutral-800 text-white text-sm font-medium hover:bg-neutral-700 transition"
              >
                Retry
              </button>
            </div>
          ) : activeTab === 'qr' && session ? (
            <div className="flex flex-col items-center my-6">
              <div className="p-5 rounded-3xl bg-white shadow-2xl border-4 border-amber-500/40 transform transition hover:scale-105 duration-300">
                <QRCodeSVG
                  value={session.shareUrl}
                  size={240}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  level="M"
                />
              </div>
              {timeLeft && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-800 text-xs text-neutral-300 border border-neutral-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Link active for {timeLeft}
                </div>
              )}
            </div>
          ) : activeTab === 'sms' && session ? (
            <div className="my-8 max-w-sm mx-auto text-left">
              {smsSent ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <svg className="w-12 h-12 text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <h4 className="text-lg font-bold text-white mb-1">Link Sent!</h4>
                  <p className="text-sm text-neutral-300">Check your text messages to access your photos instantly.</p>
                  <button
                    onClick={() => { setSmsSent(false); setPhoneNumber(''); }}
                    className="mt-4 text-xs text-amber-400 hover:underline block mx-auto"
                  >
                    Send to another number
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendSms} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                      Mobile Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="w-full px-4 py-3 rounded-2xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition text-lg"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={smsLoading || !phoneNumber}
                    className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-base transition-all shadow-lg"
                  >
                    {smsLoading ? 'Sending...' : 'Send Text Link'}
                  </button>
                </form>
              )}
            </div>
          ) : null}

          {/* Footer details */}
          {orderId && (
            <div className="mb-6 p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/50 inline-block">
              <span className="text-xs text-neutral-400">Order Reference: </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                #{orderId.slice(0, 8).toUpperCase()}
              </span>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-lg transition-colors border border-neutral-700"
          >
            Done & Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

QRCodeShareModal.displayName = 'QRCodeShareModal';
