import React, { memo, useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  sessionPin: string;
  orderTotal: number;
  onPaymentComplete: () => void;
}

export const QRCheckoutModal: React.FC<Props> = memo(({
  isOpen,
  onClose,
  orderId,
  sessionPin,
  orderTotal,
  onPaymentComplete
}) => {
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const pollIntervalRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Reset timer on open
    setTimeLeft(15 * 60);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose(); // Timeout reached
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Mock polling for payment completion
    pollIntervalRef.current = setInterval(() => {
      // In a real implementation, you would poll your backend or use WebSockets here
      // fetch(`/api/orders/${orderId}/status`)
      //   .then(res => res.json())
      //   .then(data => {
      //     if (data.status === 'PAID') {
      //       onPaymentComplete();
      //     }
      //   });
    }, 3000);

    return () => {
      clearInterval(timer);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isOpen, onClose, orderId, onPaymentComplete]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const checkoutUrl = `https://clickflash.app/checkout/${orderId}?pin=${sessionPin}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <div className="relative w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 p-8 shadow-2xl text-center">
        {/* Header */}
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-3">
            Mobile Self-Checkout
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Scan to Pay
          </h2>
          <p className="text-neutral-400 mt-2 text-sm md:text-base">
            Avoid the line and finish checkout safely on your own phone.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center my-6">
          <div className="p-4 rounded-2xl bg-white shadow-xl border-4 border-amber-500/40">
            <QRCodeSVG
              value={checkoutUrl}
              size={240}
              bgColor="#ffffff"
              fgColor="#0f1117"
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Details & Timer */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/50 flex flex-col items-center">
            <span className="text-xs text-neutral-400 uppercase tracking-wider block">
              Session PIN
            </span>
            <span className="text-2xl font-mono font-bold text-white mt-1 block tracking-widest">
              {sessionPin}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/50 flex flex-col items-center">
            <span className="text-xs text-neutral-400 uppercase tracking-wider block">
              Order Total
            </span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">
              €{orderTotal.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-neutral-400">
            Code expires in <span className="font-mono font-bold text-red-400">{timeString}</span>
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Waiting for payment completion...
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-lg transition-colors border border-neutral-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
});

QRCheckoutModal.displayName = 'QRCheckoutModal';
