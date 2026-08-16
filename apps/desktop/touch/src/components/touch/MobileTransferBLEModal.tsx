import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProximityAuth } from '../../hooks/useProximityAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

export const MobileTransferBLEModal: React.FC<Props> = React.memo(({ isOpen, onClose, orderId }) => {
  const { isScanning, detectedGuestId, error, startScanning } = useProximityAuth();

  useEffect(() => {
    if (isOpen) {
      startScanning();
    }
  }, [isOpen, startScanning]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-sm w-full text-center overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Instant Transfer</h2>
            <p className="text-neutral-400 text-sm">
              Bring your phone near the kiosk to transfer Order #{orderId} via BLE Proximity.
            </p>
          </div>

          {error ? (
            <div className="my-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <p>{error}</p>
              <button
                onClick={startScanning}
                className="mt-4 px-4 py-2 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition"
              >
                Retry
              </button>
            </div>
          ) : detectedGuestId ? (
            <div className="flex flex-col items-center my-8">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-emerald-400 mb-1">Transfer Complete!</h3>
              <p className="text-neutral-400 text-sm">Photos sent to your device.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center my-8">
              <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
                {/* Ripples */}
                <div className="absolute inset-0 border-2 border-amber-500/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-2 border-2 border-amber-500/20 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                
                {/* Center Phone Icon */}
                <div className="relative z-10 w-12 h-12 bg-amber-500/20 rounded-xl border border-amber-500/40 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-amber-400 font-medium animate-pulse">
                {isScanning ? 'Scanning for nearby devices...' : 'Ready to scan...'}
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-2 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors border border-neutral-700"
          >
            {detectedGuestId ? 'Close' : 'Cancel'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

MobileTransferBLEModal.displayName = 'MobileTransferBLEModal';
