import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProximityAuth } from '../hooks/useProximityAuth';

export interface SelfServiceBLEModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onGuestDetected: (guestId: string) => void;
}

export const SelfServiceBLEModal: React.FC<SelfServiceBLEModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onGuestDetected,
}) => {
  const { isScanning, detectedGuestId, error, startScanning } = useProximityAuth();

  useEffect(() => {
    if (isOpen) {
      startScanning();
    }
  }, [isOpen, startScanning]);

  useEffect(() => {
    if (detectedGuestId) {
      // Small delay for UI feedback
      const timer = setTimeout(() => {
        onGuestDetected(detectedGuestId);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [detectedGuestId, onGuestDetected]);

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
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 mb-3">
              Zero-Touch Ordering
            </span>
            <h2 className="text-3xl font-bold text-white">
              Link Your Smartphone
            </h2>
            <p className="text-neutral-400 mt-2 text-sm md:text-base">
              Bring your phone near the kiosk to securely connect via BLE. Ensure Bluetooth is enabled and the ClickFlash app is open.
            </p>
          </div>

          {error ? (
            <div className="my-12 p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
              <p>{error}</p>
              <button
                onClick={startScanning}
                className="mt-4 px-6 py-2 rounded-xl bg-neutral-800 text-white text-sm font-medium hover:bg-neutral-700 transition"
              >
                Retry Scan
              </button>
            </div>
          ) : detectedGuestId ? (
            <div className="flex flex-col items-center my-12">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-emerald-400 mb-2">Device Connected!</h3>
              <p className="text-neutral-400">Linking your gallery session...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center my-12">
              <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
                {/* Ripples */}
                <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-4 border-2 border-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                <div className="absolute inset-8 border-2 border-blue-500/10 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
                
                {/* Center Phone Icon */}
                <div className="relative z-10 w-16 h-16 bg-blue-500/20 rounded-2xl border border-blue-500/40 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-blue-400 text-lg font-medium animate-pulse">
                {isScanning ? 'Scanning for nearby devices...' : 'Ready to scan...'}
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-4 py-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-lg transition-colors border border-neutral-700"
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
