import React, { memo } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  galleryUrl?: string;
}

export const MobileTransferQRModal: React.FC<Props> = memo(({
  isOpen,
  onClose,
  orderId,
  galleryUrl = `https://clickflash.app/my-photos/${orderId}`,
}) => {
  if (!isOpen) return null;

  // Generate QR code URL via reliable public QR service for instant rendering
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    galleryUrl
  )}&color=0f1117&bgcolor=ffffff`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <div className="relative w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 p-8 shadow-2xl text-center">
        {/* Header */}
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-3">
            Instant Mobile Handoff
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Send Photos to Your Phone
          </h2>
          <p className="text-neutral-400 mt-2 text-sm md:text-base">
            Scan with your iPhone or Android camera to instantly save your photos and track your prints.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center my-8">
          <div className="p-4 rounded-2xl bg-white shadow-xl border-4 border-amber-500/40">
            <img
              src={qrImageUrl}
              alt="Scan QR Code"
              className="w-64 h-64 rounded-xl object-contain"
            />
          </div>
        </div>

        {/* Order Reference */}
        <div className="mb-6 p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/50">
          <span className="text-xs text-neutral-400 uppercase tracking-wider block">
            Order Reference Code
          </span>
          <span className="text-xl font-mono font-bold text-amber-400 mt-1 block">
            #{orderId.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-lg transition-colors shadow-lg"
        >
          Done & Close
        </button>
      </div>
    </div>
  );
});

MobileTransferQRModal.displayName = 'MobileTransferQRModal';
