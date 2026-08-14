import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MobileTransferQRModal } from './MobileTransferQRModal';

interface ThankYouScreenProps {
    orderId: string;
    name: string;
    email: string;
    onFinish: () => void;
    isOffline?: boolean;
}

const ThankYouScreen: React.FC<ThankYouScreenProps> = ({ orderId, name, email, onFinish, isOffline = false }) => {
    const [showMobileQR, setShowMobileQR] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!showMobileQR) {
                onFinish();
            }
        }, 12000); // Redirect after 12 seconds unless interacting

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showMobileQR]);

    const bgColor = isOffline ? 'bg-orange-600' : 'bg-blue-600';
    const textColor = isOffline ? 'text-orange-200' : 'text-blue-200';

    return (
        <div className={`fixed inset-0 ${bgColor} z-50 flex flex-col items-center justify-center text-white text-center p-8 overflow-y-auto`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-28 w-28 mb-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h1 className="text-5xl md:text-6xl font-bold">Thank You, {name}!</h1>
            {isOffline ? (
                <>
                    <p className="text-2xl mt-4">Your order has been saved locally.</p>
                    <p className="text-xl mt-2">It will be processed automatically when the kiosk reconnects.</p>
                    <p className="text-lg mt-1">Your temporary Order ID is <span className="font-bold">{orderId}</span>.</p>
                </>
            ) : (
                <>
                    <p className="text-2xl mt-4">Your order <span className="font-bold">{orderId}</span> has been placed.</p>
                    <p className="text-xl mt-2">A confirmation has been sent to <span className="font-bold">{email}</span>.</p>
                </>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                {/* Apple Wallet QR Code */}
                {!isOffline && (
                    <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-2xl">
                        <p className="text-gray-800 font-bold mb-2 text-sm">Scan to add to Apple Wallet</p>
                        <QRCodeSVG
                            value={`${window.location.origin}/api/gallery/wallet-pass?orderId=${orderId}`}
                            size={140}
                            bgColor={"#ffffff"}
                            fgColor={"#000000"}
                            level={"L"}
                        />
                    </div>
                )}

                {/* Mobile QR Transfer Button */}
                <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-2xl max-w-xs">
                    <p className="text-white font-bold mb-2 text-lg">Instant Mobile Handoff</p>
                    <p className="text-white/80 text-sm mb-4">Send full photo gallery directly to your phone right now</p>
                    <button
                        onClick={() => setShowMobileQR(true)}
                        className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-base transition-all shadow-lg hover:scale-105"
                    >
                        Send Photos to Phone
                    </button>
                </div>
            </div>

            <MobileTransferQRModal
                isOpen={showMobileQR}
                onClose={() => setShowMobileQR(false)}
                orderId={orderId}
            />

            <p className={`text-lg mt-12 ${textColor}`}>This screen will reset automatically for the next guest.</p>
        </div>
    );
};

export default ThankYouScreen;